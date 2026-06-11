package com.codeslam.backend.service;

import com.codeslam.backend.dto.EloHistoryPointDto;
import com.codeslam.backend.dto.BadgeDto;
import com.codeslam.backend.dto.UpdateUserProfileRequest;
import com.codeslam.backend.dto.UserStatsDto;
import com.codeslam.backend.dto.UserProfileDto;
import com.codeslam.backend.entity.Badge;
import com.codeslam.backend.entity.EloHistory;
import com.codeslam.backend.entity.Submission;
import com.codeslam.backend.entity.User;
import com.codeslam.backend.entity.UserBadge;
import com.codeslam.backend.enums.Plan;
import com.codeslam.backend.enums.RankTier;
import com.codeslam.backend.enums.Verdict;
import com.codeslam.backend.exception.ResourceNotFoundException;
import com.codeslam.backend.exception.UsernameAlreadyTakenException;
import com.codeslam.backend.repository.BadgeRepository;
import com.codeslam.backend.repository.EloHistoryRepository;
import com.codeslam.backend.repository.MatchRepository;
import com.codeslam.backend.repository.SubmissionRepository;
import com.codeslam.backend.repository.UserBadgeRepository;
import com.codeslam.backend.repository.UserRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final UserBadgeRepository userBadgeRepository;
    private final BadgeRepository badgeRepository;
    private final EloHistoryRepository eloHistoryRepository;
    private final MatchRepository matchRepository;
    private final SubmissionRepository submissionRepository;

    public UserService(UserRepository userRepository, UserBadgeRepository userBadgeRepository,
            BadgeRepository badgeRepository, EloHistoryRepository eloHistoryRepository,
            MatchRepository matchRepository, SubmissionRepository submissionRepository) {
        this.userRepository = userRepository;
        this.userBadgeRepository = userBadgeRepository;
        this.badgeRepository = badgeRepository;
        this.eloHistoryRepository = eloHistoryRepository;
        this.matchRepository = matchRepository;
        this.submissionRepository = submissionRepository;
    }

    @Transactional(readOnly = true)
    public User getUserByClerkId(String clerkId) {
        return userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new ResourceNotFoundException("Current user not found"));
    }

    @Transactional(readOnly = true)
    public User getById(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    @Transactional
    public User getOrCreateUserByClerkId(String clerkId) {
        return userRepository.findByClerkId(clerkId).orElseGet(() -> createMinimalUser(clerkId));
    }

    @Transactional(readOnly = true)
    public UserProfileDto getCurrentUserProfile(String clerkId) {
        return toProfile(getUserByClerkId(clerkId));
    }

    @Transactional(readOnly = true)
    public UserProfileDto getPublicUserProfile(String username) {
        return toProfile(userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found")));
    }

    @Transactional(readOnly = true)
    public UserStatsDto getPublicUserStats(String username) {
        return toStats(userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found")));
    }

    @Transactional(readOnly = true)
    public UserStatsDto getCurrentUserStats(String clerkId) {
        return toStats(getUserByClerkId(clerkId));
    }

    @Transactional(readOnly = true)
    public java.util.List<BadgeDto> getBadgeWall(String username) {
        userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return badgeRepository.findAll().stream().map(this::toBadgeDto).toList();
    }

    @Transactional
    public UserProfileDto updateCurrentUser(String clerkId, UpdateUserProfileRequest request) {
        User user = getUserByClerkId(clerkId);

        if (request.getUsername() != null && !request.getUsername().isBlank()) {
            String normalizedUsername = request.getUsername().trim();
            if (userRepository.existsByUsername(normalizedUsername)
                    && !normalizedUsername.equals(user.getUsername())) {
                throw new UsernameAlreadyTakenException(normalizedUsername);
            }
            user.setUsername(normalizedUsername);
        }

        if (request.getPreferredLanguages() != null) {
            user.setPreferredLanguages(request.getPreferredLanguages());
        }

        if (request.getTopicInterests() != null) {
            user.setTopicInterests(request.getTopicInterests());
        }

        user.setOnboardingComplete(true);
        return toProfile(userRepository.save(user));
    }

    @Transactional(readOnly = true)
    public List<EloHistoryPointDto> getEloHistory(String clerkId, int days) {
        User user = getUserByClerkId(clerkId);
        int safeDays = Math.max(1, days);
        Instant threshold = Instant.now().minus(safeDays, ChronoUnit.DAYS);
        return eloHistoryRepository.findByUserIdAndCreatedAtAfterOrderByCreatedAtAsc(user.getId(), threshold)
                .stream()
                .map(this::toHistoryPointDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public boolean isUsernameAvailable(String username) {
        if (username == null || username.isBlank()) {
            return false;
        }
        return !userRepository.existsByUsername(username.trim());
    }

    private User createMinimalUser(String clerkId) {
        User user = User.builder()
                .clerkId(clerkId)
                .username(generatePlaceholderUsername(clerkId))
                .email(generatePlaceholderEmail(clerkId))
                .eloRating(1000)
                .rank(RankTier.BRONZE)
                .plan(Plan.FREE)
                .onboardingComplete(false)
                .build();

        try {
            return userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException exception) {
            return userRepository.findByClerkId(clerkId)
                    .orElseThrow(() -> exception);
        }
    }

    private UserProfileDto toProfile(User user) {
        return new UserProfileDto(
                user.getId(),
                user.getClerkId(),
                user.getUsername(),
                user.getEloRating(),
                user.getRankTier() == null ? null : user.getRankTier().name(),
                user.getPlan() == null ? null : user.getPlan().name(),
                safeList(user.getPreferredLanguages()),
                safeList(user.getTopicInterests()),
                loadBadgeNames(user.getId()),
                loadTopicStrengths(user.getId()));
    }

    private List<String> loadBadgeNames(UUID userId) {
        return userBadgeRepository.findByUserId(userId).stream()
                .map(UserBadge::getBadge)
                .filter(java.util.Objects::nonNull)
                .map(Badge::getName)
                .toList();
    }

    private Map<String, Integer> loadTopicStrengths(UUID userId) {
        Map<String, Integer> topicStrengths = new LinkedHashMap<>();
        List<Submission> acceptedSubmissions = submissionRepository.findByUserIdAndVerdictOrderBySubmittedAtDesc(userId,
                Verdict.AC);
        for (Submission submission : acceptedSubmissions) {
            if (submission.getProblem() == null || submission.getProblem().getTopics() == null) {
                continue;
            }
            for (String topic : submission.getProblem().getTopics()) {
                if (topic == null || topic.isBlank()) {
                    continue;
                }
                topicStrengths.merge(topic, 1, Integer::sum);
            }
        }
        return topicStrengths;
    }

    private EloHistoryPointDto toHistoryPointDto(EloHistory history) {
        return EloHistoryPointDto.builder()
                .id(history.getId())
                .createdAt(history.getCreatedAt())
                .eloBefore(history.getEloBefore())
                .eloAfter(history.getEloAfter())
                .matchId(history.getMatch() == null ? null : history.getMatch().getId())
                .build();
    }

    private List<String> safeList(List<String> values) {
        return values == null ? Collections.emptyList() : values;
    }

    private UserStatsDto toStats(User user) {
        long matchesPlayed = matchRepository.countMatchesForUser(user.getId());
        long wins = matchRepository.countByWinnerId(user.getId());
        long losses = Math.max(0L, matchesPlayed - wins);
        long badgesEarned = userBadgeRepository.findByUserId(user.getId()).size();
        int rankPosition = (int) userRepository.countUsersAheadOf(user.getEloRating(), user.getUsername()) + 1;

        return UserStatsDto.builder()
                .matchesPlayed(matchesPlayed)
                .wins(wins)
                .losses(losses)
                .badgesEarned(badgesEarned)
                .rankPosition(rankPosition)
                .build();
    }

    private BadgeDto toBadgeDto(Badge badge) {
        return BadgeDto.builder()
                .id(badge.getId())
                .name(badge.getName())
                .description(badge.getDescription())
                .icon(badge.getIcon())
                .criteriaKey(badge.getCriteriaKey())
                .build();
    }

    private String generatePlaceholderUsername(String clerkId) {
        String normalized = normalizeIdentifier(clerkId);
        String username = "clerk-" + normalized;
        return username.length() <= 50 ? username : username.substring(0, 50);
    }

    private String generatePlaceholderEmail(String clerkId) {
        return "clerk-" + normalizeIdentifier(clerkId) + "@clerk.local";
    }

    private String normalizeIdentifier(String value) {
        if (value == null || value.isBlank()) {
            return UUID.randomUUID().toString().replace("-", "");
        }
        return value.toLowerCase().replaceAll("[^a-z0-9]+", "-");
    }
}
