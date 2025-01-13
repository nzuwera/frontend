import {HttpManager} from "./http-manager.js";
import {apiUrls} from "./api-urls.js";
import {Utils} from "./utils.js"
import {stompJs} from "./sockets-manager.js";
import {socketsTopics} from "./sockets-topics.js";

const http = new HttpManager();
const utils = new Utils();
const local_storage = utils.storage();

const errorMessage = document.getElementById("responseMessage");

let currentPage = 0;
let pageSize = 10;

export class WalletManager {

    topUpWallet(phone, amount) {
        const walletManager = this;
        const token = local_storage.get('token')
        const userWallet = document.getElementById("user-wallet");
        const payload = {
            amount: amount,
            phoneNumber: phone
        }
        const topUpResponse = http.httpPost(apiUrls.walletTopUpUrl(), payload, token)
            .then(function (response) {
                // Handle /app-api/v1/wallets/top-up ResponseEntity<ResponseObject>
                // Display acknowledgement message which has PENDING status
                console.info(response)
                utils.showAlert(`Top-up request is ${response.data.status} for account ${phone} with referenceId ${response.data.externalId}`,"success",errorMessage)
                // Refresh transaction to see the pending one
                walletManager.loadTransactions(currentPage)
                // Subscribe to /user/queue/WalletBalance
                let subscription = stompJs.subscribe(socketsTopics.userWalletBalance, function (userWalletBalance) {
                    console.log(userWalletBalance)
                    // Update Wallet Balance
                    if (userWalletBalance.body) {
                        console.log(userWalletBalance)
                        console.log(userWalletBalance.body)
                        console.log(JSON.parse(userWalletBalance.body))
                        walletManager.renderWalletBalance(userWallet, JSON.parse(userWalletBalance.body));

                        // Unsubscribe after processing push notification
                        subscription.unsubscribe();
                    } else {
                        utils.showAlert('got empty userWalletBalance message',"danger",errorMessage);
                    }
                }, {"Authorization": `Bearer ${local_storage.get('token')}`});
            }).catch(function (error) {
                utils.showAlert(error,"danger",errorMessage);
            }).finally(function () {
                console.log("Wallet top-up completed")
            })
    }

    getWalletAccount() {
        let walletManager = this;
        let user_details = JSON.parse(local_storage.get('user-profile'));
        console.log("getWalletAccount:user_details = " + user_details)
        http.httpGet(apiUrls.walletUrl(user_details.userId), local_storage.get('token'))
            .then(function (account) {
                walletManager.renderWalletBalance(document.getElementById("user-wallet"), account.data)
                // Set wallet account in top-up form
                document.getElementById('phoneNumber').value = account.data.accountNumber;
            }).catch(function (error) {
            utils.showAlert(`Failed to get walletAccount ${error}`,"danger",errorMessage);
        }).finally(() => {
            console.log(`Get Wallet Account completed`)
        })
    }

    renderUserProfile = (selector) => {
        let user_profile = JSON.parse(local_storage.get('user-profile'));
        document.getElementById('user-profile').innerHTML = `<div class="card border-0">
                        <img src="img/user-profile.png" class="card-img-top mb-2" alt="User profile image" width="150">
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
                        </ul>
                    </div>`
    }

    renderWalletBalance = (selector, account) => {
        selector.innerHTML = ` <div class="card">
                                            <div class="card-body">
                                                <div class="d-flex justify-content-between text-muted">
                                                    <h6 class="mb-3">Total Balance</h6>
                                                    <div class="mb-3">
                                                        <i class="bi bi-wallet2"></i>&nbsp;${account.accountNumber}
                                                    </div>
                                                </div>
                                                <h3 class="h3 mb-4 text-secondary">${utils.toRwf.format(account.accountBalance)}</h3>
                                                <div class="d-grid">
                                                    <button class="btn btn-primary btn-lg" type="button"
                                                            data-bs-toggle="modal"
                                                            data-bs-target="#wallet-topUp-modal">
                                                        <bi class="bi bi-plus-square"></bi>
                                                        <span>&nbsp;top-up</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>`
    }
    renderWalletHistory = (transactions) => {
        const tableBody = document.getElementById('transactionBody');
        tableBody.innerHTML = '';  // Clear previous data

        transactions.forEach(tx => {
            // Determine the badge color based on the transaction status
            let badgeClass;
            switch (tx.status.toLowerCase()) {
                case 'pending':
                    badgeClass = 'text-bg-warning';
                    break;
                case 'successful':
                    badgeClass = 'text-bg-success';
                    break;
                case 'failed':
                    badgeClass = 'text-bg-danger';
                    break;
                default:
                    badgeClass = 'text-bg-secondary';  // Fallback color
            }

            const row = `
            <tr>
                <td>${tx.type}</td>
                <td>${new Date(tx.transactionDate).toLocaleString()}</td>
                <td><p class="badge rounded-pill ${badgeClass}">${tx.status.toLowerCase()}</p></td>
                <td>${tx.account}</td>
                <td>RWF ${tx.amount}</td>
                <td>${tx.transactionId}</td>
            </tr>
        `;
            tableBody.insertAdjacentHTML('beforeend', row);
        });
    }

    loadTransactions(page) {
        const walletManager = this;
        const walletAccount = JSON.parse(local_storage.get('user-profile')).phoneNumber;
        const url = `${apiUrls.walletHistoryUrl(walletAccount)}?page=${page}&size=${pageSize}`;

        http.httpGet(url, local_storage.get('token'))
            .then(function (data) {
                walletManager.renderWalletHistory(data.content);
                walletManager.setupPagination(data);
            })
            .catch(error => utils.showAlert('Error fetching data:', "danger",errorMessage))
            .finally(() => console.info("Loading wallet transactions completed"));
    }

    setupPagination(data) {
        const paginationEl = document.getElementById('pagination');
        paginationEl.innerHTML = '';  // Clear previous pagination


        for (let i = 0; i < data.totalPages; i++) {
            const pageItem = document.createElement('li');
            pageItem.classList.add('page-item');
            if (data.number === i) pageItem.classList.add('active');  // Highlight the current page

            const pageLink = document.createElement('a');
            pageLink.classList.add('page-link');
            pageLink.href = '#';
            pageLink.textContent = i + 1;
            pageLink.addEventListener('click', (event) => {
                event.preventDefault();  // Prevent page reload
                this.loadTransactions(i);     // Load transactions for the clicked page
            });

            pageItem.appendChild(pageLink);
            paginationEl.appendChild(pageItem);
        }
    }

}
