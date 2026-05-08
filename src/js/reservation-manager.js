import { apiUrls } from "./api-urls.js";
import { HttpManager } from "./http-manager.js";
import { Utils } from "./utils.js";
import socketManager from "./sockets-manager.js";

const utils = new Utils();
const local_storage = utils.storage();
const http = new HttpManager();

class ReservationManager {
  constructor() {
    this.active = null;
  }

  getToken() {
    return local_storage.get("token") || "";
  }

  init() {
    const form = document.getElementById("reservation-form");
    const cancelBtn = document.getElementById("cancel-reservation-btn");
    if (form) form.onsubmit = (e) => this.onCreate(e);
    if (cancelBtn) cancelBtn.onclick = () => this.onCancel();

    document.addEventListener("stomp:reservation", (e) => this.onReservationNotify(e.detail ?? {}));
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

    this.renderStatus(status);
  }

  setBusy(busy) {
    const createBtn = document.getElementById("create-reservation-btn");
    const cancelBtn = document.getElementById("cancel-reservation-btn");
    if (createBtn) createBtn.disabled = busy;
    if (cancelBtn) cancelBtn.disabled = busy || !this.active;
  }

  setCreated() {
    const createBtn = document.getElementById("create-reservation-btn");
    const cancelBtn = document.getElementById("cancel-reservation-btn");
    if (createBtn) createBtn.disabled = true;
    if (cancelBtn) cancelBtn.disabled = false;
    this.toggleFormDisabled(true);
  }

  clearActive() {
    this.active = null;
    const createBtn = document.getElementById("create-reservation-btn");
    const cancelBtn = document.getElementById("cancel-reservation-btn");
    if (createBtn) createBtn.disabled = false;
    if (cancelBtn) cancelBtn.disabled = true;
    this.toggleFormDisabled(false);
    this.renderStatus("—");
  }

  toggleFormDisabled(disabled) {
    const form = document.getElementById("reservation-form");
    if (!form) return;
    form.querySelectorAll("input").forEach((el) => (el.disabled = disabled));
  }

  renderStatus(status) {
    const el = document.getElementById("reservation-status");
    if (!el) return;
    el.textContent = status ?? "—";
    el.className = "badge " + this.statusBadge(status);
  }

  statusBadge(status) {
    switch (status) {
      case "Accepted": return "bg-success";
      case "Pending": return "bg-info text-dark";
      case "Cancelled":
      case "Expired":
      case "Deleted": return "bg-secondary";
      case "Faulted":
      case "Unavailable": return "bg-danger";
      default: return "bg-secondary";
    }
  }

  reset() {
    this.active = null;
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
