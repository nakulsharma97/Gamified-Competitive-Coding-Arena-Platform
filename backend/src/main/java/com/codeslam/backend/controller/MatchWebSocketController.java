package com.codeslam.backend.controller;

import com.codeslam.backend.dto.ChatMessageEvent;
import com.codeslam.backend.dto.ChatRequest;
import com.codeslam.backend.dto.JoinQueueRequest;
import com.codeslam.backend.dto.PowerUpRequest;
import com.codeslam.backend.dto.SubmitCodeRequest;
import com.codeslam.backend.entity.MatchEntity;
import com.codeslam.backend.entity.Problem;
import com.codeslam.backend.entity.Submission;
import com.codeslam.backend.entity.SubmissionQueue;
import com.codeslam.backend.entity.User;
import com.codeslam.backend.enums.Language;
import com.codeslam.backend.enums.Verdict;
import com.codeslam.backend.matchmaking.MatchmakingService;
import com.codeslam.backend.service.MatchStateService;
import com.codeslam.backend.service.PowerUpService;
import com.codeslam.backend.service.UserService;
import com.codeslam.backend.repository.MatchRepository;
import com.codeslam.backend.repository.PowerupLockRepository;
import com.codeslam.backend.repository.SpectatorSessionRepository;
import com.codeslam.backend.repository.SubmissionQueueRepository;
import com.codeslam.backend.repository.SubmissionRepository;
import com.codeslam.backend.websocket.MatchWebSocketPublisher;
import java.security.Principal;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;
import org.springframework.web.socket.messaging.SessionUnsubscribeEvent;
import org.springframework.web.util.HtmlUtils;
import org.springframework.http.HttpStatus;
import com.codeslam.backend.enums.MatchStatus;

@Controller
public class MatchWebSocketController {

    private static final String ERROR_QUEUE = "/queue/errors";

    private final UserService userService;
    private final MatchmakingService matchmakingService;
    private final MatchStateService matchStateService;
    private final PowerUpService powerUpService;
    private final SubmissionRepository submissionRepository;
    private final SubmissionQueueRepository submissionQueueRepository;
    private final PowerupLockRepository powerupLockRepository;
    private final SpectatorSessionRepository spectatorSessionRepository;
    private final MatchRepository matchRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final MatchWebSocketPublisher matchWebSocketPublisher;

    public MatchWebSocketController(UserService userService, MatchmakingService matchmakingService,
            MatchStateService matchStateService, PowerUpService powerUpService,
            SubmissionRepository submissionRepository, SubmissionQueueRepository submissionQueueRepository,
            PowerupLockRepository powerupLockRepository, SpectatorSessionRepository spectatorSessionRepository,
            MatchRepository matchRepository,
            SimpMessagingTemplate messagingTemplate,
            MatchWebSocketPublisher matchWebSocketPublisher) {
        this.userService = userService;
        this.matchmakingService = matchmakingService;
        this.matchStateService = matchStateService;
        this.powerUpService = powerUpService;
        this.submissionRepository = submissionRepository;
        this.submissionQueueRepository = submissionQueueRepository;
        this.powerupLockRepository = powerupLockRepository;
        this.spectatorSessionRepository = spectatorSessionRepository;
        this.matchRepository = matchRepository;
        this.messagingTemplate = messagingTemplate;
        this.matchWebSocketPublisher = matchWebSocketPublisher;
    }

    @MessageMapping("/queue.join")
    public void handleJoinQueue(@Payload JoinQueueRequest request, Principal principal,
            SimpMessageHeaderAccessor headerAccessor) {
        String clerkId = principal.getName();
        User user = userService.getUserByClerkId(clerkId);
        matchmakingService.joinQueue(clerkId, user.getEloRating(), headerAccessor.getSessionId());
    }

    @MessageMapping("/queue.leave")
    public void handleLeaveQueue(Principal principal) {
        matchmakingService.leaveQueue(principal.getName());
    }

    @MessageMapping("/match.join")
    public void handleJoinMatch(@Payload Map<String, Object> payload, Principal principal) {
        Object matchIdValue = payload.get("matchId");
        if (matchIdValue == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "matchId is required");
        }

        MatchStateService.MatchState state = matchStateService.getMatchState(matchIdValue.toString());
        messagingTemplate.convertAndSendToUser(principal.getName(), "/queue/match-state", state);
        matchWebSocketPublisher.publishPlayerJoined(matchIdValue.toString(), Map.of(
                "matchId", matchIdValue.toString(),
                "userId", principal.getName(),
                "player1Id", state.player1Id().toString(),
                "player2Id", state.player2Id().toString()));
        matchWebSocketPublisher.publishRoomSync(principal.getName(), matchIdValue.toString(), Map.of(
                "matchId", matchIdValue.toString(),
                "state", state));
    }

    @MessageMapping("/match.submit")
    @Transactional
    public void handleSubmit(@Payload SubmitCodeRequest request, Principal principal) {
        String clerkId = principal.getName();
        User user = userService.getUserByClerkId(clerkId);
        String userId = user.getId().toString();
        MatchStateService.MatchState matchState = matchStateService.getMatchState(request.matchId());
        if (matchState.status() != MatchStatus.ACTIVE) {
            sendUserError(clerkId, Map.of("type", "MATCH_ENDED"));
            return;
        }
        if (!matchStateService.isActiveParticipant(request.matchId(), userId)) {
            sendUserError(clerkId, Map.of("type", "MATCH_NOT_ACTIVE"));
            return;
        }

        MatchEntity match = resolveMatch(request.matchId());

        // Check for active powerup locks
        var activeLock = powerupLockRepository.findActiveLock(request.matchId(), userId, Instant.now());
        if (activeLock.isPresent()) {
            String lockedKeyword = activeLock.get().getKeyword();
            if (!lockedKeyword.isBlank() && request.code().contains(lockedKeyword)) {
                sendUserError(clerkId, Map.of("type", "KEYWORD_LOCKED", "keyword", lockedKeyword));
                return;
            }
        }

        Submission submission = Submission.builder()
                .match(match)
                .user(user)
                .problem(match.getProblem())
                .code(request.code())
                .language(parseLanguage(request.language()))
                .verdict(Verdict.PENDING)
                .runtimeMs(null)
                .memoryMb(null)
                .passedCases(0)
                .totalCases(0)
                .firstAc(false)
                .build();
        submission.setId(UUID.randomUUID().toString());
        submissionRepository.save(submission);

        // Add to database queue instead of Redis
        long queuePosition = submissionQueueRepository.count() + 1;
        SubmissionQueue queuedSubmission = SubmissionQueue.create(submission.getId().toString(), queuePosition);
        submissionQueueRepository.save(queuedSubmission);

        matchWebSocketPublisher.publishCodeSubmitted(request.matchId(), Map.of(
                "matchId", request.matchId(),
                "submissionId", submission.getId().toString(),
                "userId", userId,
                "language", submission.getLanguage().name(),
                "status", "QUEUED"));

        messagingTemplate.convertAndSendToUser(clerkId, "/queue/submission-ack",
                Map.of("submissionId", submission.getId().toString()));
    }

    @MessageMapping("/match.powerup")
    public void handlePowerUp(@Payload PowerUpRequest request, Principal principal) {
        User user = userService.getUserByClerkId(principal.getName());
        powerUpService.usePowerUp(request.matchId(), user.getId().toString(), request.type());
    }

    @MessageMapping("/match.chat")
    public void handleChat(@Payload ChatRequest request, Principal principal) {
        String safeMessage = HtmlUtils.htmlEscape(request.message() == null ? "" : request.message());
        safeMessage = safeMessage.substring(0, Math.min(safeMessage.length(), 200));
        User user = userService.getUserByClerkId(principal.getName());
        ChatMessageEvent chatMessageEvent = new ChatMessageEvent(user.getUsername(), safeMessage,
                Instant.now().toString());
        messagingTemplate.convertAndSend("/topic/matches/" + request.matchId() + "/chat", chatMessageEvent);
        messagingTemplate.convertAndSend("/topic/match." + request.matchId(), chatMessageEvent);
        messagingTemplate.convertAndSend("/topic/rooms/" + request.matchId(), Map.of(
                "type", "CHAT_MESSAGE",
                "matchId", request.matchId(),
                "username", user.getUsername(),
                "message", safeMessage,
                "timestamp", Instant.now().toString()));
    }

    @EventListener
    public void handleConnect(SessionConnectEvent event) {
        if (event.getUser() == null) {
            return;
        }

        SimpMessageHeaderAccessor headerAccessor = SimpMessageHeaderAccessor.wrap(event.getMessage());
        User user = userService.getUserByClerkId(event.getUser().getName());
        matchmakingService.registerSession(headerAccessor.getSessionId(), user.getClerkId());
        matchmakingService.handleReconnect(user.getClerkId());
    }

    @EventListener
    public void handleDisconnect(SessionDisconnectEvent event) {
        matchmakingService.handleDisconnect(event.getSessionId());
        removeSpectatorSession(event.getSessionId());
    }

    @EventListener
    public void handleSubscribe(SessionSubscribeEvent event) {
        String destination = getDestination(event.getMessage());
        if (destination == null || (!destination.startsWith("/topic/matches/")
                && !destination.startsWith("/topic/rooms/"))) {
            return;
        }

        String matchId = extractMatchId(destination);
        if (matchId == null || event.getUser() == null) {
            return;
        }

        User user = userService.getUserByClerkId(event.getUser().getName());
        if (isParticipant(matchId, user.getId().toString())) {
            return;
        }

        String sessionId = getSessionId(event.getMessage());
        if (sessionId == null || sessionId.isBlank()) {
            return;
        }

        // Add to database instead of Redis
        com.codeslam.backend.entity.SpectatorSession spectatorSession = com.codeslam.backend.entity.SpectatorSession
                .create(matchId, sessionId);
        spectatorSessionRepository.save(spectatorSession);
        broadcastSpectatorCount(matchId);
    }

    @EventListener
    public void handleUnsubscribe(SessionUnsubscribeEvent event) {
        removeSpectatorSession(getSessionId(event.getMessage()));
    }

    private MatchEntity resolveMatch(String matchId) {
        UUID matchUuid;
        try {
            matchUuid = UUID.fromString(matchId);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid matchId");
        }

        return matchRepository.findById(matchUuid.toString())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Match not found"));
    }

    private void sendUserError(String userId, Map<String, Object> payload) {
        messagingTemplate.convertAndSendToUser(userId, ERROR_QUEUE, payload);
    }

    private void removeSpectatorSession(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            return;
        }

        var spectatorSessionOpt = spectatorSessionRepository.findBySessionId(sessionId);
        if (spectatorSessionOpt.isEmpty()) {
            return;
        }

        String matchId = spectatorSessionOpt.get().getMatchId();
        spectatorSessionRepository.deleteBySessionId(sessionId);
        broadcastSpectatorCount(matchId);
    }

    private void broadcastSpectatorCount(String matchId) {
        long count = spectatorSessionRepository.findByMatchId(matchId).size();
        Map<String, Object> payload = Map.of("matchId", matchId, "count", count);
        messagingTemplate.convertAndSend("/topic/matches/" + matchId + "/spectators", payload);
        messagingTemplate.convertAndSend("/topic/rooms/" + matchId + "/spectators", payload);
    }

    private boolean isParticipant(String matchId, String userId) {
        MatchStateService.MatchState state = matchStateService.getMatchState(matchId);
        return state.player1Id().toString().equals(userId) || state.player2Id().toString().equals(userId);
    }

    private String getDestination(org.springframework.messaging.Message<?> message) {
        SimpMessageHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message,
                SimpMessageHeaderAccessor.class);
        return accessor == null ? null : accessor.getDestination();
    }

    private String getSessionId(org.springframework.messaging.Message<?> message) {
        SimpMessageHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message,
                SimpMessageHeaderAccessor.class);
        return accessor == null ? null : accessor.getSessionId();
    }

    private String extractMatchId(String destination) {
        String prefix = null;
        if (destination.startsWith("/topic/matches/")) {
            prefix = "/topic/matches/";
        } else if (destination.startsWith("/topic/rooms/")) {
            prefix = "/topic/rooms/";
        }
        if (prefix == null) {
            return null;
        }

        String remainder = destination.substring(prefix.length());
        int separator = remainder.indexOf('/');
        return separator < 0 ? remainder : remainder.substring(0, separator);
    }

    private Language parseLanguage(String language) {
        if (language == null || language.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Language is required");
        }

        return switch (language.trim().toLowerCase(Locale.ROOT)) {
            case "python", "python3", "py" -> Language.PYTHON;
            case "javascript", "js", "node" -> Language.JAVASCRIPT;
            case "java" -> Language.JAVA;
            case "cpp", "c++", "g++" -> Language.CPP;
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported language: " + language);
        };
    }
}