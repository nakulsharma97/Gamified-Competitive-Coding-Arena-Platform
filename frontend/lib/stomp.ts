import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";

type Callback = (body: string, message: IMessage) => void;

let client: Client | null = null;
let currentToken: string | null = null;
let connectionPromise: Promise<void> | null = null;

function getWsUrl() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }

  return `${apiUrl}/ws`;
}

function createClient(token?: string | null) {
  const stompClient = new Client({
    webSocketFactory: () => new SockJS(getWsUrl()),
    connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    reconnectDelay: 5000,
    debug: () => undefined,
  });

  stompClient.onWebSocketError = error => {
    if (process.env.NODE_ENV === "development") {
      console.error("STOMP websocket error", error);
    }
  };

  return stompClient;
}

export async function connect(token?: string | null) {
  currentToken = token ?? null;

  if (!client) {
    client = createClient(token);
  } else {
    client.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {};
  }

  if (client.connected) {
    return client;
  }

  if (!connectionPromise) {
    connectionPromise = new Promise<void>((resolve, reject) => {
      if (!client) {
        reject(new Error("STOMP client not initialized"));
        return;
      }

      client.onConnect = () => {
        resolve();
      };

      client.onStompError = frame => {
        reject(new Error(frame.body || frame.headers.message || "STOMP connection failed"));
      };

      client.activate();
    }).finally(() => {
      connectionPromise = null;
    });
  }

  await connectionPromise;
  return client;
}

export async function disconnect() {
  if (client) {
    await client.deactivate();
  }

  client = null;
  currentToken = null;
  connectionPromise = null;
}

export function subscribe(dest: string, cb: Callback): StompSubscription | null {
  if (!client?.connected) {
    return null;
  }

  return client.subscribe(dest, message => cb(message.body, message));
}

export function publish(dest: string, body: unknown) {
  if (!client?.connected) {
    return;
  }

  client.publish({
    destination: dest,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

export function isConnected() {
  return Boolean(client?.connected && currentToken);
}