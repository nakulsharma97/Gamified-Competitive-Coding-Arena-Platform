package com.codeslam.backend.repository;

import com.codeslam.backend.entity.Submission;
import com.codeslam.backend.entity.Problem;
import com.codeslam.backend.enums.Verdict;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SubmissionRepository extends JpaRepository<Submission, String> {
    default Optional<Submission> findById(UUID id) { return findById(id.toString()); }


        interface ProblemSubmissionStats {
                UUID getProblemId();

                Long getTotalSubmissions();

                Long getAcceptedSubmissions();
        }



        @Query("select s from Submission s where s.match.id = :matchId and s.user.id = :userId")
        List<Submission> findByMatchIdAndUserId(@Param("matchId") String matchId, @Param("userId") String userId);

        default List<Submission> findByMatchIdAndUserId(UUID matchId, UUID userId) {
                return findByMatchIdAndUserId(matchId.toString(), userId.toString());
        }

        @Query("select s from Submission s where s.match.id = :matchId and s.user.id = :userId order by s.submittedAt desc")
        Optional<Submission> findTopByMatchIdAndUserIdOrderByCreatedAtDesc(@Param("matchId") UUID matchId,
                        @Param("userId") String userId);

        Optional<Submission> findFirstByMatchIdAndUserIdAndVerdict(String matchId, String userId, Verdict verdict);

        default Optional<Submission> findFirstByMatchIdAndUserIdAndVerdict(UUID matchId, UUID userId, Verdict verdict) {
                return findFirstByMatchIdAndUserIdAndVerdict(matchId.toString(), userId.toString(), verdict);
        }

        long countByUserIdAndVerdict(String userId, Verdict verdict);

        default long countByUserIdAndVerdict(UUID userId, Verdict verdict) {
                return countByUserIdAndVerdict(userId.toString(), verdict);
        }

        long countByUserIdAndFirstAcTrue(String userId);

        default long countByUserIdAndFirstAcTrue(UUID userId) {
                return countByUserIdAndFirstAcTrue(userId.toString());
        }

        long countByMatchIdAndVerdict(String matchId, Verdict verdict);

        default long countByMatchIdAndVerdict(UUID matchId, Verdict verdict) {
                return countByMatchIdAndVerdict(matchId.toString(), verdict);
        }

        List<Submission> findByMatchIdOrderBySubmittedAtAsc(String matchId);

        default List<Submission> findByMatchIdOrderBySubmittedAtAsc(UUID matchId) {
                return findByMatchIdOrderBySubmittedAtAsc(matchId.toString());
        }

        @Query("""
                        select s.problem.id as problemId,
                           count(s.id) as totalSubmissions,
                           sum(case when s.verdict = com.codeslam.backend.enums.Verdict.AC then 1 else 0 end) as acceptedSubmissions
                        from Submission s
                        where s.problem.id in :problemIds
                        group by s.problem.id
                        """)
        List<ProblemSubmissionStats> findProblemStats(@Param("problemIds") List<UUID> problemIds);

        @Query("""
                        select distinct s.problem.id
                        from Submission s
                        where s.user.id = :userId and s.problem.id in :problemIds
                        """)
        List<UUID> findAttemptedProblemIdsByUser(@Param("userId") UUID userId,
                        @Param("problemIds") List<UUID> problemIds);

        @Query("""
                        select distinct s.problem.id
                        from Submission s
                        where s.user.id = :userId and s.problem.id in :problemIds and s.verdict = :verdict
                        """)
        List<UUID> findSolvedProblemIdsByUser(@Param("userId") UUID userId,
                        @Param("problemIds") List<UUID> problemIds,
                        @Param("verdict") Verdict verdict);

        List<Submission> findByUserIdOrderBySubmittedAtDesc(String userId);

        default List<Submission> findByUserIdOrderBySubmittedAtDesc(UUID userId) {
                return findByUserIdOrderBySubmittedAtDesc(userId.toString());
        }

        List<Submission> findByUserIdAndVerdictOrderBySubmittedAtDesc(String userId, Verdict verdict);

        default List<Submission> findByUserIdAndVerdictOrderBySubmittedAtDesc(UUID userId, Verdict verdict) {
                return findByUserIdAndVerdictOrderBySubmittedAtDesc(userId.toString(), verdict);
        }

        @Query("select s.problem from Submission s where s.user.id = :userId and s.verdict = :verdict")
        List<Problem> findProblemsByUserIdAndVerdict(@Param("userId") UUID userId,
                        @Param("verdict") Verdict verdict);

        List<Submission> findByUserIdAndSubmittedAtAfterOrderBySubmittedAtAsc(String userId, Instant submittedAt);

        default List<Submission> findByUserIdAndSubmittedAtAfterOrderBySubmittedAtAsc(UUID userId,
                        Instant submittedAt) {
                return findByUserIdAndSubmittedAtAfterOrderBySubmittedAtAsc(userId.toString(), submittedAt);
        }

        @Query(value = """
                        select count(*)
                        from submissions s
                        join problems p on p.id = s.problem_id
                                                                                                where s.user_id = :userId
                                                                                                        and s.verdict = 'AC'
                                                                                                        and lower(cast(p.topics as char)) like concat('%"', lower(:topic), '"%')
                        """, nativeQuery = true)
        long countAcSubmissionsByTopic(@Param("userId") String userId, @Param("topic") String topic);

        default long countAcSubmissionsByTopic(UUID userId, String topic) {
                return countAcSubmissionsByTopic(userId.toString(), topic);
        }

        @Query(value = """
                        select count(distinct s.match_id)
                        from submissions s
                        join matches m on m.id = s.match_id
                        where s.user_id = :userId
                          and s.verdict = 'AC'
                          and m.started_at is not null
                          and timestampdiff(second, m.started_at, s.submitted_at) < :seconds
                        """, nativeQuery = true)
        long countFastAcMatches(@Param("userId") String userId, @Param("seconds") int seconds);

        default long countFastAcMatches(UUID userId, int seconds) {
                return countFastAcMatches(userId.toString(), seconds);
        }

        @Query(value = """
                        select count(distinct jt.topic)
                        from submissions s
                        join problems p on p.id = s.problem_id
                        join json_table(p.topics, '$[*]' columns (topic varchar(64) path '$')) jt
                        where s.user_id = :userId
                          and s.verdict = 'AC'
                        """, nativeQuery = true)
        long countDistinctTopicsFromAcSubmissions(@Param("userId") String userId);

        default long countDistinctTopicsFromAcSubmissions(UUID userId) {
                return countDistinctTopicsFromAcSubmissions(userId.toString());
        }
}


