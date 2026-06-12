package com.codeslam.backend.service;

import com.codeslam.backend.dto.DamageResult;
import com.codeslam.backend.dto.SubmissionProcessingResultDto;
import com.codeslam.backend.entity.MatchEntity;
import com.codeslam.backend.entity.Submission;
import com.codeslam.backend.enums.MatchStatus;
import com.codeslam.backend.enums.Verdict;
import com.codeslam.backend.event.MatchCompletedEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MatchStateService {

    private final ObjectMapper objectMapper;
    private final com.codeslam.backend.repository.MatchRepository matchRepository;
    private final ApplicationEventPublisher applicationEventPublisher;

    public MatchStateService(ObjectMapper objectMapper,
            com.codeslam.backend.repository.MatchRepository matchRepository,
            ApplicationEventPublisher applicationEventPublisher) {
        this.objectMapper = objectMapper;
        this.matchRepository = matchRepository;
        this.applicationEventPublisher = applicationEventPublisher;
    }

    public MatchState loadOrCreate(MatchEntity match) {
        MatchState existing = load(match.getId());
        if (existing != null) {
            return normalize(existing);
        }

        MatchState state = new MatchState(
                match.getId(),
                match.getPlayer1().getId(),
                match.getPlayer2().getId(),
                match.getPlayer1Hp(),
                match.getPlayer2Hp(),
                0,
                0,
                0.0d,
                0.0d,
                0,
                0,
                0,
                0,
                defaultPowerUps(),
                defaultPowerUps(),
                null,
                MatchStatus.ACTIVE,
                false);
        save(state);
        return state;
    }

    public MatchState getMatchState(String matchId) {
        return getMatchState(parseUuid(matchId, "matchId"));
    }

    public MatchState getMatchState(UUID matchId) {
        MatchEntity match = matchRepository.findById(matchId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Match not found"));
        return loadOrCreate(match);
    }

    public boolean isActiveParticipant(String matchId, String userId) {
        MatchState state = getMatchState(matchId);
        return state.status() == MatchStatus.ACTIVE && (state.player1Id().toString().equals(userId)
                || state.player2Id().toString().equals(userId));
    }

    public MatchState recordSubmissionStats(UUID matchId, UUID userId, Integer runtimeMs, Double memoryMb) {
        return recordSubmissionStats(matchId, userId, runtimeMs, memoryMb, null, false);
    }

    public MatchState recordSubmissionStats(UUID matchId, UUID userId, Integer runtimeMs, Double memoryMb,
            boolean firstAc) {
        return recordSubmissionStats(matchId, userId, runtimeMs, memoryMb, null, firstAc);
    }

    public MatchState recordSubmissionStats(UUID matchId, UUID userId, Integer runtimeMs, Double memoryMb,
            Verdict verdict, boolean firstAc) {
        MatchEntity match = matchRepository.findById(matchId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Match not found"));
        MatchState state = loadOrCreate(match);
        boolean isPlayer1 = state.player1Id().equals(userId);
        boolean isAc = verdict == Verdict.AC;

        MatchState updated = new MatchState(
                state.matchId(),
                state.player1Id(),
                state.player2Id(),
                state.player1Hp(),
                state.player2Hp(),
                isPlayer1 ? runtimeMs : state.player1LastRuntimeMs(),
                isPlayer1 ? state.player2LastRuntimeMs() : runtimeMs,
                isPlayer1 ? memoryMb : state.player1LastMemoryMb(),
                isPlayer1 ? state.player2LastMemoryMb() : memoryMb,
                state.player1PowerUpsApplied(),
                state.player2PowerUpsApplied(),
                isPlayer1 ? (isAc ? state.player1ComboStreak() + 1 : 0) : state.player1ComboStreak(),
                isPlayer1 ? state.player2ComboStreak() : (isAc ? state.player2ComboStreak() + 1 : 0),
                state.player1PowerUps(),
                state.player2PowerUps(),
                firstAc ? userId : state.firstAcAwardedUserId(),
                state.status(),
                state.completed());
        save(updated);
        return updated;
    }

    public MatchState applyDamage(UUID matchId, UUID userId, DamageResult damageResult) {
        MatchEntity match = matchRepository.findById(matchId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Match not found"));
        MatchState state = loadOrCreate(match);
        boolean isPlayer1 = state.player1Id().equals(userId);
        int updatedPlayer1Hp = state.player1Hp();
        int updatedPlayer2Hp = state.player2Hp();

        if (isPlayer1) {
            updatedPlayer2Hp = Math.max(0, updatedPlayer2Hp - damageResult.getDamageDealt());
            updatedPlayer1Hp = Math.max(0, updatedPlayer1Hp - damageResult.getSelfDamage());
        } else {
            updatedPlayer1Hp = Math.max(0, updatedPlayer1Hp - damageResult.getDamageDealt());
            updatedPlayer2Hp = Math.max(0, updatedPlayer2Hp - damageResult.getSelfDamage());
        }

        UUID winnerId = resolveWinner(state, isPlayer1, updatedPlayer1Hp, updatedPlayer2Hp,
                damageResult.getDamageDealt(), damageResult.getSelfDamage());

        MatchState updated = new MatchState(
                state.matchId(),
                state.player1Id(),
                state.player2Id(),
                updatedPlayer1Hp,
                updatedPlayer2Hp,
                state.player1LastRuntimeMs(),
                state.player2LastRuntimeMs(),
                state.player1LastMemoryMb(),
                state.player2LastMemoryMb(),
                state.player1PowerUpsApplied(),
                state.player2PowerUpsApplied(),
                state.player1ComboStreak(),
                state.player2ComboStreak(),
                state.player1PowerUps(),
                state.player2PowerUps(),
                state.firstAcAwardedUserId(),
                winnerId == null ? state.status() : MatchStatus.COMPLETED,
                winnerId != null);
        save(updated);

        match.setPlayer1Hp(updatedPlayer1Hp);
        match.setPlayer2Hp(updatedPlayer2Hp);
        if (winnerId != null) {
            match.setWinner(winnerId.equals(state.player1Id()) ? match.getPlayer1() : match.getPlayer2());
            match.setStatus(com.codeslam.backend.enums.MatchStatus.COMPLETED);
            match.setEndedAt(LocalDateTime.now());
        } else {
            match.setStatus(com.codeslam.backend.enums.MatchStatus.ACTIVE);
        }
        matchRepository.save(match);
        if (winnerId != null) {
            applicationEventPublisher.publishEvent(
                    new MatchCompletedEvent(match.getId(), state.player1Id(), state.player2Id()));
        }
        return updated;
    }

    public SubmissionProcessingResultDto applyDamage(MatchState state, Submission submission, DamageResult damageResult,
            boolean firstAc) {
        boolean isPlayer1 = state.player1Id().equals(submission.getUser().getId());
        int updatedPlayer1Hp = state.player1Hp();
        int updatedPlayer2Hp = state.player2Hp();

        if (isPlayer1) {
            updatedPlayer2Hp = Math.max(0, updatedPlayer2Hp - damageResult.getDamageDealt());
            updatedPlayer1Hp = Math.max(0, updatedPlayer1Hp - damageResult.getSelfDamage());
        } else {
            updatedPlayer1Hp = Math.max(0, updatedPlayer1Hp - damageResult.getDamageDealt());
            updatedPlayer2Hp = Math.max(0, updatedPlayer2Hp - damageResult.getSelfDamage());
        }

        UUID winnerId = resolveWinner(state, isPlayer1, updatedPlayer1Hp, updatedPlayer2Hp,
                damageResult.getDamageDealt(), damageResult.getSelfDamage());

        MatchState updated = new MatchState(
                state.matchId(),
                state.player1Id(),
                state.player2Id(),
                updatedPlayer1Hp,
                updatedPlayer2Hp,
                isPlayer1 ? submission.getRuntimeMs() : state.player1LastRuntimeMs(),
                isPlayer1 ? state.player2LastRuntimeMs() : submission.getRuntimeMs(),
                isPlayer1 ? submission.getMemoryMb() : state.player1LastMemoryMb(),
                isPlayer1 ? state.player2LastMemoryMb() : submission.getMemoryMb(),
                isPlayer1 ? state.player1PowerUpsApplied() : state.player1PowerUpsApplied(),
                isPlayer1 ? state.player2PowerUpsApplied() : state.player2PowerUpsApplied(),
                state.player1ComboStreak(),
                state.player2ComboStreak(),
                state.player1PowerUps(),
                state.player2PowerUps(),
                firstAc ? submission.getUser().getId() : state.firstAcAwardedUserId(),
                state.status(),
                winnerId != null);
        save(updated);

        MatchEntity match = matchRepository.findById(state.matchId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Match not found"));
        match.setPlayer1Hp(updatedPlayer1Hp);
        match.setPlayer2Hp(updatedPlayer2Hp);
        if (winnerId != null) {
            match.setWinner(winnerId.equals(state.player1Id()) ? match.getPlayer1() : match.getPlayer2());
            match.setStatus(com.codeslam.backend.enums.MatchStatus.COMPLETED);
            match.setEndedAt(LocalDateTime.now());
        } else {
            match.setStatus(com.codeslam.backend.enums.MatchStatus.ACTIVE);
        }
        matchRepository.save(match);
        if (winnerId != null) {
            applicationEventPublisher.publishEvent(
                    new MatchCompletedEvent(match.getId(), state.player1Id(), state.player2Id()));
        }

<<<<<<< HEAD
       return new SubmissionProcessingResultDto(
        UUID.fromString(submission.getId()),
        state.matchId(),
        submission.getVerdict() != null ? submission.getVerdict().name() : "UNKNOWN",
        submission.getRuntimeMs(),
        submission.getMemoryMb(),
        submission.getPassedCases(),
        submission.getTotalCases(),
        updatedPlayer1Hp,
        updatedPlayer2Hp,
        winnerId,
        Map.of(),
        List.of()
);
}
=======
        return new SubmissionProcessingResultDto(
                submission.getId(),
                state.matchId(),
                submission.getVerdict().name(),
                submission.getRuntimeMs(),
                submission.getMemoryMb(),
                submission.getPassedCases(),
                submission.getTotalCases(),
                updatedPlayer1Hp,
                updatedPlayer2Hp,
                winnerId,
                Map.of(),
                List.of());
    }
>>>>>>> 69d97fb (Dess)

    public MatchState applyPowerUp(MatchState state, UUID userId) {
        boolean isPlayer1 = state.player1Id().equals(userId);
        boolean isPlayer2 = state.player2Id().equals(userId);

        if (!isPlayer1 && !isPlayer2) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "User is not part of this match");
        }

        int player1Applied = state.player1PowerUpsApplied();
        int player2Applied = state.player2PowerUpsApplied();
        int applied = isPlayer1 ? player1Applied : player2Applied;
        if (applied >= 3) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "No power-ups remaining");
        }

        MatchState updated = new MatchState(
                state.matchId(),
                state.player1Id(),
                state.player2Id(),
                state.player1Hp(),
                state.player2Hp(),
                state.player1LastRuntimeMs(),
                state.player2LastRuntimeMs(),
                state.player1LastMemoryMb(),
                state.player2LastMemoryMb(),
                isPlayer1 ? player1Applied + 1 : player1Applied,
                isPlayer2 ? player2Applied + 1 : player2Applied,
                state.player1ComboStreak(),
                state.player2ComboStreak(),
                state.player1PowerUps(),
                state.player2PowerUps(),
                state.firstAcAwardedUserId(),
                state.status(),
                state.completed());
        save(updated);
        return updated;
    }

    public MatchState load(UUID matchId) {
        // No longer using Redis - state is transient and recreated from database
        return null;
    }

    public void save(MatchState state) {
        // No longer using Redis - state is transient, changes are persisted via
        // MatchEntity
    }

    private MatchState normalize(MatchState state) {
        if (state == null) {
            return null;
        }

        List<String> player1PowerUps = state.player1PowerUps() == null ? defaultPowerUps() : state.player1PowerUps();
        List<String> player2PowerUps = state.player2PowerUps() == null ? defaultPowerUps() : state.player2PowerUps();
        if (player1PowerUps == state.player1PowerUps() && player2PowerUps == state.player2PowerUps()) {
            return state;
        }

        MatchState normalized = new MatchState(
                state.matchId(),
                state.player1Id(),
                state.player2Id(),
                state.player1Hp(),
                state.player2Hp(),
                state.player1LastRuntimeMs(),
                state.player2LastRuntimeMs(),
                state.player1LastMemoryMb(),
                state.player2LastMemoryMb(),
                state.player1PowerUpsApplied(),
                state.player2PowerUpsApplied(),
                state.player1ComboStreak(),
                state.player2ComboStreak(),
                player1PowerUps,
                player2PowerUps,
                state.firstAcAwardedUserId(),
                state.status() == null ? (state.completed() ? MatchStatus.COMPLETED : MatchStatus.ACTIVE)
                        : state.status(),
                state.completed());
        save(normalized);
        return normalized;
    }

    private List<String> defaultPowerUps() {
        return List.of("BLUR", "DISABLE_AUTOCOMPLETE", "LOCK_KEYWORD", "FORCE_THEME_SWAP",
                "REVERSE_KEYBOARD", "HIDE_TESTCASES");
    }

    private UUID parseUuid(String value, String fieldName) {
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid " + fieldName);
        }
    }

    private String cacheKey(UUID matchId) {
        return "match:state:" + matchId;
    }

    private UUID resolveWinner(MatchState state, boolean isPlayer1, int updatedPlayer1Hp, int updatedPlayer2Hp,
            int damageDealt, int selfDamage) {
        if (updatedPlayer1Hp <= 0 && updatedPlayer2Hp > 0) {
            return state.player2Id();
        }
        if (updatedPlayer2Hp <= 0 && updatedPlayer1Hp > 0) {
            return state.player1Id();
        }
        if (updatedPlayer1Hp <= 0 && updatedPlayer2Hp <= 0) {
            if (damageDealt > selfDamage) {
                return isPlayer1 ? state.player1Id() : state.player2Id();
            }
            if (selfDamage > damageDealt) {
                return isPlayer1 ? state.player2Id() : state.player1Id();
            }
            return isPlayer1 ? state.player1Id() : state.player2Id();
        }
        return null;
    }

    public record MatchState(
            UUID matchId,
            UUID player1Id,
            UUID player2Id,
            int player1Hp,
            int player2Hp,
            Integer player1LastRuntimeMs,
            Integer player2LastRuntimeMs,
            Double player1LastMemoryMb,
            Double player2LastMemoryMb,
            int player1PowerUpsApplied,
            int player2PowerUpsApplied,
            int player1ComboStreak,
            int player2ComboStreak,
            List<String> player1PowerUps,
            List<String> player2PowerUps,
            UUID firstAcAwardedUserId,
            MatchStatus status,
            boolean completed) {
    }
}