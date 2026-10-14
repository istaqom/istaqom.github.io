// Every sound is synthesized with Web Audio at runtime, so there are no audio files and no licenses to track
(function () {
    var KEY = 'magi-sfx';
    var NOTES = [523, 659, 784, 1047, 1319, 1568];
    var ctx = null;
    var master = null;
    var enabled = true;
    try { enabled = localStorage.getItem(KEY) !== 'off'; } catch (e) {}

    function audio() {
        if (!enabled) return null;
        if (!ctx) {
            var AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            ctx = new AC();
            master = ctx.createGain();
            master.gain.value = 0.6;
            master.connect(ctx.destination);
        }
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    }

    function tone(freq, dur, o) {
        var c = audio();
        if (!c) return;
        o = o || {};
        var t = c.currentTime + (o.at || 0);
        var osc = c.createOscillator();
        var g = c.createGain();
        osc.type = o.type || 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(o.vol || 0.06, t + (o.attack || 0.005));
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(g);
        g.connect(master);
        osc.start(t);
        osc.stop(t + dur + 0.02);
    }

    var noiseBuf = null;
    function noise(dur, o) {
        var c = audio();
        if (!c) return;
        o = o || {};
        if (!noiseBuf) {
            noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
            var d = noiseBuf.getChannelData(0);
            for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        }
        var t = c.currentTime + (o.at || 0);
        var src = c.createBufferSource();
        src.buffer = noiseBuf;
        var f = c.createBiquadFilter();
        f.type = o.filter || 'bandpass';
        f.frequency.setValueAtTime(o.freq || 2000, t);
        if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + dur);
        f.Q.value = o.q || 1;
        var g = c.createGain();
        g.gain.setValueAtTime(o.vol || 0.08, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(f);
        f.connect(g);
        g.connect(master);
        src.start(t, Math.random() * 0.5);
        src.stop(t + dur);
    }

    var SOUNDS = {
        tap: function () { tone(1800, 0.03, { type: 'square', vol: 0.025 }); },
        pop: function () { tone(500, 0.08, { type: 'sine', to: 1100, vol: 0.08 }); },
        open: function () {
            noise(0.16, { freq: 700, to: 3500, vol: 0.03 });
            tone(440, 0.09, { vol: 0.05 });
            tone(660, 0.12, { at: 0.06, vol: 0.05 });
        },
        minimize: function () {
            noise(0.18, { freq: 3500, to: 600, vol: 0.03 });
            tone(660, 0.12, { to: 330, vol: 0.05 });
        },
        close: function () {
            tone(330, 0.12, { to: 160, vol: 0.06 });
            noise(0.07, { filter: 'lowpass', freq: 900, vol: 0.06 });
        },
        maximize: function () { tone(520, 0.09, { to: 900, vol: 0.05 }); },
        restore: function () { tone(900, 0.09, { to: 520, vol: 0.05 }); },
        desk: function (forward) {
            noise(0.25, forward ? { freq: 500, to: 4000, q: 0.7, vol: 0.045 } : { freq: 4000, to: 500, q: 0.7, vol: 0.045 });
            tone(forward ? 392 : 523, 0.1, { at: 0.08, vol: 0.035 });
            tone(forward ? 523 : 392, 0.12, { at: 0.15, vol: 0.035 });
        },
        menuOpen: function () {
            tone(700, 0.05, { vol: 0.045 });
            tone(1050, 0.07, { at: 0.04, vol: 0.045 });
        },
        menuClose: function () {
            tone(1050, 0.05, { vol: 0.04 });
            tone(700, 0.07, { at: 0.04, vol: 0.04 });
        },
        overview: function () {
            noise(0.3, { freq: 400, to: 2500, q: 0.6, vol: 0.035 });
            [392, 494, 587].forEach(function (f, i) { tone(f, 0.3, { at: 0.05 + i * 0.03, type: 'sine', vol: 0.03 }); });
        },
        deny: function () {
            tone(160, 0.16, { type: 'square', vol: 0.04 });
            tone(120, 0.2, { type: 'square', at: 0.1, vol: 0.04 });
        },
        ding: function () {
            tone(1320, 0.25, { type: 'sine', vol: 0.06 });
            tone(1760, 0.35, { type: 'sine', at: 0.08, vol: 0.045 });
        },
        plug: function () {
            noise(0.04, { filter: 'highpass', freq: 3000, vol: 0.06 });
            tone(220, 0.08, { type: 'square', to: 440, vol: 0.03, at: 0.02 });
        },
        boing: function () {
            tone(200, 0.12, { type: 'sine', to: 520, vol: 0.08 });
            tone(520, 0.22, { type: 'sine', at: 0.1, to: 240, vol: 0.07 });
        },
        key: function () { noise(0.025, { filter: 'highpass', freq: 2500 + Math.random() * 2000, vol: 0.05 }); },
        enter: function () {
            noise(0.06, { freq: 1400, vol: 0.08 });
            tone(2000, 0.06, { type: 'sine', at: 0.03, vol: 0.025 });
        },
        tick: function () { tone(1500, 0.03, { vol: 0.04 }); },
        blip: function (n) { tone(260 + (n || 0) * 35, 0.08, { type: 'square', vol: 0.025 }); },
        shuffle: function () {
            for (var i = 0; i < 3; i++) tone(NOTES[Math.floor(Math.random() * NOTES.length)], 0.07, { at: i * 0.05, vol: 0.04 });
        },
        reveal: function (tier) {
            var n = Math.min((tier || 0) + 2, NOTES.length);
            for (var i = 0; i < n; i++) tone(NOTES[i], 0.3, { at: i * 0.07, type: tier >= 3 ? 'square' : 'triangle', vol: tier >= 3 ? 0.035 : 0.05 });
        },
        glitch: function () {
            for (var i = 0; i < 8; i++) {
                var at = Math.random() * 0.6;
                noise(0.05, { at: at, freq: 300 + Math.random() * 3000, q: 4, vol: 0.07 });
                tone(80 + Math.random() * 900, 0.04, { at: at, type: 'sawtooth', vol: 0.03 });
            }
        },
        alarm: function () {
            for (var i = 0; i < 3; i++) {
                tone(880, 0.18, { at: i * 0.45, type: 'sawtooth', vol: 0.03 });
                tone(660, 0.18, { at: i * 0.45 + 0.2, type: 'sawtooth', vol: 0.03 });
            }
        },
        boot: function () {
            [262, 330, 392, 523].forEach(function (f, i) { tone(f, 0.5, { at: i * 0.12, vol: 0.045 }); });
        },
        fail: function () {
            tone(392, 0.12, { type: 'square', vol: 0.03 });
            tone(277, 0.25, { type: 'square', at: 0.12, vol: 0.03 });
        }
    };

    var last = {};
    function play(name, arg) {
        if (!enabled || !SOUNDS[name]) return;
        var now = Date.now();
        if (now - (last[name] || 0) < 40) return;
        last[name] = now;
        SOUNDS[name](arg);
    }

    // Clicks on elements owned by other modules; first match wins
    var CLICKS = [
        ['.taskbar-sfx, [data-ml-shuffle], .task-item, .pager-cell, .start-btn, .win-btn, .start-menu-item, .ov-desk, .ov-win', null],
        ['.ov-add', 'deny'],
        ['[data-dac-src], [data-dac-out]', 'plug'],
        ['[data-spot-shuffle]', 'shuffle'],
        ['.ytm-row, [data-fact-next]', 'pop'],
        ['.li-avatar-wrap, .me-wrap', 'boing'],
        ['.term-copy', 'ding'],
        ['.ml-case-close', 'menuClose'],
        ['.cert-filter, .ml-src, .ml-album, .ml-chip, .kick-cat, .taskbar-clock, .cal-btn, .cal-title, .np-btn, .taskbar-arrow, .lib-fact-next', 'tap']
    ];

    document.addEventListener('click', function (e) {
        if (!enabled || !e.target.closest) return;
        var bar = e.target.closest('.ytm-hours li');
        if (bar) {
            play('blip', Array.prototype.indexOf.call(bar.parentNode.children, bar));
            return;
        }
        for (var i = 0; i < CLICKS.length; i++) {
            if (e.target.closest(CLICKS[i][0])) {
                if (CLICKS[i][1]) play(CLICKS[i][1]);
                return;
            }
        }
    });

    document.addEventListener('keydown', function (e) {
        if (!enabled || !e.target.closest || !e.target.closest('.term-input')) return;
        if (e.key === 'Enter') play('enter');
        else if (e.key.length === 1 || e.key === 'Backspace') play('key');
    });

    var toggle = document.querySelector('.taskbar-sfx');
    function sync() {
        if (!toggle) return;
        toggle.setAttribute('aria-pressed', String(enabled));
        toggle.title = enabled ? 'Sound effects: on' : 'Sound effects: off';
    }
    if (toggle) {
        sync();
        toggle.addEventListener('click', function () {
            enabled = !enabled;
            try { localStorage.setItem(KEY, enabled ? 'on' : 'off'); } catch (e) {}
            sync();
            play('ding');
        });
    }

    window.SFX = { play: play };
})();
