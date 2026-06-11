package com.codeslam.backend.dto;

import java.util.List;

public record UpdateUserRequest(String username, List<String> preferredLanguages, List<String> topicInterests) {
}