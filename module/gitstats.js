(function () {
    var GITHUB_USER = 'istaqom';
    var GITLAB_USER_ID = 5169617;
    var GITLAB_LANG_LOOKUPS = 10;
    var STATS_CACHE_KEY = 'git-stats-v2';
    var CONTRIB_CACHE_KEY = 'git-contributions-v1';
    var CACHE_TTL = 24 * 60 * 60 * 1000;

    var fields = document.querySelectorAll('[data-stat]');
    if (!fields.length) return;

    function getJSON(url) {
        return fetch(url).then(function (res) {
            if (!res.ok) throw new Error(url + ' ' + res.status);
            return res.json();
        });
    }

    function readCache(key) {
        try {
            var cached = JSON.parse(localStorage.getItem(key));
            if (cached && Date.now() - cached.at < CACHE_TTL) return cached.value;
        } catch (e) {}
        return null;
    }

    function writeCache(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify({ at: Date.now(), value: value }));
        } catch (e) {}
    }

    function cachedJSON(key, url) {
        var cached = readCache(key);
        if (cached) return Promise.resolve(cached);
        return getJSON(url).then(function (data) {
            writeCache(key, data);
            return data;
        });
    }

    function topLangs(counts, n) {
        return Object.keys(counts)
            .sort(function (a, b) { return counts[b] - counts[a]; })
            .slice(0, n);
    }

    function fetchGitHub() {
        return Promise.all([
            getJSON('https://api.github.com/users/' + GITHUB_USER),
            getJSON('https://api.github.com/users/' + GITHUB_USER + '/repos?per_page=100')
        ]).then(function (res) {
            var user = res[0];
            var langs = {};
            var stars = 0;
            res[1].forEach(function (repo) {
                stars += repo.stargazers_count;
                if (repo.language && !repo.fork) langs[repo.language] = (langs[repo.language] || 0) + 1;
            });
            return {
                repos: user.public_repos,
                stars: stars,
                followers: user.followers,
                since: new Date(user.created_at).getFullYear(),
                langs: langs
            };
        });
    }

    function fetchGitLab() {
        return getJSON('https://gitlab.com/api/v4/users/' + GITLAB_USER_ID + '/projects?per_page=100&simple=true')
            .then(function (projects) {
                var stars = projects.reduce(function (sum, p) { return sum + (p.star_count || 0); }, 0);
                var lookups = projects.slice(0, GITLAB_LANG_LOOKUPS).map(function (p) {
                    return getJSON('https://gitlab.com/api/v4/projects/' + p.id + '/languages')
                        .then(function (langs) { return topLangs(langs, 1)[0]; }, function () { return null; });
                });
                return Promise.all(lookups).then(function (mains) {
                    var langs = {};
                    mains.forEach(function (lang) {
                        if (lang) langs[lang] = (langs[lang] || 0) + 1;
                    });
                    return { repos: projects.length, stars: stars, langs: langs };
                });
            });
    }

    function buildView(gh, gl) {
        var ghOk = !!gh;
        var glOk = !!gl;
        var ghLabel = function (v) { return 'GitHub: ' + (ghOk ? v : 'unavailable'); };
        var glLabel = function (v) { return 'GitLab: ' + (glOk ? v : 'unavailable'); };
        var sum = function (key) { return ghOk ? gh[key] + (glOk ? gl[key] : 0) : '?'; };

        var merged = {};
        [ghOk && gh.langs, glOk && gl.langs].forEach(function (langs) {
            if (!langs) return;
            Object.keys(langs).forEach(function (k) { merged[k] = (merged[k] || 0) + langs[k]; });
        });

        return {
            repos: {
                value: sum('repos'),
                tip: ghLabel(ghOk && gh.repos) + ' · ' + glLabel(glOk && gl.repos + ' public')
            },
            stars: {
                value: sum('stars'),
                tip: ghLabel(ghOk && gh.stars) + ' · ' + glLabel(glOk && gl.stars)
            },
            followers: {
                value: ghOk ? gh.followers : '?',
                tip: ghLabel(ghOk && gh.followers) + ' · GitLab: hidden'
            },
            langs: {
                value: topLangs(merged, 3).join(', ') || '-',
                tip: ghLabel(ghOk && (topLangs(gh.langs, 3).join(', ') || '-')) + ' · ' +
                     glLabel(glOk && (topLangs(gl.langs, 3).join(', ') || '-'))
            },
            since: {
                value: ghOk ? gh.since : '?',
                tip: ghLabel(ghOk && gh.since) + ' · GitLab: hidden'
            }
        };
    }

    function render(view) {
        Object.keys(view).forEach(function (key) {
            var field = document.querySelector('[data-stat="' + key + '"]');
            var row = document.querySelector('[data-stat-row="' + key + '"]');
            if (field) field.textContent = view[key].value;
            if (row) row.setAttribute('data-tip', view[key].tip);
        });
    }

    function renderError() {
        Array.prototype.forEach.call(fields, function (el) {
            if (el.getAttribute('data-stat') === 'contributions') return;
            el.textContent = 'rate limited, try later';
            el.classList.add('is-error');
        });
    }

    var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var WEEK_PX = 14;
    var EDGE_WEEKS = 8;

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text) node.textContent = text;
        return node;
    }

    function parseDate(iso) {
        return new Date(iso + 'T00:00:00Z');
    }

    function formatDate(iso) {
        var d = parseDate(iso);
        return MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate() + ', ' + d.getUTCFullYear();
    }

    function heatLevel(count, max) {
        if (!count) return 0;
        return Math.min(4, Math.ceil((count / max) * 4));
    }

    function renderHeatmap(chart, allDays, updated) {
        var fit = Math.max(8, Math.floor((chart.clientWidth - 60) / WEEK_PX));
        var lastDate = parseDate(allDays[allDays.length - 1][0]);
        var firstShown = fit * 7 - (6 - lastDate.getUTCDay());
        var days = allDays.slice(-firstShown);

        var max = days.reduce(function (m, d) { return Math.max(m, d[1] + d[2]); }, 0);
        var offset = parseDate(days[0][0]).getUTCDay();
        var weeks = Math.ceil((offset + days.length) / 7);

        var heatmap = el('div', 'heatmap');
        heatmap.style.setProperty('--weeks', weeks);
        var months = el('div', 'heat-months');
        var labels = el('div', 'heat-days');
        var grid = el('div', 'heat-grid');

        ['', 'Mon', '', 'Wed', '', 'Fri', ''].forEach(function (name) {
            labels.appendChild(el('span', null, name));
        });

        for (var i = 0; i < offset; i++) grid.appendChild(el('span', 'heat-cell is-blank'));

        var lastMonth = -1;
        var lastLabel = null;
        days.forEach(function (day, index) {
            var total = day[1] + day[2];
            var col = Math.floor((offset + index) / 7);
            var cell = el('span', 'heat-cell');
            cell.setAttribute('data-level', heatLevel(total, max));
            cell.setAttribute('data-tip', formatDate(day[0]) + ': ' + total +
                ' contribution' + (total === 1 ? '' : 's') +
                ' (GitHub ' + day[1] + ' · GitLab ' + day[2] + ')');
            if (col < EDGE_WEEKS) cell.classList.add('tip-start');
            else if (col >= weeks - EDGE_WEEKS) cell.classList.add('tip-end');
            grid.appendChild(cell);

            var date = parseDate(day[0]);
            if (date.getUTCDay() === 0 && date.getUTCMonth() !== lastMonth) {
                if (lastLabel && col - lastLabel.col < 3) months.removeChild(lastLabel.node);
                var label = el('span', null, MONTHS[date.getUTCMonth()]);
                label.style.gridColumnStart = col + 1;
                months.appendChild(label);
                lastLabel = { col: col, node: label };
                lastMonth = date.getUTCMonth();
            }
        });

        heatmap.appendChild(months);
        heatmap.appendChild(labels);
        heatmap.appendChild(grid);

        var legend = el('div', 'heat-legend');
        legend.appendChild(el('span', 'heat-updated', 'updated ' + formatDate(updated.slice(0, 10))));
        legend.appendChild(el('span', null, 'less'));
        for (var level = 0; level <= 4; level++) {
            var swatch = el('span', 'heat-cell');
            swatch.setAttribute('data-level', level);
            legend.appendChild(swatch);
        }
        legend.appendChild(el('span', null, 'more'));

        chart.classList.add('has-heatmap');
        chart.replaceChildren(heatmap, legend);
    }

    function loadContributions() {
        var chart = document.querySelector('.git-chart');
        var row = document.querySelector('[data-stat-row="contributions"]');
        cachedJSON(CONTRIB_CACHE_KEY, 'data/contributions.json').then(function (data) {
            if (!data.days || !data.days.length) return;
            var gh = data.days.reduce(function (s, d) { return s + d[1]; }, 0);
            var gl = data.days.reduce(function (s, d) { return s + d[2]; }, 0);
            render({ contributions: { value: gh + gl, tip: 'last year · GitHub: ' + gh + ' · GitLab: ' + gl } });
            if (row) row.hidden = false;
            if (!chart) return;

            var lastWidth = -1;
            var timer;
            function redraw() {
                var width = chart.clientWidth;
                if (!width || Math.abs(width - lastWidth) < WEEK_PX) return;
                lastWidth = width;
                renderHeatmap(chart, data.days, data.updated);
            }
            function scheduleRedraw() {
                clearTimeout(timer);
                timer = setTimeout(redraw, 150);
            }
            redraw();
            if ('ResizeObserver' in window) new ResizeObserver(scheduleRedraw).observe(chart);
            else window.addEventListener('resize', scheduleRedraw);
        }).catch(function () {});
    }

    loadContributions();

    var cached = readCache(STATS_CACHE_KEY);
    if (cached) {
        render(cached);
        return;
    }

    var orNull = function () { return null; };
    Promise.all([fetchGitHub().catch(orNull), fetchGitLab().catch(orNull)]).then(function (res) {
        if (!res[0] && !res[1]) {
            renderError();
            return;
        }
        var view = buildView(res[0], res[1]);
        render(view);
        if (res[0] && res[1]) writeCache(STATS_CACHE_KEY, view);
    });
})();
