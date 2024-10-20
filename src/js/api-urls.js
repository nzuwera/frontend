export const apiUrls = {
    baseURL: "http://localhost:8181/app-api/v1",
    authUrl: function () {
        return `${this.baseURL}/auth/token`
    },
    refreshTokenUrl: function () {
        return `${this.baseURL}/auth/refresh`
    },
    logoutUrl: function () {
        return `${this.baseURL}/logout`
    },
    walletUrl: function (customerId) {
        return `${this.baseURL}/wallets/get/${customerId}`
    },
    walletTopUpUrl: function () {
        return `${this.baseURL}/wallets/top-up`
    },
    walletHistoryUrl: function (account) {
        return `${this.baseURL}/wallets/history/${account}`
    },
    createReservationUrl: function () {
        return `${this.baseURL}/reservations/create`
    },
    cancelReservationUrl: function () {
        return `${this.baseURL}/reservations/cancel`
    },
    customerReservationsUrl: function (customerId) {
        return `${this.baseURL}/reservations/get/${customerId}`
    }
}