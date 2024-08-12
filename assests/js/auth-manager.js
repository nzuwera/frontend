import {apiUrls} from "./api-urls.js";
import {HttpManager} from "./http-manager.js";
import {WalletManager} from "./wallet-manager.js";
import {Utils} from "./utils.js";
import {SocketsManager} from "./sockets-manager.js";


export class AuthManager {
    constructor() {
        this.utils = new Utils();
        this.http = new HttpManager();
        this.socketManager = new SocketsManager();
        this.walletManager = new WalletManager();
    }

    login(username, password) {
        const loginResponse = this.http.httpPost(apiUrls.authUrl(), {
            username: username,
            password: password
        })
        loginResponse.then(function (success) {
            this.utils.storage().set("token", success.jwt)
            this.utils.storage().set("refreshToken", success.refreshToken)
            this.init()
        }, function (error) {
            console.log(`Login failed - ${error}`)
        })
    }


    init() {
        this.setUserProfile()
        this.setWalletAccount()
        this.displayContent()
        this.socketConnect()
    }

    logout() {
        const loginResponse = this.http.httpGet(apiUrls.logoutUrl(), this.utils.storage().get('token'))
        loginResponse.then(function (success) {
            this.resetAll()
        }, function (error) {
            console.log(`Logout failed - ${error}`)
        })
    }

    resetAll() {
        // TODO implement this
    }

    refreshToken() {
        const refreshResponse = this.http.httpGet(apiUrls.logoutUrl(), this.utils.storage().get('token'))
        refreshResponse.then(function (success) {
            this.utils.storage().set("token", success.jwt)
            this.utils.storage().set("refreshToken", success.refreshToken)
            this.init()
            console.log(`TokenRefreshed successfully - ${success}`)
        }, function (error) {
            console.log(`Failed to refresh token - ${error}`)
        })
    }

    setUserProfile() {
        // getCustomer WalletAccount
        this.walletManager.displayUserProfile($("#userProfile"))
    }

    setWalletAccount() {
        const walletManager = new WalletManager();
        let walletAccountResponse = walletManager.getWalletAccount();
        walletAccountResponse.then(function (account) {
            console.log(account)
            console.log(account.data)
            walletManager.displayUserBalance($("#walletBalance"), account.data)
        }, function (error) {
            console.log(`Failed to get walletAccount ${error}`)
        })
    }

    socketConnect() {
        this.socketManager.connect();
    }

    displayContent() {

    }
}