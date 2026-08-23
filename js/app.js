/* ========================================
   IMPERA — Main Application Script
   ======================================== */

(function () {
    'use strict';

    // ========================================
    // UTILITIES
    // ========================================
    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
    const lerp = (a, b, t) => a + (b - a) * t;
    const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

    // ========================================
    // LOADING SCREEN
    // ========================================
    window.addEventListener('load', () => {
        setTimeout(() => {
            const loader = $('#loader');
            if (loader) loader.classList.add('hidden');
            document.body.style.overflow = '';
            initAnimations();
            init3DScrollEngine();
        }, 5100);
    });

    // ========================================
    // CURSOR GLOW
    // ========================================
    const cursorGlow = $('#cursorGlow');
    let mouseX = 0, mouseY = 0, glowX = 0, glowY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    function updateCursorGlow() {
        glowX = lerp(glowX, mouseX, 0.08);
        glowY = lerp(glowY, mouseY, 0.08);
        if (cursorGlow) {
            cursorGlow.style.left = glowX + 'px';
            cursorGlow.style.top = glowY + 'px';
        }
        requestAnimationFrame(updateCursorGlow);
    }
    updateCursorGlow();

    // ========================================
    // SCROLL PROGRESS
    // ========================================
    const scrollProgress = $('#scrollProgress');
    function updateScrollProgress() {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        if (scrollProgress) scrollProgress.style.width = progress + '%';
    }
    window.addEventListener('scroll', updateScrollProgress, { passive: true });

    // ========================================
    // NAVBAR
    // ========================================
    const navbar = $('#navbar');
    function updateNavbar() {
        if (navbar) {
            navbar.classList.toggle('scrolled', window.scrollY > 50);
        }
    }
    window.addEventListener('scroll', updateNavbar, { passive: true });

    // Mobile toggle
    const navToggle = $('#navToggle');
    const mobileMenu = $('#mobileMenu');
    if (navToggle && mobileMenu) {
        navToggle.addEventListener('click', () => {
            navToggle.classList.toggle('active');
            mobileMenu.classList.toggle('active');
        });
        $$('.mobile-link', mobileMenu).forEach(link => {
            link.addEventListener('click', () => {
                navToggle.classList.remove('active');
                mobileMenu.classList.remove('active');
            });
        });
    }

    // ========================================
    // BACK TO TOP
    // ========================================
    const backToTop = $('#backToTop');
    function updateBackToTop() {
        if (backToTop) backToTop.classList.toggle('visible', window.scrollY > 500);
    }
    window.addEventListener('scroll', updateBackToTop, { passive: true });
    if (backToTop) backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    // ========================================
    // COOKIE POPUP
    // ========================================
    window.acceptCookies = function () {
        const popup = $('#cookiePopup');
        if (popup) popup.classList.add('hidden');
    };

    // ========================================
    // FAQ
    // ========================================
    $$('.faq-question').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.closest('.faq-item');
            const isActive = item.classList.contains('active');
            $$('.faq-item').forEach(i => i.classList.remove('active'));
            if (!isActive) item.classList.add('active');
            btn.setAttribute('aria-expanded', !isActive);
        });
    });

    // ========================================
    // TESTIMONIALS SLIDER
    // ========================================
    const track = $('#testimonialsTrack');
    const cards = $$('.testimonial-card');
    const dotsContainer = $('#testimonialDots');
    const prevBtn = $('#prevTestimonial');
    const nextBtn = $('#nextTestimonial');
    let currentSlide = 0;
    let autoplayInterval;

    function getVisibleCount() {
        if (window.innerWidth <= 480) return 1;
        if (window.innerWidth <= 768) return 2;
        return 3;
    }

    function getMaxSlide() {
        const visible = getVisibleCount();
        return Math.max(0, cards.length - visible);
    }

    function goToSlide(index) {
        const maxSlide = getMaxSlide();
        currentSlide = clamp(index, 0, maxSlide);
        const card = cards[0];
        if (!card) return;
        const gap = 20;
        const cardWidth = card.offsetWidth + gap;
        track.style.transform = `translateX(-${currentSlide * cardWidth}px)`;
        $$('.dot', dotsContainer).forEach((d, i) => d.classList.toggle('active', i === currentSlide));
    }

    function buildDots() {
        if (!dotsContainer) return;
        dotsContainer.innerHTML = '';
        const total = getMaxSlide() + 1;
        for (let i = 0; i < total; i++) {
            const dot = document.createElement('div');
            dot.className = 'dot' + (i === currentSlide ? ' active' : '');
            dot.addEventListener('click', () => { goToSlide(i); resetAutoplay(); });
            dotsContainer.appendChild(dot);
        }
    }

    function nextSlide() {
        const maxSlide = getMaxSlide();
        goToSlide(currentSlide >= maxSlide ? 0 : currentSlide + 1);
    }

    function prevSlide() {
        const maxSlide = getMaxSlide();
        goToSlide(currentSlide <= 0 ? maxSlide : currentSlide - 1);
    }

    if (track && cards.length && dotsContainer) {
        buildDots();

        if (prevBtn) prevBtn.addEventListener('click', () => { prevSlide(); resetAutoplay(); });
        if (nextBtn) nextBtn.addEventListener('click', () => { nextSlide(); resetAutoplay(); });

        function resetAutoplay() {
            clearInterval(autoplayInterval);
            autoplayInterval = setInterval(nextSlide, 4000);
        }
        resetAutoplay();

        // Recalculate on resize
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => { buildDots(); goToSlide(currentSlide); }, 150);
        });
    }

    // ========================================
    // SCROLL ANIMATIONS (basic IntersectionObserver)
    // ========================================
    function initAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    if (entry.target.closest('.performance-card')) {
                        animateProgressRings();
                    }
                    if (entry.target.closest('.hero-stats') || entry.target.closest('.performance-card')) {
                        animateCounters(entry.target);
                    }
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

        $$('.animate-in').forEach(el => observer.observe(el));
        $$('.hero-stat-value').forEach(el => animateHeroCounter(el));
    }

    function animateHeroCounter(el) {
        const target = parseFloat(el.dataset.count);
        const prefix = el.dataset.prefix || '';
        const suffix = el.dataset.suffix || '';
        const duration = 2000;
        const start = performance.now();

        function update(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = target * eased;

            if (target % 1 !== 0) {
                el.textContent = prefix + current.toFixed(1) + suffix;
            } else {
                el.textContent = prefix + Math.round(current).toLocaleString() + suffix;
            }

            if (progress < 1) requestAnimationFrame(update);
        }

        setTimeout(() => requestAnimationFrame(update), 2500);
    }

    function animateCounters(el) {
        const numbers = $$('.progress-number', el);
        numbers.forEach(num => {
            if (num.dataset.animated) return;
            num.dataset.animated = 'true';
            const target = parseInt(num.dataset.target);
            const suffix = num.dataset.suffix || '';
            const duration = 2000;
            const start = performance.now();

            function update(now) {
                const elapsed = now - start;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                const current = Math.round(target * eased);
                num.textContent = current.toLocaleString() + suffix;
                if (progress < 1) requestAnimationFrame(update);
            }
            requestAnimationFrame(update);
        });
    }

    function animateProgressRings() {
        $$('.progress-ring').forEach(ring => {
            if (ring.dataset.animated) return;
            ring.dataset.animated = 'true';
            const circumference = 339.292;
            const card = ring.closest('.performance-card');
            const progress = parseInt(card.dataset.progress);
            const offset = circumference - (circumference * progress / 100);
            setTimeout(() => {
                ring.style.strokeDashoffset = offset;
            }, 300);
        });
    }

    // ========================================
    // 3D SCROLL ANIMATION ENGINE
    // ========================================
    function init3DScrollEngine() {
        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReduced) return;

        // ---- Phase 1: Assign 3D animation classes to elements ----
        assign3DClasses(isMobile);

        // ---- Phase 2: Continuous scroll-driven 3D transforms ----
        if (!isMobile) {
            initContinuous3DScroll();
        }

        // ---- Phase 3: Section perspective shifts ----
        initSection3DShifts();

        // ---- Phase 4: Parallax depth layers ----
        initParallaxDepth();

        // ---- Phase 5: 3D text reveals ----
        init3DTextReveals();
    }

    // ========================================
    // PHASE 1: Assign 3D classes
    // ========================================
    function assign3DClasses(isMobile) {
        // Hero elements — fade up from depth
        const heroElements = $$('.hero-badge, .hero-title, .hero-subtitle, .hero-buttons, .hero-stats');
        heroElements.forEach((el, i) => {
            el.classList.remove('animate-in');
            el.classList.add('scroll-3d-fade-up', `scroll-3d-stagger-${i + 1}`);
        });

        // Section headers — rotate in from top
        $$('.section-header').forEach(header => {
            const tag = $('.section-tag', header);
            const title = $('.section-title', header);
            const subtitle = $('.section-subtitle', header);
            if (tag) { tag.classList.remove('animate-in'); tag.classList.add('scroll-3d-zoom-in'); }
            if (title) { title.classList.remove('animate-in'); title.classList.add('scroll-3d-rotate-in', 'scroll-3d-stagger-2'); }
            if (subtitle) { subtitle.classList.remove('animate-in'); subtitle.classList.add('scroll-3d-fade-up', 'scroll-3d-stagger-3'); }
        });

        // Market cards — flip in from alternating sides
        $$('.market-card').forEach((card, i) => {
            card.classList.remove('animate-in');
            const animType = i % 2 === 0 ? 'scroll-3d-flip-in' : 'scroll-3d-flip-right';
            card.classList.add(animType, `scroll-3d-stagger-${i + 1}`);
            card.classList.add('card-3d-depth');
        });

        // Feature cards — staggered rise from depth
        $$('.feature-card').forEach((card, i) => {
            card.classList.remove('animate-in');
            const patterns = [
                'scroll-3d-fade-up',
                'scroll-3d-slide-left',
                'scroll-3d-rise',
                'scroll-3d-flip-in',
                'scroll-3d-zoom-in',
                'scroll-3d-slide-right'
            ];
            card.classList.add(patterns[i % patterns.length], `scroll-3d-stagger-${(i % 12) + 1}`);
            card.classList.add('card-3d-depth');
        });

        // Bot pricing cards — dramatic entrance
        $$('.bot-card').forEach((card, i) => {
            card.classList.remove('animate-in');
            const anims = ['scroll-3d-slide-left', 'scroll-3d-zoom-in', 'scroll-3d-slide-right'];
            card.classList.add(anims[i], `scroll-3d-stagger-${i + 1}`);
            card.classList.add('card-3d-depth', 'glow-border-3d');
        });

        // Performance cards — circular reveal
        $$('.performance-card').forEach((card, i) => {
            card.classList.remove('animate-in');
            card.classList.add('scroll-3d-rotate-in', `scroll-3d-stagger-${i + 1}`);
            card.classList.add('card-3d-depth');
        });

        // Why cards — alternating slide
        $$('.why-card').forEach((card, i) => {
            card.classList.remove('animate-in');
            const anim = i % 2 === 0 ? 'scroll-3d-slide-left' : 'scroll-3d-slide-right';
            card.classList.add(anim, `scroll-3d-stagger-${(i % 6) + 1}`);
            card.classList.add('card-3d-depth');
        });

        // Testimonials section
        const testSlider = $('.testimonials-slider');
        if (testSlider) {
            testSlider.classList.remove('animate-in');
            testSlider.classList.add('scroll-3d-rotate-in');
        }

        // FAQ items — sequential flip
        $$('.faq-item').forEach((item, i) => {
            item.classList.remove('animate-in');
            item.classList.add('scroll-3d-rise', `scroll-3d-stagger-${i + 1}`);
        });

        // Contact grid halves
        const contactInfo = $('.contact-info');
        const contactFormWrapper = $('.contact-form-wrapper');
        if (contactInfo) { contactInfo.classList.remove('animate-in'); contactInfo.classList.add('scroll-3d-slide-left'); }
        if (contactFormWrapper) { contactFormWrapper.classList.remove('animate-in'); contactFormWrapper.classList.add('scroll-3d-slide-right', 'scroll-3d-stagger-2'); }

        // Newsletter
        const newsletter = $('.newsletter');
        if (newsletter) { newsletter.classList.remove('animate-in'); newsletter.classList.add('scroll-3d-zoom-in'); }

        // ---- IntersectionObserver for 3D classes ----
        const observer3D = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    // Trigger counters and rings
                    if (entry.target.closest('.performance-card')) {
                        animateProgressRings();
                        animateCounters(entry.target);
                    }
                }
            });
        }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

        $$('[class*="scroll-3d-"]').forEach(el => observer3D.observe(el));
    }

    // ========================================
    // PHASE 2: Continuous 3D scroll transforms
    // ========================================
    function initContinuous3DScroll() {
        const sections = $$('.section');
        let ticking = false;

        function onScroll() {
            if (!ticking) {
                requestAnimationFrame(() => {
                    updateContinuous3D();
                    ticking = false;
                });
                ticking = true;
            }
        }

        function updateContinuous3D() {
            const scrollY = window.scrollY;
            const viewportH = window.innerHeight;

            sections.forEach(section => {
                const rect = section.getBoundingClientRect();
                const sectionCenter = rect.top + rect.height / 2;
                const viewportCenter = viewportH / 2;
                const distFromCenter = (sectionCenter - viewportCenter) / viewportH;

                // Section subtle rotation based on scroll position
                const rotateX = clamp(distFromCenter * -4, -3, 3);
                const translateZ = clamp(-Math.abs(distFromCenter) * 50, -60, 0);
                section.style.transform = `perspective(1200px) rotateX(${rotateX}deg) translateZ(${translateZ}px)`;
                section.style.transition = 'transform 0.15s ease-out';

                // Animate child cards with individual depth offsets
                const cards = $$('[class*="card-3d-depth"]', section);
                cards.forEach((card, i) => {
                    const cardRect = card.getBoundingClientRect();
                    if (cardRect.top < viewportH && cardRect.bottom > 0) {
                        const cardProgress = 1 - (cardRect.top / viewportH);
                        const cardZ = clamp(cardProgress * 15 - 7, -10, 10);
                        const cardRotY = clamp(distFromCenter * (i % 2 === 0 ? 2 : -2), -3, 3);
                        // Only apply if not being hovered
                        if (!card.matches(':hover')) {
                            card.style.transform = `perspective(1000px) translateZ(${cardZ}px) rotateY(${cardRotY}deg)`;
                        }
                    }
                });
            });

            // Hero scroll 3D effect
            const hero = $('#hero');
            if (hero) {
                const heroScroll = clamp(scrollY / viewportH, 0, 1.5);
                const heroContent = $('.hero-content');
                if (heroContent) {
                    heroContent.style.transform = `perspective(1000px) translateZ(${-heroScroll * 200}px) rotateX(${heroScroll * 5}deg) scale(${1 - heroScroll * 0.15})`;
                    heroContent.style.opacity = 1 - heroScroll * 0.7;
                    heroContent.style.transition = 'transform 0.1s ease-out, opacity 0.1s ease-out';
                }

                // Grid overlay parallax
                const gridOverlay = $('.hero-grid-overlay');
                if (gridOverlay) {
                    gridOverlay.style.transform = `perspective(500px) rotateX(60deg) translateZ(${-scrollY * 0.3}px) scale(${1 + scrollY * 0.001})`;
                    gridOverlay.style.opacity = clamp(1 - scrollY / (viewportH * 0.8), 0, 1);
                }

                // Canvas 3D globe zoom on scroll
                const heroCanvas = $('#heroCanvas');
                if (heroCanvas) {
                    heroCanvas.style.transform = `scale(${1 + heroScroll * 0.3})`;
                    heroCanvas.style.opacity = clamp(1 - heroScroll * 0.8, 0, 1);
                }
            }
        }

        window.addEventListener('scroll', onScroll, { passive: true });
        updateContinuous3D(); // Initial call
    }

    // ========================================
    // PHASE 3: Section perspective shifts
    // ========================================
    function initSection3DShifts() {
        const sectionDividers = $$('.section');
        sectionDividers.forEach((section, i) => {
            // Add subtle alternating tilt to each section
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const ratio = entry.intersectionRatio;
                        const tilt = (i % 2 === 0 ? 1 : -1) * (1 - ratio) * 2;
                        section.style.filter = `brightness(${0.95 + ratio * 0.05})`;
                    }
                });
            }, { threshold: Array.from({ length: 20 }, (_, i) => i / 20) });
            observer.observe(section);
        });
    }

    // ========================================
    // PHASE 4: Parallax depth layers
    // ========================================
    function initParallaxDepth() {
        const depthLayers = $$('[class*="parallax-depth-"]');
        if (!depthLayers.length) return;

        // Mark section tags, titles, and descriptions with depth
        $$('.section-tag').forEach(el => el.classList.add('parallax-depth-1'));
        $$('.section-title').forEach(el => el.classList.add('parallax-depth-2'));
        $$('.section-subtitle').forEach(el => el.classList.add('parallax-depth-3'));

        let ticking = false;
        function onScroll() {
            if (!ticking) {
                requestAnimationFrame(() => {
                    const scrollY = window.scrollY;
                    depthLayers.forEach(layer => {
                        const speed = parseFloat(getComputedStyle(layer).getPropertyValue('--parallax-speed')) || 0.05;
                        const rect = layer.getBoundingClientRect();
                        if (rect.top < window.innerHeight && rect.bottom > 0) {
                            const offset = (rect.top - window.innerHeight / 2) * speed;
                            layer.style.transform = `translateY(${offset}px)`;
                        }
                    });
                    ticking = false;
                });
                ticking = true;
            }
        }

        window.addEventListener('scroll', onScroll, { passive: true });
    }

    // ========================================
    // PHASE 5: 3D Text Reveal
    // ========================================
    function init3DTextReveals() {
        let globalWordIndex = 0;

        function wrapTextNodeWords(textNode, baseDelay) {
            const frag = document.createDocumentFragment();
            const textWords = textNode.textContent.split(/(\s+)/);
            textWords.forEach(w => {
                if (w.trim() === '') {
                    frag.appendChild(document.createTextNode(w));
                } else {
                    globalWordIndex++;
                    const span = document.createElement('span');
                    span.className = 'word';
                    span.style.transitionDelay = `${baseDelay + globalWordIndex * 0.06}s`;
                    span.textContent = w;
                    frag.appendChild(span);
                }
            });
            return frag;
        }

        function wrapElementWords(el, baseDelay) {
            Array.from(el.childNodes).forEach(child => {
                if (child.nodeType === 3) {
                    const frag = wrapTextNodeWords(child, baseDelay);
                    el.replaceChild(frag, child);
                } else if (child.nodeType === 1) {
                    wrapElementWords(child, baseDelay);
                }
            });
        }

        // Wrap hero title words (preserving <br> and <span class="gradient-text">)
        $$('.hero-title').forEach(title => {
            title.classList.add('text-3d-reveal');
            globalWordIndex = 0;
            wrapElementWords(title, 0);
        });

        // Wrap section title words (preserving <span class="gradient-text">)
        $$('.section-title').forEach(title => {
            title.classList.add('text-3d-reveal');
            globalWordIndex = 0;
            wrapElementWords(title, 0);
        });

        // Observer for text reveals
        const textObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                }
            });
        }, { threshold: 0.3 });

        $$('.text-3d-reveal').forEach(el => textObserver.observe(el));
    }

    // ========================================
    // 3D HERO CANVAS (Three.js)
    // ========================================
    function initHero3D() {
        const canvas = $('#heroCanvas');
        if (!canvas || typeof THREE === 'undefined') return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Globe wireframe
        const globeGeo = new THREE.IcosahedronGeometry(3, 3);
        const globeMat = new THREE.MeshBasicMaterial({
            color: 0x00C2FF,
            wireframe: true,
            transparent: true,
            opacity: 0.12
        });
        const globe = new THREE.Mesh(globeGeo, globeMat);
        scene.add(globe);

        // Inner globe
        const innerGlobeGeo = new THREE.IcosahedronGeometry(2.8, 2);
        const innerGlobeMat = new THREE.MeshBasicMaterial({
            color: 0x00FFB2,
            wireframe: true,
            transparent: true,
            opacity: 0.04
        });
        const innerGlobe = new THREE.Mesh(innerGlobeGeo, innerGlobeMat);
        scene.add(innerGlobe);

        // Neon rings
        const rings = [];
        for (let i = 0; i < 3; i++) {
            const ringGeo = new THREE.TorusGeometry(3.5 + i * 0.5, 0.01, 8, 100);
            const ringMat = new THREE.MeshBasicMaterial({
                color: new THREE.Color(i === 0 ? 0x00C2FF : i === 1 ? 0x00FFB2 : 0x7A5CFF),
                transparent: true,
                opacity: 0.2 - i * 0.05
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = Math.PI / 2 + i * 0.3;
            ring.rotation.y = i * 0.5;
            scene.add(ring);
            rings.push(ring);
        }

        // Floating AI chip (small cube)
        const chipGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const chipMat = new THREE.MeshBasicMaterial({ color: 0x7A5CFF, wireframe: true, transparent: true, opacity: 0.3 });
        const chip = new THREE.Mesh(chipGeo, chipMat);
        chip.position.set(4, 1.5, -1);
        scene.add(chip);

        // Floating trading cubes
        const cubes = [];
        for (let i = 0; i < 5; i++) {
            const size = 0.15 + Math.random() * 0.2;
            const cubeGeo = new THREE.BoxGeometry(size, size, size);
            const color = [0x00C2FF, 0x00FFB2, 0x7A5CFF, 0xFFD700][Math.floor(Math.random() * 4)];
            const cubeMat = new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.2 });
            const cube = new THREE.Mesh(cubeGeo, cubeMat);
            const angle = Math.random() * Math.PI * 2;
            const radius = 4 + Math.random() * 3;
            cube.position.set(Math.cos(angle) * radius, (Math.random() - 0.5) * 4, Math.sin(angle) * radius);
            scene.add(cube);
            cubes.push(cube);
        }

        // Particles
        const particleCount = 500;
        const particleGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            const radius = 5 + Math.random() * 10;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i3 + 2] = radius * Math.cos(phi);

            const colorChoice = Math.random();
            if (colorChoice < 0.33) {
                colors[i3] = 0; colors[i3 + 1] = 0.76; colors[i3 + 2] = 1;
            } else if (colorChoice < 0.66) {
                colors[i3] = 0; colors[i3 + 1] = 1; colors[i3 + 2] = 0.67;
            } else {
                colors[i3] = 0.48; colors[i3 + 1] = 0.36; colors[i3 + 2] = 1;
            }
        }

        particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const particleMat = new THREE.PointsMaterial({
            size: 0.03,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });
        const particles = new THREE.Points(particleGeo, particleMat);
        scene.add(particles);

        // Trading lines
        const linesMat = new THREE.LineBasicMaterial({
            color: 0x00C2FF,
            transparent: true,
            opacity: 0.08
        });

        for (let i = 0; i < 15; i++) {
            const lineGeo = new THREE.BufferGeometry();
            const start = new THREE.Vector3(
                (Math.random() - 0.5) * 12,
                (Math.random() - 0.5) * 12,
                (Math.random() - 0.5) * 12
            );
            const end = new THREE.Vector3(
                (Math.random() - 0.5) * 12,
                (Math.random() - 0.5) * 12,
                (Math.random() - 0.5) * 12
            );
            const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
            mid.z += (Math.random() - 0.5) * 4;

            const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
            const pts = curve.getPoints(30);
            lineGeo.setFromPoints(pts);
            scene.add(new THREE.Line(lineGeo, linesMat.clone()));
        }

        camera.position.z = 7;

        let targetRotX = 0, targetRotY = 0;
        document.addEventListener('mousemove', (e) => {
            targetRotY = (e.clientX / window.innerWidth - 0.5) * 0.5;
            targetRotX = (e.clientY / window.innerHeight - 0.5) * 0.3;
        });

        const clock = new THREE.Clock();

        function animate() {
            requestAnimationFrame(animate);
            const t = clock.getElapsedTime();

            globe.rotation.y += 0.002;
            globe.rotation.x += 0.001;
            innerGlobe.rotation.y -= 0.001;
            particles.rotation.y += 0.0005;

            // Scroll affects globe
            const scrollFactor = window.scrollY / window.innerHeight;
            globe.rotation.x = lerp(globe.rotation.x, globe.rotation.x + targetRotX * 0.01, 0.02);

            // Floating chip orbit
            chip.position.x = Math.cos(t * 0.5) * 4;
            chip.position.y = Math.sin(t * 0.7) * 1.5 + 1;
            chip.position.z = Math.sin(t * 0.3) * 2 - 1;
            chip.rotation.x += 0.01;
            chip.rotation.y += 0.015;

            // Floating cubes
            cubes.forEach((cube, i) => {
                const speed = 0.3 + i * 0.1;
                const offset = i * 1.2;
                cube.position.y += Math.sin(t * speed + offset) * 0.002;
                cube.rotation.x += 0.005 + i * 0.002;
                cube.rotation.z += 0.003;
            });

            // Ring rotation
            rings.forEach((ring, i) => {
                ring.rotation.z = t * (0.1 + i * 0.05) * (i % 2 === 0 ? 1 : -1);
            });

            // Push globe back on scroll
            camera.position.z = lerp(camera.position.z, 7 - scrollFactor * 3, 0.05);

            renderer.render(scene, camera);
        }
        animate();

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    // ========================================
    // TILT EFFECT ON CARDS
    // ========================================
    function initTiltEffect() {
        const cards = $$('.bot-card, .feature-card, .market-card');
        cards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const rotateX = (y - centerY) / centerY * -4;
                const rotateY = (x - centerX) / centerX * 4;
                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
                card.style.transition = 'transform 0.1s ease-out';

                // Dynamic glare effect
                const glareX = (x / rect.width) * 100;
                const glareY = (y / rect.height) * 100;
                card.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(0,194,255,0.06) 0%, transparent 50%), var(--bg-card)`;
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = '';
                card.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
                card.style.background = '';
            });
        });
    }

    // ========================================
    // FORM HANDLING
    // ========================================
    const contactForm = $('#contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = $('button[type="submit"]', contactForm);
            const originalText = btn.innerHTML;
            btn.innerHTML = 'Message Sent!';
            btn.style.background = 'linear-gradient(135deg, #00FFB2, #00cc8e)';
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = '';
                contactForm.reset();
            }, 3000);
        });
    }

    const newsletterForm = $('#newsletterForm');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = $('button[type="submit"]', newsletterForm);
            const originalText = btn.innerHTML;
            btn.innerHTML = 'Subscribed!';
            btn.style.background = 'linear-gradient(135deg, #00FFB2, #00cc8e)';
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = '';
                newsletterForm.reset();
            }, 3000);
        });
    }

    // ========================================
    // LIVE CHAT
    // ========================================
    const liveChatBtn = $('#liveChatBtn');
    const liveChatWindow = $('#liveChatWindow');
    const chatClose = $('#chatClose');
    const chatInput = $('#chatInput');
    const chatSend = $('#chatSend');
    const chatBody = $('.chat-body');

    if (liveChatBtn && liveChatWindow) {
        liveChatBtn.addEventListener('click', () => liveChatWindow.classList.toggle('active'));
        if (chatClose) chatClose.addEventListener('click', () => liveChatWindow.classList.remove('active'));

        function sendMessage() {
            if (!chatInput || !chatBody) return;
            const text = chatInput.value.trim();
            if (!text) return;

            const msg = document.createElement('div');
            msg.className = 'chat-message user';
            msg.innerHTML = `<p>${text}</p><span class="chat-time">Just now</span>`;
            chatBody.appendChild(msg);
            chatInput.value = '';
            chatBody.scrollTop = chatBody.scrollHeight;

            setTimeout(() => {
                const reply = document.createElement('div');
                reply.className = 'chat-message bot';
                reply.innerHTML = `<p>Thanks for reaching out! Our team will get back to you shortly. In the meantime, check our FAQ section for instant answers.</p><span class="chat-time">Just now</span>`;
                chatBody.appendChild(reply);
                chatBody.scrollTop = chatBody.scrollHeight;
            }, 1000);
        }

        if (chatSend) chatSend.addEventListener('click', sendMessage);
        if (chatInput) chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
    }

    // ========================================
    // SMOOTH SCROLL FOR NAV LINKS
    // ========================================
    $$('a[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href === '#') return;
            e.preventDefault();
            const target = $(href);
            if (target) {
                const offset = 80;
                const top = target.getBoundingClientRect().top + window.scrollY - offset;
                window.scrollTo({ top, behavior: 'smooth' });
            }
        });
    });

    // ========================================
    // 50% OFF SALE COUNTDOWN (ends Oct 31 2026, 23:59:59)
    // ========================================
    function initSaleCountdown() {
        const bar = document.getElementById('saleBar');
        if (!bar) return;
        const deadline = new Date('2026-10-31T23:59:59');

        if (new Date() >= deadline) { bar.style.display = 'none'; return; }
        document.body.classList.add('sale-live');

        const el = {
            d: document.getElementById('scD'),
            h: document.getElementById('scH'),
            m: document.getElementById('scM'),
            s: document.getElementById('scS')
        };
        const pad = n => String(n).padStart(2, '0');

        function tick() {
            let diff = Math.max(0, deadline - new Date());
            if (diff === 0) { bar.style.display = 'none'; document.body.classList.remove('sale-live'); clearInterval(t); return; }
            const d = Math.floor(diff / 86400000);
            const h = Math.floor(diff / 3600000) % 24;
            const m = Math.floor(diff / 60000) % 60;
            const s = Math.floor(diff / 1000) % 60;
            el.d.textContent = pad(d);
            el.h.textContent = pad(h);
            el.m.textContent = pad(m);
            el.s.textContent = pad(s);
        }
        const t = setInterval(tick, 1000);
        tick();
    }

    // ========================================
    // INITIALIZE
    // ========================================
    initSaleCountdown();

    document.addEventListener('DOMContentLoaded', () => {
        document.body.style.overflow = 'hidden';
        setTimeout(() => {
            drawMarketCharts();
            initHero3D();
            initTiltEffect();
        }, 100);
    });

})();
