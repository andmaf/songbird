// Bird Log - Music Generation Engine using Tone.js

class MusicEngine {
    constructor() {
        this.isPlaying = false;
        this.startTime = 0;
        this.duration = 0;
        this.scheduledEvents = [];
        this.onProgress = null;
        this.onComplete = null;
        this.progressInterval = null;

        // Instruments (lazy init)
        this.padSynth = null;
        this.pluckSynth = null;
        this.membraneSynth = null;
        this.reverb = null;
        this.masterGain = null;

        // Volume state (0-1 range)
        this.volumes = {
            master: 0.8,
            pad: 0.7,
            pluck: 0.85,
            perc: 0.5
        };

        // Mute state
        this.muted = {
            pad: false,
            pluck: false,
            perc: false
        };

        // Base volumes in dB (from original config)
        this.baseVolumes = {
            pad: -12,
            pluck: -8,
            perc: -20
        };
    }

    initInstruments() {
        if (this.padSynth) return; // Already initialized

        // Master gain for overall volume control
        this.masterGain = new Tone.Gain(this.volumes.master).toDestination();

        // Main reverb for ambient feel
        this.reverb = new Tone.Reverb({
            decay: 4,
            wet: 0.6
        }).connect(this.masterGain);

        // Pad synth for ambient background
        this.padSynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'sine' },
            envelope: {
                attack: 2,
                decay: 1,
                sustain: 0.8,
                release: 4
            },
            volume: this.baseVolumes.pad
        }).connect(this.reverb);

        // Pluck synth for melodic notes
        this.pluckSynth = new Tone.PluckSynth({
            attackNoise: 0.5,
            dampening: 2000,
            resonance: 0.95,
            volume: this.baseVolumes.pluck
        }).connect(this.reverb);

        // Soft membrane for gentle percussion
        this.membraneSynth = new Tone.MembraneSynth({
            pitchDecay: 0.1,
            octaves: 2,
            envelope: {
                attack: 0.01,
                decay: 0.8,
                sustain: 0,
                release: 0.5
            },
            volume: this.baseVolumes.perc
        }).connect(this.reverb);

        // Apply initial volumes
        this.applyVolumes();
    }

    // Apply current volume settings to instruments
    applyVolumes() {
        if (!this.padSynth) return;

        // Calculate effective volumes (base + adjustment from slider)
        // Slider at 100% = base volume, 0% = -60dB (effectively silent)
        const padVol = this.muted.pad ? -60 : this.baseVolumes.pad + (this.volumes.pad - 0.7) * 20;
        const pluckVol = this.muted.pluck ? -60 : this.baseVolumes.pluck + (this.volumes.pluck - 0.85) * 20;
        const percVol = this.muted.perc ? -60 : this.baseVolumes.perc + (this.volumes.perc - 0.5) * 20;

        // Use rampTo for smooth volume changes to avoid clicks
        const rampTime = 0.05;
        this.padSynth.volume.rampTo(padVol, rampTime);
        this.pluckSynth.volume.rampTo(pluckVol, rampTime);
        this.membraneSynth.volume.rampTo(percVol, rampTime);
    }

    // Volume control methods (value: 0-1)
    setMasterVolume(value) {
        this.volumes.master = value;
        if (this.masterGain) {
            this.masterGain.gain.rampTo(value, 0.05);
        }
    }

    setPadVolume(value) {
        this.volumes.pad = value;
        this.applyVolumes();
    }

    setPluckVolume(value) {
        this.volumes.pluck = value;
        this.applyVolumes();
    }

    setPercVolume(value) {
        this.volumes.perc = value;
        this.applyVolumes();
    }

    setReverbWet(value) {
        if (this.reverb) {
            this.reverb.wet.rampTo(value, 0.05);
        }
    }

    // Mute control methods
    toggleMute(instrument) {
        this.muted[instrument] = !this.muted[instrument];
        this.applyVolumes();
        return this.muted[instrument];
    }

    setMute(instrument, muted) {
        this.muted[instrument] = muted;
        this.applyVolumes();
    }

    // Envelope control methods
    // Note: These affect future notes, not currently playing ones
    setPadAttack(value) {
        if (this.padSynth) {
            this.padSynth.set({ envelope: { attack: Math.max(0.01, value) } });
        }
    }

    setPadRelease(value) {
        if (this.padSynth) {
            this.padSynth.set({ envelope: { release: Math.max(0.1, value) } });
        }
    }

    setPluckAttackNoise(value) {
        if (this.pluckSynth) {
            this.pluckSynth.attackNoise = Math.max(0.01, value);
        }
    }

    setPluckDampening(value) {
        if (this.pluckSynth) {
            this.pluckSynth.dampening = Math.max(100, value);
        }
    }

    setPercAttack(value) {
        if (this.membraneSynth) {
            this.membraneSynth.envelope.attack = Math.max(0.001, value);
        }
    }

    setPercDecay(value) {
        if (this.membraneSynth) {
            this.membraneSynth.envelope.decay = Math.max(0.05, value);
        }
    }

    // Musical scales (pentatonic for calm, harmonious sound)
    scales = {
        major: ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5'],
        minor: ['A3', 'C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5'],
        ambient: ['C3', 'G3', 'C4', 'E4', 'G4', 'B4', 'C5', 'E5']
    };

    // Map IMU data to musical parameters
    mapDataToMusic(minute) {
        const avgAcc = minute.avg_acc || 1.0;
        const maxAcc = minute.max_acc || 1.0;
        const steps = minute.steps || 0;
        const fidgets = minute.fidget_events || 0;
        const rotation = minute.avg_rot || 0;

        return {
            // Tempo: 60-100 BPM based on average acceleration
            tempo: Math.min(100, Math.max(60, 60 + (avgAcc - 1) * 40)),

            // Volume: -24dB to -6dB based on max acceleration
            volume: Math.min(-6, Math.max(-24, -24 + (maxAcc - 1) * 9)),

            // Note density: 1-4 notes per phrase based on steps
            density: Math.min(4, Math.max(1, Math.floor(steps / 15) + 1)),

            // Ornament chance: 0-50% based on fidgets
            ornamentChance: Math.min(0.5, fidgets * 0.1),

            // Pitch tendency: -1 to 1 (down to up) based on rotation
            pitchTendency: Math.tanh(rotation * 2),

            // Stillness: inverse of activity
            stillness: avgAcc < 1.05 && steps < 5
        };
    }

    // Generate music from data
    play(data, onProgress, onComplete) {
        this.initInstruments();

        if (!data || !data.minutes || data.minutes.length === 0) {
            console.error('No data to play');
            return;
        }

        this.onProgress = onProgress;
        this.onComplete = onComplete;
        this.isPlaying = true;

        // Each minute of data = ~1.5 seconds of music for reasonable playback
        // Adjust based on total minutes to keep total duration 2-5 minutes
        const totalMinutes = data.minutes.length;
        const secondsPerMinute = Math.max(0.5, Math.min(2, 180 / totalMinutes));
        this.duration = totalMinutes * secondsPerMinute;

        Tone.Transport.bpm.value = 75;

        // Schedule all musical events
        this.scheduleMusic(data.minutes, secondsPerMinute);

        // Track progress
        this.startTime = Tone.now();
        this.progressInterval = setInterval(() => {
            if (!this.isPlaying) return;

            const elapsed = Tone.now() - this.startTime;
            const progress = Math.min(1, elapsed / this.duration);

            if (this.onProgress) {
                this.onProgress(progress, elapsed);
            }

            if (progress >= 1) {
                this.stop();
                if (this.onComplete) {
                    this.onComplete();
                }
            }
        }, 100);

        Tone.Transport.start();
    }

    scheduleMusic(minutes, secondsPerMinute) {
        const scale = this.scales.ambient;
        let currentTime = 0;
        let lastPadNote = null;

        minutes.forEach((minute, index) => {
            const params = this.mapDataToMusic(minute);
            const sectionStart = index * secondsPerMinute;

            // Pad chords (every 4-8 minutes of data)
            if (index % Math.floor(4 + Math.random() * 4) === 0 || index === 0) {
                const padNotes = this.selectChord(scale, params.pitchTendency, lastPadNote);
                lastPadNote = padNotes[0];

                // Calculate velocity (0.1 to 0.5 range based on activity)
                const padVelocity = Math.max(0.1, Math.min(0.5, 0.2 + (params.volume + 24) / 60));

                const padEvent = Tone.Transport.schedule((time) => {
                    this.padSynth.triggerAttackRelease(
                        padNotes,
                        secondsPerMinute * 6,
                        time,
                        padVelocity
                    );
                }, sectionStart);
                this.scheduledEvents.push(padEvent);
            }

            // Melodic notes based on density
            if (!params.stillness) {
                for (let i = 0; i < params.density; i++) {
                    const noteTime = sectionStart + (i / params.density) * secondsPerMinute;
                    const note = this.selectNote(scale, params.pitchTendency);

                    const pluckEvent = Tone.Transport.schedule((time) => {
                        this.pluckSynth.triggerAttack(note, time);
                    }, noteTime);
                    this.scheduledEvents.push(pluckEvent);

                    // Ornaments on fidgets
                    if (Math.random() < params.ornamentChance) {
                        const ornamentNote = this.selectNote(scale, params.pitchTendency);
                        const ornamentEvent = Tone.Transport.schedule((time) => {
                            this.pluckSynth.triggerAttack(ornamentNote, time);
                        }, noteTime + 0.1);
                        this.scheduledEvents.push(ornamentEvent);
                    }
                }
            }

            // Soft percussion on high activity
            if (params.density >= 3 && Math.random() < 0.3) {
                const percEvent = Tone.Transport.schedule((time) => {
                    this.membraneSynth.triggerAttackRelease('C2', '8n', time, 0.3);
                }, sectionStart + secondsPerMinute * 0.5);
                this.scheduledEvents.push(percEvent);
            }
        });
    }

    selectChord(scale, tendency, lastNote) {
        // Build a simple triad or dyad
        const baseIndex = Math.floor((tendency + 1) / 2 * (scale.length - 3));
        const notes = [scale[baseIndex], scale[baseIndex + 2]];

        // Sometimes add a third note
        if (Math.random() > 0.5) {
            notes.push(scale[baseIndex + 4] || scale[baseIndex + 1]);
        }

        return notes;
    }

    selectNote(scale, tendency) {
        // Bias note selection based on pitch tendency
        const biasedIndex = Math.floor(
            ((tendency + 1) / 2 * 0.6 + Math.random() * 0.4) * scale.length
        );
        return scale[Math.min(biasedIndex, scale.length - 1)];
    }

    stop() {
        this.isPlaying = false;

        // Clear progress tracking
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }

        // Clear all scheduled events
        this.scheduledEvents.forEach(id => {
            Tone.Transport.clear(id);
        });
        this.scheduledEvents = [];

        // Stop transport
        Tone.Transport.stop();
        Tone.Transport.position = 0;

        // Release all synths
        if (this.padSynth) this.padSynth.releaseAll();
    }

    dispose() {
        this.stop();

        if (this.padSynth) {
            this.padSynth.dispose();
            this.pluckSynth.dispose();
            this.membraneSynth.dispose();
            this.reverb.dispose();
            this.masterGain.dispose();

            this.padSynth = null;
            this.pluckSynth = null;
            this.membraneSynth = null;
            this.reverb = null;
            this.masterGain = null;
        }
    }
}

// Global instance
const musicEngine = new MusicEngine();
