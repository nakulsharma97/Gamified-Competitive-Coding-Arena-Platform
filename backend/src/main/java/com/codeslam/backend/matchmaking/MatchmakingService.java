package com.codeslam.backend.matchmaking;

import com.codeslam.backend.dto.ProblemDto;
import com.codeslam.backend.dto.UserProfileDto;
import com.codeslam.backend.entity.MatchEntity;
import com.codeslam.backend.entity.Problem;
import com.codeslam.backend.entity.User;
import com.codeslam.backend.enums.Difficulty;
import com.codeslam.backend.enums.MatchStatus;
import com.codeslam.backend.exception.ResourceNotFoundException;
import com.codeslam.backend.mapper.ProblemMapper;
import com.codeslam.backend.mapper.UserMapper;
import com.codeslam.backend.match.MatchStateService;
import com.codeslam.backend.repository.MatchRepository;
import com.codeslam.backend.repository.ProblemRepository;
import com.codeslam.backend.repository.UserRepository;
import com.codeslam.backend.websocket.MatchWebSocketPublisher;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Matchmaking service. Previously backed by Redis ZSETs, hashes, and key-space
 * notifications. Replaced with in-memory data structures for a single-instance
 * deployment. For multi-instance HA, swap the {@link ConcurrentMap} fields for a
 * distributed cache or a database-backed implementation.
 */
@Service
public class MatchmakingService {

    private static final int DEFAULT_ELO_WINDOW = 100;
    private static final int DEFAULT_HP = 100;
    private static final long QUEUE_TIMEOUT_MS = 45_000L;
    private static final long WAIT_THRESHOLD_MS = 15_000L;
    private static final int WINDOW_GROWTH = 50;
    private static final long DISCONNECT_GRACE_MS = 60_000L;
    private static final String DISCONNECT_PREFIX = "disconnect:";

    @Value("${scheduling.enabled:true}")
    private boolean schedulingEnabled;

    private final MatchRepository matchRepository;
    private final ProblemRepository problemRepository;
    private final UserRepository userRepository;
    private final ProblemMapper problemMapper;
    private final UserMapper userMapper;
    private final SimpMessagingTemplate messagingTemplate;
    private final MatchStateService matchStateService;
    private final MatchWebSocketPublisher matchWebSocketPublisher;

    /** Queue member -> elo score (mirrors the old ZSET range). */
    private final ConcurrentMap<String, Double> queue = new ConcurrentHashMap<>();
    /** Per-user metadata that used to live in a Redis hash. */
    private final ConcurrentMap<String, QueueEntry> meta = new ConcurrentHashMap<>();
    /** Session id -> user id lookup (replaces the old session key/value pair). */
    private final ConcurrentMap<String, String> sessionOwners = new ConcurrentHashMap<>();
    /** matchId -> p1/p2 session ids (replaces the old match:sessions:* hash). */
    private final ConcurrentMap<String, MatchSessions> matchSessions = new ConcurrentHashMap<>();
    /** Disconnect grace state, keyed by {@code disconnect:<matchId>:<userId>}. */
    private final ConcurrentMap<String, Long> disconnectExpiry = new ConcurrentHashMap<>();

    public MatchmakingService(MatchRepository matchRepository,
            ProblemRepository problemRepository,
            UserRepository userRepository,
            ProblemMapper problemMapper,
            UserMapper userMapper,
            SimpMessagingTemplate messagingTemplate,
            MatchStateService matchStateService,
            MatchWebSocketPublisher matchWebSocketPublisher) {
        this.matchRepository = matchRepository;
        this.problemRepository = problemRepository;
        this.userRepository = userRepository;
        this.problemMapper = problemMapper;
        this.userMapper = userMapper;
        this.messagingTemplate = messagingTemplate;
        this.matchStateService = matchStateService;
        this.matchWebSocketPublisher = matchWebSocketPublisher;
    }

    public void joinQueue(String userId, int userElo, String sessionId) {
        if (userId == null || userId.isBlank()) {
            return;
        }
        long now = System.currentTimeMillis();
        queue.put(userId, (double) userElo);
        meta.put(userId, new QueueEntry(sessionId, now, now + QUEUE_TIMEOUT_MS, DEFAULT_ELO_WINDOW));
        if (sessionId != null && !sessionId.isBlank()) {
            sessionOwners.put(sessionId, userId);
        }
        messagingTemplate.convertAndSendToUser(userId, "/queue/queue-status",
                Map.of("status", "SEARCHING", "queueSize", queue.size()));
    }

    public void registerSession(String sessionId, String userId) {
        if (sessionId == null || sessionId.isBlank() || userId == null || userId.isBlank()) {
            return;
        }
        sessionOwners.put(sessionId, userId);
    }

    public void leaveQueue(String userId) {
        if (userId == null || userId.isBlank()) {
            return;
        }
        if (queue.remove(userId) != null) {
            meta.remove(userId);
        }
    }

    public void cancelSearch(String userId) {
        leaveQueue(userId);
    }

    public long getQueueSize() {
        return queue.size();
    }

    public void handleDisconnect(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            return;
        }
        String resolvedUserId = sessionOwners.remove(sessionId);

        // Drop the user from the matchmaking queue if they were in it.
        if (resolvedUserId != null) {
            QueueEntry entry = meta.get(resolvedUserId);
            if (entry != null && Objects.equals(sessionId, entry.sessionId())) {
                leaveQueue(resolvedUserId);
            }
        }

        // Look up any active match tied to this session and start the grace timer.
        handleActiveDisconnect(sessionId);
    }

    public void handleReconnect(String clerkId) {
        if (clerkId == null || clerkId.isBlank()) {
            return;
        }
        User user = userRepository.findByClerkId(clerkId).orElse(null);
        if (user == null) {
            return;
        }
        String userId = user.getId().toString();
        List<MatchEntity> matches = matchRepository.findByPlayer1IdOrPlayer2Id(userId, userId);
        for (MatchEntity match : matches) {
            if (match.getStatus() != MatchStatus.ACTIVE) {
                continue;
            }
            deleteDisconnectState(match.getId().toString(), userId);
        }
    }

    @Scheduled(fixedDelay = 5_000)
    @ConditionalOnProperty(name = "scheduling.enabled", havingValue = "true", matchIfMissing = true)
    public void processQueueTimeouts() {
        if (!schedulingEnabled) {
            return;
        }
        long now = System.currentTimeMillis();
        List<String> expired = new ArrayList<>();
        meta.forEach((userId, entry) -> {
            if (entry.timeoutAt() > 0L && now >= entry.timeoutAt()) {
                expired.add(userId);
            }
        });
        for (String userId : expired) {
            leaveQueue(userId);
            messagingTemplate.convertAndSendToUser(userId, "/queue/queue-status",
                    Map.of("status", "TIMEOUT", "reason", "NO_OPPONENT_FOUND"));
        }
    }

    @Scheduled(fixedDelay = 2_000)
    @ConditionalOnProperty(name = "scheduling.enabled", havingValue = "true", matchIfMissing = true)
    @Transactional
    public void runMatchmaker() {
        if (!schedulingEnabled) {
            return;
        }
        if (queue.size() < 2) {
            return;
        }

        List<Map.Entry<String, Double>> orderedMembers = new ArrayList<>(queue.entrySet());
        orderedMembers.sort(Comparator.comparingDouble(Map.Entry::getValue));

        Set<String> matched = new HashSet<>();
        long now = System.currentTimeMillis();
        for (Map.Entry<String, Double> member : orderedMembers) {
            String userId = member.getKey();
            Double score = member.getValue();
            if (userId == null || score == null || matched.contains(userId)) {
                continue;
            }
            QueueEntry entry = meta.get(userId);
            if (entry == null) {
                continue;
            }

            int eloWindow = entry.eloWindow();
            if (now - entry.joinedAt() > WAIT_THRESHOLD_MS) {
                eloWindow += WINDOW_GROWTH;
                meta.put(userId, new QueueEntry(entry.sessionId(), entry.joinedAt(), entry.timeoutAt(), eloWindow));
            }

            Map.Entry<String, Double> opponent = findNearestOpponent(userId, score, eloWindow, matched);
            if (opponent == null) {
                continue;
            }
            matched.add(userId);
            matched.add(opponent.getKey());
            createMatch(userId, (int) Math.round(score), opponent.getKey(), (int) Math.round(opponent.getValue()));
        }
    }

    @Transactional
    public MatchEntity createMatch(String p1Id, int p1Elo, String p2Id, int p2Elo) {
        User player1 = getUser(p1Id);
        User player2 = getUser(p2Id);

        String p1SessionId = readSessionId(p1Id);
        String p2SessionId = readSessionId(p2Id);

        int averageElo = (p1Elo + p2Elo) / 2;
        Difficulty difficulty = averageElo < 1200 ? Difficulty.EASY
                : averageElo < 1800 ? Difficulty.MEDIUM
                        : Difficulty.HARD;
        Problem problem = Optional.ofNullable(problemRepository.findLeastUsedByDifficulty(difficulty))
                .orElseThrow(() -> new ResourceNotFoundException("No problem available for difficulty " + difficulty));

        MatchEntity match = new MatchEntity();
        match.setId(UUID.randomUUID());
        match.setProblem(problem);
        match.setPlayer1(player1);
        match.setPlayer2(player2);
        match.setWinner(null);
        match.setStatus(MatchStatus.WAITING);
        match.setPlayer1Hp(DEFAULT_HP);
        match.setPlayer2Hp(DEFAULT_HP);
        match.setPlayer1EloSnapshot(p1Elo);
        match.setPlayer2EloSnapshot(p2Elo);
        match.setPlayer1TotalDamage(0);
        match.setPlayer2TotalDamage(0);
        match.setEloChangeP1(0);
        match.setEloChangeP2(0);
        match = matchRepository.save(match);

        match.setStatus(MatchStatus.ACTIVE);
        match.setStartedAt(LocalDateTime.now());
        match = matchRepository.save(match);

        matchStateService.initMatchState(match.getId().toString(), player1.getId().toString(),
                player2.getId().toString(), p1Elo, p2Elo);

        matchSessions.put(match.getId().toString(), new MatchSessions(p1SessionId, p2SessionId));
        queue.remove(p1Id);
        queue.remove(p2Id);
        meta.remove(p1Id);
        meta.remove(p2Id);

        ProblemDto problemDto = problemMapper.toDto(problem);
        UserProfileDto p1Profile = userMapper.toDto(player1);
        UserProfileDto p2Profile = userMapper.toDto(player2);

        messagingTemplate.convertAndSendToUser(p1Id, "/queue/match-found",
                new MatchFoundEvent(match.getId().toString(), problemDto, p2Profile));
        messagingTemplate.convertAndSendToUser(p2Id, "/queue/match-found",
                new MatchFoundEvent(match.getId().toString(), problemDto, p1Profile));

        matchWebSocketPublisher.publishMatchFound(p1Id, match.getId().toString(), Map.of(
                "matchId", match.getId().toString(),
                "opponent", p2Profile,
                "problem", problemDto));
        matchWebSocketPublisher.publishMatchFound(p2Id, match.getId().toString(), Map.of(
                "matchId", match.getId().toString(),
                "opponent", p1Profile,
                "problem", problemDto));

        matchWebSocketPublisher.publishMatchStarted(match.getId().toString(), Map.of(
                "matchId", match.getId().toString(),
                "player1Id", p1Id,
                "player2Id", p2Id,
                "problem", problemDto,
                "timerSeconds", 600,
                "player1Hp", 100,
                "player2Hp", 100));

        matchStateService.startCountdown(match.getId().toString());
        return match;
    }

    private User getUser(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
    }

    private Map.Entry<String, Double> findNearestOpponent(String userId, double elo, int eloWindow,
            Set<String> matched) {
        double lo = elo - eloWindow;
        double hi = elo + eloWindow;
        return queue.entrySet().stream()
                .filter(e -> e.getKey() != null && e.getValue() != null)
                .filter(e -> !userId.equals(e.getKey()))
                .filter(e -> !matched.contains(e.getKey()))
                .filter(e -> e.getValue() >= lo && e.getValue() <= hi)
                .min(Comparator.comparingDouble(e -> Math.abs(e.getValue() - elo)))
                .orElse(null);
    }

    private void handleActiveDisconnect(String sessionId) {
        for (Map.Entry<String, MatchSessions> entry : matchSessions.entrySet()) {
            MatchSessions sessions = entry.getValue();
            if (!Objects.equals(sessionId, sessions.p1SessionId())
                    && !Objects.equals(sessionId, sessions.p2SessionId())) {
                continue;
            }
            String matchId = entry.getKey();
            MatchEntity match = matchRepository.findById(matchId).orElse(null);
            if (match == null || match.getStatus() != MatchStatus.ACTIVE) {
                matchSessions.remove(matchId);
                return;
            }
            boolean isP1 = Objects.equals(sessionId, sessions.p1SessionId());
            String userId = isP1
                    ? match.getPlayer1().getId().toString()
                    : match.getPlayer2().getId().toString();
            String opponentId = isP1
                    ? match.getPlayer2().getId().toString()
                    : match.getPlayer1().getId().toString();
            String opponentSessionId = isP1 ? sessions.p2SessionId() : sessions.p1SessionId();
            String opponentUserId = readSessionOwner(opponentSessionId);

            String opponentKey = disconnectKey(matchId, opponentId);
            if (disconnectExpiry.containsKey(opponentKey)) {
                voidMatch(matchId);
                deleteDisconnectState(matchId, userId);
                deleteDisconnectState(matchId, opponentId);
            } else {
                long expiresAt = System.currentTimeMillis() + DISCONNECT_GRACE_MS;
                disconnectExpiry.put(disconnectKey(matchId, userId), expiresAt);
                messagingTemplate.convertAndSendToUser(opponentUserId, "/queue/match-state",
                        Map.of("type", "OPPONENT_DISCONNECTED", "reconnectWindowSeconds", 60));
            }
            return;
        }
    }

    @Scheduled(fixedDelay = 5_000)
    @ConditionalOnProperty(name = "scheduling.enabled", havingValue = "true", matchIfMissing = true)
    @Transactional
    public void processDisconnectTimeouts() {
        if (!schedulingEnabled) {
            return;
        }
        long now = System.currentTimeMillis();
        List<String> dueKeys = new ArrayList<>();
        disconnectExpiry.forEach((key, expiresAt) -> {
            if (expiresAt <= now) {
                dueKeys.add(key);
            }
        });
        for (String key : dueKeys) {
            DisconnectState state = parseDisconnectKey(key);
            if (state == null) {
                disconnectExpiry.remove(key);
                continue;
            }
            MatchEntity match = matchRepository.findById(state.matchId()).orElse(null);
            if (match == null || match.getStatus() != MatchStatus.ACTIVE) {
                deleteDisconnectState(state.matchId(), state.userId());
                continue;
            }
            String opponentId = match.getPlayer1().getId().toString().equals(state.userId())
                    ? match.getPlayer2().getId().toString()
                    : match.getPlayer1().getId().toString();
            if (disconnectExpiry.containsKey(disconnectKey(state.matchId(), opponentId))) {
                voidMatch(state.matchId());
                deleteDisconnectState(state.matchId(), state.userId());
                deleteDisconnectState(state.matchId(), opponentId);
                continue;
            }
            deleteDisconnectState(state.matchId(), state.userId());
            matchStateService.endMatch(state.matchId(), opponentId);
        }
    }

    private void voidMatch(String matchId) {
        UUID matchUuid = UUID.fromString(matchId);
        MatchEntity match = matchRepository.findById(matchUuid.toString()).orElse(null);
        if (match == null) {
            matchSessions.remove(matchId);
            return;
        }
        match.setStatus(MatchStatus.VOID);
        match.setEndedAt(LocalDateTime.now());
        matchRepository.save(match);
        matchSessions.remove(matchId);
        messagingTemplate.convertAndSend("/topic/match." + matchId, Map.of("type", "MATCH_VOID"));
    }

    private void deleteDisconnectState(String matchId, String userId) {
        disconnectExpiry.remove(disconnectKey(matchId, userId));
    }

    private DisconnectState parseDisconnectKey(String disconnectKey) {
        if (!disconnectKey.startsWith(DISCONNECT_PREFIX)) {
            return null;
        }
        String remainder = disconnectKey.substring(DISCONNECT_PREFIX.length());
        int lastSeparator = remainder.lastIndexOf(':');
        if (lastSeparator <= 0 || lastSeparator == remainder.length() - 1) {
            return null;
        }
        return new DisconnectState(remainder.substring(0, lastSeparator), remainder.substring(lastSeparator + 1));
    }

    private String disconnectKey(String matchId, String userId) {
        return DISCONNECT_PREFIX + matchId + ":" + userId;
    }

    private String readSessionId(String userId) {
        QueueEntry entry = meta.get(userId);
        if (entry == null || entry.sessionId() == null || entry.sessionId().isBlank()) {
            return userId;
        }
        return entry.sessionId();
    }

    private String readSessionOwner(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            return sessionId;
        }
        String owner = sessionOwners.get(sessionId);
        return owner == null ? sessionId : owner;
    }

    private record QueueEntry(String sessionId, long joinedAt, long timeoutAt, int eloWindow) {
    }

    private record MatchSessions(String p1SessionId, String p2SessionId) {
    }

    private record DisconnectState(String matchId, String userId) {
    }

    public static class MatchFoundEvent {
        public String matchId;
        public ProblemDto problem;
        public UserProfileDto opponent;

        public MatchFoundEvent(String matchId, ProblemDto problem, UserProfileDto opponent) {
            this.matchId = matchId;
            this.problem = problem;
            this.opponent = opponent;
        }
    }
}
