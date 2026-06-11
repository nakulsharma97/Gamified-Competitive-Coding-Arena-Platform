package com.codeslam.backend.judge;

public record Judge0Request(
        String source_code,
        int language_id,
        String stdin,
        double cpu_time_limit,
        int memory_limit) {
}