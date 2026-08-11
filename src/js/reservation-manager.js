import { apiUrls } from "./api-urls.js";
import { HttpManager } from "./http-manager.js";
import { Utils } from "./utils.js";
import socketManager from "./sockets-manager.js";

const utils = new Utils();
const local_storage = utils.storage();
const http = new HttpManager();

const ICON_PLAY = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 4 20 12 6 20 6 4"/></svg>`;
const ICON_X = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
const ICON_INBOX = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/></svg>`;

class ReservationManager {
  constructor() {
    this.active = null;
    this._delegated = false;
    this._chargingActive = false;
  }

  getToken() {
    return local_storage.get("token") || "";
  }

  init() {
    const form = document.getElementById("reservation-form");
    if (form) form.onsubmit = (e) => this.onCreate(e);

    if (!this._delegated) {
      const list = document.getElementById("reservation-list");
      if (list) {
        list.addEventListener("click", (e) => {
          const btn = e.target.closest("[data-action]");
          if (!btn) return;
          const action = btn.getAttribute("data-action");
          if (action === "cancel") this.onCancel();
          else if (action === "start") {
            document.dispatchEvent(new CustomEvent("reservation:startRequested"));
          }
        });
      }
      this._delegated = true;
    }

    document.addEventListener("stomp:reservation", (e) => this.onReservationNotify(e.detail ?? {}));
    document.addEventListener("charging:started", () => { this._chargingActive = true; this.renderActive(); });
    document.addEventListener("charging:stopped", () => { this._chargingActive = false; this.renderActive(); });
  }

  async onCreate(e) {
    e.preventDefault();
    const form = e.target;
    const fd = Object.fromEntries(new FormData(form));
    const payload = {
      chargeBoxId: fd.chargeBoxId?.trim(),
      connectorId: Number(fd.connectorId),
      plateNumber: fd.plateNumber?.trim(),
      currentBatteryLevel: Number(fd.currentBatteryLevel),
    };
    if (!payload.chargeBoxId || !payload.connectorId || !payload.plateNumber || Number.isNaN(payload.currentBatteryLevel)) {
      utils.showAlert("Fill all reservation fields", "warning");
      return;
    }
    if (payload.currentBatteryLevel < 0 || payload.currentBatteryLevel > 95) {
      utils.showAlert("Battery level must be 0–95", "warning");
      return;
    }

    this.setBusy(true);
    try {
      const res = await http.httpPost(apiUrls.reservationsUrl(), payload, this.getToken());
      const reservation = res?.data ?? res;
      const status = reservation?.status;
      if (!reservation?.id) {
        utils.showAlert(res?.message ?? "Reservation create failed", "danger");
        this.setBusy(false);
        return;
      }
      this.active = {
        id: reservation.id,
        chargeBoxId: reservation.chargeBoxId ?? payload.chargeBoxId,
        connectorId: reservation.connectorId ?? payload.connectorId,
        plateNumber: reservation.plateNumber ?? payload.plateNumber,
        currentBatteryLevel: reservation.currentBatteryLevel ?? payload.currentBatteryLevel,
        status,
      };
      socketManager.subscribeReservation();
      this.setCreated();
      utils.showAlert(res?.message ?? `Reservation ${status ?? "Pending"}`, "info", 5000);
      document.dispatchEvent(new CustomEvent("reservation:created", { detail: this.active }));
    } catch (err) {
      console.error("Create reservation failed", err);
      utils.showAlert("Reservation request failed", "danger");
      this.setBusy(false);
    }
  }

  async onCancel() {
    if (!this.active) return;
    this.setBusy(true);
    try {
      const body = {
        chargeBoxId: this.active.chargeBoxId,
        connectorId: this.active.connectorId,
      };
      const res = await http.httpDelete(apiUrls.reservationsUrl(), body, this.getToken());
      utils.showAlert(res?.message ?? "Reservation cancelled", "info", 5000);
      socketManager.unsubscribeReservation();
      this.clearActive();
      document.dispatchEvent(new CustomEvent("reservation:cancelled"));
    } catch (err) {
      console.error("Cancel reservation failed", err);
      utils.showAlert("Cancel reservation failed", "danger");
      this.setBusy(false);
    }
  }

  onReservationNotify(env) {
    const r = env?.payload ?? env;
    if (!r) return;
    const status = r.status;
    const message = env?.message ?? `Reservation ${status}`;
    const success = env?.success !== false;
    utils.showAlert(message, success ? "success" : "danger", 6000);

    if (this.active) {
      this.active.status = status;
    }

    if (status === "Accepted") {
      document.dispatchEvent(new CustomEvent("reservation:accepted", { detail: this.active }));
    } else if (["Faulted", "Cancelled", "Expired", "Unavailable", "Deleted"].includes(status) || success === false) {
      socketManager.unsubscribeReservation();
      this.clearActive();
      document.dispatchEvent(new CustomEvent("reservation:cleared"));
    }

    this.renderActive();
  }

  setBusy(busy) {
    const createBtn = document.getElementById("create-reservation-btn");
    if (createBtn) createBtn.disabled = busy;
  }

  setCreated() {
    const createBtn = document.getElementById("create-reservation-btn");
    if (createBtn) createBtn.disabled = true;
    this.toggleFormDisabled(true);
    this.renderActive();
    this.updateTile();
  }

  clearActive() {
    this.active = null;
    const createBtn = document.getElementById("create-reservation-btn");
    if (createBtn) createBtn.disabled = false;
    this.toggleFormDisabled(false);
    this.renderActive();
    this.updateTile();
  }

  toggleFormDisabled(disabled) {
    const form = document.getElementById("reservation-form");
    if (!form) return;
    form.querySelectorAll("input").forEach((el) => (el.disabled = disabled));
  }

  renderActive() {
    const list = document.getElementById("reservation-list");
    if (!list) return;
    if (!this.active) {
      list.innerHTML = `
        <div class="reservation-card empty">
          <div class="e-icon">${ICON_INBOX}</div>
          <div class="e-t">No active reservation</div>
          <div class="e-s">Submit the form above to hold a connector.</div>
        </div>
      `;
      return;
    }

    const r = this.active;
    const badge = this.statusBadge(r.status);
    const startDisabled = r.status !== "Accepted" || this._chargingActive;
    const startNote = this._chargingActive
      ? `<div class="res-note">Stop the active session to start a new one.</div>`
      : (r.status !== "Accepted"
          ? `<div class="res-note">Waiting for charger acceptance…</div>`
          : "");

    list.innerHTML = `
      <div class="reservation-card">
        <div class="res-top">
          <div class="res-id">
            <small>Reservation</small>
            ${this.escape(String(r.id))}
          </div>
          <span class="badge ${badge.cls}"><span class="dot"></span>${badge.label}</span>
        </div>
        <div class="res-grid">
          <div class="res-cell"><div class="k">Charge Box</div><div class="v">${this.escape(r.chargeBoxId)}</div></div>
          <div class="res-cell"><div class="k">Conn.</div><div class="v">#${this.escape(String(r.connectorId))}</div></div>
          <div class="res-cell"><div class="k">Battery</div><div class="v">${this.escape(String(r.currentBatteryLevel ?? "—"))}%</div></div>
          <div class="res-cell"><div class="k">Plate</div><div class="v">${this.escape(r.plateNumber ?? "—")}</div></div>
          <div class="res-cell"><div class="k">Status</div><div class="v">${this.escape(r.status ?? "—")}</div></div>
          <div class="res-cell"><div class="k">ID</div><div class="v" style="font-size:11px">${this.escape(String(r.id))}</div></div>
        </div>
        <div class="res-actions">
          <button class="btn-sm start" id="start-charging-btn" data-action="start" ${startDisabled ? "disabled" : ""}>
            ${ICON_PLAY} Start charging session
          </button>
          <button class="btn-sm cancel" id="cancel-reservation-btn" data-action="cancel">
            ${ICON_X} Cancel
          </button>
        </div>
        ${startNote}
      </div>
    `;
  }

  statusBadge(status) {
    switch (status) {
      case "Accepted": return { cls: "pos", label: "Accepted" };
      case "Pending":  return { cls: "info", label: "Pending" };
      case "Cancelled":
      case "Expired":
      case "Deleted":  return { cls: "muted", label: status };
      case "Faulted":
      case "Unavailable": return { cls: "neg", label: status };
      default: return { cls: "muted", label: status ?? "—" };
    }
  }

  updateTile() {
    const tile = document.querySelector("#tile-reservations .v");
    if (tile) tile.textContent = this.active ? "1 held" : "None";
    const count = document.getElementById("reservation-count");
    if (count) count.textContent = `${this.active ? 1 : 0} active`;
  }

  escape(v) {
    if (v == null) return "";
    return String(v).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  reset() {
    this.active = null;
    this._chargingActive = false;
    const form = document.getElementById("reservation-form");
    if (form) form.reset();
    this.clearActive();
  }

  getActive() {
    return this.active;
  }
}

const reservationManager = new ReservationManager();
export default reservationManager;
