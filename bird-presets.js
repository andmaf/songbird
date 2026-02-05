// Bird Log - Body Part Preset Mappings
// Each body part has 5 states; each state maps to lead voice parameters.

const BIRD_PRESETS = {

    // Beak → Oscillator types (timbre character)
    beak: [
        { oscillatorType: 'sine',     modulationType: 'sine' },      // short-pointed: bright, simple
        { oscillatorType: 'triangle', modulationType: 'triangle' },  // long-curved: warm, complex
        { oscillatorType: 'sawtooth', modulationType: 'square' },    // wide-open: harsh, buzzy
        { oscillatorType: 'square',   modulationType: 'sawtooth' },  // serrated: metallic
        { oscillatorType: 'triangle', modulationType: 'sine' },      // hooked: airy
    ],

    // Eye → Portamento + volume (expression)
    eye: [
        { portamento: 0.0,  volume: 0.7 },  // dot: crisp, quiet
        { portamento: 0.04, volume: 0.8 },   // wide: slight glide
        { portamento: 0.08, volume: 0.9 },   // half: moderate glide
        { portamento: 0.12, volume: 1.0 },   // wink: expressive
        { portamento: 0.15, volume: 0.6 },   // star: dreamy, soft
    ],

    // Body → Harmonicity + modulationIndex (richness)
    body: [
        { harmonicity: 0.5, modulationIndex: 1 },  // plain: thin
        { harmonicity: 1.5, modulationIndex: 3 },  // striped: warm
        { harmonicity: 2.5, modulationIndex: 5 },  // dotted: rich
        { harmonicity: 3.5, modulationIndex: 7 },  // chevron: complex
        { harmonicity: 4.0, modulationIndex: 8 },  // fluffy: very rich
    ],

    // Wings → ADSR envelope (articulation)
    wings: [
        { attack: 0.005, decay: 0.05,  sustain: 0.1, release: 0.3 },  // tucked: staccato
        { attack: 0.02,  decay: 0.15,  sustain: 0.3, release: 0.8 },  // spread: normal
        { attack: 0.05,  decay: 0.25,  sustain: 0.5, release: 1.2 },  // raised: legato
        { attack: 0.08,  decay: 0.35,  sustain: 0.4, release: 1.8 },  // folded: slow swell
        { attack: 0.1,   decay: 0.4,   sustain: 0.6, release: 2.0 },  // flapping: very sustained
    ],

    // Tail → Reverb + delay sends (spatial)
    tail: [
        { reverbSend: 0.3, delaySend: 0.1 },  // short: dry/close
        { reverbSend: 0.5, delaySend: 0.2 },  // fanned: room
        { reverbSend: 0.7, delaySend: 0.3 },  // long: hall
        { reverbSend: 0.9, delaySend: 0.4 },  // forked: cathedral
        { reverbSend: 0.6, delaySend: 0.5 },  // curled: echo-heavy
    ],
};

// Apply a preset for a given body part to the music engine
function applyBirdPreset(part, stateIndex) {
    const preset = BIRD_PRESETS[part][stateIndex];
    if (!preset) return;

    switch (part) {
        case 'beak':
            musicEngine.setLeadOscillatorType(preset.oscillatorType);
            musicEngine.setLeadModulationType(preset.modulationType);
            break;
        case 'eye':
            musicEngine.setLeadPortamento(preset.portamento);
            musicEngine.setLeadVolume(preset.volume);
            break;
        case 'body':
            musicEngine.setLeadHarmonicity(preset.harmonicity);
            musicEngine.setLeadModulationIndex(preset.modulationIndex);
            break;
        case 'wings':
            musicEngine.setLeadAttack(preset.attack);
            musicEngine.setLeadDecay(preset.decay);
            musicEngine.setLeadSustain(preset.sustain);
            musicEngine.setLeadRelease(preset.release);
            break;
        case 'tail':
            musicEngine.setLeadReverbSend(preset.reverbSend);
            musicEngine.setLeadDelaySend(preset.delaySend);
            break;
    }
}
