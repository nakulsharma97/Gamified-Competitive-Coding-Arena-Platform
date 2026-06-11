package com.codeslam.backend.controller;

import com.codeslam.backend.dto.PracticeSubmitRequest;
import com.codeslam.backend.dto.SubmissionJobResponse;
import com.codeslam.backend.dto.SubmitCodeRequest;
import com.codeslam.backend.judge.JudgeResult;
import com.codeslam.backend.service.SubmissionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/submissions", "/api/submission"})
@PreAuthorize("isAuthenticated()")
public class SubmissionController {

    private final SubmissionService submissionService;

    public SubmissionController(SubmissionService submissionService) {
        this.submissionService = submissionService;
    }

    @PostMapping
    @Transactional
    public ResponseEntity<SubmissionJobResponse> createSubmission(Authentication authentication,
            @Valid @RequestBody SubmitCodeRequest request) {
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(submissionService.createSubmission((String) authentication.getPrincipal(), request));
    }

    @PostMapping("/run")
    @Transactional(readOnly = true)
    public ResponseEntity<JudgeResult> runPracticeSubmission(Authentication authentication,
            @Valid @RequestBody PracticeSubmitRequest request) {
        return ResponseEntity.ok(submissionService.runPracticeSubmission((String) authentication.getPrincipal(),
                request));
    }

    @PostMapping("/practice/submit")
    @Transactional(readOnly = true)
    public ResponseEntity<JudgeResult> submitPractice(Authentication authentication,
            @Valid @RequestBody PracticeSubmitRequest request) {
        return ResponseEntity.ok(submissionService.runPracticeSubmission((String) authentication.getPrincipal(),
                request));
    }
}