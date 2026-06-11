package com.codeslam.backend.judge;

public record Judge0Response(
        String stdout,
        String stderr,
        String compile_output,
        String time,
        Long memory,
        Judge0Status status) {

    public record Judge0Status(int id, String description) {
    }
}