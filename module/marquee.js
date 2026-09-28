(function () {
    var MESSAGES = [
        "IT'S ALWAYS DNS",
        "THERE IS NO CLOUD, IT'S JUST SOMEONE ELSE'S COMPUTER",
        'IT WORKS ON MY MACHINE',
        'HAVE YOU TRIED TURNING IT OFF AND ON AGAIN?',
        "DON'T DEPLOY ON FRIDAYS",
        'INCIDENTS TODAY: 0 (SO FAR)',
        'NOW SERVING 1 VISITOR: YOU',
        'NO COOKIES ON THIS SITE, SORRY',
        'UNDER CONSTRUCTION SINCE 2020',
        'SIGN MY GUESTBOOK (THERE IS NO GUESTBOOK)',
        '99.9% UPTIME. THE 0.1% WAS DNS',
        'BEST VIEWED WITH ANY MODERN BROWSER',
        'TIP: TRY CLOSING ALL THE WINDOWS',
        'TIP: DOUBLE-CLICK A TITLE BAR',
        'LOADING... 99%',
        'THIS MARQUEE IS NOT LOAD BALANCED'
    ];
    var PIXELS_PER_SECOND = 70;

    var track = document.querySelector('.marquee-track');
    var spans = document.querySelectorAll('.marquee-content');
    if (!track || !spans.length) return;

    var pool = MESSAGES.slice();
    for (var i = pool.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = pool[i];
        pool[i] = pool[j];
        pool[j] = tmp;
    }

    var text = pool.join(' *** ') + ' ***';
    Array.prototype.forEach.call(spans, function (span) {
        span.textContent = text;
    });

    function setSpeed() {
        track.style.animationDuration = (spans[0].offsetWidth / PIXELS_PER_SECOND) + 's';
    }
    setSpeed();
    window.addEventListener('load', setSpeed);
})();
