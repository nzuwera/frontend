const triggerTabList = document.querySelectorAll('#userTabs a')
const loginBtn = document.getElementById("login-btn");
const contentWrapper = document.getElementById("content-wrapper");

// TODO to be replaced with login form handling
loginBtn.addEventListener('click',function (event) {
    event.preventDefault();
    // contentWrapper.removeClass('d-none');
    if (contentWrapper.classList.contains('d-none')) {
        contentWrapper.classList.remove('d-none');
        // alert("remove faq display!");
    }
})
triggerTabList.forEach(triggerEl => {
    const tabTrigger = new bootstrap.Tab(triggerEl)

    triggerEl.addEventListener('click', event => {
        event.preventDefault()
        // TODO if event.target.id == 'tab-wallet'
        /*
            Display loading spinner while loading:
             - Updating wallet card
             - Updating transaction history
            Display wallet tab
         */
        tabTrigger.show()
        console.log(event.target.id);
    })
});