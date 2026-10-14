(function () {
    var SIZE = 40;
    var HUE_BUCKETS = 24;

    var canvas = document.createElement('canvas');
    canvas.width = canvas.height = SIZE;
    var ctx = canvas.getContext && canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    function rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        var max = Math.max(r, g, b);
        var min = Math.min(r, g, b);
        var l = (max + min) / 2;
        var d = max - min;
        if (!d) return [0, 0, l];
        var s = d / (1 - Math.abs(2 * l - 1));
        var h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
        return [(h * 60 + 360) % 360, s, l];
    }

    // Weighted by saturation so a small bright mark beats a large dull area;
    // transparent, near-white, near-black and gray pixels are ignored.
    function dominantColor(img) {
        ctx.clearRect(0, 0, SIZE, SIZE);
        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        var data = ctx.getImageData(0, 0, SIZE, SIZE).data;
        var buckets = [];
        for (var i = 0; i < data.length; i += 4) {
            if (data[i + 3] < 128) continue;
            var hsl = rgbToHsl(data[i], data[i + 1], data[i + 2]);
            if (hsl[1] < 0.25 || hsl[2] < 0.12 || hsl[2] > 0.92) continue;
            var key = Math.round(hsl[0] / (360 / HUE_BUCKETS)) % HUE_BUCKETS;
            var bucket = buckets[key] || (buckets[key] = { w: 0, h: 0, s: 0 });
            var w = hsl[1];
            bucket.w += w;
            bucket.h += hsl[0] * w;
            bucket.s += hsl[1] * w;
        }
        var best = null;
        buckets.forEach(function (b) { if (b && (!best || b.w > best.w)) best = b; });
        if (!best || best.w < 4) return null;
        return { h: best.h / best.w, s: best.s / best.w };
    }

    function paint(card, img) {
        var color;
        try {
            color = dominantColor(img);
        } catch (e) {
            return;
        }
        var h = color ? Math.round(color.h) : 210;
        var sat = color ? Math.round(Math.min(Math.max(color.s, 0.55), 0.9) * 100) : 15;
        card.style.setProperty('--card-h', h);
        card.style.setProperty('--card-s', sat + '%');
    }

    Array.prototype.forEach.call(document.querySelectorAll('.skill-item, .term-link'), function (card) {
        var img = card.querySelector('img');
        if (!img) return;
        if (img.complete && img.naturalWidth) paint(card, img);
        else img.addEventListener('load', function () { paint(card, img); }, { once: true });
    });
})();
