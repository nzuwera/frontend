import { apiUrls } from "./api-urls.js";
import { HttpManager } from "./http-manager.js";
import { Utils } from "./utils.js";
import socketManager from "./sockets-manager.js";
import reservationManager from "./reservation-manager.js";

const utils = new Utils();
const local_storage = utils.storage();
const http = new HttpManager();

const GAUGE_RADIUS = 88;
const GAUGE_CIRC = 2 * Math.PI * GAUGE_RADIUS;

class ChargingManager {
  constructor() {
    this.active = false;
    this.startedAt = null;
  }

  getToken() {
    return local_storage.get("token") || "";
  }

  init() {
    const stopBtn = document.getElementById("stop-charging-btn");
    if (stopBtn) stopBtn.onclick = () => this.onStop();

    document.addEventListener("reservation:startRequested", () => this.onStart());
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
    try {
      const res = await http.httpPost(apiUrls.chargingStartUrl(reservation.id), {}, this.getToken());
      const ok = res?.status !== false;
      if (!ok) {
        utils.showAlert(res?.message ?? "Start charging failed", "danger");
        return;
      }
      socketManager.subscribeChargerContext(reservation.chargeBoxId, reservation.connectorId);
      this.active = true;
      this.startedAt = Date.now();
      this.setStarted(reservation);
      this.showLiveDisplay();
      this.setStatusBadge("Charging", "pos");
      this.updateChargerTile("Charging");
      document.dispatchEvent(new CustomEvent("charging:started"));
      utils.showAlert(res?.message ?? "Charging session initiated", "info", 5000);
    } catch (err) {
      console.error("Start charging failed", err);
      utils.showAlert("Start charging request failed", "danger");
    }
  }

  async onStop() {
    const reservation = reservationManager.getActive();
    if (!reservation?.id) return;
    try {
      const res = await http.httpPost(apiUrls.chargingStopUrl(reservation.id), {}, this.getToken());
      utils.showAlert(res?.message ?? "Stopping charging session", "info", 5000);
      socketManager.unsubscribeChargerContext();
      this.active = false;
      this.startedAt = null;
      this.hideLiveDisplay();
      this.setStatusBadge("Idle", "muted");
      this.updateChargerTile("Available");
      this.updateSessionTile(null);
      document.dispatchEvent(new CustomEvent("charging:stopped"));
    } catch (err) {
      console.error("Stop charging failed", err);
      utils.showAlert("Stop charging request failed", "danger");
    }
  }

  onSessionUpdate(env) {
    const p = env?.payload ?? env;
    if (!p) return;

    this.setText("charging-cost", this.fmt(p.cost, 0));
    this.setText("charging-energy", this.fmt(p.energy, 2));
    this.setText("charging-eta", this.fmt(p.timeToFullCharge, 2));

    if (p.stateOfCharge != null) {
      const soc = Math.max(0, Math.min(100, Number(p.stateOfCharge)));
      this.setText("charging-soc", String(Math.round(soc)));
      const dash = (GAUGE_CIRC * soc) / 100;
      const gauge = document.getElementById("gauge-progress");
      if (gauge) gauge.setAttribute("stroke-dasharray", `${dash} ${GAUGE_CIRC}`);
    }

    const energy = Number(p.energy);
    if (!Number.isNaN(energy) && this.startedAt) {
      const elapsedH = (Date.now() - this.startedAt) / 3600000;
      if (elapsedH > 0.001) {
        const power = energy / elapsedH;
        this.setText("charging-power", this.fmt(power, 1));
      }
    }

    if (p.status) this.setText("charging-status-display", p.status);
    this.updateSessionTile(p);
  }

  onStatusUpdate(env) {
    const p = env?.payload ?? env;
    if (!p) return;
    if (p.status) {
      this.setText("charging-status-display", p.status);
      const badgeCls = p.status === "Charging" ? "pos" : (p.status === "Available" ? "muted" : "warn");
      this.setStatusBadge(p.status, badgeCls);
    }
  }

  setStatusBadge(label, cls) {
    const el = document.getElementById("charging-status-badge");
    if (!el) return;
    el.innerHTML = `<span class="dot"></span>${label}`;
    el.className = `badge ${cls}`;
  }

  updateChargerTile(label) {
    const v = document.querySelector("#tile-charger .v");
    if (v) v.textContent = label;
  }

  updateSessionTile(p) {
    const v = document.querySelector("#tile-session .v");
    if (!v) return;
    if (!p || !this.active) { v.textContent = "Idle"; return; }
    const energy = Number(p.energy);
    v.textContent = Number.isNaN(energy) ? "Active" : `${this.fmt(energy, 2)} kWh`;
  }

  setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val ?? "—";
  }

  fmt(v, frac) {
    if (v == null) return "—";
    const n = Number(v);
    if (Number.isNaN(n)) return String(v);
    return n.toFixed(frac);
  }

  disableStart() {
    const btn = document.getElementById("start-charging-btn");
    if (btn) btn.disabled = true;
  }

  setStarted(reservation) {
    const startBtn = document.getElementById("start-charging-btn");
    if (startBtn) startBtn.disabled = true;
    const stopBtn = document.getElementById("stop-charging-btn");
    if (stopBtn) stopBtn.disabled = false;
    this.setText("charging-charge-box", reservation?.chargeBoxId ?? "—");
    this.setText("charging-connector", String(reservation?.connectorId ?? "—"));
    this.setText("charging-plate", reservation?.plateNumber ?? "—");
  }

  showLiveDisplay() {
    document.getElementById("charging-live-display")?.classList.remove("hidden");
    document.getElementById("charging-empty")?.classList.add("hidden");
  }

  hideLiveDisplay() {
    document.getElementById("charging-live-display")?.classList.add("hidden");
    document.getElementById("charging-empty")?.classList.remove("hidden");
    ["charging-cost", "charging-energy", "charging-eta", "charging-power", "charging-status-display"].forEach((id) =>
      this.setText(id, "—")
    );
    this.setText("charging-soc", "0");
    const gauge = document.getElementById("gauge-progress");
    if (gauge) gauge.setAttribute("stroke-dasharray", `0 ${GAUGE_CIRC}`);
  }

  reset() {
    this.active = false;
    this.startedAt = null;
    this.hideLiveDisplay();
    this.setStatusBadge("Idle", "muted");
    this.updateChargerTile("Available");
    this.updateSessionTile(null);
  }
}

const chargingManager = new ChargingManager();
export default chargingManager;
