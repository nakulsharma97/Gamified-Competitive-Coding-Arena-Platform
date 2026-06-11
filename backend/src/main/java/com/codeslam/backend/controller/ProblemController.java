package com.codeslam.backend.controller;

import com.codeslam.backend.dto.PagedResponse;
import com.codeslam.backend.dto.ProblemDto;
import com.codeslam.backend.enums.Difficulty;
import com.codeslam.backend.service.ProblemService;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/problems")
public class ProblemController {

    private final ProblemService problemService;

    public ProblemController(ProblemService problemService) {
        this.problemService = problemService;
    }

    @GetMapping
    public ResponseEntity<PagedResponse<ProblemDto>> getProblems(Pageable pageable,
            @RequestParam(required = false) Difficulty difficulty,
            @RequestParam(required = false) String topic,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Integer limit) {
        Pageable effectivePageable = limit == null
                ? pageable
                : PageRequest.of(pageable.getPageNumber(), Math.max(1, limit),
                        pageable.getSort().isUnsorted() ? Sort.unsorted() : pageable.getSort());
        return ResponseEntity.ok(problemService.getProblems(difficulty, topic, search, effectivePageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProblemDto> getProblem(@PathVariable UUID id) {
        return ResponseEntity.ok(problemService.getProblem(id));
    }

    @GetMapping("/daily")
    public ResponseEntity<ProblemDto> getDailyProblem() {
        return ResponseEntity.ok(problemService.getDailyProblem());
    }
}