package com.ayush.cicd.api.repository;

import com.ayush.cicd.common.entity.User;
import com.ayush.cicd.common.entity.UserPreferences;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserPreferencesRepository
        extends JpaRepository<UserPreferences, Long> {

    Optional<UserPreferences> findByUser(User user);
}