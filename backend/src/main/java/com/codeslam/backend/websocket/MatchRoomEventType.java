package com.codeslam.backend.websocket;

public enum MatchRoomEventType {
    MATCH_FOUND,
    MATCH_STARTED,
    PLAYER_JOINED,
    CODE_SUBMITTED,
    HP_UPDATED,
    POWER_UP_USED,
    MATCH_ENDED,
    TIMER_SYNC,
    ROOM_SYNC
}
