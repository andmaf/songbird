// Bird Log - Dot Raster Rendering Engine
// Renders a bird using a grid of dots with variable shapes per body part.

const RasterArt = (() => {

    // ─── Configuration ────────────────────────────────────────
    const GRID_COLS = 30;
    const GRID_ROWS = 25;
    const DOT_SIZE = 20;

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

    // ─── Bird shape definition (30 wide x 25 tall) ────────────
    const BIRD_MAP = [
        // Row 0 (empty)
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        // Row 1 (empty)
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        // Row 2 (beak top)
        [_,_,_,_,_,_,_,_,_,_,_,B,B,B,B,B,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        // Row 3 (beak + eye)
        [_,_,_,_,_,_,_,_,_,B,B,B,B,B,E,E,E,E,E,_,_,_,_,_,_,_,_,_,_,_],
        // Row 4 (neck)
        [_,_,_,_,_,_,_,_,_,_,O,O,O,O,O,O,O,O,O,_,_,_,_,_,_,_,_,_,_,_],
        // Row 5 (upper body + wings)
        [_,_,_,_,_,_,_,W,W,W,O,O,O,O,O,O,O,O,O,W,W,W,_,_,_,_,_,_,_,_],
        // Row 6 (body + wings)
        [_,_,_,_,_,_,W,W,W,W,O,O,O,O,O,O,O,O,O,W,W,W,W,_,_,_,_,_,_,_],
        // Row 7 (body + wider wings)
        [_,_,_,_,_,W,W,W,W,W,O,O,O,O,O,O,O,O,O,W,W,W,W,W,_,_,_,_,_,_],
        // Row 8 (widest body + wings)
        [_,_,_,_,W,W,W,W,W,O,O,O,O,O,O,O,O,O,O,O,W,W,W,W,W,_,_,_,_,_],
        // Row 9 (widest body + wings)
        [_,_,_,_,W,W,W,W,W,O,O,O,O,O,O,O,O,O,O,O,W,W,W,W,W,_,_,_,_,_],
        // Row 10 (body tapering)
        [_,_,_,_,_,W,W,W,W,O,O,O,O,O,O,O,O,O,O,O,W,W,W,W,_,_,_,_,_,_],
        // Row 11 (body tapering)
        [_,_,_,_,_,_,W,W,W,O,O,O,O,O,O,O,O,O,O,O,W,W,W,_,_,_,_,_,_,_],
        // Row 12 (lower body + wing edge)
        [_,_,_,_,_,_,_,W,W,O,O,O,O,O,O,O,O,O,O,O,W,W,_,_,_,_,_,_,_,_],
        // Row 13 (lower body)
        [_,_,_,_,_,_,_,_,_,_,O,O,O,O,O,O,O,O,O,_,_,_,_,_,_,_,_,_,_,_],
        // Row 14 (body bottom)
        [_,_,_,_,_,_,_,_,_,_,_,O,O,O,O,O,O,O,_,_,_,_,_,_,_,_,_,_,_,_],
        // Row 15 (tail narrow)
        [_,_,_,_,_,_,_,_,_,_,_,_,T,T,T,T,T,_,_,_,_,_,_,_,_,_,_,_,_,_],
        // Row 16 (tail spread)
        [_,_,_,_,_,_,_,_,_,_,T,T,T,T,T,T,T,T,T,_,_,_,_,_,_,_,_,_,_,_],
        // Row 17 (tail tips)
        [_,_,_,_,_,_,_,_,_,_,T,T,T,_,T,_,T,T,T,_,_,_,_,_,_,_,_,_,_,_],
        // Row 18 (empty)
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        // Row 19 (empty)
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        // Row 20 (empty)
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        // Row 21 (nest rim)
        [_,_,_,_,_,N,N,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,N,N,_,_,_,_,_],
        // Row 22 (nest base)
        [_,_,_,_,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,_,_,_,_],
        // Row 23 (nest bottom)
        [_,_,_,_,_,_,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,_,_,_,_,_,_],
        // Row 24 (empty)
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
    ];

    // Alternative: bird flying (undocked)
    const BIRD_MAP_UNDOCKED = [
        // Row 0 (empty)
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        // Row 1 (empty)
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        // Row 2 (beak top)
        [_,_,_,_,_,_,_,_,_,_,_,B,B,B,B,B,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        // Row 3 (beak + eye)
        [_,_,_,_,_,_,_,_,_,B,B,B,B,B,E,E,E,E,E,_,_,_,_,_,_,_,_,_,_,_],
        // Row 4 (neck)
        [_,_,_,_,_,_,_,_,_,_,O,O,O,O,O,O,O,O,O,_,_,_,_,_,_,_,_,_,_,_],
        // Row 5 (wings raised high)
        [_,_,_,_,W,W,W,W,W,W,O,O,O,O,O,O,O,O,O,W,W,W,W,W,W,_,_,_,_,_],
        // Row 6 (wings)
        [_,_,_,_,_,W,W,W,W,W,O,O,O,O,O,O,O,O,O,W,W,W,W,W,_,_,_,_,_,_],
        // Row 7 (body)
        [_,_,_,_,_,_,_,_,_,O,O,O,O,O,O,O,O,O,O,O,_,_,_,_,_,_,_,_,_,_],
        // Row 8 (body)
        [_,_,_,_,_,_,_,_,_,O,O,O,O,O,O,O,O,O,O,O,_,_,_,_,_,_,_,_,_,_],
        // Row 9 (lower body)
        [_,_,_,_,_,_,_,_,_,_,O,O,O,O,O,O,O,O,O,_,_,_,_,_,_,_,_,_,_,_],
        // Row 10 (body bottom)
        [_,_,_,_,_,_,_,_,_,_,_,O,O,O,O,O,O,O,_,_,_,_,_,_,_,_,_,_,_,_],
        // Row 11 (tail narrow)
        [_,_,_,_,_,_,_,_,_,_,_,_,T,T,T,T,T,_,_,_,_,_,_,_,_,_,_,_,_,_],
        // Row 12 (tail spread)
        [_,_,_,_,_,_,_,_,_,_,T,T,T,T,T,T,T,T,T,_,_,_,_,_,_,_,_,_,_,_],
        // Row 13 (tail tips)
        [_,_,_,_,_,_,_,_,_,_,T,T,T,_,T,_,T,T,T,_,_,_,_,_,_,_,_,_,_,_],
        // Row 14 (empty)
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        // Row 15 (empty)
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        // Row 16 (empty)
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        // Row 17 (empty)
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        // Row 18 (empty)
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        // Row 19 (empty)
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        // Row 20 (empty)
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        // Row 21 (nest rim)
        [_,_,_,_,_,N,N,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,N,N,_,_,_,_,_],
        // Row 22 (nest base)
        [_,_,_,_,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,_,_,_,_],
        // Row 23 (nest bottom)
        [_,_,_,_,_,_,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,_,_,_,_,_,_],
        // Row 24 (empty)
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
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
