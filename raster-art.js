// Bird Log - Dot Raster Rendering Engine
// Renders a bird using a grid of dots with variable shapes per body part.

const RasterArt = (() => {

    // ─── Configuration ────────────────────────────────────────
    const GRID_COLS = 34;
    const GRID_ROWS = 30;
    const DOT_SIZE = 9; // px (halved for 2x density)

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

    // ─── Bird shape definition (2x density: 34 wide x 30 tall) ─
    const BIRD_MAP = [
        // Rows 0-1 (empty top)
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        // Rows 2-3 (top of head - beak)
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,B,B,B,B,B,B,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,B,B,B,B,B,B,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        // Rows 4-5 (beak + eye)
        [_,_,_,_,_,_,_,_,_,_,B,B,B,B,B,B,E,E,E,E,E,E,_,_,_,_,_,_,_,_,_,_,_,_],
        [_,_,_,_,_,_,_,_,_,_,B,B,B,B,B,B,E,E,E,E,E,E,_,_,_,_,_,_,_,_,_,_,_,_],
        // Rows 6-7 (head/neck - body)
        [_,_,_,_,_,_,_,_,_,_,_,_,O,O,O,O,O,O,O,O,O,O,_,_,_,_,_,_,_,_,_,_,_,_],
        [_,_,_,_,_,_,_,_,_,_,_,_,O,O,O,O,O,O,O,O,O,O,_,_,_,_,_,_,_,_,_,_,_,_],
        // Rows 8-9 (upper body + wings start)
        [_,_,_,_,_,_,_,_,W,W,W,W,O,O,O,O,O,O,O,O,O,O,W,W,W,W,_,_,_,_,_,_,_,_],
        [_,_,_,_,_,_,_,_,W,W,W,W,O,O,O,O,O,O,O,O,O,O,W,W,W,W,_,_,_,_,_,_,_,_],
        // Rows 10-11 (body + wings)
        [_,_,_,_,_,_,W,W,W,W,W,W,O,O,O,O,O,O,O,O,O,O,W,W,W,W,W,W,_,_,_,_,_,_],
        [_,_,_,_,_,_,W,W,W,W,W,W,O,O,O,O,O,O,O,O,O,O,W,W,W,W,W,W,_,_,_,_,_,_],
        // Rows 12-13 (widest body + wings)
        [_,_,_,_,W,W,W,W,W,W,O,O,O,O,O,O,O,O,O,O,O,O,O,O,W,W,W,W,W,W,_,_,_,_],
        [_,_,_,_,W,W,W,W,W,W,O,O,O,O,O,O,O,O,O,O,O,O,O,O,W,W,W,W,W,W,_,_,_,_],
        // Rows 14-15 (body)
        [_,_,_,_,_,_,W,W,W,W,O,O,O,O,O,O,O,O,O,O,O,O,O,O,W,W,W,W,_,_,_,_,_,_],
        [_,_,_,_,_,_,W,W,W,W,O,O,O,O,O,O,O,O,O,O,O,O,O,O,W,W,W,W,_,_,_,_,_,_],
        // Rows 16-17 (lower body)
        [_,_,_,_,_,_,_,_,W,W,O,O,O,O,O,O,O,O,O,O,O,O,O,O,W,W,_,_,_,_,_,_,_,_],
        [_,_,_,_,_,_,_,_,W,W,O,O,O,O,O,O,O,O,O,O,O,O,O,O,W,W,_,_,_,_,_,_,_,_],
        // Rows 18-19 (tail start)
        [_,_,_,_,_,_,_,_,_,_,_,_,O,O,O,O,O,O,O,O,O,O,_,_,_,_,_,_,_,_,_,_,_,_],
        [_,_,_,_,_,_,_,_,_,_,_,_,O,O,O,O,O,O,O,O,O,O,_,_,_,_,_,_,_,_,_,_,_,_],
        // Rows 20-21 (tail)
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,T,T,T,T,T,T,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,T,T,T,T,T,T,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        // Rows 22-23 (tail spread)
        [_,_,_,_,_,_,_,_,_,_,_,_,T,T,T,T,T,T,T,T,T,T,_,_,_,_,_,_,_,_,_,_,_,_],
        [_,_,_,_,_,_,_,_,_,_,_,_,T,T,T,T,T,T,T,T,T,T,_,_,_,_,_,_,_,_,_,_,_,_],
        // Rows 24-25 (tail tips)
        [_,_,_,_,_,_,_,_,_,_,T,T,T,T,_,_,T,T,_,_,T,T,T,T,_,_,_,_,_,_,_,_,_,_],
        [_,_,_,_,_,_,_,_,_,_,T,T,T,T,_,_,T,T,_,_,T,T,T,T,_,_,_,_,_,_,_,_,_,_],
        // Rows 26-27 (empty)
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        // Rows 28-29 (nest)
        [N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N],
        [N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N],
    ];

    // Alternative: bird flying (undocked)
    const BIRD_MAP_UNDOCKED = [
        // Rows 0-1 (empty)
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        // Rows 2-3 (top of head - beak)
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,B,B,B,B,B,B,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,B,B,B,B,B,B,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        // Rows 4-5 (beak + eye)
        [_,_,_,_,_,_,_,_,_,_,B,B,B,B,B,B,E,E,E,E,E,E,_,_,_,_,_,_,_,_,_,_,_,_],
        [_,_,_,_,_,_,_,_,_,_,B,B,B,B,B,B,E,E,E,E,E,E,_,_,_,_,_,_,_,_,_,_,_,_],
        // Rows 6-7 (head/neck - body)
        [_,_,_,_,_,_,_,_,_,_,_,_,O,O,O,O,O,O,O,O,O,O,_,_,_,_,_,_,_,_,_,_,_,_],
        [_,_,_,_,_,_,_,_,_,_,_,_,O,O,O,O,O,O,O,O,O,O,_,_,_,_,_,_,_,_,_,_,_,_],
        // Rows 8-9 (wings raised high)
        [_,_,W,W,W,W,W,W,W,W,W,W,O,O,O,O,O,O,O,O,O,O,W,W,W,W,W,W,W,W,W,W,_,_],
        [_,_,W,W,W,W,W,W,W,W,W,W,O,O,O,O,O,O,O,O,O,O,W,W,W,W,W,W,W,W,W,W,_,_],
        // Rows 10-11 (wings)
        [_,_,_,_,W,W,W,W,W,W,W,W,O,O,O,O,O,O,O,O,O,O,W,W,W,W,W,W,W,W,_,_,_,_],
        [_,_,_,_,W,W,W,W,W,W,W,W,O,O,O,O,O,O,O,O,O,O,W,W,W,W,W,W,W,W,_,_,_,_],
        // Rows 12-13 (body)
        [_,_,_,_,_,_,_,_,_,_,O,O,O,O,O,O,O,O,O,O,O,O,O,O,_,_,_,_,_,_,_,_,_,_],
        [_,_,_,_,_,_,_,_,_,_,O,O,O,O,O,O,O,O,O,O,O,O,O,O,_,_,_,_,_,_,_,_,_,_],
        // Rows 14-15 (body)
        [_,_,_,_,_,_,_,_,_,_,O,O,O,O,O,O,O,O,O,O,O,O,O,O,_,_,_,_,_,_,_,_,_,_],
        [_,_,_,_,_,_,_,_,_,_,O,O,O,O,O,O,O,O,O,O,O,O,O,O,_,_,_,_,_,_,_,_,_,_],
        // Rows 16-17 (lower body)
        [_,_,_,_,_,_,_,_,_,_,_,_,O,O,O,O,O,O,O,O,O,O,_,_,_,_,_,_,_,_,_,_,_,_],
        [_,_,_,_,_,_,_,_,_,_,_,_,O,O,O,O,O,O,O,O,O,O,_,_,_,_,_,_,_,_,_,_,_,_],
        // Rows 18-19 (tail)
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,T,T,T,T,T,T,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,T,T,T,T,T,T,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        // Rows 20-21 (tail spread)
        [_,_,_,_,_,_,_,_,_,_,_,_,T,T,T,T,T,T,T,T,T,T,_,_,_,_,_,_,_,_,_,_,_,_],
        [_,_,_,_,_,_,_,_,_,_,_,_,T,T,T,T,T,T,T,T,T,T,_,_,_,_,_,_,_,_,_,_,_,_],
        // Rows 22-23 (tail tips)
        [_,_,_,_,_,_,_,_,_,_,T,T,T,T,_,_,T,T,_,_,T,T,T,T,_,_,_,_,_,_,_,_,_,_],
        [_,_,_,_,_,_,_,_,_,_,T,T,T,T,_,_,T,T,_,_,T,T,T,T,_,_,_,_,_,_,_,_,_,_],
        // Rows 24-25 (empty space)
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        // Rows 26-27 (empty)
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
        // Rows 28-29 (nest - waiting)
        [N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N],
        [N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N,N],
    ];

    // ─── Rendering ────────────────────────────────────────────

    function getShape(part) {
        if (part === 'nest') return '~';
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
                    html += `<span class="dot nest-part" data-part="nest">~</span>`;
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
