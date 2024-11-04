import {apiUrls} from "./api-urls.js";
import {HttpManager} from "./http-manager.js";
import {WalletManager} from "./wallet-manager.js";
import {ChargingManager} from "./charging-manager.js";
import {Utils} from "./utils.js";
import {stompJs} from "./sockets-manager.js";
import {socketsTopics} from "./sockets-topics.js";

const utils = new Utils();
const local_storage = utils.storage();
const http = new HttpManager();
const walletManager = new WalletManager();
const chargingManager = new ChargingManager();
const content_wrapper = document.getElementById('content-wrapper');
const responseMessage = document.getElementById('responseMessage');
const tabNavigationLinks = document.getElementById('tab-navigation-links');

export class AuthManager {

    constructor() {
    }

    login(username, password) {
        const authManager = this
        const loginResponse = http.httpPost(apiUrls.authUrl(), {
            username: username,
            password: password
        }).then(function (success) {
            console.log(success)
            local_storage.set("token", success.jwt)
            local_storage.set("refreshToken", success.refreshToken)
            local_storage.set("user-profile", utils.decodeJwt(success.jwt))
            local_storage.set("logged-in", true)
            authManager.init();
            authManager.initStomp();
        }).catch(function (error) {
            console.log(`Login failed - ${error}`)
            return false;
        }).finally(() => {
            console.info("Logged in successfully")
        })
    }

    initStomp() {
        stompJs.onConnect = (frame) => {
            let phone = JSON.parse(local_storage.get("user-profile")).phoneNumber;
            console.log('Connected: ' + frame);
            // Subscribe to walletBalance
            console.log('Wallet Account: ' + phone);


            // Subscribe to walletTransactions
            stompJs.subscribe(socketsTopics.walletTransaction, function (walletTransactions) {
                console.log(walletTransactions)
                // called when the client receives a STOMP message from the server
                if (walletTransactions.body) {
                    console.info('got walletTransactions message with body ' + walletTransactions.body);
                    walletManager.loadTransactions(0)
                } else {
                    alert('got empty walletTransactions message');
                }
            }, {"Authorization": `Bearer ${local_storage.get('token')}`});

            // Subscribe to user errors
            stompJs.subscribe(socketsTopics.userError, function (userErrors) {
                console.log(userErrors)
                // called when the client receives a STOMP message from the server
                if (userErrors.body) {
                    utils.showAlert(`got userErrors message with body ${userErrors.body}`, 'danger', responseMessage);
                } else {
                    utils.showAlert('got empty userErrors message', 'danger', responseMessage);
                }
            }, {"Authorization": `Bearer ${local_storage.get('token')}`});

            // Subscribe to reservation messages
/*            stompJs.subscribe(socketsTopics.reservation, function (reservations) {
                console.log(reservations)
                // called when the client receives a STOMP message from the server
                if (reservations.body) {
                    utils.showAlert(`got reservation message with body ${reservations.body}`, 'success', responseMessage);
                } else {
                    utils.showAlert('got empty reservation message', 'danger', responseMessage);
                }
            }, {"Authorization": `Bearer ${local_storage.get('token')}`});*/

            // Subscribe to chargingSession messages
 /*           stompJs.subscribe(socketsTopics.chargingSession, function (reservations) {
                console.log(reservations)
                // called when the client receives a STOMP message from the server
                if (reservations.body) {
                    utils.showAlert(`got chargingSession message with body ${reservations.body}`, 'success', responseMessage);
                } else {
                    utils.showAlert('got empty chargingSession message', 'danger', responseMessage);
                }
            }, {"Authorization": `Bearer ${local_storage.get('token')}`});*/
        };

        stompJs.onWebSocketError = (error) => {
            utils.showAlert(`Error with websocket ${error}`, 'danger', responseMessage);
        };

        stompJs.onStompError = (frame) => {
            console.error('Broker reported error: ' + frame.headers['message']);
            console.error('Additional details: ' + frame.body);
        };
    }

    init() {
        try {
            console.log("Init started")
            walletManager.renderUserProfile()
            walletManager.getWalletAccount()
            walletManager.loadTransactions(0)
            chargingManager.handlers().loadTransactions(0)
            this.displayContent()
            stompJs.activate();
            console.log("Init End")
        }catch (error){
            console.error(error)
        }
    }

    logout() {
        const authManager = this
        const loginResponse = http.httpGet(apiUrls.logoutUrl(), local_storage.get('token'))
        loginResponse.then(function (success) {
            console.log(success)
            authManager.resetAll()
        }).catch(function (error) {
            utils.showAlert(`Logout failed - ${error}`, 'danger', responseMessage)
        }).finally(function (e) {
            console.info("Logout processed successfully");
        })
    }

    resetAll() {
        stompJs.deactivate();
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
                // Show tab navigation links
                if (tabNavigationLinks.classList.contains('d-none')){
                    tabNavigationLinks.classList.remove('d-none')
                }

            },
            hide_logged_content: () => {
                // Hide connect DIV
                connect_div.classList.add('d-none');

                // Hide tab navigation links
                tabNavigationLinks.classList.add('d-none')

                // Remove
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