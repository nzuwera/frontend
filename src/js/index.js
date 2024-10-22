import {Utils} from "./utils.js";
import {AuthManager} from "./auth-manager.js";
import {SocketsManager} from "./sockets-manager.js";
import {HttpManager} from "./http-manager.js";
import {apiUrls} from "./api-urls.js";
import {WalletManager} from "./wallet-manager.js";

const connectBtn = document.getElementById("connect");
const disconnectBtn = document.getElementById("disconnect");
const loginForm = document.getElementById("login-form");
const logoutBtn = document.getElementById("logout-btn");
const reservationForm = document.getElementById("reservation-form");
const walletTopUpForm = document.getElementById("topUp-form");
const alertPlaceholder = document.getElementById("responseMessage");
const reservationResponse = document.getElementById("reservationResponse");
const walletTopUpResponse = document.getElementById("walletTopUpResponse");
const utils = new Utils();
const local_storage = utils.storage();
const http = new HttpManager();
const walletManager = new WalletManager();
const auth = new AuthManager();
const socketsManager = new SocketsManager()

// Page loading completed
document.onreadystatechange = function () {
    if (document.readyState === "complete") {
        console.log("Page Loaded successfully")
        if (local_storage.get("logged-in") === true) {
            auth.displayContent();
        }
    }
}

// LOGIN FORM HANDLING
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Get login form data
    const data = new FormData(e.target);
    // Authentication
    auth.login(data.get("login-username"), data.get("password"))
})

logoutBtn.addEventListener('click',(e)=> {
    e.preventDefault()
    auth.logout()
})

// WEBSOCKET CONNECTION HANDLING
/*
utils.onBtnClick(disconnectBtn, socketsManager.disconnect())


const el = document.getElementById("batteryLevelValue");
const r = document.getElementById("batteryLevel");
el.innerText = r.valueAsNumber;
r.change(function () {
    console.log(r.val())
    el.html(r.val() + "%");
})

// WALLET TOP-UP HANDLING
walletTopUpForm.addEventListener('submit',(e) => {
    e.preventDefault();
    e.stopPropagation()
    let walletTopUpResponse = walletManager.topUpWallet(document.getElementById("amount").value)
    walletTopUpResponse.then(function (result) {
        console.log(result)
    }, function (error) {
        console.log(`Failed to get walletTopUp - ${error}`)
    })
})

// RESERVATION HANDLING
reservationForm.addEventListener('submit',(e) => {
    e.preventDefault();
    e.stopPropagation()
    const reservationResponse = http.httpPost(apiUrls.createReservationUrl(), {
        batteryCapacity: document.getElementById("batteryLevel").value,
        chargeBoxId: document.getElementById("charger").value,
        connectorId: document.getElementById("connectorId").value,
        idTag: document.getElementById("idTag").value,
        plateNumber: document.getElementById("plateNumber").value,
        reservationDuration: document.getElementById("reservationDuration").value
    }, utils.storage().get('token'))
    console.log(reservationResponse)
    this.reset()
})*/
