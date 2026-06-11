package com.codeslam.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "submission.worker")
public record SubmissionWorkerProperties(int threads) {
}