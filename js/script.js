/*
================================================================================
OPERATIONAL PURPOSE:
This script coordinates browser-driven interactive presentation systems for the game
developer portfolio. It executes a centered logo launch screen presentation on page
initialization, runs a GPU-friendly 2D stardust particle simulation behind the hero
container, and drives progressive scroll-reveal animations across downstream sections.

INTERNAL MECHANICS:
- Mounts the launch screen overlay, locks body scroll, and presents the centered brand
  logo with cubic-bezier entrance scaling.
- Coordinates a smooth timed exit transition after a measured display interval, with
  immediate click and keyboard skip triggers.
- Identifies the hero container and initializes an HTML5 2D Canvas context with
  HiDPI/devicePixelRatio scaling.
- Instantiates an object pool of Particle entities with kinematic velocities, harmonic
  sine oscillation, alpha twinkling, and palette-aligned RGBA chromatic data.
- Executes an asynchronous requestAnimationFrame rendering loop with boundary wrapping
  and radial cursor proximity repulsion physics.
- Mounts an IntersectionObserver on the hero container and a document visibilitychange
  listener to pause canvas rendering loops when off-screen or backgrounded.
- Binds a debounced window resize handler to maintain buffer resolution parity.
- Marks documentElement with 'js-enabled' and mounts a secondary IntersectionObserver
  over all '.reveal' elements to apply the 'revealed' class and immediately unobserve
  targets once triggered, eliminating persistent CPU/GPU observation overhead.

EXTERNAL DEPENDENCIES:
- HTML Document:
  - index.html
- DOM Nodes:
  - document.documentElement (.js-enabled)
  - div#launch-screen (.launch-screen, .launch-exit)
  - div.launch-logo-frame (.launch-logo-frame)
  - img.launch-logo-img (.launch-logo-img)
  - section.hero (#home)
  - canvas#hero-particles (.hero-particles-canvas)
  - .reveal elements (.awards-header, .award-row, .mentorship-header, .mentorship-container, .cta-section)
  - window, document
- CSS Architecture:
  - css/style.css (.launch-screen, .launch-logo-frame, .hero, .hero-particles-canvas, .reveal)
================================================================================
*/

document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.classList.add('js-enabled');

    initLaunchScreen();
    initScrollReveal();
    initHeroParticles();

    function initScrollReveal() {
        const revealElements = document.querySelectorAll('.reveal');
        if (revealElements.length === 0) return;

        const revealObserver = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    obs.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -40px 0px'
        });

        revealElements.forEach(el => revealObserver.observe(el));
    }

    function initHeroParticles() {
        const hero = document.getElementById('home');
        const canvas = document.getElementById('hero-particles');

        if (!hero || !canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = 0;
        let height = 0;
        let animationFrameId = null;
        let isVisible = true;
        const particles = [];
        const particleCount = 48;

        const mouse = {
            x: -1000,
            y: -1000,
            radius: 90
        };

        function resizeCanvas() {
            const rect = hero.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            width = rect.width;
            height = rect.height;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(dpr, dpr);
        }

        class Particle {
            constructor() {
                this.reset(true);
            }

            reset(initial = false) {
                this.x = Math.random() * width;
                this.y = initial ? Math.random() * height : height + 10;
                this.radius = Math.random() * 1.6 + 0.8;
                this.speedY = Math.random() * 0.35 + 0.15;
                this.speedX = (Math.random() - 0.5) * 0.15;
                this.phase = Math.random() * Math.PI * 2;
                this.phaseStep = Math.random() * 0.015 + 0.008;
                this.twinkle = Math.random() * Math.PI * 2;
                this.twinkleStep = Math.random() * 0.03 + 0.01;
                this.baseAlpha = Math.random() * 0.35 + 0.2;
                this.color = Math.random() > 0.35 ? '226, 180, 189' : '247, 214, 208';
            }

            update() {
                this.y -= this.speedY;
                this.phase += this.phaseStep;
                this.twinkle += this.twinkleStep;
                this.x += this.speedX + Math.sin(this.phase) * 0.3;

                const dx = this.x - mouse.x;
                const dy = this.y - mouse.y;
                const dist = Math.hypot(dx, dy);

                if (dist < mouse.radius && dist > 0) {
                    const force = (mouse.radius - dist) / mouse.radius;
                    this.x += (dx / dist) * force * 1.5;
                    this.y += (dy / dist) * force * 1.5;
                }

                if (this.y < -15 || this.x < -20 || this.x > width + 20) {
                    this.reset(false);
                }
            }

            draw() {
                const currentAlpha = Math.max(0.05, Math.min(0.85, this.baseAlpha + Math.sin(this.twinkle) * 0.12));
                ctx.save();
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${this.color}, ${currentAlpha})`;
                ctx.shadowColor = `rgba(${this.color}, 0.5)`;
                ctx.shadowBlur = this.radius * 3;
                ctx.fill();
                ctx.restore();
            }
        }

        function initParticlePool() {
            particles.length = 0;
            for (let i = 0; i < particleCount; i++) {
                particles.push(new Particle());
            }
        }

        function render() {
            if (!isVisible) {
                animationFrameId = null;
                return;
            }

            ctx.clearRect(0, 0, width, height);

            for (let i = 0; i < particles.length; i++) {
                particles[i].update();
                particles[i].draw();
            }

            animationFrameId = requestAnimationFrame(render);
        }

        function startLoop() {
            if (!animationFrameId) {
                animationFrameId = requestAnimationFrame(render);
            }
        }

        function stopLoop() {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        }

        hero.addEventListener('mousemove', (e) => {
            const rect = hero.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
        });

        hero.addEventListener('mouseleave', () => {
            mouse.x = -1000;
            mouse.y = -1000;
        });

        window.addEventListener('resize', () => {
            resizeCanvas();
        });

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    isVisible = true;
                    startLoop();
                } else {
                    isVisible = false;
                    stopLoop();
                }
            });
        }, { threshold: 0.05 });

        observer.observe(hero);

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                stopLoop();
            } else if (isVisible) {
                startLoop();
            }
        });

        resizeCanvas();
        initParticlePool();
        startLoop();
    }

    function initLaunchScreen() {
        const launchScreen = document.getElementById('launch-screen');
        if (!launchScreen) return;

        document.body.classList.add('launch-active');

        let isDismissed = false;
        let timerId = null;

        function dismissLaunch() {
            if (isDismissed) return;
            isDismissed = true;

            if (timerId) {
                clearTimeout(timerId);
                timerId = null;
            }

            cleanupEvents();

            launchScreen.classList.add('launch-exit');
            document.body.classList.remove('launch-active');

            setTimeout(() => {
                launchScreen.style.display = 'none';
                launchScreen.setAttribute('aria-hidden', 'true');
            }, 750);
        }

        function onKeyDown() {
            dismissLaunch();
        }

        function cleanupEvents() {
            window.removeEventListener('keydown', onKeyDown);
            launchScreen.removeEventListener('click', dismissLaunch);
        }

        window.addEventListener('keydown', onKeyDown, { once: true });
        launchScreen.addEventListener('click', dismissLaunch, { once: true });

        timerId = setTimeout(dismissLaunch, 1600);
    }
});
