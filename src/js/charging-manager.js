import {HttpManager} from "./http-manager.js";
import {apiUrls} from "./api-urls.js";
import {Utils} from "./utils.js"
import {stompJs} from "./sockets-manager.js";
import {socketsTopics} from "./sockets-topics.js";
import {Countdown} from "./Countdown.js";


const http = new HttpManager();
const utils = new Utils();
const local_storage = utils.storage();
const responseMessage = document.getElementById("responseMessage");
let currentPage = 0;
let pageSize = 10;
export class ChargingManager {
    // Set reservation tab elements
    properties = {
        startChargingBtn: document.getElementById('start-charging-btn'),
        stopChargingBtn: document.getElementById('stop-charging-btn'),
        chargingCard: document.getElementById('charging-card')
    }

    handlers = () => {

        const chargingManager = this;
        return {
            startCharging: function (event) {
                event.preventDefault()
                event.stopPropagation()
                // Get Current ReservationId
                let currentReservation = local_storage.get('current-reservation')
                http.httpGet(apiUrls.startCharging(currentReservation), local_storage.get('token'))
                    .then(function (data) {
                        if (data.status) {
                            utils.showAlert(data.message, 'success', responseMessage)
                            // Subscribe to reservation websocket
                            chargingManager.handlers().subscribeToCharging()
                        }
                        utils.showAlert(data.message, 'danger', responseMessage)
                    }).catch(function (error) {
                    utils.showAlert(error.message, 'danger', responseMessage)
                    console.error(error)
                }).finally(() => console.log("Charging session initiated!"))
            },
            subscribeToCharging: function () {
                let countdown = null;
                // socketsTopics.chargingSession is HARD CODED in this simulator to /user/queue/ChargingSession/A03213807419/1
                const chargingSubscription = stompJs.subscribe(socketsTopics.chargingSession, function (subscription_data) {
                    console.log("Charging subscription started")
                    console.log(subscription_data)

                    // called when the client receives a STOMP message from the server
                    if (subscription_data.body) {
                        let chargingNotification = JSON.parse(subscription_data.body)
                        console.log(`Printing chargingNotification - ${chargingNotification}`)
                        if (chargingNotification.status == 'Charging') {
                            countdown = new Countdown(local_storage.get('reservation-startTime'), local_storage.get('reservation-expiredDate'));
                            countdown.start((time) => {
                                reservation.properties.countdownBox.innerHTML = `Remaining time: ${time}`;
                            });
                            // Activate Cancel button
                            document.getElementById('cancel-reservation-btn').classList.remove('d-none')
                        } else if (chargingNotification.status == 'Finishing') {
                            // Unsubscribe
                            chargingSubscription.unsubscribe()
                            utils.showAlert("Reservation expired - Unused", 'success', responseMessage);
                            reservation.properties.cancelReservationBtn.classList.add('d-none')
                            console.log("Reservation subscription cancelled")
                            if (countdown) countdown.stop();
                        } else {
                            console.log(chargingNotification)
                            utils.showAlert("Reservation cancelled successfully", 'success', responseMessage);
                            reservation.properties.cancelReservationBtn.classList.add('d-none')
                            chargingSubscription.unsubscribe()
                            if (countdown) countdown.stop();
                        }
                        utils.showAlert(`got reservation message with body ${subscription_data.body}`, 'success', responseMessage);
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
            },
            loadTransactions: function (page) {
                let username = JSON.parse(local_storage.get('user-profile')).sub;
                console.log(`Username from local_storage = ${username}`)
                const url = `${apiUrls.chargingHistory(username)}?page=${page}&size=${pageSize}`;

                http.httpGet(url, local_storage.get('token'))
                    .then(function (data) {
                        chargingManager.handlers().renderChargingHistory(data.content);
                        chargingManager.handlers().setupPagination(data);
                    })
                    .catch(error => utils.showAlert(`Error fetching charging history data: ${error}`, "danger", responseMessage))
                    .finally(() => console.info("Loading charging transactions completed"));
            },
            renderChargingHistory: function (transactions) {
                const tableBody = document.getElementById('charging-history-body');
                tableBody.innerHTML = '';  // Clear previous data

                transactions.forEach(tx => {
                    const row = `
            <tr>
                <td>${new Date(tx.transactionDate).toLocaleString()}</td>
                <td>${tx.transactionId}</td>
                <td>${tx.referenceId}</td>
                <td>${tx.idTag}</td>
                <td>${tx.chargeBoxId}</td>
                <td>${tx.connectorId}</td>
                <td>${tx.consumedUnits}</td>
                <td>${utils.toRwf.format(tx.totalAmount)}</td>
                <td>${tx.location}</td>
                <td>${tx.stopReason}</td>
            </tr>`;
                    tableBody.insertAdjacentHTML('beforeend', row);
                });
            },
            setupPagination: function (data) {
                const paginationEl = document.getElementById('charging-history-pagination');
                paginationEl.innerHTML = '';  // Clear previous pagination

                const {totalPages, number: currentPage} = data;

                // Previous button
                const prevItem = document.createElement('li');
                prevItem.classList.add('page-item');
                if (currentPage === 0) prevItem.classList.add('disabled');

                const prevLink = document.createElement('a');
                prevLink.classList.add('page-link');
                prevLink.href = '#';
                prevLink.textContent = 'Previous';
                prevLink.addEventListener('click', (event) => {
                    event.preventDefault();
                    if (currentPage > 0) this.loadTransactions(currentPage - 1);
                });

                prevItem.appendChild(prevLink);
                paginationEl.appendChild(prevItem);

                // Current page and next two pages if available
                for (let i = currentPage; i < Math.min(currentPage + 3, totalPages); i++) {
                    const pageItem = document.createElement('li');
                    pageItem.classList.add('page-item');
                    if (i === currentPage) pageItem.classList.add('active');  // Highlight the current page

                    const pageLink = document.createElement('a');
                    pageLink.classList.add('page-link');
                    pageLink.href = '#';
                    pageLink.textContent = i + 1;
                    pageLink.addEventListener('click', (event) => {
                        event.preventDefault();
                        this.loadTransactions(i);  // Load transactions for the clicked page
                    });

                    pageItem.appendChild(pageLink);
                    paginationEl.appendChild(pageItem);
                }

                // Next button
                const nextItem = document.createElement('li');
                nextItem.classList.add('page-item');
                if (currentPage === totalPages - 1) nextItem.classList.add('disabled');

                const nextLink = document.createElement('a');
                nextLink.classList.add('page-link');
                nextLink.href = '#';
                nextLink.textContent = 'Next';
                nextLink.addEventListener('click', (event) => {
                    event.preventDefault();
                    if (currentPage < totalPages - 1) this.loadTransactions(currentPage + 1);
                });

                nextItem.appendChild(nextLink);
                paginationEl.appendChild(nextItem);
            }

        }

    }
}