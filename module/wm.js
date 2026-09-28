(function () {
    var ICONS = {
        min: '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1.5 8h7"/></svg>',
        max: '<svg class="icon-max" viewBox="0 0 10 10" aria-hidden="true"><rect x="1.5" y="1.5" width="7" height="7"/></svg>' +
             '<svg class="icon-restore" viewBox="0 0 10 10" aria-hidden="true"><path d="M3.5 3.5V1.5h5v5h-2"/><rect x="1.5" y="3.5" width="5" height="5"/></svg>',
        close: '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 2l6 6M8 2l-6 6"/></svg>'
    };

    var body = document.body;
    var desktop = document.querySelector('.desktop');
    var emptyState = document.querySelector('.desktop-empty');
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
        entry.setAttribute('role', 'menuitem');
        entry.appendChild(iconImg(win.dataset.icon));
        var entryLabel = document.createElement('span');
        entryLabel.textContent = title;
        entry.appendChild(entryLabel);
        li.appendChild(entry);
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
        var next = windows.filter(isVisible)[0];
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
        emptyState.hidden = windows.some(isVisible);
        windows.forEach(function (w) {
            w._task.hidden = w.classList.contains('is-closed');
            w._task.classList.toggle('is-minimized', w.classList.contains('is-minimized'));
        });
        updateTaskbarScroll();
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
        var wasHidden = !isVisible(win);
        win.classList.remove('is-minimized', 'is-closed');
        focus(win);
        refresh();
        if (wasHidden) {
            animateIn(win);
            replayTerminal(win);
        }
        if (!win.classList.contains('is-maximized')) {
            win.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    function minimize(win) {
        unmaximize(win);
        win.classList.add('is-minimized');
        blurIfActive(win);
        refresh();
    }

    function close(win) {
        unmaximize(win);
        win.classList.remove('is-minimized');
        win.classList.add('is-closed');
        blurIfActive(win);
        refresh();
    }

    function toggleMaximize(win) {
        var maximize = !win.classList.contains('is-maximized');
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

    function toggleStartMenu(force) {
        var show = typeof force === 'boolean' ? force : startMenu.hidden;
        startMenu.hidden = !show;
        startBtn.setAttribute('aria-expanded', String(show));
        startBtn.classList.toggle('is-active', show);
    }

    startBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleStartMenu();
    });

    startReset.addEventListener('click', function () {
        windows.forEach(function (w) {
            unmaximize(w);
            w.classList.remove('is-minimized', 'is-closed');
            animateIn(w);
        });
        focus(windows[0]);
        refresh();
        toggleStartMenu(false);
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

        var tapped = e.target.closest('[data-tip]');
        tipItems().forEach(function (item) {
            item.classList.toggle('show-tip', item === tapped && !item.classList.contains('show-tip'));
        });
    });

    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        tipItems().forEach(function (item) { item.classList.remove('show-tip'); });
        if (!startMenu.hidden) {
            toggleStartMenu(false);
            return;
        }
        windows.forEach(unmaximize);
        refresh();
    });

    desktop.addEventListener('animationend', function (e) {
        e.target.classList.remove('is-opening');
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

    focus(windows[0], true);
    refresh();
})();
