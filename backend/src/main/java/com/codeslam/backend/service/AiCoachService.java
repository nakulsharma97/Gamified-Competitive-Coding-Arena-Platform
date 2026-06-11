package com.codeslam.backend.service;

import com.codeslam.backend.dto.AiCoachResponseDto;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class AiCoachService {

    @Value("${ai.anthropic.api-key:}")
    private String apiKey;

    @Value("${ai.anthropic.model:claude-sonnet-4-20250514}")
    private String model;

    private final RestTemplate restTemplate = new RestTemplate();

    public AiCoachResponseDto generateCoach(
            String problemTitle,
            String difficulty,
            String problemDescription,
            String code,
            String language,
            String verdict,
            int passedCases,
            int totalCases) {

        if (apiKey == null || apiKey.isBlank()) {
            return new AiCoachResponseDto(
                    "AI coach is not configured. Set ANTHROPIC_API_KEY to enable post-match analysis.",
                    true);
        }

        String safeTitle = problemTitle == null ? "" : problemTitle;
        String safeDifficulty = difficulty == null ? "" : difficulty;
        String safeDescription = problemDescription == null ? "" : problemDescription;
        String safeCode = code == null ? "" : code;
        String safeLanguage = language == null ? "UNKNOWN" : language;
        String safeVerdict = verdict == null ? "UNKNOWN" : verdict;

        String systemPrompt = "You are a concise competitive programming coach. "
                + "Give exactly 3 bullet points. No markdown headers. Plain text only. "
                + "Each bullet: one specific actionable insight about the code or approach.";

        String userPrompt = String.format(
                "Problem: %s (%s)%n%s%n%nPlayer submitted %s code.%nCode:%n%s%nVerdict: %s (%d/%d test cases passed).%n%nCoach this player.",
                safeTitle,
                safeDifficulty,
                safeDescription.length() > 400 ? safeDescription.substring(0, 400) + "..." : safeDescription,
                safeLanguage,
                safeCode,
                safeVerdict,
                passedCases,
                totalCases);

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-api-key", apiKey);
            headers.set("anthropic-version", "2023-06-01");

            Map<String, Object> body = Map.of(
                    "model", model,
                    "max_tokens", 400,
                    "system", systemPrompt,
                    "messages", List.of(Map.of("role", "user", "content", userPrompt)));

            ResponseEntity<Map> response = restTemplate.exchange(
                    "https://api.anthropic.com/v1/messages",
                    HttpMethod.POST,
                    new HttpEntity<>(body, headers),
                    Map.class);

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> content = (List<Map<String, Object>>) response.getBody().get("content");
            String text = (String) content.get(0).get("text");
            return new AiCoachResponseDto(text, false);

        } catch (Exception e) {
            return new AiCoachResponseDto(
                    "Could not generate coach notes right now. Try again after the next match.",
                    true);
        }
    }
}