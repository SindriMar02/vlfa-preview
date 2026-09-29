/* VLFA prototype behaviour. Vanilla, no libraries, native scroll. Scroll reveals are CSS scroll timelines (style.css);
   this file only splits headings into lines, wires the interactive parts and plays the hero intro. */
(function () {
  'use strict'
  var doc = document, root = doc.documentElement
  var $ = function (s, c) { return (c || doc).querySelector(s) }
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)) }
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches

  /* ---------- buttons: label roll + a fill that enters and leaves on the side the pointer does ---------- */
  $$('.btn').forEach(function (b) {
    if (b.__lbl || b.querySelector('.bt')) return; b.__lbl = 1
    var txt = b.textContent.trim(); if (!txt) return
    b.innerHTML = '<span class="bt"><span>' + txt + '</span><span aria-hidden="true">' + txt + '</span></span>'
  })
  if (fine) {
    doc.addEventListener('pointerenter', function (e) { var b = e.target.closest && e.target.closest('.btn'); if (!b) return; var r = b.getBoundingClientRect(); b.style.setProperty('--ox', e.clientX < r.left + r.width / 2 ? '0%' : '100%') }, true)
    doc.addEventListener('pointerleave', function (e) { var b = e.target.closest && e.target.closest('.btn'); if (!b) return; var r = b.getBoundingClientRect(); b.style.setProperty('--ox', e.clientX < r.left + r.width / 2 ? '0%' : '100%') }, true)
  }
  window.addEventListener('resize', function () { positionRunner() })

  /* ---------- nav dropdowns ---------- */
  var nav = $('.nav'), runner = $('.runner')
  var groups = $$('.nav-item')
  var closeT
  function closeAll(except) {
    groups.forEach(function (g) {
      if (g === except) return
      var b = $('.nav-btn', g), d = $('.dd', g)
      b.setAttribute('aria-expanded', 'false'); d.hidden = true
    })
  }
  function open(g) {
    closeAll(g); var b = $('.nav-btn', g), d = $('.dd', g)
    b.setAttribute('aria-expanded', 'true'); d.hidden = false; moveRunner(g)
  }
  groups.forEach(function (g) {
    var b = $('.nav-btn', g), d = $('.dd', g)
    b.addEventListener('click', function () { b.getAttribute('aria-expanded') === 'true' ? closeAll() : open(g) })
    b.addEventListener('keydown', function (e) { if (e.key === 'ArrowDown') { e.preventDefault(); open(g); var a = $('a', d); a && a.focus() } })
    d.addEventListener('keydown', function (e) {
      var links = $$('a', d), i = links.indexOf(doc.activeElement)
      if (e.key === 'ArrowDown') { e.preventDefault(); links[Math.min(i + 1, links.length - 1)].focus() }
      if (e.key === 'ArrowUp') { e.preventDefault(); i > 0 ? links[i - 1].focus() : b.focus() }
    })
    if (fine) {
      g.addEventListener('mouseenter', function () { clearTimeout(closeT); open(g) })
      g.addEventListener('mouseleave', function () { closeT = setTimeout(function () { closeAll(); positionRunner() }, 140) })
    }
  })
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') { var openG = groups.filter(function (g) { return !$('.dd', g).hidden })[0]; closeAll(); if (openG) $('.nav-btn', openG).focus() } })
  doc.addEventListener('click', function (e) { if (nav && !nav.contains(e.target)) closeAll() })
  if (nav) nav.addEventListener('focusout', function (e) { if (!nav.contains(e.relatedTarget)) closeAll() })
  function moveRunner(g) {
    if (!runner || !nav) return
    var b = $('.nav-btn', g).getBoundingClientRect(), n = nav.getBoundingClientRect()
    runner.style.transform = 'translateX(' + (b.left - n.left + b.width / 2 - 2.5) + 'px)'; runner.style.opacity = 1
  }
  function positionRunner() {
    var cur = $('.nav-btn.is-current')
    if (cur) moveRunner(cur.closest('.nav-item')); else if (runner) runner.style.opacity = 0
  }
  positionRunner()

  /* ---------- mobile menu ---------- */
  var burger = $('.burger'), mm = $('#mm'), scrollY0 = 0
  function setMenu(openIt) {
    if (!burger) return
    burger.setAttribute('aria-expanded', openIt); mm.hidden = !openIt
    if (openIt) { scrollY0 = window.scrollY; doc.body.style.top = -scrollY0 + 'px'; doc.body.classList.add('is-locked') }
    else { doc.body.classList.remove('is-locked'); doc.body.style.top = ''; window.scrollTo(0, scrollY0) }
  }
  if (burger) {
    burger.addEventListener('click', function () { setMenu(burger.getAttribute('aria-expanded') !== 'true') })
    $$('.mm-btn').forEach(function (b) {
      b.addEventListener('click', function () { var o = b.getAttribute('aria-expanded') === 'true'; b.setAttribute('aria-expanded', !o); $('#' + b.getAttribute('aria-controls')).hidden = o })
    })
    $$('#mm a, #mm [data-assistant-open]').forEach(function (a) { a.addEventListener('click', function () { if (burger.getAttribute('aria-expanded') === 'true') setMenu(false) }) })
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') { setMenu(false); burger.focus() } })
    window.addEventListener('resize', function () { if (window.innerWidth >= 1024 && burger.getAttribute('aria-expanded') === 'true') setMenu(false) })
  }

  /* ---------- situation finder ---------- */
  var finder = $('[data-finder]')
  if (finder) {
    var tabs = $$('.fd-tab', finder), panels = $$('.fd-panel', finder)
    var pick = function (i, focus) {
      tabs.forEach(function (t, k) { t.setAttribute('aria-selected', k === i); t.tabIndex = k === i ? 0 : -1 })
      panels.forEach(function (p, k) { p.hidden = k !== i })
      var hm = $('.fd-helm', finder); if (hm) hm.style.rotate = (-i * 60) + 'deg'
      finder.classList.toggle('kbd', !!focus)
      if (focus) { tabs[i].focus(); try { history.replaceState(null, '', '#' + tabs[i].id.replace('fd-t-', 'adstaedur-')) } catch (e) {} }
    }
    var hm0 = (location.hash || '').replace('#adstaedur-', ''); tabs.forEach(function (t, i) { if (hm0 && t.id === 'fd-t-' + hm0) pick(i) })
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { pick(i); try { history.replaceState(null, '', '#' + t.id.replace('fd-t-', 'adstaedur-')) } catch (e) {} })
      t.addEventListener('keydown', function (e) {
        var n = null
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') n = (i + 1) % tabs.length
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length
        if (e.key === 'Home') n = 0; if (e.key === 'End') n = tabs.length - 1
        if (n !== null) { e.preventDefault(); pick(n, true) }
      })
    })
  }

  /* ---------- rail ---------- */
  $$('[data-rail]').forEach(function (r) {
    var track = $('.rail-track', r)
    if (fine) {
      var down = false, sx = 0, sl = 0, moved = 0
      track.addEventListener('pointerdown', function (e) { if (e.button !== 0) return; down = true; moved = 0; sx = e.clientX; sl = track.scrollLeft; track.style.scrollSnapType = 'none' })
      window.addEventListener('pointermove', function (e) { if (!down) return; var dx = e.clientX - sx; moved = Math.max(moved, Math.abs(dx)); track.scrollLeft = sl - dx })
      window.addEventListener('pointerup', function () { if (!down) return; down = false; track.style.scrollSnapType = ''; })
      track.addEventListener('click', function (e) { if (moved > 6) { e.preventDefault(); e.stopPropagation() } }, true)
      track.addEventListener('dragstart', function (e) { e.preventDefault() })
    }
    $$('.rail-btn', r).forEach(function (b) {
      b.addEventListener('click', function () {
        var card = track.children[0].getBoundingClientRect().width + 16
        track.scrollBy({ left: card * (+b.dataset.dir) * 1.2, behavior: reduce ? 'auto' : 'smooth' })
      })
    })
  })

  /* ---------- accordion ---------- */
  $$('[data-acc]').forEach(function (acc) {
    $$('.acc-btn', acc).forEach(function (b) {
      b.addEventListener('click', function () {
        var o = b.getAttribute('aria-expanded') === 'true'
        b.setAttribute('aria-expanded', !o); $('#' + b.getAttribute('aria-controls')).classList.toggle('is-open', !o)
      })
    })
  })

  /* ---------- marquee pause (moving content over 5s needs a control) ---------- */
  $$('[data-marquee-toggle]').forEach(function (b) {
    b.addEventListener('click', function () {
      var m = b.closest('.perks-strip').querySelector('.marquee'), on = m.classList.toggle('is-paused')
      b.setAttribute('aria-pressed', on); b.textContent = on ? 'Hefja hreyfingu' : 'Stöðva hreyfingu'
    })
  })

  /* ---------- filters ---------- */
  var houses = $('[data-houses]')
  if (houses) {
    var chips = $$('.chip', houses), items = $$('.hgrid > li', houses)
    var applyArea = function (c) {
      chips.forEach(function (x) { x.setAttribute('aria-pressed', x === c) })
      items.forEach(function (li) { li.hidden = c.dataset.area && li.dataset.area !== c.dataset.area })
    }
    chips.forEach(function (c) {
      c.addEventListener('click', function () { applyArea(c); try { history.replaceState(null, '', c.dataset.area ? '?svaedi=' + encodeURIComponent(c.dataset.area) : location.pathname) } catch (e) {} })
    })
    var qa = new URLSearchParams(location.search).get('svaedi'); if (qa) chips.forEach(function (c) { if (c.dataset.area === qa) applyArea(c) })
  }
  var pf = $('[data-perkfilter]')
  if (pf) {
    var pchips = $$('.chip', pf), perks = $$('[data-perks] .perk')
    pchips.forEach(function (c) {
      c.addEventListener('click', function () {
        pchips.forEach(function (x) { x.setAttribute('aria-pressed', x === c) })
        perks.forEach(function (p) { p.hidden = c.dataset.cat && p.dataset.cat !== c.dataset.cat })
      })
    })
  }

  /* ---------- veikindaréttur: lookup in their own published tables, no interpretation ---------- */
  var VL = window.VLFA
  window.vlfaSickRow = function (which, years, months) {
    var t = VL.sick, m = years * 12 + months
    if (which === 'hve') {
      var row = t.hve[0]; t.hve.forEach(function (r) { if (m >= r.from) row = r }); return row
    }
    if (m < 12) return { label: m === 0 ? 'Á 1. mánuði' : 'Eftir ' + m + ' mán. starf', v: t.general.months[m] }
    var r2 = t.general.years[0]; t.general.years.forEach(function (r) { if (years >= r.from) r2 = r }); return r2
  }
  window.vlfaSickHTML = function (row) {
    var t = VL.sick
    return '<p class="sick-when">' + row.label + '</p>' + row.v.map(function (v, i) {
      return '<div class="sick-card"><h3>' + t.cols[i] + '</h3><p' + (v ? '' : ' class="is-empty"') + '>' + (v || t.empty) + '</p></div>'
    }).join('')
  }
  var sick = $('[data-sick]')
  if (sick && VL) {
    var ag = $('#sk-ag'), yy = $('#sk-y'), mo = $('#sk-m'), out = $('#sk-out')
    var render = function () { out.innerHTML = window.vlfaSickHTML(window.vlfaSickRow(ag.value, +yy.value, +mo.value)) }
    ;[ag, yy, mo].forEach(function (s) { s.addEventListener('change', render) }); render()
  }

  /* ---------- gallery lightbox ---------- */
  $$('[data-gallery]').forEach(function (g) {
    var btns = $$('.gal-b', g), i = 0, lb
    function show(n) { i = (n + btns.length) % btns.length; $('img', lb).src = btns[i].dataset.full }
    function close() { lb.remove(); doc.body.style.overflow = ''; btns[i].focus(); doc.removeEventListener('keydown', key) }
    function key(e) { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') show(i + 1); if (e.key === 'ArrowLeft') show(i - 1) }
    btns.forEach(function (b, n) {
      b.addEventListener('click', function () {
        lb = doc.createElement('div'); lb.className = 'lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-label', 'Mynd')
        lb.innerHTML = '<img alt=""><button class="lb-x" type="button" aria-label="Loka">&times;</button><button class="lb-n lb-p" type="button" aria-label="Fyrri mynd">&#8249;</button><button class="lb-n lb-nx" type="button" aria-label="Næsta mynd">&#8250;</button>'
        doc.body.appendChild(lb); doc.body.style.overflow = 'hidden'; show(n)
        $('.lb-x', lb).addEventListener('click', close); $('.lb-p', lb).addEventListener('click', function () { show(i - 1) }); $('.lb-nx', lb).addEventListener('click', function () { show(i + 1) })
        lb.addEventListener('click', function (e) { if (e.target === lb) close() }); doc.addEventListener('keydown', key); $('.lb-x', lb).focus()
      })
    })
  })

  /* ---------- request form: validates, never sends ---------- */
  $$('[data-req]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault(); var ok = true
      $$('[required]', f).forEach(function (fld) {
        var err = fld.parentNode.querySelector('[data-err]'), bad = !fld.value.trim()
        if (fld.type === 'tel' && fld.value.replace(/\D/g, '').length < 7) bad = true
        if (err) err.textContent = bad ? (fld.type === 'tel' ? 'Sláðu inn símanúmer með að minnsta kosti sjö tölustöfum.' : 'Veldu efni.') : ''
        if (bad) { ok = false; if (!f.__f) { fld.focus(); f.__f = 1 } }
      })
      f.__f = 0
      if (ok) $('[data-ok]', f).hidden = false
    })
  })

  /* ---------- office open now (Reykjavik time) ---------- */
  var on = $('[data-open-text]')
  if (on) {
    try {
      var p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Atlantic/Reykjavik', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date())
      var get = function (t) { return p.filter(function (x) { return x.type === t })[0].value }
      var day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday')), mins = +get('hour') % 24 * 60 + +get('minute')
      var close = function (d) { return d === 5 ? 15 * 60 + 15 : 16 * 60 }
      var names = ['sunnudag', 'mánudag', 'þriðjudag', 'miðvikudag', 'fimmtudag', 'föstudag', 'laugardag']
      var isOpen = day >= 1 && day <= 5 && mins >= 480 && mins < close(day)
      if (isOpen) { var c = close(day); on.innerHTML = '<strong>Opið núna</strong> til kl. ' + String(Math.floor(c / 60)).padStart(2, '0') + ':' + String(c % 60).padStart(2, '0') + '. Sími 430-9900.' }
      else {
        var nd = day, before = day >= 1 && day <= 5 && mins < 480
        if (!before) { do { nd = (nd + 1) % 7 } while (nd === 0 || nd === 6) }
        on.innerHTML = '<strong>Lokað núna.</strong> Opnar ' + (before ? 'í dag' : names[nd]) + ' kl. 08:00.'
      }
    } catch (e) {}
  }
})()
