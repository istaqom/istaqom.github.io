(function () {
    var form = document.querySelector('[data-shell]');
    if (!form) return;

    var input = form.querySelector('.term-input');
    var historyEl = document.querySelector('.term-history');
    var terminal = form.closest('.terminal');
    var coarse = window.matchMedia('(pointer: coarse)');

    var MAX_ENTRIES = 5;
    var HACKED_MS = 5000;
    var REBOOTED_KEY = 'magi-rebooted';

    var PRIVILEGE = /^(sudo|doas|pkexec|run0)(\s+-\S+)*\s+/;
    var SU_C = /^su(\s+-)?\s+-c\s+/;
    var REBOOTS = [
        /^reboot(\s+(-f|--force|now))*$/,
        /^systemctl(\s+(-i|-f|--force))*\s+reboot(\s+(-i|-f|--force))*$/,
        /^shutdown\s+(-r|--reboot)(\s+(now|\+?0|00:00))?$/,
        /^(init|telinit|runit-init)\s+6$/,
        /^loginctl\s+reboot$/,
        /^openrc-shutdown\s+-r(\s+now)?$/,
        /^busybox\s+reboot$/,
        /^(halt|poweroff)\s+--reboot$/,
        /^(sh\s+-c\s+["']?)?echo\s+b\s*>\s*\/proc\/sysrq-trigger["']?$/,
        /^echo\s+b\s*\|\s*((sudo|doas)\s+)?tee\s+\/proc\/sysrq-trigger$/
    ];

    var HACK_LOG = [
        ['ok', '[  OK  ] Stopped target Graphical Interface.'],
        ['ok', '[  OK  ] Stopped jellyfin.service - Netflix at home.'],
        ['ok', '[  OK  ] Stopped minecraft.service - the real reason the Xeon exists.'],
        ['fail', '[FAILED] Failed to stop qbittorrent.service - still seeding.'],
        ['warn', '[ WARN ] unknown session attached to tty1'],
        ['warn', '[ WARN ] ssh: new connection from 127.0.0.1 (hi, that\'s you)'],
        ['fail', '[  !!  ] root password changed'],
        ['fail', '[  !!  ] uploading ~/memes to somewhere...'],
        ['fail', 'kernel: they\'re in.']
    ];

    var BOOT_LOG = [
        ['ok', 'magi login: rebooting...'],
        ['ok', 'Loading Linux 6.8.12-pve ...'],
        ['ok', '[  OK  ] Started immich.service'],
        ['ok', '[  OK  ] Started crafty.service'],
        ['ok', '[  OK  ] Reached target Multi-User System.']
    ];

    var SNARK = [
        'this box only knows how to turn itself off and on again',
        'have you tried turning it off and on again?',
        'hint: every distro has its own way to restart'
    ];

    var history = [];
    var historyIndex = 0;
    var fails = 0;

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text) node.textContent = text;
        return node;
    }

    function normalize(cmd) {
        var out = cmd.trim().replace(/\s+/g, ' ').toLowerCase();
        var prev;
        do {
            prev = out;
            out = out.replace(PRIVILEGE, '').replace(SU_C, '').replace(/^["']|["']$/g, '');
        } while (out !== prev);
        return out;
    }

    function isReboot(cmd) {
        var clean = normalize(cmd);
        return REBOOTS.some(function (re) { return re.test(clean); });
    }

    function reply(cmd) {
        var clean = normalize(cmd);
        var name = clean.split(' ')[0];
        if (/^shutdown\s+\/r/.test(clean)) return 'wrong OS, bro. this one runs Linux';
        if (/^rm\s+-(rf|fr)\s+\/(\*)?$/.test(clean)) return 'nice try. the homelab has backups (it doesn\'t)';
        if (/^(poweroff|halt|shutdown)\b/.test(clean)) return 'turning it off is easy. turning it back on is the hard part';
        if (name === 'exit' || name === 'logout') return 'there is no escape';
        if (name === 'help' || name === 'man') return 'no manual entries. ' + SNARK[0];
        if (PRIVILEGE.test(cmd.trim().toLowerCase() + ' ')) return 'istaqom is not in the sudoers file. This incident will be reported.';
        fails++;
        var msg = 'bash: ' + name + ': command not found';
        return fails % 3 === 0 ? msg + '\n# ' + SNARK[(fails / 3 - 1) % SNARK.length] : msg;
    }

    function addEntry(cmd, output) {
        var entry = el('div', 'term-entry');
        if (cmd !== null) {
            var line = el('p', 'term-line');
            line.appendChild(el('span', 'term-prompt', 'istaqom@magi:~$'));
            line.appendChild(document.createTextNode(' ' + cmd));
            entry.appendChild(line);
        }
        if (output) entry.appendChild(el('p', 'term-out term-reply', output));
        historyEl.appendChild(entry);
        while (historyEl.children.length > MAX_ENTRIES) historyEl.removeChild(historyEl.firstChild);
    }

    function printLog(target, lines, delay, done) {
        lines.forEach(function (line, i) {
            setTimeout(function () {
                target.appendChild(el('span', 'is-' + line[0], line[1] + '\n'));
            }, i * delay);
        });
        setTimeout(done, lines.length * delay + 400);
    }

    function reboot() {
        input.disabled = true;
        input.blur();
        document.body.classList.add('is-glitching', 'is-rebooting');

        var screen = el('div', 'reboot-screen');
        screen.setAttribute('role', 'alert');
        var log = el('pre', 'reboot-log');
        var hacked = el('div', 'reboot-hacked');
        var logo = el('img');
        logo.src = 'img/logo-tp.png';
        logo.alt = '';
        var title = el('p', 'reboot-title', 'magi has been taken over');
        var bar = el('div', 'reboot-bar');
        bar.style.setProperty('--duration', HACKED_MS + 'ms');
        bar.appendChild(el('span'));
        hacked.appendChild(logo);
        hacked.appendChild(title);
        hacked.appendChild(bar);
        screen.appendChild(log);
        screen.appendChild(hacked);

        setTimeout(function () {
            document.body.classList.remove('is-glitching');
            document.body.appendChild(screen);
            printLog(log, HACK_LOG, 220, showHacked);
        }, 700);

        function showHacked() {
            screen.classList.add('show-hacked');
            setTimeout(function () {
                screen.classList.remove('show-hacked');
                log.textContent = '';
                printLog(log, BOOT_LOG, 260, function () {
                    try { sessionStorage.setItem(REBOOTED_KEY, '1'); } catch (e) {}
                    location.reload();
                });
            }, HACKED_MS);
        }
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        var cmd = input.value.trim();
        input.value = '';
        if (!cmd) {
            addEntry('', null);
            return;
        }
        history.push(cmd);
        historyIndex = history.length;

        if (normalize(cmd) === 'clear') {
            historyEl.replaceChildren();
            return;
        }
        if (isReboot(cmd)) {
            addEntry(cmd, 'Broadcast message from root@magi: The system is going down for reboot NOW!');
            reboot();
            return;
        }
        addEntry(cmd, reply(cmd));
    });

    input.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowUp' && historyIndex > 0) {
            historyIndex--;
        } else if (e.key === 'ArrowDown' && historyIndex < history.length) {
            historyIndex++;
        } else {
            return;
        }
        e.preventDefault();
        input.value = history[historyIndex] || '';
    });

    terminal.addEventListener('click', function (e) {
        if (e.target.closest('a, button, input')) return;
        if (coarse.matches && !e.target.closest('.term-shell')) return;
        var selection = window.getSelection();
        if (selection && !selection.isCollapsed) return;
        input.focus({ preventScroll: true });
    });

    try {
        if (sessionStorage.getItem(REBOOTED_KEY)) {
            sessionStorage.removeItem(REBOOTED_KEY);
            addEntry(null, '# system rebooted. uptime: 0 min. who did that?');
        }
    } catch (e) {}
})();
