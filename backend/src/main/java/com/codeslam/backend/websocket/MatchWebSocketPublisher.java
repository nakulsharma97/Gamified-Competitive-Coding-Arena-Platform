package com.codeslam.backend.websocket;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class MatchWebSocketPublisher {

    private static final String ROOM_TOPIC_PREFIX = "/topic/rooms/";
    private static final String LEGACY_TOPIC_PREFIX = "/topic/matches/";
    private static final String POWER_UP_TOPIC_SUFFIX = "/powerups";
    private static final String CHAT_TOPIC_SUFFIX = "/chat";

    private final SimpMessagingTemplate messagingTemplate;

    public MatchWebSocketPublisher(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void publishRoomEvent(String matchId, MatchRoomEventType type, Map<String, Object> payload) {
        MatchRoomEvent event = new MatchRoomEvent(parseUuid(matchId), type, Instant.now(), payload);
        messagingTemplate.convertAndSend(roomTopic(matchId), event);
        messagingTemplate.convertAndSend(legacyTopic(matchId), event);
    }

    public void publishMatchFound(String userId, String matchId, Map<String, Object> payload) {
        publishToUser(userId,
                new MatchRoomEvent(parseUuid(matchId), MatchRoomEventType.MATCH_FOUND, Instant.now(), payload));
    }

    public void publishMatchStarted(String matchId, Map<String, Object> payload) {
        publishRoomEvent(matchId, MatchRoomEventType.MATCH_STARTED, payload);
    }

    public void publishPlayerJoined(String matchId, Map<String, Object> payload) {
        publishRoomEvent(matchId, MatchRoomEventType.PLAYER_JOINED, payload);
    }

    public void publishCodeSubmitted(String matchId, Map<String, Object> payload) {
        publishRoomEvent(matchId, MatchRoomEventType.CODE_SUBMITTED, payload);
    }

    public void publishHpUpdated(String matchId, Map<String, Object> payload) {
        publishRoomEvent(matchId, MatchRoomEventType.HP_UPDATED, payload);
    }

    public void publishPowerUpUsed(String matchId, Map<String, Object> payload) {
        publishRoomEvent(matchId, MatchRoomEventType.POWER_UP_USED, payload);
        messagingTemplate.convertAndSend(legacyTopic(matchId) + POWER_UP_TOPIC_SUFFIX, payload);
    }

    public void publishMatchEnded(String matchId, Map<String, Object> payload) {
        publishRoomEvent(matchId, MatchRoomEventType.MATCH_ENDED, payload);
    }

    public void publishTimerSync(String matchId, Map<String, Object> payload) {
        publishRoomEvent(matchId, MatchRoomEventType.TIMER_SYNC, payload);
    }

    public void publishRoomSync(String userId, String matchId, Map<String, Object> payload) {
        Map<String, Object> envelope = new HashMap<>(payload);
        envelope.putIfAbsent("matchId", matchId);
        envelope.putIfAbsent("type", MatchRoomEventType.ROOM_SYNC.name());
        publishToUser(userId,
                new MatchRoomEvent(parseUuid(matchId), MatchRoomEventType.ROOM_SYNC, Instant.now(), envelope));
    }

    public void publishToUser(String userId, MatchRoomEvent event) {
        messagingTemplate.convertAndSendToUser(userId, "/queue/match-events", event);
    }

    public Map<String, Object> roomSnapshot(String matchId, Map<String, Object> state) {
        Map<String, Object> snapshot = new HashMap<>(state);
        snapshot.putIfAbsent("matchId", matchId);
        snapshot.putIfAbsent("type", "ROOM_SYNC");
        return snapshot;
    }

    private String roomTopic(String matchId) {
        return ROOM_TOPIC_PREFIX + matchId;
    }

    private String legacyTopic(String matchId) {
        return LEGACY_TOPIC_PREFIX + matchId;
    }

    public void publishChatMessage(String matchId, Object payload) {
        messagingTemplate.convertAndSend(legacyTopic(matchId) + CHAT_TOPIC_SUFFIX, payload);
    }

    private UUID parseUuid(String matchId) {
        return UUID.fromString(matchId);
    }
}
