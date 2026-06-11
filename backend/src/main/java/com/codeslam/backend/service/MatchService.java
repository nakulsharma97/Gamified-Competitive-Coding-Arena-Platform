package com.codeslam.backend.service;

import com.codeslam.backend.dto.MatchDto;
import com.codeslam.backend.dto.MatchEventDto;
import com.codeslam.backend.dto.PagedResponse;
import com.codeslam.backend.dto.ProblemDto;
import com.codeslam.backend.dto.TestCaseDto;
import com.codeslam.backend.dto.UserProfileDto;
import com.codeslam.backend.entity.MatchEntity;
import com.codeslam.backend.entity.MatchEvent;
import com.codeslam.backend.entity.Problem;
import com.codeslam.backend.entity.TestCase;
import com.codeslam.backend.entity.User;
import com.codeslam.backend.event.MatchCompletedEvent;
import com.codeslam.backend.enums.MatchStatus;
import com.codeslam.backend.exception.ResourceNotFoundException;
import com.codeslam.backend.repository.MatchEventRepository;
import com.codeslam.backend.repository.MatchRepository;
import com.codeslam.backend.repository.TestCaseRepository;
import com.codeslam.backend.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MatchService {

        private final MatchRepository matchRepository;
        private final MatchEventRepository matchEventRepository;
        private final TestCaseRepository testCaseRepository;
        private final UserRepository userRepository;
        private final SimpMessagingTemplate messagingTemplate;
        private final ApplicationEventPublisher eventPublisher;

        public MatchService(MatchRepository matchRepository, MatchEventRepository matchEventRepository,
                        TestCaseRepository testCaseRepository, UserRepository userRepository,
                        SimpMessagingTemplate messagingTemplate, ApplicationEventPublisher eventPublisher) {
                this.matchRepository = matchRepository;
                this.matchEventRepository = matchEventRepository;
                this.testCaseRepository = testCaseRepository;
                this.userRepository = userRepository;
                this.messagingTemplate = messagingTemplate;
                this.eventPublisher = eventPublisher;
        }

        @Transactional(readOnly = true)
        public PagedResponse<MatchDto> getHistory(String clerkId, Pageable pageable) {
                User currentUser = getCurrentUser(clerkId);
                Pageable effectivePageable = pageable.getSort().isUnsorted()
                                ? PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                                                Sort.by(Sort.Direction.DESC, "createdAt"))
                                : pageable;

                Page<MatchEntity> page = matchRepository.findByPlayer1IdOrPlayer2Id(currentUser.getId(),
                                currentUser.getId(),
                                effectivePageable);
                List<MatchDto> data = page.getContent().stream().map(this::toDto).toList();
                return new PagedResponse<>(data, page.getNumber(), page.getSize(), page.getTotalElements(),
                                page.hasNext());
        }

        @Transactional(readOnly = true)
        public MatchDto getMatch(UUID id, String clerkId) {
                User currentUser = getCurrentUser(clerkId);
                MatchEntity match = getAccessibleMatch(id, currentUser.getId());
                return toDto(match);
        }

        @Transactional(readOnly = true)
        public List<MatchEventDto> getMatchEvents(UUID id, String clerkId) {
                User currentUser = getCurrentUser(clerkId);
                getAccessibleMatch(id, currentUser.getId());
                return matchEventRepository.findByMatchIdOrderByOccurredAtAsc(id).stream()
                                .map(this::toEventDto)
                                .toList();
        }

        @Transactional
        public void surrender(UUID matchId, String clerkUserId) {
                MatchEntity match = matchRepository.findById(matchId)
                                .orElseThrow(() -> new ResourceNotFoundException("Match not found: " + matchId));

                boolean isPlayer1 = match.getPlayer1() != null && clerkUserId.equals(match.getPlayer1().getClerkId());
                boolean isPlayer2 = match.getPlayer2() != null && clerkUserId.equals(match.getPlayer2().getClerkId());

                if (!isPlayer1 && !isPlayer2) {
                        throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                                        "You are not a participant in this match");
                }

                if (match.getStatus() == MatchStatus.COMPLETED || match.getStatus() == MatchStatus.VOID) {
                        return;
                }

                String winnerId = isPlayer1 ? match.getPlayer2().getClerkId() : match.getPlayer1().getClerkId();

                match.setStatus(MatchStatus.COMPLETED);
                match.setWinner(isPlayer1 ? match.getPlayer2() : match.getPlayer1());
                match.setEndedAt(LocalDateTime.now());
                matchRepository.save(match);

                Map<String, Object> payload = new HashMap<>();
                payload.put("type", "match_end");
                payload.put("winnerId", winnerId);
                payload.put("reason", "surrender");
                payload.put("player1Hp", match.getPlayer1Hp());
                payload.put("player2Hp", match.getPlayer2Hp());
                messagingTemplate.convertAndSend("/topic/matches/" + matchId, payload);
                messagingTemplate.convertAndSend("/topic/rooms/" + matchId, payload);

                eventPublisher.publishEvent(new MatchCompletedEvent(match.getId(), match.getPlayer1().getId(),
                                match.getPlayer2().getId()));
        }

        private User getCurrentUser(String clerkId) {
                return userRepository.findByClerkId(clerkId)
                                .orElseThrow(() -> new ResourceNotFoundException("Current user not found"));
        }

        private MatchEntity getAccessibleMatch(UUID matchId, UUID currentUserId) {
                MatchEntity match = matchRepository.findById(matchId)
                                .orElseThrow(() -> new ResourceNotFoundException("Match not found"));

                boolean participant = currentUserId.equals(match.getPlayer1().getId())
                                || currentUserId.equals(match.getPlayer2().getId());
                if (!participant) {
                        throw new AccessDeniedException("Match is not accessible for this user");
                }

                return match;
        }

        private MatchDto toDto(MatchEntity match) {
                return new MatchDto(
                                match.getId() == null ? null : match.getId().toString(),
                                toProblemDto(match.getProblem()),
                                toUserProfileDto(match.getPlayer1()),
                                toUserProfileDto(match.getPlayer2()),
                                match.getStatus() == null ? null : match.getStatus().name(),
                                match.getPlayer1Hp() == null ? 0 : match.getPlayer1Hp(),
                                match.getPlayer2Hp() == null ? 0 : match.getPlayer2Hp());
        }

        private MatchEventDto toEventDto(MatchEvent event) {
                return MatchEventDto.builder()
                                .id(event.getId())
                                .matchId(event.getMatch() == null ? null : event.getMatch().getId())
                                .userId(event.getUser() == null ? null : event.getUser().getId())
                                .eventType(event.getEventType())
                                .payload(event.getPayload())
                                .occurredAt(event.getOccurredAt())
                                .build();
        }

        private ProblemDto toProblemDto(Problem problem) {
                List<TestCaseDto> visibleTestCases = problem == null ? List.of()
                                : testCaseRepository
                                                .findByProblemIdAndHiddenFalseOrderByDisplayOrderAsc(problem.getId())
                                                .stream()
                                                .map(this::toTestCaseDto)
                                                .toList();

                return new ProblemDto(
                                problem == null || problem.getId() == null ? null : problem.getId().toString(),
                                problem == null ? null : problem.getTitle(),
                                problem == null ? null : problem.getDescription(),
                                problem == null || problem.getDifficulty() == null ? null
                                                : problem.getDifficulty().name(),
                                problem == null || problem.getTopics() == null ? List.of() : problem.getTopics(),
                                problem == null ? null : problem.getConstraintsText(),
                                problem == null || problem.getTimeLimitMs() == null ? 0 : problem.getTimeLimitMs(),
                                problem == null || problem.getMemoryLimitMb() == null ? 0 : problem.getMemoryLimitMb(),
                                problem == null ? null : problem.getOptimalTimeComplexity(),
                                problem == null || problem.getBattleUseCount() == null ? 0L
                                                : problem.getBattleUseCount().longValue(),
                                visibleTestCases);
        }

        private TestCaseDto toTestCaseDto(TestCase testCase) {
                return new TestCaseDto(
                                testCase.getId() == null ? null : testCase.getId().toString(),
                                testCase.getInput(),
                                testCase.getExpectedOutput(),
                                testCase.getExplanation(),
                                testCase.getDisplayOrder() == null ? 0 : testCase.getDisplayOrder());
        }

        private UserProfileDto toUserProfileDto(User user) {
                return new UserProfileDto(
                                user.getId(),
                                user.getClerkId(),
                                user.getUsername(),
                                user.getEloRating(),
                                user.getRank() == null ? null : user.getRank().name(),
                                user.getPlan() == null ? null : user.getPlan().name(),
                                user.getPreferredLanguages() == null ? List.of() : user.getPreferredLanguages(),
                                user.getTopicInterests() == null ? List.of() : user.getTopicInterests(),
                                List.of(),
                                java.util.Map.of());
        }
}