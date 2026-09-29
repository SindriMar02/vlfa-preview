/* VLFA motion. The recipes are the ones in our other premium builds (Benni, Dill, Eyvik, the Vale teardown):
   Lenis on fine pointers only, ScrollTrigger on the gsap ticker, SplitText masked lines, clip-path curtain + scale-settle
   photos with inner parallax, hairlines that draw, a session-once curtain. Every scroll reveal is SCRUBBED over a short band
   (position-tied, never a timer), so a fast flick cannot outrun it. Reduced motion is a plain render: nothing is hidden.
   The one thing driven by a timer is the page opening (curtain + hero intro), because that is not a scroll event. */
(function () {
  'use strict'
  var doc = document, root = doc.documentElement
  var $ = function (s, c) { return (c || doc).querySelector(s) }
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)) }
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  function isTouch() { return window.matchMedia('(hover: none) and (pointer: coarse)').matches }
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches

  if (reduce || !window.gsap || !window.ScrollTrigger || !window.SplitText) { root.classList.add('ready'); var c0 = $('#curtain'); if (c0) c0.style.display = 'none'; return }
  var gsap = window.gsap, ST = window.ScrollTrigger, Split = window.SplitText
  gsap.registerPlugin(ST, Split)

  /* ---------- smooth scroll: desktop only, guarded on the same line (lenis-mobile-damage) ---------- */
  var lenis = !isTouch() && window.Lenis ? new window.Lenis({ lerp: 0.1, wheelMultiplier: 1 }) : null
  if (lenis) {
    lenis.on('scroll', ST.update)
    gsap.ticker.add(function (t) { lenis.raf(t * 1000) })
    gsap.ticker.lagSmoothing(0)
    doc.addEventListener('click', function (e) {
      var a = e.target.closest('a[href*="#"]'); if (!a || e.defaultPrevented) return
      var u = new URL(a.href, location.href); if (u.pathname !== location.pathname || !u.hash) return
      var t = doc.querySelector(u.hash); if (!t) return
      e.preventDefault(); lenis.scrollTo(t, { offset: -92, duration: 1.3 }); history.pushState(null, '', u.hash)
    })
    new MutationObserver(function () { if ($('.lb')) lenis.stop(); else lenis.start() }).observe(doc.body, { childList: true })
  }

  /* ---------- helpers ---------- */
  var MASK = { type: 'lines', mask: 'lines', linesClass: 'ln', maskClass: 'ln-mask' }
  function band(trigger, start, end) { return { trigger: trigger, start: start, end: end, scrub: true } }

  /* ---------- page opening: curtain (once per session) then hero ---------- */
  function heroIntro() {
    var h1 = $('.hero2 .hd--hero')
    if (h1) {
      Split.create(h1, Object.assign({ autoSplit: true }, MASK, {
        onSplit: function (self) {
          var tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
          tl.from(self.lines, { yPercent: 118, duration: 1.2, stagger: 0.14 })
            .from('.hero2 .rv-hero', { autoAlpha: 0, y: 16, duration: 0.9, stagger: 0.09 }, 0.45)
          return tl
        },
      }))
    }
    var ph = $('.phead h1')
    if (ph) {
      Split.create(ph, Object.assign({ autoSplit: true }, MASK, {
        onSplit: function (self) {
          var tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
          tl.from(self.lines, { yPercent: 118, duration: 1.05, stagger: 0.12 })
            .from('.phead .crumb, .phead .lede, .phead .ctas', { autoAlpha: 0, y: 16, duration: 0.8, stagger: 0.08 }, 0.3)
          return tl
        },
      }))
    }
  }
  function curtain(next) {
    var c = $('#curtain')
    if (!c || !root.classList.contains('has-curtain')) { next(); return }
    try { sessionStorage.setItem('vlfa-in', '1') } catch (e) {}
    var tl = gsap.timeline({ onComplete: function () { c.style.display = 'none'; root.classList.remove('has-curtain') } })
    tl.from('.curtain-helm', { rotation: -140, scale: 0.7, autoAlpha: 0, duration: 1, ease: 'expo.out' })
      .from('.curtain-word span', { yPercent: 115, duration: 0.7, ease: 'expo.out', stagger: 0.09 }, 0.2)
      .to('.curtain-helm', { rotation: 40, duration: 0.8, ease: 'power3.inOut' }, 0.55)
      .to(c, { yPercent: -100, duration: 0.85, ease: 'expo.inOut' }, 1.05)
      .add(next, 1.35)
  }

  /* ---------- scroll choreography (all scrubbed, all position-tied) ---------- */
  function scrollMotion() {
    /* headings: masked lines rise as the heading enters the lower third */
    $$('main h2.h2, main .h2').forEach(function (el) {
      if (el.closest('.fd-panel') || el.__done) return; el.__done = true
      Split.create(el, Object.assign({ autoSplit: true }, MASK, {
        onSplit: function (self) { return gsap.from(self.lines, { yPercent: 118, ease: 'none', stagger: 0.2, scrollTrigger: band(el, 'top 93%', 'top 64%') }) },
      }))
    })
    /* lede + long copy: lines fade up in sequence */
    $$('main .lede--dark, main .story-txt p, main .house-txt p, main .article-txt p, main .finder-head .lede').forEach(function (el) {
      if (el.__done) return; el.__done = true
      Split.create(el, { type: 'lines', linesClass: 'fl', autoSplit: true, onSplit: function (self) {
        return gsap.from(self.lines, { autoAlpha: 0, y: 16, ease: 'none', stagger: 0.14, scrollTrigger: band(el, 'top 92%', 'top 66%') })
      } })
    })
    /* photographs: clip curtain + scale-settle, plus inner parallax across the whole pass */
    $$('[data-media], .crop, .plx, .house-cover, .article-fig, .office-fig, .story-fig').forEach(function (el) {
      if (el.__done) return; el.__done = true
      var img = $('img', el)
      gsap.fromTo(el, { clipPath: 'inset(9% 9% 9% 9% round 16px)' }, { clipPath: 'inset(0% 0% 0% 0% round 16px)', ease: 'none', scrollTrigger: band(el, 'top 98%', 'top 58%') })
      if (img) {
        gsap.fromTo(img, { scale: 1.26 }, { scale: 1.12, ease: 'none', scrollTrigger: band(el, 'top 98%', 'top 58%') })
        gsap.fromTo(img, { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } })
      }
    })
    /* groups: scale + rise, each item on its own short band */
    $$('.rv > *, [data-items] > *').forEach(function (k, i) {
      if (k.__done || k.matches('[data-media], .h2, .lede--dark, .crop, .story-fig')) return; k.__done = true
      var idx = Math.min($$(':scope > *', k.parentNode).indexOf(k), 4)
      gsap.from(k, { autoAlpha: 0, y: 28, scale: k.closest('[data-items]') ? 0.94 : 1, ease: 'none', scrollTrigger: band(k, 'top ' + (97 - idx * 2) + '%', 'top ' + (74 - idx * 2) + '%') })
    })
    /* hairlines draw in from the left */
    $$('.hero2-now li, .staff li, .prices > div, .tl li, .contrib li, .rules-dl > div, .agr li, .edu-list li, .fgroup li, .stewards li, .chairs li, .links2 li, .board-main li, .hours--dark div, .upp dl > div').forEach(function (el) {
      if (el.__done) return; el.__done = true
      el.classList.add('hl')
      gsap.fromTo(el, { '--hl': 0 }, { '--hl': 1, ease: 'none', scrollTrigger: band(el, 'top 98%', 'top 82%') })
    })
    /* story panel breathes open */
    $$('[data-inset]').forEach(function (el) {
      gsap.fromTo(el, { clipPath: 'inset(5% 4% 5% 4% round 16px)' }, { clipPath: 'inset(0% 0% 0% 0% round 16px)', ease: 'none', scrollTrigger: band(el, 'top 96%', 'top 38%') })
    })
    /* their own sentence, read word by word */
    $$('[data-words]').forEach(function (el) {
      Split.create(el, { type: 'words', wordsClass: 'w', autoSplit: true, onSplit: function (self) {
        return gsap.fromTo(self.words, { opacity: 0.14 }, { opacity: 1, ease: 'none', stagger: 0.2, scrollTrigger: band(el, 'top 82%', 'bottom 56%') })
      } })
    })
    /* the membership card rides up and tilts to the pointer */
    $$('[data-tilt]').forEach(function (stage) {
      var card = $('.mcard', stage)
      gsap.fromTo(stage, { yPercent: 8 }, { yPercent: -6, ease: 'none', scrollTrigger: { trigger: stage, start: 'top bottom', end: 'bottom top', scrub: true } })
      if (!fine) return
      stage.addEventListener('pointermove', function (e) {
        var r = stage.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5
        card.style.setProperty('--ry', (x * 26).toFixed(1) + 'deg'); card.style.setProperty('--rx', (-y * 18).toFixed(1) + 'deg'); card.style.setProperty('--sx', (x * 140).toFixed(0) + '%')
      })
      stage.addEventListener('pointerleave', function () { card.style.setProperty('--ry', '-14deg'); card.style.setProperty('--rx', '8deg'); card.style.setProperty('--sx', '-60%') })
    })
  }

  /* ---------- rail: inner parallax across the horizontal scroll + progress ---------- */
  $$('.rail-track').forEach(function (t) {
    var cards = $$('.hcard', t), prog = t.parentNode.parentNode.querySelector('.rail-prog'), queued = false
    function upd() {
      queued = false
      var vw = window.innerWidth, rects = cards.map(function (c) { return c.getBoundingClientRect() })
      rects.forEach(function (r, i) { cards[i].style.setProperty('--px', (((r.left + r.width / 2) - vw / 2) / vw).toFixed(3)) })
      if (prog) { var max = t.scrollWidth - t.clientWidth; prog.style.setProperty('--rp', Math.max(0.06, max > 0 ? t.scrollLeft / max : 1).toFixed(3)) }
    }
    function q() { if (!queued) { queued = true; requestAnimationFrame(upd) } }
    t.addEventListener('scroll', q, { passive: true }); window.addEventListener('resize', q); upd()
  })

  /* ---------- follower cursor: fine pointers, >= 1024, label over draggable / openable things ---------- */
  var cur = $('.cursor')
  if (cur && fine && window.innerWidth >= 1024) {
    var lab = $('.cursor-lab', cur), setX = gsap.quickSetter(cur, 'x', 'px'), setY = gsap.quickSetter(cur, 'y', 'px')
    var p = { x: window.innerWidth / 2, y: window.innerHeight / 2 }, e2 = { x: p.x, y: p.y }, awake = false
    var tick = function (_t, dt) {
      var k = 1 - Math.pow(1 - 0.2, dt * 0.06)
      e2.x += (p.x - e2.x) * k; e2.y += (p.y - e2.y) * k; setX(e2.x); setY(e2.y)
      if (Math.abs(p.x - e2.x) < 0.1 && Math.abs(p.y - e2.y) < 0.1) { gsap.ticker.remove(tick); awake = false }
    }
    window.addEventListener('mousemove', function (e) { p.x = e.clientX; p.y = e.clientY; cur.classList.add('is-on'); if (!awake) { awake = true; gsap.ticker.add(tick) } }, { passive: true })
    doc.addEventListener('mouseleave', function () { cur.classList.remove('is-on') })
    doc.addEventListener('mouseover', function (e) {
      var t = e.target.closest && e.target.closest('[data-cursor]')
      if (t) { lab.textContent = t.getAttribute('data-cursor'); cur.classList.add('is-label') } else cur.classList.remove('is-label')
    })
    doc.addEventListener('mousedown', function () { cur.classList.add('is-down') }); doc.addEventListener('mouseup', function () { cur.classList.remove('is-down') })
  }

  /* ---------- go ---------- */
  function begin() {
    scrollMotion()
    curtain(function () { heroIntro(); root.classList.add('ready') })
    ST.refresh()
  }
  var ready = doc.fonts && doc.fonts.ready ? Promise.race([doc.fonts.ready, new Promise(function (r) { setTimeout(r, 1500) })]) : Promise.resolve()
  ready.then(begin)
  window.addEventListener('load', function () { ST.refresh() })
})()
