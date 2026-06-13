package com.ayush.cicd.api.service;

import com.ayush.cicd.api.dto.response.NotificationResponse;
import com.ayush.cicd.common.entity.Notification;
import com.ayush.cicd.common.entity.User;
import com.ayush.cicd.common.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class NotificationService {

    private final NotificationRepository notificationRepository;

    // ------------------------------------------------------------------------
    // GET
    // ------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<NotificationResponse> getUserNotifications(
            User user,
            int limit) {

        return notificationRepository
                .findByUserIdOrderByCreatedAtDesc(
                        user.getId(),
                        PageRequest.of(0, limit))
                .stream()
                .map(this::map)
                .toList();
    }

    // ------------------------------------------------------------------------
    // COUNT
    // ------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public long unreadCount(User user) {
        return notificationRepository
                .countByUserIdAndReadFalse(user.getId());
    }

    // ------------------------------------------------------------------------
    // MARK READ
    // ------------------------------------------------------------------------

    public void markAllRead(User user) {
        notificationRepository.markAllAsRead(user.getId());
    }

    // ------------------------------------------------------------------------
    // CREATE
    // ------------------------------------------------------------------------

    public void create(
            Long userId,
            String title,
            String message,
            String type) {

        Notification notification = Notification.builder()
                .userId(userId)
                .title(title)
                .message(message)
                .type(type)
                .build();

        notificationRepository.save(notification);
    }

    // ------------------------------------------------------------------------
    // MAPPER
    // ------------------------------------------------------------------------

    private NotificationResponse map(Notification n) {

        return NotificationResponse.builder()
                .id(n.getId())
                .title(n.getTitle())
                .message(n.getMessage())
                .type(n.getType())
                .read(n.isRead())
                .createdAt(n.getCreatedAt())
                .build();
    }

    public void markRead(Long id) {

        notificationRepository.findById(id)
                .ifPresent(notification -> {

                    notification.setRead(true);

                    notificationRepository.save(notification);
                });
    }
}