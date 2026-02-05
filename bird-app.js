// Bird Log — ASCII Bird Interface Controller
// Wires together: BirdCore (state/WS), BirdArt (rendering), BIRD_PRESETS (sound), musicEngine

(function () {
    const STATES = BirdCore.STATES;

    // ─── State ──────────────────────────────
    let state = STATES.IDLE;
    let data = null;
    let ws = new BirdCore.WebSocketManager();
    let labelTimeout = null;

    // ─── DOM refs ───────────────────────────
    const canvas     = document.getElementById('bird-canvas');
    const statusLine = document.getElementById('status-line');
    const progressBar  = document.getElementById('progress-bar');
    const progressFill = document.getElementById('progress-fill');
    const partLabel    = document.getElementById('part-label');
    const ipInput    = document.getElementById('arduino-ip');
    const connectBtn = document.getElementById('connect-btn');
    const demoBtn    = document.getElementById('demo-btn');

    // ─── Rendering helpers ──────────────────
    function isDocked() {
        return state === STATES.READY || state === STATES.PLAYING || state === STATES.FINISHED;
    }

    function redraw() {
        canvas.innerHTML = BirdArt.render(isDocked());
    }

    function setStatus(text) {
        statusLine.textContent = text;
    }

    function showProgress(percent) {
        progressBar.classList.add('visible');
        progressFill.style.width = percent + '%';
    }

    function hideProgress() {
        progressBar.classList.remove('visible');
        progressFill.style.width = '0%';
    }

    function showPartLabel(part) {
        const label = BirdArt.getPartLabel(part);
        partLabel.textContent = part + ': ' + label;
        partLabel.classList.add('visible');
        clearTimeout(labelTimeout);
        labelTimeout = setTimeout(() => partLabel.classList.remove('visible'), 1500);
    }

    // ─── State machine ──────────────────────
    function setState(newState) {
        state = newState;

        // CSS state classes on body
        document.body.className = state;

        switch (state) {
            case STATES.IDLE:
                setStatus('tap connect or demo');
                hideProgress();
                redraw();
                break;

            case STATES.CONNECTING:
                setStatus('connecting...');
                hideProgress();
                redraw();
                break;

            case STATES.CONNECTED:
                setStatus('connected - waiting for bird');
                hideProgress();
                redraw();
                break;

            case STATES.RECEIVING:
                setStatus('receiving data...');
                redraw();
                break;

            case STATES.READY:
                setStatus('tap nest to play ~ tap bird to shape voice');
                hideProgress();
                redraw();
                break;

            case STATES.PLAYING:
                setStatus('playing ~ tap nest to stop');
                hideProgress();
                redraw();
                break;

            case STATES.FINISHED:
                setStatus('finished ~ tap nest to replay');
                hideProgress();
                redraw();
                break;
        }
    }

    // ─── WebSocket callbacks ────────────────
    ws.onStateChange = (newState) => setState(newState);
    ws.onProgress = (percent) => showProgress(percent);
    ws.onData = (processedData) => {
        data = processedData;
        setState(STATES.READY);
    };
    ws.onError = (msg) => {
        setStatus(msg);
        setTimeout(() => setState(STATES.IDLE), 2000);
    };

    // ─── Connection UI ──────────────────────
    connectBtn.addEventListener('click', () => {
        const ip = ipInput.value.trim();
        if (!ip) { ipInput.focus(); return; }
        setState(STATES.CONNECTING);
        ws.connect(ip);
    });

    ipInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') connectBtn.click();
    });

    demoBtn.addEventListener('click', () => {
        data = generateDemoData();
        setState(STATES.READY);
    });

    // ─── Bird part & nest tap handling ──────
    canvas.addEventListener('click', (e) => {
        const el = e.target.closest('.bird-part');
        const nestEl = e.target.closest('.nest-part');

        if (el) {
            handlePartTap(el.dataset.part);
            return;
        }

        if (nestEl) {
            handleNestTap();
            return;
        }
    });

    function handlePartTap(part) {
        if (state !== STATES.READY && state !== STATES.PLAYING) return;

        const newIndex = BirdArt.cyclePart(part);
        if (newIndex < 0) return;

        // Apply sound preset
        applyBirdPreset(part, newIndex);

        // Re-render and flash
        redraw();
        showPartLabel(part);

        // Add flash class to the newly rendered part spans
        const spans = canvas.querySelectorAll(`.bird-part[data-part="${part}"]`);
        spans.forEach(s => {
            s.classList.add('flash');
            s.addEventListener('animationend', () => s.classList.remove('flash'), { once: true });
        });
    }

    async function handleNestTap() {
        switch (state) {
            case STATES.READY:
            case STATES.FINISHED:
                // Start playback
                await Tone.start();
                setState(STATES.PLAYING);
                musicEngine.play(data, (progress, elapsed) => {
                    // Update progress bar for playback
                    showProgress(Math.round(progress * 100));
                    const min = Math.floor(elapsed / 60);
                    const sec = Math.floor(elapsed % 60);
                    setStatus(`playing ${min}:${sec.toString().padStart(2, '0')} ~ tap nest to stop`);
                }, () => {
                    setState(STATES.FINISHED);
                });
                break;

            case STATES.PLAYING:
                // Stop playback
                musicEngine.stop();
                setState(STATES.READY);
                break;
        }
    }

    // ─── Init ───────────────────────────────
    setState(STATES.IDLE);

})();
