package com.codeslam.backend.auth.service;

import com.codeslam.backend.auth.entity.AuthPasswordResetToken;
import com.codeslam.backend.auth.entity.AuthUser;
import com.codeslam.backend.auth.repository.AuthPasswordResetTokenRepository;
import com.codeslam.backend.auth.repository.AuthUserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PasswordResetService {

    private static final Logger logger = LoggerFactory.getLogger(PasswordResetService.class);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final AuthUserRepository authUserRepository;
    private final AuthPasswordResetTokenRepository passwordResetTokenRepository;
    private final AuthTokenService authTokenService;
    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final String frontendUrl;
    private final long resetTokenExpirationMinutes;

    public PasswordResetService(AuthUserRepository authUserRepository,
            AuthPasswordResetTokenRepository passwordResetTokenRepository,
            AuthTokenService authTokenService,
            ObjectProvider<JavaMailSender> mailSenderProvider,
            @Value("${app.frontend-url:http://localhost:3000}") String frontendUrl,
            @Value("${auth.password-reset.expiration-minutes:30}") long resetTokenExpirationMinutes) {
        this.authUserRepository = authUserRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.authTokenService = authTokenService;
        this.mailSenderProvider = mailSenderProvider;
        this.frontendUrl = frontendUrl;
        this.resetTokenExpirationMinutes = resetTokenExpirationMinutes;
    }

    @Transactional
    public void requestPasswordReset(String email) {
        if (!StringUtils.hasText(email)) {
            return;
        }

        authUserRepository.findByEmailIgnoreCase(email.trim()).ifPresent(user -> {
            String rawToken = generateRawToken();
            Instant expiresAt = Instant.now().plusSeconds(resetTokenExpirationMinutes * 60L);

            AuthPasswordResetToken resetToken = AuthPasswordResetToken.builder()
                    .id(UUID.randomUUID().toString())
                    .userId(user.getId())
                    .tokenHash(hash(rawToken))
                    .expiresAt(expiresAt)
                    .build();
            passwordResetTokenRepository.save(resetToken);

            sendResetEmail(user.getEmail(), buildResetUrl(rawToken));
        });
    }

    @Transactional
    public AuthUser consumeResetToken(String resetTokenValue) {
        if (!StringUtils.hasText(resetTokenValue)) {
            throw unauthorized();
        }

        AuthPasswordResetToken token = passwordResetTokenRepository.findByTokenHash(hash(resetTokenValue.trim()))
                .orElseThrow(this::unauthorized);

        Instant now = Instant.now();
        if (token.getUsedAt() != null || token.getExpiresAt().isBefore(now)) {
            throw unauthorized();
        }

        token.setUsedAt(now);
        passwordResetTokenRepository.save(token);

        return authUserRepository.findById(token.getUserId())
                .filter(user -> Boolean.TRUE.equals(user.getEnabled()))
                .orElseThrow(this::unauthorized);
    }

    @Transactional
    public long cleanupExpiredResetTokens() {
        return passwordResetTokenRepository.deleteByExpiresAtBefore(Instant.now());
    }

    private void sendResetEmail(String email, String resetUrl) {
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            logger.info("Password reset requested for {}. Reset URL: {}", email, resetUrl);
            return;
        }

        try {
            var message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED,
                    StandardCharsets.UTF_8.name());
            helper.setTo(email);
            helper.setSubject("Reset your CodeSlam password");
            helper.setText(buildHtmlBody(resetUrl), buildPlainTextBody(resetUrl));
            mailSender.send(message);
        } catch (Exception exception) {
            logger.warn("Unable to send password reset email to {}", email, exception);
        }
    }

    private String buildPlainTextBody(String resetUrl) {
        return "Use this link to reset your password:\n" + resetUrl
                + "\n\nIf you did not request this, ignore this email.";
    }

    private String buildHtmlBody(String resetUrl) {
        return """
                <html>
                    <body style="margin:0;background:#070816;color:#f4f7fb;font-family:Arial,sans-serif;">
                        <div style="max-width:640px;margin:0 auto;padding:40px 20px;">
                            <div style="border:1px solid rgba(255,255,255,0.12);border-radius:24px;overflow:hidden;background:linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03));box-shadow:0 24px 80px rgba(0,0,0,0.45);">
                                <div style="padding:32px 32px 24px;background:radial-gradient(circle at top,rgba(83,74,183,0.22),transparent 45%),radial-gradient(circle at right,rgba(29,158,117,0.18),transparent 35%),#0b0d1d;">
                                    <div style="display:inline-block;padding:8px 12px;border-radius:999px;border:1px solid rgba(255,255,255,0.14);font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#c9d2ff;">CodeSlam</div>
                                    <h1 style="margin:20px 0 0;font-size:30px;line-height:1.1;font-weight:800;">Reset your password</h1>
                                    <p style="margin:14px 0 0;font-size:15px;line-height:1.7;color:rgba(244,247,251,0.8);">A password reset was requested for your account. This link can only be used once and expires soon.</p>
                                </div>
                                <div style="padding:28px 32px 32px;background:#0a0c19;">
                                    <a href="%s" style="display:inline-block;padding:14px 22px;border-radius:14px;background:linear-gradient(90deg,#534AB7,#1D9E75,#BA7517);color:#fff;text-decoration:none;font-weight:700;">Reset password</a>
                                    <p style="margin:22px 0 0;font-size:14px;line-height:1.7;color:rgba(244,247,251,0.72);">If the button does not work, copy and paste this URL into your browser:</p>
                                    <p style="margin:10px 0 0;font-size:13px;line-height:1.6;word-break:break-all;color:#9ed9cc;">%s</p>
                                    <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:rgba(244,247,251,0.6);">If you did not request this reset, you can safely ignore this email.</p>
                                </div>
                            </div>
                        </div>
                    </body>
                </html>
                """
                .formatted(resetUrl, resetUrl);
    }

    private String buildResetUrl(String rawToken) {
        String separator = frontendUrl.contains("?") ? "&" : "?";
        return frontendUrl + "/reset-password" + separator + "token=" + rawToken;
    }

    private String generateRawToken() {
        byte[] randomBytes = new byte[48];
        SECURE_RANDOM.nextBytes(randomBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }

    private String hash(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to hash password reset token", exception);
        }
    }

    private ResponseStatusException unauthorized() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid password reset token");
    }
}