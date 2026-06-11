package com.codeslam.backend.repository;

import com.codeslam.backend.entity.TestCase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TestCaseRepository extends JpaRepository<TestCase, String> {
    default Optional<TestCase> findById(UUID id) {
        return findById(id.toString());
    }

    List<TestCase> findByProblemId(String problemId);

    default List<TestCase> findByProblemId(UUID problemId) {
        return findByProblemId(problemId.toString());
    }

    List<TestCase> findByProblemIdAndHiddenFalseOrderByDisplayOrderAsc(String problemId);

    default List<TestCase> findByProblemIdAndHiddenFalseOrderByDisplayOrderAsc(UUID problemId) {
        return findByProblemIdAndHiddenFalseOrderByDisplayOrderAsc(problemId.toString());
    }

    List<TestCase> findByProblemIdOrderByDisplayOrderAsc(String problemId);

    default List<TestCase> findByProblemIdOrderByDisplayOrderAsc(UUID problemId) {
        return findByProblemIdOrderByDisplayOrderAsc(problemId.toString());
    }
}
