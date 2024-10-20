import {WalletManager} from "./js/wallet-manager.js";
import {Utils} from "./js/utils.js";
import {AuthManager} from "./js/auth-manager.js";
import {SocketsManager} from "./js/sockets-manager.js";

const connectBtn = $("#connect");
const disconnectBtn = $("#disconnect");
const loginForm = $("#login-form");
const reservationForm = $("#reservation-form");
const walletTopUpForm = $("#topUp-form");
const alertPlaceholder = $("#responseMessage");
const reservationResponse = $("#reservationResponse");
const walletTopUpResponse = $("#walletTopUpResponse");
const utils = new Utils();
const auth = new AuthManager();
const socketsManager = new SocketsManager()


// LOGIN FORM HANDLING
loginForm.submit((e) => {
    e.preventDefault();
    e.stopPropagation();
    auth.login($("#login-username").val(), $("#password").val())
})

// WEBSOCKET CONNECTION HANDLING
// this.utils.onBtnClick(connectBtn, socketsManager.connect())
utils.onBtnClick(disconnectBtn, socketsManager.disconnect())


const el = $("#batteryLevelValue");
const r = $("#batteryLevel");
el.innerText = r.valueAsNumber;
r.change(function () {
    console.log(r.val())
    el.html(r.val() + "%");
})

// WALLET TOP-UP HANDLING
walletTopUpForm.submit((e) => {
    e.preventDefault();
    e.stopPropagation()
    let walletTopUpResponse = walletManager.topUpWallet($("#amount").val())
    walletTopUpResponse.then(function (result) {
        console.log(result)
    }, function (error) {
        console.log(`Failed to get walletTopUp - ${error}`)
    })
})

// RESERVATION HANDLING
reservationForm.submit((e) => {
    e.preventDefault();
    e.stopPropagation()
    const reservationResponse = http.httpPost(makeReservationUrl, {
        batteryCapacity: $("#batteryLevel").val(),
        chargeBoxId: $("#charger").val(),
        connectorId: $("#connectorId").val(),
        idTag: $("#idTag").val(),
        plateNumber: $("#plateNumber").val(),
        reservationDuration: $("#reservationDuration").val()
    }, storage.get('token'))
    console.log(reservationResponse)
    this.reset()
})