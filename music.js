// Bird Log - Music Generation Engine using Tone.js
// Architecture: 4 layers (Lead, Pad, Bass, Drums) with Reverb + Delay sends

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
        this.lead = null;       // MonoSynth - melodic voice
        this.pad = null;        // GrainPlayer - textural atmosphere
        this.bass = null;       // MonoSynth - low-end foundation
        this.drums = null;      // { kick, hat, click } - rhythmic elements

        // Effects
        this.reverb = null;
        this.delay = null;
        this.masterGain = null;

        // Grain buffer for pad
        this.grainBuffer = null;

        // Bird Voice Parameters
        this.birdVoice = this.getDefaultBirdVoice();

        // LFO state (free-running, independent of transport)
        this.lfoPhases = [Math.random() * Math.PI * 2, Math.random() * Math.PI * 2];
        this.lfoAnimFrame = null;
        this.onLfoUpdate = null; // callback(activeModulations) for UI visual feedback

        // Mute state
        this.muted = {
            lead: false,
            pad: false,
            bass: false,
            drums: false
        };
    }

    // Default bird voice configuration
    getDefaultBirdVoice() {
        return {
            name: "Default Bird",
            version: "1.0",

            master: {
                volume: 0.8
            },

            lead: {
                volume: 0.85,
                // FM Synth parameters for bird-like tones
                harmonicity: 2,          // Ratio of modulator to carrier frequency
                modulationIndex: 3,      // Amount of FM modulation (higher = richer harmonics)
                oscillatorType: "sine",  // Carrier wave
                modulationType: "triangle", // Modulator wave
                attack: 0.02,
                decay: 0.15,
                sustain: 0.3,
                release: 1.2,
                portamento: 0.05,        // Glide between notes
                reverbSend: 0.7,
                delaySend: 0.35
            },

            pad: {
                volume: 0.7,
                grainSize: 0.1,
                overlap: 0.05,
                playbackRate: 1.0,
                detune: 0,
                reverbSend: 0.8,
                delaySend: 0.2,
                // Source synth for grain generation
                sourceOscillator: "sine",
                sourceAttack: 0.5,
                sourceRelease: 1.0
            },

            bass: {
                volume: 0.6,
                oscillatorType: "triangle",
                filterFrequency: 800,
                attack: 0.1,
                decay: 0.3,
                sustain: 0.7,
                release: 0.8,
                reverbSend: 0.2,
                delaySend: 0.0
            },

            drums: {
                volume: 0.5,
                kick: {
                    pitchDecay: 0.05,
                    octaves: 4,
                    attack: 0.001,
                    decay: 0.4
                },
                hat: {
                    type: "white",  // white, pink, brown
                    attack: 0.001,
                    decay: 0.1
                },
                click: {
                    frequency: 800,
                    harmonicity: 5.1,
                    attack: 0.001,
                    decay: 0.05
                },
                reverbSend: 0.3,
                delaySend: 0.1
            },

            reverb: {
                decay: 4,
                wet: 0.6,
                preDelay: 0.1
            },

            delay: {
                delayTime: "8n",
                feedback: 0.3,
                wet: 0.4
            },

            musicality: {
                scale: "ambient",
                tempo: 75
            },

            lfos: [
                { rate: 0.07, depth: 0, target: 'none' },
                { rate: 0.13, depth: 0, target: 'none' }
            ]
        };
    }

    // Export a single voice as JSON
    exportVoice(voiceName) {
        const voiceData = {
            type: voiceName,
            version: "1.0",
            params: this.birdVoice[voiceName]
        };
        return JSON.stringify(voiceData, null, 2);
    }

    // Import a single voice from JSON
    importVoice(voiceName, jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            if (imported.type !== voiceName || !imported.params) {
                throw new Error(`Invalid ${voiceName} voice format`);
            }
            // Merge with defaults for this voice
            const defaults = this.getDefaultBirdVoice()[voiceName];
            this.birdVoice[voiceName] = this.deepMerge(defaults, imported.params);
            this.applyBirdVoice();
            return true;
        } catch (e) {
            console.error(`Failed to import ${voiceName} voice:`, e);
            return false;
        }
    }

    // Randomize a single voice within sensible ranges
    randomizeVoice(voiceName) {
        const rand = (min, max) => min + Math.random() * (max - min);
        const randInt = (min, max) => Math.floor(rand(min, max + 1));
        const randChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

        switch (voiceName) {
            case 'lead':
                this.birdVoice.lead = {
                    volume: rand(0.6, 1.0),
                    harmonicity: rand(0.5, 4),
                    modulationIndex: rand(1, 8),
                    oscillatorType: randChoice(['sine', 'triangle', 'square', 'sawtooth']),
                    modulationType: randChoice(['sine', 'triangle', 'square', 'sawtooth']),
                    attack: rand(0.005, 0.1),
                    decay: rand(0.05, 0.4),
                    sustain: rand(0.1, 0.6),
                    release: rand(0.3, 2.0),
                    portamento: rand(0, 0.15),
                    reverbSend: rand(0.3, 0.9),
                    delaySend: rand(0.1, 0.5)
                };
                break;

            case 'pad':
                this.birdVoice.pad = {
                    volume: rand(0.4, 0.9),
                    grainSize: rand(0.05, 0.3),
                    overlap: rand(0.02, 0.15),
                    playbackRate: rand(0.5, 1.5),
                    detune: randInt(-600, 600),
                    reverbSend: rand(0.5, 1.0),
                    delaySend: rand(0.1, 0.4),
                    sourceOscillator: randChoice(['sine', 'triangle', 'square', 'sawtooth']),
                    sourceAttack: rand(0.2, 1.0),
                    sourceRelease: rand(0.5, 2.0)
                };
                break;

            case 'bass':
                this.birdVoice.bass = {
                    volume: rand(0.4, 0.8),
                    oscillatorType: randChoice(['sine', 'triangle', 'square', 'sawtooth']),
                    filterFrequency: randInt(200, 1200),
                    attack: rand(0.02, 0.2),
                    decay: rand(0.1, 0.5),
                    sustain: rand(0.3, 0.8),
                    release: rand(0.3, 1.5),
                    reverbSend: rand(0.1, 0.4),
                    delaySend: rand(0, 0.2)
                };
                break;

            case 'drums':
                this.birdVoice.drums = {
                    volume: rand(0.3, 0.7),
                    kick: {
                        pitchDecay: rand(0.02, 0.15),
                        octaves: randInt(2, 6),
                        attack: 0.001,
                        decay: rand(0.2, 0.6)
                    },
                    hat: {
                        type: randChoice(['white', 'pink', 'brown']),
                        attack: 0.001,
                        decay: rand(0.03, 0.2)
                    },
                    click: {
                        frequency: randInt(400, 1200),
                        harmonicity: rand(3, 8),
                        attack: 0.001,
                        decay: rand(0.02, 0.1)
                    },
                    reverbSend: rand(0.1, 0.5),
                    delaySend: rand(0, 0.3)
                };
                break;
        }

        this.applyBirdVoice();
    }

    deepMerge(target, source) {
        const result = { ...target };
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(target[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        return result;
    }

    // Apply all bird voice settings to instruments
    applyBirdVoice() {
        if (!this.lead) return;

        const v = this.birdVoice;

        // Master
        this.masterGain.gain.rampTo(v.master.volume, 0.05);

        // Lead (FMSynth)
        this.lead.synth.set({
            harmonicity: v.lead.harmonicity,
            modulationIndex: v.lead.modulationIndex,
            oscillator: { type: v.lead.oscillatorType },
            modulation: { type: v.lead.modulationType },
            envelope: {
                attack: v.lead.attack,
                decay: v.lead.decay,
                sustain: v.lead.sustain,
                release: v.lead.release
            },
            modulationEnvelope: {
                attack: v.lead.attack * 0.5,
                decay: v.lead.decay * 1.5,
                sustain: v.lead.sustain * 0.8,
                release: v.lead.release * 0.5
            },
            portamento: v.lead.portamento
        });
        this.lead.reverbGain.gain.rampTo(v.lead.reverbSend, 0.05);
        this.lead.delayGain.gain.rampTo(v.lead.delaySend, 0.05);

        // Pad (GrainPlayer) - settings applied when buffer is regenerated
        if (this.pad.player) {
            this.pad.player.grainSize = v.pad.grainSize;
            this.pad.player.overlap = v.pad.overlap;
            this.pad.player.playbackRate = v.pad.playbackRate;
            this.pad.player.detune = v.pad.detune;
        }
        this.pad.reverbGain.gain.rampTo(v.pad.reverbSend, 0.05);
        this.pad.delayGain.gain.rampTo(v.pad.delaySend, 0.05);

        // Bass (MonoSynth)
        this.bass.synth.set({
            oscillator: { type: v.bass.oscillatorType },
            filterEnvelope: { baseFrequency: v.bass.filterFrequency },
            envelope: {
                attack: v.bass.attack,
                decay: v.bass.decay,
                sustain: v.bass.sustain,
                release: v.bass.release
            }
        });
        this.bass.reverbGain.gain.rampTo(v.bass.reverbSend, 0.05);
        this.bass.delayGain.gain.rampTo(v.bass.delaySend, 0.05);

        // Drums
        this.drums.kick.pitchDecay = v.drums.kick.pitchDecay;
        this.drums.kick.octaves = v.drums.kick.octaves;
        this.drums.hat.set({ noise: { type: v.drums.hat.type } });
        this.drums.reverbGain.gain.rampTo(v.drums.reverbSend, 0.05);
        this.drums.delayGain.gain.rampTo(v.drums.delaySend, 0.05);

        // Reverb
        this.reverb.decay = v.reverb.decay;
        this.reverb.preDelay = v.reverb.preDelay;
        this.reverb.wet.rampTo(v.reverb.wet, 0.05);

        // Delay
        this.delay.delayTime.rampTo(v.delay.delayTime, 0.05);
        this.delay.feedback.rampTo(v.delay.feedback, 0.05);
        this.delay.wet.rampTo(v.delay.wet, 0.05);

        this.applyVolumes();
    }

    // Base volumes in dB
    get baseVolumes() {
        return {
            lead: -8,
            pad: -12,
            bass: -10,
            drums: -14
        };
    }

    async initInstruments() {
        if (this.lead) return; // Already initialized

        const v = this.birdVoice;

        // Master gain
        this.masterGain = new Tone.Gain(v.master.volume).toDestination();

        // Effect buses
        this.reverb = new Tone.Reverb({
            decay: v.reverb.decay,
            wet: v.reverb.wet,
            preDelay: v.reverb.preDelay
        }).connect(this.masterGain);

        this.delay = new Tone.FeedbackDelay({
            delayTime: v.delay.delayTime,
            feedback: v.delay.feedback,
            wet: v.delay.wet
        }).connect(this.masterGain);

        // Dry output (direct to master)
        const dryBus = this.masterGain;

        // ========== LEAD (FMSynth for bird-like tones) ==========
        this.lead = {
            synth: new Tone.FMSynth({
                harmonicity: v.lead.harmonicity,
                modulationIndex: v.lead.modulationIndex,
                oscillator: { type: v.lead.oscillatorType },
                modulation: { type: v.lead.modulationType },
                envelope: {
                    attack: v.lead.attack,
                    decay: v.lead.decay,
                    sustain: v.lead.sustain,
                    release: v.lead.release
                },
                modulationEnvelope: {
                    attack: v.lead.attack * 0.5,
                    decay: v.lead.decay * 1.5,
                    sustain: v.lead.sustain * 0.8,
                    release: v.lead.release * 0.5
                },
                portamento: v.lead.portamento,
                volume: this.baseVolumes.lead
            }),
            reverbGain: new Tone.Gain(v.lead.reverbSend),
            delayGain: new Tone.Gain(v.lead.delaySend),
            dryGain: new Tone.Gain(1)
        };
        this.lead.synth.connect(this.lead.dryGain);
        this.lead.synth.connect(this.lead.reverbGain);
        this.lead.synth.connect(this.lead.delayGain);
        this.lead.dryGain.connect(dryBus);
        this.lead.reverbGain.connect(this.reverb);
        this.lead.delayGain.connect(this.delay);

        // ========== PAD (GrainPlayer with generated buffer) ==========
        this.pad = {
            player: null, // Will be created when buffer is ready
            reverbGain: new Tone.Gain(v.pad.reverbSend),
            delayGain: new Tone.Gain(v.pad.delaySend),
            dryGain: new Tone.Gain(1),
            volume: new Tone.Gain(Tone.gainToDb(0.7))
        };
        this.pad.dryGain.connect(dryBus);
        this.pad.reverbGain.connect(this.reverb);
        this.pad.delayGain.connect(this.delay);

        // Generate initial grain buffer
        await this.generatePadBuffer();

        // ========== BASS (MonoSynth) ==========
        this.bass = {
            synth: new Tone.MonoSynth({
                oscillator: { type: v.bass.oscillatorType },
                filter: { Q: 2, type: "lowpass" },
                filterEnvelope: {
                    baseFrequency: v.bass.filterFrequency,
                    octaves: 2,
                    attack: 0.1,
                    decay: 0.2,
                    sustain: 0.5,
                    release: 0.5
                },
                envelope: {
                    attack: v.bass.attack,
                    decay: v.bass.decay,
                    sustain: v.bass.sustain,
                    release: v.bass.release
                },
                volume: this.baseVolumes.bass
            }),
            reverbGain: new Tone.Gain(v.bass.reverbSend),
            delayGain: new Tone.Gain(v.bass.delaySend),
            dryGain: new Tone.Gain(1)
        };
        this.bass.synth.connect(this.bass.dryGain);
        this.bass.synth.connect(this.bass.reverbGain);
        this.bass.synth.connect(this.bass.delayGain);
        this.bass.dryGain.connect(dryBus);
        this.bass.reverbGain.connect(this.reverb);
        this.bass.delayGain.connect(this.delay);

        // ========== DRUMS (Kick, Hat, Click) ==========
        this.drums = {
            kick: new Tone.MembraneSynth({
                pitchDecay: v.drums.kick.pitchDecay,
                octaves: v.drums.kick.octaves,
                envelope: {
                    attack: v.drums.kick.attack,
                    decay: v.drums.kick.decay,
                    sustain: 0,
                    release: 0.1
                },
                volume: this.baseVolumes.drums
            }),
            hat: new Tone.NoiseSynth({
                noise: { type: v.drums.hat.type },
                envelope: {
                    attack: v.drums.hat.attack,
                    decay: v.drums.hat.decay,
                    sustain: 0,
                    release: 0.01
                },
                volume: this.baseVolumes.drums - 6
            }),
            click: new Tone.MetalSynth({
                frequency: v.drums.click.frequency,
                harmonicity: v.drums.click.harmonicity,
                envelope: {
                    attack: v.drums.click.attack,
                    decay: v.drums.click.decay
                },
                volume: this.baseVolumes.drums - 10
            }),
            reverbGain: new Tone.Gain(v.drums.reverbSend),
            delayGain: new Tone.Gain(v.drums.delaySend),
            dryGain: new Tone.Gain(1)
        };
        // Route all drums through shared gains
        this.drums.kick.connect(this.drums.dryGain);
        this.drums.kick.connect(this.drums.reverbGain);
        this.drums.kick.connect(this.drums.delayGain);
        this.drums.hat.connect(this.drums.dryGain);
        this.drums.hat.connect(this.drums.reverbGain);
        this.drums.click.connect(this.drums.dryGain);
        this.drums.click.connect(this.drums.delayGain);
        this.drums.dryGain.connect(dryBus);
        this.drums.reverbGain.connect(this.reverb);
        this.drums.delayGain.connect(this.delay);

        this.applyVolumes();
    }

    // Generate pad texture buffer using Tone.Offline
    async generatePadBuffer() {
        const v = this.birdVoice;
        const scale = this.scales[v.musicality.scale] || this.scales.ambient;

        // Render a short melodic phrase to buffer
        this.grainBuffer = await Tone.Offline(() => {
            const synth = new Tone.PolySynth(Tone.Synth, {
                oscillator: { type: v.pad.sourceOscillator },
                envelope: {
                    attack: v.pad.sourceAttack,
                    decay: 0.3,
                    sustain: 0.6,
                    release: v.pad.sourceRelease
                }
            }).toDestination();

            // Play chord tones for granular source material
            const chordNotes = [scale[0], scale[2], scale[4]];
            synth.triggerAttackRelease(chordNotes, 1.5, 0, 0.5);

            // Add melodic movement
            synth.triggerAttackRelease(scale[3], 0.8, 0.5, 0.3);
            synth.triggerAttackRelease(scale[5], 0.8, 1.0, 0.3);
        }, 2); // 2 seconds of source material

        // Create or update GrainPlayer
        if (this.pad.player) {
            this.pad.player.buffer = this.grainBuffer;
        } else {
            this.pad.player = new Tone.GrainPlayer({
                url: this.grainBuffer,
                grainSize: v.pad.grainSize,
                overlap: v.pad.overlap,
                playbackRate: v.pad.playbackRate,
                detune: v.pad.detune,
                loop: true,
                volume: this.baseVolumes.pad
            });
            this.pad.player.connect(this.pad.dryGain);
            this.pad.player.connect(this.pad.reverbGain);
            this.pad.player.connect(this.pad.delayGain);
        }
    }

    // Apply current volume settings
    applyVolumes() {
        if (!this.lead) return;

        const v = this.birdVoice;
        const rampTime = 0.05;

        // Lead
        const leadVol = this.muted.lead ? -60 : this.baseVolumes.lead + (v.lead.volume - 0.85) * 20;
        this.lead.synth.volume.rampTo(leadVol, rampTime);

        // Pad
        const padVol = this.muted.pad ? -60 : this.baseVolumes.pad + (v.pad.volume - 0.7) * 20;
        if (this.pad.player) {
            this.pad.player.volume.rampTo(padVol, rampTime);
        }

        // Bass
        const bassVol = this.muted.bass ? -60 : this.baseVolumes.bass + (v.bass.volume - 0.6) * 20;
        this.bass.synth.volume.rampTo(bassVol, rampTime);

        // Drums
        const drumsVol = this.muted.drums ? -60 : this.baseVolumes.drums + (v.drums.volume - 0.5) * 20;
        this.drums.kick.volume.rampTo(drumsVol, rampTime);
        this.drums.hat.volume.rampTo(drumsVol - 6, rampTime);
        this.drums.click.volume.rampTo(drumsVol - 10, rampTime);
    }

    // ========== VOLUME CONTROLS ==========
    setMasterVolume(value) {
        this.birdVoice.master.volume = value;
        if (this.masterGain) {
            this.masterGain.gain.rampTo(value, 0.05);
        }
    }

    setLeadVolume(value) {
        this.birdVoice.lead.volume = value;
        this.applyVolumes();
    }

    setPadVolume(value) {
        this.birdVoice.pad.volume = value;
        this.applyVolumes();
    }

    setBassVolume(value) {
        this.birdVoice.bass.volume = value;
        this.applyVolumes();
    }

    setDrumsVolume(value) {
        this.birdVoice.drums.volume = value;
        this.applyVolumes();
    }

    // ========== LEAD CONTROLS (FMSynth) ==========
    setLeadOscillatorType(type) {
        this.birdVoice.lead.oscillatorType = type;
        if (this.lead) {
            this.lead.synth.set({ oscillator: { type: type } });
        }
    }

    setLeadModulationType(type) {
        this.birdVoice.lead.modulationType = type;
        if (this.lead) {
            this.lead.synth.set({ modulation: { type: type } });
        }
    }

    setLeadHarmonicity(value) {
        this.birdVoice.lead.harmonicity = value;
        if (this.lead) {
            this.lead.synth.harmonicity.rampTo(value, 0.05);
        }
    }

    setLeadModulationIndex(value) {
        this.birdVoice.lead.modulationIndex = value;
        if (this.lead) {
            this.lead.synth.modulationIndex.rampTo(value, 0.05);
        }
    }

    setLeadPortamento(value) {
        this.birdVoice.lead.portamento = value;
        if (this.lead) {
            this.lead.synth.portamento = value;
        }
    }

    setLeadAttack(value) {
        this.birdVoice.lead.attack = Math.max(0.001, value);
        if (this.lead) {
            this.lead.synth.set({
                envelope: { attack: value },
                modulationEnvelope: { attack: value * 0.5 }
            });
        }
    }

    setLeadDecay(value) {
        this.birdVoice.lead.decay = Math.max(0.01, value);
        if (this.lead) {
            this.lead.synth.set({
                envelope: { decay: value },
                modulationEnvelope: { decay: value * 1.5 }
            });
        }
    }

    setLeadSustain(value) {
        this.birdVoice.lead.sustain = Math.max(0, Math.min(1, value));
        if (this.lead) {
            this.lead.synth.set({
                envelope: { sustain: value },
                modulationEnvelope: { sustain: value * 0.8 }
            });
        }
    }

    setLeadRelease(value) {
        this.birdVoice.lead.release = Math.max(0.01, value);
        if (this.lead) {
            this.lead.synth.set({
                envelope: { release: value },
                modulationEnvelope: { release: value * 0.5 }
            });
        }
    }

    setLeadReverbSend(value) {
        this.birdVoice.lead.reverbSend = value;
        if (this.lead) {
            this.lead.reverbGain.gain.rampTo(value, 0.05);
        }
    }

    setLeadDelaySend(value) {
        this.birdVoice.lead.delaySend = value;
        if (this.lead) {
            this.lead.delayGain.gain.rampTo(value, 0.05);
        }
    }

    // ========== PAD CONTROLS ==========
    setPadGrainSize(value) {
        this.birdVoice.pad.grainSize = Math.max(0.01, value);
        if (this.pad.player) {
            this.pad.player.grainSize = this.birdVoice.pad.grainSize;
        }
    }

    setPadOverlap(value) {
        this.birdVoice.pad.overlap = Math.max(0.01, value);
        if (this.pad.player) {
            this.pad.player.overlap = this.birdVoice.pad.overlap;
        }
    }

    setPadPlaybackRate(value) {
        this.birdVoice.pad.playbackRate = Math.max(0.1, Math.min(4, value));
        if (this.pad.player) {
            this.pad.player.playbackRate = this.birdVoice.pad.playbackRate;
        }
    }

    setPadDetune(value) {
        this.birdVoice.pad.detune = value;
        if (this.pad.player) {
            this.pad.player.detune = value;
        }
    }

    setPadSourceOscillator(type) {
        this.birdVoice.pad.sourceOscillator = type;
        // Buffer will be regenerated on next play
    }

    setPadReverbSend(value) {
        this.birdVoice.pad.reverbSend = value;
        if (this.pad) {
            this.pad.reverbGain.gain.rampTo(value, 0.05);
        }
    }

    setPadDelaySend(value) {
        this.birdVoice.pad.delaySend = value;
        if (this.pad) {
            this.pad.delayGain.gain.rampTo(value, 0.05);
        }
    }

    // ========== BASS CONTROLS ==========
    setBassOscillatorType(type) {
        this.birdVoice.bass.oscillatorType = type;
        if (this.bass) {
            this.bass.synth.set({ oscillator: { type: type } });
        }
    }

    setBassFilterFrequency(value) {
        this.birdVoice.bass.filterFrequency = value;
        if (this.bass) {
            this.bass.synth.set({ filterEnvelope: { baseFrequency: value } });
        }
    }

    setBassAttack(value) {
        this.birdVoice.bass.attack = Math.max(0.01, value);
        if (this.bass) {
            this.bass.synth.set({ envelope: { attack: value } });
        }
    }

    setBassRelease(value) {
        this.birdVoice.bass.release = Math.max(0.1, value);
        if (this.bass) {
            this.bass.synth.set({ envelope: { release: value } });
        }
    }

    setBassReverbSend(value) {
        this.birdVoice.bass.reverbSend = value;
        if (this.bass) {
            this.bass.reverbGain.gain.rampTo(value, 0.05);
        }
    }

    setBassDelaySend(value) {
        this.birdVoice.bass.delaySend = value;
        if (this.bass) {
            this.bass.delayGain.gain.rampTo(value, 0.05);
        }
    }

    // ========== DRUMS CONTROLS ==========
    setKickPitchDecay(value) {
        this.birdVoice.drums.kick.pitchDecay = value;
        if (this.drums) {
            this.drums.kick.pitchDecay = value;
        }
    }

    setKickOctaves(value) {
        this.birdVoice.drums.kick.octaves = value;
        if (this.drums) {
            this.drums.kick.octaves = value;
        }
    }

    setHatNoiseType(type) {
        this.birdVoice.drums.hat.type = type;
        if (this.drums) {
            this.drums.hat.set({ noise: { type: type } });
        }
    }

    setHatDecay(value) {
        this.birdVoice.drums.hat.decay = value;
        if (this.drums) {
            this.drums.hat.envelope.decay = value;
        }
    }

    setDrumsReverbSend(value) {
        this.birdVoice.drums.reverbSend = value;
        if (this.drums) {
            this.drums.reverbGain.gain.rampTo(value, 0.05);
        }
    }

    setDrumsDelaySend(value) {
        this.birdVoice.drums.delaySend = value;
        if (this.drums) {
            this.drums.delayGain.gain.rampTo(value, 0.05);
        }
    }

    // ========== REVERB CONTROLS ==========
    setReverbDecay(value) {
        this.birdVoice.reverb.decay = value;
        if (this.reverb) {
            this.reverb.decay = value;
        }
    }

    setReverbWet(value) {
        this.birdVoice.reverb.wet = value;
        if (this.reverb) {
            this.reverb.wet.rampTo(value, 0.05);
        }
    }

    // ========== DELAY CONTROLS ==========
    setDelayTime(value) {
        this.birdVoice.delay.delayTime = value;
        if (this.delay) {
            this.delay.delayTime.rampTo(value, 0.05);
        }
    }

    setDelayFeedback(value) {
        this.birdVoice.delay.feedback = value;
        if (this.delay) {
            this.delay.feedback.rampTo(value, 0.05);
        }
    }

    setDelayWet(value) {
        this.birdVoice.delay.wet = value;
        if (this.delay) {
            this.delay.wet.rampTo(value, 0.05);
        }
    }

    // ========== MUSICALITY CONTROLS ==========
    setScale(scaleName) {
        if (this.scales[scaleName]) {
            this.birdVoice.musicality.scale = scaleName;
        }
    }

    setTempo(value) {
        this.birdVoice.musicality.tempo = Math.max(40, Math.min(140, value));
    }

    // ========== MUTE CONTROLS ==========
    toggleMute(instrument) {
        this.muted[instrument] = !this.muted[instrument];
        this.applyVolumes();
        return this.muted[instrument];
    }

    // ========== BIRD VOICE ==========
    setBirdVoiceName(name) {
        this.birdVoice.name = name;
    }

    getBirdVoice() {
        return this.birdVoice;
    }

    // Musical scales (higher register for bird-like lead)
    scales = {
        major: ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5'],
        minor: ['A3', 'C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5'],
        ambient: ['C4', 'E4', 'G4', 'B4', 'C5', 'E5', 'G5', 'B5']
    };

    // Bass scales (lower register)
    bassScales = {
        major: ['C2', 'D2', 'E2', 'G2', 'A2', 'C3'],
        minor: ['A1', 'C2', 'D2', 'E2', 'G2', 'A2'],
        ambient: ['C2', 'G2', 'C3', 'E3', 'G3']
    };

    // LFO target definitions — Lead parameters only
    getLfoTargetDefs() {
        return {
            'none': null,
            'lead-volume': {
                label: 'Volume',
                getBase: () => this.baseVolumes.lead + (this.birdVoice.lead.volume - 0.85) * 20,
                range: 6, min: -60, max: 0,
                apply: (val) => { if (this.lead) this.lead.synth.volume.rampTo(val, 0.03); }
            },
            'lead-harmonicity': {
                label: 'Harmonicity',
                getBase: () => this.birdVoice.lead.harmonicity,
                range: 2, min: 0.5, max: 8,
                apply: (val) => { if (this.lead) this.lead.synth.harmonicity.rampTo(val, 0.03); }
            },
            'lead-mod-index': {
                label: 'Mod Index',
                getBase: () => this.birdVoice.lead.modulationIndex,
                range: 4, min: 0.1, max: 10,
                apply: (val) => { if (this.lead) this.lead.synth.modulationIndex.rampTo(val, 0.03); }
            },
            'lead-portamento': {
                label: 'Glide',
                getBase: () => this.birdVoice.lead.portamento,
                range: 0.1, min: 0, max: 0.3,
                apply: (val) => { if (this.lead) this.lead.synth.portamento = val; }
            },
            'lead-attack': {
                label: 'Attack',
                getBase: () => this.birdVoice.lead.attack,
                range: 0.05, min: 0.001, max: 0.5,
                apply: (val) => {
                    if (this.lead) this.lead.synth.set({
                        envelope: { attack: val },
                        modulationEnvelope: { attack: val * 0.5 }
                    });
                }
            },
            'lead-decay': {
                label: 'Decay',
                getBase: () => this.birdVoice.lead.decay,
                range: 0.15, min: 0.01, max: 0.5,
                apply: (val) => {
                    if (this.lead) this.lead.synth.set({
                        envelope: { decay: val },
                        modulationEnvelope: { decay: val * 1.5 }
                    });
                }
            },
            'lead-sustain': {
                label: 'Sustain',
                getBase: () => this.birdVoice.lead.sustain,
                range: 0.3, min: 0, max: 1,
                apply: (val) => {
                    if (this.lead) this.lead.synth.set({
                        envelope: { sustain: val },
                        modulationEnvelope: { sustain: val * 0.8 }
                    });
                }
            },
            'lead-release': {
                label: 'Release',
                getBase: () => this.birdVoice.lead.release,
                range: 0.5, min: 0.01, max: 3,
                apply: (val) => {
                    if (this.lead) this.lead.synth.set({
                        envelope: { release: val },
                        modulationEnvelope: { release: val * 0.5 }
                    });
                }
            },
            'lead-reverb': {
                label: 'Reverb Send',
                getBase: () => this.birdVoice.lead.reverbSend,
                range: 0.4, min: 0, max: 1,
                apply: (val) => { if (this.lead) this.lead.reverbGain.gain.rampTo(val, 0.03); }
            },
            'lead-delay': {
                label: 'Delay Send',
                getBase: () => this.birdVoice.lead.delaySend,
                range: 0.4, min: 0, max: 1,
                apply: (val) => { if (this.lead) this.lead.delayGain.gain.rampTo(val, 0.03); }
            }
        };
    }

    // ========== LFO METHODS ==========
    startLFOs() {
        this.lfoAnimFrame = requestAnimationFrame(() => this.updateLFOs());
    }

    stopLFOs() {
        if (this.lfoAnimFrame) {
            cancelAnimationFrame(this.lfoAnimFrame);
            this.lfoAnimFrame = null;
        }
        this.resetLfoTargets();
        if (this.onLfoUpdate) this.onLfoUpdate({});
    }

    updateLFOs() {
        if (!this.isPlaying) return;

        const now = performance.now() / 1000;
        const targets = this.getLfoTargetDefs();
        const visualUpdates = {};

        for (let i = 0; i < 2; i++) {
            const lfo = this.birdVoice.lfos[i];
            if (lfo.target === 'none' || lfo.depth === 0) continue;

            const targetDef = targets[lfo.target];
            if (!targetDef) continue;

            const base = targetDef.getBase();
            // Organic waveform: sine + subtle second partial at irrational ratio
            const phase = this.lfoPhases[i];
            const raw = Math.sin(now * lfo.rate * 2 * Math.PI + phase) * 0.85
                      + Math.sin(now * lfo.rate * 2 * Math.PI * 1.7 + phase * 0.6) * 0.15;
            const modulated = base + raw * targetDef.range * lfo.depth;
            const clamped = Math.max(targetDef.min, Math.min(targetDef.max, modulated));

            targetDef.apply(clamped);

            // Accumulate normalized modulation for visual feedback (sum if both LFOs target same param)
            const normMod = raw * lfo.depth;
            visualUpdates[lfo.target] = (visualUpdates[lfo.target] || 0) + normMod;
        }

        if (this.onLfoUpdate) this.onLfoUpdate(visualUpdates);

        this.lfoAnimFrame = requestAnimationFrame(() => this.updateLFOs());
    }

    resetLfoTargets() {
        const targets = this.getLfoTargetDefs();
        for (let i = 0; i < 2; i++) {
            const lfo = this.birdVoice.lfos[i];
            if (lfo.target === 'none' || lfo.depth === 0) continue;
            const targetDef = targets[lfo.target];
            if (targetDef) {
                targetDef.apply(targetDef.getBase());
            }
        }
    }

    // ========== LFO CONTROLS ==========
    setLfoRate(index, value) {
        this.birdVoice.lfos[index].rate = value;
    }

    setLfoDepth(index, value) {
        this.birdVoice.lfos[index].depth = value;
    }

    setLfoTarget(index, target) {
        // Reset the old target to its base value before switching
        if (this.isPlaying) {
            const targets = this.getLfoTargetDefs();
            const oldTarget = this.birdVoice.lfos[index].target;
            if (oldTarget !== 'none') {
                const oldDef = targets[oldTarget];
                if (oldDef) oldDef.apply(oldDef.getBase());
            }
        }
        this.birdVoice.lfos[index].target = target;
    }

    // Map IMU data to musical parameters
    mapDataToMusic(minute) {
        const avgAcc = minute.avg_acc || 1.0;
        const maxAcc = minute.max_acc || 1.0;
        const steps = minute.steps || 0;
        const fidgets = minute.fidget_events || 0;
        const rotation = minute.avg_rot || 0;

        return {
            tempo: Math.min(100, Math.max(60, 60 + (avgAcc - 1) * 40)),
            volume: Math.min(-6, Math.max(-24, -24 + (maxAcc - 1) * 9)),
            density: Math.min(4, Math.max(1, Math.floor(steps / 15) + 1)),
            ornamentChance: Math.min(0.5, fidgets * 0.1),
            pitchTendency: Math.tanh(rotation * 2),
            stillness: avgAcc < 1.05 && steps < 5
        };
    }

    // Generate music from data
    async play(data, onProgress, onComplete) {
        await this.initInstruments();

        if (!data || !data.minutes || data.minutes.length === 0) {
            console.error('No data to play');
            return;
        }

        // Regenerate pad buffer with current settings
        await this.generatePadBuffer();

        this.onProgress = onProgress;
        this.onComplete = onComplete;
        this.isPlaying = true;

        const totalMinutes = data.minutes.length;
        // Base duration calculation, then scale by tempo (75 BPM is neutral)
        const baseSecondsPerMinute = Math.max(0.5, Math.min(2, 180 / totalMinutes));
        const tempoScale = 75 / this.birdVoice.musicality.tempo;
        const secondsPerMinute = baseSecondsPerMinute * tempoScale;
        this.duration = totalMinutes * secondsPerMinute;

        Tone.Transport.bpm.value = this.birdVoice.musicality.tempo;

        // Schedule all musical events
        this.scheduleMusic(data.minutes, secondsPerMinute);

        // Start pad texture
        if (this.pad.player) {
            this.pad.player.start();
        }

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

        // Start free-running LFOs
        this.startLFOs();
    }

    scheduleMusic(minutes, secondsPerMinute) {
        const scaleName = this.birdVoice.musicality.scale;
        const scale = this.scales[scaleName] || this.scales.ambient;
        const bassScale = this.bassScales[scaleName] || this.bassScales.ambient;
        let lastBassNote = null;

        minutes.forEach((minute, index) => {
            const params = this.mapDataToMusic(minute);
            const sectionStart = index * secondsPerMinute;

            // ========== BASS ==========
            // Bass plays root notes, changing every 4-8 sections
            if (index % Math.floor(4 + Math.random() * 4) === 0 || index === 0) {
                const bassNote = bassScale[Math.floor(Math.random() * 3)]; // Low notes
                lastBassNote = bassNote;

                const bassEvent = Tone.Transport.schedule((time) => {
                    this.bass.synth.triggerAttackRelease(
                        bassNote,
                        secondsPerMinute * 4,
                        time,
                        0.6
                    );
                }, sectionStart);
                this.scheduledEvents.push(bassEvent);
            }

            // ========== LEAD ==========
            // Melodic notes based on activity density
            if (!params.stillness) {
                for (let i = 0; i < params.density; i++) {
                    const noteTime = sectionStart + (i / params.density) * secondsPerMinute;
                    const note = this.selectNote(scale, params.pitchTendency);
                    const noteDuration = secondsPerMinute / params.density * 0.8; // 80% of note slot

                    const leadEvent = Tone.Transport.schedule((time) => {
                        this.lead.synth.triggerAttackRelease(note, noteDuration, time);
                    }, noteTime);
                    this.scheduledEvents.push(leadEvent);

                    // Ornaments on fidgets
                    if (Math.random() < params.ornamentChance) {
                        const ornamentNote = this.selectNote(scale, params.pitchTendency);
                        const ornamentEvent = Tone.Transport.schedule((time) => {
                            this.lead.synth.triggerAttackRelease(ornamentNote, 0.15, time);
                        }, noteTime + 0.1);
                        this.scheduledEvents.push(ornamentEvent);
                    }
                }
            }

            // ========== DRUMS ==========
            // Subtle percussion on higher activity
            if (params.density >= 2) {
                // Soft kick
                if (Math.random() < 0.2) {
                    const kickEvent = Tone.Transport.schedule((time) => {
                        this.drums.kick.triggerAttackRelease('C1', '8n', time, 0.3);
                    }, sectionStart);
                    this.scheduledEvents.push(kickEvent);
                }

                // Hi-hat on fidgets
                if (params.density >= 3 && Math.random() < 0.3) {
                    const hatEvent = Tone.Transport.schedule((time) => {
                        this.drums.hat.triggerAttackRelease('16n', time, 0.2);
                    }, sectionStart + secondsPerMinute * 0.25);
                    this.scheduledEvents.push(hatEvent);
                }

                // Glitchy click occasionally
                if (Math.random() < params.ornamentChance * 0.5) {
                    const clickEvent = Tone.Transport.schedule((time) => {
                        this.drums.click.triggerAttackRelease('C6', '32n', time, 0.15);
                    }, sectionStart + secondsPerMinute * 0.5);
                    this.scheduledEvents.push(clickEvent);
                }
            }
        });
    }

    selectNote(scale, tendency) {
        const biasedIndex = Math.floor(
            ((tendency + 1) / 2 * 0.6 + Math.random() * 0.4) * scale.length
        );
        return scale[Math.min(biasedIndex, scale.length - 1)];
    }

    stop() {
        this.isPlaying = false;

        // Stop LFOs and reset modulated params to base values
        this.stopLFOs();

        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }

        this.scheduledEvents.forEach(id => {
            Tone.Transport.clear(id);
        });
        this.scheduledEvents = [];

        Tone.Transport.stop();
        Tone.Transport.position = 0;

        // Release all synths to stop any hanging notes
        if (this.lead && this.lead.synth) {
            this.lead.synth.triggerRelease();
        }
        if (this.bass && this.bass.synth) {
            this.bass.synth.triggerRelease();
        }

        // Stop pad
        if (this.pad && this.pad.player) {
            this.pad.player.stop();
        }
    }

    dispose() {
        this.stop();

        if (this.lead) {
            this.lead.synth.dispose();
            this.lead.reverbGain.dispose();
            this.lead.delayGain.dispose();
            this.lead.dryGain.dispose();
        }

        if (this.pad) {
            if (this.pad.player) this.pad.player.dispose();
            this.pad.reverbGain.dispose();
            this.pad.delayGain.dispose();
            this.pad.dryGain.dispose();
        }

        if (this.bass) {
            this.bass.synth.dispose();
            this.bass.reverbGain.dispose();
            this.bass.delayGain.dispose();
            this.bass.dryGain.dispose();
        }

        if (this.drums) {
            this.drums.kick.dispose();
            this.drums.hat.dispose();
            this.drums.click.dispose();
            this.drums.reverbGain.dispose();
            this.drums.delayGain.dispose();
            this.drums.dryGain.dispose();
        }

        if (this.reverb) this.reverb.dispose();
        if (this.delay) this.delay.dispose();
        if (this.masterGain) this.masterGain.dispose();

        this.lead = null;
        this.pad = null;
        this.bass = null;
        this.drums = null;
        this.reverb = null;
        this.delay = null;
        this.masterGain = null;
    }
}

// Global instance
const musicEngine = new MusicEngine();
