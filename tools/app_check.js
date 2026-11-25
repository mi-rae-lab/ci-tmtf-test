// 화면 코드 점검 — 전수 검산 2단계 (참가자용 소리 떨림 검사, Claude 2026-11-24)
// index.html 과 화면 js(protocols · stim · track · app)를 가짜 화면 · 가짜 AudioContext · 빠른 시계(실제의 K 배)로 올려 봄:
//   A 문법      파일마다 · 이어 붙여서(브라우저에서는 고전 스크립트가 한 범위)
//   B DOM id    js 가 찾는 #id 가 index.html 또는 js 가 만드는 틀에 있는지, index.html 안 id 중복
//   C 올리기    처음 화면을 그리는 동안 예외 · 처리 안 된 거부 · 경고창이 없는지, build 해시를 따로 계산한 값과 같은지
//   D 흐름      tools/app_check_scope.js 를 같은 범위에서 돌림 — 준비 · 소리 크기 · 연습 · 측정(듣는 사람 모형) · 멈춤 · 화면 가려짐 ·
//               한 바퀴 더 · 차이 큰 것만 한 번 더 · 결과 · 파일 · 받은 결과 보기 · CSV · 기록 되살리기 · 출력 확인 · 네트워크
//   deno run --allow-read tools/app_check.js        (마지막 줄 ‘판정: 통과/실패’, 실패가 하나라도 있으면 종료 코드 1 — --verbose 면 통과 줄도)
const root = new URL('../', import.meta.url);
const read = f => Deno.readTextFileSync(new URL(f, root));
const readBytes = f => Deno.readFileSync(new URL(f, root));
const html = read('index.html');
const scriptUrls = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m => m[1]);
const scripts = scriptUrls.map(u => u.split('?')[0]);
const fails = [];
let nPass = 0;
const ok = (name, cond, detail = '') => {
  if (cond) nPass++; else fails.push(name);
  if (!cond || Deno.args.includes('--verbose')) console.log(`${cond ? '  통과' : '✗ 실패'} ${name}${detail ? ' — ' + String(detail).slice(0, 500) : ''}`);
};

// ── A 문법
const AF = Object.getPrototypeOf(async function () { }).constructor;
const src = Object.fromEntries(scripts.map(f => [f, read(f)]));
for (const f of scripts) { let e = null; try { new AF(src[f]); } catch (x) { e = x; } ok('문법 ' + f, !e, e && e.message); }
{ let e = null; try { new AF("'use strict';\n" + scripts.map(f => src[f]).join('\n;\n')); } catch (x) { e = x; } ok(`문법: 화면 js ${scripts.length}개 이어 붙임 (전역 이름 겹침 없음)`, !e, e && e.message); }
ok('index.html 이 부르는 js = 앱 파일 목록(protocols · stim · track · app)', JSON.stringify(scripts) === JSON.stringify(['js/protocols.js', 'js/stim.js', 'js/track.js', 'js/app.js']), scripts.join(' '));
{
  const ver = (/const APP_VERSION = '([^ ']+)/.exec(src['js/app.js']) || [])[1];
  const urls = [...scriptUrls, ...[...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map(m => m[1])];
  const bad = urls.filter(u => u.split('?v=')[1] !== ver);
  const listed = (/const APP_FILES = \[([^\]]*)\]/.exec(src['js/app.js']) || [, ''])[1].match(/'([^']+)'/g)?.map(s => s.slice(1, -1)) || [];
  ok(`index.html 의 css · js 주소 ?v= = APP_VERSION 앞 번호(${ver}) — 판을 바꾸면 브라우저가 옛 파일을 쓰지 않게`, !!ver && !bad.length && urls.length === 5, bad.join(' '));
  ok('APP_FILES(build 해시 목록) = index.html · style.css · 화면 js 4개', JSON.stringify(listed) === JSON.stringify(['index.html', 'style.css', ...scripts]), listed.join(' '));
}

// ── B DOM id
const htmlIds = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
const dupIds = htmlIds.filter((x, i, a) => a.indexOf(x) !== i);
ok('index.html 안 id 중복 없음', !dupIds.length, dupIds.join(' '));
const tmplIds = new Set();
for (const f of scripts) for (const m of src[f].matchAll(/\bid="([A-Za-z][\w-]*)"/g)) tmplIds.add(m[1]);
const used = new Map();
for (const f of scripts) for (const m of src[f].matchAll(/\$\$?\(\s*'#([A-Za-z][\w-]*)/g)) used.set(m[1], f);
const missing = [...used.keys()].filter(k => !htmlIds.includes(k) && !tmplIds.has(k));
ok(`js 가 찾는 #id ${used.size}개가 화면(index.html · js 틀)에 있음`, !missing.length, missing.join(' '));

// ── 빠른 시계: performance.now · setTimeout · setInterval 을 K 배로 (가짜 AudioContext 시계도 같은 시계)
const K = 60;
const realNow = performance.now.bind(performance), realST = setTimeout.bind(globalThis), realSI = setInterval.bind(globalThis), realCT = clearTimeout.bind(globalThis), realCI = clearInterval.bind(globalThis);
const p00 = realNow();
const vnow = () => p00 + (realNow() - p00) * K;
Object.defineProperty(performance, 'now', { value: vnow, configurable: true, writable: true });
globalThis.setTimeout = (f, ms = 0, ...a) => realST(f, Math.max(0, (+ms || 0) / K), ...a);
globalThis.setInterval = (f, ms = 0, ...a) => realSI(f, Math.max(1, (+ms || 0) / K), ...a);
globalThis.clearTimeout = id => realCT(id);
globalThis.clearInterval = id => realCI(id);

// ── 작은 가짜 DOM (부모 · 자식 · 선택자 '#id' '.class' 'tag' '[attr]' ':checked' 와 띄어쓰기 자손 · 쉼표)
const VOID = new Set(['input', 'br', 'meta', 'link', 'img', 'hr', 'source', 'area', 'base', 'col', 'embed', 'param', 'track', 'wbr']);
const attrsOf = t => { const a = {}; for (const m of String(t).matchAll(/([\w:-]+)(?:\s*=\s*"([^"]*)")?/g)) a[m[1]] = m[2] ?? ''; return a; };
const camel = s => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const decode = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
class El {
  constructor(tag, a = {}) {
    this.tagName = String(tag).toUpperCase(); this._a = { ...a }; this.children = []; this.parentNode = null;
    this._cls = new Set((a.class || '').split(/\s+/).filter(Boolean));
    this.dataset = {}; for (const [k, v] of Object.entries(a)) if (k.startsWith('data-')) this.dataset[camel(k.slice(5))] = v;
    this.style = {}; this._l = {}; this._text = ''; this._html = null; this._v = null;
    this.hidden = 'hidden' in a; this.disabled = 'disabled' in a; this.checked = 'checked' in a; this.open = 'open' in a;
    this.type = a.type || ''; this.id = a.id || ''; this.files = null; this.href = ''; this.download = '';
    const cls = this._cls;
    this.classList = { add: (...c) => c.forEach(x => cls.add(x)), remove: (...c) => c.forEach(x => cls.delete(x)), contains: c => cls.has(c),
      toggle: (c, f) => { const on = f === undefined ? !cls.has(c) : !!f; if (on) cls.add(c); else cls.delete(c); return on; } };
  }
  get className() { return [...this._cls].join(' '); }
  set className(v) { this._cls.clear(); String(v).split(/\s+/).filter(Boolean).forEach(c => this._cls.add(c)); }
  get value() {
    if (this._v !== null) return this._v;
    if (this.tagName === 'SELECT') { const o = this.querySelectorAll('option'); const s = o.find(x => 'selected' in x._a) || o[0]; return s ? (s._a.value ?? s.textContent) : ''; }
    if (this.tagName === 'OPTION') return this._a.value ?? this.textContent;
    return this._a.value ?? '';
  }
  set value(v) { this._v = v === null || v === undefined ? '' : String(v); }
  get textContent() { return this._text + this.children.map(c => c.textContent).join(''); }
  set textContent(v) { this.children.forEach(c => { c.parentNode = null; }); this.children = []; this._text = String(v ?? ''); this._html = null; }
  get innerHTML() { return this._html ?? ''; }
  set innerHTML(v) { this.children.forEach(c => { c.parentNode = null; }); this.children = []; this._text = ''; this._html = String(v); parseInto(this, this._html); }
  addEventListener(t, f) { (this._l[t] ||= []).push(f); }
  removeEventListener(t, f) { this._l[t] = (this._l[t] || []).filter(x => x !== f); }
  dispatchEvent(e) {
    if (!e.target) e.target = this;
    let stop = false; e.stopPropagation = () => { stop = true; }; e.preventDefault ||= () => { e.defaultPrevented = true; };
    for (let n = this; n && !stop; n = n.parentNode) {
      e.currentTarget = n;
      for (const f of n._l[e.type] || []) f.call(n, e);
      const h = n['on' + e.type]; if (typeof h === 'function') h.call(n, e);
      if (e.type !== 'click' && e.type !== 'keydown') break;   // change · input 은 그 요소에만
    }
    return true;
  }
  click() {
    if (this.disabled) return true;
    if (this.tagName === 'A' && this.download) downloads.push({ name: this.download, blob: blobs.get(this.href) });
    if (this.tagName === 'INPUT' && this.type === 'checkbox') { this.checked = !this.checked; this.dispatchEvent({ type: 'change' }); }
    return this.dispatchEvent({ type: 'click' });
  }
  focus() { } blur() { } select() { document._selected = this; } scrollIntoView() { }
  remove() { if (this.parentNode) { this.parentNode.children = this.parentNode.children.filter(c => c !== this); this.parentNode = null; } }
  appendChild(c) { c.remove(); c.parentNode = this; this.children.push(c); return c; }
  append(...c) { c.forEach(x => this.appendChild(x)); }
  setAttribute(k, v) { this._a[k] = String(v); if (k === 'class') this.className = v; if (k === 'id') this.id = String(v); }
  getAttribute(k) { return this._a[k] ?? null; } removeAttribute(k) { delete this._a[k]; }
  matches(sel) { return parseSel(sel).some(ch => matchChain(this, ch)); }
  closest(sel) { for (let n = this; n; n = n.parentNode) if (n.matches && n.matches(sel)) return n; return null; }
  querySelectorAll(sel) { const ch = parseSel(sel), out = []; walk(this, el => { if (ch.some(c => matchChain(el, c))) out.push(el); }); return out; }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  getBoundingClientRect() { return { x: 0, y: 0, width: 900, height: 300, top: 0, left: 0, right: 900, bottom: 300 }; }
}
function walk(el, f) { for (const c of el.children) { f(c); walk(c, f); } }
function parseInto(parent, h) {
  const re = /<!--[\s\S]*?-->|<!doctype[^>]*>|<\/([a-zA-Z][\w-]*)\s*>|<([a-zA-Z][\w-]*)\b([^>]*?)(\/?)>|([^<]+)/gi;
  const stack = [parent];
  let m;
  while ((m = re.exec(h))) {
    if (m[0].startsWith('<!')) continue;
    if (m[1]) { const t = m[1].toUpperCase(); for (let i = stack.length - 1; i > 0; i--) if (stack[i].tagName === t) { stack.length = i; break; } continue; }
    if (m[2]) {
      const el = new El(m[2], attrsOf(m[3])), top = stack[stack.length - 1];
      el.parentNode = top; top.children.push(el);
      if (!VOID.has(m[2].toLowerCase()) && !m[4]) stack.push(el);
      continue;
    }
    if (m[5]) { const top = stack[stack.length - 1]; if (top.children.length) { const tn = new El('#text'); tn._text = decode(m[5]); tn.parentNode = top; top.children.push(tn); } else top._text += decode(m[5]); }
  }
}
function parseSel(sel) {
  return String(sel).split(',').map(s => s.trim()).filter(Boolean).map(s => s.split(/\s+/).map(part => {
    const c = { tag: null, id: null, classes: [], pseudo: [], attrs: [] };
    for (const m of part.matchAll(/(^[a-zA-Z][\w-]*)|#([\w-]+)|\.([\w-]+)|:([\w-]+)|\[([\w-]+)(?:="([^"]*)")?\]/g)) {
      if (m[1]) c.tag = m[1].toUpperCase(); else if (m[2]) c.id = m[2]; else if (m[3]) c.classes.push(m[3]); else if (m[4]) c.pseudo.push(m[4]); else if (m[5]) c.attrs.push([m[5], m[6] ?? null]);
    }
    return c;
  }));
}
function matchOne(el, c) {
  if (!(el instanceof El) || el.tagName === '#TEXT') return false;
  if (c.tag && el.tagName !== c.tag) return false;
  if (c.id && el.id !== c.id) return false;
  for (const k of c.classes) if (!el._cls.has(k)) return false;
  for (const p of c.pseudo) if (p === 'checked' && !el.checked) return false;
  for (const [k, v] of c.attrs) if (!(k in el._a) || (v !== null && el._a[k] !== v)) return false;
  return true;
}
function matchChain(el, ch) {
  if (!matchOne(el, ch[ch.length - 1])) return false;
  let i = ch.length - 2;
  for (let p = el.parentNode; i >= 0 && p; p = p.parentNode) if (matchOne(p, ch[i])) i--;
  return i < 0;
}
const DOC = new El('#document');
parseInto(DOC, html);
const downloads = [], blobs = new Map(), dialogs = [], rejections = [], calls = [], clip = [];
let blobN = 0;
const docL = {};
const bodyEl = DOC.querySelector('body');
globalThis.document = {
  querySelector: s => DOC.querySelector(s), querySelectorAll: s => DOC.querySelectorAll(s), getElementById: id => DOC.querySelector('#' + id),
  createElement: t => new El(t), createElementNS: (_, t) => new El(t), createTextNode: t => { const n = new El('#text'); n._text = String(t); return n; },
  addEventListener: (t, f) => { (docL[t] ||= []).push(f); }, removeEventListener() { },
  hidden: false, visibilityState: 'visible', title: '', body: bodyEl, documentElement: DOC.querySelector('html'), activeElement: null,
  execCommand: c => { if (c === 'copy' && document._selected) { clip.push({ how: 'execCommand', text: document._selected.value }); return true; } return false; },
};
globalThis.window = globalThis;
const def = (o, k, v) => { try { Object.defineProperty(o, k, { value: v, configurable: true, writable: true }); } catch (e) { console.log('가짜 값을 못 넣음:', k, e.message); } };
const store = new Map();
def(globalThis, 'localStorage', { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear(),
  key: i => [...store.keys()][i] ?? null, get length() { return store.size; } });
def(globalThis, 'location', { search: '?id=P02', hash: '', href: 'https://example.test/ci-tmtf-test/?id=P02', origin: 'https://example.test', pathname: '/ci-tmtf-test/', protocol: 'https:', host: 'example.test', reload() { } });
def(globalThis, 'alert', m => { dialogs.push(['alert', String(m)]); });
def(globalThis, 'confirm', m => { dialogs.push(['confirm', String(m)]); return H.confirmAnswer; });
def(globalThis, 'prompt', () => null);
def(globalThis, 'requestAnimationFrame', f => realST(() => f(vnow()), 16));
def(globalThis, 'cancelAnimationFrame', id => realCT(id));
def(globalThis, 'getComputedStyle', () => ({ getPropertyValue: () => '#888888' }));
def(globalThis, 'screen', { width: 1920, height: 1080 });
def(globalThis, 'devicePixelRatio', 1); def(globalThis, 'innerWidth', 1280); def(globalThis, 'innerHeight', 900);
def(globalThis, 'scrollTo', () => { });
const wins = { beforeunload: [] };
const realAdd = globalThis.addEventListener.bind(globalThis);
def(globalThis, 'addEventListener', (t, f, o) => { if (t === 'beforeunload') wins.beforeunload.push(f); else realAdd(t, f, o); });
try { def(navigator, 'clipboard', { writeText: async t => { clip.push({ how: 'clipboard', text: t }); } }); } catch { }
// 가짜 AudioContext — 소리는 내지 않고 버퍼마다 시작 시각 · 길이 · 표본(마지막 몇 개만)을 적음. 시계는 빠른 시계, suspend 동안 멈춤
const audioLog = [], oscLog = [], ctxs = [];
let nodeN = 0;
class FNode { constructor(c, type) { this.ctx = c; this.type = type; this.id = ++nodeN; this.outs = []; } connect(x) { this.outs.push(x); return x; } disconnect() { this.outs = []; } }
class FSource extends FNode {
  start(t = 0) {
    const e = { ev: 'start', id: this.id, t, dur: this.buffer ? this.buffer.length / this.buffer.sampleRate : null, data: this.buffer ? this.buffer.data : null, at: this.ctx.currentTime };
    audioLog.push(e);
    for (let i = 0; i < audioLog.length - 14; i++) if (audioLog[i].data) audioLog[i].data = null;   // 표본은 마지막 14개만 (메모리)
  }
  stop(t = 0) { audioLog.push({ ev: 'stop', id: this.id, t }); }
}
class FOsc extends FNode {
  constructor(c) { super(c, 'osc'); this.frequency = { value: 440 }; this.tStart = null; this.tStop = null; c._oscs.push(this); }
  start(t = 0) { this.tStart = t; oscLog.push({ ev: 'start', id: this.id, freq: this.frequency.value, t, at: this.ctx.currentTime }); }
  stop(t = 0) { this.tStop = t; oscLog.push({ ev: 'stop', id: this.id, freq: this.frequency.value, t, at: this.ctx.currentTime }); }
  gainVal() {
    let g = 1, cur = this.outs[0];
    const seen = new Set();
    while (cur && !seen.has(cur)) { seen.add(cur); if (cur.type === 'gain' && cur.gain) g *= cur.gain.value; cur = cur.outs[0]; }
    return g;
  }
}
class FakeAudioContext {
  constructor(o = {}) { this.sampleRate = o.sampleRate || 48000; this._t0 = vnow(); this._frozen = null; this._off = 0; this.state = 'running'; this.destination = new FNode(this, 'dest'); this.baseLatency = 0.01; this.outputLatency = 0.02; this.onstatechange = null; this._oscs = []; this._sineCache = new Map(); ctxs.push(this); }
  get currentTime() { return this._frozen !== null ? this._frozen : (vnow() - this._t0) / 1000 - this._off; }
  async resume() { if (this.state !== 'running') { this._off = (vnow() - this._t0) / 1000 - this._frozen; this._frozen = null; this.state = 'running'; if (this.onstatechange) this.onstatechange(); } }
  async suspend() { if (this.state === 'running') { this._frozen = this.currentTime; this.state = 'suspended'; if (this.onstatechange) this.onstatechange(); } }
  createGain() { const n = new FNode(this, 'gain'); n.gain = { value: 1 }; return n; }
  createOscillator() { return new FOsc(this); }
  createAnalyser() {
    const c = this, n = new FNode(c, 'analyser');
    n.fftSize = 2048;
    n.getFloatTimeDomainData = buf => {
      buf.fill(0);
      if (H.forceSilent || c.state !== 'running') return;
      const now = c.currentTime, N = buf.length, fs = c.sampleRate;
      for (const o of c._oscs) {
        if (o.tStart === null || o.tStart > now + 1e-6) continue;
        if (o.tStop !== null && o.tStop <= now + 1e-6) continue;
        const f = o.frequency.value, g = o.gainVal();
        const key = `${N}|${fs}|${f}|${g}`;
        let tbl = c._sineCache.get(key);
        if (!tbl) {
          tbl = new Float32Array(N);
          const w = 2 * Math.PI * f / fs;
          for (let i = 0; i < N; i++) tbl[i] = g * Math.sin(w * i);
          c._sineCache.set(key, tbl);
        }
        for (let i = 0; i < N; i++) buf[i] += tbl[i];
      }
    };
    return n;
  }
  createBufferSource() { const n = new FSource(this, 'buf'); n.buffer = null; n.onended = null; return n; }
  createBuffer(ch, len, fs) { return { numberOfChannels: ch, length: len, sampleRate: fs, data: null, copyToChannel(d) { this.data = new Float32Array(d); } }; }
  getOutputTimestamp() { return { contextTime: this.currentTime, performanceTime: vnow() }; }
}
def(globalThis, 'AudioContext', FakeAudioContext);
URL.createObjectURL = b => { const id = 'blob:check/' + (++blobN); blobs.set(id, b); return id; };
URL.revokeObjectURL = () => { };
globalThis.addEventListener('unhandledrejection', e => { rejections.push(String(e.reason?.stack || e.reason)); e.preventDefault(); });
// 가짜 웹 서버: 앱 파일은 디스크에서 그대로(= build 해시가 실제 파일의 해시), 통과 기록은 시험이 정함
const APP = ['index.html', 'style.css', 'js/protocols.js', 'js/stim.js', 'js/track.js', 'js/app.js'];
const H = {
  ok, K, confirmAnswer: true, forceSilent: false, dialogs, downloads, calls, audioLog, oscLog, ctxs, clip, wins, store, rejections,
  realSetTimeout: realST, realNow, vnow,
  passRecord: null,                  // null = 통과 기록 없음(404), 있으면 검증_통과.json 그대로 ({ last, history })
  override: {},                      // { 'js/app.js': '바뀐 내용' } — 화면을 연 뒤 서버 파일이 바뀐 경우
  cached: {},                        // { 'js/app.js': '옛 내용' } — force-cache 로 읽을 때만(브라우저가 옛 파일을 쓴 경우)
  key: (key, target) => { const e = { type: 'keydown', key, target: target || bodyEl, repeat: false, preventDefault() { e.defaultPrevented = true; } }; for (const f of docL.keydown || []) f(e); return e; },
  docFire: (type, e) => { for (const f of docL[type] || []) f(e); return e; },
  visibility: hidden => { document.hidden = hidden; document.visibilityState = hidden ? 'hidden' : 'visible'; for (const f of docL.visibilitychange || []) f({ type: 'visibilitychange' }); },
  takeDownloads: async () => { await new Promise(r => realST(r, 20)); return downloads.splice(0); },
  parseCsv: t => {
    const rows = []; let row = [], cur = '', q = false;
    t = t.replace(/^﻿/, '');
    for (let i = 0; i < t.length; i++) {
      const c = t[i];
      if (q) { if (c === '"' && t[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else if (c === '"') q = true; else if (c === ',') { row.push(cur); cur = ''; } else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; } else cur += c;
    }
    row.push(cur); rows.push(row);
    return rows;
  },
  sha256: async bytes => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2, '0')).join(''),
  appFiles: APP, fileBytes: readBytes, El,
  // --dump <경로>: 흐름 점검에서 ‘결과 파일 저장’으로 나온 파일을 써 둠 → tools/verify_result.py 가 따로 짠 파이썬으로 다시 만들어 봄 (전수 검산 3단계)
  dump: Deno.args.includes('--dump') ? o => Deno.writeTextFileSync(Deno.args[Deno.args.indexOf('--dump') + 1], JSON.stringify(o)) : null,
};
globalThis.__H = H;
globalThis.fetch = async (url, opt = {}) => {
  let u = decodeURIComponent(String(url));
  const method = (opt.method || 'GET').toUpperCase(), mode = opt.cache || 'default';
  if (/^https?:/.test(u)) { const p = new URL(u).pathname; u = p.endsWith('/') ? 'index.html' : p.split('/').pop(); }   // 화면 주소 = index.html
  calls.push(method + ' ' + u + ' ' + mode);
  u = u.split('?')[0];
  if (method !== 'GET') return new Response('', { status: 405 });
  if (mode === 'force-cache' && u in H.cached) return new Response(H.cached[u], { status: 200 });   // 브라우저 캐시에 남은 옛 파일
  if (u in H.override) return new Response(H.override[u], { status: 200 });
  if (APP.includes(u)) return new Response(readBytes(u), { status: 200 });
  if (u === '검증_통과.json') return H.passRecord ? new Response(JSON.stringify(H.passRecord), { status: 200 }) : new Response('', { status: 404 });
  return new Response('', { status: 404 });
};
let loadErr = null;
const code = "'use strict';\n" + scripts.map(f => `\n// ── ${f} ──\n` + src[f]).join('\n;\n') + '\n;\n' + read('tools/app_check_scope.js');
try { (0, eval)(code); } catch (e) { loadErr = e; }
ok('화면 js 를 모두 올림 (맨 위 코드에서 예외 없음)', !loadErr, loadErr && (loadErr.stack || loadErr.message));
if (!loadErr) {
  try { await globalThis.__scope; } catch (e) { ok('흐름 점검이 끝까지 돎', false, e.stack || e.message); }
}
ok('처리 안 된 거부(unhandled rejection) 없음', !rejections.length, rejections.join(' | '));
console.log(`판정: ${fails.length ? '실패' : '통과'} — ${nPass + fails.length}개 중 ${nPass}개 통과${fails.length ? ' · 실패: ' + fails.slice(0, 8).join(' / ') : ''} (문법 · DOM id · 올리기 · 흐름 · 기록 · 파일)`);
Deno.exit(fails.length ? 1 : 0);
