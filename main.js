const connectBtn = $("#connect");
const disconnectBtn = $("#disconnect");
const sendBtn = $("#send");
const loginForm = $("#login-form");
const reservationForm = $("#reservation-form");
const walletTopUpForm = $("#topUp-form");
const alertPlaceholder = document.getElementById('responseMessage');
const loginUrl = "http://localhost:8181/app-api/v1/auth/token";
const makeReservationUrl = "http://localhost:8181/app-api/v1/reservations/create";
const cancelReservationUrl = "http://localhost:8181/app-api/v1/reservations/cancel";
const walletTopUpUrl = "http://localhost:8181/app-api/v1/wallets/top-up";
const wsUrl = 'ws://localhost:8181/ws/push';

function getItem(key) {
    return localStorage.getItem(key);
}

function setConnected(connected) {
    connectBtn.text("Connected").attr("disabled", true);
}

function setDisconnected() {
    connectBtn.text("CONNECT").removeAttr("disabled");
    $("#login-div").show();
    $("#connect-div").addClass("d-none")
}


// LOGIN FORM HANDLING
loginForm.submit((e) => {
    e.preventDefault();
    fetch(loginUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            username: $("#login-username").val(),
            password: $("#password").val(),
        })
    }).then(resp => resp.json()).then(data => {
        console.log(data);
        localStorage.setItem("token", data.jwt);
        localStorage.setItem("refreshToken", data.refreshToken);
        localStorage.setItem("username", $("#login-username").val());
        $("#login-div").hide();
        $("#connect-div").removeClass("d-none")
    }).catch(err => {
        alert("Invalid username of password")
    })
})

// WEBSOCKET CONNECTION HANDLING
let stompClient = null;
connectBtn.click(() => {
    // const socket = new SockJS(wsUrl);
    stompClient = Stomp.client(wsUrl);
    stompClient.connect({Authorization: `Bearer ${getItem("token")}`}, (frame) => {
        console.log(frame);
        setConnected();
        stompClient.subscribe("/topic/walletTopUp", (message) => {
            const data = JSON.parse(message.body);
            console.log(data);
            buildWalletResponse(data)
            $("#walletTopUpResponse").removeClass("d-none")
        });

        stompClient.subscribe("/topic/reservation/create", (message) => {
            const data = JSON.parse(message.body);
            console.log(data);
        });

        stompClient.subscribe("/topic/reservation/cancel", (message) => {
            const data = JSON.parse(message.body);
            console.log(data);
        });
    });
});

disconnectBtn.click(() => {
    if (stompClient !== null) {
        stompClient.disconnect(function () {
            console.log("disconnected")
            setDisconnected();
        });
    }
});


const alert = (message, type) => {
    alertPlaceholder.innerHTML = [
        `<div class="alert alert-${type} alert-dismissible fade show" role="alert">`,
        `   <p>${message}</p>`,
        '   <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>',
        '</div>'
    ].join('')
}

const el = $("#batteryLevelValue");
const r = $("#batteryLevel");
el.innerText = r.valueAsNumber;
r.change(function () {
    console.log(r.val())
    el.html(r.val() + "%");
})

function buildWalletResponse(walletTopUpResponse) {
    $("#walletAccount").html(walletTopUpResponse.msisdn)
    $("#walletReferenceId").html(walletTopUpResponse.referenceId)
    $("#WalletMomoTx").html(walletTopUpResponse.momoTransactionId)
    $("#WalletTxStatus").html(walletTopUpResponse.status)
    $("#WalletTxTimestamp").html(walletTopUpResponse.timestamp)
}

// WALLET TOP-UP HANDLING
walletTopUpForm.submit((e) => {
    e.preventDefault();

    fetch(walletTopUpUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${getItem("token")}`
        },
        body: JSON.stringify({
            amount: $("#amount").val(),
            phoneNumber: $("#phoneNumber").val()
        })
    }).then(resp => resp.json()).then(data => {
        alert(JSON.stringify(data), 'success')
    }).catch(err => {
        console.log(err)
        alert(err, 'danger')
    })
})


// RESERVATION HANDLING
reservationForm.submit((e) => {
    e.preventDefault();

    fetch(makeReservationUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${getItem("token")}`
        },
        body: JSON.stringify({
            batteryCapacity: $("#batteryLevel").val(),
            chargeBoxId: $("#charger").val(),
            connectorId: $("#connectorId").val(),
            idTag: $("#idTag").val(),
            plateNumber: $("#plateNumber").val(),
            reservationDuration: $("#reservationDuration").val()
        })
    }).then(resp => resp.json()).then(data => {
        var response = JSON.parse(data)
        alert(JSON.stringify(data), 'success')
    }).catch(err => {
        alert("Failed to make reservations", 'danger')
    })
})
