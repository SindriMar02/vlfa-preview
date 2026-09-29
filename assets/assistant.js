/* "Spyrðu félagið": scripted retrieval over the union's own published facts (assets/kb.js). No model, no network call.
   It answers only from the fact set, shows which source it looked in, and refuses (composed, with the phone number)
   when it has no answer. The window morphs out of its button and collapses back into it (all CSS transitions, so an
   open or close can be interrupted mid-flight), and on phones it is a bottom sheet you can drag away. */
(function () {
  'use strict'
  var doc = document, root = doc.documentElement
  var KB = window.VLFA
  var R = doc.body.getAttribute('data-root') || ''
  var panel = doc.getElementById('as'), launch = doc.querySelector('.as-launch'), log = doc.getElementById('as-log')
  var form = doc.getElementById('as-form'), input = doc.getElementById('as-input'), send = doc.getElementById('as-send'), chips = doc.getElementById('as-chips')
  if (!panel || !KB || !log) return
  var mqDesk = window.matchMedia('(min-width: 900px)')
  var mqRed = window.matchMedia('(prefers-reduced-motion: reduce)')
  var isOpen = false, lastFocus = null, started = false, busy = Promise.resolve(), welcome = null

  /* ---------- matching ---------- */
  function norm(s) {
    return ' ' + s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ð/g, 'd').replace(/þ/g, 'th').replace(/æ/g, 'ae').replace(/[^a-z0-9 .]/g, ' ').replace(/\s+/g, ' ') + ' '
  }
  function score(intent, q) {
    var s = 0
    intent.keys.forEach(function (k) { var nk = norm(k).replace(/^ /, '').replace(/ $/, k.slice(-1) === ' ' ? ' ' : ''); if (q.indexOf(nk) > -1) s += k.length })
    return s * (intent.weight || 1)
  }
  function answer(text) {
    var q = norm(text), best = null, top = 0
    KB.intents.forEach(function (it) { var sc = score(it, q); if (sc > top) { top = sc; best = it } })
    return top > 0 ? best : null
  }

  /* ---------- building blocks ---------- */
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') }
  function url(u) { return u.charAt(0) === '~' ? R + u.slice(1) : u }
  function el(cls, html) { var d = doc.createElement('div'); d.className = cls; d.innerHTML = html; return d }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, mqRed.matches ? 0 : ms) }) }
  function actions(list) {
    if (!list || !list.length) return ''
    return '<div class="as-act">' + list.map(function (a, i) {
      var ext = /^https?:/.test(a[1]) ? ' target="_blank" rel="noopener"' : ''
      return '<a class="as-btn' + (i === 0 ? ' as-btn--p' : '') + '" href="' + url(a[1]) + '"' + ext + '>' + a[0] + '</a>'
    }).join('') + '</div>'
  }
  function sources(list) {
    if (!list || !list.length) return ''
    return '<div class="as-src"><span>Heimild:</span>' + list.map(function (s) { return '<a href="' + s[1] + '" target="_blank" rel="noopener">' + s[0] + '</a>' }).join('') + '</div>'
  }
  function toEnd() {
    var go = function () { log.scrollTo({ top: log.scrollHeight, behavior: mqRed.matches ? 'auto' : 'smooth' }) }
    go(); setTimeout(go, 320)
  }
  function add(node) { log.appendChild(node); toEnd(); return node }

  function miniSick(bubble) {
    var yrs = '', mos = ''
    for (var i = 0; i <= 30; i++) yrs += '<option value="' + i + '">' + i + ' ár</option>'
    for (var j = 0; j <= 11; j++) mos += '<option value="' + j + '">' + j + ' mán.</option>'
    var box = el('as-mini', '<label>Kjarasamningur<select data-a><option value="general">Almennur vinnumarkaður (SGS og SA)</option><option value="hve">Heilbrigðisstofnun Vesturlands</option></select></label><label>Starfsaldur, ár<select data-y>' + yrs + '</select></label><label>Mánuðir<select data-m>' + mos + '</select></label><div class="as-mini-out" data-o aria-live="polite"></div>')
    var sels = box.querySelectorAll('select'), out = box.querySelector('[data-o]')
    function r() {
      var row = window.vlfaSickRow(sels[0].value, +sels[1].value, +sels[2].value)
      out.innerHTML = '<b>' + row.label + '</b>' + row.v.map(function (v, i) { return '<span><b>' + KB.sick.cols[i] + ':</b> ' + (v || KB.sick.empty) + '</span>' }).join('')
    }
    sels.forEach(function (s) { s.addEventListener('change', r) }); r(); bubble.appendChild(box)
  }

  /* ---------- welcome + suggestions ---------- */
  function renderWelcome() {
    welcome = el('as-welcome', '<h3>Hvað get ég aðstoðað með?</h3><p>Ég svara út frá upplýsingum sem félagið hefur birt: styrki, orlofshús, kjör og þjónustu. Ég gef ekki lögfræðiráðgjöf og giska ekki.</p><div class="as-sugs"></div>')
    var box = welcome.querySelector('.as-sugs')
    KB.chips.slice(0, 5).forEach(function (c, i) {
      var b = doc.createElement('button'); b.type = 'button'; b.className = 'as-sug'; b.style.setProperty('--i', i); b.textContent = c
      b.addEventListener('click', function () { ask(c) }); box.appendChild(b)
    })
    log.appendChild(welcome)
  }
  function hideWelcome() {
    if (!welcome) return Promise.resolve()
    var w = welcome; welcome = null; w.classList.add('is-leaving')
    return wait(230).then(function () { w.remove(); showChips() })
  }
  function showChips() {
    if (!chips.hidden) return
    chips.innerHTML = KB.chips.map(function (c) { return '<button class="as-chip" type="button">' + esc(c) + '</button>' }).join('')
    Array.prototype.forEach.call(chips.querySelectorAll('.as-chip'), function (b) { b.addEventListener('click', function () { ask(b.textContent) }) })
    chips.hidden = false
  }

  /* ---------- a question, answered in order ---------- */
  function ask(text) {
    text = (text || '').trim(); if (!text) return
    busy = busy.then(function () { return run(text) })
  }
  function run(text) {
    return hideWelcome().then(function () {
      add(el('as-msg as-msg--u', esc(text)))
      var it = answer(text), tool = it && it.tool
      return wait(200).then(function () {
        var chip = tool ? add(el('as-tool is-loading', esc(tool))) : null
        var typing = add(el('as-msg as-msg--b as-typing', '<i></i><i></i><i></i>')); typing.setAttribute('aria-hidden', 'true')
        return wait(tool ? 700 : 520).then(function () {
          typing.remove(); if (chip) chip.classList.remove('is-loading')
          var refuse = !it
          var html = refuse ? KB.refusal.html + actions(KB.refusal.actions) : it.html + actions(it.actions) + sources(it.sources)
          var b = add(el('as-msg as-msg--b' + (refuse || it.refuse ? ' as-refuse' : ''), html))
          if (it && it.mini === 'sick') miniSick(b)
          toEnd()
        })
      })
    })
  }

  /* ---------- composer ---------- */
  function syncSend() { send.setAttribute('aria-disabled', input.value.trim() ? 'false' : 'true') }
  input.addEventListener('input', syncSend)
  form.addEventListener('submit', function (e) {
    e.preventDefault()
    var v = input.value.trim(); if (!v) { input.focus(); return }
    input.value = ''; syncSend(); ask(v); input.focus({ preventScroll: true })
  })

  /* ---------- open / collapse ---------- */
  function setLW() {
    var w = 190
    if (launch && launch.offsetParent !== null) w = Math.round(launch.getBoundingClientRect().width)
    panel.style.setProperty('--lw', w + 'px')
  }
  function inertOthers(on) {
    ['.bar', '#mm', 'main', '.foot', '.awning'].forEach(function (s) { var e = doc.querySelector(s); if (e) e.inert = on })
  }
  function open(trigger) {
    if (isOpen) return
    isOpen = true; lastFocus = trigger || doc.activeElement
    setLW(); panel.inert = false; panel.style.transform = ''
    panel.classList.add('is-open')
    if (launch) { launch.classList.add('is-hidden'); launch.setAttribute('aria-expanded', 'true') }
    if (!mqDesk.matches) { root.classList.add('as-lock'); inertOthers(true); panel.setAttribute('aria-modal', 'true') }
    if (!started) { started = true; renderWelcome() }
    setTimeout(function () { if (isOpen) input.focus({ preventScroll: true }) }, mqRed.matches ? 0 : 260)
  }
  function close() {
    if (!isOpen) return
    isOpen = false
    panel.classList.remove('is-open'); panel.inert = true
    if (launch) { launch.classList.remove('is-hidden'); launch.setAttribute('aria-expanded', 'false') }
    root.classList.remove('as-lock'); inertOthers(false); panel.setAttribute('aria-modal', 'false')
    var back = lastFocus && doc.contains(lastFocus) && lastFocus !== doc.body ? lastFocus : launch
    if (back && back.focus) back.focus({ preventScroll: true })
  }
  doc.addEventListener('click', function (e) {
    var o = e.target.closest('[data-assistant-open]'); if (o) { e.preventDefault(); open(o); return }
    if (e.target.closest('[data-assistant-close]')) close()
  })
  doc.addEventListener('keydown', function (e) {
    if (!isOpen) return
    if (e.key === 'Escape') { e.preventDefault(); close(); return }
    if (e.key === 'Tab' && !mqDesk.matches) {
      var f = Array.prototype.filter.call(panel.querySelectorAll('a[href], button:not([disabled]), input, select, [tabindex="0"]'), function (n) { return n.offsetParent !== null })
      if (!f.length) return
      var first = f[0], last = f[f.length - 1]
      if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus() }
    }
  })
  var onMq = function () { if (isOpen) close() }
  if (mqDesk.addEventListener) mqDesk.addEventListener('change', onMq)

  /* phones: the header is a drag handle; a flick or a long pull sends the sheet away */
  var head = panel.querySelector('.as-head'), drag = null
  head.addEventListener('pointerdown', function (e) {
    if (mqDesk.matches || e.pointerType === 'mouse' || e.target.closest('.as-x')) return
    drag = { y: e.clientY, t: performance.now(), dy: 0 }; head.setPointerCapture(e.pointerId); panel.classList.add('is-dragging')
  })
  head.addEventListener('pointermove', function (e) {
    if (!drag) return
    drag.dy = Math.max(0, e.clientY - drag.y); panel.style.transform = 'translateY(' + drag.dy + 'px)'
  })
  function endDrag() {
    if (!drag) return
    var dy = drag.dy, v = dy / Math.max(1, performance.now() - drag.t); drag = null
    panel.classList.remove('is-dragging'); panel.style.transform = ''
    if (dy > 120 || v > 0.11) close()
  }
  head.addEventListener('pointerup', endDrag); head.addEventListener('pointercancel', endDrag)
})()
