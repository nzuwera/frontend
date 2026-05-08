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

const userNotifications = document.getElementById('user-notifications');
const walletSection = document.getElementById('wallet-section');
const reservationChargingSection = document.getElementById('reservation-charging-section');

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
            this.initSocket();
            walletManager.init();
            reservationManager.init();
            chargingManager.init();
        } catch (error) {
            console.log(error);
        }
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
        walletManager.reset();
        reservationManager.reset();
        chargingManager.reset();
        local_storage.empty();
        this.toggleLoginDiv().hide_logged_content();
    }

    displayContent() {
        this.toggleLoginDiv().show_logged_content();
    }

    toggleLoginDiv = () => {
        const login_div = document.getElementById("login-div");
        const connect_div = document.getElementById("connect-div");
        return {
            show_logged_content: () => {
                login_div.classList.add('d-none');
                connect_div.classList.remove('d-none');
                userNotifications.classList.remove('d-none');
                if (walletSection) walletSection.classList.remove('d-none');
                if (reservationChargingSection) reservationChargingSection.classList.remove('d-none');
            },
            hide_logged_content: () => {
                connect_div.classList.add('d-none');
                userNotifications.classList.add('d-none');
                if (walletSection) walletSection.classList.add('d-none');
                if (reservationChargingSection) reservationChargingSection.classList.add('d-none');
                login_div.classList.remove('d-none');
            }
        };
    }
}
