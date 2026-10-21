/* Interactive demos for read.html.
   Each <div class="demo" data-demo="name"></div> is mounted by the matching function below.
   Motion only happens when the reader presses Play or Step. */
(function () {
  'use strict';
  const S = window.Study;
  const esc = S.esc;
  const T = ['var(--t0)', 'var(--t1)', 'var(--t2)', 'var(--t3)'];
  const tc = k => T[k % 4];
  let uid = 0;

  /* ---------- shared building blocks ---------- */
  function shell(root, title, sub) {
    root.innerHTML =
      '<div class="demo-head"><span class="demo-title">' + esc(title) + '</span>' +
      (sub ? '<span class="demo-sub">' + sub + '</span>' : '') + '</div>' +
      '<div class="demo-modes"></div><div class="demo-stage"></div>' +
      '<div class="demo-controls"></div><p class="demo-readout" aria-live="polite"></p>';
    return {
      modes: root.querySelector('.demo-modes'),
      stage: root.querySelector('.demo-stage'),
      controls: root.querySelector('.demo-controls'),
      readout: root.querySelector('.demo-readout')
    };
  }

  function btn(label, onClick, cls) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'demo-btn' + (cls ? ' ' + cls : ''); b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  }

  /* Segmented choice: [[value, label], ...]. Appends to host (several groups can share a host). */
  function modes(host, options, current, onChange) {
    const group = document.createElement('div');
    group.className = 'demo-seg';
    group.setAttribute('role', 'group');
    options.forEach(o => {
      const b = btn(o[1], () => {
        group.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
        onChange(o[0]);
      }, 'seg');
      b.setAttribute('aria-pressed', String(o[0] === current));
      group.appendChild(b);
    });
    host.appendChild(group);
    return group;
  }

  /* Play/Pause + Step + Reset. step() returns false when there is nothing more to do. */
  function transport(host, step, reset, ms) {
    let timer = null;
    const play = btn('Play', () => (timer ? stop() : start()), 'primary');
    const stepB = btn('Step', () => { stop(); step(); });
    const resetB = btn('Reset', () => { stop(); reset(); });
    function start() {
      if (step() === false) { reset(); step(); }
      timer = setInterval(() => { if (step() === false) stop(); }, ms);
      play.textContent = 'Pause';
    }
    function stop() { if (timer) clearInterval(timer); timer = null; play.textContent = 'Play'; }
    host.append(play, stepB, resetB);
    return { stop: stop };
  }

  function slider(host, label, min, max, value, onInput, fmt) {
    const id = 'sl' + (++uid);
    const wrap = document.createElement('label');
    wrap.className = 'demo-slider'; wrap.htmlFor = id;
    wrap.innerHTML = '<span>' + esc(label) + ' <strong></strong></span><input type="range" id="' + id + '" min="' + min + '" max="' + max + '" value="' + value + '">';
    const out = wrap.querySelector('strong'), input = wrap.querySelector('input');
    const show = () => { out.textContent = fmt ? fmt(Number(input.value)) : input.value; };
    input.addEventListener('input', () => { show(); onInput(Number(input.value)); });
    show(); host.appendChild(wrap);
    return input;
  }

  function check(host, label, value, onChange) {
    const lbl = document.createElement('label'); lbl.className = 'demo-check';
    lbl.innerHTML = '<input type="checkbox"' + (value ? ' checked' : '') + '> ' + esc(label);
    lbl.querySelector('input').addEventListener('change', e => onChange(e.target.checked));
    host.appendChild(lbl);
  }

  function svg(w, h, body, label) {
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + esc(label || '') + '" font-family="var(--font)" font-size="13">' + body + '</svg>';
  }
  const txt = (x, y, s, attrs) => '<text x="' + x + '" y="' + y + '" ' + (attrs || '') + '>' + esc(s) + '</text>';
  const rect = (x, y, w, h, fill, extra) => '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="5" fill="' + fill + '" ' + (extra || '') + '/>';
  function arrowDefs(id, color) {
    return '<defs><marker id="' + id + '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="' + color + '"/></marker></defs>';
  }

  /* =====================================================================
     1. Encapsulation along the path
     ===================================================================== */
  function encap(root) {
    const ui = shell(root, 'Encapsulation, hop by hop', 'Follow one message from the source, through a switch and a router, to the destination.');
    const NODES = [
      { name: 'source', layers: ['application', 'transport', 'network', 'link', 'physical'], x: 14 },
      { name: 'switch', layers: ['link', 'physical'], x: 192 },
      { name: 'router', layers: ['network', 'link', 'physical'], x: 340 },
      { name: 'destination', layers: ['application', 'transport', 'network', 'link', 'physical'], x: 518 }
    ];
    const STEPS = [
      [0, 'application', ['M'], 'The application creates message M and passes it through its socket.'],
      [0, 'transport', ['Ht', 'M'], 'Transport adds header Ht (ports, checksum): now it is a segment.'],
      [0, 'network', ['Hn', 'Ht', 'M'], 'Network adds Hn (source and destination IP): a datagram.'],
      [0, 'link', ['Hl', 'Hn', 'Ht', 'M'], 'Link adds Hl for this one link: a frame.'],
      [0, 'physical', ['Hl', 'Hn', 'Ht', 'M'], 'The physical layer puts the frame\'s bits on the medium.'],
      [1, 'link', ['Hl', 'Hn', 'Ht', 'M'], 'The switch works only up to the link layer: it reads Hl and forwards the frame within the LAN.'],
      [2, 'link', ['Hl', 'Hn', 'Ht', 'M'], 'The router\'s link layer receives the frame and strips Hl.'],
      [2, 'network', ['Hn', 'Ht', 'M'], 'The router reads Hn (destination IP) to pick the next link. Forwarding doesn\'t need Ht.'],
      [2, 'link', ['Hl′', 'Hn', 'Ht', 'M'], 'A new link header Hl′ for the next link, which may be a different technology. This is internetworking.'],
      [3, 'link', ['Hl′', 'Hn', 'Ht', 'M'], 'Destination link layer receives the frame and removes Hl′.'],
      [3, 'network', ['Hn', 'Ht', 'M'], 'Destination network layer checks Hn, removes it, and passes the segment up.'],
      [3, 'transport', ['Ht', 'M'], 'Transport checks the checksum, reads the destination port, removes Ht and demultiplexes to the right socket.'],
      [3, 'application', ['M'], 'The application receives exactly M: no headers.']
    ];
    const COL = { M: 'var(--ink)', Ht: tc(0), Hn: tc(1), Hl: tc(2), 'Hl′': tc(3) };
    const BW = { M: 70, Ht: 44, Hn: 44, Hl: 44, 'Hl′': 44 };
    let s = 0;
    function render() {
      const st = STEPS[s], W = 680, LH = 28, BOT = 172, bw = 148;
      let b = '';
      NODES.forEach((n, ni) => {
        const top = BOT - n.layers.length * LH;
        b += txt(n.x + bw / 2, top - 8, n.name, 'text-anchor="middle" font-weight="700" fill="var(--ink)"');
        n.layers.forEach((L, li) => {
          const y = top + li * LH, on = ni === st[0] && L === st[1];
          b += '<rect x="' + n.x + '" y="' + y + '" width="' + bw + '" height="' + (LH - 3) + '" rx="4" fill="' + (on ? 'var(--accent-soft)' : 'var(--paper)') + '" stroke="' + (on ? 'var(--accent)' : 'var(--rule)') + '" stroke-width="' + (on ? 2 : 1) + '"/>';
          b += txt(n.x + bw / 2, y + 17, L, 'text-anchor="middle" font-size="12" fill="' + (on ? 'var(--ink)' : 'var(--ink-2)') + '"');
        });
        if (ni < NODES.length - 1) {
          const x1 = n.x + bw, x2 = NODES[ni + 1].x;
          b += '<line x1="' + x1 + '" x2="' + x2 + '" y1="' + (BOT - 12) + '" y2="' + (BOT - 12) + '" stroke="var(--ink-2)" stroke-width="2"/>';
        }
      });
      let x = 14;
      const py = BOT + 22;
      b += txt(14, py - 6, 'Packet now:', 'font-size="12" fill="var(--ink-2)"');
      st[2].forEach(h => {
        const w = BW[h];
        b += rect(x, py, w - 3, 28, COL[h]);
        b += txt(x + (w - 3) / 2, py + 19, h, 'text-anchor="middle" font-weight="700" fill="var(--paper)" font-family="var(--mono)"');
        x += w;
      });
      const name = st[2].length === 1 ? 'message' : st[2].length === 2 ? 'segment' : st[2].length === 3 ? 'datagram' : 'frame';
      b += txt(x + 10, py + 19, name, 'font-size="13" fill="var(--ink)" font-weight="700"');
      ui.stage.innerHTML = svg(W, py + 40, b, 'Protocol stacks of source, switch, router and destination');
      ui.readout.textContent = 'Step ' + (s + 1) + ' of ' + STEPS.length + ': ' + st[3];
    }
    transport(ui.controls, () => { if (s >= STEPS.length - 1) return false; s++; render(); return s < STEPS.length - 1; }, () => { s = 0; render(); }, 1400);
    render();
  }

  /* =====================================================================
     2. DNS resolution: iterative vs recursive, with caching
     ===================================================================== */
  function dns(root) {
    const ui = shell(root, 'Resolving gaia.cs.umass.edu', 'A host at engineering.nyu.edu asks its local DNS server. Step through the messages.');
    const P = {
      host: [92, 230, 'requesting host', 'engineering.nyu.edu'],
      local: [320, 230, 'local DNS server', 'dns.nyu.edu'],
      root: [320, 46, 'root DNS server', ''],
      tld: [578, 84, 'TLD DNS server', '.edu'],
      auth: [578, 290, 'authoritative', 'dns.cs.umass.edu']
    };
    let mode = 'iter', tldCached = false, answerCached = false, s = 0;
    const id = 'dnsarrow' + (++uid);
    function plan() {
      const q = (a, b, note) => [a, b, 'q', note], r = (a, b, note) => [a, b, 'r', note];
      if (answerCached) return [q('host', 'local', 'Host asks its local server (recursive query).'), r('local', 'host', 'The local server answers from its cache: 2 messages, nothing leaves the campus.')];
      const m = [q('host', 'local', 'Host asks its local DNS server for gaia.cs.umass.edu.')];
      if (mode === 'iter') {
        if (!tldCached) m.push(q('local', 'root', 'Local server asks a root server.'), r('root', 'local', 'Root: "I don\'t know, but here are the .edu TLD servers." (iterative)'));
        m.push(q('local', 'tld', tldCached ? 'The .edu TLD address is cached, so the local server skips the root.' : 'Local server asks the .edu TLD server.'),
          r('tld', 'local', 'TLD: "Ask dns.cs.umass.edu, the authoritative server."'),
          q('local', 'auth', 'Local server asks the authoritative server.'),
          r('auth', 'local', 'Authoritative server returns the A record: gaia\'s IP address.'),
          r('local', 'host', 'Local server returns the answer to the host and caches it.'));
      } else {
        if (!tldCached) m.push(q('local', 'root', 'Local server asks root and lets root do the work (recursive).'), q('root', 'tld', 'Root forwards the query to the TLD server.'));
        else m.push(q('local', 'tld', 'TLD address cached: the local server goes straight to the TLD server.'));
        m.push(q('tld', 'auth', 'TLD forwards the query to the authoritative server.'),
          r('auth', 'tld', 'Authoritative server replies to the TLD server.'));
        if (!tldCached) m.push(r('tld', 'root', 'TLD relays the answer back to root.'), r('root', 'local', 'Root relays it to the local server. Upper levels carry all of this load.'));
        else m.push(r('tld', 'local', 'TLD relays it to the local server.'));
        m.push(r('local', 'host', 'Local server answers the host.'));
      }
      return m;
    }
    function render() {
      const m = plan(), W = 680, H = 322;
      let b = arrowDefs(id + 'q', 'var(--accent)') + arrowDefs(id + 'r', 'var(--ok)');
      m.slice(0, s).forEach((msg, k) => {
        const a = P[msg[0]], c = P[msg[1]];
        const dx = c[0] - a[0], dy = c[1] - a[1], len = Math.hypot(dx, dy) || 1;
        const order = Object.keys(P), dirSign = order.indexOf(msg[0]) < order.indexOf(msg[1]) ? 1 : -1;
        const off = (msg[2] === 'q' ? -9 : 9) * dirSign, nx = -dy / len * off, ny = dx / len * off;
        const pad = 52, sx = a[0] + dx / len * pad + nx, sy = a[1] + dy / len * pad * 0.6 + ny;
        const ex = c[0] - dx / len * pad + nx, ey = c[1] - dy / len * pad * 0.6 + ny;
        const col = msg[2] === 'q' ? 'var(--accent)' : 'var(--ok)', cur = k === s - 1;
        b += '<line x1="' + sx + '" y1="' + sy + '" x2="' + ex + '" y2="' + ey + '" stroke="' + col + '" stroke-width="' + (cur ? 3 : 1.6) + '" opacity="' + (cur ? 1 : 0.55) + '" marker-end="url(#' + id + msg[2] + ')"/>';
        const mx = (sx + ex) / 2 + nx * 2.4, my = (sy + ey) / 2 + ny * 2.4;
        b += '<circle cx="' + mx + '" cy="' + my + '" r="10" fill="' + col + '"/>' + txt(mx, my + 4, String(k + 1), 'text-anchor="middle" font-size="11" font-weight="700" fill="var(--paper)"');
      });
      Object.keys(P).forEach(k => {
        const p = P[k];
        const cached = (k === 'local') && (tldCached || answerCached);
        b += '<rect x="' + (p[0] - 76) + '" y="' + (p[1] - 22) + '" width="152" height="44" rx="8" fill="var(--paper)" stroke="var(--ink-2)"/>';
        b += txt(p[0], p[1] - 4, p[2], 'text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)"');
        b += txt(p[0], p[1] + 13, cached ? 'cache: ' + (answerCached ? 'gaia → IP' : '.edu TLD') : p[3], 'text-anchor="middle" font-size="11" fill="var(--ink-2)" font-family="var(--mono)"');
      });
      ui.stage.innerHTML = svg(W, H, b, 'DNS servers and the messages exchanged');
      ui.readout.textContent = s === 0
        ? 'This plan uses ' + m.length + ' DNS messages. Press Play or Step. Blue = query, green = reply.'
        : 'Message ' + s + ' of ' + m.length + ': ' + m[s - 1][3];
    }
    const restart = () => { s = 0; ctl.stop(); render(); };
    modes(ui.modes, [['iter', 'Typical: recursive to local, iterative after'], ['rec', 'Fully recursive']], mode, v => { mode = v; restart(); });
    const ctl = transport(ui.controls, () => { const n = plan().length; if (s >= n) return false; s++; render(); return s < n; }, () => { s = 0; render(); }, 1300);
    check(ui.controls, 'Local server has the .edu TLD cached', tldCached, v => { tldCached = v; restart(); });
    check(ui.controls, 'Local server has the answer cached', answerCached, v => { answerCached = v; restart(); });
    render();
  }

  /* =====================================================================
     3. HTTP response time: non-persistent vs persistent
     ===================================================================== */
  function httpTiming(root) {
    const ui = shell(root, 'Fetching a page: how many RTTs?', 'A base HTML file plus n images. Transmission times are ignored, so each block is one RTT.');
    let n = 10, rtt = 50;
    function rows() {
      const np = [], p = [['setup', 'TCP']], pp = [['setup', 'TCP'], ['req', 'base']];
      for (let i = 0; i <= n; i++) { np.push(['setup', 'TCP']); np.push(['req', i === 0 ? 'base' : 'img' + i]); }
      for (let i = 0; i <= n; i++) p.push(['req', i === 0 ? 'base' : 'img' + i]);
      if (n > 0) pp.push(['req', n + ' imgs']);
      return [['Non-persistent', np], ['Persistent', p], ['Persistent + pipelining', pp]];
    }
    function render() {
      const W = 680, X0 = 176, unit = (W - X0 - 64) / 22, R = rows();
      let b = '';
      for (let k = 0; k <= 22; k += 2) {
        b += '<line x1="' + (X0 + k * unit) + '" x2="' + (X0 + k * unit) + '" y1="14" y2="' + (24 + R.length * 46) + '" stroke="var(--chart-grid)"/>';
        b += txt(X0 + k * unit, 12, String(k), 'text-anchor="middle" font-size="11" fill="var(--ink-2)"');
      }
      R.forEach((row, r) => {
        const y = 24 + r * 46;
        b += txt(10, y + 21, row[0], 'font-size="12.5" fill="var(--ink)" font-weight="700"');
        row[1].forEach((blk, i) => {
          const x = X0 + i * unit;
          b += rect(x + 1, y + 4, unit - 2, 28, blk[0] === 'setup' ? 'var(--chart-muted)' : 'var(--accent)');
          if (unit > 24) b += txt(x + unit / 2, y + 22, blk[1], 'text-anchor="middle" font-size="9.5" fill="var(--paper)"');
        });
        b += txt(X0 + row[1].length * unit + 6, y + 22, row[1].length + ' RTT' + (r === 2 && n > 0 ? ' (all ' + n + ' image requests in one RTT)' : ''), 'font-size="12" font-weight="700" fill="var(--ink)"');
      });
      const y2 = 34 + R.length * 46;
      b += rect(X0, y2, 14, 12, 'var(--chart-muted)') + txt(X0 + 20, y2 + 11, 'TCP setup (1 RTT)', 'font-size="11.5" fill="var(--ink-2)"');
      b += rect(X0 + 160, y2, 14, 12, 'var(--accent)') + txt(X0 + 180, y2 + 11, 'request/response (1 RTT)', 'font-size="11.5" fill="var(--ink-2)"');
      ui.stage.innerHTML = svg(W, y2 + 22, b, 'RTT timelines for three HTTP connection strategies');
      const t = R.map(r => r[1].length);
      ui.readout.textContent = (n + 1) + ' objects. Non-persistent: ' + t[0] + ' RTT = ' + t[0] * rtt + ' ms. Persistent: ' + t[1] + ' RTT = ' + t[1] * rtt + ' ms (saves ' + n + ' setup RTTs). Pipelined: ' + t[2] + ' RTT = ' + t[2] * rtt + ' ms.';
    }
    slider(ui.controls, 'Images n =', 0, 10, n, v => { n = v; render(); });
    slider(ui.controls, 'RTT =', 10, 200, rtt, v => { rtt = v; render(); }, v => v + ' ms');
    render();
  }

  /* =====================================================================
     4. Head-of-line blocking: HTTP/1.1, HTTP/2, HTTP/3
     ===================================================================== */
  function hol(root) {
    const ui = shell(root, 'One large object, three small ones', 'O1 is a video (8 frames); O2–O4 are small (1 frame each). Each slot is one frame on the wire.');
    let mode = 'h1', s = 0;
    function sched() {
      if (mode === 'h1') return [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3].map(o => ({ o: o }));
      const base = [0, 1, 2, 3, 0, 0, 0, 0, 0, 0, 0].map(o => ({ o: o }));
      if (mode === 'h2') return base;
      base[1] = { o: 1, lost: true };
      base.splice(5, 0, { o: 1, re: true });
      return base;
    }
    function deliveries(sc) {
      /* returns per-slot list of objects whose last frame becomes deliverable at that slot */
      const need = [0, 0, 0, 0]; sc.forEach(f => { if (!f.lost) need[f.o]++; });
      const done = [null, null, null, null], got = [0, 0, 0, 0];
      const tcpOrdered = mode === 'h1' || mode === 'h2' || mode === 'h2loss';
      let blockedUntil = -1;
      if (tcpOrdered) {
        const lostAt = sc.findIndex(f => f.lost);
        if (lostAt >= 0) blockedUntil = sc.findIndex(f => f.re);
      }
      sc.forEach((f, i) => {
        if (f.lost) return;
        got[f.o]++;
        if (got[f.o] === need[f.o]) {
          let at = i;
          if (blockedUntil >= 0 && i > sc.findIndex(x => x.lost) && i < blockedUntil) at = blockedUntil;
          done[f.o] = at;
        }
      });
      return done;
    }
    function render() {
      const sc = sched(), done = deliveries(sc), W = 680, X0 = 96, cw = Math.min(40, (W - X0 - 200) / sc.length);
      let b = '';
      b += txt(10, 46, 'on the wire', 'font-size="12" fill="var(--ink-2)"');
      sc.forEach((f, i) => {
        const x = X0 + i * cw, vis = i < s;
        b += txt(x + cw / 2, 18, String(i + 1), 'text-anchor="middle" font-size="11" fill="var(--ink-2)"');
        b += '<rect x="' + (x + 2) + '" y="26" width="' + (cw - 4) + '" height="30" rx="5" fill="' + (vis ? tc(f.o) : 'var(--rule)') + '" opacity="' + (vis && f.lost ? 0.35 : 1) + '"/>';
        if (vis) b += txt(x + cw / 2, 46, 'O' + (f.o + 1) + (f.re ? '↻' : ''), 'text-anchor="middle" font-weight="700" font-size="12" fill="var(--paper)"');
        if (vis && f.lost) b += txt(x + cw / 2, 72, 'lost', 'text-anchor="middle" font-size="11" fill="var(--bad)" font-weight="700"');
      });
      [0, 1, 2, 3].forEach(o => {
        const y = 92 + o * 26, at = done[o];
        b += txt(10, y + 13, 'O' + (o + 1), 'font-weight="700" fill="' + tc(o) + '"');
        if (at !== null && at < s) {
          b += '<line x1="' + X0 + '" x2="' + (X0 + (at + 1) * cw) + '" y1="' + (y + 9) + '" y2="' + (y + 9) + '" stroke="' + tc(o) + '" stroke-width="6" stroke-linecap="round"/>';
          b += txt(X0 + (at + 1) * cw + 8, y + 13, 'delivered after slot ' + (at + 1), 'font-size="12" fill="var(--ink)"');
        } else {
          b += txt(X0, y + 13, 'waiting…', 'font-size="12" fill="var(--ink-2)"');
        }
      });
      ui.stage.innerHTML = svg(W, 196, b, 'Frames sent per slot and when each object is delivered');
      const msg = {
        h1: 'HTTP/1.1 pipelining: responses come back in request order, so O2–O4 wait behind all of O1 (head-of-line blocking).',
        h2: 'HTTP/2: objects are split into frames and interleaved, so O2–O4 finish by slot 4 and O1 is only slightly delayed.',
        h2loss: 'HTTP/2 over TCP with a lost segment: TCP delivers bytes in order, so O3 and O4 sit in the buffer until the retransmission arrives. Every stream stalls.',
        h3loss: 'HTTP/3 over QUIC with the same loss: streams are independent, so only O2 waits for its retransmission; O3 and O4 are delivered on arrival.'
      }[mode];
      ui.readout.textContent = s < sc.length ? 'Slot ' + s + ' of ' + sc.length + '. ' + (s ? '' : 'Press Play.') : msg;
    }
    modes(ui.modes, [['h1', 'HTTP/1.1'], ['h2', 'HTTP/2'], ['h2loss', 'HTTP/2 + one loss'], ['h3loss', 'HTTP/3 + one loss']], mode, v => { mode = v; s = 0; ctl.stop(); render(); });
    const ctl = transport(ui.controls, () => { const n = sched().length; if (s >= n) return false; s++; render(); return s < n; }, () => { s = 0; render(); }, 450);
    render();
  }

  /* =====================================================================
     5. Demultiplexing: UDP 2-tuple vs TCP 4-tuple
     ===================================================================== */
  function demux(root) {
    const ui = shell(root, 'Which socket gets this segment?', 'Host B\'s transport layer picks a socket using header fields. Choose a protocol, then a segment.');
    const CASES = {
      udp: {
        sockets: [
          { name: 'P3: UDP socket', key: 'B, 6428' },
          { name: 'P4: UDP socket (DNS)', key: 'B, 53' }
        ],
        segs: [
          { label: 'A:9157 → B:6428', f: ['A', 9157, 'B', 6428], to: 0, why: 'UDP looks only at (destination IP, destination port) = (B, 6428), so it goes to P3. The source (A, 9157) is just the return address.' },
          { label: 'C:5775 → B:6428', f: ['C', 5775, 'B', 6428], to: 0, why: 'Different source, same destination (B, 6428): the same socket P3. Every client of this UDP server shares one socket.' },
          { label: 'A:9157 → B:53', f: ['A', 9157, 'B', 53], to: 1, why: 'Destination port 53 picks the DNS socket P4. Same host, different port, different process.' },
          { label: 'C:5775 → B:7000', f: ['C', 5775, 'B', 7000], to: -1, why: 'No socket is bound to port 7000. The datagram reached the right host, but no application receives it.' }
        ]
      },
      tcp: {
        sockets: [
          { name: 'P1: listening socket', key: '*, *, B, 80' },
          { name: 'P4: connection', key: 'A, 9157, B, 80' },
          { name: 'P5: connection', key: 'C, 5775, B, 80' },
          { name: 'P6: connection', key: 'C, 9157, B, 80' }
        ],
        segs: [
          { label: 'A:9157 → B:80', f: ['A', 9157, 'B', 80], to: 1, why: 'All four values match P4\'s connection, so the data goes to P4.' },
          { label: 'C:9157 → B:80', f: ['C', 9157, 'B', 80], to: 3, why: 'Same source port as A\'s connection, but source IP C. The four-tuple matches P6, not P4.' },
          { label: 'A:5775 → B:80', f: ['A', 5775, 'B', 80], to: -1, why: 'Source IP A matches P4 and source port 5775 matches P5, but TCP can\'t mix values from different connections. No connection matches all four.' },
          { label: 'D:4242 → B:80 (connection request)', f: ['D', 4242, 'B', 80], to: 0, why: 'A connection-establishment request goes to the listening socket. accept() then creates a new connection socket identified by (D, 4242, B, 80).' }
        ]
      }
    };
    let proto = 'udp', pick = 0, segGroup = null;
    function render() {
      const c = CASES[proto], seg = c.segs[pick], W = 680, H = 60 + c.sockets.length * 52;
      const id = 'dm' + uid;
      let b = arrowDefs(id, 'var(--accent)');
      const fields = proto === 'udp' ? ['src IP', 'src port', 'dst IP', 'dst port'] : ['src IP', 'src port', 'dst IP', 'dst port'];
      const used = proto === 'udp' ? [false, false, true, true] : [true, true, true, true];
      b += txt(14, 22, 'Arriving ' + proto.toUpperCase() + ' segment', 'font-size="12" fill="var(--ink-2)"');
      fields.forEach((f, i) => {
        const y = 32 + i * 34;
        b += '<rect x="14" y="' + y + '" width="190" height="28" rx="5" fill="' + (used[i] ? 'var(--accent-soft)' : 'var(--paper)') + '" stroke="' + (used[i] ? 'var(--accent)' : 'var(--rule)') + '"/>';
        b += txt(24, y + 18, f, 'font-size="12" fill="var(--ink-2)"') + txt(194, y + 18, String(seg.f[i]), 'text-anchor="end" font-family="var(--mono)" font-weight="700" fill="var(--ink)"');
      });
      b += txt(14, 32 + 4 * 34 + 14, used[0] ? 'TCP uses all four fields' : 'UDP uses only the shaded two', 'font-size="11.5" fill="var(--accent)"');
      c.sockets.forEach((so, i) => {
        const y = 30 + i * 52, on = i === seg.to;
        b += '<rect x="420" y="' + y + '" width="246" height="42" rx="8" fill="' + (on ? 'var(--ok-soft)' : 'var(--paper)') + '" stroke="' + (on ? 'var(--ok)' : 'var(--rule)') + '" stroke-width="' + (on ? 2 : 1) + '"/>';
        b += txt(432, y + 17, so.name, 'font-size="12.5" font-weight="700" fill="var(--ink)"');
        b += txt(432, y + 34, '(' + so.key + ')', 'font-size="12" font-family="var(--mono)" fill="var(--ink-2)"');
        if (on) b += '<line x1="210" y1="96" x2="414" y2="' + (y + 21) + '" stroke="var(--accent)" stroke-width="2.5" marker-end="url(#' + id + ')"/>';
      });
      if (seg.to < 0) b += txt(312, 92, 'no match', 'text-anchor="middle" font-weight="700" fill="var(--bad)"');
      ui.stage.innerHTML = svg(W, Math.max(H, 200), b, 'Segment header fields and host B\'s sockets');
      ui.readout.textContent = seg.why;
    }
    function buildSegs() {
      if (segGroup) segGroup.remove();
      segGroup = modes(ui.controls, CASES[proto].segs.map((sg, i) => [i, sg.label]), pick, v => { pick = v; render(); });
    }
    modes(ui.modes, [['udp', 'UDP: (dst IP, dst port)'], ['tcp', 'TCP: four-tuple']], proto, v => { proto = v; pick = 0; buildSegs(); render(); });
    buildSegs();
    render();
  }

  /* =====================================================================
     6. UDP checksum calculator
     ===================================================================== */
  function checksum(root) {
    const ui = shell(root, 'The UDP checksum, step by step', 'One\'s complement sum of 16-bit words with wraparound, then flip every bit.');
    const SETS = {
      lecture: ['0110011001100000', '0101010101010101', '1000111100001100'],
      two: ['1010101111001101', '0110010011100011']
    };
    let set = 'lecture', err = 'none';
    const bin = v => v.toString(2).padStart(16, '0');
    const add = (a, b) => { const s = a + b; return { raw: s, wrapped: (s & 0xffff) + (s >>> 16) }; };
    function sumWords(ws) {
      let acc = 0; const steps = [];
      ws.forEach((w, i) => {
        if (i === 0) { acc = w; return; }
        const r = add(acc, w);
        steps.push({ w: w, raw: r.raw, out: r.wrapped });
        acc = r.wrapped;
      });
      return { total: acc, steps: steps };
    }
    function received(ws) {
      const out = ws.slice();
      if (err === 'one') out[0] ^= (1 << 3);
      if (err === 'two') {
        for (let p = 0; p < 16; p++) {
          if (!((out[0] >> p) & 1) && ((out[1] >> p) & 1)) { out[0] |= 1 << p; out[1] &= ~(1 << p); break; }
        }
      }
      return out;
    }
    function render() {
      const ws = SETS[set].map(s => parseInt(s, 2));
      const snd = sumWords(ws), cks = (~snd.total) & 0xffff;
      let h = '<div class="ck"><div class="ck-col"><div class="ck-h">Sender</div>';
      h += '<div class="ck-row"><span>word 1</span><code>' + bin(ws[0]) + '</code></div>';
      snd.steps.forEach((st, i) => {
        h += '<div class="ck-row"><span>+ word ' + (i + 2) + '</span><code>' + bin(st.w) + '</code></div>';
        if (st.raw > 0xffff) h += '<div class="ck-row ck-note"><span>overflow</span><code>1 ' + bin(st.raw & 0xffff) + '</code></div><div class="ck-row ck-note"><span>wrap carry</span><code>' + bin(st.out) + '</code></div>';
        else h += '<div class="ck-row ck-note"><span>sum</span><code>' + bin(st.out) + '</code></div>';
      });
      h += '<div class="ck-row ck-total"><span>checksum (flip bits)</span><code>' + bin(cks) + '</code></div></div>';
      const rx = received(ws), all = rx.concat([cks]);
      const rs = sumWords(all).total, ok = rs === 0xffff;
      h += '<div class="ck-col"><div class="ck-h">Receiver</div>';
      rx.forEach((w, i) => {
        const changed = w !== ws[i];
        h += '<div class="ck-row' + (changed ? ' ck-bad' : '') + '"><span>word ' + (i + 1) + (changed ? ' (changed)' : '') + '</span><code>' + bin(w) + '</code></div>';
      });
      h += '<div class="ck-row"><span>checksum</span><code>' + bin(cks) + '</code></div>';
      h += '<div class="ck-row ck-total"><span>sum of all</span><code>' + bin(rs) + '</code></div>';
      h += '<div class="ck-verdict ' + (ok ? 'ok' : 'no') + '">' + (ok ? 'All 1s: no error detected' : 'Not all 1s: error detected, segment discarded') + '</div></div></div>';
      ui.stage.innerHTML = h;
      ui.readout.textContent = err === 'none' ? 'No errors in transit: words plus checksum add up to sixteen 1s.'
        : err === 'one' ? 'One bit of word 1 flipped. The sum changes, so the receiver sees a 0 and detects the error.'
        : (ok ? 'Two compensating flips in the same bit position: word 1 gained what word 2 lost. The sum is unchanged, so the error goes undetected. This is why the checksum is called weak.'
              : 'These words have no position where a compensating flip is possible.');
    }
    modes(ui.modes, [['lecture', 'Lecture example (3 words)'], ['two', 'Two-word example']], set, v => { set = v; render(); });
    modes(ui.controls, [['none', 'No errors'], ['one', 'Flip one bit'], ['two', 'Flip two compensating bits']], err, v => { err = v; render(); });
    render();
  }

  /* =====================================================================
     7. rdt3.0 (alternating-bit protocol) scenarios
     ===================================================================== */
  function rdt3(root) {
    const ui = shell(root, 'rdt3.0 in operation', 'The four textbook cases. Time runs downward; each step adds one packet.');
    /* [label, from 's'|'r', t0, t1, lost, senderNote, receiverNote] */
    const SC = {
      none: { msgs: [
        ['pkt0', 's', 0, 1, false, 'send pkt0', 'rcv pkt0, send ack0'],
        ['ack0', 'r', 1, 2, false, 'rcv ack0, send pkt1', ''],
        ['pkt1', 's', 2, 3, false, '', 'rcv pkt1, send ack1'],
        ['ack1', 'r', 3, 4, false, 'rcv ack1, send pkt0', ''],
        ['pkt0', 's', 4, 5, false, '', 'rcv pkt0, send ack0'],
        ['ack0', 'r', 5, 6, false, 'rcv ack0', '']],
        timers: [], end: 'No loss: each packet is ACKed and the sender alternates 0, 1, 0.' },
      pkt: { msgs: [
        ['pkt0', 's', 0, 1, false, 'send pkt0', 'rcv pkt0, send ack0'],
        ['ack0', 'r', 1, 2, false, 'rcv ack0, send pkt1', ''],
        ['pkt1', 's', 2, 2.7, true, '', ''],
        ['pkt1', 's', 4.4, 5.4, false, 'timeout, resend pkt1', 'rcv pkt1, send ack1'],
        ['ack1', 'r', 5.4, 6.4, false, 'rcv ack1, send pkt0', ''],
        ['pkt0', 's', 6.4, 7.4, false, '', 'rcv pkt0, send ack0']],
        timers: [[2, 4.4]], end: 'pkt1 was lost; the timer expired and the sender retransmitted the same pkt1.' },
      ack: { msgs: [
        ['pkt0', 's', 0, 1, false, 'send pkt0', 'rcv pkt0, send ack0'],
        ['ack0', 'r', 1, 2, false, 'rcv ack0, send pkt1', ''],
        ['pkt1', 's', 2, 3, false, '', 'rcv pkt1, send ack1'],
        ['ack1', 'r', 3, 3.7, true, '', ''],
        ['pkt1', 's', 4.4, 5.4, false, 'timeout, resend pkt1', 'rcv pkt1 (duplicate), send ack1'],
        ['ack1', 'r', 5.4, 6.4, false, 'rcv ack1, send pkt0', ''],
        ['pkt0', 's', 6.4, 7.4, false, '', 'rcv pkt0, send ack0']],
        timers: [[2, 4.4]], end: 'The ACK was lost. The receiver gets pkt1 twice, recognizes the repeated sequence number, and re-ACKs without delivering it again.' },
      early: { msgs: [
        ['pkt0', 's', 0, 1, false, 'send pkt0', 'rcv pkt0, send ack0'],
        ['ack0', 'r', 1, 2, false, 'rcv ack0, send pkt1', ''],
        ['pkt1', 's', 2, 3, false, '', 'rcv pkt1, send ack1'],
        ['ack1', 'r', 3, 4.9, false, '', ''],
        ['pkt1', 's', 4.3, 5.3, false, 'timeout, resend pkt1', 'rcv pkt1 (duplicate), send ack1'],
        ['pkt0', 's', 4.9, 5.9, false, 'rcv ack1, send pkt0', 'rcv pkt0, send ack0'],
        ['ack1', 'r', 5.3, 6.4, false, 'rcv ack1 (ignore)', ''],
        ['ack0', 'r', 5.9, 7.0, false, 'rcv ack0', '']],
        timers: [[2, 4.3]], end: 'Premature timeout: the ACK was only slow. The duplicate pkt1 is discarded by the receiver and the extra ack1 is ignored by the sender. Correct, just wasteful.' }
    };
    let mode = 'pkt', s = 0;
    const id = 'rdt' + (++uid);
    function render() {
      const sc = SC[mode], W = 680, XS = 250, XR = 430, Y0 = 40, U = 44;
      const tmax = Math.max.apply(null, sc.msgs.map(m => m[3])) + 0.6;
      const yAt = t => Y0 + t * U;
      let b = arrowDefs(id, 'var(--accent)') + arrowDefs(id + 'k', 'var(--ok)');
      b += txt(XS, 22, 'sender', 'text-anchor="middle" font-weight="700" fill="var(--ink)"') + txt(XR, 22, 'receiver', 'text-anchor="middle" font-weight="700" fill="var(--ink)"');
      b += '<line x1="' + XS + '" x2="' + XS + '" y1="' + Y0 + '" y2="' + yAt(tmax) + '" stroke="var(--ink-2)" stroke-width="2"/>';
      b += '<line x1="' + XR + '" x2="' + XR + '" y1="' + Y0 + '" y2="' + yAt(tmax) + '" stroke="var(--ink-2)" stroke-width="2"/>';
      const shown = sc.msgs.slice(0, s);
      sc.timers.forEach(tm => {
        const vis = shown.some(m => m[2] >= tm[1] - 0.01);
        if (!vis) return;
        b += '<line x1="' + (XS - 12) + '" x2="' + (XS - 12) + '" y1="' + yAt(tm[0]) + '" y2="' + yAt(tm[1]) + '" stroke="var(--t3)" stroke-width="3"/>';
        b += txt(XS - 18, yAt((tm[0] + tm[1]) / 2) + 4, 'timer', 'text-anchor="end" font-size="11" fill="var(--t3)" font-weight="700"');
      });
      shown.forEach((m, k) => {
        const fromS = m[1] === 's', x1 = fromS ? XS : XR, x2full = fromS ? XR : XS;
        const frac = m[4] ? 0.55 : 1, x2 = x1 + (x2full - x1) * frac, y1 = yAt(m[2]), y2 = y1 + (yAt(m[3]) - y1) * (m[4] ? 1 : 1);
        const col = fromS ? 'var(--accent)' : 'var(--ok)', cur = k === s - 1;
        b += '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + col + '" stroke-width="' + (cur ? 2.8 : 1.6) + '"' + (m[4] ? '' : ' marker-end="url(#' + id + (fromS ? '' : 'k') + ')"') + '/>';
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        b += txt(mx, my - 5, m[0], 'text-anchor="middle" font-size="12" font-weight="700" font-family="var(--mono)" fill="' + col + '"');
        if (m[4]) b += txt(x2 + 4, y2 + 5, '✕ loss', 'font-size="12" font-weight="700" fill="var(--bad)"');
        if (m[5]) b += txt(XS - 20, (fromS ? y1 : y2) + 4, m[5], 'text-anchor="end" font-size="11.5" fill="var(--ink)"');
        if (m[6]) b += txt(XR + 10, (fromS ? y2 : y1) + 4, m[6], 'font-size="11.5" fill="var(--ink)"');
      });
      ui.stage.innerHTML = svg(W, yAt(tmax) + 10, b, 'Sender-receiver timeline for rdt3.0');
      ui.readout.textContent = s === 0 ? 'Press Play or Step.' : s < sc.msgs.length ? 'Packet ' + s + ' of ' + sc.msgs.length + '.' : sc.end;
    }
    modes(ui.modes, [['none', 'No loss'], ['pkt', 'Packet lost'], ['ack', 'ACK lost'], ['early', 'Premature timeout']], mode, v => { mode = v; s = 0; ctl.stop(); render(); });
    const ctl = transport(ui.controls, () => { const n = SC[mode].msgs.length; if (s >= n) return false; s++; render(); return s < n; }, () => { s = 0; render(); }, 1100);
    render();
  }

  /* =====================================================================
     8. Sender utilization: stop-and-wait vs pipelining
     ===================================================================== */
  function util(root) {
    const ui = shell(root, 'Sender utilization', '<code>U = N·(L/R) / (RTT + L/R)</code>, capped at 1. N = 1 is stop-and-wait.');
    let Lbytes = 1000, R = 1e9, rtt = 30, nPos = 0;
    const nOf = p => Math.max(1, Math.round(Math.pow(10, p / 25)));
    const fmtRate = r => r >= 1e9 ? (r / 1e9) + ' Gbps' : r >= 1e6 ? (r / 1e6) + ' Mbps' : (r / 1e3) + ' kbps';
    function fmtBits(bps) {
      if (bps >= 1e9) return (bps / 1e9).toFixed(2) + ' Gbps';
      if (bps >= 1e6) return (bps / 1e6).toFixed(2) + ' Mbps';
      return (bps / 1e3).toFixed(1) + ' kbps';
    }
    function render() {
      const L = Lbytes * 8, trans = L / R * 1000, N = nOf(nPos);
      const U = Math.min(1, N * trans / (rtt + trans));
      const full = Math.ceil((rtt + trans) / trans);
      const W = 680;
      let b = '';
      b += txt(14, 22, 'Fraction of time the sender is transmitting', 'font-size="12" fill="var(--ink-2)"');
      b += '<rect x="14" y="32" width="652" height="26" rx="6" fill="var(--rule)"/>';
      b += '<rect x="14" y="32" width="' + Math.max(2, 652 * U) + '" height="26" rx="6" fill="var(--accent)"/>';
      b += txt(14, 82, 'U = ' + (U < 0.001 ? U.toExponential(2) : U.toFixed(U < 0.1 ? 4 : 3)) + '  ·  throughput ≈ ' + fmtBits(U * R) + ' of ' + fmtRate(R), 'font-size="14" font-weight="700" fill="var(--ink)"');
      ui.stage.innerHTML = svg(W, 96, b, 'Utilization bar');
      ui.readout.textContent = 'L/R = ' + (trans < 0.01 ? (trans * 1000).toFixed(2) + ' μs' : trans.toFixed(3) + ' ms') + ', RTT = ' + rtt + ' ms, N = ' + N +
        '. U = ' + N + ' × ' + trans.toFixed(4) + ' / (' + rtt + ' + ' + trans.toFixed(4) + '). To keep the sender busy you need about ' + full.toLocaleString() + ' packets in flight.';
    }
    modes(ui.modes, [[1e7, '10 Mbps'], [1e8, '100 Mbps'], [1e9, '1 Gbps'], [1e10, '10 Gbps']], R, v => { R = v; render(); });
    slider(ui.controls, 'Packet L =', 1, 12, 1, v => { Lbytes = v * 1000; render(); }, v => (v * 1000).toLocaleString() + ' bytes');
    slider(ui.controls, 'RTT =', 1, 100, rtt, v => { rtt = v; render(); }, v => v + ' ms');
    slider(ui.controls, 'Window N =', 0, 100, 0, v => { nPos = v; render(); }, v => nOf(v).toLocaleString() + (nOf(v) === 1 ? ' packet' : ' packets'));
    render();
  }

  /* =====================================================================
     9. Go-Back-N vs Selective Repeat with one lost packet
     ===================================================================== */
  function gbnsr(root) {
    const ui = shell(root, 'Go-Back-N vs Selective Repeat', 'Window N = 4. Packet 2 is lost; everything else arrives.');
    /* snapshot: base, sent (highest sent+1), acked (SR individual), delivered (rcv), buffered, retx, text */
    const G = [
      { base: 0, next: 0, acked: [], del: [], buf: [], retx: 0, t: 'Start. The window covers 0–3; nothing is sent yet.' },
      { base: 0, next: 4, acked: [], del: [], buf: [], retx: 0, t: 'Send pkt0, pkt1, pkt2 (lost on the way) and pkt3. The window is full.' },
      { base: 0, next: 4, acked: [], del: [0], buf: [], retx: 0, t: 'Receiver gets pkt0: in order, so it delivers it and sends ack0.' },
      { base: 1, next: 5, acked: [], del: [0], buf: [], retx: 0, t: 'Sender gets ack0: the window slides to 1–4, so it sends pkt4.' },
      { base: 1, next: 5, acked: [], del: [0, 1], buf: [], retx: 0, t: 'Receiver gets pkt1: delivers it and sends ack1.' },
      { base: 2, next: 6, acked: [], del: [0, 1], buf: [], retx: 0, t: 'Sender gets ack1: the window slides to 2–5, so it sends pkt5.' },
      { base: 2, next: 6, acked: [], del: [0, 1], buf: [], retx: 0, t: 'Receiver gets pkt3, pkt4, pkt5: out of order (it expects 2). It discards each one and re-sends ack1.' },
      { base: 2, next: 6, acked: [], del: [0, 1], buf: [], retx: 0, t: 'Sender gets three duplicate ack1s and ignores them. Its single timer (for pkt2, the oldest unACKed) keeps running.' },
      { base: 2, next: 6, acked: [], del: [0, 1], buf: [], retx: 4, t: 'Timeout: go back and resend pkt2, pkt3, pkt4 and pkt5 (4 retransmissions, 3 of them already received once).' },
      { base: 6, next: 6, acked: [], del: [0, 1, 2, 3, 4, 5], buf: [], retx: 4, t: 'Receiver delivers 2, 3, 4, 5 in order; cumulative ack5 slides the sender window to 6–9.' }
    ];
    const SR = [
      { base: 0, next: 0, acked: [], del: [], buf: [], retx: 0, t: 'Start. The window covers 0–3; nothing is sent yet.' },
      { base: 0, next: 4, acked: [], del: [], buf: [], retx: 0, t: 'Send pkt0, pkt1, pkt2 (lost on the way) and pkt3. Each has its own timer.' },
      { base: 0, next: 4, acked: [], del: [0], buf: [], retx: 0, t: 'Receiver gets pkt0: delivers it and sends ack0.' },
      { base: 1, next: 5, acked: [0], del: [0], buf: [], retx: 0, t: 'Sender gets ack0: base was ACKed, so the window slides to 1–4 and it sends pkt4.' },
      { base: 1, next: 5, acked: [0], del: [0, 1], buf: [], retx: 0, t: 'Receiver gets pkt1: delivers it and sends ack1.' },
      { base: 2, next: 6, acked: [0, 1], del: [0, 1], buf: [], retx: 0, t: 'Sender gets ack1: the window slides to 2–5 and it sends pkt5.' },
      { base: 2, next: 6, acked: [0, 1], del: [0, 1], buf: [3, 4, 5], retx: 0, t: 'Receiver gets pkt3, pkt4, pkt5: inside its window, so it buffers each one and sends ack3, ack4, ack5.' },
      { base: 2, next: 6, acked: [0, 1, 3, 4, 5], del: [0, 1], buf: [3, 4, 5], retx: 0, t: 'Sender marks 3, 4, 5 as ACKed. pkt2 is still unACKed, so the window stays at 2–5.' },
      { base: 2, next: 6, acked: [0, 1, 3, 4, 5], del: [0, 1], buf: [3, 4, 5], retx: 1, t: 'pkt2\'s own timer expires: resend only pkt2 (1 retransmission).' },
      { base: 6, next: 6, acked: [0, 1, 2, 3, 4, 5], del: [0, 1, 2, 3, 4, 5], buf: [], retx: 1, t: 'Receiver gets pkt2, delivers 2 plus buffered 3–5, sends ack2. When ack2 arrives the sender window jumps to 6–9.' }
    ];
    let mode = 'gbn', s = 0;
    const steps = () => (mode === 'gbn' ? G : SR);
    function render() {
      const st = steps()[s], W = 680, X0 = 96, cw = 54, n = 10;
      let b = '';
      const row = (y, label) => txt(10, y + 22, label, 'font-weight="700" fill="var(--ink)"');
      b += row(30, 'sender');
      for (let i = 0; i < n; i++) {
        const x = X0 + i * cw;
        const ackedSR = st.acked.indexOf(i) >= 0;
        const acked = mode === 'gbn' ? i < st.base : ackedSR;
        const sent = i < st.next;
        const inWin = i >= st.base && i < st.base + 4;
        const fill = acked ? 'var(--ok)' : sent ? 'var(--t3)' : inWin ? 'var(--accent-soft)' : 'var(--paper)';
        b += '<rect x="' + (x + 2) + '" y="30" width="' + (cw - 4) + '" height="34" rx="5" fill="' + fill + '" stroke="' + (inWin ? 'var(--accent)' : 'var(--rule)') + '"/>';
        b += txt(x + cw / 2, 52, String(i), 'text-anchor="middle" font-weight="700" fill="' + (acked || sent ? 'var(--paper)' : 'var(--ink-2)') + '"');
        if (i === 2 && s >= 1 && s < 8) b += txt(x + cw / 2, 80, 'lost', 'text-anchor="middle" font-size="11" fill="var(--bad)" font-weight="700"');
      }
      b += '<path d="M' + (X0 + st.base * cw + 2) + ' 24 h' + (4 * cw - 4) + '" stroke="var(--accent)" stroke-width="3"/>';
      b += txt(X0 + st.base * cw + 2, 18, 'window', 'font-size="11" fill="var(--accent)"');
      b += row(100, 'receiver');
      for (let i = 0; i < n; i++) {
        const x = X0 + i * cw, d = st.del.indexOf(i) >= 0, bf = st.buf.indexOf(i) >= 0;
        b += '<rect x="' + (x + 2) + '" y="100" width="' + (cw - 4) + '" height="34" rx="5" fill="' + (d ? 'var(--ok)' : bf ? 'var(--t2)' : 'var(--paper)') + '" stroke="var(--rule)"/>';
        b += txt(x + cw / 2, 122, String(i), 'text-anchor="middle" font-weight="700" fill="' + (d || bf ? 'var(--paper)' : 'var(--ink-2)') + '"');
      }
      const ly = 158;
      [['var(--ok)', 'ACKed / delivered'], ['var(--t3)', 'sent, not ACKed'], ['var(--t2)', 'buffered (SR)'], ['var(--accent-soft)', 'usable, not sent']].forEach((lg, i) => {
        b += rect(X0 + i * 140, ly, 14, 12, lg[0]) + txt(X0 + i * 140 + 20, ly + 11, lg[1], 'font-size="11.5" fill="var(--ink-2)"');
      });
      b += txt(10, ly + 40, 'Retransmissions so far: ' + st.retx, 'font-size="13" font-weight="700" fill="var(--ink)"');
      ui.stage.innerHTML = svg(W, ly + 50, b, 'Sender and receiver sequence numbers');
      ui.readout.textContent = 'Step ' + (s + 1) + ' of ' + steps().length + '. ' + st.t;
    }
    modes(ui.modes, [['gbn', 'Go-Back-N'], ['sr', 'Selective Repeat']], mode, v => { mode = v; s = 0; ctl.stop(); render(); });
    const ctl = transport(ui.controls, () => { const n = steps().length; if (s >= n - 1) return false; s++; render(); return s < n - 1; }, () => { s = 0; render(); }, 1500);
    render();
  }

  const DEMOS = { encap, dns, httpTiming, hol, demux, checksum, rdt3, util, gbnsr };
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.demo[data-demo]').forEach(el => {
      const f = DEMOS[el.getAttribute('data-demo')];
      if (f) f(el);
    });
  });
})();
