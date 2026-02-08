// Bird Log — ASCII Bird Interface Controller
// Wires together: BirdCore (state/WS), BirdArt (rendering), BIRD_PRESETS (sound), musicEngine

(function () {
    const STATES = BirdCore.STATES;

    // ─── State ──────────────────────────────
    let state = STATES.IDLE;
    let data = null;
    let ws = new BirdCore.WebSocketManager();
    let labelTimeout = null;
    let wakeLock = null;

    // ─── iOS audio session fix ─────────────
    // A looping silent <audio> element forces iOS into "media playback" mode:
    //  - Routes Web Audio to the main speaker (not earpiece)
    //  - Keeps the audio session alive when the screen locks
    const silentAudio = (() => {
        const rate = 8000, seconds = 0.5;
        const numSamples = rate * seconds;
        const buf = new ArrayBuffer(44 + numSamples);
        const v = new DataView(buf);
        const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
        w(0,'RIFF'); v.setUint32(4, 36 + numSamples, true); w(8,'WAVE');
        w(12,'fmt '); v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,1,true);
        v.setUint32(24,rate,true); v.setUint32(28,rate,true); v.setUint16(32,1,true); v.setUint16(34,8,true);
        w(36,'data'); v.setUint32(40, numSamples, true);
        for (let i = 44; i < 44 + numSamples; i++) v.setUint8(i, 128); // 8-bit silence
        const audio = new Audio(URL.createObjectURL(new Blob([buf], { type: 'audio/wav' })));
        audio.loop = true;
        return audio;
    })();

    async function acquireWakeLock() {
        try {
            if (navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen');
        } catch (_) { /* unsupported or denied */ }
    }

    function releaseWakeLock() {
        if (wakeLock) { wakeLock.release(); wakeLock = null; }
    }

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
                // Activate iOS audio session (speaker routing + background playback)
                silentAudio.play().catch(() => {});
                await Tone.start();
                await acquireWakeLock();
                setState(STATES.PLAYING);
                musicEngine.play(data, (progress, elapsed) => {
                    showProgress(Math.round(progress * 100));
                    const min = Math.floor(elapsed / 60);
                    const sec = Math.floor(elapsed % 60);
                    setStatus(`playing ${min}:${sec.toString().padStart(2, '0')} ~ tap nest to stop`);
                }, () => {
                    silentAudio.pause();
                    releaseWakeLock();
                    setState(STATES.FINISHED);
                });
                break;

            case STATES.PLAYING:
                musicEngine.stop();
                silentAudio.pause();
                releaseWakeLock();
                setState(STATES.READY);
                break;
        }
    }

    // ─── Time-of-day sky ────────────────────
    // [hour, r, g, b] — real sky colors
    const SKY_STOPS = [
        [ 0,  10,  10,  35],   // midnight — deep navy
        [ 5,  26,  26,  61],   // pre-dawn — dark blue
        [ 6, 212, 130,  90],   // dawn — orange-pink
        [ 7, 155, 195, 220],   // early morning — pale blue
        [10, 135, 195, 235],   // morning — sky blue
        [12, 145, 210, 245],   // noon — bright sky
        [16, 135, 195, 230],   // afternoon — sky blue
        [18, 220, 140,  70],   // sunset — golden orange
        [19, 180,  70,  50],   // deep sunset — red-orange
        [20,  60,  40,  90],   // dusk — purple
        [22,  15,  15,  45],   // night — dark navy
        [24,  10,  10,  35],   // midnight wrap
    ];

    function lerpStops(stops, t) {
        let lo = stops[0], hi = stops[1];
        for (let i = 1; i < stops.length; i++) {
            if (t < stops[i][0]) { hi = stops[i]; break; }
            lo = stops[i];
        }
        const span = hi[0] - lo[0];
        const f = span > 0 ? (t - lo[0]) / span : 0;
        return [
            Math.round(lo[1] + (hi[1] - lo[1]) * f),
            Math.round(lo[2] + (hi[2] - lo[2]) * f),
            Math.round(lo[3] + (hi[3] - lo[3]) * f),
        ];
    }

    function updateSkyColor() {
        const now = new Date();
        const t = now.getHours() + now.getMinutes() / 60;
        const [r, g, b] = lerpStops(SKY_STOPS, t);

        // Background
        const bg = `rgb(${r},${g},${b})`;
        document.documentElement.style.setProperty('--bg', bg);
        document.querySelector('meta[name="theme-color"]').content = bg;

        // Perceived luminance (0–1)
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        // Adapt text and UI to background brightness
        if (lum > 0.45) {
            document.documentElement.style.setProperty('--fg', '#1a1a1a');
            document.documentElement.style.setProperty('--dim', '#555');
            document.documentElement.style.setProperty('--bar-bg', 'rgba(255,255,255,0.75)');
        } else {
            document.documentElement.style.setProperty('--fg', '#c8c8c0');
            document.documentElement.style.setProperty('--dim', '#555550');
            document.documentElement.style.setProperty('--bar-bg', 'rgba(10,10,10,0.95)');
        }
    }

    updateSkyColor();
    setInterval(updateSkyColor, 60000);

    // ─── Init ───────────────────────────────
    setState(STATES.IDLE);

})();
