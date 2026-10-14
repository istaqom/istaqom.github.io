(function () {
    // LinkedIn-style tenure, counting both the start and current month
    Array.prototype.forEach.call(document.querySelectorAll('[data-since]'), function (el) {
        var parts = el.dataset.since.split('-');
        var now = new Date();
        var months = (now.getFullYear() - parts[0]) * 12 + now.getMonth() - (parts[1] - 1) + 1;
        var years = Math.floor(months / 12);
        var rest = months % 12;
        var out = [];
        if (years) out.push(years + (years === 1 ? ' yr' : ' yrs'));
        if (rest || !years) out.push(rest + (rest === 1 ? ' mo' : ' mos'));
        el.textContent = out.join(' ');
    });

    var DAY = 86400000;
    var LOCK = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/></svg>';
    var UNLOCK = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 0 1 4.9-.7"/></svg>';
    var certs = Array.prototype.slice.call(document.querySelectorAll('.cert'));
    var counts = { all: certs.length, valid: 0, expired: 0 };
    certs.forEach(function (cert) {
        var status = cert.querySelector('.cert-status');
        var text;
        var label = '';
        if (!cert.dataset.expires) {
            text = 'No expiration';
            cert._state = 'valid';
        } else {
            var parts = cert.dataset.expires.split('-');
            var expiry = new Date(parts[0], parts[1] - 1, 1);
            var days = Math.ceil((expiry - Date.now()) / DAY);
            label = expiry.toLocaleDateString('en', { month: 'short', year: 'numeric' });
            if (days > 0) {
                text = 'Valid';
                label = 'until ' + label;
                if (days <= 30) cert.classList.add('is-expiring');
                cert._state = 'valid';
            } else {
                text = 'Expired';
                cert.classList.add('is-expired');
                cert._state = 'expired';
            }
        }
        status.innerHTML = cert._state === 'valid' ? LOCK : UNLOCK;
        status.appendChild(document.createTextNode(text));
        if (label) {
            var when = document.createElement('span');
            when.className = 'cert-when';
            when.textContent = label;
            status.appendChild(when);
        }
        counts[cert._state]++;
    });

    var summary = document.querySelector('[data-cert-summary]');
    if (summary && counts.expired) {
        summary.textContent = counts.expired + ' of ' + counts.all + ' expired. Renewal hook not configured, same as prod.';
    }

    // SSL Labs-style report card
    var ratio = counts.valid / counts.all;
    var grades = [
        [0.9, 'A', 'Trust chain intact'],
        [0.75, 'B', 'Mostly trusted'],
        [0.6, 'C', 'Browser looks nervous'],
        [0.4, 'D', 'Proceed (unsafe)'],
        [0, 'F', 'NET::ERR_CERT_DATE_INVALID']
    ].filter(function (g) { return ratio >= g[0]; })[0];
    var gradeEl = document.querySelector('[data-cert-grade]');
    if (gradeEl) {
        gradeEl.textContent = grades[1];
        gradeEl.classList.add('is-' + grades[1].toLowerCase());
        gradeEl.setAttribute('aria-label', 'Overall rating ' + grades[1]);
        document.querySelector('[data-cert-verdict]').textContent = grades[2];
    }

    var bar = document.querySelector('[data-cert-bar]');
    if (bar) {
        certs.slice().reverse().forEach(function (cert) {
            var seg = document.createElement('span');
            seg.className = 'cert-seg is-' + cert._state + (cert.classList.contains('is-expiring') ? ' is-expiring' : '');
            seg.title = cert.querySelector('.cert-name').textContent;
            seg.addEventListener('mouseenter', function () { cert.classList.add('is-hinted'); });
            seg.addEventListener('mouseleave', function () { cert.classList.remove('is-hinted'); });
            bar.appendChild(seg);
        });
    }

    var renewBtn = document.querySelector('[data-cert-renew]');
    var log = document.querySelector('[data-cert-log]');
    var excuses = [
        'certbot: 0 renewed, ' + counts.expired + ' failed. Cause: course already completed.',
        'Renewal failed: the knowledge is still there, the PDF just disagrees.',
        'Error 409: Dicoding says retake the exam. Dicoding is right.',
        'Renewal postponed to next sprint. And the one after that.',
        'Tried turning it off and on again. Still expired.'
    ];
    var attempt = 0;
    if (renewBtn && log) {
        renewBtn.addEventListener('click', function () {
            var expired = certs.filter(function (c) { return c._state === 'expired'; });
            var label = renewBtn.querySelector('span');
            var i = 0;
            renewBtn.disabled = true;
            renewBtn.classList.add('is-busy');
            label.textContent = 'Renewing...';
            (function next() {
                if (i > 0) {
                    expired[i - 1].classList.remove('is-renewing');
                    expired[i - 1].classList.add('is-failed');
                }
                if (i === expired.length) {
                    if (window.SFX) window.SFX.play('fail');
                    log.textContent = excuses[attempt++ % excuses.length];
                    label.textContent = 'Try again';
                    renewBtn.disabled = false;
                    renewBtn.classList.remove('is-busy');
                    setTimeout(function () {
                        expired.forEach(function (c) { c.classList.remove('is-failed'); });
                    }, 600);
                    return;
                }
                var cert = expired[i++];
                if (window.SFX) window.SFX.play('tick');
                cert.classList.add('is-renewing');
                log.textContent = 'certbot renew --cert-name "' + cert.querySelector('.cert-name').textContent + '"';
                setTimeout(next, 260);
            })();
        });
    }

    var filters = Array.prototype.slice.call(document.querySelectorAll('.cert-filter'));
    filters.forEach(function (btn) {
        btn.querySelector('span').textContent = counts[btn.dataset.filter];
        btn.addEventListener('click', function () {
            filters.forEach(function (b) {
                var on = b === btn;
                b.classList.toggle('is-active', on);
                b.setAttribute('aria-pressed', String(on));
            });
            certs.forEach(function (cert) {
                cert.hidden = btn.dataset.filter !== 'all' && cert._state !== btn.dataset.filter;
            });
        });
    });
})();

(function () {
    var wrap = document.querySelector('.li-avatar-wrap');
    if (!wrap) return;

    var bubble = wrap.querySelector('.li-bubble');
    var lines = [
        'open to work? already working',
        'endorse me for HTML pls',
        'now with 100% more cloud',
        'full stack, cloud focused',
        'connect? I accept everyone',
        'yes, the cert expired',
        'git commit -m "career"',
        'professional mode: on'
    ];
    var index = 0;

    function next() {
        index = (index + 1) % lines.length;
        bubble.textContent = lines[index];
        bubble.classList.remove('is-new');
        void bubble.offsetWidth;
        bubble.classList.add('is-new');
    }

    setInterval(function () {
        if (!document.hidden && wrap.offsetParent) next();
    }, 4000);

    wrap.addEventListener('click', function () {
        next();
        wrap.classList.remove('is-poked');
        void wrap.offsetWidth;
        wrap.classList.add('is-poked');
    });
    wrap.addEventListener('animationend', function (e) {
        if (e.animationName === 'me-jelly') wrap.classList.remove('is-poked');
    });
})();

(function () {
    var wrap = document.querySelector('.me-wrap');
    if (!wrap) return;

    var img = wrap.querySelector('.me');
    var bubble = wrap.querySelector('.me-bubble');
    var canHover = window.matchMedia('(hover: hover)').matches;

    var greetings = [
        'hello, world!',
        'halo!',
        'ping? pong!',
        '200 OK',
        "it's me!",
        'sudo say hi',
        'no bugs here, I promise',
        'deploying smile...'
    ];
    if (typeof calculate_age === 'function') {
        greetings.push('uptime: ' + calculate_age(BIRTHDAY) + ' years');
    }

    var last = -1;
    function nextGreeting() {
        var i;
        do {
            i = Math.floor(Math.random() * greetings.length);
        } while (i === last && greetings.length > 1);
        last = i;
        bubble.textContent = greetings[i];
    }

    function replayJelly() {
        img.style.animation = 'none';
        void img.offsetWidth;
        img.style.animation = '';
    }

    wrap.addEventListener('mouseenter', nextGreeting);

    wrap.addEventListener('click', function () {
        nextGreeting();
        replayJelly();
        if (!canHover) wrap.classList.add('is-poked');
    });

    document.addEventListener('click', function (e) {
        if (!wrap.contains(e.target)) wrap.classList.remove('is-poked');
    });
})();
