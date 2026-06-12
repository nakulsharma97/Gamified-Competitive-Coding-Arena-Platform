package com.codeslam.backend.match;

import com.codeslam.backend.dto.DamageResult;
import com.codeslam.backend.entity.EloHistory;
import com.codeslam.backend.entity.MatchEntity;
import com.codeslam.backend.entity.Submission;
import com.codeslam.backend.entity.User;
import com.codeslam.backend.enums.MatchStatus;
import com.codeslam.backend.enums.Rank;
import com.codeslam.backend.repository.EloHistoryRepository;
import com.codeslam.backend.repository.MatchRepository;
import com.codeslam.backend.repository.UserRepository;
import com.codeslam.backend.service.EloService;
import com.codeslam.backend.websocket.MatchWebSocketPublisher;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service("battleMatchStateService")
public class MatchStateService {

    private static final int DEFAULT_TIMER_SECONDS = 600;

    private final MatchRepository matchRepository;
    private final UserRepository userRepository;
    private final EloHistoryRepository eloHistoryRepository;
    private final EloService eloService;
    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;
    private final MatchWebSocketPublisher matchWebSocketPublisher;

    public MatchStateService(
            MatchRepository matchRepository,
            UserRepository userRepository,
            EloHistoryRepository eloHistoryRepository,
            @Lazy EloService eloService,
            SimpMessagingTemplate messagingTemplate,
            ObjectMapper objectMapper,
            MatchWebSocketPublisher matchWebSocketPublisher) {
        this.matchRepository = matchRepository;
        this.userRepository = userRepository;
        this.eloHistoryRepository = eloHistoryRepository;
        this.eloService = eloService;
        this.messagingTemplate = messagingTemplate;
        this.objectMapper = objectMapper;
        this.matchWebSocketPublisher = matchWebSocketPublisher;
    }

    public void initMatchState(String matchId, String p1Id, String p2Id, int p1Elo, int p2Elo) {
        // State initialized - stored in database
    }

    public MatchDamageResult applyDamage(MatchState initialState, Submission submission, DamageResult damageResult,
            boolean selfDamage) {
<<<<<<< HEAD
       UUID matchUuid = UUID.randomUUID();
=======
        UUID matchUuid = parseUuid(initialState.matchId(), "matchId");
>>>>>>> 69d97fb (Dess)
        MatchEntity match = matchRepository.findById(matchUuid.toString())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Match not found"));

        String p1Id = match.getPlayer1().getId().toString();
        String p2Id = match.getPlayer2().getId().toString();
<<<<<<< HEAD
        String attackerId = submission.getUser().getId().toString();
=======
        boolean attackerIsP1 = Objects.equals(submission.getUser().getId().toString(), p1Id);
        boolean attackerIsP2 = Objects.equals(submission.getUser().getId().toString(), p2Id);
        if (!attackerIsP1 && !attackerIsP2) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "User is not part of this match");
        }
>>>>>>> 69d97fb (Dess)

boolean attackerIsP1 = attackerId.equals(p1Id);
boolean attackerIsP2 = attackerId.equals(p2Id);

<<<<<<< HEAD
int damage = damageResult.getDamageDealt() != null
        ? damageResult.getDamageDealt()
        : 0;

int selfDmg = damageResult.getSelfDamage() != null
        ? damageResult.getSelfDamage()
        : 0;

int newP2Hp = 0;
int newP1Hp = 0;
if (attackerIsP1) {

    newP2Hp -= damage;
    newP1Hp -= selfDmg;

    match.setPlayer1TotalDamage(
            (match.getPlayer1TotalDamage() != null
                    ? match.getPlayer1TotalDamage()
                    : 0) + damage);

} else {

    newP1Hp -= damage;
    newP2Hp -= selfDmg;

    match.setPlayer2TotalDamage(
            (match.getPlayer2TotalDamage() != null
                    ? match.getPlayer2TotalDamage()
                    : 0) + damage);
}
=======
        if (attackerIsP1) {
            newP2Hp -= damageResult.getDamageDealt();
            newP1Hp -= damageResult.getSelfDamage();
            match.setPlayer1TotalDamage(
                    (match.getPlayer1TotalDamage() != null ? match.getPlayer1TotalDamage() : 0)
                            + damageResult.getDamageDealt());
        } else {
            newP1Hp -= damageResult.getDamageDealt();
            newP2Hp -= damageResult.getSelfDamage();
            match.setPlayer2TotalDamage(
                    (match.getPlayer2TotalDamage() != null ? match.getPlayer2TotalDamage() : 0)
                            + damageResult.getDamageDealt());
        }
>>>>>>> 69d97fb (Dess)

        newP1Hp = Math.max(0, newP1Hp);
        newP2Hp = Math.max(0, newP2Hp);

        match.setPlayer1Hp(newP1Hp);
        match.setPlayer2Hp(newP2Hp);
        matchRepository.save(match);

        boolean matchEnded = newP1Hp <= 0 || newP2Hp <= 0;
<<<<<<< HEAD
       matchWebSocketPublisher.publishHpUpdated(match.getId(), Map.of(
        "matchId", match.getId(),
        "player1Hp", newP1Hp,
        "player2Hp", newP2Hp,
        "attackerId", attackerId,
        "damage", damage,
        "selfDamage", selfDmg,
        "matchEnded", matchEnded));
=======
        matchWebSocketPublisher.publishHpUpdated(initialState.matchId(), Map.of(
                "matchId", initialState.matchId(),
                "player1Hp", newP1Hp,
                "player2Hp", newP2Hp,
                "attackerId", submission.getUser().getId().toString(),
                "damage", damageResult.getDamageDealt(),
                "selfDamage", damageResult.getSelfDamage(),
                "matchEnded", matchEnded));
>>>>>>> 69d97fb (Dess)
        return new MatchDamageResult(newP1Hp, newP2Hp, matchEnded);
    }

    public boolean isFirstAc(String matchId) {
        UUID matchUuid = parseUuid(matchId, "matchId");
        MatchEntity match = matchRepository.findById(matchUuid.toString()).orElse(null);
        return match == null;
    }

    public void setFirstAcBy(String matchId, String userId) {
        // first-ac tracking is not stored in the current match entity schema
    }

    public void updateLastAcStats(String matchId, String userId, int runtimeMs, double memoryMb) {
        // Stats updated in submission, not needed here
    }

    public boolean isActiveParticipant(String matchId, String userId) {
        UUID matchUuid = parseUuid(matchId, "matchId");
        MatchEntity match = matchRepository.findById(matchUuid.toString()).orElse(null);
        if (match == null || match.getStatus() != MatchStatus.ACTIVE) {
            return false;
        }
        return (match.getPlayer1() != null && Objects.equals(userId, match.getPlayer1().getId().toString()))
                || (match.getPlayer2() != null && Objects.equals(userId, match.getPlayer2().getId().toString()));
    }

    @Transactional
    public void endMatch(String matchId, String winnerId) {
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

        int finalP1Hp = match.getPlayer1Hp() != null ? match.getPlayer1Hp() : 100;
        int finalP2Hp = match.getPlayer2Hp() != null ? match.getPlayer2Hp() : 100;
        int p1TotalDamage = match.getPlayer1TotalDamage() != null ? match.getPlayer1TotalDamage() : 0;
        int p2TotalDamage = match.getPlayer2TotalDamage() != null ? match.getPlayer2TotalDamage() : 0;

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
            UUID matchUuid = parseUuid(matchId, "matchId");
            MatchEntity match = matchRepository.findById(matchUuid.toString()).orElse(null);
            if (match == null || match.getStatus() != MatchStatus.ACTIVE) {
                return;
            }

            messagingTemplate.convertAndSend("/topic/matches/" + matchId, new TimerTickEvent(i));

            if (i > 0) {
                try {
                    Thread.sleep(1000);
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    return;
                }
            }
        }
    }

    private UUID parseUuid(String value, String fieldName) {
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid " + fieldName);
        }
    }

   public static class MatchDamageResult {
    public int player1Hp;
    public int player2Hp;
    public boolean matchEnded;

<<<<<<< HEAD
    public MatchDamageResult(int player1Hp, int player2Hp, boolean matchEnded) {
        this.player1Hp = player1Hp;
        this.player2Hp = player2Hp;
        this.matchEnded = matchEnded;
=======
        public MatchDamageResult(int player1Hp, int player2Hp, boolean matchEnded) {
            this.player1Hp = player1Hp;
            this.player2Hp = player2Hp;
            this.matchEnded = matchEnded;
        }
>>>>>>> 69d97fb (Dess)
    }
}

<<<<<<< HEAD
public static class TimerTickEvent {
    public int secondsRemaining;
=======
    public static class TimerTickEvent {
        public int secondsRemaining;
>>>>>>> 69d97fb (Dess)

    public TimerTickEvent(int secondsRemaining) {
        this.secondsRemaining = secondsRemaining;
    }
}

public static class MatchEndEvent {
    public UUID winnerId;
    public int player1EloChange;
    public int player2EloChange;
    public int finalP1Hp;
    public int finalP2Hp;

    public MatchEndEvent(
            UUID winnerId,
            int player1EloChange,
            int player2EloChange,
            int finalP1Hp,
            int finalP2Hp) {

        this.winnerId = winnerId;
        this.player1EloChange = player1EloChange;
        this.player2EloChange = player2EloChange;
        this.finalP1Hp = finalP1Hp;
        this.finalP2Hp = finalP2Hp;
    }
}

<<<<<<< HEAD
public static class MatchState {
}
}
=======
    public static record MatchState(String matchId, String player1Id, String player2Id) {
    }
}
>>>>>>> 69d97fb (Dess)
