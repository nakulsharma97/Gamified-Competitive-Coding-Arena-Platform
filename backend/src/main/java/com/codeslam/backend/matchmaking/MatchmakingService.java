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
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MatchmakingService {

    private static final String QUEUE_KEY = "queue:ranked";
    private static final String META_PREFIX = "queue:meta:";
    private static final String SESSION_PREFIX = "ws:session:";
    private static final String DISCONNECT_PREFIX = "disconnect:";
    private static final String DISCONNECT_INDEX_KEY = "disconnect:index";
    private static final String ONLINE_KEY = "stats:online";
    private static final int DEFAULT_ELO_WINDOW = 100;
    private static final long QUEUE_TIMEOUT_MS = 45_000L;
    private static final long WAIT_THRESHOLD_MS = 15_000L;
    private static final int WINDOW_GROWTH = 50;

    @Value("${scheduling.enabled:true}")
    private boolean schedulingEnabled;
    private static final int DEFAULT_HP = 100;
    private static final long DISCONNECT_GRACE_MS = 60_000L;

    private final RedisTemplate<String, String> redisTemplate;
    private final MatchRepository matchRepository;
    private final ProblemRepository problemRepository;
    private final UserRepository userRepository;
    private final ProblemMapper problemMapper;
    private final UserMapper userMapper;
    private final SimpMessagingTemplate messagingTemplate;
    private final MatchStateService matchStateService;
    private final MatchWebSocketPublisher matchWebSocketPublisher;

    public MatchmakingService(@Qualifier("matchRedisTemplate") RedisTemplate<String, String> redisTemplate,
            MatchRepository matchRepository, ProblemRepository problemRepository, UserRepository userRepository,
            ProblemMapper problemMapper, UserMapper userMapper, SimpMessagingTemplate messagingTemplate,
            @Qualifier("redisMatchStateService") MatchStateService matchStateService,
            MatchWebSocketPublisher matchWebSocketPublisher) {
        this.redisTemplate = redisTemplate;
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
        String resolvedSessionId = sessionId == null ? userId : sessionId;
        redisTemplate.opsForZSet().add(QUEUE_KEY, userId, (double) userElo);
        redisTemplate.opsForHash().putAll(META_PREFIX + userId, Map.of(
                "sessionId", resolvedSessionId,
                "joinedAt", String.valueOf(System.currentTimeMillis()),
                "eloWindow", String.valueOf(DEFAULT_ELO_WINDOW),
                "timeoutAt", String.valueOf(System.currentTimeMillis() + QUEUE_TIMEOUT_MS)));
        Long queueSize = Optional.ofNullable(redisTemplate.opsForZSet().size(QUEUE_KEY)).orElse(0L);
        redisTemplate.opsForValue().increment(ONLINE_KEY);
        messagingTemplate.convertAndSendToUser(userId, "/queue/queue-status",
                Map.of("status", "SEARCHING", "queueSize", queueSize));
    }

    public void registerSession(String sessionId, String userId) {
        if (sessionId == null || sessionId.isBlank() || userId == null || userId.isBlank()) {
            return;
        }

        redisTemplate.opsForValue().set(SESSION_PREFIX + sessionId, userId, java.time.Duration.ofHours(2));
    }

    public void leaveQueue(String userId) {
        if (userId == null || userId.isBlank()) {
            return;
        }
        Long removed = redisTemplate.opsForZSet().remove(QUEUE_KEY, userId);
        redisTemplate.delete(META_PREFIX + userId);
        if (removed != null && removed > 0) {
            redisTemplate.opsForValue().decrement(ONLINE_KEY);
        }
    }

    public void cancelSearch(String userId) {
        leaveQueue(userId);
    }

    public long getQueueSize() {
        return Optional.ofNullable(redisTemplate.opsForZSet().size(QUEUE_KEY)).orElse(0L);
    }

    @Scheduled(fixedDelay = 5_000)
    @ConditionalOnProperty(name = "scheduling.enabled", havingValue = "true", matchIfMissing = true)
    public void processQueueTimeouts() {
        if (!schedulingEnabled) {
            return;
        }
        Set<ZSetOperations.TypedTuple<String>> members = redisTemplate.opsForZSet().rangeWithScores(QUEUE_KEY, 0, -1);
        if (members == null || members.isEmpty()) {
            return;
        }

        long now = System.currentTimeMillis();
        for (ZSetOperations.TypedTuple<String> member : members) {
            String userId = member.getValue();
            if (userId == null || userId.isBlank()) {
                continue;
            }

            Map<Object, Object> meta = redisTemplate.opsForHash().entries(META_PREFIX + userId);
            long timeoutAt = parseLong(meta.get("timeoutAt"), 0L);
            long joinedAt = parseLong(meta.get("joinedAt"), now);
            if (timeoutAt > 0L && now >= timeoutAt || now - joinedAt >= QUEUE_TIMEOUT_MS) {
                leaveQueue(userId);
                messagingTemplate.convertAndSendToUser(userId, "/queue/queue-status",
                        Map.of("status", "TIMEOUT", "reason", "NO_OPPONENT_FOUND"));
            }
        }
    }

    @Scheduled(fixedDelay = 2_000)
    @ConditionalOnProperty(name = "scheduling.enabled", havingValue = "true", matchIfMissing = true)
    @Transactional
    public void runMatchmaker() {
        if (!schedulingEnabled) {
            return;
        }
        Set<ZSetOperations.TypedTuple<String>> members = redisTemplate.opsForZSet().rangeWithScores(QUEUE_KEY, 0, -1);
        if (members == null || members.size() < 2) {
            return;
        }

        List<ZSetOperations.TypedTuple<String>> orderedMembers = new ArrayList<>(members);
        orderedMembers.sort(Comparator.comparingDouble(tuple -> tuple.getScore() == null ? Double.MAX_VALUE
                : tuple.getScore()));

        Set<String> matched = new HashSet<>();
        for (ZSetOperations.TypedTuple<String> member : orderedMembers) {
            String userId = member.getValue();
            Double score = member.getScore();
            if (userId == null || score == null || matched.contains(userId)) {
                continue;
            }

            Map<Object, Object> meta = redisTemplate.opsForHash().entries(META_PREFIX + userId);
            if (meta == null || meta.isEmpty()) {
                continue;
            }

            long joinedAt = parseLong(meta.get("joinedAt"), System.currentTimeMillis());
            int eloWindow = parseInt(meta.get("eloWindow"), DEFAULT_ELO_WINDOW);
            if (System.currentTimeMillis() - joinedAt > WAIT_THRESHOLD_MS) {
                eloWindow += WINDOW_GROWTH;
                redisTemplate.opsForHash().put(META_PREFIX + userId, "eloWindow", String.valueOf(eloWindow));
            }

            ZSetOperations.TypedTuple<String> opponent = findNearestOpponent(userId, score, eloWindow, matched);
            if (opponent == null || opponent.getValue() == null || opponent.getScore() == null) {
                continue;
            }

            String opponentId = opponent.getValue();
            matched.add(userId);
            matched.add(opponentId);

            createMatch(userId, (int) Math.round(score), opponentId, (int) Math.round(opponent.getScore()));
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
        redisTemplate.opsForHash().putAll("match:sessions:" + match.getId(), Map.of(
                "p1SessionId", p1SessionId,
                "p2SessionId", p2SessionId));
        redisTemplate.expire("match:sessions:" + match.getId(), java.time.Duration.ofHours(2));

        Long removedP1 = redisTemplate.opsForZSet().remove(QUEUE_KEY, p1Id);
        Long removedP2 = redisTemplate.opsForZSet().remove(QUEUE_KEY, p2Id);
        redisTemplate.delete(META_PREFIX + p1Id);
        redisTemplate.delete(META_PREFIX + p2Id);
        long decremented = (removedP1 != null && removedP1 > 0 ? 1 : 0) + (removedP2 != null && removedP2 > 0 ? 1 : 0);
        if (decremented > 0) {
            redisTemplate.opsForValue().increment(ONLINE_KEY, -decremented);
        }

        ProblemDto problemDto = problemMapper.toDto(problem);
        UserProfileDto p1Profile = userMapper.toDto(player1);
        UserProfileDto p2Profile = userMapper.toDto(player2);
        MatchFoundPayload p1Payload = new MatchFoundPayload(match.getId().toString(), p2Profile.username(),
                problem.getTitle());
        MatchFoundPayload p2Payload = new MatchFoundPayload(match.getId().toString(), p1Profile.username(),
                problem.getTitle());

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

    public void handleDisconnect(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            return;
        }

        String lookupKey = SESSION_PREFIX + sessionId;
        String resolvedUserId = redisTemplate.opsForValue().get(lookupKey);

        redisTemplate.delete(lookupKey);

        Set<String> keys = redisTemplate.keys(META_PREFIX + "*");
        if (keys == null || keys.isEmpty()) {
            return;
        }

        for (String key : keys) {
            Map<Object, Object> meta = redisTemplate.opsForHash().entries(key);
            Object storedSessionId = meta.get("sessionId");
            if (!Objects.equals(sessionId, storedSessionId == null ? null : storedSessionId.toString())) {
                continue;
            }

            String userId = key.substring(META_PREFIX.length());
            leaveQueue(userId);
            return;
        }

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
    @Transactional
    public void processDisconnectTimeouts() {
        if (!schedulingEnabled) {
            return;
        }
        long now = System.currentTimeMillis();
        Set<String> dueKeys = redisTemplate.opsForZSet().rangeByScore(DISCONNECT_INDEX_KEY, 0, now);
        if (dueKeys == null || dueKeys.isEmpty()) {
            return;
        }

        for (String disconnectKey : dueKeys) {
            if (disconnectKey == null || disconnectKey.isBlank()) {
                continue;
            }

            DisconnectState state = parseDisconnectKey(disconnectKey);
            if (state == null) {
                redisTemplate.opsForZSet().remove(DISCONNECT_INDEX_KEY, disconnectKey);
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
            if (Boolean.TRUE.equals(redisTemplate.hasKey(disconnectKey(state.matchId(), opponentId)))) {
                voidMatch(state.matchId());
                deleteDisconnectState(state.matchId(), state.userId());
                deleteDisconnectState(state.matchId(), opponentId);
                continue;
            }

            deleteDisconnectState(state.matchId(), state.userId());
            matchStateService.endMatch(state.matchId(), opponentId);
        }
    }

    private ZSetOperations.TypedTuple<String> findNearestOpponent(String userId, double elo, int eloWindow,
            Set<String> matched) {
        Set<ZSetOperations.TypedTuple<String>> candidates = redisTemplate.opsForZSet()
                .rangeByScoreWithScores(QUEUE_KEY, elo - eloWindow, elo + eloWindow);
        if (candidates == null || candidates.isEmpty()) {
            return null;
        }

        return candidates.stream()
                .filter(candidate -> candidate.getValue() != null)
                .filter(candidate -> candidate.getScore() != null)
                .filter(candidate -> !userId.equals(candidate.getValue()))
                .filter(candidate -> !matched.contains(candidate.getValue()))
                .min(Comparator.comparingDouble(candidate -> Math.abs(candidate.getScore() - elo)))
                .orElse(null);
    }

    private User getUser(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
    }

    private void handleActiveDisconnect(String sessionId) {
        Set<String> keys = redisTemplate.keys("match:sessions:*");
        if (keys == null || keys.isEmpty()) {
            return;
        }

        for (String key : keys) {
            Map<Object, Object> sessionMap = redisTemplate.opsForHash().entries(key);
            String p1SessionId = value(sessionMap.get("p1SessionId"));
            String p2SessionId = value(sessionMap.get("p2SessionId"));
            if (!Objects.equals(sessionId, p1SessionId) && !Objects.equals(sessionId, p2SessionId)) {
                continue;
            }

            String matchId = key.substring("match:sessions:".length());
            MatchEntity match = matchRepository.findById(matchId).orElse(null);
            if (match == null || match.getStatus() != MatchStatus.ACTIVE) {
                return;
            }

            String userId = Objects.equals(sessionId, p1SessionId)
                    ? match.getPlayer1().getId().toString()
                    : match.getPlayer2().getId().toString();
            String opponentId = Objects.equals(userId, match.getPlayer1().getId().toString())
                    ? match.getPlayer2().getId().toString()
                    : match.getPlayer1().getId().toString();
            String opponentSessionId = Objects.equals(sessionId, p1SessionId) ? p2SessionId : p1SessionId;
            String opponentUserId = readSessionOwner(opponentSessionId);

            String disconnectKey = disconnectKey(matchId, userId);
            if (Boolean.TRUE.equals(redisTemplate.hasKey(disconnectKey(matchId, opponentId)))) {
                voidMatch(matchId);
                deleteDisconnectState(matchId, userId);
                deleteDisconnectState(matchId, opponentId);
            } else {
                redisTemplate.opsForValue().set(disconnectKey, "1", java.time.Duration.ofSeconds(60));
                redisTemplate.opsForZSet().add(DISCONNECT_INDEX_KEY, disconnectKey, (double) (System.currentTimeMillis()
                        + DISCONNECT_GRACE_MS));
                messagingTemplate.convertAndSendToUser(opponentUserId, "/queue/match-state",
                        Map.of("type", "OPPONENT_DISCONNECTED", "reconnectWindowSeconds", 60));
            }
            return;
        }
    }

    private void voidMatch(String matchId) {
        UUID matchUuid = UUID.fromString(matchId);
        MatchEntity match = matchRepository.findById(matchUuid.toString()).orElse(null);
        if (match == null) {
            return;
        }

        match.setStatus(MatchStatus.VOID);
        match.setEndedAt(LocalDateTime.now());
        matchRepository.save(match);
        messagingTemplate.convertAndSend("/topic/match." + matchId, Map.of("type", "MATCH_VOID"));
    }

    private void deleteDisconnectState(String matchId, String userId) {
        String key = disconnectKey(matchId, userId);
        redisTemplate.delete(key);
        redisTemplate.opsForZSet().remove(DISCONNECT_INDEX_KEY, key);
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

    private String value(Object value) {
        return value == null ? null : value.toString();
    }

    private record DisconnectState(String matchId, String userId) {
    }

    private String readSessionId(String userId) {
        Object sessionId = redisTemplate.opsForHash().get(META_PREFIX + userId, "sessionId");
        return sessionId == null ? userId : sessionId.toString();
    }

    private String readSessionOwner(String sessionId) {
        Object owner = redisTemplate.opsForValue().get(SESSION_PREFIX + sessionId);
        return owner == null ? sessionId : owner.toString();
    }

    private int parseInt(Object value, int defaultValue) {
        if (value == null) {
            return defaultValue;
        }
        try {
            return Integer.parseInt(value.toString());
        } catch (NumberFormatException exception) {
            return defaultValue;
        }
    }

    private long parseLong(Object value, long defaultValue) {
        if (value == null) {
            return defaultValue;
        }
        try {
            return Long.parseLong(value.toString());
        } catch (NumberFormatException exception) {
            return defaultValue;
        }
    }
}