const triggerTabList = document.querySelectorAll('#userTabs a')
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