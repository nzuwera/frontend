// js/index.js
const socketsTopics = {
    wsUrl: 'wss://api.safaricharger.com/ws/push',
    userWalletBalance: "/user/queue/WalletBalance",
    walletTransaction: "/user/queue/WalletTransaction",
    reservation: "/user/queue/Reservation",
    connectStatus: "/user/queue/ChargingStatus/A03213807419/1",
    chargingSession: "/user/queue/ChargingSession/A03213807419/1",
    meterValues: "/user/queue/MeterValues",
    heartBeat: "/user/queue/HeartBeat",
    userError: "/user/queue/errors",
};

let stompClient = null;
let subscriptions = [];
const JWT_STORAGE_KEY = 'jwt';

// DOM Elements
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const loginDiv = document.getElementById('login-div');
const connectDiv = document.getElementById('connect-div');
const responseMessage = document.getElementById('responseMessage');
const userNotifications = document.getElementById('user-notifications');

// Notification Elements
const notificationElements = {
    userWalletBalance: document.getElementById('wallet-notification'),
    reservation: document.getElementById('reservation-notification'),
    connectStatus: document.getElementById('status-notification'),
    chargingSession: document.getElementById('charging-notification'),
    // Add others as needed
};

// Login Handler
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('https://api.safaricharger.com/app-api/v1/auth/token', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({username, password}),
        }).then(async (data) => {
            // console.log(token)
            let loginResponse = await data.json();
            console.log(loginResponse.jwt)
            const token = loginResponse.jwt;
            localStorage.setItem(JWT_STORAGE_KEY, token);
            toggleUIVisibility(true);
            connectWebSocket(token);
            showMessage('Login successful!', 'success');
        });
        response.catch(function (error) {
            showMessage(`Login error - ${error}`, 'danger');
            return false;
        }).finally(() => {
            console.info("Authentication process completed")
        });


    } catch (error) {
        showMessage(`Login failed: ${error.message}`, 'danger');
    }
});

// WebSocket Management
function connectWebSocket(token) {
    if (stompClient) stompClient.deactivate();

    stompClient = new StompJs.Client({
        brokerURL: socketsTopics.wsUrl,
        connectHeaders: {Authorization: `Bearer ${token}`},
        debug: (str) => console.debug(str),
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
    });

    stompClient.onConnect = (frame) => {
        showMessage('WebSocket connected!', 'success');
        setupSubscriptions();
    };

    stompClient.onWebSocketError = (error) => {
        console.error('WebSocket error:', error);
        showMessage('WebSocket connection error', 'danger');
    };

    stompClient.onStompError = (frame) => {
        console.error('STOMP error:', frame.headers.message);
        showMessage(`STOMP error: ${frame.headers.message}`, 'danger');
    };

    stompClient.activate();
}

function setupSubscriptions() {
    subscribeTopic(socketsTopics.userWalletBalance, notificationElements.userWalletBalance);
    subscribeTopic(socketsTopics.reservation, notificationElements.reservation);
    subscribeTopic(socketsTopics.connectStatus, notificationElements.connectStatus);
    subscribeTopic(socketsTopics.chargingSession, notificationElements.chargingSession);

    // Special handlers
    stompClient.subscribe(socketsTopics.userError, (message) => {
        showMessage(`Error: ${message.body}`, 'danger');
    });

    stompClient.subscribe(socketsTopics.heartBeat, (message) => {
        console.log('Heartbeat received:', message.body);
    });
}

function subscribeTopic(topic, element) {
    const subscription = stompClient.subscribe(topic, (message) => {
        if (element.innerHTML.length !== 0){
            element.prepend(document.createElement('hr'));
            element.prepend(message.body);
        }
        else
            element.innerHTML = message.body;
    });
    subscriptions.push(subscription);
    return subscription;
}

// Logout Handler
logoutBtn.addEventListener('click', () => {
    // Clear all subscriptions
    subscriptions.forEach(sub => sub.unsubscribe());
    subscriptions = [];

    // Properly disconnect from WebSocket
    if (stompClient) {
        stompClient.deactivate().then(() => {
            console.log('STOMP connection closed');
        }).catch(error => {
            console.error('Error closing connection:', error);
        });
        stompClient = null;
    }

    // Clear authentication data
    localStorage.removeItem(JWT_STORAGE_KEY);

    // Reset UI state
    toggleUIVisibility(false);
    clearNotificationElements();
    showMessage('Logged out successfully', 'success');
});

// Add helper function to clear notifications
function clearNotificationElements() {
    Object.values(notificationElements).forEach(element => {
        element.textContent = '';
    });
}

// Update toggleUIVisibility to clear messages when logging out
function toggleUIVisibility(isLoggedIn) {
    loginDiv.classList.toggle('d-none', isLoggedIn);
    connectDiv.classList.toggle('d-none', !isLoggedIn);
    userNotifications.classList.toggle('d-none', !isLoggedIn);

    if (!isLoggedIn) {
        responseMessage.innerHTML = '';
    }
}

function formatMessage(data) {
    return JSON.stringify(data, null, 2)
        .replace(/{|}|"/g, '')
        .replace(/,/g, '\n');
}

function showMessage(text, type) {
    responseMessage.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${text}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem(JWT_STORAGE_KEY);
    if (token) {
        toggleUIVisibility(true);
        connectWebSocket(token);
    }
});