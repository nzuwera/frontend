import {HttpManager} from "./http-manager.js";
import {apiUrls} from "./api-urls.js";
import {Utils} from "./utils.js"
import {stompJs} from "./sockets-manager.js";
import {socketsTopics} from "./sockets-topics.js";
import {Countdown} from "./Countdown.js";


const http = new HttpManager();
const utils = new Utils();
const local_storage = utils.storage();
const responseMessage = document.getElementById('responseMessage');

export class ReservationManager {
    // Set reservation tab elements
    properties = {
        form: document.getElementById('reservation-form'),
        cancelReservationBtn: document.getElementById('cancel-reservation-btn'),
        countdownBox: document.getElementById('countdown'),
        countdouwnHr: document.getElementById("hours"),
        countdouwnMin: document.getElementById("minutes"),
        countdouwnSec: document.getElementById("seconds"),
    }

    handlers = () => {

        const reservation = this;
        return {
            formHandler: function (event) {
                event.preventDefault()
                event.stopPropagation()
                // Convert FormData to json object
                let jsonPayload = Object.fromEntries(new FormData(event.target).entries())
                console.log(jsonPayload)
                console.log("Reservation form submitted")
                http.httpPost(apiUrls.createReservationUrl(), jsonPayload, local_storage.get('token'))
                    .then(function (response) {
                        if (!response.status) {
                            utils.showAlert(response.message, 'danger', responseMessage)
                        }
                        // Keep Expiration details
                        // - expireDate
                        // - chargerBoxId: will be used for reservation cancellation
                        // - connectorId: will be used for reservation cancellation
                        local_storage.set('reservation-chargerBoxId', response.data.chargeBoxId)
                        local_storage.set('reservation-connectorId', response.data.connectorId)
                        local_storage.set('reservation-startTime', response.data.startTime)
                        local_storage.set('reservation-expiredDate', response.data.expiryDateTime)
                        // Subscribe to reservation websocket
                        reservation.handlers().subscribeToReservation()
                    }).catch(function (error) {
                    utils.showAlert(error.message, 'danger', responseMessage)
                    console.error(error)
                }).finally(() => console.log("Create reservation submitted"))
            },
            subscribeToReservation: function () {
                let countdown=null;
                const reservationSubscription = stompJs.subscribe(socketsTopics.reservation, function (reservation_data) {
                    console.log("Reservation subscription started")
                    console.log(reservation_data)
                    // called when the client receives a STOMP message from the server
                    if (reservation_data.body) {
                        let reservationNotification = JSON.parse(reservation_data.body)
                        console.log(`Printing reservationNotification - ${reservationNotification}`)
                        if (reservationNotification.status == 'Accepted') {
                            countdown = new Countdown(local_storage.get('reservation-startTime'), local_storage.get('reservation-expiredDate'));
                            countdown.start((time) => {
                                reservation.properties.countdouwnHr.innerHTML = `${time.hr}`;
                                reservation.properties.countdouwnMin.innerHTML = `${time.min}`;
                                reservation.properties.countdouwnSec.innerHTML = `${time.sec}`;
                            });
                            // Activate Cancel button
                            document.getElementById('cancel-reservation-btn').classList.remove('d-none')
                        } else if (reservationNotification.status == 'Expired') {
                            // Unsubscribe
                            reservationSubscription.unsubscribe()
                            utils.showAlert("Reservation expired - Unused", 'success', responseMessage);
                            reservation.properties.cancelReservationBtn.classList.add('d-none')
                            console.log("Reservation subscription cancelled")
                            if (countdown) countdown.stop();
                        } else {
                            console.log(reservationNotification)
                            utils.showAlert("Reservation cancelled successfully", 'success', responseMessage);
                            reservation.properties.cancelReservationBtn.classList.add('d-none')
                            reservationSubscription.unsubscribe()
                            if (countdown) countdown.stop();
                        }
                        utils.showAlert(`got reservation message with body ${reservation_data.body}`, 'success', responseMessage);
                    } else {
                        utils.showAlert('got empty reservation message', 'danger', responseMessage);
                    }
                }, {"Authorization": `Bearer ${local_storage.get('token')}`});
            },
            cancelReservation: function (ev) {
                ev.preventDefault()
                ev.stopPropagation()

                let cancelReservationRequest = {
                    chargeBoxId: local_storage.get('reservation-chargerBoxId'),
                    connectorId: local_storage.get('reservation-connectorId'),
                }
                http.httpPost(apiUrls.cancelReservationUrl(), cancelReservationRequest, local_storage.get('token'))
                    .then(function (response) {
                        utils.showAlert(response.message, 'success', responseMessage)
                    }).catch(function (error) {
                    console.log("Cancel reservation error - " + error)
                }).finally(() => console.log("Cancel reservation completed"))
            }

        }

    }
}