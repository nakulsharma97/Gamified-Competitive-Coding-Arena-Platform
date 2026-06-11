package com.codeslam.backend.match;

import com.codeslam.backend.entity.EloHistory;
import com.codeslam.backend.entity.MatchEntity;
import com.codeslam.backend.entity.User;
import com.codeslam.backend.enums.MatchStatus;
import com.codeslam.backend.enums.Rank;
import com.codeslam.backend.repository.EloHistoryRepository;
import com.codeslam.backend.repository.MatchRepository;
import com.codeslam.backend.repository.UserRepository;
import com.codeslam.backend.service.EloService;
import com.codeslam.backend.websocket.MatchWebSocketPublisher;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.SessionCallback;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service("redisMatchStateService")
public class MatchStateService {

    private static final String MATCH_KEY_PREFIX = "match:";
    private static final int DEFAULT_TIMER_SECONDS = 600;

    private final RedisTemplate<String, String> redisTemplate;
    private final MatchRepository matchRepository;
    private final UserRepository userRepository;
    private final EloHistoryRepository eloHistoryRepository;
    private final EloService eloService;
    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;
    private final MatchWebSocketPublisher matchWebSocketPublisher;

    public MatchStateService(
            @Qualifier("matchRedisTemplate") RedisTemplate<String, String> matchRedisTemplate,
            MatchRepository matchRepository,
            UserRepository userRepository,
            EloHistoryRepository eloHistoryRepository,
            @Lazy EloService eloService,
            SimpMessagingTemplate messagingTemplate,
            ObjectMapper objectMapper,
            MatchWebSocketPublisher matchWebSocketPublisher) {
        this.redisTemplate = matchRedisTemplate;
        this.matchRepository = matchRepository;
        this.userRepository = userRepository;
        this.eloHistoryRepository = eloHistoryRepository;
        this.eloService = eloService;
        this.messagingTemplate = messagingTemplate;
        this.objectMapper = objectMapper;
        this.matchWebSocketPublisher = matchWebSocketPublisher;
    }

    public void initMatchState(String matchId, String p1Id, String p2Id, int p1Elo, int p2Elo) {
        String key = key(matchId);
        Map<String, String> state = new HashMap<>();
        state.put("p1Id", p1Id);
        state.put("p2Id", p2Id);
        state.put("p1Hp", "100");
        state.put("p2Hp", "100");
        state.put("status", "ACTIVE");
        state.put("timerSeconds", String.valueOf(DEFAULT_TIMER_SECONDS));
        state.put("p1Powerups", "[\"BLUR\",\"LOCK_KEYWORD\",\"REVERSE_KEYBOARD\"]");
        state.put("p2Powerups", "[\"BLUR\",\"LOCK_KEYWORD\",\"REVERSE_KEYBOARD\"]");
        state.put("p1LastAcRuntimeMs", "");
        state.put("p2LastAcRuntimeMs", "");
        state.put("p1LastAcMemoryMb", "");
        state.put("p2LastAcMemoryMb", "");
        state.put("p1TotalDamage", "0");
        state.put("p2TotalDamage", "0");
        state.put("firstAcBy", "");
        state.put("p1EloSnapshot", String.valueOf(p1Elo));
        state.put("p2EloSnapshot", String.valueOf(p2Elo));

        redisTemplate.opsForHash().putAll(key, state);
        redisTemplate.expire(key, Duration.ofHours(2));
    }

    public MatchDamageResult applyDamage(String matchId, String attackerId, int damage, int selfDamage) {
        String key = key(matchId);
        String p1Id = readString(key, "p1Id");
        String p2Id = readString(key, "p2Id");
        boolean attackerIsP1 = Objects.equals(attackerId, p1Id);
        boolean attackerIsP2 = Objects.equals(attackerId, p2Id);
        if (!attackerIsP1 && !attackerIsP2) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "User is not part of this match");
        }

        String opponentHpField = attackerIsP1 ? "p2Hp" : "p1Hp";
        String attackerHpField = attackerIsP1 ? "p1Hp" : "p2Hp";
        String attackerDamageField = attackerIsP1 ? "p1TotalDamage" : "p2TotalDamage";

        redisTemplate.execute(new SessionCallback<Object>() {
            @Override
            public Object execute(org.springframework.data.redis.core.RedisOperations operations) {
                operations.multi();
                operations.opsForHash().increment(key, opponentHpField, -damage);
                if (selfDamage > 0) {
                    operations.opsForHash().increment(key, attackerHpField, -selfDamage);
                }
                operations.opsForHash().increment(key, attackerDamageField, damage);
                return operations.exec();
            }
        });

        int newP1Hp = readInt(key, "p1Hp", 100);
        int newP2Hp = readInt(key, "p2Hp", 100);
        boolean matchEnded = newP1Hp <= 0 || newP2Hp <= 0;
        matchWebSocketPublisher.publishHpUpdated(matchId, Map.of(
                "matchId", matchId,
                "player1Hp", newP1Hp,
                "player2Hp", newP2Hp,
                "attackerId", attackerId,
                "damage", damage,
                "selfDamage", selfDamage,
                "matchEnded", matchEnded));
        return new MatchDamageResult(newP1Hp, newP2Hp, matchEnded);
    }

    public boolean isFirstAc(String matchId) {
        return readString(key(matchId), "firstAcBy").isBlank();
    }

    public void setFirstAcBy(String matchId, String userId) {
        redisTemplate.opsForHash().put(key(matchId), "firstAcBy", userId);
    }

    public void updateLastAcStats(String matchId, String userId, int runtimeMs, double memoryMb) {
        String key = key(matchId);
        String p1Id = readString(key, "p1Id");
        String fieldPrefix = Objects.equals(userId, p1Id) ? "p1" : "p2";
        if (!Objects.equals(userId, p1Id) && !Objects.equals(userId, readString(key, "p2Id"))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "User is not part of this match");
        }

        redisTemplate.opsForHash().put(key, fieldPrefix + "LastAcRuntimeMs", String.valueOf(runtimeMs));
        redisTemplate.opsForHash().put(key, fieldPrefix + "LastAcMemoryMb", String.valueOf(memoryMb));
    }

    public boolean isActiveParticipant(String matchId, String userId) {
        String key = key(matchId);
        return "ACTIVE".equals(readString(key, "status"))
                && (Objects.equals(userId, readString(key, "p1Id")) || Objects.equals(userId, readString(key, "p2Id")));
    }

    @Transactional
    public void endMatch(String matchId, String winnerId) {
        String key = key(matchId);
        redisTemplate.opsForHash().put(key, "status", "COMPLETED");
        redisTemplate.opsForHash().put(key, "winnerId", winnerId);

        UUID matchUuid = parseUuid(matchId, "matchId");
        UUID winnerUuid = parseUuid(winnerId, "winnerId");

        MatchEntity match = matchRepository.findById(matchUuid.toString())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Match not found"));

        User player1 = userRepository.findById(match.getPlayer1().getId().toString())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Player 1 not found"));
        User player2 = userRepository.findById(match.getPlayer2().getId().toString())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Player 2 not found"));

        int player1OldElo = player1.getEloRating();
        int player2OldElo = player2.getEloRating();
        boolean player1Won = Objects.equals(player1.getId(), winnerUuid);
        boolean player2Won = Objects.equals(player2.getId(), winnerUuid);

        int player1NewElo = eloService.calculateNewElo(player1OldElo, player2OldElo, player1Won);
        int player2NewElo = eloService.calculateNewElo(player2OldElo, player1OldElo, player2Won);

        player1.setEloRating(player1NewElo);
        player1.setRank(Rank.valueOf(eloService.getRankTier(player1NewElo).name()));
        player2.setEloRating(player2NewElo);
        player2.setRank(Rank.valueOf(eloService.getRankTier(player2NewElo).name()));
        userRepository.save(player1);
        userRepository.save(player2);

        eloHistoryRepository.save(EloHistory.builder()
                .user(player1)
                .eloBefore(player1OldElo)
                .eloAfter(player1NewElo)
                .match(match)
                .build());
        eloHistoryRepository.save(EloHistory.builder()
                .user(player2)
                .eloBefore(player2OldElo)
                .eloAfter(player2NewElo)
                .match(match)
                .build());

        int finalP1Hp = readInt(key, "p1Hp", match.getPlayer1Hp() == null ? 100 : match.getPlayer1Hp());
        int finalP2Hp = readInt(key, "p2Hp", match.getPlayer2Hp() == null ? 100 : match.getPlayer2Hp());
        int p1TotalDamage = readInt(key, "p1TotalDamage", 0);
        int p2TotalDamage = readInt(key, "p2TotalDamage", 0);

        match.setWinner(player1Won ? match.getPlayer1() : match.getPlayer2());
        match.setStatus(MatchStatus.COMPLETED);
        match.setEndedAt(LocalDateTime.now());
        match.setPlayer1Hp(finalP1Hp);
        match.setPlayer2Hp(finalP2Hp);
        match.setPlayer1EloSnapshot(player1OldElo);
        match.setPlayer2EloSnapshot(player2OldElo);
        match.setPlayer1TotalDamage(p1TotalDamage);
        match.setPlayer2TotalDamage(p2TotalDamage);
        match.setEloChangeP1(player1NewElo - player1OldElo);
        match.setEloChangeP2(player2NewElo - player2OldElo);
        matchRepository.save(match);

        messagingTemplate.convertAndSend("/topic/leaderboard", Map.of(
                "type", "leaderboard_refresh",
                "matchId", matchId,
                "updatedUserIds", List.of(player1.getId(), player2.getId())));

        messagingTemplate.convertAndSend("/topic/matches/" + matchId,
                new MatchEndEvent(winnerUuid, player1NewElo - player1OldElo, player2NewElo - player2OldElo,
                        finalP1Hp, finalP2Hp));
        matchWebSocketPublisher.publishMatchEnded(matchId, Map.of(
                "matchId", matchId,
                "winnerId", winnerId,
                "player1Id", player1.getId().toString(),
                "player2Id", player2.getId().toString(),
                "player1Hp", finalP1Hp,
                "player2Hp", finalP2Hp,
                "player1EloChange", player1NewElo - player1OldElo,
                "player2EloChange", player2NewElo - player2OldElo));
    }

    @Async
    public void startCountdown(String matchId) {
        for (int i = DEFAULT_TIMER_SECONDS; i >= 0; i--) {
            if (!isActive(matchId)) {
                return;
            }

            messagingTemplate.convertAndSend("/topic/matches/" + matchId, new TimerTickEvent(i));
            matchWebSocketPublisher.publishTimerSync(matchId, Map.of(
                    "matchId", matchId,
                    "timerSeconds", i,
                    "status", "ACTIVE"));

            if (i == 0) {
                endMatch(matchId, resolveTimerWinner(matchId));
                return;
            }

            try {
                Thread.sleep(1000L);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                return;
            }
        }
    }

    private boolean isActive(String matchId) {
        return "ACTIVE".equals(readString(key(matchId), "status"));
    }

    String resolveTimerWinner(String matchId) {
        String key = key(matchId);
        int p1TotalDamage = readInt(key, "p1TotalDamage", 0);
        int p2TotalDamage = readInt(key, "p2TotalDamage", 0);
        String p1Id = readString(key, "p1Id");
        String p2Id = readString(key, "p2Id");

        if (p1TotalDamage > p2TotalDamage) {
            return p1Id;
        }
        if (p2TotalDamage > p1TotalDamage) {
            return p2Id;
        }

        int p1Elo = readInt(key, "p1EloSnapshot", 0);
        int p2Elo = readInt(key, "p2EloSnapshot", 0);
        if (p1Elo > p2Elo) {
            return p1Id;
        }
        if (p2Elo > p1Elo) {
            return p2Id;
        }
        return p1Id;
    }

    private String readString(String key, String field) {
        Object value = redisTemplate.opsForHash().get(key, field);
        return value == null ? "" : value.toString();
    }

    private int readInt(String key, String field, int defaultValue) {
        String value = readString(key, field);
        if (value.isBlank()) {
            return defaultValue;
        }
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException exception) {
            return defaultValue;
        }
    }

    private UUID parseUuid(String value, String fieldName) {
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid " + fieldName);
        }
    }

    private String key(String matchId) {
        return MATCH_KEY_PREFIX + matchId;
    }
}