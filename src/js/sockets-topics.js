export const socketsTopics = {
    wsUrl: 'wss://api.safaricharger.local/ws/push',
    walletBalance: '/user/queue/WalletBalance',
    walletTransaction: '/user/queue/WalletTransaction',
    reservation: '/user/queue/Reservation',
    chargingStatus: (chargerId, connectorId) => `/user/queue/ChargingStatus/${chargerId}/${connectorId}`,
    chargingSession: (chargerId, connectorId) => `/user/queue/ChargingSession/${chargerId}/${connectorId}`,
};
