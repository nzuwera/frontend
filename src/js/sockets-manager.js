import {Utils} from "./utils.js";
import {socketsTopics} from "./sockets-topics.js";
import {Stomp} from "https://cdnjs.cloudflare.com/ajax/libs/stomp.js/2.3.3/stomp.min.js";

export class SocketsManager {
    constructor() {
        this.client = Stomp.client(socketsTopics.wsUrl);
        this.utils = new Utils()
    }

    connect() {
        this.client.connect(
            {Authorization: `Bearer ${this.utils.storage().get("token")}`}, (frame) => {
                console.log(frame);
                this.setConnected();
                this.client.subscribe(socketsTopics.wallet, (message) => {
                    this.processPushNotification(message.body, this.updateWalletResponse)
                });
                this.client.subscribe(socketsTopics.reservation, (message) => {
                    this.processPushNotification(message.body, this.updateReservationResponse)
                });
                this.client.subscribe(socketsTopics.transaction, (message) => {
                    this.processPushNotification(message.body, this.updateTransactionResponse)
                });
                this.client.subscribe(socketsTopics.meterValues, (message) => {
                    this.processPushNotification(message.body, this.updateMeterValuesResponse)
                });
                this.client.subscribe(socketsTopics.heartBeat, (message) => {
                    this.processPushNotification(message.body, this.updateHeartBeatResponse)
                });
            });
    }

    disconnect() {
        if (this.client !== null) {
            this.client.disconnect(function () {
                console.log("disconnected")
                this.setDisconnected();
            });
        }
    }

    updateReservationResponse = (message) => {
        $("#reservationResponse").append(message)
    }

    updateWalletResponse = (message) => {
        $("#walletTopUpResponse").append(message)
    }

    updateTransactionResponse = (message) => {
        $("#transactionUpResponse").append(message)
    }

    updateMeterValuesResponse = (message) => {
        $("#meterValuesResponse").append(message)
    }

    updateHeartBeatResponse = (message) => {
        $("#heartBeatResponse").append(message)
    }

    processPushNotification = (message, callback) => {
        try {
            console.log(message)
            callback(message)
        } catch (error) {
            utils.alert('Failed to parse message body', 'danger', alertPlaceholder);
        }
    }

    setConnected(connected) {
        $("#login-div").hide();
        $("#connect-div").removeClass("d-none")
        $("#connect").text("Connected").attr("disabled", true);
    }

    setDisconnected() {
        $("#connect").removeAttr("disabled");
        $("#login-div").show();
        $("#connect-div").addClass("d-none")
        this.utils.storage().empty()
    }
}

