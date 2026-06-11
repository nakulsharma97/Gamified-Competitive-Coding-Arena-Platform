package com.codeslam.backend.exception;

import java.util.List;

public record ApiErrorResponse(String message, List<FieldErrorResponse> fieldErrors) {
}