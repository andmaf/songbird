// Bird Log - Core Logic (extracted from app.js for reuse)
// Provides: BirdCore.STATES, BirdCore.debounce, BirdCore.processRawData, BirdCore.WebSocketManager

const BirdCore = (() => {

    // Debounce utility
    function debounce(fn, delay = 500) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    // Application states
    const STATES = {
        IDLE: 'idle',
        CONNECTING: 'connecting',
        CONNECTED: 'connected',
        RECEIVING: 'receiving',
        READY: 'ready',
        PLAYING: 'playing',
        FINISHED: 'finished'
    };

    // Convert raw IMU samples to music engine format
    function processRawData(samples) {
        const sampleRate = 20; // 20Hz
        const samplesPerSegment = sampleRate * 3; // 3-second segments

        const minutes = [];
        let totalSteps = 0;
        let totalFidgets = 0;

        for (let i = 0; i < samples.length; i += samplesPerSegment) {
            const segment = samples.slice(i, i + samplesPerSegment);

            let sumAcc = 0;
            let maxAcc = 0;
            let sumRot = 0;
            let steps = 0;
            let fidgets = 0;

            segment.forEach(sample => {
                const [ax, ay, az, gx, gy, gz] = sample;
                const accelMag = Math.sqrt(ax * ax + ay * ay + az * az);
                sumAcc += accelMag;
                maxAcc = Math.max(maxAcc, accelMag);
                const gyroMag = Math.sqrt(gx * gx + gy * gy + gz * gz);
                sumRot += gyroMag;
                if (Math.abs(accelMag - 1) > 0.3) steps++;
                if (gyroMag > 1) fidgets++;
            });

            const avgAcc = segment.length > 0 ? sumAcc / segment.length : 1;
            const avgRot = segment.length > 0 ? sumRot / segment.length : 0;

            minutes.push({
                avg_acc: avgAcc,
                max_acc: maxAcc,
                steps: Math.round(steps / 4),
                fidget_events: fidgets,
                avg_rot: avgRot
            });

            totalSteps += Math.round(steps / 4);
            totalFidgets += fidgets;
        }

        if (minutes.length === 0) {
            minutes.push({
                avg_acc: 1, max_acc: 1, steps: 0,
                fidget_events: 0, avg_rot: 0
            });
        }

        const totalSeconds = samples.length / sampleRate;

        return {
            minutes,
            summary: {
                total_steps: totalSteps,
                active_minutes: Math.round(totalSeconds / 60),
                fidget_events: totalFidgets
            },
            metadata: {
                sampleCount: samples.length,
                sampleRate,
                durationSeconds: totalSeconds,
                segmentCount: minutes.length
            }
        };
    }

    // WebSocket manager
    class WebSocketManager {
        constructor() {
            this.socket = null;
            this.onStateChange = null;
            this.onData = null;
            this.onProgress = null;
            this.onError = null;

            this.expectedSamples = 0;
            this.receivedSamples = [];
        }

        connect(ip) {
            try {
                this.socket = new WebSocket(`ws://${ip}:81`);

                this.socket.onopen = () => {
                    if (this.onStateChange) this.onStateChange(STATES.CONNECTED);
                    this.socket.send(JSON.stringify({ command: 'get_status' }));
                };

                this.socket.onmessage = (event) => {
                    this.handleMessage(JSON.parse(event.data));
                };

                this.socket.onerror = () => {
                    if (this.onError) this.onError('Connection failed');
                };

                this.socket.onclose = () => {
                    // Only report error if we were still trying to connect
                };
            } catch (err) {
                if (this.onError) this.onError('Invalid address');
            }
        }

        handleMessage(msg) {
            switch (msg.type) {
                case 'connected':
                    if (this.onStateChange) this.onStateChange(STATES.CONNECTED);
                    break;

                case 'dump_start':
                    this.expectedSamples = msg.samples;
                    this.receivedSamples = [];
                    if (this.onStateChange) this.onStateChange(STATES.RECEIVING);
                    if (this.onProgress) this.onProgress(0);
                    break;

                case 'data_chunk':
                    if (msg.samples && Array.isArray(msg.samples)) {
                        this.receivedSamples.push(...msg.samples);
                        const progress = Math.round(
                            (this.receivedSamples.length / this.expectedSamples) * 100
                        );
                        if (this.onProgress) this.onProgress(progress);
                    }
                    break;

                case 'dump_end':
                    if (this.onData) {
                        this.onData(processRawData(this.receivedSamples));
                    }
                    break;

                case 'erasing':
                case 'erase_done':
                case 'bird':
                    break;
            }
        }

        send(msg) {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(typeof msg === 'string' ? msg : JSON.stringify(msg));
            }
        }

        disconnect() {
            if (this.socket) {
                this.socket.close();
                this.socket = null;
            }
        }
    }

    return { debounce, STATES, processRawData, WebSocketManager };
})();
