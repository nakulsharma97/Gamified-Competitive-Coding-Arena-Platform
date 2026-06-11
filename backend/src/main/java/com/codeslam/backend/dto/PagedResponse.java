package com.codeslam.backend.dto;

import java.util.List;

public record PagedResponse<T>(List<T> data, int page, int size, long total, boolean hasNext) {
}