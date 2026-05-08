import { socketsTopics } from "./sockets-topics.js";
import { Utils } from "./utils.js";

const utils = new Utils();
const local_storage = utils.storage();
let stompClient = null;
let subscriptions = new Map();

const SELECTORS = {
  walletBalance: "wallet-balance-notification",
  walletTransaction: "wallet-transaction-notification",
  reservation: "reservation-notification",
  chargingStatus: "status-notification",
  chargingSession: "charging-notification",
};

const RENDERERS = {
  walletBalance: (env) => env.message ?? "(no message)",
  walletTransaction: (env) => env.message ?? "(no message)",
  reservation: (env) => formatReservation(env.payload),
  chargingStatus: (env) => formatChargingStatus(env.payload),
  chargingSession: (env) => formatChargingSession(env.payload),
};

function dispatchNotify(key, env) {
  document.dispatchEvent(new CustomEvent(`stomp:${key}`, { detail: env }));
}

const MAX_NOTIFICATIONS = 100;
const MAX_LOG_LINES = 200;

const WS_CLOSE_CODE_MEANING = {
  1000: "Normal closure",
  1001: "Going away",
  1002: "Protocol error",
  1003: "Unsupported data",
  1006: "Abnormal closure (no close frame) — TLS, network, or upgrade rejected",
  1008: "Policy violation — auth or origin rejected",
  1009: "Message too big",
  1011: "Server error",
  1015: "TLS handshake failed",
  4001: "Application: unauthorized",
  4003: "Application: forbidden",
};

function formatReservation(p) {
  if (!p) return "(empty payload)";
  return `#${p.id} ${p.status} ${p.chargeBoxId}/${p.connectorId} reservation=${p.reservationAmount} KES`;
}

function formatChargingStatus(p) {
  if (!p) return "(empty payload)";
  return `${p.status} (${p.chargerId}/${p.connectorId})`;
}

function formatChargingSession(p) {
  if (!p) return "(empty payload)";
  return `${p.status} energy=${p.energy}kWh cost=${p.cost} SoC=${p.stateOfCharge}% eta=${p.timeToFullCharge}h`;
}

class SocketManager {
  constructor(brokerURL, tokenProvider) {
    this.brokerURL = brokerURL;
    this.tokenProvider = tokenProvider;
    this.chargerKeys = [];
  }

  initialize() {
    if (stompClient) stompClient.deactivate();

    const token =
      typeof this.tokenProvider === "function"
        ? this.tokenProvider()
        : this.tokenProvider;

    stompClient = new StompJs.Client({
      brokerURL: this.brokerURL,
      // JWT travels in STOMP CONNECT frame (browsers cannot set headers on WS upgrade).
      // Backend gateway must allow anonymous WS upgrade and validate token at STOMP CONNECT.
      connectHeaders: { Authorization: `Bearer ${token}` },
      debug: (str) => this.appendLog(`[DEBUG] ${str}`),
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      beforeConnect: () => {
        const currentToken =
          typeof this.tokenProvider === "function"
            ? this.tokenProvider()
            : this.tokenProvider;
        stompClient.connectHeaders["Authorization"] = `Bearer ${currentToken}`;
      },
    });

    stompClient.onConnect = (frame) => {
      console.log("Connected:", frame);
      this._setupSubscriptions();
    };
    stompClient.onStompError = (frame) => {
      const msg = frame.headers["message"] ?? "(no message)";
      const body = frame.body ?? "";
      this.handleError(`STOMP error: ${msg}${body ? " — " + body : ""}`);
    };
    stompClient.onWebSocketError = (event) => {
      const url = event?.target?.url ?? this.brokerURL;
      const type = event?.type ?? "error";
      this.handleError(
        `WebSocket ${type} on ${url} — open DevTools → Network → WS for upgrade status (401/403 = backend rejected handshake)`
      );
    };
    stompClient.onWebSocketClose = (event) => {
      const code = event?.code;
      const reason = event?.reason || "(no reason)";
      const wasClean = event?.wasClean;
      const meaning = WS_CLOSE_CODE_MEANING[code] ?? "unknown";
      this.appendLog(
        `[WS CLOSE] code=${code} (${meaning}) reason="${reason}" clean=${wasClean}`
      );
      if (!wasClean) {
        this.handleError(`WebSocket closed: code ${code} (${meaning})`);
      }
    };
    this.appendLog(
      `[WS CONNECT] url=${this.brokerURL} token=${
        token ? "present(" + token.length + " chars)" : "MISSING"
      }`
    );
    stompClient.activate();
  }

  _setupSubscriptions() {
    this._subscribeKey("walletBalance", socketsTopics.walletBalance);
    this._subscribeKey("walletTransaction", socketsTopics.walletTransaction);
  }

  _subscribeKey(key, destination) {
    this.subscribe(destination, (raw) => {
      let env;
      try {
        env = JSON.parse(raw);
      } catch {
        env = { message: raw, payload: null };
      }
      this.appendNotification(SELECTORS[key], RENDERERS[key](env));
      this.appendLog(`[${key}] ${raw}`);
      dispatchNotify(key, env);
    });
  }

  subscribeReservation() {
    this._subscribeKey("reservation", socketsTopics.reservation);
  }

  unsubscribeReservation() {
    this.unsubscribe(socketsTopics.reservation);
  }

  subscribeChargerContext(chargerId, connectorId) {
    if (!chargerId || !connectorId) {
      utils.showAlert("chargerId and connectorId are required", "warning");
      return;
    }
    this.unsubscribeChargerContext();
    const statusDest = socketsTopics.chargingStatus(chargerId, connectorId);
    const sessionDest = socketsTopics.chargingSession(chargerId, connectorId);
    this._subscribeKey("chargingStatus", statusDest);
    this._subscribeKey("chargingSession", sessionDest);
    this.chargerKeys = [statusDest, sessionDest];
  }

  unsubscribeChargerContext() {
    this.chargerKeys.forEach((dest) => this.unsubscribe(dest));
    this.chargerKeys = [];
  }

  connect() {
    if (!stompClient) {
      console.error("STOMP client not initialized. Call initialize() first.");
      return;
    }
    stompClient.activate();
  }

  disconnect() {
    if (stompClient) {
      subscriptions.forEach((sub) => sub.unsubscribe());
      subscriptions.clear();
      this.chargerKeys = [];
      stompClient.deactivate();
      stompClient = null;
      console.log("Disconnected from WebSocket server.");
    }
  }

  subscribe(topic, callback) {
    if (!stompClient || !stompClient.connected) {
      console.error("STOMP client not connected.");
      return;
    }
    if (!subscriptions.has(topic)) {
      const subscription = stompClient.subscribe(topic, (message) => {
        callback(message.body);
      });
      subscriptions.set(topic, subscription);
    }
  }

  unsubscribe(topic) {
    if (subscriptions.has(topic)) {
      subscriptions.get(topic).unsubscribe();
      subscriptions.delete(topic);
    }
  }

  handleError(error) {
    console.log("WebSocket Error:", error);
    utils.showAlert(`Connection error: ${error}`, "danger");
  }

  appendNotification(selector, body) {
    const element = document.getElementById(selector);
    if (!element) return;

    const entry = document.createElement("div");
    entry.classList.add("notification-entry");

    const ts = document.createElement("small");
    ts.classList.add("text-muted", "d-block");
    ts.textContent = new Date().toISOString();

    const content = document.createElement("pre");
    content.classList.add("mb-1");
    content.textContent = body;

    entry.appendChild(ts);
    entry.appendChild(content);

    if (element.children.length > 0) {
      const hr = document.createElement("hr");
      hr.classList.add("my-1");
      element.appendChild(hr);
    }
    element.appendChild(entry);

    while (
      element.querySelectorAll(".notification-entry").length > MAX_NOTIFICATIONS
    ) {
      const first = element.querySelector(".notification-entry");
      const prevHr = first.previousElementSibling;
      if (prevHr && prevHr.tagName === "HR") prevHr.remove();
      first.remove();
    }

    element.scrollTop = element.scrollHeight;
  }

  appendLog(text) {
    const stompLog = document.getElementById("stomp-log");
    if (!stompLog) return;

    const line = document.createElement("div");
    line.classList.add("log-line");

    const ts = document.createElement("span");
    ts.classList.add("text-muted", "me-2");
    ts.textContent = new Date().toISOString();

    const msg = document.createElement("span");
    msg.textContent = text;

    line.appendChild(ts);
    line.appendChild(msg);
    stompLog.appendChild(line);

    while (stompLog.children.length > MAX_LOG_LINES) {
      stompLog.firstChild.remove();
    }

    stompLog.scrollTop = stompLog.scrollHeight;
  }

  clearNotifications() {
    Object.values(SELECTORS).forEach((selector) => {
      const el = document.getElementById(selector);
      if (el) el.textContent = "";
    });
    const stompLog = document.getElementById("stomp-log");
    if (stompLog) stompLog.textContent = "";
  }
}

const getToken = () => local_storage.get("token") || "";

const socketManager = new SocketManager(socketsTopics.wsUrl, getToken);

export default socketManager;
