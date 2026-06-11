package com.codeslam.backend.dto;

public record TestCaseDto(
        String id,
        String input,
        String expectedOutput,
        String explanation,
        int displayOrder) {
}
