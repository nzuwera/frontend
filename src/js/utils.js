export class Utils {
    constructor() {
        this.errorResponse = document.getElementById('responseMessage')
    }

    showAlert = (message, type, duration = 15000) => {
        // Create the alert HTML content
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.role = 'alert';
        alert.innerHTML = `
        <p>${message}</p>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

        // Append the alert to the placeholder
        this.errorResponse.appendChild(alert);

        // Auto-dismiss the alert after the specified duration
        setTimeout(() => {
            alert.classList.remove('show');
            alert.addEventListener('transitionend', () => alert.remove());
        }, duration);
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