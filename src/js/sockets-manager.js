import {Utils} from "./utils.js";
import {socketsTopics} from "./sockets-topics.js";


const stompClient = Stomp.client(socketsTopics.wsUrl);
const utils = new Utils();
const local_storage = utils.storage();

export class SocketsManager {
    connect() {
        stompClient.connect(
            {Authorization: `Bearer ${local_storage.get("token")}`}, (frame) => {
                console.log(frame);
                this.setConnected();
                stompClient.subscribe(socketsTopics.wallet, (message) => {
                    this.processPushNotification(message.body, this.updateWalletResponse)
                });
                stompClient.subscribe(socketsTopics.reservation, (message) => {
                    this.processPushNotification(message.body, this.updateReservationResponse)
                });
                stompClient.subscribe(socketsTopics.transaction, (message) => {
                    this.processPushNotification(message.body, this.updateTransactionResponse)
                });
                stompClient.subscribe(socketsTopics.meterValues, (message) => {
                    this.processPushNotification(message.body, this.updateMeterValuesResponse)
                });
                stompClient.subscribe(socketsTopics.heartBeat, (message) => {
                    this.processPushNotification(message.body, this.updateHeartBeatResponse)
                });
            });
    }

    disconnect() {
        if (this.client !== null) {
            stompClient.disconnect(function () {
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

