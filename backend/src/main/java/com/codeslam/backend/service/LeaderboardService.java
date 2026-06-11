package com.codeslam.backend.service;

import com.codeslam.backend.dto.LeaderboardEntryDto;
import com.codeslam.backend.dto.LeaderboardResponseDto;
import com.codeslam.backend.dto.StatsResponseDto;
import com.codeslam.backend.entity.User;
import com.codeslam.backend.enums.RankTier;
import com.codeslam.backend.repository.MatchRepository;
import com.codeslam.backend.repository.ProblemRepository;
import com.codeslam.backend.repository.UserRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LeaderboardService {

    private final UserRepository userRepository;
    private final MatchRepository matchRepository;
    private final ProblemRepository problemRepository;
    private final StringRedisTemplate redisTemplate;

    public LeaderboardService(UserRepository userRepository, MatchRepository matchRepository,
            ProblemRepository problemRepository, StringRedisTemplate redisTemplate) {
        this.userRepository = userRepository;
        this.matchRepository = matchRepository;
        this.problemRepository = problemRepository;
        this.redisTemplate = redisTemplate;
    }

    @Transactional(readOnly = true)
    public LeaderboardResponseDto getLeaderboard(Pageable pageable, String clerkId, String tier) {
        Pageable effectivePageable = pageable.getSort().isUnsorted()
                ? PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                        Sort.by(Sort.Direction.DESC, "eloRating").and(Sort.by("username")))
                : pageable;

        Page<User> page = findUsers(effectivePageable, tier);
        List<LeaderboardEntryDto> players = page.getContent().stream().map(this::toEntryDto).toList();

        LeaderboardEntryDto currentUserEntry = null;
        Integer currentUserRank = null;
        if (clerkId != null && !clerkId.isBlank()) {
            User currentUser = userRepository.findByClerkId(clerkId).orElse(null);
            if (currentUser != null) {
                currentUserEntry = toEntryDto(currentUser);
                currentUserRank = rankOf(currentUser);
            }
        }

        return LeaderboardResponseDto.builder()
                .players(players)
                .currentUserRank(currentUserRank)
                .currentUserEntry(currentUserEntry)
                .build();
    }

    private Page<User> findUsers(Pageable pageable, String tier) {
        if (tier == null || tier.isBlank() || tier.equalsIgnoreCase("all")) {
            return userRepository.findAll(pageable);
        }

        try {
            RankTier rankTier = RankTier.valueOf(tier.trim().toUpperCase());
            return userRepository.findByRank(rankTier, pageable);
        } catch (IllegalArgumentException exception) {
            return userRepository.findAll(pageable);
        }
    }

    @Transactional(readOnly = true)
    public StatsResponseDto getStats() {
        return StatsResponseDto.builder()
                .onlinePlayers(parseLong(redisTemplate.opsForValue().get("stats:online")))
                .matchesToday(matchRepository.countByCreatedAtAfter(startOfTodayUtc()))
                .totalProblems(problemRepository.count())
                .totalUsers(userRepository.count())
                .build();
    }

    private LeaderboardEntryDto toEntryDto(User user) {
        int rankPosition = rankOf(user);
        long totalMatches = matchRepository.countMatchesForUser(user.getId());
        long wins = matchRepository.countByWinnerId(user.getId());
        double winRate = totalMatches == 0 ? 0.0d : (double) wins / totalMatches;
        return new LeaderboardEntryDto(
                rankPosition,
                user.getId() == null ? null : user.getId().toString(),
                user.getUsername(),
                user.getEloRating() == null ? 0 : user.getEloRating(),
                user.getRank() == null ? null : user.getRank().name(),
                winRate,
                (int) totalMatches);
    }

    private int rankOf(User user) {
        return (int) userRepository.countUsersAheadOf(user.getEloRating(), user.getUsername()) + 1;
    }

    private long parseLong(String value) {
        if (value == null || value.isBlank()) {
            return 0L;
        }

        try {
            return Long.parseLong(value.trim());
        } catch (NumberFormatException exception) {
            return 0L;
        }
    }

    private Instant startOfTodayUtc() {
        return LocalDate.now(ZoneOffset.UTC).atStartOfDay().toInstant(ZoneOffset.UTC);
    }
}