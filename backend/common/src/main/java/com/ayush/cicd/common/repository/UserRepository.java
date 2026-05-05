package com.ayush.cicd.common.repository;

import com.ayush.cicd.common.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByGithubId(Long githubId);

    Optional<User> findByUsername(String username);

    boolean existsByGithubId(Long githubId);
}