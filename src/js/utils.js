export class Utils {
    constructor() {
    }

    toRwf = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'RWF',
    });

    alert = (message, type, alertPlaceholder) => {
        alertPlaceholder.html([
            `<div class="alert alert-${type} alert-dismissible fade show" role="alert">`,
            `   <p>${message}</p>`,
            '   <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>',
            '</div>'
        ].join(''))
    }

    onBtnClick = (btn, callback) =>{
        btn.addEventListener('click',callback)
    }

    storage = () => {
        return {
            empty: () => localStorage.clear(),
            set: (key, object) => localStorage.setItem(key, object),
            remove: (key) => localStorage.removeItem(key),
            get: (key) => localStorage.getItem(key)
        };
    }

    decodeJwt(token) {
        const base64Payload = token.split(".")[1];
        return atob(base64Payload);
    }
}