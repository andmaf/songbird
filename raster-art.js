// Bird Log - Dot Raster Rendering Engine
// Renders a bird using a grid of dots with variable shapes per body part.

const RasterArt = (() => {

    // ─── Configuration ────────────────────────────────────────
    const GRID_COLS = 17;
    const GRID_ROWS = 15;
    const DOT_SIZE = 18;

    // Dot shapes (Unicode characters)
    const SHAPES = ['●', '■', '▲', '◆', '✦'];

    // Shape names for labels
    const SHAPE_NAMES = {
        beak:  ['round', 'square', 'sharp', 'crystal', 'spark'],
        eye:   ['soft', 'steady', 'alert', 'bright', 'dreamy'],
        body:  ['thin', 'warm', 'rich', 'complex', 'full'],
        wings: ['staccato', 'normal', 'legato', 'swell', 'sustain'],
        tail:  ['dry', 'room', 'hall', 'cathedral', 'echo'],
    };

    // ─── Part state ───────────────────────────────────────────
    const PARTS = {
        beak:  { current: 0 },
        eye:   { current: 0 },
        body:  { current: 0 },
        wings: { current: 0 },
        tail:  { current: 0 },
    };

    // ─── Helper to create a row ──────────────────────────────
    const _ = null;
    const B = 'beak';
    const E = 'eye';
    const O = 'body';
    const W = 'wings';
    const T = 'tail';
    const N = 'nest';

    // ─── Bird shape definition (17 wide x 15 tall) ───────────
    const BIRD_MAP = [
        // Row 0 (empty top)
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        // Row 1 (top of head - beak)
        [_,_,_,_,_,_,_,B,B,B,_,_,_,_,_,_,_],
        // Row 2 (beak + eye)
        [_,_,_,_,_,B,B,B,E,E,E,_,_,_,_,_,_],
        // Row 3 (neck)
        [_,_,_,_,_,_,O,O,O,O,O,_,_,_,_,_,_],
        // Row 4 (upper body + wings)
        [_,_,_,_,W,W,O,O,O,O,O,W,W,_,_,_,_],
        // Row 5 (body + wings)
        [_,_,_,W,W,W,O,O,O,O,O,W,W,W,_,_,_],
        // Row 6 (widest body + wings)
        [_,_,W,W,W,O,O,O,O,O,O,O,W,W,W,_,_],
        // Row 7 (body)
        [_,_,_,W,W,O,O,O,O,O,O,O,W,W,_,_,_],
        // Row 8 (lower body)
        [_,_,_,_,W,O,O,O,O,O,O,O,W,_,_,_,_],
        // Row 9 (tail start)
        [_,_,_,_,_,_,O,O,O,O,O,_,_,_,_,_,_],
        // Row 10 (tail)
        [_,_,_,_,_,_,_,T,T,T,_,_,_,_,_,_,_],
        // Row 11 (tail spread)
        [_,_,_,_,_,_,T,T,T,T,T,_,_,_,_,_,_],
        // Row 12 (tail tips)
        [_,_,_,_,_,T,T,_,T,_,T,T,_,_,_,_,_],
        // Row 13 (nest rim)
        [_,_,N,N,_,_,_,_,_,_,_,_,_,N,N,_,_],
        // Row 14 (nest base)
        [_,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,_],
    ];

    // Alternative: bird flying (undocked)
    const BIRD_MAP_UNDOCKED = [
        // Row 0 (empty)
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        // Row 1 (top of head - beak)
        [_,_,_,_,_,_,_,B,B,B,_,_,_,_,_,_,_],
        // Row 2 (beak + eye)
        [_,_,_,_,_,B,B,B,E,E,E,_,_,_,_,_,_],
        // Row 3 (neck)
        [_,_,_,_,_,_,O,O,O,O,O,_,_,_,_,_,_],
        // Row 4 (wings raised high)
        [_,W,W,W,W,W,O,O,O,O,O,W,W,W,W,W,_],
        // Row 5 (wings)
        [_,_,W,W,W,W,O,O,O,O,O,W,W,W,W,_,_],
        // Row 6 (body)
        [_,_,_,_,_,O,O,O,O,O,O,O,_,_,_,_,_],
        // Row 7 (body)
        [_,_,_,_,_,O,O,O,O,O,O,O,_,_,_,_,_],
        // Row 8 (lower body)
        [_,_,_,_,_,_,O,O,O,O,O,_,_,_,_,_,_],
        // Row 9 (tail)
        [_,_,_,_,_,_,_,T,T,T,_,_,_,_,_,_,_],
        // Row 10 (tail spread)
        [_,_,_,_,_,_,T,T,T,T,T,_,_,_,_,_,_],
        // Row 11 (tail tips)
        [_,_,_,_,_,T,T,_,T,_,T,T,_,_,_,_,_],
        // Row 12 (empty)
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        // Row 13 (nest rim)
        [_,_,N,N,_,_,_,_,_,_,_,_,_,N,N,_,_],
        // Row 14 (nest base)
        [_,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,_],
    ];

    // ─── Rendering ────────────────────────────────────────────

    const NEST_SHAPE = SHAPES[0]; // ●

    function getShape(part) {
        if (part === 'nest') return NEST_SHAPE;
        const idx = PARTS[part] ? PARTS[part].current : 0;
        return SHAPES[idx];
    }

    function renderGrid(docked) {
        const map = docked ? BIRD_MAP : BIRD_MAP_UNDOCKED;
        let html = '<div class="raster-grid">';

        for (let row = 0; row < GRID_ROWS; row++) {
            html += '<div class="raster-row">';
            for (let col = 0; col < GRID_COLS; col++) {
                const part = map[row][col];
                if (part === null) {
                    html += '<span class="dot empty"></span>';
                } else if (part === 'nest') {
                    html += `<span class="dot nest-part" data-part="nest">${NEST_SHAPE}</span>`;
                } else {
                    const shape = getShape(part);
                    html += `<span class="dot bird-part" data-part="${part}">${shape}</span>`;
                }
            }
            html += '</div>';
        }

        html += '</div>';
        return html;
    }

    // ─── Public API ───────────────────────────────────────────

    function cyclePart(partName) {
        const part = PARTS[partName];
        if (!part) return -1;
        part.current = (part.current + 1) % SHAPES.length;
        return part.current;
    }

    function getPartState(partName) {
        return PARTS[partName] ? PARTS[partName].current : 0;
    }

    function getPartLabel(partName) {
        const idx = PARTS[partName] ? PARTS[partName].current : 0;
        const names = SHAPE_NAMES[partName];
        return names ? names[idx] : '';
    }

    function render(docked) {
        return renderGrid(docked);
    }

    return {
        PARTS,
        SHAPES,
        render,
        cyclePart,
        getPartState,
        getPartLabel,
        GRID_COLS,
        GRID_ROWS,
        DOT_SIZE
    };
})();

// Alias for compatibility with bird-app.js
const BirdArt = RasterArt;
