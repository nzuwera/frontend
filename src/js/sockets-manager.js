import { socketsTopics } from "./sockets-topics.js";
import { Utils } from "./utils.js";

const utils = new Utils();
const local_storage = utils.storage();
let stompClient = null;
let subscriptions = new Map();

function dispatchNotify(key, env) {
  document.dispatchEvent(new CustomEvent(`stomp:${key}`, { detail: env }));
}

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

class SocketManager {
  constructor(brokerURL, tokenProvider) {
    this.brokerURL = brokerURL;
    this.tokenProvider = tokenProvider;
    this.chargerKeys = [];
    this.logCount = 0;
    this._debugBound = false;
  }

  initialize() {
    this.bindDebugToggle();
    if (stompClient) stompClient.deactivate();

    const token =
      typeof this.tokenProvider === "function"
        ? this.tokenProvider()
        : this.tokenProvider;

    this.setWsState("connecting");

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
      this.setWsState("connected");
      this.appendLog(`[INFO] Connected ${frame.headers["server"] ?? ""}`.trim());
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
      this.setWsState("disconnected");
      this.handleError(
        `WebSocket ${type} on ${url} — open DevTools → Network → WS for upgrade status (401/403 = backend rejected handshake)`
      );
    };
    stompClient.onWebSocketClose = (event) => {
      const code = event?.code;
      const reason = event?.reason || "(no reason)";
      const wasClean = event?.wasClean;
      const meaning = WS_CLOSE_CODE_MEANING[code] ?? "unknown";
      this.setWsState("disconnected");
      this.appendLog(
        `[WARN] WS CLOSE code=${code} (${meaning}) reason="${reason}" clean=${wasClean}`
      );
      if (!wasClean) {
        this.handleError(`WebSocket closed: code ${code} (${meaning})`);
      }
    };
    this.appendLog(
      `[INFO] WS CONNECT url=${this.brokerURL} token=${
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
      this.appendLog(`[OK] ${key} ${raw}`);
      dispatchNotify(key, env);
    });
    this.appendLog(`[INFO] Subscribed ${destination}`);
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
      this.setWsState("disconnected");
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
    this.appendLog(`[WARN] ${error}`);
    utils.showAlert(`Connection error: ${error}`, "danger");
  }

  setWsState(state) {
    const pill = document.getElementById("ws-pill");
    if (!pill) return;
    pill.classList.remove("connecting", "disconnected");
    const txt = pill.querySelector(".ws-text");
    if (state === "connecting") {
      pill.classList.add("connecting");
      if (txt) txt.textContent = "connecting…";
    } else if (state === "disconnected") {
      pill.classList.add("disconnected");
      if (txt) txt.textContent = "disconnected";
    } else {
      if (txt) txt.textContent = "STOMP connected";
    }
  }

  bindDebugToggle() {
    if (this._debugBound) return;
    const head = document.getElementById("debug-head");
    const card = document.getElementById("debug-card");
    if (head && card) {
      head.addEventListener("click", () => card.classList.toggle("open"));
      this._debugBound = true;
    }
  }

  appendLog(text) {
    const stompLog = document.getElementById("stomp-log");
    if (!stompLog) return;

    const cls = this.classifyLine(text);
    const lvl = this.extractLevel(text, cls);
    const body = text.replace(/^\[[A-Z]+\]\s*/, "");

    const ts = new Date();
    const tsStr = `${String(ts.getHours()).padStart(2, "0")}:${String(ts.getMinutes()).padStart(2, "0")}:${String(ts.getSeconds()).padStart(2, "0")}.${String(ts.getMilliseconds()).padStart(3, "0")}`;

    const line = document.createElement("div");
    line.className = `debug-line ${cls}`;
    line.innerHTML = `<span class="ts">${tsStr}</span><span class="lvl">[${lvl}]</span><span class="msg"></span>`;
    line.querySelector(".msg").textContent = body;
    stompLog.appendChild(line);

    while (stompLog.children.length > MAX_LOG_LINES) {
      stompLog.firstChild.remove();
    }
    stompLog.scrollTop = stompLog.scrollHeight;

    this.logCount++;
    const counter = document.getElementById("stomp-log-count");
    if (counter) counter.textContent = String(this.logCount);
  }

  classifyLine(text) {
    if (text.startsWith("[DEBUG]")) return "debug-l";
    if (text.startsWith("[OK]")) return "ok-l";
    if (text.startsWith("[WARN]")) return "warn-l";
    return "info-l";
  }

  extractLevel(text, cls) {
    const m = text.match(/^\[([A-Z]+)\]/);
    if (m) return m[1];
    return cls === "ok-l" ? "OK" : cls === "warn-l" ? "WARN" : cls === "debug-l" ? "DEBUG" : "INFO";
  }

  clearNotifications() {
    const stompLog = document.getElementById("stomp-log");
    if (stompLog) stompLog.textContent = "";
    this.logCount = 0;
    const counter = document.getElementById("stomp-log-count");
    if (counter) counter.textContent = "0";
  }
}

const getToken = () => local_storage.get("token") || "";

const socketManager = new SocketManager(socketsTopics.wsUrl, getToken);

export default socketManager;
