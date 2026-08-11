import { AuthManager } from "./auth-manager.js";
import { Utils } from "./utils.js";

const authManager = new AuthManager();
const utils = new Utils();
const local_storage = utils.storage();

document
  .getElementById("login-form")
  .addEventListener("submit", (e) => authManager.login(e));
document
  .getElementById("logout-btn")
  .addEventListener("click", (e) => authManager.logout(e));

document.addEventListener("DOMContentLoaded", () => {
  if (local_storage.get("token")) {
    authManager.displayContent();
  }
});
