// PATH: backend/api-service/src/main/java/com/ayush/cicd/api/service/SessionRevocationService.java

package com.ayush.cicd.api.service;

import com.ayush.cicd.common.entity.User;
import com.ayush.cicd.common.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Handles security-sensitive session revocation operations.
 *
 * This service intentionally uses a separate transaction so that
 * session revocation is committed even when the calling operation
 * subsequently throws a security exception.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SessionRevocationService {

    private final RefreshTokenRepository refreshTokenRepository;

    /**
     * Revokes all refresh-token sessions for a user.
     *
     * REQUIRES_NEW is intentional:
     *
     * If this method is called during refresh-token reuse detection,
     * the parent transaction will subsequently throw
     * TokenReusedException.
     *
     * A separate transaction guarantees that the security revocation
     * is committed instead of being rolled back with the parent
     * transaction.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void revokeAllSessions(User user) {

        if (user == null) {
            return;
        }

        int revokedCount =
                refreshTokenRepository.revokeAllForUser(user);

        log.warn(
                "Revoked {} refresh-token sessions for user {} " +
                        "after refresh-token reuse detection.",
                revokedCount,
                user.getUsername());
    }
}