import { apiUrls } from "./api-urls.js";
import { HttpManager } from "./http-manager.js";
import { Utils } from "./utils.js";

const utils = new Utils();
const local_storage = utils.storage();
const http = new HttpManager();

const ICON_BOLT = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`;
const ICON_PLUS = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;

class WalletManager {
  constructor() {
    this.accountNumber = null;
    this.lastTxnCount = 0;
  }

  getToken() {
    return local_storage.get("token") || "";
  }

  async init() {
    await this.refreshBalance();
    if (this.accountNumber) {
      await this.refreshTransactions();
    }
  }

  async refreshBalance() {
    try {
      const wallet = await http.httpGet(apiUrls.walletMeUrl(), this.getToken());
      this.accountNumber = wallet?.accountNumber ?? null;
      this.renderAccount(wallet);
    } catch (err) {
      console.error("refreshBalance failed", err);
      utils.showAlert("Failed to load wallet", "danger");
    }
  }

  async refreshTransactions() {
    if (!this.accountNumber) return;
    try {
      const res = await http.httpGet(
        apiUrls.walletRecentTxnsUrl(this.accountNumber),
        this.getToken()
      );
      const txns = Array.isArray(res) ? res : res?.content ?? [];
      this.renderTransactions(txns);
    } catch (err) {
      console.error("refreshTransactions failed", err);
      utils.showAlert("Failed to load transactions", "danger");
    }
  }

  renderAccount(w) {
    if (!w) return;
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val ?? "—";
    };
    set("wallet-account-number", w.accountNumber);
    set("wallet-account-balance", this.formatAmount(w.accountBalance));
    set("wallet-owner-email", w.ownerEmail);

    const status = document.getElementById("wallet-active");
    if (status) {
      status.innerHTML = `<span class="dot"></span>${w.active ? "Active" : "Inactive"}`;
      status.className = `badge ${w.active ? "pos" : "muted"}`;
    }

    this.updateStatusTile(w.accountBalance);
  }

  renderTransactions(txns) {
    const list = document.getElementById("wallet-txn-list");
    if (!list) return;
    list.innerHTML = "";
    if (!txns.length) {
      list.innerHTML = `<div class="empty-mini">No transactions yet.</div>`;
      this.updateTxTile(0);
      return;
    }
    for (const t of txns.slice(0, 5)) {
      const isCredit = String(t.type).toUpperCase() === "CREDIT";
      const cls = isCredit ? "credit" : "debit";
      const sign = isCredit ? "+" : "−";
      const icon = isCredit ? ICON_PLUS : ICON_BOLT;
      const label = this.deriveLabel(t);
      const sub = `${this.timeAgo(t.createdAt)} · ${this.escape(String(t.status ?? "").toUpperCase())}`;

      const row = document.createElement("div");
      row.className = "tx-row";
      row.innerHTML = `
        <div class="tx-icon ${cls}">${icon}</div>
        <div class="tx-meta">
          <div class="tx-title">${this.escape(label)}</div>
          <div class="tx-sub">${sub}</div>
        </div>
        <div class="tx-amt ${cls}">${sign}${this.formatAmount(t.transactedAmount)}</div>
      `;
      list.appendChild(row);
    }
    this.updateTxTile(txns.length);
  }

  deriveLabel(t) {
    if (t.label) return t.label;
    if (t.description) return t.description;
    const type = String(t.type ?? "").toUpperCase();
    if (type === "CREDIT") return `Wallet top-up${t.method ? ` · ${t.method}` : ""}`;
    if (t.chargeBoxId) return `Charging session · ${t.chargeBoxId}`;
    return "Wallet transaction";
  }

  updateStatusTile(balance) {
    const tile = document.querySelector("#tile-wallet .v");
    if (tile) tile.textContent = `${this.formatAmount(balance)} RWF`;
  }

  updateTxTile(count) {
    this.lastTxnCount = count;
    const tile = document.querySelector("#tile-wallet-tx .v");
    if (tile) tile.textContent = count > 0 ? `${count} recent` : "Idle";
  }

  formatAmount(v) {
    if (v == null) return "—";
    const n = Number(v);
    if (Number.isNaN(n)) return String(v);
    return n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  timeAgo(iso) {
    if (!iso) return "—";
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return this.escape(String(iso));
    const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  escape(v) {
    if (v == null) return "";
    return String(v).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  reset() {
    this.accountNumber = null;
    this.lastTxnCount = 0;
    ["wallet-account-number", "wallet-account-balance", "wallet-owner-email"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = "—";
    });
    const status = document.getElementById("wallet-active");
    if (status) {
      status.innerHTML = `<span class="dot"></span>—`;
      status.className = "badge muted";
    }
    const list = document.getElementById("wallet-txn-list");
    if (list) list.innerHTML = `<div class="empty-mini">No transactions yet.</div>`;
    const tileV = document.querySelector("#tile-wallet .v");
    if (tileV) tileV.textContent = "—";
    const tileTx = document.querySelector("#tile-wallet-tx .v");
    if (tileTx) tileTx.textContent = "Idle";
  }
}

const walletManager = new WalletManager();

document.addEventListener("stomp:walletBalance", (e) => {
  const env = e.detail ?? {};
  walletManager.refreshBalance();
  const ok = env.success !== false;
  utils.showAlert(env.message ?? "Wallet balance updated", ok ? "success" : "danger", 5000);
});

document.addEventListener("stomp:walletTransaction", (e) => {
  const env = e.detail ?? {};
  walletManager.refreshTransactions();
  const ok = env.success !== false;
  utils.showAlert(env.message ?? "Wallet transaction recorded", ok ? "success" : "danger", 5000);
});

export default walletManager;
