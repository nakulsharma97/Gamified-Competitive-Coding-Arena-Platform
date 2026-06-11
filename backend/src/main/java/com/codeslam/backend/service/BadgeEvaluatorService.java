package com.codeslam.backend.service;

import com.codeslam.backend.dto.BadgeNotificationDto;
import com.codeslam.backend.entity.Badge;
import com.codeslam.backend.entity.User;
import com.codeslam.backend.entity.UserBadge;
import com.codeslam.backend.event.MatchCompletedEvent;
import com.codeslam.backend.repository.BadgeRepository;
import com.codeslam.backend.repository.MatchEventRepository;
import com.codeslam.backend.repository.MatchRepository;
import com.codeslam.backend.repository.SubmissionRepository;
import com.codeslam.backend.repository.UserBadgeRepository;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
public class BadgeEvaluatorService {

    private static final List<String> SUPPORTED_CRITERIA = List.of(
            "FIRST_BLOOD",
            "SPEED_CODER",
            "COMEBACK_KING",
            "DESTROYER",
            "POWER_PLAYER",
            "GRAPH_WIZARD",
            "DP_MASTER",
            "SCHOLAR",
            "CENTURION",
            "IRON_WILL");

    private final BadgeRepository badgeRepository;
    private final UserBadgeRepository userBadgeRepository;
    private final SubmissionRepository submissionRepository;
    private final MatchRepository matchRepository;
    private final MatchEventRepository matchEventRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public BadgeEvaluatorService(BadgeRepository badgeRepository, UserBadgeRepository userBadgeRepository,
            SubmissionRepository submissionRepository, MatchRepository matchRepository,
            MatchEventRepository matchEventRepository, SimpMessagingTemplate messagingTemplate) {
        this.badgeRepository = badgeRepository;
        this.userBadgeRepository = userBadgeRepository;
        this.submissionRepository = submissionRepository;
        this.matchRepository = matchRepository;
        this.matchEventRepository = matchEventRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @Async
    @EventListener
    @Transactional
    public void evaluate(MatchCompletedEvent event) {
        if (event == null) {
            return;
        }

        Set<UUID> playerIds = new LinkedHashSet<>();
        if (event.player1Id() != null) {
            playerIds.add(event.player1Id());
        }
        if (event.player2Id() != null) {
            playerIds.add(event.player2Id());
        }

        for (UUID playerId : playerIds) {
            evaluatePlayer(playerId);
        }
    }

    private void evaluatePlayer(UUID userId) {
        for (String criteriaKey : SUPPORTED_CRITERIA) {
            if (!meetsCriteria(userId, criteriaKey)) {
                continue;
            }

            badgeRepository.findByCriteriaKey(criteriaKey).ifPresent(badge -> grantBadgeIfMissing(userId, badge));
        }
    }

    private boolean meetsCriteria(UUID userId, String criteriaKey) {
        return switch (criteriaKey) {
            case "FIRST_BLOOD" -> submissionRepository.countByUserIdAndFirstAcTrue(userId) >= 1;
            case "SPEED_CODER" -> submissionRepository.countFastAcMatches(userId, 45) >= 10;
            case "COMEBACK_KING" -> matchEventRepository.countComebackWins(userId) >= 1;
            case "DESTROYER" -> matchEventRepository.countDestroyerMatches(userId, 200) >= 1;
            case "POWER_PLAYER" -> matchEventRepository.countPowerPlayerMatches(userId, 3) >= 5;
            case "GRAPH_WIZARD" -> matchRepository.countWinsByUserOnTopic(userId, "graph") >= 10;
            case "DP_MASTER" -> submissionRepository.countAcSubmissionsByTopic(userId, "dp") >= 50;
            case "SCHOLAR" -> submissionRepository.countDistinctTopicsFromAcSubmissions(userId) >= 10;
            case "CENTURION" -> matchRepository.countMatchesForUser(userId) >= 100;
            case "IRON_WILL" -> matchRepository.countByWinnerId(userId) >= 25;
            default -> false;
        };
    }

    private void grantBadgeIfMissing(UUID userId, Badge badge) {
        if (badge.getId() == null || userBadgeRepository.existsByUserIdAndBadgeId(userId, badge.getId())) {
            return;
        }

        User user = new User();
        user.setId(userId);

        UserBadge userBadge = UserBadge.builder()
                .user(user)
                .badge(badge)
                .build();

        userBadgeRepository.save(userBadge);

        messagingTemplate.convertAndSendToUser(
                userId.toString(),
                "/queue/notification",
                BadgeNotificationDto.builder()
                        .type("BADGE_EARNED")
                        .badgeName(badge.getName())
                        .badgeIcon(badge.getIcon())
                        .description(badge.getDescription())
                        .build());

        log.info("Granted badge {} ({}) to user {}", badge.getName(), badge.getCriteriaKey(), userId);
    }
}
