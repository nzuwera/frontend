import {apiUrls} from "./api-urls.js";
import {HttpManager} from "./http-manager.js";
import {WalletManager} from "./wallet-manager.js";
import {Utils} from "./utils.js";
import {SocketsManager} from "./sockets-manager.js";

const utils = new Utils();
const local_storage = utils.storage();
const http = new HttpManager();
const socketManager = new SocketsManager();
const walletManager = new WalletManager();

const content_wrapper = document.getElementById('content-wrapper');

export class AuthManager {

    constructor() {
    }

    login(username, password) {
        const authManager = this
        const loginResponse = http.httpPost(apiUrls.authUrl(), {
            username: username,
            password: password
        })
        loginResponse.then(function (success) {
            console.log(success)
            local_storage.set("token", success.jwt)
            local_storage.set("refreshToken", success.refreshToken)
            local_storage.set("user-profile", utils.decodeJwt(success.jwt))
            local_storage.set("logged-in", true)
            authManager.init();
        }).catch(function (error) {
            console.log(`Login failed - ${error}`)
            return false;
        }).finally(()=>{
            console.info("Logged in successfully")
        })
    }


    init() {
        // this.setUserProfile()
        // this.setWalletAccount()
        this.displayContent()
        // this.socketConnect()
    }

    logout() {
        const authManager = this
        const loginResponse = http.httpGet(apiUrls.logoutUrl(), local_storage.get('token'))
        const response = loginResponse.then(function (success) {
            console.log(success)
            authManager.resetAll()
        }).catch(function (error) {
            console.log(`Logout failed - ${error}`)
        }).finally(function (e) {
            console.info("Logout processed successfully");
        })
    }

    resetAll() {
        local_storage.empty()
        this.toggleLoginDiv().hide_logged_content()
    }

    refreshToken() {
        const refreshResponse = http.httpGet(apiUrls.logoutUrl(), local_storage.get('token'))
        refreshResponse.then(function (success) {
            local_storage.set("token", success.jwt)
            local_storage.set("refreshToken", success.refreshToken)
            // this.init()
            console.log(`TokenRefreshed successfully - ${success}`)
        }, function (error) {
            console.log(`Failed to refresh token - ${error}`)
        })
    }

    setUserProfile() {
        // getCustomer WalletAccount
        walletManager.displayUserProfile(document.getElementById("userProfile"))
    }

    setWalletAccount() {
        const walletManager = new WalletManager();
        let walletAccountResponse = walletManager.getWalletAccount();
        walletAccountResponse.then(function (account) {
            console.log(account)
            console.log(account.data)
            walletManager.displayUserBalance(document.getElementById("walletBalance"), account.data)
        }, function (error) {
            console.log(`Failed to get walletAccount ${error}`)
        })
    }

    socketConnect() {
        socketManager.connect();
    }

    displayContent() {
        if (content_wrapper.classList.contains('d-none')) {
            content_wrapper.classList.remove('d-none');
        }
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

            },
            hide_logged_content: () => {
                // Hide connect DIV
                connect_div.classList.add('d-none');
                if (login_div.classList.contains('d-none')) {
                    login_div.classList.remove('d-none');
                    console.log("Login DIV shown")
                }
                if (!content_wrapper.classList.contains('d-none')) {
                    content_wrapper.classList.add('d-none')
                    console.log("Content wrapper hidden")
                }
            }
        }
    }
}