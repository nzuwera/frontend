export class Countdown {
    constructor(startTime, expiryDateTime) {
        this.startTime = new Date(startTime.replace(" ", "T") + "Z").getTime();
        this.expiryDateTime = new Date(expiryDateTime.replace(" ", "T") + "Z").getTime();
        this.remainingTime = this.expiryDateTime - this.startTime;
        this.timer = null;
    }

    start(callback) {
        if (this.timer) return; // Prevent multiple timers

        this.timer = setInterval(() => {
            this.remainingTime -= 1000;

            if (this.remainingTime <= 0) {
                this.stop();
                callback(0); // Countdown reached zero
            } else {
                callback(this.formatTime(this.remainingTime));
            }
        }, 1000);
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    reset() {
        this.remainingTime = this.expiryDateTime - this.startTime;
    }

    formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        let response = {
            hr: `${hours.toString().padStart(2, '0')}`,
            min: `${minutes.toString().padStart(2, '0')}`,
            sec: `${seconds.toString().padStart(2, '0')}`
        }
        return response;
    }
}
