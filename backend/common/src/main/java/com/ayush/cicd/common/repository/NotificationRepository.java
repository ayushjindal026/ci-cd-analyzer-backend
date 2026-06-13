package com.ayush.cicd.common.repository;

import com.ayush.cicd.common.entity.Notification;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface NotificationRepository
        extends JpaRepository<Notification, Long> {

    List<Notification> findByUserIdOrderByCreatedAtDesc(
            Long userId,
            Pageable pageable);

    long countByUserIdAndReadFalse(Long userId);

    @Modifying
    @Query("""
            UPDATE Notification n
            SET n.read = true
            WHERE n.userId = :userId
            """)
    int markAllAsRead(@Param("userId") Long userId);
}