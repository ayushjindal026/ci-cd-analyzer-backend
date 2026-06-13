package com.ayush.cicd.api.controller;

import com.ayush.cicd.api.dto.response.NotificationResponse;
import com.ayush.cicd.api.service.NotificationService;
import com.ayush.cicd.common.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    // ------------------------------------------------------------------------
    // GET NOTIFICATIONS
    // ------------------------------------------------------------------------

    @GetMapping
    public List<NotificationResponse> getNotifications(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "20") int limit) {

        System.out.println("NOTIFICATION USER = " + user);

        return notificationService
                .getUserNotifications(user, limit);
    }

    // ------------------------------------------------------------------------
    // UNREAD COUNT
    // ------------------------------------------------------------------------

    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount(
            @AuthenticationPrincipal User user) {

        return Map.of(
                "count",
                notificationService.unreadCount(user));
    }

    // ------------------------------------------------------------------------
    // MARK SINGLE READ
    // ------------------------------------------------------------------------

    @PostMapping("/{id}/read")
    public void markRead(
            @PathVariable Long id) {

        notificationService.markRead(id);
    }

    // ------------------------------------------------------------------------
    // MARK ALL READ
    // ------------------------------------------------------------------------

    @PostMapping("/read-all")
    public void markAllRead(
            @AuthenticationPrincipal User user) {

        notificationService.markAllRead(user);
    }
}