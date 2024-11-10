import {apiUrls} from "./api-urls.js";
import {HttpManager} from "./http-manager.js";
import {Utils} from "./utils.js";
import socketManager from "./sockets-manager.js";

const utils = new Utils();
const local_storage = utils.storage();
const http = new HttpManager();

// Constants
const userNotifications = document.getElementById('user-notifications');

export class AuthManager {
    constructor() {
        this.jwt_token = null;
    }

    login(e) {

        e.preventDefault();
        e.stopPropagation();
        // Get login form data
        const loginRequest = Object.fromEntries(new FormData(e.target));
        console.log(loginRequest)
        // Authentication
        const authManager = this
        http.httpPost(apiUrls.authUrl(), loginRequest).then((data) => {
            this.jwt_token = data.jwt;
            local_storage.set("token", data.jwt)
            local_storage.set("logged-in", true)
            authManager.init();
        }).catch(function (error) {
            console.log(`Login error - ${error}`)
            utils.showAlert(`${error}`, 'danger')
            return false;
        }).finally(() => {
            console.info("Authentication process completed")
        })
    }

    initSocket() {
        socketManager.initialize();
        socketManager.connect();
    }

    init() {
        try {
            console.log("Init started")
            this.displayContent()
            this.initSocket()
            console.log("Init End")
        } catch (error) {
            console.error(error)
        }
    }

    logout(ev) {
        ev.preventDefault()
        ev.stopPropagation()
        const authManager = this
        const loginResponse = http.httpGet(apiUrls.logoutUrl(), this.jwt_token)
        loginResponse.then(function (success) {
            console.log(success)
            authManager.resetAll()
        }).catch(function (error) {
            utils.showAlert(`Logout failed - ${error}`, 'danger')
        }).finally(() => {
            console.info("Logout processed successfully");
        })
    }

    resetAll() {
        socketManager.disconnect();
        local_storage.empty()
        this.toggleLoginDiv().hide_logged_content()
    }

    refreshToken() {
        const refreshResponse = http.httpGet(apiUrls.logoutUrl(), this.jwt_token)
        refreshResponse.then(function (success) {
            local_storage.set("token", success.jwt)
            local_storage.set("refreshToken", success.refreshToken)
            // this.init()
            console.log(`TokenRefreshed successfully - ${success}`)
        }, function (error) {
            console.log(`Failed to refresh token - ${error}`)
        })
    }


    displayContent() {
        this.toggleLoginDiv().show_logged_content();
    }

    toggleLoginDiv = () => {
        let login_div = document.getElementById("login-div");
        let connect_div = document.getElementById("connect-div");
        return {
            show_logged_content: () => {
                // Hide login div
                login_div.classList.add('d-none');
                if (connect_div.classList.contains('d-none')) {
                    connect_div.classList.remove('d-none');
                    console.log("Login DIV hidden")
                }
                if (userNotifications.classList.contains('d-none')) {
                    userNotifications.classList.remove('d-none');
                }

            },
            hide_logged_content: () => {
                // Hide connect DIV
                connect_div.classList.add('d-none');
                userNotifications.classList.add('d-none');

                // Remove
                if (login_div.classList.contains('d-none')) {
                    login_div.classList.remove('d-none');
                    console.log("Login DIV shown")
                }
            }
        }
    }
}