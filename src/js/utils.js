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
        btn.click(callback)
    }

    storage = () => {
        function empty(){
            localStorage.clear()
        }
        function set(key,object){
            localStorage.setItem(key,object)
        }
        function remove(key){
            localStorage.removeItem(key)
        }
        function get(key){
            return localStorage.getItem(key)
        }
    }

    decodeJwt(token) {
        const base64Payload = token.split(".")[1];
        return atob(base64Payload);
    }
}