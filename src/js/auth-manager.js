import {apiUrls} from "./api-urls.js";
import {HttpManager} from "./http-manager.js";
import {Utils} from "./utils.js";
import socketManager from "./sockets-manager.js";
import walletManager from "./wallet-manager.js";
import reservationManager from "./reservation-manager.js";
import chargingManager from "./charging-manager.js";

const utils = new Utils();
const local_storage = utils.storage();
const http = new HttpManager();

const dashboard = () => document.getElementById('dashboard');
const loginDiv = () => document.getElementById('login-div');
const connectDiv = () => document.getElementById('connect-div');

export class AuthManager {
    constructor() {}

    async login(e) {
        e.preventDefault();
        e.stopPropagation();

        const loginBtn = document.getElementById('login-btn');
        loginBtn.disabled = true;
        loginBtn.textContent = 'Logging in…';

        const formData = Object.fromEntries(new FormData(e.target));

        try {
            const step1 = await http.httpPost(apiUrls.authUrl(), {
                email: formData.username,
                password: formData.password,
            });

            const identityToken = step1.identityToken;
            const contextId = step1.accounts[0].accountId;

            const step2 = await http.httpPost(apiUrls.selectContextUrl(), {
                contextId,
                identityToken,
            });

            local_storage.set("token", step2.accessToken);
            local_storage.set("refreshToken", step2.refreshToken);
            local_storage.set("logged-in", true);
            this.init();
        } catch (error) {
            console.error("Login error:", error);
            utils.showAlert(`Login failed: ${error.message}`, 'danger');
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login';
        }
    }

    initSocket() {
        socketManager.initialize();
    }

    init() {
        try {
            this.displayContent();
            this.populateUserChip();
            this.initSocket();
            walletManager.init();
            reservationManager.init();
            chargingManager.init();
        } catch (error) {
            console.log(error);
        }
    }

    populateUserChip() {
        const token = local_storage.get("token");
        if (!token) return;
        let email = "—";
        try {
            const payload = JSON.parse(utils.decodeJwt(token));
            email = payload.email ?? payload.sub ?? payload.preferred_username ?? "—";
        } catch (e) {
            console.warn("Could not decode JWT", e);
        }

        const namePart = email.split("@")[0] || email;
        const initials = (namePart.match(/[a-zA-Z0-9]/g) || ["U"])
            .slice(0, 2)
            .join("")
            .toUpperCase();

        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };
        set("user-avatar", initials);
        set("user-name", namePart);
        set("user-email", email);
    }

    clearUserChip() {
        ["user-avatar", "user-name", "user-email"].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.textContent = "—";
        });
    }

    async logout(ev) {
        ev.preventDefault();
        ev.stopPropagation();

        const accessToken = local_storage.get("token");
        const refreshToken = local_storage.get("refreshToken");
        try {
            if (refreshToken) {
                await http.httpPost(apiUrls.logoutUrl(), { refreshToken: refreshToken }, accessToken);
            }
        } catch (error) {
            console.warn("Logout request failed:", error);
        } finally {
            this.resetAll();
        }
    }

    resetAll() {
        socketManager.disconnect();
        socketManager.clearNotifications();
        socketManager.setWsState("disconnected");
        walletManager.reset();
        reservationManager.reset();
        chargingManager.reset();
        this.clearUserChip();
        local_storage.empty();
        this.toggleLoginDiv().hide_logged_content();
    }

    displayContent() {
        this.toggleLoginDiv().show_logged_content();
    }

    toggleLoginDiv = () => {
        return {
            show_logged_content: () => {
                loginDiv()?.classList.add('hidden');
                connectDiv()?.classList.remove('hidden');
                dashboard()?.classList.remove('hidden');
            },
            hide_logged_content: () => {
                connectDiv()?.classList.add('hidden');
                dashboard()?.classList.add('hidden');
                loginDiv()?.classList.remove('hidden');
            }
        };
    }
}
