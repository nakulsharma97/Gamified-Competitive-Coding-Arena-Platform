package com.codeslam.backend.controller;

import com.codeslam.backend.entity.User;
import com.codeslam.backend.enums.Plan;
import com.codeslam.backend.enums.RankTier;
import com.codeslam.backend.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.transaction.Transactional;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Locale;
import java.util.Optional;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/webhooks/clerk")
public class WebhookController {

    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final String webhookSecret;

    public WebhookController(UserRepository userRepository, ObjectMapper objectMapper,
            @Value("${clerk.webhook-secret}") String webhookSecret) {
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
        this.webhookSecret = webhookSecret;
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @Transactional
    public ResponseEntity<Void> handleClerkWebhook(@RequestBody byte[] rawBody,
            @RequestHeader("svix-id") String svixId,
            @RequestHeader("svix-timestamp") String svixTimestamp,
            @RequestHeader("svix-signature") String svixSignature) throws Exception {
        verifySignature(rawBody, svixId, svixTimestamp, svixSignature);

        JsonNode event = objectMapper.readTree(rawBody);
        if (!"user.created".equals(textValue(event, "type"))) {
            return ResponseEntity.ok().build();
        }

        JsonNode data = event.path("data");
        String clerkId = textValue(data, "id");
        if (!StringUtils.hasText(clerkId)) {
            return ResponseEntity.badRequest().build();
        }

        String email = extractEmail(data);
        String firstName = textValue(data, "first_name");
        String lastName = textValue(data, "last_name");
        String username = generateUniqueUsername(firstName, lastName);

        Optional<User> existingUser = userRepository.findByClerkId(clerkId);
        if (existingUser.isPresent()) {
            User user = existingUser.get();
            if (isPlaceholderUser(user)) {
                user.setEmail(email);
                user.setUsername(username);
                userRepository.save(user);
            }
            return ResponseEntity.ok().build();
        }

        User user = User.builder()
                .clerkId(clerkId)
                .email(email)
                .username(username)
                .eloRating(1000)
                .rank(RankTier.BRONZE)
                .plan(Plan.FREE)
                .onboardingComplete(Boolean.FALSE)
                .build();

        userRepository.save(user);
        return ResponseEntity.status(HttpStatus.OK).build();
    }

    private void verifySignature(byte[] rawBody, String svixId, String svixTimestamp, String svixSignature)
            throws Exception {
        if (!StringUtils.hasText(webhookSecret)) {
            throw new IllegalStateException("CLERK_WEBHOOK_SECRET is not configured");
        }

        String signedPayload = svixId + "." + svixTimestamp + "." + new String(rawBody, StandardCharsets.UTF_8);
        String expectedSignature = base64HmacSha256(webhookSecret.getBytes(StandardCharsets.UTF_8), signedPayload);

        for (String signaturePart : svixSignature.split("\\s+")) {
            if (!StringUtils.hasText(signaturePart)) {
                continue;
            }

            String normalizedSignature = signaturePart.trim();
            if (normalizedSignature.startsWith("v1=")) {
                normalizedSignature = normalizedSignature.substring(3);
            } else if (normalizedSignature.startsWith("v1,")) {
                normalizedSignature = normalizedSignature.substring(3);
            }

            if (expectedSignature.equals(normalizedSignature)) {
                return;
            }
        }

        throw new SecurityException("Invalid Svix signature");
    }

    private String base64HmacSha256(byte[] secretBytes, String content) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secretBytes, "HmacSHA256"));
        return Base64.getEncoder().encodeToString(mac.doFinal(content.getBytes(StandardCharsets.UTF_8)));
    }

    private String extractEmail(JsonNode data) {
        JsonNode emailAddresses = data.path("email_addresses");
        if (emailAddresses.isArray() && !emailAddresses.isEmpty()) {
            String email = textValue(emailAddresses.get(0), "email_address");
            if (StringUtils.hasText(email)) {
                return email;
            }
        }

        String email = textValue(data, "email_address");
        if (StringUtils.hasText(email)) {
            return email;
        }

        throw new IllegalArgumentException("Clerk webhook payload does not include an email address");
    }

    private String generateUniqueUsername(String firstName, String lastName) {
        String base = normalizeName(firstName) + normalizeName(lastName);
        if (!StringUtils.hasText(base)) {
            base = "user";
        }

        for (int attempt = 0; attempt < 100; attempt++) {
            String suffix = String.format(Locale.ROOT, "%04d", (int) (Math.random() * 10000));
            String candidate = (base + suffix).toLowerCase(Locale.ROOT);
            if (candidate.length() > 50) {
                candidate = candidate.substring(0, 50);
            }

            if (userRepository.findByUsername(candidate).isEmpty()) {
                return candidate;
            }
        }

        throw new IllegalStateException("Unable to generate a unique username");
    }

    private String normalizeName(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }

        return value.trim().toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "");
    }

    private boolean isPlaceholderUser(User user) {
        return (user.getUsername() != null && user.getUsername().startsWith("clerk-"))
                || (user.getEmail() != null && user.getEmail().endsWith("@clerk.local"));
    }

    private String textValue(JsonNode node, String fieldName) {
        JsonNode value = node.path(fieldName);
        return value.isTextual() ? value.asText() : null;
    }
}