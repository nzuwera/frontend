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
        document.getElementById('user-profile').innerHTML = `
                    <div class="card mb-4 mb-xl-0">
                        <div class="card-header">Profile info</div>
                        <div class="card-body">
                            <div class="d-flex flex-column justify-content-center gap-2 mb-2">
                                <img src="img/user-profile.png" class="img-account-profile image-circle mb-2 justify-content-center" alt="User profile image">
                                <h5 class="card-title">${user_profile.fullName}</h5>
                                <p class="badge text-bg-success">Active</p>
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
                            </div>
                        </div>
                    </div>`
    }

    renderWalletBalance = (selector, account) => {
        // Get User fullname from localStorage
        let user_details = JSON.parse(local_storage.get('user-profile'));

        selector.innerHTML = ` <div class="card">
                                    <div class="card-header">Wallet Account</div>
                                    <div class="card-body">
                                        <div class="d-flex justify-content-between mb-4">
                                            <div class="d-flex flex-column">
                                                <span class="text-muted mb-1" style="font-size: xx-small;">Main account</span>
                                                <span style="font-weight: bold">${user_details.fullName}</span>
                                                <span class="text-muted" style="font-size: small;">${account.accountNumber}</span> 
                                            </div>
                                            <div class="d-flex flex-column gap-1">
                                                <span class="text-muted mb-1" style="font-size: xx-small">Current balance</span>
                                                <span style="font-size: large;">${utils.toRwf.format(account.accountBalance)}</span> 
                                            </div>
                                        </div>
                                        <div class="row">
                                            <div class="col-12">
                                                <button class="btn btn-primary" role="button"
                                                        data-bs-toggle="modal"
                                                        data-bs-target="#wallet-topUp-modal" style="text-decoration: none;">
                                                    Add money&nbsp;<i class="bi bi-folder-plus"></i> 
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
                <td>
                <p class="badge rounded-pill ${tx.type === 'DEBIT' ? 'text-bg-danger' : 'text-bg-success'}">
                <i class="bi bi-arrow-${tx.type === 'DEBIT' ? 'down' : 'up'}">&nbsp;${tx.type.toLowerCase()}</i>
                </p>
                </td>
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

        const { totalPages, number: currentPage } = data;

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
