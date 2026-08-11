export class Utils {
    constructor() {
        this.errorResponse = document.getElementById('responseMessage');
    }

    showAlert = (message, type = 'info', duration = 8000) => {
        const stack = this.errorResponse || document.getElementById('responseMessage');
        if (!stack) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
          <span class="msg"></span>
          <button type="button" class="close" aria-label="Close">×</button>
        `;
        toast.querySelector('.msg').textContent = message;

        const close = () => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 250);
        };
        toast.querySelector('.close').addEventListener('click', close);

        stack.appendChild(toast);
        setTimeout(close, duration);
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
        const base64 = base64Payload.replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64 + "==".slice(0, (4 - base64.length % 4) % 4);
        return atob(padded);
    }
}
