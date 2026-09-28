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
        greetings.push('uptime: ' + calculate_age(new Date(2002, 9, 15)) + ' years');
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
