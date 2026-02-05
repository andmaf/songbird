// Bird Log - ASCII Art Definitions + Rendering Engine
// Renders a bird (docked in nest or perched) with clickable body-part regions.

const BirdArt = (() => {

    // ─── Part state definitions ─────────────────────────────────
    const PARTS = {
        beak:  { names: ['short-pointed','long-curved','wide-open','serrated','hooked'], current: 0 },
        eye:   { names: ['dot','wide','half','wink','star'],                             current: 0 },
        body:  { names: ['plain','striped','dotted','chevron','fluffy'],                  current: 0 },
        wings: { names: ['tucked','spread','raised','folded','flapping'],                 current: 0 },
        tail:  { names: ['short','fanned','long','forked','curled'],                      current: 0 },
    };

    // ─── ASCII art fragments for each part variant ──────────────
    // Every fragment is an array of strings, all the same width within a part.

    const BEAK_ART = [
        // 0 short-pointed
        ['/v\\'],
        // 1 long-curved
        ['/~~>'],
        // 2 wide-open
        ['/V\\'],
        // 3 serrated
        ['/w\\'],
        // 4 hooked
        ['/j '],
    ];

    const EYE_ART = [
        // 0 dot
        ['(.)'],
        // 1 wide
        ['(O)'],
        // 2 half
        ['(-)'],
        // 3 wink
        ['(^)'],
        // 4 star
        ['(*)'],
    ];

    // Body is 3 lines wide (the central mass of the bird)
    const BODY_ART = [
        // 0 plain
        ['(     )',
         '(     )',
         '(     )'],
        // 1 striped
        ['(=====)',
         '(=====)',
         '(=====)'],
        // 2 dotted
        ['(.. ..)',
         '(. . .)',
         '(.. ..)'],
        // 3 chevron
        ['(>>>>>)',
         '(<<<<<)',
         '(>>>>>)'],
        // 4 fluffy
        ['({*~*})',
         '({~*~})',
         '({*~*})'],
    ];

    // Wings sit on either side of the body rows
    const WINGS_LEFT = [
        // 0 tucked
        ['  ',
         '  ',
         '  '],
        // 1 spread
        ['__',
         '~~',
         '  '],
        // 2 raised
        ['/\\',
         '||',
         '  '],
        // 3 folded
        ['>\\',
         '> ',
         '  '],
        // 4 flapping
        ['^~',
         ' ~',
         '  '],
    ];

    const WINGS_RIGHT = [
        // 0 tucked
        ['  ',
         '  ',
         '  '],
        // 1 spread
        ['__',
         '~~',
         '  '],
        // 2 raised
        ['/\\',
         '||',
         '  '],
        // 3 folded
        ['/< ',
         ' < ',
         '   '],
        // 4 flapping
        ['~^',
         '~ ',
         '  '],
    ];

    const TAIL_ART = [
        // 0 short
        ['||'],
        // 1 fanned
        ['\\|/'],
        // 2 long
        ['|||'],
        // 3 forked
        ['/ \\'],
        // 4 curled
        ['~|~'],
    ];

    // Static nest art (bottom)
    const NEST = [
        '  ~~~===\\][/===~~~  ',
        '  ~~~~~========~~~  ',
    ];

    const NEST_EMPTY = [
        '  ~~~====][====~~~  ',
        '  ~~~~~========~~~  ',
    ];

    // ─── Perched (undocked) bird ─────────────────────────────────
    const PERCH = [
        '        |',
        '  ~~~~~~|~~~~~~  ',
    ];

    // ─── Rendering ──────────────────────────────────────────────

    function span(part, text) {
        return `<span class="bird-part" data-part="${part}">${escapeHtml(text)}</span>`;
    }

    function escapeHtml(s) {
        return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    function pad(s, len, char) {
        char = char || ' ';
        while (s.length < len) s += char;
        return s;
    }

    function center(s, width) {
        const left = Math.floor((width - s.length) / 2);
        return ' '.repeat(Math.max(0, left)) + s;
    }

    // Raw text length (without HTML tags)
    function rawLen(html) {
        return html.replace(/<[^>]*>/g, '').length;
    }

    function centerHtml(html, width) {
        const len = rawLen(html);
        const left = Math.floor((width - len) / 2);
        return ' '.repeat(Math.max(0, left)) + html;
    }

    // Build the docked bird (in nest) as an array of HTML lines
    function renderDocked() {
        const W = 40; // canvas width
        const b  = PARTS.beak.current;
        const e  = PARTS.eye.current;
        const bo = PARTS.body.current;
        const w  = PARTS.wings.current;
        const t  = PARTS.tail.current;

        const lines = [];

        // --- Stars above ---
        lines.push(centerHtml('.  *  .', W));

        // --- Head line: beak + eye ---
        const headRaw = '_' + BEAK_ART[b][0] + '_ ' + EYE_ART[e][0];
        const headHtml = '_' + span('beak', BEAK_ART[b][0]) + '_ ' + span('eye', EYE_ART[e][0]);
        lines.push(centerHtml(headHtml, W));

        // --- Body rows with wings ---
        const bodyRows = BODY_ART[bo];
        const wl = WINGS_LEFT[w];
        const wr = WINGS_RIGHT[w];
        for (let i = 0; i < 3; i++) {
            const leftWing  = wl[i];
            const rightWing = wr[i];
            const bodyRow   = bodyRows[i];

            const rowHtml =
                span('wings', leftWing) +
                span('body',  bodyRow) +
                span('wings', rightWing);

            lines.push(centerHtml(rowHtml, W));
        }

        // --- Tail ---
        const tailHtml = span('tail', TAIL_ART[t][0]);
        lines.push(centerHtml(tailHtml, W));

        // --- Nest ---
        NEST.forEach(row => {
            lines.push(centerHtml('<span class="nest-part">' + escapeHtml(row) + '</span>', W));
        });

        return lines.join('\n');
    }

    // Build the undocked bird (perched, away from nest)
    function renderUndocked() {
        const W = 40;
        const b  = PARTS.beak.current;
        const e  = PARTS.eye.current;
        const bo = PARTS.body.current;
        const w  = PARTS.wings.current;
        const t  = PARTS.tail.current;

        const lines = [];

        // Bird up high
        lines.push(centerHtml('.  ~  .', W));

        const headHtml = '_' + span('beak', BEAK_ART[b][0]) + '_ ' + span('eye', EYE_ART[e][0]);
        lines.push(centerHtml(headHtml, W));

        const bodyRows = BODY_ART[bo];
        const wl = WINGS_LEFT[w];
        const wr = WINGS_RIGHT[w];
        for (let i = 0; i < 3; i++) {
            const rowHtml =
                span('wings', wl[i]) +
                span('body',  bodyRows[i]) +
                span('wings', wr[i]);
            lines.push(centerHtml(rowHtml, W));
        }

        const tailHtml = span('tail', TAIL_ART[t][0]);
        lines.push(centerHtml(tailHtml, W));

        // Perch
        PERCH.forEach(row => {
            lines.push(centerHtml(escapeHtml(row), W));
        });

        // Spacer
        lines.push('');

        // Empty nest below
        NEST_EMPTY.forEach(row => {
            lines.push(centerHtml('<span class="nest-part">' + escapeHtml(row) + '</span>', W));
        });

        return lines.join('\n');
    }

    // ─── Public API ──────────────────────────────────────────────

    function cyclePart(partName) {
        const part = PARTS[partName];
        if (!part) return -1;
        part.current = (part.current + 1) % part.names.length;
        return part.current;
    }

    function getPartState(partName) {
        return PARTS[partName] ? PARTS[partName].current : 0;
    }

    function getPartLabel(partName) {
        const part = PARTS[partName];
        if (!part) return '';
        return part.names[part.current];
    }

    function render(docked) {
        return docked ? renderDocked() : renderUndocked();
    }

    return { PARTS, render, cyclePart, getPartState, getPartLabel };
})();
