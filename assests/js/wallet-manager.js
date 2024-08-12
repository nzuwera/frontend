import {HttpManager} from "./http-manager.js";
import {BootPagination} from "./boot-pagination.js";
import {apiUrls} from "./api-urls.js";
import {Utils} from "./utils.js"

export class WalletManager {
    constructor() {
        this.utils = new Utils();
        this.http = new HttpManager();
        this.storage = new StorageManager();
        this.userProfile = this.getProfile();
    }

    async topUpWallet(amount) {
        const token = this.utils.storage.get('token')
        const payload = {
            amount: amount,
            phoneNumber: this.userProfile.phoneNumber
        }
        return this.http.httpPost(token, apiUrls.walletTopUpUrl(), payload)
    }

    async getWalletAccount() {
        const token = this.utils.storage.get('token')
        const customerId = this.userProfile.userId;
        return this.http.httpGet(apiUrls.walletUrl(customerId), token)
    }

    async getWalletHistory() {
        const token = this.utils.storage.get('token')
        const phoneNumber = this.userProfile.phoneNumber;
        return this.http.httpGet(apiUrls.walletHistoryUrl(phoneNumber), token)
    }


    getProfile() {
        let token = this.utils.storage.get('token')
        console.log(token)
        let profile = this.utils.decodeJwt(token)
        return JSON.parse(profile);
    }

    displayUserProfile = (selector) => {
        console.log(this.userProfile)
        selector.removeClass('d-none')
        selector.html(
            `<div class="card mb-3">
                <div class="card-header">
                    <h6 class="card-title">User Profile</h6>
                </div>
                <div class="card-body gy-4">
                    <h2 class="mb-3 d-flex align-items-center justify-content-between">
                      <div class="p-3 border border-primary grd-primary-light rounded-5 d-flex">
                        <i class="bi bi-person-circle fs-4 lh-1 text-primary"></i>
                      </div>
                      <span class="text-info">${this.userProfile.fullName}</span>
                    </h2>
                    <ul class="list-group list-group-flush gy-4 m-0 small text-secondary">
                      <li class="list-group-item list-unstyled d-flex justify-content-between align-items-center">
                          <i class="bi bi-envelope fs-4"></i> <span class="text-info bg-opacity-10">${this.userProfile.email}</span>
                      </li>
                      <li class="list-group-item list-unstyled d-flex justify-content-between align-items-center">
                        <i class="bi bi-phone fs-4"></i> <span class="text-info bg-opacity-10">${this.userProfile.phoneNumber}</span>
                      </li>
                      <li class="list-group-item list-unstyled d-flex justify-content-between align-items-center">
                          <i class="bi bi-tag fs-4"></i> <span class="text-info bg-opacity-10">${this.userProfile.idTag}</span>
                      </li>
                    </ul>
                </div>
            </div>`
        )
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
                          <span class="text-info">${this.utils.toRwf.format(walletAccount.accountBalance)}</span>
                        </h2>
                        <p class="m-0 small text-secondary">
                          Account:<span class="float-end badge bg-info text-info bg-opacity-10">${walletAccount.accountNumber}</span>
                        </p>
                        </div>
                    </div>`)
    }

}
