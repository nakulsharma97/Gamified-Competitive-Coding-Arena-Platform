package com.codeslam.backend.config;

import java.util.concurrent.Executor;
import org.springframework.aop.interceptor.AsyncUncaughtExceptionHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration
@EnableAsync
@EnableScheduling
public class AsyncExecutorConfig {

    @Bean(name = "submissionTaskExecutor")
    public Executor submissionTaskExecutor(SubmissionWorkerProperties properties) {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        int threads = properties.threads() > 0 ? properties.threads() : 10;
        executor.setCorePoolSize(threads);
        executor.setMaxPoolSize(threads);
        executor.setQueueCapacity(1000);
        executor.setThreadNamePrefix("submission-worker-");
        executor.initialize();
        return executor;
    }
}