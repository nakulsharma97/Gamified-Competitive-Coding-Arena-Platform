package com.codeslam.backend.controller;

import com.codeslam.backend.dto.AiCoachResponseDto;
import com.codeslam.backend.dto.MatchDto;
import com.codeslam.backend.dto.MatchEventDto;
import com.codeslam.backend.dto.PagedResponse;
import com.codeslam.backend.entity.MatchEntity;
import com.codeslam.backend.entity.Problem;
import com.codeslam.backend.entity.Submission;
import com.codeslam.backend.exception.ResourceNotFoundException;
import com.codeslam.backend.repository.MatchRepository;
import com.codeslam.backend.repository.SubmissionRepository;
import com.codeslam.backend.service.AiCoachService;
import com.codeslam.backend.service.MatchService;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/matches")
@PreAuthorize("isAuthenticated()")
public class MatchController {

    private final MatchService matchService;
    private final MatchRepository matchRepository;
    private final SubmissionRepository submissionRepository;
    private final AiCoachService aiCoachService;

    public MatchController(MatchService matchService, MatchRepository matchRepository,
            SubmissionRepository submissionRepository, AiCoachService aiCoachService) {
        this.matchService = matchService;
        this.matchRepository = matchRepository;
        this.submissionRepository = submissionRepository;
        this.aiCoachService = aiCoachService;
    }

    @GetMapping("/history")
    public ResponseEntity<PagedResponse<MatchDto>> getHistory(Authentication authentication, Pageable pageable) {
        return ResponseEntity.ok(matchService.getHistory((String) authentication.getPrincipal(), pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<MatchDto> getMatch(@PathVariable UUID id, Authentication authentication) {
        return ResponseEntity.ok(matchService.getMatch(id, (String) authentication.getPrincipal()));
    }

    @GetMapping("/{id}/events")
    public ResponseEntity<List<MatchEventDto>> getMatchEvents(@PathVariable UUID id, Authentication authentication) {
        return ResponseEntity.ok(matchService.getMatchEvents(id, (String) authentication.getPrincipal()));
    }

    @PostMapping("/{matchId}/surrender")
    public ResponseEntity<Void> surrender(@PathVariable UUID matchId, Authentication authentication) {
        String clerkUserId = (String) authentication.getPrincipal();
        matchService.surrender(matchId, clerkUserId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{matchId}/coach")
    public ResponseEntity<AiCoachResponseDto> getCoachNotes(@PathVariable UUID matchId,
            Authentication authentication) {
        String clerkUserId = (String) authentication.getPrincipal();

        MatchEntity match = matchRepository.findById(matchId)
                .orElseThrow(() -> new ResourceNotFoundException("Match not found"));

        List<Submission> mySubmissions = submissionRepository
                .findByMatchIdOrderBySubmittedAtAsc(matchId)
                .stream()
                .filter(s -> s.getUser() != null && clerkUserId.equals(s.getUser().getClerkId()))
                .toList();

        Submission latest = mySubmissions.isEmpty() ? null : mySubmissions.get(mySubmissions.size() - 1);
        Problem problem = match.getProblem();

        AiCoachResponseDto result = aiCoachService.generateCoach(
                problem == null ? "" : problem.getTitle(),
                problem != null && problem.getDifficulty() != null ? problem.getDifficulty().name() : "MEDIUM",
                problem == null || problem.getDescription() == null ? "" : problem.getDescription(),
                latest != null ? latest.getCode() : "(no submission)",
                latest != null && latest.getLanguage() != null ? latest.getLanguage().name() : "UNKNOWN",
                latest != null && latest.getVerdict() != null ? latest.getVerdict().name() : "NO_SUBMISSION",
                latest != null && latest.getPassedCases() != null ? latest.getPassedCases() : 0,
                latest != null && latest.getTotalCases() != null ? latest.getTotalCases() : 0);

        return ResponseEntity.ok(result);
    }
}