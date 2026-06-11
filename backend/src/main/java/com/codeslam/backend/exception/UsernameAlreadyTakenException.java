package com.codeslam.backend.exception;

public class UsernameAlreadyTakenException extends RuntimeException {

    public UsernameAlreadyTakenException(String username) {
        super("Username already exists: " + username);
    }
}