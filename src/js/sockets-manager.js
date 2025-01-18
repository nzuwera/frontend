import {socketsTopics} from "./sockets-topics.js";
import {Utils} from "./utils.js";

const utils = new Utils();
const local_storage = utils.storage();

class SocketManager {
    constructor(brokerURL, tokenProvider) {
        this.brokerURL = brokerURL;
        this.stompClient = null;
        this.subscriptions = new Map(); // To manage active subscriptions
        this.tokenProvider = tokenProvider; // Function to retrieve the JWT token
    }

// Initialize the STOMP client
    initialize() {
        if (!this.stompClient) {
            this.stompClient = new StompJs.Client({
                brokerURL: this.brokerURL,
                reconnectDelay: 5000, // Automatically reconnect after 5 seconds
                heartbeatIncoming: 4000,
                heartbeatOutgoing: 4000,
                connectHeaders: {
                    Authorization: `Bearer ${this.tokenProvider()}`, // Attach JWT token
                },
                onConnect: (frame) => {
                    console.log("Connected: ", frame);

                    // subscribe to wallet-notification
                    this.subscribe(socketsTopics.userWalletBalance, message => this.handleStompCallbacks(message, 'wallet-notification'))

                    // subscribe to reservation-notification
                    this.subscribe(socketsTopics.reservation, message => this.handleStompCallbacks(message, 'reservation-notification'))

                    // subscribe to status-notification
                    this.subscribe(socketsTopics.connectStatus, message => this.handleStompCallbacks(message, 'status-notification'))

                    // subscribe to charging-notification
                    this.subscribe(socketsTopics.chargingSession, message => this.handleStompCallbacks(message, 'charging-notification'))
                },
                onStompError: (frame) => {
                    this.handleError(frame.headers["message"]);
                },
                debug: (str) => {
                    console.debug(str); // Optional debugging output
                },
            });
        }
    }

    handleStompCallbacks(message, selector) {
        return (message) => {
            if (document.getElementById(selector).innerHTML.trim() === "") {
                document.getElementById(selector).prepend(message);
            } else {
                document.getElementById(selector).prepend(document.createElement('hr'));
                document.getElementById(selector).prepend(message);
            }
        };
    }

// Connect to the WebSocket server
    connect() {
        if (!this.stompClient) {
            console.error("STOMP client is not initialized. Call initialize() first.");
            return;
        }
        // Update the JWT token in case it has changed
        this.stompClient.connectHeaders = {
            Authorization: `Bearer ${this.tokenProvider()}`,
        };

        this.stompClient.activate();
    }

// Disconnect from the WebSocket server
    disconnect() {
        if (this.stompClient) {
            for (let topic of this.subscriptions.keys()) {
                this.unsubscribe(topic)
            }
            this.stompClient.deactivate()
            console.log("Disconnected from WebSocket server.");
        }
    }

// Subscribe to a topic
    subscribe(topic, callback) {
        if (!this.stompClient || !this.stompClient.connected) {
            console.error("STOMP client is not connected. Connect first before subscribing.");
            return;
        }

        if (!this.subscriptions.has(topic)) {
            const subscription = this.stompClient.subscribe(topic, (message) => {
                callback(message.body);
            }, {Authorization: `Bearer ${local_storage.get('token')}`});
            this.subscriptions.set(topic, subscription);
        } else {
            console.log(`Already subscribed to topic: ${topic}`);
        }
    }

// Unsubscribe from a topic
    unsubscribe(topic) {
        if (this.subscriptions.has(topic)) {
            this.stompClient.unsubscribe(topic);
            this.subscriptions.delete(topic);
            console.log(`Unsubscribed from topic: ${topic}`);
        } else {
            console.error(`No active subscription for topic: ${topic}`);
        }
    }

// Handle STOMP errors
    handleError(error) {
        console.error("WebSocket Error: ", error);
    }
}

// Function to retrieve the JWT token
const getToken = () => {
    // Replace this with your logic to fetch the JWT token
    return local_storage.get("token") || ""; // Example using localStorage
};

// Export as a singleton instance
const socketManager = new SocketManager(socketsTopics.wsUrl, getToken);

export default socketManager;