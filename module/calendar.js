(function () {
    var clock = document.querySelector('.taskbar-clock');
    var popup = document.querySelector('.cal-popup');
    if (!clock || !popup) return;

    var titleBtn = popup.querySelector('.cal-title');
    var grid = popup.querySelector('.cal-grid');
    var agendaDate = popup.querySelector('.cal-agenda-date');
    var eventList = popup.querySelector('.cal-events');
    var emptyMsg = popup.querySelector('.cal-empty');
    var startBtn = document.querySelector('.start-btn');

    var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
        'August', 'September', 'October', 'November', 'December'];
    var WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var DOT_KINDS = ['birthday', 'holiday', 'tech', 'homelab', 'once'];
    var birthday = typeof BIRTHDAY !== 'undefined' ? BIRTHDAY : null;

    // [month (1-12), day, kind, title, note]; note may be a function of the year
    var YEARLY = [
        [1, 1, 'holiday', 'New Year', 'renew the domain before it expires'],
        [3, 31, 'tech', 'World Backup Day', 'the homelab has backups (it doesn\'t)'],
        [8, 17, 'holiday', 'Indonesian Independence Day', 'Dirgahayu Republik Indonesia'],
        [8, 25, 'tech', 'Linux\'s birthday', function (y) { return 'Linux turns ' + (y - 1991) + ' and still runs everything I own'; }],
        [10, 1, 'tech', 'Hacktoberfest begins', 'time to pad the git stats'],
        [10, 31, 'tech', 'Hacktoberfest ends', 'hope the PRs got merged'],
        [11, 18, 'homelab', 'Minecraft anniversary', function (y) { return 'Minecraft 1.0 turns ' + (y - 2011) + ', the real reason the Xeon exists'; }]
    ];

    var contributions = null;
    var contributionsRequested = false;
    var today = startOfDay(new Date());
    var selected = today;
    var viewYear = today.getFullYear();
    var viewMonth = today.getMonth();

    function startOfDay(d) {
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }

    function sameDay(a, b) {
        return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    }

    function isoDate(d) {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function isoWeek(d) {
        var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        var day = t.getUTCDay() || 7;
        t.setUTCDate(t.getUTCDate() + 4 - day);
        var yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
        return Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
    }

    function isLeap(y) {
        return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    }

    function lastWeekdayOfMonth(y, m, weekday) {
        var d = new Date(y, m + 1, 0);
        d.setDate(d.getDate() - ((d.getDay() - weekday + 7) % 7));
        return d.getDate();
    }

    function firstWeekdayOfMonth(y, m, weekday) {
        var d = new Date(y, m, 1);
        return 1 + ((weekday - d.getDay() + 7) % 7);
    }

    function eventsFor(date) {
        var y = date.getFullYear();
        var m = date.getMonth();
        var d = date.getDate();
        var dow = date.getDay();
        var events = [];

        if (birthday && m === birthday.getMonth() && d === birthday.getDate()) {
            events.push({ kind: 'birthday', title: 'Istaqom\'s birthday', note: 'uptime += 1 year (turns ' + (y - birthday.getFullYear()) + ')' });
        }

        YEARLY.forEach(function (e) {
            if (e[0] - 1 === m && e[1] === d) {
                events.push({ kind: e[2], title: e[3], note: typeof e[4] === 'function' ? e[4](y) : e[4] });
            }
        });

        if (m === 8 && d === (isLeap(y) ? 12 : 13)) {
            events.push({ kind: 'tech', title: 'Programmers\' Day', note: 'day 256 of the year, 0x100 for the cool kids' });
        }
        if (m === 6 && d === lastWeekdayOfMonth(y, 6, 5)) {
            events.push({ kind: 'tech', title: 'Sysadmin Appreciation Day', note: 'buy your sysadmin a coffee (it\'s me)' });
        }
        if (y === 2038 && m === 0 && d === 19) {
            events.push({ kind: 'once', title: 'Y2K38', note: '32-bit time_t overflows at 03:14:07 UTC' });
        }
        if (d === firstWeekdayOfMonth(y, m, 0)) {
            events.push({ kind: 'homelab', title: 'Homelab maintenance window', note: 'apt upgrade && pray' });
        }
        if (d === 1) {
            events.push({ kind: 'monthly', title: 'GCP billing cycle', note: 'check for forgotten public IPs' });
        }
        if (dow === 5) {
            events.push({ kind: 'weekly', title: 'Deploy freeze', note: 'it\'s Friday. don\'t.' });
        }

        if (contributions) {
            var c = contributions[isoDate(date)];
            if (c && c[0] + c[1]) {
                var total = c[0] + c[1];
                events.push({
                    kind: 'git',
                    title: total + ' contribution' + (total === 1 ? '' : 's'),
                    note: 'GitHub ' + c[0] + ' · GitLab ' + c[1]
                });
            }
        }
        return events;
    }

    function loadContributions() {
        if (contributionsRequested) return;
        contributionsRequested = true;
        fetch('data/contributions.json')
            .then(function (res) { return res.ok ? res.json() : null; })
            .then(function (data) {
                if (!data || !data.days) return;
                contributions = {};
                data.days.forEach(function (day) { contributions[day[0]] = [day[1], day[2]]; });
                if (!popup.hidden) render();
            })
            .catch(function () {});
    }

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function renderGrid() {
        titleBtn.textContent = MONTHS[viewMonth] + ' ' + viewYear;
        var frag = document.createDocumentFragment();

        frag.appendChild(el('span', 'cal-weeknum cal-dow', ''));
        ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].forEach(function (name) {
            frag.appendChild(el('span', 'cal-dow', name));
        });

        var first = new Date(viewYear, viewMonth, 1);
        var offset = (first.getDay() + 6) % 7;
        var cursor = new Date(viewYear, viewMonth, 1 - offset);

        for (var week = 0; week < 6; week++) {
            frag.appendChild(el('span', 'cal-weeknum', String(isoWeek(cursor))));
            for (var i = 0; i < 7; i++) {
                var date = new Date(cursor);
                var btn = el('button', 'cal-day');
                btn.type = 'button';
                btn._date = date;
                btn.appendChild(el('span', 'cal-num', String(date.getDate())));
                if (date.getMonth() !== viewMonth) btn.classList.add('is-outside');
                if (sameDay(date, today)) btn.classList.add('is-today');
                if (sameDay(date, selected)) btn.classList.add('is-selected');
                btn.setAttribute('aria-label', WEEKDAYS[date.getDay()] + ', ' + date.getDate() + ' ' + MONTHS[date.getMonth()] + ' ' + date.getFullYear());

                var kinds = [];
                eventsFor(date).forEach(function (e) {
                    if (DOT_KINDS.indexOf(e.kind) !== -1 && kinds.indexOf(e.kind) === -1) kinds.push(e.kind);
                });
                if (kinds.length) {
                    var dots = el('span', 'cal-dots');
                    kinds.slice(0, 3).forEach(function (k) { dots.appendChild(el('span', 'cal-dot is-' + k)); });
                    btn.appendChild(dots);
                }
                frag.appendChild(btn);
                cursor.setDate(cursor.getDate() + 1);
            }
        }
        grid.replaceChildren(frag);
    }

    function renderAgenda() {
        agendaDate.textContent = WEEKDAYS[selected.getDay()] + ', ' + selected.getDate() + ' ' +
            MONTHS[selected.getMonth()] + ' ' + selected.getFullYear() + (sameDay(selected, today) ? ' (today)' : '');
        var events = eventsFor(selected);
        var frag = document.createDocumentFragment();
        events.forEach(function (e) {
            var li = el('li', 'cal-event is-' + e.kind);
            li.appendChild(el('span', 'cal-event-title', e.title));
            li.appendChild(el('span', 'cal-event-note', e.note));
            frag.appendChild(li);
        });
        eventList.replaceChildren(frag);
        emptyMsg.hidden = events.length > 0;
    }

    function render() {
        renderGrid();
        renderAgenda();
    }

    function shiftMonth(delta) {
        viewMonth += delta;
        viewYear += Math.floor(viewMonth / 12);
        viewMonth = ((viewMonth % 12) + 12) % 12;
        renderGrid();
    }

    function goToday() {
        today = startOfDay(new Date());
        selected = today;
        viewYear = today.getFullYear();
        viewMonth = today.getMonth();
        render();
    }

    function toggle(force) {
        var show = typeof force === 'boolean' ? force : popup.hidden;
        popup.hidden = !show;
        clock.setAttribute('aria-expanded', String(show));
        clock.classList.toggle('is-active', show);
        if (show) {
            loadContributions();
            goToday();
        }
    }

    clock.addEventListener('click', function () { toggle(); });

    popup.addEventListener('click', function (e) {
        var day = e.target.closest('.cal-day');
        if (day) {
            selected = day._date;
            if (day.classList.contains('is-outside')) {
                viewYear = selected.getFullYear();
                viewMonth = selected.getMonth();
            }
            render();
            return;
        }
        var nav = e.target.closest('[data-cal]');
        if (nav) {
            var action = nav.getAttribute('data-cal');
            if (action === 'today') goToday();
            else shiftMonth(action === 'next' ? 1 : -1);
        }
    });

    titleBtn.addEventListener('click', goToday);

    var wheelLock = 0;
    grid.addEventListener('wheel', function (e) {
        e.preventDefault();
        var now = Date.now();
        if (now - wheelLock < 250 || !e.deltaY) return;
        wheelLock = now;
        shiftMonth(e.deltaY > 0 ? 1 : -1);
    }, { passive: false });

    document.addEventListener('click', function (e) {
        if (popup.hidden) return;
        // composedPath, not contains(): clicking a day re-renders the grid and detaches the target
        var path = e.composedPath();
        if (path.indexOf(popup) !== -1 || path.indexOf(clock) !== -1) return;
        toggle(false);
    });

    if (startBtn) startBtn.addEventListener('click', function () { toggle(false); });

    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape' || popup.hidden) return;
        e.stopPropagation();
        toggle(false);
        clock.focus();
    }, true);
})();
