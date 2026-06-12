package com.codeslam.backend.dto;

import java.util.UUID;

public record SubmissionJobResponse(UUID jobId) {

    public SubmissionJobResponse(String id) {
        //TODO Auto-generated constructor stub
    }
}