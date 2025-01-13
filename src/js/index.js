import {Utils} from "./utils.js";
import {AuthManager} from "./auth-manager.js";
import {WalletManager} from "./wallet-manager.js";
import {ReservationManager} from "./reservation-manager.js";

document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("login-form");
    const logoutBtn = document.getElementById("logout-btn");
    const walletTopUpForm = document.getElementById("topUp-form");
    const utils = new Utils();
    const local_storage = utils.storage();
    const walletManager = new WalletManager();
    const auth = new AuthManager();
    const reservation = new ReservationManager();

// Wallet TopUp Modal
    const phoneNumberInput = document.getElementById("phoneNumber");
    const topUpModalElement = document.getElementById("wallet-topUp-modal");
    const topUpModal = new bootstrap.Modal(topUpModalElement);


// LOGIN FORM HANDLING
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Get login form data
        const data = new FormData(e.target);
        // Authentication
        auth.login(data.get("login-username"), data.get("password"))
    })

    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault()
        auth.logout()
    })

// WALLET TOP-UP HANDLING
    walletTopUpForm.addEventListener('submit', (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Get wallet top-up form data
        const formData = new FormData(e.target);

        // Send HTTP wallet top-up request
        walletManager.topUpWallet(formData.get('phoneNumber'), formData.get('amount'));

        // Hide the modal after form submission
        topUpModal.hide()
        walletTopUpForm.reset()
    });

    // Set the phoneNumber value when the modal is shown
    topUpModalElement.addEventListener("show.bs.modal", function () {
        // Set a value to phoneNumber (e.g., retrieve from a variable or function)
        phoneNumberInput.value = JSON.parse(local_storage.get('user-profile')).phoneNumber; // Replace this with dynamic value as needed
    });


    // Tab navigations
    let navigationTabList = document.querySelectorAll('#navigation-tabs li a.nav-link')
    navigationTabList.forEach(navigationTab => {
        const selectedTab = new bootstrap.Tab(navigationTab)
        navigationTab.addEventListener('click', event => {
            event.preventDefault()
            switch (event.target.id) {
                case "tab-reservation":
                    // Reset reservation form
                    // Get Chargers in drop down box
                    // Get Customer vehicles in drop down box
                    break;
                case "tab-charging":
                    break;
                case "tab-wallet":
                    // Get Active reservation if no active reservation no cha
                    break;
                default:
                    console.log(`unknown tab ${event.target.id}`)
                    break;

            }
            selectedTab.show()
            console.log(`---- Current tab ${event.target.id}: tab content_id = ${event.target.getAttribute('href')}`)
        })
    })

    // Cancel reservation processing
    reservation.properties.form.addEventListener('submit', reservation.handlers().formHandler)
    reservation.properties.cancelReservationBtn.addEventListener('click', reservation.handlers().cancelReservation)

})