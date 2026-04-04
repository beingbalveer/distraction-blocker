document.addEventListener('DOMContentLoaded', () => {

    // ── Star field ──────────────────────────────────────────────────────────
    const canvas = document.getElementById('stars');
    const ctx    = canvas.getContext('2d');

    let stars = [];
    let W, H;

    function resize() {
        W = canvas.width  = window.innerWidth;
        H = canvas.height = document.documentElement.scrollHeight;
    }

    function buildStars() {
        stars = [];
        const count = Math.floor((W * H) / 7500);
        for (let i = 0; i < count; i++) {
            stars.push({
                x:      Math.random() * W,
                y:      Math.random() * H,
                r:      Math.random() * 1.3 + 0.25,
                base:   Math.random() * 0.45 + 0.15,
                speed:  Math.random() * 0.003 + 0.0008,
                phase:  Math.random() * Math.PI * 2,
                // parallax depth 0–1 (0 = fixed, 1 = moves most with scroll)
                depth:  Math.random() * 0.4
            });
        }
    }

    let frame    = 0;
    let scrollY  = 0;

    function draw() {
        ctx.clearRect(0, 0, W, H);
        frame += 0.01;

        stars.forEach(s => {
            const twinkle  = Math.sin(frame * s.speed * 80 + s.phase) * 0.15;
            const opacity  = Math.max(0, s.base + twinkle);
            const parallaxY = scrollY * s.depth * 0.25;

            ctx.beginPath();
            ctx.arc(s.x, s.y - parallaxY, s.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(210, 205, 255, ${opacity})`;
            ctx.fill();
        });

        requestAnimationFrame(draw);
    }

    // Rebuild when page grows (e.g. accordions)
    new ResizeObserver(() => { resize(); buildStars(); }).observe(document.body);

    resize();
    buildStars();
    draw();

    // ── Scroll tracking ──────────────────────────────────────────────────────
    window.addEventListener('scroll', () => {
        scrollY = window.scrollY;
        tickScroll();
    }, { passive: true });

    // ── Hero entrance — staggered fade-up ───────────────────────────────────
    // Elements use data-scroll / data-delay attributes set in HTML
    const heroEls = document.querySelectorAll('.hero-inner [data-scroll]');
    heroEls.forEach(el => {
        const delay = parseFloat(el.dataset.delay || 0);
        el.style.transitionDelay = `${delay}s`;
        // Trigger after a brief paint delay so transition fires
        requestAnimationFrame(() => requestAnimationFrame(() => {
            el.classList.add('in-view');
        }));
    });

    // ── Scroll-driven section reveals ───────────────────────────────────────
    // Cards (opacity + translateY via IntersectionObserver)
    const cardObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity   = '1';
                entry.target.style.transform = 'translateY(0)';
                cardObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.07 });

    document.querySelectorAll('.feature-card, .step-content, .platform-card, .preview-feature')
        .forEach((el, i) => {
            el.style.transitionDelay = `${(i % 6) * 0.06}s`;
            cardObserver.observe(el);
        });

    // Generic [data-scroll] elements outside the hero (e.g. section titles)
    const scrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const delay = parseFloat(entry.target.dataset.delay || 0);
                entry.target.style.transitionDelay = `${delay}s`;
                entry.target.classList.add('in-view');
                scrollObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });

    document.querySelectorAll('[data-scroll]:not(.hero-inner [data-scroll])')
        .forEach(el => scrollObserver.observe(el));

    // ── Nav — shrink + blur on scroll ───────────────────────────────────────
    const nav = document.querySelector('nav');

    function tickScroll() {
        if (scrollY > 40) {
            nav.style.padding    = '0.65rem 0';
            nav.style.background = 'rgba(6,7,15,0.92)';
        } else {
            nav.style.padding    = '';
            nav.style.background = '';
        }

        // Hero aurora parallax — move slightly with scroll
        const aurora = document.querySelector('.hero-aurora');
        if (aurora) {
            aurora.style.transform = `translate(-50%, calc(-52% - ${scrollY * 0.15}px))`;
        }
    }

    // ── Smooth scroll for nav links ──────────────────────────────────────────
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const id = this.getAttribute('href');
            if (id === '#') return;
            const target = document.querySelector(id);
            if (!target) return;
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth' });
        });
    });

});
