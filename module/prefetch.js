(function () {
    Array.prototype.forEach.call(document.querySelectorAll('img[loading="lazy"]'), function (img) {
        if (img.complete) return;
        img.addEventListener('load', function () {
            if (img.offsetParent) img.classList.add('img-in');
        }, { once: true });
    });

    var net = navigator.connection;
    if (net && (net.saveData || /2g/.test(net.effectiveType || ''))) return;

    var PARALLEL = 4;
    var seen = {};
    var queue = [];
    var running = 0;
    var desktops = Array.prototype.slice.call(document.querySelectorAll('.desktop'));
    var groups = desktops.map(function () { return []; });

    function add(list, url) {
        if (!url || seen[url]) return;
        seen[url] = true;
        list.push(url);
    }

    function lazyIn(scope, list) {
        Array.prototype.forEach.call(scope.querySelectorAll('img[loading="lazy"]'), function (img) {
            if (!img.complete) add(list, img.getAttribute('src'));
        });
    }

    function pump() {
        while (running < PARALLEL && queue.length) {
            var img = new Image();
            running++;
            img.decoding = 'async';
            img.onload = img.onerror = function () {
                running--;
                schedule();
            };
            img.src = queue.shift();
        }
    }

    function schedule() {
        if (!queue.length) return;
        if (window.requestIdleCallback) requestIdleCallback(pump, { timeout: 1500 });
        else setTimeout(pump, 50);
    }

    function boost(index) {
        var list = groups[index];
        if (!list || !list.length) return;
        queue = list.concat(queue.filter(function (url) { return list.indexOf(url) === -1; }));
        groups[index] = [];
        pump();
    }

    function start() {
        desktops.forEach(function (desk, i) { lazyIn(desk, groups[i]); });

        var hobby = groups[desktops.length - 1];
        add(hobby, 'img/hobby/steam-bg.jpg');
        (window.MUSIC_LIBRARY || []).forEach(function (a) {
            if (a.img) add(hobby, 'img/music/' + a.img + '.webp');
        });
        var played = window.YTM_ARTISTS || {};
        Object.keys(played).forEach(function (name) {
            played[name].forEach(function (t) { add(hobby, 'img/ytm/' + t[1] + '.webp'); });
        });

        var current = desktops.filter(function (d) { return !d.hidden; })[0];
        var first = desktops.indexOf(current);
        desktops.forEach(function (d, i) {
            var at = (first + i) % desktops.length;
            queue = queue.concat(groups[at]);
        });
        schedule();
    }

    Array.prototype.forEach.call(document.querySelectorAll('.pager-cell'), function (cell, i) {
        ['pointerenter', 'focus', 'touchstart'].forEach(function (type) {
            cell.addEventListener(type, function () { boost(i); }, { passive: true });
        });
    });

    if (document.readyState === 'complete') setTimeout(start, 300);
    else window.addEventListener('load', function () { setTimeout(start, 300); });
})();
