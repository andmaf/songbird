// Bird Log Web App - Main Application Logic

const AppState = {
    IDLE: 'idle',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    RECEIVING: 'receiving',
    READY: 'ready',
    PLAYING: 'playing',
    FINISHED: 'finished'
};

class BirdLogApp {
    constructor() {
        this.state = AppState.IDLE;
        this.socket = null;
        this.data = null;
        this.isDemo = false;

        this.initElements();
        this.bindEvents();
    }

    initElements() {
        // Panels
        this.connectionPanel = document.getElementById('connection-panel');
        this.statusPanel = document.getElementById('status-panel');
        this.playbackPanel = document.getElementById('playback-panel');
        this.summaryPanel = document.getElementById('summary-panel');

        // Connection elements
        this.ipInput = document.getElementById('arduino-ip');
        this.connectBtn = document.getElementById('connect-btn');
        this.demoBtn = document.getElementById('demo-btn');

        // Status elements
        this.statusDot = document.querySelector('.status-dot');
        this.statusText = document.getElementById('status-text');
        this.progressContainer = document.getElementById('progress-container');
        this.progressFill = document.getElementById('progress-fill');
        this.progressText = document.getElementById('progress-text');

        // Playback elements
        this.playBtn = document.getElementById('play-btn');
        this.playbackProgress = document.getElementById('playback-progress');
        this.playbackFill = document.getElementById('playback-fill');
        this.playbackTime = document.getElementById('playback-time');

        // Summary elements
        this.statSteps = document.getElementById('stat-steps');
        this.statActive = document.getElementById('stat-active');
        this.statFidget = document.getElementById('stat-fidget');

        // Sound control elements
        this.soundControlsPanel = document.getElementById('sound-controls-panel');
        this.masterVolumeSlider = document.getElementById('master-volume');
        this.masterVolumeValue = document.getElementById('master-volume-value');
        this.padVolumeSlider = document.getElementById('pad-volume');
        this.padVolumeValue = document.getElementById('pad-volume-value');
        this.pluckVolumeSlider = document.getElementById('pluck-volume');
        this.pluckVolumeValue = document.getElementById('pluck-volume-value');
        this.percVolumeSlider = document.getElementById('perc-volume');
        this.percVolumeValue = document.getElementById('perc-volume-value');
        this.reverbWetSlider = document.getElementById('reverb-wet');
        this.reverbWetValue = document.getElementById('reverb-wet-value');
        this.padMuteBtn = document.getElementById('pad-mute');
        this.pluckMuteBtn = document.getElementById('pluck-mute');
        this.percMuteBtn = document.getElementById('perc-mute');

        // Envelope control elements
        this.padAttackSlider = document.getElementById('pad-attack');
        this.padAttackValue = document.getElementById('pad-attack-value');
        this.padReleaseSlider = document.getElementById('pad-release');
        this.padReleaseValue = document.getElementById('pad-release-value');
        this.pluckAttackSlider = document.getElementById('pluck-attack');
        this.pluckAttackValue = document.getElementById('pluck-attack-value');
        this.pluckDampeningSlider = document.getElementById('pluck-dampening');
        this.pluckDampeningValue = document.getElementById('pluck-dampening-value');
        this.percAttackSlider = document.getElementById('perc-attack');
        this.percAttackValue = document.getElementById('perc-attack-value');
        this.percDecaySlider = document.getElementById('perc-decay');
        this.percDecayValue = document.getElementById('perc-decay-value');
    }

    bindEvents() {
        this.connectBtn.addEventListener('click', () => this.connect());
        this.demoBtn.addEventListener('click', () => this.startDemo());
        this.playBtn.addEventListener('click', () => this.togglePlayback());

        this.ipInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.connect();
        });

        // Sound control events
        this.masterVolumeSlider.addEventListener('input', (e) => {
            const value = e.target.value / 100;
            musicEngine.setMasterVolume(value);
            this.masterVolumeValue.textContent = `${e.target.value}%`;
        });

        this.padVolumeSlider.addEventListener('input', (e) => {
            const value = e.target.value / 100;
            musicEngine.setPadVolume(value);
            this.padVolumeValue.textContent = `${e.target.value}%`;
        });

        this.pluckVolumeSlider.addEventListener('input', (e) => {
            const value = e.target.value / 100;
            musicEngine.setPluckVolume(value);
            this.pluckVolumeValue.textContent = `${e.target.value}%`;
        });

        this.percVolumeSlider.addEventListener('input', (e) => {
            const value = e.target.value / 100;
            musicEngine.setPercVolume(value);
            this.percVolumeValue.textContent = `${e.target.value}%`;
        });

        this.reverbWetSlider.addEventListener('input', (e) => {
            const value = e.target.value / 100;
            musicEngine.setReverbWet(value);
            this.reverbWetValue.textContent = `${e.target.value}%`;
        });

        this.padMuteBtn.addEventListener('click', () => {
            const muted = musicEngine.toggleMute('pad');
            this.padMuteBtn.classList.toggle('muted', muted);
        });

        this.pluckMuteBtn.addEventListener('click', () => {
            const muted = musicEngine.toggleMute('pluck');
            this.pluckMuteBtn.classList.toggle('muted', muted);
        });

        this.percMuteBtn.addEventListener('click', () => {
            const muted = musicEngine.toggleMute('perc');
            this.percMuteBtn.classList.toggle('muted', muted);
        });

        // Envelope control events
        this.padAttackSlider.addEventListener('input', (e) => {
            const value = e.target.value / 100; // 0.01 to 4 seconds
            musicEngine.setPadAttack(value);
            this.padAttackValue.textContent = `${value.toFixed(1)}s`;
        });

        this.padReleaseSlider.addEventListener('input', (e) => {
            const value = e.target.value / 100; // 0.1 to 8 seconds
            musicEngine.setPadRelease(value);
            this.padReleaseValue.textContent = `${value.toFixed(1)}s`;
        });

        this.pluckAttackSlider.addEventListener('input', (e) => {
            const value = e.target.value / 100; // 0 to 2
            musicEngine.setPluckAttackNoise(value);
            this.pluckAttackValue.textContent = value.toFixed(2);
        });

        this.pluckDampeningSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value); // 100 to 8000 Hz
            musicEngine.setPluckDampening(value);
            this.pluckDampeningValue.textContent = value;
        });

        this.percAttackSlider.addEventListener('input', (e) => {
            const value = e.target.value / 1000; // 0.001 to 0.1 seconds
            musicEngine.setPercAttack(value);
            this.percAttackValue.textContent = `${value.toFixed(2)}s`;
        });

        this.percDecaySlider.addEventListener('input', (e) => {
            const value = e.target.value / 100; // 0.1 to 3 seconds
            musicEngine.setPercDecay(value);
            this.percDecayValue.textContent = `${value.toFixed(1)}s`;
        });
    }

    setState(newState) {
        this.state = newState;
        this.updateUI();
    }

    updateUI() {
        // Reset all panels
        this.statusPanel.classList.add('hidden');
        this.playbackPanel.classList.add('hidden');
        this.summaryPanel.classList.add('hidden');
        this.soundControlsPanel.classList.add('hidden');
        this.progressContainer.classList.add('hidden');

        switch (this.state) {
            case AppState.IDLE:
                this.connectionPanel.classList.remove('hidden');
                break;

            case AppState.CONNECTING:
                this.connectionPanel.classList.add('hidden');
                this.showPanel(this.statusPanel);
                this.statusDot.className = 'status-dot connecting';
                this.statusText.textContent = 'Connecting...';
                break;

            case AppState.CONNECTED:
                this.statusPanel.classList.remove('hidden');
                this.statusDot.className = 'status-dot connected';
                this.statusText.textContent = 'Connected - Waiting for data';
                break;

            case AppState.RECEIVING:
                this.statusPanel.classList.remove('hidden');
                this.progressContainer.classList.remove('hidden');
                this.statusDot.className = 'status-dot connected';
                this.statusText.textContent = 'Receiving data...';
                break;

            case AppState.READY:
                this.connectionPanel.classList.add('hidden');
                this.showPanel(this.playbackPanel);
                this.showPanel(this.soundControlsPanel);
                this.showPanel(this.summaryPanel);
                this.updateSummary();
                break;

            case AppState.PLAYING:
                this.playbackPanel.classList.remove('hidden');
                this.soundControlsPanel.classList.remove('hidden');
                this.summaryPanel.classList.remove('hidden');
                this.playbackProgress.classList.remove('hidden');
                this.playBtn.classList.add('playing');
                break;

            case AppState.FINISHED:
                this.playbackPanel.classList.remove('hidden');
                this.soundControlsPanel.classList.remove('hidden');
                this.summaryPanel.classList.remove('hidden');
                this.playbackProgress.classList.remove('hidden');
                this.playBtn.classList.remove('playing');
                break;
        }
    }

    showPanel(panel) {
        panel.classList.remove('hidden');
        panel.classList.add('fade-in');
    }

    connect() {
        const ip = this.ipInput.value.trim();
        if (!ip) {
            this.ipInput.focus();
            return;
        }

        this.setState(AppState.CONNECTING);

        try {
            this.socket = new WebSocket(`ws://${ip}:81`);

            this.socket.onopen = () => {
                this.setState(AppState.CONNECTED);
                this.socket.send(JSON.stringify({ command: 'get_status' }));
            };

            this.socket.onmessage = (event) => {
                this.handleMessage(JSON.parse(event.data));
            };

            this.socket.onerror = () => {
                this.showError('Connection failed');
            };

            this.socket.onclose = () => {
                if (this.state === AppState.CONNECTING) {
                    this.showError('Could not connect');
                }
            };

        } catch (err) {
            this.showError('Invalid address');
        }
    }

    handleMessage(msg) {
        if (msg.status === 'docked') {
            this.setState(AppState.CONNECTED);
        } else if (msg.status === 'transferring') {
            this.setState(AppState.RECEIVING);
            this.updateProgress(msg.progress);
        } else if (msg.data) {
            this.data = msg.data;
            this.setState(AppState.READY);
        }
    }

    updateProgress(percent) {
        this.progressFill.style.width = `${percent}%`;
        this.progressText.textContent = `${percent}%`;
    }

    showError(message) {
        this.statusPanel.classList.remove('hidden');
        this.statusDot.className = 'status-dot error';
        this.statusText.textContent = message;

        setTimeout(() => {
            this.setState(AppState.IDLE);
        }, 2000);
    }

    startDemo() {
        this.isDemo = true;
        this.data = generateDemoData();
        this.setState(AppState.READY);
    }

    updateSummary() {
        if (!this.data || !this.data.summary) return;

        const summary = this.data.summary;
        this.statSteps.textContent = summary.total_steps.toLocaleString();
        this.statActive.textContent = summary.active_minutes;
        this.statFidget.textContent = summary.fidget_events;
    }

    async togglePlayback() {
        if (this.state === AppState.PLAYING) {
            musicEngine.stop();
            this.setState(AppState.READY);
            this.playbackProgress.classList.add('hidden');
        } else {
            // Tone.js requires user interaction to start
            await Tone.start();

            this.setState(AppState.PLAYING);
            musicEngine.play(this.data, (progress, elapsed) => {
                this.updatePlaybackProgress(progress, elapsed);
            }, () => {
                this.setState(AppState.FINISHED);
            });
        }
    }

    updatePlaybackProgress(progress, elapsed) {
        this.playbackFill.style.width = `${progress * 100}%`;

        const minutes = Math.floor(elapsed / 60);
        const seconds = Math.floor(elapsed % 60);
        this.playbackTime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new BirdLogApp();
});
