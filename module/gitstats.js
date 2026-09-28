(function () {
    var GITHUB_USER = 'istaqom';
    var GITLAB_USER_ID = 5169617;
    var DATA_URL = 'data/contributions.json';
    var DATA_CACHE_KEY = 'git-data-v1';
    var LIVE_CACHE_KEY = 'git-live-v1';
    var CACHE_TTL = 24 * 60 * 60 * 1000;

    if (!document.querySelector('[data-stat]')) return;

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

    function setStat(key, value, className) {
        Array.prototype.forEach.call(document.querySelectorAll('[data-stat="' + key + '"]'), function (field) {
            field.textContent = value;
            if (className) field.classList.add(className);
        });
    }

    function loadData() {
        var cached = readCache(DATA_CACHE_KEY);
        if (cached) return Promise.resolve(cached);
        return getJSON(DATA_URL).then(function (data) {
            if (data.github && data.gitlab) writeCache(DATA_CACHE_KEY, data);
            return data;
        });
    }

    // Only used until the daily Action has written the profile stats into DATA_URL.
    function loadLive() {
        var cached = readCache(LIVE_CACHE_KEY);
        if (cached) return Promise.resolve(cached);
        return Promise.all([
            getJSON('https://api.github.com/users/' + GITHUB_USER),
            getJSON('https://api.github.com/users/' + GITHUB_USER + '/repos?per_page=100'),
            fetch('https://gitlab.com/api/v4/users/' + GITLAB_USER_ID + '/projects?per_page=1&simple=true')
        ]).then(function (res) {
            var langCounts = {};
            var stars = 0;
            res[1].forEach(function (repo) {
                stars += repo.stargazers_count;
                if (repo.language && !repo.fork) langCounts[repo.language] = (langCounts[repo.language] || 0) + 1;
            });
            var live = {
                github: {
                    repos: res[0].public_repos,
                    stars: stars,
                    followers: res[0].followers,
                    langs: Object.keys(langCounts)
                        .sort(function (a, b) { return langCounts[b] - langCounts[a]; })
                        .slice(0, 3),
                    since: new Date(res[0].created_at).getFullYear()
                },
                gitlab: { repos: Number(res[2].headers.get('X-Total')) || '?' }
            };
            writeCache(LIVE_CACHE_KEY, live);
            return live;
        });
    }

    function renderStats(stats) {
        setStat('repos', stats.github.repos);
        setStat('stars', stats.github.stars);
        setStat('followers', stats.github.followers);
        setStat('langs', stats.github.langs.join(', ') || '-');
        setStat('since', stats.github.since);
        setStat('gl-repos', stats.gitlab.repos);
    }

    function renderStatsError() {
        ['repos', 'stars', 'followers', 'since'].forEach(function (key) {
            setStat(key, '?', 'is-error');
        });
        setStat('langs', 'rate limited, try later', 'is-error');
        setStat('gl-repos', '?');
    }

    var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
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

    function plural(n, word) {
        return n + ' ' + word + (n === 1 ? '' : 's');
    }

    function renderFacts(days) {
        var longest = 0;
        var run = 0;
        var best = days[0];
        var byWeekday = [0, 0, 0, 0, 0, 0, 0];
        days.forEach(function (day) {
            var total = day[1] + day[2];
            run = total ? run + 1 : 0;
            longest = Math.max(longest, run);
            if (total > best[1] + best[2]) best = day;
            byWeekday[parseDate(day[0]).getUTCDay()] += total;
        });

        // today still counts as "ongoing" even if nothing has been pushed yet
        var current = 0;
        for (var i = days.length - 1; i >= 0; i--) {
            if (days[i][1] + days[i][2]) current++;
            else if (i !== days.length - 1) break;
        }

        var busiest = byWeekday.indexOf(Math.max.apply(null, byWeekday));
        var bestDate = parseDate(best[0]);
        setStat('streak', plural(longest, 'day'));
        setStat('current', plural(current, 'day'));
        setStat('best-day', (best[1] + best[2]) + ' on ' + MONTHS[bestDate.getUTCMonth()] + ' ' + bestDate.getUTCDate());
        setStat('weekday', WEEKDAYS[busiest] + 's');
    }

    function renderContributions(data) {
        var gh = data.days.reduce(function (s, d) { return s + d[1]; }, 0);
        var gl = data.days.reduce(function (s, d) { return s + d[2]; }, 0);
        setStat('contributions', gh + gl);
        setStat('contrib-gh', gh);
        setStat('contrib-gl', gl);
        setStat('printed', formatDate(data.updated.slice(0, 10)));
        renderFacts(data.days);

        var chart = document.querySelector('.git-chart');
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
    }

    loadData().catch(function () { return null; }).then(function (data) {
        if (data && data.days && data.days.length) renderContributions(data);
        else ['contributions', 'contrib-gh', 'contrib-gl', 'printed', 'streak', 'current', 'best-day', 'weekday']
            .forEach(function (key) { setStat(key, '?'); });

        var stats = data && data.github && data.gitlab ? Promise.resolve(data) : loadLive();
        stats.then(renderStats, renderStatsError);
    });
})();
