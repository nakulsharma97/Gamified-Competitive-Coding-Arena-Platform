package com.codeslam.backend.dto;

public record ChatMessageEvent(String username, String message, String sentAt) {
}