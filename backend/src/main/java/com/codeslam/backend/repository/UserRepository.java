package com.codeslam.backend.repository;

import com.codeslam.backend.entity.User;
import com.codeslam.backend.enums.RankTier;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, String> {
    default Optional<User> findById(UUID id) { return findById(id.toString()); }



    Optional<User> findByClerkId(String clerkId);

    Optional<User> findByUsername(String username);

    boolean existsByUsername(String username);

    Page<User> findByUsernameContainingIgnoreCase(String username, Pageable pageable);

    Page<User> findByRank(RankTier rank, Pageable pageable);

    @Query("select count(u) from User u where u.eloRating > :eloRating or (u.eloRating = :eloRating and u.username < :username)")
    long countUsersAheadOf(Integer eloRating, String username);
}


