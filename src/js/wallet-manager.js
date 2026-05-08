import { apiUrls } from "./api-urls.js";
import { HttpManager } from "./http-manager.js";
import { Utils } from "./utils.js";

const utils = new Utils();
const local_storage = utils.storage();
const http = new HttpManager();

class WalletManager {
  constructor() {
    this.accountNumber = null;
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
      status.textContent = w.active ? "ACTIVE" : "INACTIVE";
      status.className = `badge ${w.active ? "bg-success" : "bg-secondary"}`;
    }
  }

  renderTransactions(txns) {
    const tbody = document.getElementById("wallet-txn-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    if (!txns.length) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-muted text-center">No transactions</td></tr>`;
      return;
    }
    for (const t of txns.slice(0, 5)) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="text-end">${this.formatAmount(t.transactedAmount)}</td>
        <td><span class="badge ${t.type === "CREDIT" ? "bg-success" : "bg-warning text-dark"}">${this.escape(t.type)}</span></td>
        <td>${this.escape(t.status)}</td>
        <td><small class="text-muted">${this.escape(t.createdAt)}</small></td>
      `;
      tbody.appendChild(tr);
    }
  }

  formatAmount(v) {
    if (v == null) return "—";
    const n = Number(v);
    if (Number.isNaN(n)) return String(v);
    return n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  escape(v) {
    if (v == null) return "";
    return String(v).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  reset() {
    this.accountNumber = null;
    ["wallet-account-number", "wallet-account-balance", "wallet-owner-email"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = "—";
    });
    const status = document.getElementById("wallet-active");
    if (status) {
      status.textContent = "—";
      status.className = "badge bg-secondary";
    }
    const tbody = document.getElementById("wallet-txn-tbody");
    if (tbody) tbody.innerHTML = "";
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
