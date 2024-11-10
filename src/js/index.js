import {Utils} from "./utils.js";
import {AuthManager} from "./auth-manager.js";

document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("login-form");
    const logoutBtn = document.getElementById("logout-btn");
    const utils = new Utils();
    const local_storage = utils.storage();
    const auth = new AuthManager();


    if (local_storage.get('logged-in')) {
        auth.init()
    }

    /*
        Handle login
     */
    loginForm.addEventListener('submit', (e) => auth.login(e))
    /*
        Handle logout
     */
    logoutBtn.addEventListener('click', (event) => auth.logout(event))
});