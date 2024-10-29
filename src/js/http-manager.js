export class HttpManager {
    constructor(baseURL = '') {
        this.baseURL = baseURL;
    }

    async httpRequest(method, url, payload = null, jwt = null) {
        const headers = {
            "Content-Type": "application/json",
        };
        if (jwt) {
            headers["Authorization"] = `Bearer ${jwt}`;
        }

        const options = {
            method: method,
            headers: headers,
        };

        if (payload) {
            options.body = JSON.stringify(payload);
        }

        try {
            console.log(`Fetch URL : ${this.baseURL + url}`)
            const response = await fetch(this.baseURL + url, options);
            return await response.json()
        } catch (err) {
            console.error(`Failed to perform ${method} request to ${url}`, err);
            let error = new Error()
            error.message = `Failed to perform ${method} request to ${url}`
            error.status = false
            error.code = 500
            throw error;
        }
    }

    async httpGet(url, jwt = null) {
        return this.httpRequest("GET", url, null, jwt);
    }

    async httpPost(url, payload, jwt = null) {
        return this.httpRequest("POST", url, payload, jwt);
    }

    async login(username, password) {
        const url = "/auth/token";
        return this.httpPost(url, { username, password });
    }
}
