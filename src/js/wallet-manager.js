import {HttpManager} from "./http-manager.js";
import {apiUrls} from "./api-urls.js";
import {Utils} from "./utils.js"

const http = new HttpManager();
const utils = new Utils();
const local_storage = utils.storage();
export class WalletManager {

    async topUpWallet(amount) {
        const token = local_storage.get('token')
        const payload = {
            amount: amount,
            phoneNumber: this.getProfile().phoneNumber
        }
        return http.httpPost(token, apiUrls.walletTopUpUrl(), payload)
    }

    async getWalletAccount() {
        const token = local_storage.get('token')
        const customerId = this.getProfile().userId;
        return http.httpGet(apiUrls.walletUrl(customerId), token)
    }

    async getWalletHistory() {
        const token = local_storage.get('token')
        const phoneNumber = this.getProfile().phoneNumber;
        return http.httpGet(apiUrls.walletHistoryUrl(phoneNumber), token)
    }


    getProfile() {
        let user = local_storage.get('user-profile');
        return JSON.parse(user);
    }

    displayUserProfile = (selector) => {
        let user_profile = this.getProfile();
        console.log(user_profile)
        document.getElementById('user-profile').innerHTML = `<div class="card border-0">
                        <img src="img/user-profile.png" class="card-img-top mb-2" alt="User profile image">
                        <div class="card-body d-flex justify-content-between">
                            <h5 class="card-title">${user_profile.fullName}</h5>
                            <p class="badge text-bg-success">Active</p>
                        </div>
                        <ul class="list-group list-group-flush">
                            <li class="list-group-item">
                                <i class="bi bi-envelope"></i>
                                <span>${user_profile.email}</span>
                            </li>
                            <li class="list-group-item">
                                <i class="bi bi-phone"></i>
                                <span>${user_profile.phoneNumber}</span>
                            </li>
                            <li class="list-group-item">
                                <i class="bi bi-tag"></i>
                                <span>${user_profile.idTag}</span>
                            </li>
                        </ul>
                    </div>`
    }

    displayUserBalance = (selector, walletAccount) => {
        selector.removeClass('d-none')
        selector.html(`<div class="card mb-3">
                        <div class="card-header">
                            <h6 class="card-title">Total Balance</h6>
                        </div>
                        <div class="card-body">
                        <h2 class="mb-3 d-flex align-items-center justify-content-between">
                          <div class="p-3 border border-primary grd-primary-light rounded-5 d-flex">
                            <i class="bi bi-wallet2 fs-4 lh-1 text-primary"></i>
                          </div>
                          <span class="text-info">${utils.toRwf.format(walletAccount.accountBalance)}</span>
                        </h2>
                        <p class="m-0 small text-secondary">
                          Account:<span class="float-end badge bg-info text-info bg-opacity-10">${walletAccount.accountNumber}</span>
                        </p>
                        </div>
                    </div>`)
    }

}
