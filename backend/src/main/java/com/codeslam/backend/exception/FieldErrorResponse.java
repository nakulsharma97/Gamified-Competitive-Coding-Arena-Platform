package com.codeslam.backend.exception;

public record FieldErrorResponse(String field, String message) {
}