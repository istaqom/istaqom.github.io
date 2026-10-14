(function () {
    var np = document.querySelector('#win-music');
    if (!np) return;

    var items = Array.prototype.slice.call(np.querySelectorAll('.np-item'));
    var cover = np.querySelector('[data-np-cover]');
    var label = np.querySelector('[data-np-label]');
    var title = np.querySelector('[data-np-title]');
    var artist = np.querySelector('[data-np-artist]');
    var meta = np.querySelector('[data-np-meta]');
    var index = np.querySelector('[data-np-index]');
    var link = np.querySelector('[data-np-link]');
    var embed = np.querySelector('[data-np-embed]');
    var hit = np.querySelector('[data-np-hit]');
    var bar = np.querySelector('[data-np-bar]');
    var stateText = np.querySelector('[data-np-state]');
    var quip = np.querySelector('[data-np-quip]');
    var trackList = np.querySelector('[data-np-tracks]');
    var trackTotal = np.querySelector('[data-np-total]');
    var current = 0;
    var currentTrack = 0;
    var tracks = [];
    var frame;
    var state = 'idle';
    var elapsed = 0;
    var lastTick = 0;
    var timer = null;
    var quipTimer = null;
    var tabbedAt = 0;

    var PAUSE_QUIPS = [
        'Hey, that was the good part.',
        'The disc went back in its sleeve. Sulking.',
        'Paused. The artist still got paid, at least.',
        'Taking five? The record waits.',
        'Paused at {t}. I\'ll remember that.'
    ];
    var RESUME_QUIPS = ['Back at it.', 'Where were we?', 'Ah, much better.'];
    var END_QUIPS = ['That\'s the record. Flip it over?', 'Fin. Hit play to go again.'];

    function mmss(sec) {
        sec = Math.floor(sec);
        return Math.floor(sec / 60) + ':' + ('0' + (sec % 60)).slice(-2);
    }

    function pick(list) {
        return list[Math.floor(Math.random() * list.length)];
    }

    function say(text) {
        clearTimeout(quipTimer);
        quip.textContent = text.replace('{t}', mmss(elapsed));
        quip.hidden = false;
        quip.classList.remove('is-in');
        void quip.offsetWidth;
        quip.classList.add('is-in');
        quipTimer = setTimeout(function () { quip.hidden = true; }, 3500);
    }

    function render() {
        var len = tracks[currentTrack] ? tracks[currentTrack][1] : 0;
        np.classList.toggle('is-playing', state === 'playing');
        np.classList.toggle('is-paused', state === 'paused');
        bar.style.width = len ? Math.min(100, elapsed / len * 100) + '%' : '0';
        if (state === 'playing') stateText.textContent = 'Playing ' + mmss(elapsed) + ' / ' + mmss(len);
        else if (state === 'paused') stateText.textContent = 'Paused at ' + mmss(elapsed);
        else if (state === 'ended') stateText.textContent = 'Finished';
        else stateText.textContent = 'From my Bandcamp';
    }

    // Track lengths are known, so the clock can follow along and advance the tracklist
    function tick() {
        var now = Date.now();
        elapsed += (now - lastTick) / 1000;
        lastTick = now;
        if (tracks[currentTrack] && elapsed >= tracks[currentTrack][1]) {
            elapsed = 0;
            if (currentTrack + 1 < tracks.length) {
                currentTrack++;
                markTrack();
            } else {
                setState('ended');
                say(pick(END_QUIPS));
                return;
            }
        }
        render();
    }

    function setState(next) {
        var prev = state;
        state = next;
        clearInterval(timer);
        timer = null;
        if (next === 'playing') {
            if (prev === 'ended') { elapsed = 0; currentTrack = 0; markTrack(); }
            lastTick = Date.now();
            timer = setInterval(tick, 500);
        }
        if (next === 'idle') elapsed = 0;
        render();
    }

    function embedSrc(item) {
        var isAlbum = item.dataset.embed.indexOf('album=') === 0;
        return 'https://bandcamp.com/EmbeddedPlayer/' + item.dataset.embed +
            (isAlbum ? '/t=' + (currentTrack + 1) : '') +
            '/size=small/bgcol=ffffff/linkcol=e67e22/artwork=none/transparent=true/autoplay=true/';
    }

    function loadEmbed() {
        var item = items[current];
        setState('idle');
        if (frame) frame.remove();
        frame = document.createElement('iframe');
        frame.src = embedSrc(item);
        frame.title = 'Bandcamp player: ' + item.textContent.trim();
        frame.setAttribute('allow', 'autoplay');
        frame.setAttribute('loading', 'lazy');
        frame.setAttribute('seamless', '');
        embed.insertBefore(frame, embed.firstChild);
    }

    function markTrack() {
        Array.prototype.forEach.call(trackList.children, function (li, j) {
            li.classList.toggle('is-current', j === currentTrack);
        });
    }

    // The player is cross-origin with no events. The overlay link covers everything but its
    // play button, so focus landing in the iframe from a click means play/pause was pressed.
    // Focus is handed back afterwards so the next click is caught too.
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Tab') tabbedAt = Date.now();
    });
    window.addEventListener('blur', function () {
        setTimeout(function () {
            if (document.activeElement !== frame) return;
            if (Date.now() - tabbedAt < 500) return;
            if (state === 'playing') {
                setState('paused');
                say(pick(PAUSE_QUIPS));
            } else {
                if (state === 'paused') say(pick(RESUME_QUIPS));
                setState('playing');
            }
            setTimeout(function () {
                if (document.activeElement === frame) embed.focus({ preventScroll: true });
            }, 300);
        }, 0);
    });

    function renderTracks(item) {
        tracks = JSON.parse(item.dataset.tracks);
        var total = 0;
        trackList.textContent = '';
        tracks.forEach(function (t, j) {
            total += t[1];
            var li = document.createElement('li');
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.innerHTML = '<span class="np-tn"></span><span class="np-tt"></span><span class="np-td"></span>';
            btn.children[0].textContent = j + 1;
            btn.children[1].textContent = t[0];
            btn.children[2].textContent = mmss(t[1]);
            btn.addEventListener('click', function () {
                currentTrack = j;
                markTrack();
                loadEmbed();
            });
            li.appendChild(btn);
            trackList.appendChild(li);
        });
        trackTotal.textContent = tracks.length + (tracks.length === 1 ? ' track · ' : ' tracks · ') + Math.round(total / 60) + ' min';
        markTrack();
    }

    function select(i) {
        current = (i + items.length) % items.length;
        currentTrack = 0;
        var item = items[current];
        renderTracks(item);
        var src = item.querySelector('img').getAttribute('src');
        items.forEach(function (it, j) {
            it.classList.toggle('is-active', j === current);
            it.setAttribute('aria-current', j === current ? 'true' : 'false');
        });
        cover.src = src;
        label.src = src;
        title.textContent = item.querySelector('span').textContent;
        artist.textContent = item.dataset.artist;
        meta.textContent = item.dataset.meta;
        index.textContent = (current + 1) + ' / ' + items.length;
        link.href = item.dataset.url;
        hit.href = item.dataset.url;
        quip.hidden = true;
        np.classList.remove('is-swapping');
        void np.offsetWidth;
        np.classList.add('is-swapping');
        loadEmbed();
    }

    items.forEach(function (item, i) {
        item.addEventListener('click', function () { select(i); });
    });
    np.querySelector('[data-np-prev]').addEventListener('click', function () { select(current - 1); });
    np.querySelector('[data-np-next]').addEventListener('click', function () { select(current + 1); });
    np.addEventListener('animationend', function (e) {
        if (e.animationName === 'np-swap') np.classList.remove('is-swapping');
    });
    renderTracks(items[0]);
    loadEmbed();
})();

(function () {
    Array.prototype.forEach.call(document.querySelectorAll('.lib-fact'), function (box) {
        var facts = Array.prototype.slice.call(box.querySelectorAll('.lib-facts li'));
        var next = box.querySelector('[data-fact-next]');
        var counter = box.querySelector('[data-fact-n]');
        if (!facts.length || !next) return;
        var shown = 0;
        next.addEventListener('click', function () {
            facts[shown].hidden = true;
            shown = (shown + 1) % facts.length;
            facts[shown].hidden = false;
            counter.textContent = (shown + 1) + ' / ' + facts.length;
        });
    });
})();

(function () {
    var games = Array.prototype.slice.call(document.querySelectorAll('.steam-game'));
    games.forEach(function (g) {
        var bar = g.querySelector('.steam-bar');
        var label = document.createElement('span');
        label.className = 'steam-ach';
        if (!g.dataset.ach) {
            label.textContent = g.dataset.achNote || 'No Steam achievements';
            g.classList.add('is-no-ach');
        } else {
            var parts = g.dataset.ach.split('/').map(Number);
            var pct = Math.round(parts[0] / parts[1] * 100);
            label.textContent = parts[0].toLocaleString('en') + ' of ' + parts[1].toLocaleString('en') +
                (parts[1] === 1 ? ' achievement · ' : ' achievements · ') + (pct === 100 ? 'perfect' : pct + '%');
            bar.querySelector('span').style.width = Math.max(pct, 1) + '%';
            g.classList.toggle('is-perfect', pct === 100);
        }
        bar.parentNode.insertBefore(label, bar);
    });
})();

(function () {
    var root = document.querySelector('#win-tracks');
    var data = window.MUSIC_LIBRARY;
    if (!root || !data) return;

    var search = root.querySelector('[data-ml-search]');
    var sourcesEl = root.querySelector('[data-ml-sources]');
    var sortEl = root.querySelector('[data-ml-sort]');
    var status = root.querySelector('[data-ml-status]');
    var list = root.querySelector('[data-ml-albums]');
    var detail = root.querySelector('[data-ml-detail]');
    var shuffle = root.querySelector('[data-ml-shuffle]');

    var SOURCES = [['Steam', 'steam'], ['iTunes', 'itunes'], ['CD', 'cd'], ['Bandcamp', 'bandcamp'], ['Ototoy', 'ototoy']];
    var SRC_CLASS = {};
    SOURCES.forEach(function (s) { SRC_CLASS[s[0]] = 'is-' + s[1]; });

    var query = '';
    var source = '';
    var shown = [];
    var selected = data[0];
    var flash = -1;

    data.forEach(function (a) {
        a.total = a.tracks.reduce(function (n, t) { return n + t[1]; }, 0);
        a.formats = a.tracks.map(function (t) { return t[2]; }).filter(function (f, i, arr) { return arr.indexOf(f) === i; });
        a.hires = a.tracks.some(function (t) { return t[3] > 16 || t[4] > 441; });
        a.hay = (a.album + ' ' + a.artist).toLowerCase();
    });

    function hours(sec) {
        return sec >= 3600 ? (sec / 3600).toFixed(1) + ' h' : Math.round(sec / 60) + ' min';
    }

    function mmss(sec) {
        return Math.floor(sec / 60) + ':' + ('0' + (sec % 60)).slice(-2);
    }

    function initials(text) {
        var words = text.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/);
        var chars = Array.from(words[0] || '?');
        return (words.length > 1 ? chars[0] + Array.from(words[1])[0] : chars.slice(0, 2).join('')).toUpperCase();
    }

    // Wraps the first match in <mark> without touching innerHTML
    function fill(el, text) {
        el.textContent = '';
        var i = query ? text.toLowerCase().indexOf(query) : -1;
        if (i < 0) { el.textContent = text; return; }
        var mark = document.createElement('mark');
        mark.textContent = text.slice(i, i + query.length);
        el.append(text.slice(0, i), mark, text.slice(i + query.length));
    }

    function el(tag, cls, text) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text !== undefined) n.textContent = text;
        return n;
    }

    function hits(a) {
        if (!query || a.hay.indexOf(query) >= 0) return null;
        return a.tracks.reduce(function (out, t, i) {
            if ((t[0] + ' ' + (t[5] || '')).toLowerCase().indexOf(query) >= 0) out.push(i);
            return out;
        }, []);
    }

    function sorted(arr) {
        var mode = sortEl.value;
        return arr.slice().sort(function (a, b) {
            if (mode === 'new') return (b.year || '0').localeCompare(a.year || '0');
            if (mode === 'old') return (a.year || '9999').localeCompare(b.year || '9999');
            if (mode === 'size') return b.tracks.length - a.tracks.length;
            return a.artist.localeCompare(b.artist, undefined, { sensitivity: 'base' });
        });
    }

    function renderSources() {
        var counts = { '': 0 };
        data.forEach(function (a) {
            counts[a.src] = (counts[a.src] || 0) + a.tracks.length;
            counts[''] += a.tracks.length;
        });
        [['', 'All']].concat(SOURCES).forEach(function (s) {
            var b = el('button', 'ml-src' + (s[0] ? ' is-' + s[1] : ''));
            b.type = 'button';
            b.dataset.src = s[0];
            b.setAttribute('aria-pressed', s[0] === source ? 'true' : 'false');
            b.append(s[0] || 'All', ' ', el('span', '', counts[s[0]]));
            b.addEventListener('click', function () {
                source = s[0];
                Array.prototype.forEach.call(sourcesEl.children, function (c) {
                    c.setAttribute('aria-pressed', c === b ? 'true' : 'false');
                });
                render();
            });
            sourcesEl.appendChild(b);
        });
    }

    function art(a, extra) {
        var tile = el('span', 'ml-art' + extra + ' ' + SRC_CLASS[a.src]);
        tile.title = a.src;
        if (!a.img) {
            tile.textContent = initials(a.album);
            return tile;
        }
        var img = el('img');
        img.src = 'img/music/' + a.img + '.webp';
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.onerror = function () { tile.textContent = initials(a.album); };
        tile.appendChild(img);
        return tile;
    }

    function albumChips(albums) {
        var ul = el('ul', 'ml-chips');
        albums.forEach(function (o) {
            var b = el('button', 'ml-chip');
            b.type = 'button';
            b.append(art(o, ''),
                el('span', 'ml-name', o.album), el('span', 'ml-n', o.year));
            b.addEventListener('click', function () {
                if (shown.indexOf(o) < 0) {
                    query = '';
                    search.value = '';
                    source = '';
                    Array.prototype.forEach.call(sourcesEl.children, function (c) {
                        c.setAttribute('aria-pressed', c.dataset.src === '' ? 'true' : 'false');
                    });
                    selected = o;
                    render();
                } else {
                    select(o);
                }
                var li = Array.prototype.find.call(list.children, function (n) { return n.album === o; });
                if (li) list.scrollTop = li.offsetTop - list.clientHeight / 2;
            });
            var item = el('li');
            item.appendChild(b);
            ul.appendChild(item);
        });
        return ul;
    }

    function renderDetail() {
        detail.textContent = '';
        if (!selected) {
            detail.appendChild(el('p', 'ml-empty', 'Nothing matches. Maybe it lives on YouTube Music.'));
            return;
        }
        var a = selected;
        var matched = hits(a) || [];
        var head = el('div', 'ml-head ' + SRC_CLASS[a.src]);
        var backdrop = el('span', 'ml-backdrop');
        if (a.img) backdrop.style.backgroundImage = "url('img/music/" + a.img + ".webp')";
        var sleeve = el('div', 'ml-sleeve');
        sleeve.append(el('span', 'ml-disc'), art(a, ' is-big'));
        head.append(backdrop, sleeve);
        var info = el('div', 'ml-head-info');
        var tags = el('p', 'ml-tags');
        tags.appendChild(el('span', 'lib-tag ' + SRC_CLASS[a.src], a.src));
        a.formats.forEach(function (f) { tags.appendChild(el('span', 'lib-tag is-' + f.toLowerCase(), f)); });
        if (a.hires) tags.appendChild(el('span', 'lib-tag is-24', 'Hi-res'));
        var title = el('h3', 'ml-title');
        fill(title, a.album);
        var by = el('p', 'ml-by');
        fill(by, a.artist);
        info.append(tags, title, by, el('p', 'ml-meta', [a.year || 'Year unknown', a.tracks.length + (a.tracks.length === 1 ? ' track' : ' tracks'), hours(a.total)].join(' · ')));
        head.appendChild(info);
        detail.appendChild(head);

        var cols = el('div', 'ml-tracks-head');
        cols.setAttribute('aria-hidden', 'true');
        ['#', 'title', 'format', 'time'].forEach(function (c) { cols.appendChild(el('span', '', c)); });
        detail.appendChild(cols);

        var longest = Math.max.apply(null, a.tracks.map(function (t) { return t[1]; }));
        var ol = el('ol', 'ml-tracks');
        a.tracks.forEach(function (t, i) {
            var li = el('li', matched.indexOf(i) >= 0 ? 'is-hit' : '');
            li.style.setProperty('--d', (t[1] / longest).toFixed(3));
            if (i === flash) li.classList.add('is-flash');
            var name = el('span', 'ml-tt');
            var tt = el('span');
            fill(tt, t[0]);
            name.appendChild(tt);
            if (t[5]) {
                var ta = el('small');
                fill(ta, t[5]);
                name.appendChild(ta);
            }
            var spec = el('span', 'ml-spec' + (t[3] > 16 || t[4] > 441 ? ' is-hires' : ''),
                t[2] + (t[3] ? ' ' + t[3] + '/' + (t[4] / 10) : ''));
            li.append(el('span', 'ml-tn', i + 1), name, spec, el('span', 'ml-td', mmss(t[1])));
            ol.appendChild(li);
        });
        detail.appendChild(ol);

        var more = data.filter(function (o) { return o !== a && o.artist === a.artist; });
        var pos = shown.indexOf(a);
        var next = shown.length > 1 ? shown[(pos + 1) % shown.length] : null;
        var extra = el('div', 'ml-more');
        if (more.length) {
            extra.appendChild(el('p', 'lib-h', 'More from ' + a.artist));
            extra.appendChild(albumChips(more));
        } else {
            extra.appendChild(el('p', 'ml-solo', 'The only ' + a.artist + ' record on the disk.'));
        }
        if (next && more.indexOf(next) < 0) {
            extra.appendChild(el('p', 'lib-h', 'Next on the shelf'));
            extra.appendChild(albumChips([next]));
        }
        detail.appendChild(extra);
        detail.scrollTop = 0;
        var target = ol.querySelector('.is-flash') || ol.querySelector('.is-hit');
        if (target) detail.scrollTop = target.offsetTop - detail.clientHeight / 2;
    }

    function select(a) {
        selected = a;
        flash = -1;
        Array.prototype.forEach.call(list.children, function (li) {
            li.firstChild.setAttribute('aria-current', li.album === a ? 'true' : 'false');
        });
        renderDetail();
    }

    function render() {
        shown = sorted(data.filter(function (a) {
            if (source && a.src !== source) return false;
            var h = hits(a);
            return !h || h.length > 0;
        }));
        list.textContent = '';
        var trackCount = 0;
        var secs = 0;
        shown.forEach(function (a) {
            var h = hits(a);
            trackCount += h ? h.length : a.tracks.length;
            secs += a.total;
            var li = el('li');
            li.album = a;
            var b = el('button', 'ml-album ' + SRC_CLASS[a.src]);
            b.type = 'button';
            b.setAttribute('aria-current', a === selected ? 'true' : 'false');
            var name = el('span', 'ml-name');
            fill(name, a.album);
            var by = el('span', 'ml-by');
            fill(by, a.artist);
            var text = el('span', 'ml-text');
            text.append(name, by);
            b.append(el('span', 'ml-disc'), art(a, ''), text,
                el('span', 'ml-n' + (h ? ' is-hit' : ''), h ? h.length + (h.length === 1 ? ' hit' : ' hits') : a.tracks.length));
            b.addEventListener('click', function () { select(a); });
            li.appendChild(b);
            list.appendChild(li);
        });
        if (shown.indexOf(selected) < 0) selected = shown[0];
        if (query || source) {
            status.textContent = shown.length
                ? shown.length + (shown.length === 1 ? ' album, ' : ' albums, ') + trackCount + (trackCount === 1 ? ' track' : ' tracks') + (query ? ' matching "' + search.value.trim() + '"' : '')
                : 'No matches.';
        } else {
            status.textContent = shown.length + ' albums · ' + trackCount + ' tracks · ' + hours(secs) + ' of music';
        }
        select(selected);
    }

    var debounce;
    search.addEventListener('input', function () {
        clearTimeout(debounce);
        debounce = setTimeout(function () {
            query = search.value.trim().toLowerCase();
            render();
        }, 120);
    });
    sortEl.addEventListener('change', render);

    // CS2 case odds; rarity comes from audio quality, wear from release year
    var TIERS = [
        { name: 'Mil-Spec', c: '#4b69ff', odds: 79.92, what: 'lossy M4A' },
        { name: 'Restricted', c: '#8847ff', odds: 15.98, what: '16-bit lossless' },
        { name: 'Classified', c: '#d32ce6', odds: 3.2, what: '24-bit' },
        { name: 'Covert', c: '#eb4b4b', odds: 0.64, what: '24-bit, 88.2 kHz+' },
        { name: '★ Rare Special', c: '#e4ae39', odds: 0.26, what: 'physical CD rip' }
    ];
    var WEAR = [[2020, 'Factory New', 0, 0.07], [2015, 'Minimal Wear', 0.07, 0.15], [2008, 'Field-Tested', 0.15, 0.38], [2000, 'Well-Worn', 0.38, 0.45], [0, 'Battle-Scarred', 0.45, 1]];
    var WIN_AT = 50;
    var caseEl = root.querySelector('[data-ml-case]');
    var shuffleLabel = shuffle.querySelector('span');
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    var reel, strip, result;
    var spinning = false;

    var ytPlays = {};
    var yt = window.YTM_ARTISTS || {};
    function key(s) { return s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''); }
    Object.keys(yt).forEach(function (k) {
        ytPlays[key(k)] = yt[k].reduce(function (n, t) { return n + t[2]; }, 0);
    });

    function tier(a, t) {
        if (a.src === 'CD') return 4;
        if (t[3] >= 24 && t[4] >= 882) return 3;
        if (t[3] >= 24) return 2;
        return t[2] === 'M4A' ? 0 : 1;
    }

    function wear(a) {
        var y = +a.year || 2008;
        var w = WEAR.filter(function (x) { return y >= x[0]; })[0];
        return w[1] + ' · ' + (w[2] + Math.random() * (w[3] - w[2])).toFixed(4);
    }

    function roll(pool) {
        var tiers = TIERS.map(function (_, k) { return pool.filter(function (e) { return e.tier === k; }); });
        var open = TIERS.filter(function (_, k) { return tiers[k].length; });
        var r = Math.random() * open.reduce(function (n, t) { return n + t.odds; }, 0);
        var k = TIERS.indexOf(open[open.length - 1]);
        for (var j = 0; j < open.length; j++) {
            r -= open[j].odds;
            if (r <= 0) { k = TIERS.indexOf(open[j]); break; }
        }
        return tiers[k][Math.floor(Math.random() * tiers[k].length)];
    }

    function sfx(name, arg) {
        if (window.SFX) window.SFX.play(name, arg);
    }

    function buildCase() {
        var head = el('div', 'ml-case-head');
        var close = el('button', 'ml-case-close', '×');
        close.type = 'button';
        close.setAttribute('aria-label', 'Close the case');
        close.addEventListener('click', function () { if (!spinning) caseEl.hidden = true; });
        head.append(el('p', 'ml-case-title', '~/Music case'),
            el('p', 'ml-case-sub', 'real CS2 odds. rarity = audio quality, wear = release year.'), close);
        reel = el('div', 'ml-reel');
        reel.setAttribute('aria-hidden', 'true');
        strip = el('div', 'ml-strip');
        reel.appendChild(strip);
        result = el('p', 'ml-case-result');
        result.setAttribute('aria-live', 'polite');
        var odds = el('ul', 'ml-case-odds');
        TIERS.forEach(function (t) {
            var li = el('li');
            li.style.setProperty('--r', t.c);
            li.append(el('b', '', t.name), ' ' + t.what + ' · ' + t.odds + '%');
            odds.appendChild(li);
        });
        caseEl.append(head, reel, result, odds);
    }

    function caseArt(a) {
        var tile = art(a, ' is-case');
        var img = tile.querySelector('img');
        if (img) img.loading = 'eager';
        return tile;
    }

    function item(e) {
        var d = el('div', 'ml-case-item');
        d.style.setProperty('--r', TIERS[e.tier].c);
        if (e.tier === 4) {
            d.append(el('span', 'ml-art is-case is-star', '★'), el('span', 'ml-case-name', 'Rare Special Item'));
        } else {
            d.append(caseArt(e.a), el('span', 'ml-case-name', e.a.tracks[e.i][0]));
        }
        return d;
    }

    function reveal(win, node) {
        var t = win.a.tracks[win.i];
        var by = t[5] || win.a.artist;
        var st = ytPlays[key(by)] || ytPlays[key(win.a.artist)];
        var tr = TIERS[win.tier];
        spinning = false;
        shuffle.disabled = false;
        shuffleLabel.textContent = 'Open another';
        if (win.tier === 4) node.replaceChild(caseArt(win.a), node.firstChild);
        node.lastChild.textContent = t[0];
        node.classList.add('is-win');
        result.style.setProperty('--r', tr.c);
        result.textContent = '';
        result.append(el('b', '', tr.name + (st ? ' · StatTrak™' : '')),
            ' "' + t[0] + '" by ' + by + ' · ' + wear(win.a) + (st ? ' · ' + st + ' plays on YT Music' : ''));
        sfx('reveal', win.tier);

        select(win.a);
        flash = win.i;
        renderDetail();
        var li = Array.prototype.find.call(list.children, function (n) { return n.album === win.a; });
        if (li) list.scrollTop = li.offsetTop - list.clientHeight / 2;
        status.textContent = 'Unboxed: "' + t[0] + '" by ' + by + '.';
    }

    shuffle.addEventListener('click', function () {
        if (spinning) return;
        var pool = [];
        (shown.length ? shown : data).forEach(function (a) {
            var h = hits(a);
            a.tracks.forEach(function (t, i) {
                if (!h || h.indexOf(i) >= 0) pool.push({ a: a, i: i, tier: tier(a, t) });
            });
        });
        if (!pool.length) return;
        if (!reel) buildCase();
        caseEl.hidden = false;
        sfx('open');

        var win = roll(pool);
        strip.textContent = '';
        result.textContent = 'Opening...';
        for (var n = 0; n < WIN_AT + 6; n++) strip.appendChild(item(n === WIN_AT ? win : roll(pool)));
        var items = strip.children;
        var node = items[WIN_AT];
        var step = items[1].offsetLeft - items[0].offsetLeft;
        var target = node.offsetLeft + node.offsetWidth / 2 - reel.clientWidth / 2
            + (Math.random() - 0.5) * node.offsetWidth * 0.8;

        strip.style.transition = 'none';
        strip.style.transform = 'translateX(0)';
        void strip.offsetWidth;
        spinning = true;
        shuffle.disabled = true;
        shuffleLabel.textContent = 'Opening...';

        if (reduced.matches) {
            strip.style.transform = 'translateX(' + -target + 'px)';
            reveal(win, node);
            return;
        }
        strip.style.transition = 'transform 6s cubic-bezier(0.1, 0.7, 0.15, 1)';
        strip.style.transform = 'translateX(' + -target + 'px)';
        strip.addEventListener('transitionend', function () { reveal(win, node); }, { once: true });

        var last = -1;
        (function watch() {
            if (!spinning) return;
            var x = -new DOMMatrixReadOnly(getComputedStyle(strip).transform).m41;
            var at = Math.floor((x + reel.clientWidth / 2 - items[0].offsetLeft) / step);
            if (at !== last) {
                last = at;
                sfx('tick');
            }
            requestAnimationFrame(watch);
        })();
    });

    renderSources();
    render();
})();

(function () {
    var dac = document.querySelector('[data-dac]');
    var quip = document.querySelector('[data-dac-quip]');
    if (!dac || !quip) return;

    var core = dac.querySelector('.dac-core');
    var route = { src: 'laptop', out: 'of' };
    var quips = {
        'laptop-of': 'desk mode. open-back on-ears, so the neighbors get a preview.',
        'laptop-nb': 'late night at the desk. flatheads, low volume, still 24-bit.',
        'phone-of': 'on-ears on the go. bold. retro. a little leaky.',
        'phone-nb': 'pocket rig: phone, dongle, buds. done.',
        'deck-of': 'couch session. Deck in hand, Old Fashioned on head.',
        'deck-nb': 'handheld + flatheads. the whole setup fits in one bag.'
    };

    dac.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-dac-src], [data-dac-out]');
        if (!btn) return;
        var key = btn.hasAttribute('data-dac-src') ? 'src' : 'out';
        route[key] = btn.getAttribute('data-dac-' + key);
        Array.prototype.forEach.call(dac.querySelectorAll('[data-dac-' + key + ']'), function (b) {
            b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });
        quip.textContent = '# ' + quips[route.src + '-' + route.out];
        core.classList.remove('is-pulse');
        void core.offsetWidth;
        core.classList.add('is-pulse');
    });
})();

(function () {
    var panel = document.querySelector('#win-rig .rig-panel');
    if (!panel) return;

    var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var POKES = {
        mouse: ['tap', 'click!'],
        mousepad: ['pop', 'swoosh'],
        keyboard: ['key', 'clack clack'],
        monitor: ['blip', '165 Hz!'],
        handheld: ['boing', 'whirrr'],
        speaker: ['blip', 'boom'],
        subwoofer: ['boing', 'BWOMP'],
        headphones: ['pop', 'la la la'],
        earbuds: ['pop', 'nice!'],
        tws: ['tap', 'shhh'],
        iem: ['deny', 'zzz'],
        dac: ['plug', 'bzzt']
    };

    function sfx(name, arg) {
        if (window.SFX) window.SFX.play(name, arg);
    }

    Array.prototype.forEach.call(panel.querySelectorAll('.ub-row'), function (row, i) {
        var kind = row.querySelector('.ub-kind');
        if (kind) row.style.setProperty('--c', kind.style.getPropertyValue('--c'));
        row.style.setProperty('--i', i);
    });

    function countUp(el) {
        var text = el.textContent;
        var target = parseFloat(text);
        var decimals = (text.split('.')[1] || '').replace('%', '').length;
        var start = performance.now();
        (function step(now) {
            var t = Math.min(1, (now - start) / 1200);
            el.textContent = (target * (1 - Math.pow(1 - t, 3))).toFixed(decimals) + '%';
            if (t < 1) requestAnimationFrame(step);
        })(start);
    }

    if (!still && 'IntersectionObserver' in window) {
        panel.classList.add('is-armed');
        var seen = new IntersectionObserver(function (entries) {
            if (!entries[0].isIntersecting) return;
            seen.disconnect();
            void panel.offsetWidth;
            panel.classList.add('is-in');
            Array.prototype.forEach.call(panel.querySelectorAll('.ub-score strong'), countUp);
        }, { threshold: 0.2 });
        seen.observe(panel.querySelector('.ub-list'));
    }

    panel.addEventListener('click', function (e) {
        if (e.target.closest('a, button')) return;
        var gear = e.target.closest('.gear');
        if (!gear) return;
        var kind = gear.querySelector('.gear-kind').firstChild.textContent.trim();
        var poke = POKES[kind] || ['pop', 'boop'];
        sfx(poke[0], 4);

        gear.classList.remove('is-poke');
        void gear.offsetWidth;
        gear.classList.add('is-poke');
        if (still) return;

        var box = gear.getBoundingClientRect();
        var pop = document.createElement('span');
        pop.className = 'gear-pop';
        pop.textContent = poke[1];
        pop.style.left = (e.clientX - box.left) + 'px';
        pop.style.top = (e.clientY - box.top) + 'px';
        gear.appendChild(pop);
        pop.addEventListener('animationend', function () { pop.remove(); });
    });
})();

(function () {
    var win = document.getElementById('win-ytm');
    var spot = win && win.querySelector('[data-ytm-spot]');
    if (!spot) return;

    var TOTAL = 3330;
    var rows = Array.prototype.slice.call(win.querySelectorAll('.ytm-row'));
    var sleeve = spot.querySelector('[data-spot-sleeve]');
    var img = spot.querySelector('[data-spot-img]');
    var link = spot.querySelector('[data-spot-link]');
    var backdrop = spot.querySelector('[data-spot-backdrop]');
    var tracks = rows.filter(function (r) { return r.closest('[data-kind="track"]'); });
    var played = window.YTM_ARTISTS || {};
    var artist = null;
    var current = 0;

    function field(name) {
        return spot.querySelector('[data-spot-' + name + ']');
    }

    function pick(n, not) {
        if (n < 2) return 0;
        var i = Math.floor(Math.random() * (n - 1));
        return i >= not ? i + 1 : i;
    }

    function rankOf(row) {
        return Array.prototype.indexOf.call(row.closest('ol').children, row.parentNode) + 1;
    }

    function nameOf(row) {
        return row.querySelector('.ytm-name').firstChild.textContent.trim();
    }

    function render(row, t) {
        rows.forEach(function (r) { r.setAttribute('aria-pressed', r === row ? 'true' : 'false'); });
        spot.style.setProperty('--c', row.style.getPropertyValue('--c'));
        field('kicker').textContent = t.kicker;
        field('name').textContent = t.name;
        field('by').textContent = t.by;
        field('plays').textContent = t.plays;
        field('share').textContent = (t.plays / TOTAL * 100).toFixed(1) + '%';
        field('first').textContent = t.first;
        field('hour').textContent = t.hour;
        field('wd').textContent = t.wd;
        field('mode').textContent = artist ? 'shuffle ' + nameOf(artist) : 'shuffle top 10';

        sleeve.classList.toggle('is-blank', !t.id);
        if (t.id) {
            img.src = 'img/ytm/' + t.id + '.webp';
            link.href = 'https://music.youtube.com/watch?v=' + t.id;
            backdrop.style.backgroundImage = "url('img/ytm/" + t.id + ".webp')";
        } else {
            backdrop.style.backgroundImage = 'none';
        }
        link.hidden = !t.id;

        sleeve.classList.remove('is-swap');
        void sleeve.offsetWidth;
        sleeve.classList.add('is-swap');
    }

    function showTrack(row) {
        var d = row.dataset;
        var plays = +row.querySelector('.ytm-n').textContent;
        artist = null;
        current = tracks.indexOf(row);
        render(row, {
            kicker: '#' + rankOf(row) + ' track', name: nameOf(row), by: 'by ' + d.by, id: d.id,
            plays: plays, first: d.first, hour: d.hour, wd: d.wd
        });
    }

    function showArtist(row, i) {
        var name = nameOf(row);
        var list = played[name];
        if (!list) return;
        var t = list[i];
        artist = row;
        current = i;
        render(row, {
            kicker: name + ' · #' + (i + 1) + ' of ' + list.length + ' played',
            name: t[0],
            by: 'by ' + name + ' · #' + rankOf(row) + ' artist, ' + row.querySelector('.ytm-n').textContent + ' plays',
            id: t[1], plays: t[2], first: t[3], hour: t[4], wd: t[5]
        });
    }

    function randomArtistTrack(row) {
        var list = played[nameOf(row)];
        if (list) showArtist(row, pick(list.length, row === artist ? current : -1));
    }

    win.addEventListener('click', function (e) {
        var row = e.target.closest('.ytm-row');
        if (!row) return;
        if (tracks.indexOf(row) >= 0) showTrack(row);
        else randomArtistTrack(row);
    });

    field('shuffle').addEventListener('click', function () {
        if (artist) randomArtistTrack(artist);
        else showTrack(tracks[pick(tracks.length, current)]);
    });

    var hours = win.querySelector('.ytm-hours');
    var note = win.querySelector('[data-ytm-note]');
    if (!hours || !note) return;

    hours.addEventListener('click', function (e) {
        var bar = e.target.closest('li');
        if (!bar) return;
        var tip = bar.getAttribute('data-tip').split(' · ');
        Array.prototype.forEach.call(hours.children, function (b) { b.classList.toggle('is-on', b === bar); });
        hours.classList.add('is-picked');
        note.innerHTML = '<strong>' + tip[0] + '</strong> · ' + tip[1].split('.')[0] + '. owned by '
            + bar.getAttribute('data-who') + ', ' + bar.getAttribute('data-who-n') + ' of them.';
    });
})();
