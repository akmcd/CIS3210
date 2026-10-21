/* Shared helpers for every page: header/nav, theme, storage, text formatting, shuffling, answer checking. */
(function () {
  'use strict';

  /* ---------- Exam settings: edit these two lines ---------- */
  /* Set the date once you know it, e.g. new Date('2026-10-29T00:00:00-04:00'). Leave null to hide the countdown. */
  const EXAM_DATE = null;
  const EXAM_NAME = 'Midterm';

  const TOPICS = {
    intro: 'Foundations and layering',
    internet: 'Internetworking and Internet structure',
    apps: 'Application architectures and transport services',
    http: 'HTTP, HTTP/2 and HTTP/3',
    dns: 'DNS',
    email: 'Email and SMTP',
    sockets: 'Socket programming',
    transport: 'Multiplexing and demultiplexing',
    udp: 'UDP and the checksum',
    rdt: 'Reliable data transfer: rdt1.0 to rdt3.0',
    pipeline: 'Pipelining, Go-Back-N and Selective Repeat',
    review: 'In-class questions'
  };
  const TOPIC_ORDER = Object.keys(TOPICS);

  /* ---------- Storage (per-browser conveniences only; never required) ---------- */
  const NS = 'cis3210-mt:';
  const store = {
    get(key, fallback) {
      try {
        const raw = window.localStorage.getItem(NS + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { window.localStorage.setItem(NS + key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
    },
    remove(key) {
      try { window.localStorage.removeItem(NS + key); } catch (e) { /* ignore */ }
    }
  };

  /* ---------- Text ---------- */
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  /* Minimal inline markdown: `code` and **bold** on escaped text. */
  function md(s) {
    const parts = String(s).split('`');
    return parts.map((p, i) => {
      if (i % 2 === 1) return '<code>' + esc(p) + '</code>';
      return esc(p).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    }).join('');
  }

  /* ---------- Random ---------- */
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function optionOrder(q) { return shuffle(q.options.map((_, i) => i)); }

  /* ---------- Answers: single choice (answer is a number) or select-all (answer is an array) ---------- */
  function isMulti(q) { return Array.isArray(q.answer); }
  function correctSet(q) { return isMulti(q) ? q.answer.slice().sort() : [q.answer]; }
  /* given: a number (single) or an array of option indices (multi); undefined means blank */
  function isCorrect(q, given) {
    if (given === undefined || given === null) return false;
    if (!isMulti(q)) return given === q.answer;
    const want = correctSet(q), got = given.slice().sort();
    return want.length === got.length && want.every((v, i) => v === got[i]);
  }
  function isRightOption(q, oi) { return correctSet(q).indexOf(oi) >= 0; }
  function answered(given) { return given !== undefined && given !== null && !(Array.isArray(given) && !given.length); }
  function answerText(q, given) {
    if (!answered(given)) return 'No answer';
    const list = Array.isArray(given) ? given.slice().sort() : [given];
    return list.map(i => md(q.options[i])).join('<br>');
  }

  /* Question stem: scenario (context and/or code) first, then the question itself. */
  function stemHTML(q) {
    let h = q.src ? '<p class="q-src">In class: ' + esc(q.src) + '</p>' : '';
    if (q.ctx || q.code) {
      h += '<div class="q-scenario">' + (q.ctx ? '<p>' + md(q.ctx) + '</p>' : '') +
        (q.code ? '<pre><code>' + esc(q.code) + '</code></pre>' : '') + '</div>';
    }
    h += '<div class="q-text">' + md(q.q) + '</div>';
    if (isMulti(q)) h += '<p class="multi-note">Select all that apply.</p>';
    return h;
  }

  const KIND_LABEL = { concept: 'Concept', scenario: 'Scenario', calc: 'Calculation', code: 'Code or trace' };

  /* ---------- Header, nav and theme ---------- */
  const PAGES = [
    ['index.html', 'Home', 'home'],
    ['read.html', 'Read', 'read'],
    ['review.html', 'In-class', 'review'],
    ['knowledge.html', 'Textbook checks', 'knowledge'],
    ['flashcards.html', 'Flashcards', 'flashcards'],
    ['quiz.html', 'Quizzes', 'quiz'],
    ['exam.html', 'Exam', 'exam']
  ];

  function applyTheme(t) {
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
  }
  applyTheme(store.get('theme', null));

  function currentTheme() {
    const set = document.documentElement.getAttribute('data-theme');
    if (set) return set;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function buildHeader() {
    const host = document.getElementById('site-header');
    if (!host) return;
    const page = document.body.getAttribute('data-page');
    const links = PAGES.map(p => '<a href="' + p[0] + '"' + (p[2] === page ? ' aria-current="page"' : '') + '>' + p[1] + '</a>').join('');
    host.className = 'site-header';
    host.innerHTML = '<div class="inner">' +
      '<a class="brand" href="index.html"><span class="brand-mark" aria-hidden="true"><span></span><span></span><span></span><span></span></span>CIS*3210 ' + esc(EXAM_NAME) + '</a>' +
      '<nav class="site-nav" aria-label="Main">' + links + '</nav>' +
      '<button class="theme-toggle" type="button"></button></div>';
    const btn = host.querySelector('.theme-toggle');
    const label = () => { btn.textContent = currentTheme() === 'dark' ? 'Light mode' : 'Dark mode'; };
    label();
    btn.addEventListener('click', () => {
      const next = currentTheme() === 'dark' ? 'light' : 'dark';
      applyTheme(next); store.set('theme', next); label();
    });
  }

  /* Whole days until the exam, or null when no date is set. */
  function daysUntilExam(now) {
    if (!EXAM_DATE) return null;
    const ms = EXAM_DATE.getTime() - (now || new Date()).getTime();
    return Math.ceil(ms / 86400000);
  }

  document.addEventListener('DOMContentLoaded', buildHeader);

  window.Study = {
    TOPICS, TOPIC_ORDER, store, esc, md, shuffle, optionOrder, stemHTML, KIND_LABEL,
    isMulti, isCorrect, isRightOption, correctSet, answered, answerText, daysUntilExam, EXAM_DATE, EXAM_NAME
  };
})();
