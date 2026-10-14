(function () {
    var ICONS = {
        min: '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1.5 8h7"/></svg>',
        max: '<svg class="icon-max" viewBox="0 0 10 10" aria-hidden="true"><rect x="1.5" y="1.5" width="7" height="7"/></svg>' +
             '<svg class="icon-restore" viewBox="0 0 10 10" aria-hidden="true"><path d="M3.5 3.5V1.5h5v5h-2"/><rect x="1.5" y="3.5" width="5" height="5"/></svg>',
        close: '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 2l6 6M8 2l-6 6"/></svg>'
    };

    var body = document.body;
    var workspaces = document.querySelector('.workspaces');
    var desktops = Array.prototype.slice.call(document.querySelectorAll('.desktop'));
    var currentDesk = desktops[0];
    var overview = document.querySelector('.overview');
    var ovDesks = overview.querySelector('.ov-desks');
    var ovWindows = overview.querySelector('.ov-windows');
    var ovEmpty = overview.querySelector('.ov-empty');
    var pagerBtn = document.querySelector('.pager-btn');
    var pagerCells = Array.prototype.slice.call(pagerBtn.querySelectorAll('.pager-cell'));
    var hotCorner = document.querySelector('.hot-corner');
    var taskbarItems = document.querySelector('.taskbar-items');
    var arrowLeft = document.querySelector('.taskbar-arrow-left');
    var arrowRight = document.querySelector('.taskbar-arrow-right');
    var startBtn = document.querySelector('.start-btn');
    var startMenu = document.querySelector('.start-menu');
    var startList = document.querySelector('.start-menu-list');
    var startReset = document.querySelector('.start-menu-reset');
    var clockTime = document.querySelector('.clock-time');
    var clockDate = document.querySelector('.clock-date');

    var windows = Array.prototype.slice.call(document.querySelectorAll('.window'));
    var BASE_TITLE = document.title;
    var DESK_KEY = 'magi-desk';

    desktops.forEach(function (desk) {
        desk._empty = desk.querySelector('.desktop-empty');
    });

    function sfx(name, arg) {
        if (window.SFX) window.SFX.play(name, arg);
    }

    function iconImg(src) {
        var img = document.createElement('img');
        img.src = src;
        img.alt = '';
        return img;
    }

    function winButton(kind, label) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'win-btn win-' + kind;
        btn.setAttribute('aria-label', label);
        btn.title = label;
        btn.innerHTML = ICONS[kind];
        return btn;
    }

    windows.forEach(function (win) {
        var title = win.dataset.title;
        win._desk = win.closest('.desktop');

        var bar = document.createElement('header');
        bar.className = 'titlebar';
        bar.appendChild(iconImg(win.dataset.icon)).className = 'titlebar-icon';

        var label = document.createElement('span');
        label.className = 'titlebar-title';
        label.textContent = title;
        bar.appendChild(label);

        var buttons = document.createElement('div');
        buttons.className = 'titlebar-buttons';
        buttons.appendChild(winButton('min', 'Minimize'));
        buttons.appendChild(winButton('max', 'Maximize'));
        buttons.appendChild(winButton('close', 'Close'));
        bar.appendChild(buttons);

        win.insertBefore(bar, win.firstChild);
        win.setAttribute('aria-label', title);

        var task = document.createElement('button');
        task.type = 'button';
        task.className = 'task-item';
        task.title = title;
        task.appendChild(iconImg(win.dataset.icon));
        var taskLabel = document.createElement('span');
        taskLabel.textContent = title.replace(/^~\//, '');
        task.appendChild(taskLabel);
        taskbarItems.appendChild(task);
        win._task = task;

        var li = document.createElement('li');
        var entry = document.createElement('button');
        entry.type = 'button';
        entry.className = 'start-menu-item';
        entry.appendChild(iconImg(win.dataset.icon));
        var entryText = document.createElement('span');
        entryText.className = 'start-menu-text';
        var entryLabel = document.createElement('span');
        entryLabel.className = 'start-menu-name';
        entryLabel.textContent = title.replace(/^~\//, '');
        entryText.appendChild(entryLabel);
        if (win.dataset.desc) {
            var entryDesc = document.createElement('span');
            entryDesc.className = 'start-menu-desc';
            entryDesc.textContent = win.dataset.desc;
            entryText.appendChild(entryDesc);
        }
        entry.appendChild(entryText);
        li.appendChild(entry);
        li._win = win;
        li._search = (title + ' ' + (win.dataset.desc || '') + ' ' + (win.dataset.category || '')).toLowerCase();
        startList.appendChild(li);

        buttons.querySelector('.win-min').addEventListener('click', function (e) {
            e.stopPropagation();
            minimize(win);
        });
        buttons.querySelector('.win-max').addEventListener('click', function (e) {
            e.stopPropagation();
            toggleMaximize(win);
        });
        buttons.querySelector('.win-close').addEventListener('click', function (e) {
            e.stopPropagation();
            close(win);
        });
        bar.addEventListener('dblclick', function (e) {
            if (!e.target.closest('.win-btn')) toggleMaximize(win);
        });
        win.addEventListener('pointerdown', function () { focus(win); });

        task.addEventListener('click', function () {
            if (win.classList.contains('is-minimized')) {
                open(win);
            } else if (win.classList.contains('is-active')) {
                minimize(win);
            } else {
                open(win);
            }
        });

        entry.addEventListener('click', function () {
            open(win);
            toggleStartMenu(false);
        });
    });

    function isVisible(win) {
        return !win.classList.contains('is-minimized') && !win.classList.contains('is-closed');
    }

    function onDesk(win) {
        return win._desk === currentDesk;
    }

    function deskWindows(desk) {
        return windows.filter(function (w) { return w._desk === desk; });
    }

    function focus(win, keepTitle) {
        windows.forEach(function (w) {
            var active = w === win;
            w.classList.toggle('is-active', active);
            w._task.classList.toggle('is-active', active);
        });
        if (keepTitle) return;
        document.title = win
            ? BASE_TITLE.replace('~', function () { return win.dataset.title; })
            : BASE_TITLE;
    }

    function blurIfActive(win) {
        if (!win.classList.contains('is-active')) return;
        var next = deskWindows(currentDesk).filter(isVisible)[0];
        if (next) focus(next);
        else focus(null);
    }

    function unmaximize(win) {
        win.classList.remove('is-maximized');
        win.querySelector('.win-max').setAttribute('aria-label', 'Maximize');
        win.querySelector('.win-max').title = 'Maximize';
    }

    function refresh() {
        var anyMax = windows.some(function (w) { return w.classList.contains('is-maximized'); });
        body.classList.toggle('has-maximized', anyMax);
        desktops.forEach(function (desk) {
            desk._empty.hidden = deskWindows(desk).some(isVisible);
        });
        windows.forEach(function (w) {
            w._task.hidden = w.classList.contains('is-closed') || !onDesk(w);
            w._task.classList.toggle('is-minimized', w.classList.contains('is-minimized'));
        });
        pagerCells.forEach(function (cell, i) {
            var active = desktops[i] === currentDesk;
            cell.classList.toggle('is-active', active);
            if (active) cell.setAttribute('aria-current', 'true');
            else cell.removeAttribute('aria-current');
        });
        updateTaskbarScroll();
        if (!overview.hidden) renderOverview();
    }

    function switchDesktop(desk, keepFocus) {
        if (!desk || desk === currentDesk) return;
        var forward = desktops.indexOf(desk) > desktops.indexOf(currentDesk);
        sfx('desk', forward);
        windows.forEach(unmaximize);
        currentDesk.hidden = true;
        currentDesk = desk;
        desk.hidden = false;
        desk.classList.remove('is-entering-next', 'is-entering-prev');
        void desk.offsetWidth;
        desk.classList.add(forward ? 'is-entering-next' : 'is-entering-prev');
        try { sessionStorage.setItem(DESK_KEY, String(desktops.indexOf(desk))); } catch (e) {}
        window.scrollTo(0, 0);
        if (!keepFocus) focus(deskWindows(desk).filter(isVisible)[0] || null);
        refresh();
    }

    function shiftDesktop(delta) {
        switchDesktop(desktops[desktops.indexOf(currentDesk) + delta]);
    }

    function updateTaskbarScroll() {
        var max = taskbarItems.scrollWidth - taskbarItems.clientWidth;
        var left = taskbarItems.scrollLeft > 1;
        var right = taskbarItems.scrollLeft < max - 1;
        taskbarItems.classList.toggle('can-scroll-left', left);
        taskbarItems.classList.toggle('can-scroll-right', right);
        arrowLeft.hidden = !left;
        arrowRight.hidden = !right;
    }

    function animateIn(win) {
        win.classList.remove('is-opening');
        void win.offsetWidth;
        win.classList.add('is-opening');
    }

    function open(win) {
        switchDesktop(win._desk, true);
        var wasHidden = !isVisible(win);
        win.classList.remove('is-minimized', 'is-closed');
        focus(win);
        refresh();
        if (wasHidden) {
            sfx('open');
            animateIn(win);
            replayTerminal(win);
        } else {
            sfx('tap');
        }
        if (!win.classList.contains('is-maximized')) {
            win.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    function minimize(win) {
        sfx('minimize');
        unmaximize(win);
        win.classList.add('is-minimized');
        blurIfActive(win);
        refresh();
    }

    function close(win) {
        sfx('close');
        unmaximize(win);
        win.classList.remove('is-minimized');
        win.classList.add('is-closed');
        blurIfActive(win);
        refresh();
    }

    function toggleMaximize(win) {
        var maximize = !win.classList.contains('is-maximized');
        sfx(maximize ? 'maximize' : 'restore');
        windows.forEach(unmaximize);
        if (maximize) {
            win.classList.add('is-maximized');
            win.querySelector('.win-max').setAttribute('aria-label', 'Restore');
            win.querySelector('.win-max').title = 'Restore';
        }
        focus(win);
        refresh();
        animateIn(win);
    }

    var startSearch = startMenu.querySelector('.kick-search input');
    var startEmpty = startMenu.querySelector('.kick-empty');
    var startCats = Array.prototype.slice.call(startMenu.querySelectorAll('.kick-cat'));
    var startEntries = Array.prototype.slice.call(startList.children);
    var activeCat = 'favorites';
    var hoverCapable = window.matchMedia('(hover: hover) and (pointer: fine)');

    function inCategory(win, cat) {
        if (cat === 'all') return true;
        if (cat === 'favorites') return win.hasAttribute('data-favorite');
        return win.dataset.category === cat;
    }

    function filterStartMenu() {
        var query = startSearch.value.trim().toLowerCase();
        var shown = 0;
        startEntries.forEach(function (li) {
            var match = query ? li._search.indexOf(query) !== -1 : inCategory(li._win, activeCat);
            li.hidden = !match;
            if (match) shown++;
        });
        startCats.forEach(function (btn) {
            btn.classList.toggle('is-active', !query && btn.dataset.cat === activeCat);
        });
        startEmpty.hidden = shown > 0;
    }

    function setCategory(cat) {
        activeCat = cat;
        startSearch.value = '';
        filterStartMenu();
    }

    function visibleEntries() {
        return startEntries.filter(function (li) { return !li.hidden; });
    }

    function toggleStartMenu(force) {
        var show = typeof force === 'boolean' ? force : startMenu.hidden;
        if (show === startMenu.hidden) sfx(show ? 'menuOpen' : 'menuClose');
        startMenu.hidden = !show;
        startBtn.setAttribute('aria-expanded', String(show));
        startBtn.classList.toggle('is-active', show);
        if (!show) return;
        toggleOverview(false);
        setCategory('favorites');
        if (hoverCapable.matches) startSearch.focus({ preventScroll: true });
    }

    startCats.forEach(function (btn) {
        btn.addEventListener('click', function () { setCategory(btn.dataset.cat); });
        btn.addEventListener('mouseenter', function () {
            if (hoverCapable.matches && !startSearch.value) setCategory(btn.dataset.cat);
        });
    });

    startSearch.addEventListener('input', filterStartMenu);

    startSearch.addEventListener('keydown', function (e) {
        var first = visibleEntries()[0];
        if (!first) return;
        if (e.key === 'Enter') {
            e.preventDefault();
            first.querySelector('button').click();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            first.querySelector('button').focus();
        }
    });

    startList.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        var items = visibleEntries();
        var index = items.indexOf(e.target.closest('li'));
        if (index === -1) return;
        e.preventDefault();
        var next = items[index + (e.key === 'ArrowDown' ? 1 : -1)];
        if (next) next.querySelector('button').focus();
        else if (e.key === 'ArrowUp') startSearch.focus();
    });

    startMenu.querySelector('[data-power="sleep"]').addEventListener('click', function () {
        deskWindows(currentDesk).forEach(function (w) { if (isVisible(w)) minimize(w); });
        toggleStartMenu(false);
    });

    var DENIALS = [
        ['PERMISSION DENIED', 'istaqom is not in the sudoers file. This incident will be reported.'],
        ['ACCESS DENIED', 'Failed to {verb} magi: Interactive authentication required.'],
        ['OPERATION NOT PERMITTED', 'only root can {verb} this machine, and root is on vacation.'],
        ['403 FORBIDDEN', 'there is a 99.9% uptime SLA to protect.'],
        ['EPERM', 'nice try. uptime is a lifestyle.'],
        ['I\'M SORRY, DAVE', 'I\'m afraid I can\'t do that.'],
        ['INHIBITED', 'systemd-inhibit: a Steam download is holding the lock.'],
        ['CHANGE FREEZE', 'no {verb}s on a Friday. or any day, really.'],
        ['POLKIT SAYS NO', 'authentication required. you are not authenticated.'],
        ['DENIED', 'the cat is asleep on the power button.'],
        ['NOT TODAY', 'a backup job is still running. probably.'],
        ['ERR_TOO_COMFY', 'magi has been up too long to stop now.']
    ];
    var footer = startMenu.querySelector('.kick-footer');
    var denyToast = document.createElement('div');
    denyToast.className = 'kick-deny';
    denyToast.setAttribute('role', 'alert');
    denyToast.hidden = true;
    footer.appendChild(denyToast);
    var lastDenial = -1;
    var denyTimer;

    function clearDenied() {
        Array.prototype.forEach.call(footer.querySelectorAll('.is-denied'), function (b) {
            b.classList.remove('is-denied');
        });
    }

    function denyPower(btn, verb) {
        var i;
        do { i = Math.floor(Math.random() * DENIALS.length); } while (i === lastDenial);
        lastDenial = i;
        denyToast.innerHTML = '';
        var title = document.createElement('strong');
        title.textContent = DENIALS[i][0];
        var detail = document.createElement('span');
        detail.textContent = DENIALS[i][1].replace('{verb}', verb);
        denyToast.append(title, detail);
        denyToast.hidden = false;
        denyToast.classList.remove('is-in');
        clearDenied();
        void btn.offsetWidth;
        denyToast.classList.add('is-in');
        btn.classList.add('is-denied');
        sfx('deny');
        clearTimeout(denyTimer);
        denyTimer = setTimeout(function () {
            denyToast.hidden = true;
            clearDenied();
        }, 3200);
    }

    startMenu.querySelector('[data-power="shutdown"]').addEventListener('click', function () {
        denyPower(this, 'shut down');
    });

    startMenu.querySelector('[data-power="restart"]').addEventListener('click', function () {
        denyPower(this, 'restart');
    });

    var themeBtn = startMenu.querySelector('[data-theme-toggle]');
    var themeLabel = themeBtn.querySelector('[data-theme-label]');
    var themeMeta = document.querySelector('meta[name="theme-color"]');
    var root = document.documentElement;

    function syncTheme() {
        var dark = root.getAttribute('data-theme') === 'dark';
        themeBtn.setAttribute('aria-pressed', String(dark));
        themeLabel.textContent = dark ? 'Light mode' : 'Dark mode';
        if (themeMeta) themeMeta.content = dark ? '#0e1113' : '#2c3e50';
    }

    themeBtn.addEventListener('click', function () {
        var dark = root.getAttribute('data-theme') !== 'dark';
        root.classList.add('is-theming');
        root.setAttribute('data-theme', dark ? 'dark' : 'light');
        try { localStorage.setItem('magi-theme', dark ? 'dark' : 'light'); } catch (e) {}
        sfx(dark ? 'restore' : 'maximize');
        syncTheme();
        setTimeout(function () { root.classList.remove('is-theming'); }, 400);
    });
    syncTheme();

    startBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleStartMenu();
    });

    startReset.addEventListener('click', function () {
        sfx('open');
        windows.forEach(function (w) {
            unmaximize(w);
            w.classList.remove('is-minimized', 'is-closed');
            animateIn(w);
        });
        focus(deskWindows(currentDesk)[0]);
        refresh();
        toggleStartMenu(false);
    });

    function miniWindow(win) {
        var mini = document.createElement('span');
        mini.className = 'ov-mini-win';
        ['window-wide', 'window-skill', 'window-full', 'is-active'].forEach(function (cls) {
            if (win.classList.contains(cls)) mini.classList.add(cls.replace('window-', 'is-'));
        });
        mini.appendChild(iconImg(win.dataset.icon));
        return mini;
    }

    function windowTile(win) {
        var tile = document.createElement('button');
        tile.type = 'button';
        tile.className = 'ov-win';
        tile.classList.toggle('is-active', win.classList.contains('is-active'));
        tile.classList.toggle('is-minimized', win.classList.contains('is-minimized'));
        tile._win = win;

        var bar = document.createElement('span');
        bar.className = 'ov-win-bar';
        bar.appendChild(iconImg(win.dataset.icon));
        var title = document.createElement('span');
        title.textContent = win.dataset.title;
        bar.appendChild(title);
        tile.appendChild(bar);

        var content = document.createElement('span');
        content.className = 'ov-win-body';
        content.appendChild(iconImg(win.dataset.icon));
        var desc = document.createElement('span');
        desc.textContent = win.dataset.desc || '';
        content.appendChild(desc);
        if (win.classList.contains('is-minimized')) {
            var tag = document.createElement('span');
            tag.className = 'ov-win-tag';
            tag.textContent = 'minimized';
            content.appendChild(tag);
        }
        tile.appendChild(content);
        return tile;
    }

    function renderOverview() {
        ovDesks.textContent = '';
        desktops.forEach(function (desk, i) {
            var card = document.createElement('button');
            card.type = 'button';
            card.className = 'ov-desk';
            card.classList.toggle('is-active', desk === currentDesk);
            card.setAttribute('aria-pressed', String(desk === currentDesk));
            card._desk = desk;

            var preview = document.createElement('span');
            preview.className = 'ov-mini';
            deskWindows(desk).filter(isVisible).forEach(function (w) {
                preview.appendChild(miniWindow(w));
            });
            card.appendChild(preview);

            var name = document.createElement('span');
            name.className = 'ov-desk-name';
            name.textContent = 'Desktop ' + (i + 1) + ' · ' + desk.dataset.name;
            card.appendChild(name);
            ovDesks.appendChild(card);
        });

        var add = document.createElement('button');
        add.type = 'button';
        add.className = 'ov-add';
        add.setAttribute('aria-label', 'Add desktop');
        add.innerHTML = '<span aria-hidden="true">+</span><span class="ov-desk-name">New Desktop</span>';
        ovDesks.appendChild(add);

        ovWindows.textContent = '';
        var shown = deskWindows(currentDesk).filter(function (w) { return !w.classList.contains('is-closed'); });
        shown.forEach(function (w) { ovWindows.appendChild(windowTile(w)); });
        ovEmpty.hidden = shown.length > 0;
    }

    function toggleOverview(force) {
        var show = typeof force === 'boolean' ? force : overview.hidden;
        if (show === !overview.hidden) return;
        sfx(show ? 'overview' : 'menuClose');
        overview.hidden = !show;
        pagerBtn.classList.toggle('is-active', show);
        body.classList.toggle('has-overview', show);
        if (!show) return;
        toggleStartMenu(false);
        renderOverview();
    }

    overview.addEventListener('click', function (e) {
        var desk = e.target.closest('.ov-desk');
        if (desk) {
            toggleOverview(false);
            switchDesktop(desk._desk);
            return;
        }
        var add = e.target.closest('.ov-add');
        if (add) {
            add.querySelector('.ov-desk-name').textContent = 'Three is plenty';
            add.classList.remove('is-denied');
            void add.offsetWidth;
            add.classList.add('is-denied');
            return;
        }
        var tile = e.target.closest('.ov-win');
        toggleOverview(false);
        if (tile) open(tile._win);
    });

    pagerCells.forEach(function (cell, i) {
        cell.addEventListener('click', function (e) {
            e.stopPropagation();
            if (desktops[i] === currentDesk) {
                toggleOverview();
            } else {
                toggleOverview(false);
                switchDesktop(desktops[i]);
            }
        });
    });

    hotCorner.addEventListener('mouseenter', function () {
        toggleOverview();
    });

    taskbarItems.addEventListener('wheel', function (e) {
        if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
        if (taskbarItems.scrollWidth <= taskbarItems.clientWidth) return;
        taskbarItems.scrollLeft += e.deltaY;
        e.preventDefault();
    }, { passive: false });

    taskbarItems.addEventListener('scroll', updateTaskbarScroll, { passive: true });
    window.addEventListener('resize', updateTaskbarScroll);
    window.addEventListener('load', updateTaskbarScroll);

    arrowLeft.addEventListener('click', function () {
        taskbarItems.scrollBy({ left: -160, behavior: 'smooth' });
    });
    arrowRight.addEventListener('click', function () {
        taskbarItems.scrollBy({ left: 160, behavior: 'smooth' });
    });

    document.addEventListener('mouseover', function (e) {
        var card = e.target.closest('.skill-item, .term-link, .git-fact');
        if (!card || card.contains(e.relatedTarget)) return;
        var deg = (2 + Math.random() * 4) * (Math.random() < 0.5 ? -1 : 1);
        card.style.setProperty('--tilt', deg.toFixed(1) + 'deg');
    });

    function tipItems() {
        return Array.prototype.slice.call(document.querySelectorAll('[data-tip]'));
    }

    document.addEventListener('click', function (e) {
        if (!startMenu.hidden && !startMenu.contains(e.target)) toggleStartMenu(false);
        if (!overview.hidden && e.composedPath().indexOf(overview) === -1) toggleOverview(false);

        var tapped = e.target.closest('[data-tip]');
        tipItems().forEach(function (item) {
            item.classList.toggle('show-tip', item === tapped && !item.classList.contains('show-tip'));
        });
    });

    document.addEventListener('keydown', function (e) {
        if (e.ctrlKey && e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
            e.preventDefault();
            shiftDesktop(e.key === 'ArrowRight' ? 1 : -1);
            return;
        }
        if (e.metaKey && e.key === 'Tab') {
            e.preventDefault();
            toggleOverview();
            return;
        }
        if (e.key !== 'Escape') return;
        tipItems().forEach(function (item) { item.classList.remove('show-tip'); });
        if (!startMenu.hidden) {
            toggleStartMenu(false);
            return;
        }
        if (!overview.hidden) {
            toggleOverview(false);
            pagerCells[desktops.indexOf(currentDesk)].focus({ preventScroll: true });
            return;
        }
        windows.forEach(unmaximize);
        refresh();
    });

    var mobile = window.matchMedia('(max-width: 768px)');
    var PULL_MAX = 140;
    var PULL_GO = 95;
    var pullHint = document.createElement('div');
    pullHint.className = 'pull-hint';
    pullHint.setAttribute('aria-hidden', 'true');
    pullHint.innerHTML = '<span class="pull-arrow"></span><span class="pull-text"></span><span class="pull-meter"><i></i></span>';
    pullHint.hidden = true;
    body.appendChild(pullHint);
    var pullText = pullHint.querySelector('.pull-text');
    var pull = null;

    function deskName(desk) {
        return pagerCells[desktops.indexOf(desk)].getAttribute('aria-label');
    }

    function innerScroller(el, down) {
        for (; el && el !== body; el = el.parentElement) {
            var oy = getComputedStyle(el).overflowY;
            if ((oy !== 'auto' && oy !== 'scroll') || el.scrollHeight <= el.clientHeight + 1) continue;
            if (down ? el.scrollTop > 0 : el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;
        }
        return false;
    }

    function setPull(dist) {
        var ready = dist >= PULL_GO;
        if (ready && !pull.ready) {
            sfx('tick');
            if (navigator.vibrate) navigator.vibrate(12);
        }
        pull.ready = ready;
        pull.dist = dist;
        pullText.textContent = (ready ? 'Release for ' : 'Pull for ') + deskName(pull.target);
        pullHint.classList.toggle('is-ready', ready);
        pullHint.style.setProperty('--p', Math.min(1, dist / PULL_GO));
        if (!reduceMotion) workspaces.style.transform = 'translateY(' + (pull.dir * dist * 0.35).toFixed(1) + 'px)';
    }

    function endPull() {
        if (!pull) return;
        var go = pull.active && pull.ready ? pull.target : null;
        pull = null;
        pullHint.hidden = true;
        pullHint.classList.remove('is-ready');
        workspaces.style.transition = 'transform 0.25s ease';
        workspaces.style.transform = '';
        setTimeout(function () { workspaces.style.transition = ''; }, 260);
        if (go) switchDesktop(go);
    }

    document.addEventListener('touchstart', function (e) {
        pull = null;
        if (!mobile.matches || e.touches.length !== 1) return;
        if (!startMenu.hidden || !overview.hidden || body.classList.contains('has-maximized')) return;
        if (e.target.closest('.taskbar, .marquee-container')) return;
        pull = { x: e.touches[0].clientX, y: e.touches[0].clientY, el: e.target, active: false };
    }, { passive: true });

    document.addEventListener('touchmove', function (e) {
        if (!pull) return;
        var t = e.touches[0];
        if (!pull.active) {
            var dy = t.clientY - pull.y;
            if (Math.abs(t.clientX - pull.x) > Math.abs(dy)) return;
            var root = document.scrollingElement || document.documentElement;
            var atTop = root.scrollTop <= 0;
            var atBottom = root.scrollTop + root.clientHeight >= root.scrollHeight - 1;
            var dir = dy > 0 && atTop ? -1 : dy < 0 && atBottom ? 1 : 0;
            var target = desktops[desktops.indexOf(currentDesk) + dir];
            if (!dir || !target || innerScroller(pull.el, dy > 0)) {
                pull.y = t.clientY;
                pull.x = t.clientX;
                return;
            }
            pull.active = true;
            pull.dir = -dir;
            pull.target = target;
            pullHint.classList.toggle('is-top', dir < 0);
            pullHint.classList.toggle('is-bottom', dir > 0);
            pullHint.hidden = false;
        }
        var raw = (t.clientY - pull.y) * pull.dir;
        if (raw <= 0) {
            setPull(0);
            return;
        }
        e.preventDefault();
        setPull(PULL_MAX * (1 - Math.exp(-raw / (PULL_MAX * 1.6))));
    }, { passive: false });

    document.addEventListener('touchend', endPull);
    document.addEventListener('touchcancel', function () {
        if (pull) pull.ready = false;
        endPull();
    });

    workspaces.addEventListener('animationend', function (e) {
        e.target.classList.remove('is-opening', 'is-entering-next', 'is-entering-prev');
    });

    function replayTerminal(win) {
        var term = win.querySelector('.is-running');
        if (!term) return;
        term.classList.remove('is-running');
        void term.offsetWidth;
        term.classList.add('is-running');
    }

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if ('IntersectionObserver' in window && !reduceMotion) {
        var termObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-running');
                termObserver.unobserve(entry.target);
            });
        }, { threshold: 0.3 });
        Array.prototype.forEach.call(document.querySelectorAll('.terminal, .git-board'), function (term) {
            term.classList.add('will-run');
            termObserver.observe(term);
        });
    }

    var copyBtn = document.querySelector('.term-copy');
    var email = document.querySelector('.term-email');
    if (copyBtn && email && navigator.clipboard) {
        copyBtn.hidden = false;
        copyBtn.addEventListener('click', function () {
            navigator.clipboard.writeText(email.textContent.trim()).then(function () {
                copyBtn.textContent = 'copied!';
                copyBtn.classList.add('is-copied');
                setTimeout(function () {
                    copyBtn.textContent = 'copy';
                    copyBtn.classList.remove('is-copied');
                }, 1500);
            });
        });
    }

    function tick() {
        var now = new Date();
        clockTime.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        clockDate.textContent = now.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
        clockDate.dateTime = now.toISOString().slice(0, 10);
    }
    tick();
    setInterval(tick, 15000);

    var savedDesk;
    try { savedDesk = desktops[Number(sessionStorage.getItem(DESK_KEY))]; } catch (e) {}
    if (savedDesk && savedDesk !== currentDesk) {
        currentDesk.hidden = true;
        currentDesk = savedDesk;
        currentDesk.hidden = false;
    }
    document.documentElement.removeAttribute('data-desk');

    focus(deskWindows(currentDesk)[0], currentDesk === desktops[0]);
    refresh();
})();
