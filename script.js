// One Piece portfolio — vanilla JS effects
document.documentElement.classList.add('js');

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* canvas colors per mode: day = ink flecks, night = lantern embers + moonlight */
const palettes = {
    day: { p1: '61, 47, 35', p2: '194, 85, 74', wake: '61, 47, 35', boost: 1 },
    night: { p1: '224, 169, 79', p2: '205, 192, 160', wake: '230, 214, 180', boost: 2.2 }
};
let palette = palettes.day;

/* ---------- scroll progress + navbar state ---------- */
const bar = $('#progressBar');
const ship = $('#progressShip');
const navbar = $('#navbar');

const toTop = $('#toTop');
const vivre = $('#vivre');
const contactSec = $('#contact');
const lpNeedle = $('.lp-needle');
let sailTimer;

function onScroll() {
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(scrollY / max, 1) : 0;
    bar.style.width = (p * 100) + '%';
    ship.style.left = (p * 100) + '%';
    navbar.classList.toggle('scrolled', scrollY > 40);
    toTop.classList.toggle('show', scrollY > 600);
    // the Merry bobs and trails a wake while under sail
    ship.classList.add('sailing');
    clearTimeout(sailTimer);
    sailTimer = setTimeout(() => ship.classList.remove('sailing'), 450);
    // log pose needle swings as you voyage down the page
    if (lpNeedle) lpNeedle.style.transform = `rotate(${(p * 300).toFixed(1)}deg)`;
    // vivre card always points toward its person (the contact section)
    if (vivre && contactSec) {
        const r = contactSec.getBoundingClientRect();
        const vx = (r.left + r.width / 2) - 40;
        const vy = (r.top + r.height / 2) - (innerHeight - 50);
        vivre.style.setProperty('--pt', (Math.atan2(vy, vx) * 180 / Math.PI).toFixed(1) + 'deg');
        vivre.classList.toggle('arrived', r.top < innerHeight * 0.6);
    }
}
addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ---------- mobile menu ---------- */
const burger = $('#hamburger');
const links = $('#navLinks');
burger.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    burger.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open);
});
$$('#navLinks a').forEach(a => a.addEventListener('click', () => {
    links.classList.remove('open');
    burger.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
}));

/* ---------- scroll reveal ---------- */
const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
        if (e.isIntersecting) {
            e.target.classList.add('visible');
            revealObserver.unobserve(e.target);
        }
    });
}, { threshold: 0.12 });
$$('.reveal').forEach(el => revealObserver.observe(el));

/* ---------- active nav link ---------- */
const navAnchors = $$('.nav-links a[href^="#"]');
const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
        if (e.isIntersecting) {
            navAnchors.forEach(a => {
                const active = a.getAttribute('href') === '#' + e.target.id;
                a.classList.toggle('active', active);
                if (active) a.setAttribute('aria-current', 'true');
                else a.removeAttribute('aria-current');
            });
        }
    });
}, { rootMargin: '-45% 0px -50% 0px' });
$$('main section[id], header[id]').forEach(s => sectionObserver.observe(s));

/* ---------- typing effect ---------- */
const typed = $('#typed');
const phrases = [
    'AI / ML Engineer',
    'Agentic AI Builder',
    'Deep Learning Practitioner',
    'Full-Stack Developer',
    'Future Pirate King of AI \u{1F3F4}‍☠️'
];
if (!reduceMotion && typed) {
    let pi = 0, ci = 0, deleting = false;
    (function tick() {
        const word = phrases[pi];
        ci += deleting ? -1 : 1;
        typed.textContent = word.slice(0, ci);
        let delay = deleting ? 40 : 75;
        if (!deleting && ci === word.length) { delay = 1800; deleting = true; }
        else if (deleting && ci === 0) { deleting = false; pi = (pi + 1) % phrases.length; delay = 350; }
        setTimeout(tick, delay);
    })();
}

/* ---------- bounty counters ---------- */
const fmt = n => Math.round(n).toLocaleString('en-US');
const counterObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
        if (!e.isIntersecting) return;
        counterObserver.unobserve(e.target);
        const el = e.target;
        const target = +el.dataset.count;
        if (reduceMotion) { el.textContent = fmt(target); return; }
        const t0 = performance.now(), dur = 1800;
        (function step(t) {
            const p = Math.min((t - t0) / dur, 1);
            el.textContent = fmt(target * (1 - Math.pow(1 - p, 3))); // easeOutCubic
            if (p < 1) requestAnimationFrame(step);
        })(t0);
    });
}, { threshold: 0.4 });
$$('.count').forEach(el => counterObserver.observe(el));

/* ---------- 3D tilt on poster & project cards ---------- */
if (!reduceMotion && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    $$('[data-tilt]').forEach(el => {
        const strength = el.classList.contains('poster-inner') ? 7 : 4;
        el.addEventListener('mousemove', ev => {
            const r = el.getBoundingClientRect();
            const rx = ((ev.clientY - r.top) / r.height - 0.5) * -2 * strength;
            const ry = ((ev.clientX - r.left) / r.width - 0.5) * 2 * strength;
            el.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
        });
        el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
}

/* ---------- ambient sea particles (embers + drifting specks) ---------- */
const canvas = $('#sea');
if (canvas && !reduceMotion) {
    const ctx = canvas.getContext('2d');
    let W, H, dpr, particles = [], raf;

    function resize() {
        dpr = Math.min(devicePixelRatio || 1, 2);
        W = innerWidth; H = innerHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const n = Math.min(90, Math.floor(W * H / 18000));
        particles = Array.from({ length: n }, newParticle);
    }

    function newParticle() {
        return {
            x: Math.random() * W,
            y: Math.random() * H,
            r: 0.6 + Math.random() * 1.6,
            vy: 0.08 + Math.random() * 0.3,
            sway: 0.2 + Math.random() * 0.6,
            phase: Math.random() * Math.PI * 2,
            a: 0.06 + Math.random() * 0.18,
            slot: Math.random() < 0.75 ? 'p1' : 'p2'
        };
    }

    // wave-crest wake trailing the Thousand Sunny cursor
    const wake = [];
    if (matchMedia('(pointer: fine)').matches) {
        let lx = -99, ly = -99;
        addEventListener('mousemove', e => {
            if (Math.hypot(e.clientX - lx, e.clientY - ly) < 16) return;
            lx = e.clientX; ly = e.clientY;
            if (wake.length > 80) wake.splice(0, wake.length - 80);
            // a spreading crest at the stern, plus the odd foam bubble
            wake.push({ x: e.clientX + 18, y: e.clientY + 13, r: 2.5 + Math.random() * 2.5, a: 0.4, crest: true });
            if (Math.random() < 0.4) {
                wake.push({
                    x: e.clientX + 14 + Math.random() * 12,
                    y: e.clientY + 10 + Math.random() * 8,
                    r: 0.8 + Math.random() * 1.4, a: 0.32, crest: false
                });
            }
        }, { passive: true });
    }

    // Grand Line weather: a brief, rare rain squall drifts through
    const rain = [];
    let squallEnd = 0;
    let squallNext = performance.now() + (90 + Math.random() * 180) * 1000;

    function drawRain(t) {
        if (t < squallEnd && rain.length < 70) {
            for (let k = 0; k < 4; k++) {
                rain.push({ x: Math.random() * (W + 200) - 100, y: -20 - Math.random() * 40, v: 9 + Math.random() * 5 });
            }
        } else if (t >= squallEnd && t > squallNext) {
            squallEnd = t + 9000;
            squallNext = t + 9000 + (240 + Math.random() * 360) * 1000;
        }
        for (let i = rain.length - 1; i >= 0; i--) {
            const d = rain[i];
            d.x += 2.2;
            d.y += d.v;
            if (d.y > H + 20) { rain.splice(i, 1); continue; }
            ctx.beginPath();
            ctx.moveTo(d.x, d.y);
            ctx.lineTo(d.x + 3.5, d.y + 14);
            ctx.strokeStyle = `rgba(${palette.wake}, 0.22)`;
            ctx.lineWidth = 1.1;
            ctx.stroke();
        }
    }

    function draw(t) {
        ctx.clearRect(0, 0, W, H);
        drawRain(t);
        for (let i = wake.length - 1; i >= 0; i--) {
            const b = wake[i];
            b.y -= b.crest ? 0.12 : 0.28;
            b.r += b.crest ? 0.14 : 0.04;
            b.a -= 0.011;
            if (b.a <= 0) { wake.splice(i, 1); continue; }
            ctx.beginPath();
            if (b.crest) ctx.arc(b.x, b.y, b.r, Math.PI * 1.12, Math.PI * 1.88);
            else ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${palette.wake}, ${b.a.toFixed(3)})`;
            ctx.lineWidth = b.crest ? 1.4 : 1;
            ctx.stroke();
        }
        for (const p of particles) {
            p.y -= p.vy;
            const x = p.x + Math.sin(t / 2400 + p.phase) * 14 * p.sway;
            if (p.y < -6) { p.y = H + 6; p.x = Math.random() * W; }
            const twinkle = Math.min(1, p.a * palette.boost * (0.7 + 0.3 * Math.sin(t / 900 + p.phase * 3)));
            ctx.beginPath();
            ctx.arc(x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${palette[p.slot]}, ${twinkle.toFixed(3)})`;
            ctx.fill();
        }
        raf = requestAnimationFrame(draw);
    }

    resize();
    addEventListener('resize', resize);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) cancelAnimationFrame(raf);
        else raf = requestAnimationFrame(draw);
    });
    raf = requestAnimationFrame(draw);
}

/* ---------- gear 5 easter egg: click the straw hat 5 times ---------- */
let hatClicks = 0, hatTimer;
$('.logo').addEventListener('click', () => {
    clearTimeout(hatTimer);
    hatTimer = setTimeout(() => { hatClicks = 0; }, 1500);
    if (++hatClicks < 5 || reduceMotion) return;
    hatClicks = 0;
    document.body.classList.add('gear5');
    setTimeout(() => document.body.classList.remove('gear5'), 2500);
});

/* ---------- night-at-sea mode ---------- */
const modeToggle = $('#modeToggle');
const themeMeta = $('meta[name="theme-color"]');

function setNight(on) {
    document.documentElement.classList.toggle('night', on);
    palette = on ? palettes.night : palettes.day;
    modeToggle.textContent = on ? '☀️' : '🌙';
    modeToggle.setAttribute('aria-pressed', String(on));
    modeToggle.setAttribute('aria-label', on ? 'Switch to day mode' : 'Switch to night mode');
    if (themeMeta) themeMeta.content = on ? '#111a2c' : '#f3e9d2';
    try { localStorage.setItem('night', on ? '1' : ''); } catch (e) { /* private mode */ }
}
/* the switch is the show: circular night-wipe flooding out from the button */
function toggleNight() {
    const on = !document.documentElement.classList.contains('night');
    if (!reduceMotion) {
        modeToggle.animate(
            [{ transform: 'scale(1) rotate(0deg)' },
             { transform: 'scale(1.25) rotate(180deg)' },
             { transform: 'scale(1) rotate(360deg)' }],
            { duration: 500, easing: 'ease' });
    }
    if (reduceMotion || !document.startViewTransition) {
        setNight(on);
        return;
    }
    const r = modeToggle.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const endR = Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy));
    document.startViewTransition(() => setNight(on)).ready.then(() => {
        document.documentElement.animate(
            { clipPath: [`circle(0px at ${cx}px ${cy}px)`, `circle(${endR}px at ${cx}px ${cy}px)`] },
            { duration: 750, easing: 'cubic-bezier(.4, 0, .2, 1)', pseudoElement: '::view-transition-new(root)' });
    });
}
modeToggle.addEventListener('click', toggleNight);
/* first visit after sunset starts at night; an explicit toggle always wins */
try {
    const stored = localStorage.getItem('night');
    if (stored === '1') setNight(true);
    else if (stored === null) {
        const h = new Date().getHours();
        if (h >= 19 || h < 6) setNight(true);
    }
} catch (e) { }

/* ---------- wanted poster flip → pirate profile ---------- */
const poster = $('#poster');
if (poster) {
    const flip = () => poster.classList.toggle('flipped');
    poster.addEventListener('click', flip);
    poster.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            flip();
        }
    });
}

/* ---------- back-to-top ship ---------- */
toTop.addEventListener('click', () =>
    scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));

/* ---------- footer year ---------- */
$('#year').textContent = new Date().getFullYear();
