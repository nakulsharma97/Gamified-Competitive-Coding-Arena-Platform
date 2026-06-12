package com.codeslam.backend.controller;

import com.codeslam.backend.dto.MatchDto;
import com.codeslam.backend.dto.MatchEventDto;
import com.codeslam.backend.dto.PagedResponse;
import com.codeslam.backend.entity.MatchEntity;
import com.codeslam.backend.entity.Problem;
import com.codeslam.backend.entity.Submission;
import com.codeslam.backend.exception.ResourceNotFoundException;
import com.codeslam.backend.repository.MatchRepository;
import com.codeslam.backend.repository.SubmissionRepository;
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

    public MatchController(MatchService matchService, MatchRepository matchRepository,
            SubmissionRepository submissionRepository) {
        this.matchService = matchService;
        this.matchRepository = matchRepository;
        this.submissionRepository = submissionRepository;
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

}