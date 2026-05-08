import { apiUrls } from "./api-urls.js";
import { HttpManager } from "./http-manager.js";
import { Utils } from "./utils.js";
import socketManager from "./sockets-manager.js";
import reservationManager from "./reservation-manager.js";

const utils = new Utils();
const local_storage = utils.storage();
const http = new HttpManager();

class ChargingManager {
  constructor() {
    this.active = false;
  }

  getToken() {
    return local_storage.get("token") || "";
  }

  init() {
    const startBtn = document.getElementById("start-charging-btn");
    const stopBtn = document.getElementById("stop-charging-btn");
    if (startBtn) startBtn.onclick = () => this.onStart();
    if (stopBtn) stopBtn.onclick = () => this.onStop();

    document.addEventListener("reservation:accepted", () => this.enableStart());
    document.addEventListener("reservation:cancelled", () => this.disableStart());
    document.addEventListener("reservation:cleared", () => this.disableStart());

    document.addEventListener("stomp:chargingSession", (e) => this.onSessionUpdate(e.detail ?? {}));
    document.addEventListener("stomp:chargingStatus", (e) => this.onStatusUpdate(e.detail ?? {}));
  }

  async onStart() {
    const reservation = reservationManager.getActive();
    if (!reservation?.id) {
      utils.showAlert("No active reservation", "warning");
      return;
    }
    this.setBusy(true);
    try {
      const res = await http.httpPost(apiUrls.chargingStartUrl(reservation.id), {}, this.getToken());
      const ok = res?.status !== false;
      if (!ok) {
        utils.showAlert(res?.message ?? "Start charging failed", "danger");
        this.setBusy(false);
        return;
      }
      socketManager.subscribeChargerContext(reservation.chargeBoxId, reservation.connectorId);
      this.active = true;
      this.setStarted();
      this.showLiveDisplay();
      utils.showAlert(res?.message ?? "Charging session initiated", "info", 5000);
    } catch (err) {
      console.error("Start charging failed", err);
      utils.showAlert("Start charging request failed", "danger");
      this.setBusy(false);
    }
  }

  async onStop() {
    const reservation = reservationManager.getActive();
    if (!reservation?.id) return;
    this.setBusy(true);
    try {
      const res = await http.httpPost(apiUrls.chargingStopUrl(reservation.id), {}, this.getToken());
      utils.showAlert(res?.message ?? "Stopping charging session", "info", 5000);
      socketManager.unsubscribeChargerContext();
      this.active = false;
      this.setStopped();
      this.hideLiveDisplay();
    } catch (err) {
      console.error("Stop charging failed", err);
      utils.showAlert("Stop charging request failed", "danger");
      this.setBusy(false);
    }
  }

  onSessionUpdate(env) {
    const p = env?.payload ?? env;
    if (!p) return;
    this.setText("charging-cost", this.formatNumber(p.cost, 2));
    this.setText("charging-energy", this.formatNumber(p.energy, 3));
    this.setText("charging-soc", this.formatNumber(p.stateOfCharge, 1));
    this.setText("charging-eta", this.formatNumber(p.timeToFullCharge, 2));
    if (p.status) this.setText("charging-status-display", p.status);
  }

  onStatusUpdate(env) {
    const p = env?.payload ?? env;
    if (!p) return;
    if (p.status) this.setText("charging-status-display", p.status);
  }

  setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val ?? "—";
  }

  formatNumber(v, frac) {
    if (v == null) return "—";
    const n = Number(v);
    if (Number.isNaN(n)) return String(v);
    return n.toFixed(frac);
  }

  enableStart() {
    const btn = document.getElementById("start-charging-btn");
    if (btn) btn.disabled = false;
  }

  disableStart() {
    const btn = document.getElementById("start-charging-btn");
    if (btn) btn.disabled = true;
  }

  setBusy(busy) {
    const startBtn = document.getElementById("start-charging-btn");
    const stopBtn = document.getElementById("stop-charging-btn");
    if (startBtn) startBtn.disabled = busy || this.active;
    if (stopBtn) stopBtn.disabled = busy || !this.active;
  }

  setStarted() {
    const startBtn = document.getElementById("start-charging-btn");
    const stopBtn = document.getElementById("stop-charging-btn");
    if (startBtn) startBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = false;
  }

  setStopped() {
    const startBtn = document.getElementById("start-charging-btn");
    const stopBtn = document.getElementById("stop-charging-btn");
    if (startBtn) startBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = true;
  }

  showLiveDisplay() {
    const display = document.getElementById("charging-live-display");
    if (display) display.classList.remove("d-none");
  }

  hideLiveDisplay() {
    const display = document.getElementById("charging-live-display");
    if (display) display.classList.add("d-none");
    ["charging-cost", "charging-energy", "charging-soc", "charging-eta", "charging-status-display"].forEach((id) =>
      this.setText(id, "—")
    );
  }

  reset() {
    this.active = false;
    this.setStopped();
    this.disableStart();
    this.hideLiveDisplay();
  }
}

const chargingManager = new ChargingManager();
export default chargingManager;
