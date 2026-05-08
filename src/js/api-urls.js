export const apiUrls = {
    baseURL: "https://api.safaricharger.local",
    authUrl: function () {
        return `${this.baseURL}/auth/login`
    },
    selectContextUrl: function () {
        return `${this.baseURL}/auth/select-context`
    },
    logoutUrl: function () {
        return `${this.baseURL}/auth/logout`
    },
    walletMeUrl: function () {
        return `${this.baseURL}/payment/wallets/me`
    },
    walletRecentTxnsUrl: function (accountNumber) {
        return `${this.baseURL}/payment/wallets/accounts/${accountNumber}/transactions/recents`
    },
    reservationsUrl: function () {
        return `${this.baseURL}/csms/app/reservations`
    },
    chargingStartUrl: function (reservationId) {
        return `${this.baseURL}/csms/app/charging/start/${reservationId}`
    },
    chargingStopUrl: function (reservationId) {
        return `${this.baseURL}/csms/app/charging/stop/${reservationId}`
    }
}
