package com.codeslam.backend.match;

public class TimerTickEvent {

    public int secondsRemaining;

    public TimerTickEvent(int secondsRemaining) {
        this.secondsRemaining = secondsRemaining;
    }
}