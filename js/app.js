// 소리 떨림 검사 (TMTF) — 참가자용 화면 · 기록 · 검사 흐름 (Claude, 2026-11-24)
// 자극 · 계단은 js/protocols.js · js/stim.js · js/track.js 를 그대로 씀 (Lean 4 · 따로 짠 파이썬과 대조한 코드 — tools/ · 방법.md).
// 절차는 하나로 고정: protocols.js ‘직접 정하기’ 의 3구간 · 광대역 잡음 · 0.5 s · 쉼 0.5 s · 무작위 변조 위상 · 10 ms 직선 경사 · 흔들기 없음 ·
//   Won 규칙(0 dB 에서 시작, 반전 4번까지 4 dB, 그 뒤 2 dB, 반전 14번 중 마지막 10번 평균) · 0 dB 에서 4번 틀리면 멈춤 · 맞음/틀림 바로 보임.
// 기록은 이 기기 브라우저(localStorage)에만 — 참가자가 ‘결과 파일 저장’을 눌러야 파일로 나감. 서버로 보내는 것은 없음.
'use strict';

const APP_VERSION = '1.0.2 (2026-11-24)';   // 1.0.2: 화면 디자인을 미니멀하고 현대식으로 다듬음
const APP_FILES = ['index.html', 'style.css', 'js/protocols.js', 'js/stim.js', 'js/track.js', 'js/app.js'];   // build 해시 (tools/run_checks.py 와 같은 목록)
const FORMAT = 'ci-tmtf-public';
const STORE_KEY = 'ciTmtf.v1';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const iso = () => new Date().toISOString();
const pct = db => 100 * 10 ** (db / 20);
const fmtPct = p => p >= 10 ? `${Math.round(p)}%` : `${p.toFixed(1)}%`;
// 정답 자리: 32비트 난수 % n (tools/lean/TMTF/Grid.lean — 3구간 치우침 2/(3·2³²))
const randInt = n => { try { return crypto.getRandomValues(new Uint32Array(1))[0] % n; } catch { return Math.floor(Math.random() * n); } };
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = randInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const localTime = t => { try { return new Date(t).toLocaleString('ko-KR'); } catch { return String(t); } };

/* ───────────── 절차 (고정) ───────────── */
const COND = Object.freeze({ proto: 'custom', nAFC: 3, band: 'wide', dur: 0.5, isi: 0.5, proc: 'std', rove: 0, ramp: 'linear', level: null });
const PR = resolveProtocol(COND);
// 와우TMTF 3.3 의 조건 이름과 같은 꼴 — 같은 절차로 잰 기록끼리 맞춰 볼 수 있게
const PROC_KEY = ['직접', PR.nAFC + '구간', PR.band.type === 'wide' ? '광대역' : '와우대역', PR.dur + '초', '쉼' + PR.isi + '초', PR.rove ? '흔들기±' + PR.rove : '흔들기없음',
  `반전${PR.totalRev}·마지막${PR.avgLast}`, PR.rampShape === 'cos2' ? '코사인²경사' : '직선경사'].join('·');
// 첫 소리 앞 무음 — 스트리밍이 쉬다가 깨어날 때 앞부분이 잘리는 것을 막으려고 (AUDITO, Goehring & Carlyon 2026 은 200 ms 권함)
const LEAD_S = 0.25;
const PRACTICE_N = 3;
const DEFAULT_FMS = [10, 50, 100, 150, 200];   // Won 2011 · Park 2015 의 변조 주파수 가운데 다섯
const FM_OK = fmChoices(PR);                   // 링크(?hz=)로 고를 수 있는 변조 주파수 = 와우TMTF 직접 정하기의 칸
const EAR = { L: '왼쪽', R: '오른쪽', B: '양쪽' };
const PATH = { speaker: '컴퓨터·휴대폰 스피커', headphone: '이어폰·헤드폰', wired: '선으로 처리기에 연결', bt: '블루투스로 처리기에 연결', other: '그 밖의 방법' };
const FOCUS = { good: '잘 됨', mid: '보통', bad: '잘 안 됨' };
function snapP(P) {
  return { id: P.id, nAFC: P.nAFC, dur: P.dur, isi: P.isi, rampMs: P.rampMs, rampShape: P.rampShape, band: P.band, phase: P.phase, startDb: P.startDb,
    bigUntil: P.bigUntil, big: P.big, small: P.small, totalRev: P.totalRev, avgLast: P.avgLast, ceiling: P.ceiling, rove: P.rove || 0, leadS: LEAD_S, feedback: !!P.feedback };
}

/* ───────────── 링크로 받는 값 (?id=P02&hz=10,50,100) ───────────── */
const QS = (() => { try { return new URLSearchParams(location.search || ''); } catch { return new URLSearchParams(''); } })();
const cleanCode = s => String(s || '').normalize('NFC').replace(/[^0-9A-Za-z가-힣_-]/g, '').slice(0, 20);
// 하나라도 못 읽으면 통째로 버리고 기본값 (일부만 읽어 엉뚱한 주파수로 재는 일이 없게)
function parseFms(s) {
  if (s === null || s === undefined || String(s).trim() === '') return null;
  const xs = String(s).split(/[\s,;·]+/).filter(Boolean).map(Number);
  if (!xs.length || xs.some(x => !Number.isInteger(x) || !FM_OK.includes(x))) return null;
  const u = [...new Set(xs)].sort((a, b) => a - b);
  return u.length <= 12 ? u : null;
}
const LINK = { code: cleanCode(QS.get('id') ?? QS.get('code') ?? ''), hz: QS.get('hz'), fms: parseFms(QS.get('hz')) };
const PLAN_FMS = LINK.fms || DEFAULT_FMS;
const PRACTICE_FM = Math.min(...PLAN_FMS);
const perTrialS = PR.nAFC * PR.dur + (PR.nAFC - 1) * PR.isi + LEAD_S + 1.5 + 0.9;
const estMin = n => Math.max(5, Math.round(n * 45 * perTrialS / 60 / 5) * 5);

/* ───────────── 기록 (이 기기 브라우저) ───────────── */
let DB = { format: FORMAT, formatVersion: 1, sessions: [], decisions: [] };
const STORE = { ok: true, error: null, blocked: false, moved: null };
function loadStore() {
  let raw = null;
  try { raw = localStorage.getItem(STORE_KEY); } catch (e) { STORE.ok = false; STORE.error = String(e && e.name || e); return; }
  if (!raw) return;
  try {
    const o = JSON.parse(raw);
    if (!o || !Array.isArray(o.sessions)) throw new Error('형식이 다름');
    DB = { ...DB, ...o, sessions: o.sessions, decisions: Array.isArray(o.decisions) ? o.decisions : [] };
  } catch {
    // 읽지 못한 기록은 지우지 않고 다른 이름으로 옮겨 둠 — 옮기지 못하면 덮어쓰지 않도록 저장을 막음
    const k = STORE_KEY + '.unreadable.' + Date.now();
    try { localStorage.setItem(k, raw); STORE.moved = k; } catch { STORE.blocked = true; }
    STORE.error = '전에 저장된 기록을 읽지 못했습니다';
  }
}
function saveStore() {
  if (STORE.blocked) return false;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(DB));
    if (!STORE.ok) { STORE.ok = true; STORE.error = null; renderEnvWarn(); }
    return true;
  } catch (e) { STORE.ok = false; STORE.error = String(e && e.name || e); renderEnvWarn(); return false; }
}
// 화면이 닫혀 끝나지 않은 회기 — 다음에 열 때 끝난 것으로 표시하고, 하던 측정은 버린 측정으로 남김 (2분 안에 고친 회기는 다른 창일 수 있어 그대로)
function closeOrphans() {
  let n = 0;
  for (const s of DB.sessions) {
    if (s.end) continue;
    const last = Date.parse(s.updated || s.start || '') || 0;
    if (Date.now() - last < 120000) continue;
    if (s.current) { s.events.push({ t: iso(), s: null, type: 'track-abandoned', stopVia: 'page-closed', ...s.current }); s.current = null; }
    s.end = s.updated || s.start; s.endReason = '화면이 닫힘 (다음에 열었을 때 발견)'; s.closedFoundAt = iso(); n++;
  }
  if (n) saveStore();
  return n;
}
function logDecision(what, answer, detail = {}) { DB.decisions.push({ id: uid(), at: iso(), what, answer, ...detail }); saveStore(); }

/* ───────────── 프로그램 파일 확인 (build) — 열린 화면이 어떤 코드인지 기록 ─────────────
   처음 열 때 'force-cache' = 이 화면이 실제로 받은 판(브라우저 캐시), 시작할 때 'no-store' = 지금 서버에 있는 판. 파일 주소는 화면이 부른 그대로(?v= 포함).
   1.0.1: 시작을 막는 것은 ‘판 번호(APP_VERSION)가 바뀐 때’ 뿐 — 새 판이 나왔는데 옛 화면이 돌고 있을 때. 파일 지문(해시)만 다르면 막지 않고 어느 파일이
   다른지 회기에 남김. (1.0.0 은 지문이 다르면 막아서, 사용자 크롬에서 시작이 늘 막힘 — 서버는 매번 같은 파일을 주었으므로 그 컴퓨터에서 받은 파일이
   바뀐 것으로 보임, 예: 보안 프로그램이 페이지에 코드를 끼워 넣음. 원인은 확인하지 못함) */
let BUILD_LOAD = null;
async function sha256Hex(buf) { const h = await crypto.subtle.digest('SHA-256', buf); return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join(''); }
function assetUrl(f, mode) {
  if (f === 'index.html') return mode === 'force-cache' ? location.href.split('#')[0] : 'index.html';
  const el = $$('script, link').find(x => String(x.getAttribute('src') || x.getAttribute('href') || '').split('?')[0] === f);
  return el ? (el.getAttribute('src') || el.getAttribute('href')) : f;
}
async function computeBuild(mode = 'no-store') {
  try {
    if (location.protocol === 'file:') return { ok: false, error: 'file', mode };
    if (!(window.crypto && crypto.subtle)) return { ok: false, error: 'no-subtle', mode };
    const files = {};
    let version = null;
    for (const f of APP_FILES) {
      const r = await fetch(assetUrl(f, mode), { cache: mode });
      if (!r.ok) return { ok: false, error: `${f}: ${r.status}`, mode };
      const buf = await r.arrayBuffer();
      files[f] = await sha256Hex(buf);
      if (f === 'js/app.js') version = (/const APP_VERSION = '([^']+)'/.exec(new TextDecoder().decode(buf)) || [])[1] || null;
    }
    const whole = await sha256Hex(new TextEncoder().encode(Object.keys(files).sort().map(k => `${k}:${files[k]}\n`).join('')));
    let rec = null, recErr = null;
    try { const r = await fetch('검증_통과.json', { cache: 'no-store' }); if (r.ok) rec = await r.json(); else recErr = 'http ' + r.status; } catch (e) { recErr = String(e && e.message || e); }
    const verified = rec ? verifyBuild(rec, whole, files) : { status: 'no-record', error: recErr };
    return { ok: true, buildSha256: whole, files, version, verified, passRec: rec, at: iso(), mode };
  } catch (e) { return { ok: false, error: String(e && e.message || e), mode }; }
}
// 통과 기록과 맞대기: 전체 해시가 기록에 있으면 pass, 마지막 통과의 파일과 index.html 만 다르면 pass-code(코드 파일은 검산한 것과 같음 —
// 화면 파일만 오는 길에 바뀐 경우), 그 밖은 not-checked(다른 파일 목록)
function verifyBuild(rec, whole, files) {
  const hist = (rec.history || []).filter(x => x && x.buildSha256), hit = hist.find(x => x.buildSha256 === whole);
  if (hit) return { status: 'pass', at: hit.at || null, appVersion: hit.appVersion || null };
  const lf = rec.last && rec.last.ok && rec.last.files;
  const differ = lf ? APP_FILES.filter(f => lf[f] !== files[f]) : APP_FILES.slice();
  if (lf && differ.length === 1 && differ[0] === 'index.html') return { status: 'pass-code', at: rec.last.at || null, appVersion: rec.last.appVersion || null, differ };
  return { status: 'not-checked', differ, lastPass: hist.length ? hist[hist.length - 1].buildSha256 : null };
}
const VERIFIED_TXT = { pass: '검산 통과 코드', 'pass-code': '검산 통과 코드 (index.html 만 다름 — 오는 길에 바뀐 것으로 보임)', 'not-checked': '검산 기록과 다른 코드', 'no-record': '검산 기록을 못 읽음' };
const STALE_MSG = '프로그램이 새로 바뀌었습니다.\n화면을 새로 고침 한 뒤 다시 시작해 주세요.';

/* ───────────── 소리 ───────────── */
let ctx = null, master = null, live = [], mon = null, AUDIO_ERR = null;
const wins = [];   // 소리 버퍼가 나가는 [t0, tEnd] — 출력 확인이 그 동안은 ‘버퍼’ 로 봄
function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) throw new Error('이 브라우저는 소리를 만들 수 없습니다 (AudioContext 없음)');
    ctx = new AC(); master = ctx.createGain(); master.connect(ctx.destination);
    try { mon = ctx.createAnalyser(); mon.fftSize = 32768; master.connect(mon); } catch { mon = null; }
    ctx.onstatechange = () => { try { keepMonTick(); } catch { } };
  }
  if (ctx.state !== 'running') { try { const p = ctx.resume(); if (p && p.catch) p.catch(() => { }); } catch { } }
  return ctx;
}
function audioOk() {
  try { audio(); return true; }
  catch (e) { AUDIO_ERR = String(e && e.message || e); renderEnvWarn(); alert('소리를 낼 수 없습니다. 크롬이나 엣지, 사파리 최신판으로 열어 주세요.'); return false; }
}
function play(data, when) {
  const b = ctx.createBuffer(1, data.length, ctx.sampleRate);
  b.copyToChannel(data, 0);
  const s = ctx.createBufferSource(); s.buffer = b; s.connect(master); s.start(when);
  wins.push({ t0: when, tEnd: when + data.length / ctx.sampleRate }); if (wins.length > 50) wins.shift();
  live.push(s); s.onended = () => { live = live.filter(x => x !== s); };
  return s;
}
function stopAll() {
  for (const s of live) { try { s.stop(); } catch { } } live = [];
  if (ctx) for (const w of wins) if (w.tEnd > ctx.currentTime) w.tEnd = Math.max(w.t0, ctx.currentTime);
}
function stim(fm, depthDb, dur = PR.dur, seed) {
  return Stim.make({ fs: ctx.sampleRate, dur, band: PR.band, fm, depthDb, phase: PR.phase, rampMs: PR.rampMs, rampShape: PR.rampShape, gainDb: 0, seed });
}
// 지금 출력 장치로 실제로 나가고 있는 소리의 오디오 시계 시각 — 불빛을 이 시각에 맞춤(출력 지연 반영)
function heardTime() {
  try {
    const ts = ctx.getOutputTimestamp && ctx.getOutputTimestamp();
    if (ts && ts.performanceTime > 0) return ts.contextTime + (performance.now() - ts.performanceTime) / 1000;
  } catch { /* 지원 안 하면 아래 */ }
  return ctx.currentTime - (ctx.outputLatency || 0) - (ctx.baseLatency || 0);
}
function audioEnv() {
  if (!ctx) return null;
  return { sampleRate: ctx.sampleRate, baseLatencyMs: ctx.baseLatency !== undefined ? +(ctx.baseLatency * 1000).toFixed(1) : null,
    outputLatencyMs: ctx.outputLatency !== undefined ? +(ctx.outputLatency * 1000).toFixed(1) : null, state: ctx.state };
}
function systemEnv() {
  let tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { }
  return { app: APP_VERSION, ua: navigator.userAgent, platform: navigator.userAgentData?.platform || navigator.platform || '', lang: navigator.language, tz,
    cores: navigator.hardwareConcurrency || null, touch: navigator.maxTouchPoints || 0, screen: `${screen.width}x${screen.height}@${devicePixelRatio}`, window: `${innerWidth}x${innerHeight}`,
    origin: location.protocol === 'file:' ? 'file' : location.origin };
}

/* ───────────── 시행 사이 출력 확인 (와우TMTF 3.1 과 같은 방식) ─────────────
   시행 사이에 따로 소리를 내지 않고, 오디오를 처음 켠 뒤 닫거나 멈추지 않음. 회기 중 1초마다 출력 바로 앞(분석기)을 보아
   오디오가 돌고(running) 시계가 흐르는지(실제 시간 대비 1 ± 0.05) 확인하고, 끊기면 시각 · 까닭 · 길이를 회기 사건 · 측정 · 회기에 남김. */
let mbuf = null, mlast = null;
function monitor() {
  if (!ctx || !mon) return null;
  const N = mon.fftSize, fs = ctx.sampleRate;
  if (!mbuf || mbuf.length !== N) mbuf = new Float32Array(N);
  mon.getFloatTimeDomainData(mbuf);
  let ss = 0;
  for (let n = 0; n < N; n++) ss += mbuf[n] * mbuf[n];
  const rms = Math.sqrt(ss / N), now = ctx.currentTime, perf = performance.now(), winS = N / fs;
  const rate = mlast && perf - mlast.perf > 200 ? (now - mlast.ctx) / ((perf - mlast.perf) / 1000) : null;
  mlast = { ctx: now, perf };
  return { rmsDb: rms > 1e-7 ? +(20 * Math.log10(rms)).toFixed(2) : null, state: ctx.state, rate: rate === null ? null : +rate.toFixed(4), winS,
    inBuffer: wins.some(b => b.t0 < now && b.tEnd > now - winS), perf };
}
const KEEPMON = { page: uid(), since: null, polls: 0, ok: 0, buffer: 0, off: 0, gaps: [], open: null, last: null, lastOkAt: null, lastOkPerf: null };
const KEEP_RATE_TOL = 0.05;
const keepMonSnap = () => ({ page: KEEPMON.page, since: KEEPMON.since, polls: KEEPMON.polls, ok: KEEPMON.ok, buffer: KEEPMON.buffer, off: KEEPMON.off,
  gaps: KEEPMON.gaps.length, open: KEEPMON.open ? { ...KEEPMON.open } : null, lastOkAt: KEEPMON.lastOkAt });
function keepMonSince(k0) {
  const same = k0 && k0.page === KEEPMON.page, b = same ? k0 : { polls: 0, ok: 0, buffer: 0, gaps: 0 };
  return { polls: KEEPMON.polls - b.polls, ok: KEEPMON.ok - b.ok, buffer: KEEPMON.buffer - b.buffer,
    gaps: KEEPMON.gaps.slice(b.gaps), openAtEnd: KEEPMON.open ? { ...KEEPMON.open } : null, lastOkAt: KEEPMON.lastOkAt, spansReload: !same };
}
function keepMonTick() {
  const m = monitor();
  if (!m) return null;
  const exp = S ? 'keep' : null;
  let cls, why = null;
  if (!exp) cls = 'off';
  else if (m.state !== 'running') { cls = 'gap'; why = `오디오가 ${m.state}`; }
  else if (m.rate !== null && Math.abs(m.rate - 1) > KEEP_RATE_TOL) { cls = 'gap'; why = `오디오 시계 ${m.rate} (실제 시간과 다름)`; }
  else if (m.inBuffer) cls = 'buffer';
  else cls = 'ok';
  const at = iso();
  KEEPMON.polls++;
  if (cls !== 'gap') KEEPMON[cls]++;
  if (cls === 'ok') { KEEPMON.lastOkAt = at; KEEPMON.lastOkPerf = m.perf; if (!KEEPMON.since) KEEPMON.since = at; }
  KEEPMON.last = { at, cls, why, rmsDb: m.rmsDb, rate: m.rate, state: m.state };
  if (cls === 'gap') {
    if (!KEEPMON.open) { KEEPMON.open = { from: at, why, state: m.state, rate: m.rate, run: S?.cur && !S.cur.practice ? S.idx + 1 : null, n: 0 }; logEv('keep-gap-start', { ...KEEPMON.open }); }
    KEEPMON.open.n++;
  } else if (KEEPMON.open) {
    const g = { ...KEEPMON.open, to: at, durS: +((Date.parse(at) - Date.parse(KEEPMON.open.from)) / 1000).toFixed(1), endedBy: cls };
    KEEPMON.gaps.push(g); KEEPMON.open = null;
    logEv('keep-gap-end', g);
  }
  return KEEPMON.last;
}
const KEEPMON_TIMER = setInterval(() => { try { keepMonTick(); } catch (e) { console.error(e); } }, 1000);

/* ───────────── 화면이 꺼지지 않게 (지원하는 브라우저만) ───────────── */
let wake = null;
async function wakeOn() {
  try {
    if (!('wakeLock' in navigator) || wake || document.visibilityState !== 'visible') return;
    wake = await navigator.wakeLock.request('screen');
    logEv('wake-on');
    wake.addEventListener('release', () => { wake = null; logEv('wake-released'); });
  } catch (e) { logEv('wake-fail', { why: String(e && e.name || e) }); }
}
function wakeOff() { try { if (wake) wake.release(); } catch { } wake = null; }

/* ───────────── 화면 ───────────── */
function showPage(id) { $$('.page').forEach(p => p.classList.toggle('on', p.id === id)); try { window.scrollTo(0, 0); } catch { } }
function renderEnvWarn() {
  const m = [];
  if (AUDIO_ERR) m.push('이 브라우저에서는 소리를 낼 수 없습니다. 크롬이나 엣지, 사파리 최신판으로 열어 주세요.');
  if (STORE.blocked || !STORE.ok) m.push('이 브라우저는 결과를 저장하지 못합니다. 검사가 끝나면 꼭 ‘결과 파일 저장’을 눌러 주세요.');
  if (STORE.error && STORE.moved) m.push('전에 저장된 기록 하나를 읽지 못해 따로 보관했습니다.');
  if (LINK.hz && String(LINK.hz).trim() && !LINK.fms) m.push('링크에 적힌 떨림 빠르기를 읽지 못해 기본값으로 검사합니다.');
  const el = $('#envWarn'); if (!el) return;
  el.hidden = !m.length; el.innerHTML = m.map(esc).join('<br>');
}

/* ── 처음 화면 ── */
function renderHome() {
  $('#homeTime').textContent = `${estMin(PLAN_FMS.length)}분쯤 (중간에 쉴 수 있어요)`;
  const ss = DB.sessions.filter(s => (s.runs || []).length).slice().sort((a, b) => String(b.start).localeCompare(String(a.start)));
  $('#homeSaved').hidden = !ss.length;
  $('#homeSavedList').innerHTML = ss.slice(0, 12).map(s => `<div class="row wrap gap saved">
    <span>${esc(localTime(s.start))} · ${esc(EAR[s.ear] || '')} · 측정 ${s.runs.length}개${s.code ? ' · ' + esc(s.code) : ''}</span>
    <button class="btn small" data-open="${esc(s.id)}">결과 보기</button></div>`).join('') + (ss.length > 12 ? `<p class="hint">그 전 검사 ${ss.length - 12}개는 ‘모두 파일로 저장’에 들어 있습니다.</p>` : '');
  renderEnvWarn();
}
$('#homeSavedList').addEventListener('click', e => { const id = e.target?.dataset?.open; if (!id) return; const s = DB.sessions.find(x => x.id === id); if (s) showEnd(s, { offers: false }); });
$('#homeSaveAll').onclick = () => saveFile(DB.sessions.filter(s => (s.runs || []).length || (s.events || []).length), 'all');
$('#goSetup').onclick = () => { PRE.setupAt = PRE.setupAt || iso(); showPage('pgSetup'); };
$('#goViewer').onclick = () => { showPage('pgViewer'); };

/* ── 준비 ── */
const PRE = { ear: null, path: null, noise: [], demo: [], volOkAt: null, setupAt: null };
function pick(groupSel, key) {
  $(groupSel).addEventListener('click', e => {
    const b = e.target.closest ? e.target.closest('.choice') : e.target;
    if (!b || !b.dataset || !b.dataset.v) return;
    PRE[key] = b.dataset.v;
    $$(groupSel + ' .choice').forEach(x => x.classList.toggle('on', x.dataset.v === PRE[key]));
    syncSetup();
  });
}
pick('#earPick', 'ear'); pick('#pathPick', 'path');
function syncSetup() {
  $('#btNote').hidden = PRE.path !== 'bt';
  const ready = !!(PRE.ear && PRE.path);
  $('#setupNext').disabled = !ready; $('#setupNeed').hidden = ready;
}
$('#setupBack').onclick = () => showPage('pgHome');
$('#setupNext').onclick = () => { if (PRE.ear && PRE.path) showPage('pgSound'); };
const optVal = id => { const v = $(id).value; return v === '' ? null : v; };
function infoNow() {
  const note = $('#infoNote').value.trim();
  return { age: optVal('#infoAge'), ciYears: optVal('#infoYears'), onset: optVal('#infoOnset'), maker: optVal('#infoMaker'), note: note || null, shown: !!$('#moreBox').open };
}

/* ── 소리 크기 ── */
let noiseTimer = null;
$('#noisePlay').onclick = () => {
  if (!audioOk()) return;
  stopAll(); clearTimeout(noiseTimer);
  const m = stim(PRACTICE_FM, null, 10);
  play(m.data, ctx.currentTime + 0.05);
  PRE.noise.push({ at: iso(), seed: m.seed, durS: 10, rmsDb: +m.rmsDb.toFixed(3), sampleRate: ctx.sampleRate });
  $('#noiseState').textContent = '잡음이 나오는 중 (10초)';
  noiseTimer = setTimeout(() => { $('#noiseState').textContent = ''; }, 10200);
};
$('#noiseStop').onclick = () => { stopAll(); clearTimeout(noiseTimer); $('#noiseState').textContent = ''; const L = PRE.noise[PRE.noise.length - 1]; if (L && !L.stoppedAt) L.stoppedAt = iso(); };
function demo(mod) {
  if (!audioOk()) return;
  stopAll(); clearTimeout(noiseTimer); $('#noiseState').textContent = '';
  const m = stim(PRACTICE_FM, mod ? 0 : null, 2);
  play(m.data, ctx.currentTime + 0.05);
  PRE.demo.push({ at: iso(), kind: mod ? 'mod' : 'flat', fm: PRACTICE_FM, depthDb: mod ? 0 : null, seed: m.seed, phase: m.phase, durS: 2 });
}
$('#demoMod').onclick = () => demo(true);
$('#demoFlat').onclick = () => demo(false);
$('#volOk').addEventListener('change', () => { PRE.volOkAt = $('#volOk').checked ? iso() : null; $('#soundNext').disabled = !$('#volOk').checked; });
$('#soundBack').onclick = () => { stopAll(); showPage('pgSetup'); };
$('#soundNext').onclick = () => { startSession(); };

/* ───────────── 검사 진행 ───────────── */
let S = null;
function logEv(type, detail = {}) { if (S?.session) { S.session.events.push({ t: iso(), s: +((performance.now() - S.t0) / 1000).toFixed(2), type, ...detail }); S.session.updated = iso(); } }
async function startSession() {
  if (S) return;
  if (!audioOk()) return;
  stopAll(); clearTimeout(noiseTimer); $('#noiseState').textContent = '';
  $('#soundNext').disabled = true;
  const bi = await computeBuild('no-store');
  $('#soundNext').disabled = !$('#volOk').checked;
  // 새 판이 나왔는데 옛 화면이 돌고 있으면(서버 app.js 의 판 번호 ≠ 지금 도는 판 번호) 새로 고침 안내 — 지문(해시)만 다른 것은 막지 않음
  if (bi.ok && bi.version && bi.version !== APP_VERSION) {
    alert(STALE_MSG);
    logDecision('session-start', 'blocked', { reason: 'new-version', running: APP_VERSION, server: bi.version, pageBuild: BUILD_LOAD?.ok ? BUILD_LOAD.buildSha256 : null, fileBuild: bi.buildSha256 });
    return;
  }
  // 회기 build: 실제로 돈 코드(처음 열 때 받은 판)를 앞에, 서버의 지금 판 · 서로 다른 파일을 함께
  const run0 = BUILD_LOAD?.ok ? BUILD_LOAD : null, base = run0 || (bi.ok ? bi : null);
  const differ = run0 && bi.ok ? APP_FILES.filter(f => run0.files[f] !== bi.files[f]) : null;
  // 받은 판의 검산 여부는 지금 읽은 통과 기록으로 다시 맞댐 (처음 열 때 기록을 못 읽었어도 바르게)
  const runVerified = run0 ? (bi.ok && bi.passRec ? verifyBuild(bi.passRec, run0.buildSha256, run0.files) : run0.verified) : null;
  const pack = (b, v) => b && b.ok ? { sha256: b.buildSha256, files: b.files, version: b.version, verified: v || b.verified } : { sha256: null, error: b ? b.error : 'not-ready' };
  const osv = $('#osVol').value.trim();
  const session = {
    id: uid(), format: FORMAT, app: APP_VERSION, start: iso(), end: null, endReason: null, updated: iso(),
    code: cleanCode($('#codeIn').value) || null, ear: PRE.ear, path: PRE.path, osVolume: osv === '' || !isFinite(+osv) ? null : +osv, info: infoNow(),
    proto: PR.id, procKey: PROC_KEY, cond: { ...COND }, P: snapP(PR),
    fmsPlan: PLAN_FMS.slice(), link: { search: location.search || '', code: LINK.code || null, hz: LINK.hz ?? null, hzUsed: !!LINK.fms },
    plan: [], rounds: [], practiceFm: PRACTICE_FM, practiceN: PRACTICE_N, practiceTrials: [], practiceRounds: 0,
    runs: [], events: [], decisions: [], current: null,
    setup: { setupAt: PRE.setupAt, noise: PRE.noise.slice(), demo: PRE.demo.slice(), volOkAt: PRE.volOkAt },
    env: { ...systemEnv(), audio: audioEnv() },
    build: { sha256: base ? base.buildSha256 : null, verified: run0 ? runVerified : base ? base.verified : null, from: run0 ? 'load' : base ? 'server' : null,
      running: pack(BUILD_LOAD, runVerified), server: pack(bi), differ },   // differ: 화면이 받은 파일 ≠ 서버 파일 (null = 비교 못 함)
    buildAtLoad: BUILD_LOAD?.ok ? BUILD_LOAD.buildSha256 : null,
    keepMonAtStart: null, keepMonitor: null, focusEnd: null, focusEndShown: false,
  };
  DB.sessions.push(session);
  // 다음 회기는 소리 크기 확인부터 다시 (귀 · 듣는 방법은 그대로)
  PRE.noise = []; PRE.demo = []; PRE.volOkAt = null; PRE.setupAt = null; $('#volOk').checked = false; $('#soundNext').disabled = true;
  JUST = null;
  S = { session, plan: [], idx: 0, cur: null, token: null, t0: performance.now(), lastEnd: null, practiceRound: 0, offer: null };
  session.keepMonAtStart = keepMonSnap();
  addRound(PLAN_FMS, false);
  logEv('session-start', { fms: PLAN_FMS.slice(), practiceN: PRACTICE_N, build: session.build.sha256, verified: session.build.verified?.status ?? null, differ });
  saveStore();
  wakeOn();
  startPractice();
}
// 한 바퀴 = 고른 주파수 전체를 무작위 순서로 (Won 2011 · Park 2015 · De Ruiter 2015)
function addRound(fms, extra) {
  const round = S.session.rounds.length + 1, order = shuffle(fms.slice());
  S.session.rounds.push({ round, at: iso(), order, extra: !!extra });
  order.forEach(fm => S.plan.push({ fm, round, extra: !!extra }));
  S.session.plan = S.plan.map(x => ({ ...x }));
  return round;
}
const roundsOf = () => S.session.rounds.length;
function setTitle(t) { $('#tTitle').textContent = t; }
function setProg(v) { $('#progBar').style.width = (100 * Math.max(0, Math.min(1, v))).toFixed(1) + '%'; }
function setFb(cls, t) { const el = $('#fb'); el.className = 'fb' + (cls ? ' ' + cls : ''); el.textContent = t; }
function startPractice() {
  S.practiceRound++; S.session.practiceRounds = S.practiceRound;
  S.cur = { practice: true, fm: PRACTICE_FM, left: PRACTICE_N, k: 0, u: 0, startIso: iso(), startPt: performance.now(), replays: 0, phase: 'idle', keepMonAtStart: keepMonSnap() };
  logEv('practice-start', { fm: PRACTICE_FM, n: PRACTICE_N, round: S.practiceRound });
  showPage('pgTest'); setTitle(`연습 1 / ${PRACTICE_N}`); setProg(0); $('#tNote').textContent = '연습은 결과에 들어가지 않습니다.';
  nextTrial();
}
function trackTitle() {
  const item = S.plan[S.idx], inRound = S.plan.filter(x => x.round === item.round), k = inRound.indexOf(item) + 1;
  const head = item.extra ? '한 번 더' : item.round > 1 ? `${item.round}번째 바퀴` : '검사';
  return `${head} ${k} / ${inRound.length}`;
}
function startTrack() {
  const item = S.plan[S.idx], now = performance.now();
  S.cur = { fm: item.fm, round: item.round, extra: !!item.extra, practice: false, track: new Track(PR), startIso: iso(), startPt: now,
    breakS: S.lastEnd !== null ? +((now - S.lastEnd) / 1000).toFixed(1) : null, replays: 0, phase: 'idle', keepMonAtStart: keepMonSnap() };
  logEv('track-start', { fm: item.fm, round: item.round, extra: !!item.extra, order: S.idx + 1 });
  showPage('pgTest'); setTitle(trackTitle()); setProg(0); $('#tNote').textContent = '';
  saveCurrent();
  nextTrial();
}
// 하던 측정을 회기 기록에 — 화면이 닫혀도 그때까지의 시행이 남게 (다음에 열 때 버린 측정으로 옮김)
function saveCurrent() {
  const C = S?.cur;
  if (!C || C.practice) return;
  S.session.current = { fm: C.fm, round: C.round, extra: C.extra, order: S.idx + 1, startedAt: C.startIso, trialList: C.track.trials, reversals: C.track.reversals, revAt: C.track.revAt,
    depthNow: C.track.depth, P: snapP(PR) };
  S.session.updated = iso();
  saveStore();
}
let awaiting = null;
function nextTrial() {
  const C = S.cur, n = PR.nAFC;
  if (document.hidden) { C.needReplay = true; return; }
  const depth = C.practice ? 0 : C.track.depth;
  setFb('', '');
  const btns = $$('.iv');
  btns.forEach(b => { b.className = 'iv'; b.disabled = true; });
  $('#dunno').disabled = true;
  const tg = randInt(n);
  let made;
  try { made = btns.map((_, i) => stim(C.fm, i === tg ? depth : null)); }
  catch (e) { logEv('stim-error', { fm: C.fm, d: depth, msg: String(e && e.message || e) }); setFb('no', '소리를 만들지 못했습니다. 화면을 새로 고침 해 주세요.'); return; }
  const t0 = ctx.currentTime + LEAD_S, step = PR.dur + PR.isi;
  made.forEach((m, i) => play(m.data, t0 + i * step));
  const h0 = heardTime(), p0 = performance.now();
  const token = {}; S.token = token; C.phase = 'playing';
  C.pend = { tg, d: depth, n };
  C.tm = {
    at: iso(), seeds: made.map(m => m.seed), phase: made[tg].phase, rms: made.map(m => +m.rmsDb.toFixed(3)), pk: made.map(m => +m.peakDb.toFixed(2)),
    lead: +(t0 - ctx.currentTime).toFixed(3), late: ctx.currentTime > t0 - 0.02, latMs: ctx.outputLatency !== undefined ? +(ctx.outputLatency * 1000).toFixed(1) : null,
    hid: false, drift: null, rep: C.replays,
    kOk: KEEPMON.lastOkPerf ? Math.round(p0 - KEEPMON.lastOkPerf) : null, kGap: !!KEEPMON.open,
    early: 0, ev: [],
  };
  if (made.some(m => m.scaled)) C.tm.scaled = made.map(m => m.scaled);
  const expect0 = p0 + (t0 - h0) * 1000;
  let lit = -1;
  const frame = () => {
    if (S?.token !== token) return;
    const h = heardTime();
    let on = -1;
    for (let i = 0; i < n; i++) if (h >= t0 + i * step && h < t0 + i * step + PR.dur) on = i;
    if (on !== lit) {
      btns.forEach((b, i) => b.classList.toggle('playing', i === on));
      if (on === 0 && C.tm.drift === null) C.tm.drift = Math.round(performance.now() - expect0);
      lit = on;
    }
    if (h >= t0 + (n - 1) * step + PR.dur) {
      btns.forEach(b => { b.classList.remove('playing'); b.disabled = false; b.classList.add('ready'); });
      $('#dunno').disabled = false;
      C.phase = 'awaiting';
      awaiting = { tg, depth, t: performance.now(), n };
      return;
    }
    nextFrame(frame);
  };
  nextFrame(frame);
}
// 다음 화면 갱신 때 실행 — 브라우저가 화면 갱신을 멈춰도(가려진 창 등) 50 ms 타이머로 이어 감
function nextFrame(f) {
  let done = false;
  const go = () => { if (!done) { done = true; f(); } };
  requestAnimationFrame(go); setTimeout(go, 50);
}
function answer(i, dunno, inp) {
  if (!awaiting || !S?.cur) return;
  if (!dunno && !(i >= 0 && i < awaiting.n)) { logEv('ignored-input', { key: i + 1, how: inp, phase: 'awaiting', why: 'no-such-interval' }); return; }
  const a = awaiting; awaiting = null;
  if (dunno) i = randInt(a.n);   // 모르겠음 = 구간 가운데 무작위 하나로 침 (특정 번호 쪽으로 치우치지 않는 찍기)
  const correct = i === a.tg, rt = Math.round(performance.now() - a.t);
  const btns = $$('.iv');
  btns.forEach(b => { b.disabled = true; b.classList.remove('ready'); try { b.blur(); } catch { } });
  $('#dunno').disabled = true;
  if (PR.feedback) {
    btns[a.tg].classList.add('right');
    if (dunno) setFb('mid', `떨리는 소리는 ${a.tg + 1}번이었어요`);
    else if (correct) setFb('ok', '맞았어요');
    else { btns[i].classList.add('wrong'); setFb('no', `아니에요. ${a.tg + 1}번이었어요`); }
  }
  const C = S.cur; C.phase = 'feedback';
  const meta = { a: i, tg: a.tg, u: dunno ? 1 : 0, rt, inp, ...C.tm };
  if (C.practice) {
    S.session.practiceTrials.push({ fm: C.fm, d: a.depth, c: correct ? 1 : 0, round: S.practiceRound, ...meta });
    if (correct && !dunno) C.k++;
    if (dunno) C.u++;
    C.left--; setProg((PRACTICE_N - C.left) / PRACTICE_N);
    S.session.updated = iso(); saveStore();
    setTimeout(() => { if (S?.cur !== C) return; if (C.left > 0) { setTitle(`연습 ${PRACTICE_N - C.left + 1} / ${PRACTICE_N}`); nextTrial(); } else practiceDone(); }, 1000);
    return;
  }
  C.track.respond(correct, meta);
  C.replays = 0;
  setProg(C.track.reversals.length / C.track.P.totalRev);
  saveCurrent();
  setTimeout(() => { if (S?.cur !== C) return; if (C.track.done) finishTrack(); else nextTrial(); }, 900);
}
$$('.iv').forEach(b => b.addEventListener('click', () => answer(+b.dataset.i, false, 'click')));
$('#dunno').onclick = () => answer(-1, true, 'click');
// 받지 않는 때 누른 응답 키: 소리가 나는 동안 → 그 시행의 이른 입력, 그 밖 → 회기 사건 ignored-input
function notTaken(key, how) {
  const C = S?.cur; if (!C) return;
  const k = key === 0 ? 'dunno' : key;
  if (C.phase === 'playing' && C.tm && !C.needReplay) { C.tm.early = (C.tm.early || 0) + 1; C.tm.ev.push({ t: iso(), type: 'early-input', key: k, how }); return; }
  logEv('ignored-input', { key: k, how, phase: C.phase, practice: !!C.practice, trials: C.track?.trials.length ?? null });
}
const isTyping = t => !!(t && typeof t.matches === 'function' && t.matches('input,select,textarea'));
document.addEventListener('keydown', e => {
  if (isTyping(e.target) || e.repeat) return;
  if ($('#pgTest').classList.contains('on') && S?.cur) {
    const m = { '1': 1, '2': 2, '3': 3, '0': 0 }[e.key];
    if (m === undefined) return;
    e.preventDefault();
    if (!awaiting) notTaken(m, 'key');
    else if (m === 0) answer(-1, true, 'key');
    else answer(m - 1, false, 'key');
  } else if ($('#pgBreak').classList.contains('on') && (e.key === 'Enter' || e.key === ' ') && !$('#bNext').hidden) { e.preventDefault(); $('#bNext').click(); }
});
// 소리가 나는 동안 화면(탭)이 가려지면: 그 시행은 버리고, 돌아오면 같은 깊이로 다시 들려줌
document.addEventListener('visibilitychange', () => {
  if (!S) return;
  logEv(document.hidden ? 'hidden' : 'visible', { phase: S.cur?.phase || 'break' });
  if (!document.hidden) wakeOn();
  const C = S.cur; if (!C) return;
  if (document.hidden) {
    if (C.phase === 'playing') {
      stopAll(); S.token = null; C.replays++; C.needReplay = true;
      logEv('trial-void', { fm: C.fm, practice: !!C.practice, trialNo: C.practice ? null : C.track.trials.length + 1, heard: C.tm ? { ...JSON.parse(JSON.stringify(C.tm)), tg: C.pend?.tg, d: C.pend?.d } : null });
    } else if (C.phase === 'awaiting' && C.tm) C.tm.hid = true;
  } else if (C.needReplay) {
    C.needReplay = false;
    $('#tNote').textContent = '다른 화면으로 가 있어서 소리를 다시 들려 드립니다.';
    setTimeout(() => { if (S?.cur === C && !document.hidden) { $('#tNote').textContent = C.practice ? '연습은 결과에 들어가지 않습니다.' : ''; nextTrial(); } }, 700);
  }
});
window.addEventListener('beforeunload', e => { if (S && !S.session.end) { e.preventDefault(); e.returnValue = ''; } });
function finishTrack() {
  const C = S.cur, r = C.track.result(), endPt = performance.now();
  const run = {
    id: uid(), t: iso(), fm: C.fm, round: C.round, extra: C.extra, order: S.session.runs.length + 1,
    thr: r.thr, sd: r.sd, ceiling: r.ceiling, incomplete: !!r.incomplete, n0: r.n0, k0: r.k0, pChance: r.p, atChance: !!r.atChance,
    reversals: C.track.reversals, revAt: C.track.revAt.slice(), nTrials: C.track.trials.length, nDunno: C.track.trials.filter(t => t.u).length, trials: C.track.trials,
    startedAt: C.startIso, durS: +((endPt - C.startPt) / 1000).toFixed(1), breakBeforeS: C.breakS, sinceSessionStartS: +((C.startPt - S.t0) / 1000).toFixed(1),
    app: APP_VERSION, audio: audioEnv(), keepMonitor: keepMonSince(C.keepMonAtStart),
  };
  S.session.runs.push(run);
  S.session.current = null;
  logEv('track-end', { fm: C.fm, round: C.round, thr: r.thr, ceiling: r.ceiling, atChance: !!r.atChance, trials: run.nTrials });
  saveStore();
  S.idx++; S.lastEnd = endPt; S.cur = null; S.token = null;
  if (S.idx < S.plan.length) showBreak('next'); else planDone();
}
function practiceDone() {
  const C = S.cur;
  logEv('practice-end', { round: S.practiceRound, k: C.k, dunno: C.u, n: PRACTICE_N });
  S.cur = null; S.token = null;
  showBreak('practice', { k: C.k, u: C.u, n: PRACTICE_N });
}
function showBreak(kind, info = {}) {
  stopAll(); awaiting = null;
  if (kind !== 'practice') logEv('break', { kind });
  const left = S.plan.length - S.idx, total = S.plan.length;
  let title = '', h = '';
  $('#bPractice').hidden = kind !== 'practice';
  $('#bNext').hidden = false;
  if (kind === 'practice') {
    title = '연습 끝';
    h = info.n ? `<p>${info.n}번 가운데 <b>${info.k}번</b> 맞았어요.</p>` : '<p>연습을 건너뛰었어요.</p>';
    if (info.n && info.k < 2) h += '<p class="hint">떨리는 소리가 잘 구별되지 않으면 볼륨을 조금 키우거나 ‘연습 한 번 더’를 눌러 보세요. 그래도 어려우면 그대로 시작해도 됩니다.</p>';
    h += '<p>이제 검사를 시작합니다. 맞힐수록 떨림이 약해져 어려워집니다. 잘 모르겠으면 ‘모르겠음’을 누르세요.</p>';
    h += '<p class="hint">검사가 끝날 때까지 볼륨은 바꾸지 마세요.</p>';
    $('#bNext').textContent = '검사 시작';
  } else if (kind === 'stopped') {
    title = '멈췄어요';
    h = '<p>하던 것은 처음부터 다시 합니다. 끝난 것은 저장되어 있어요.</p>';
    $('#bNext').textContent = '다시 시작';
  } else if (kind === 'round') {
    title = info.extra ? '차이가 큰 것만 한 번 더' : `${info.round}번째 바퀴`;
    h = `<p>${info.extra ? '두 번 잰 값이 많이 다른 소리만 한 번 더 합니다.' : '같은 소리들을 다른 순서로 한 번 더 합니다.'} ${left}개, ${estMin(left)}분쯤 걸립니다.</p><p class="hint">준비되면 ‘다음’을 누르세요.</p>`;
    $('#bNext').textContent = '다음';
  } else {
    title = '잘하셨어요';
    h = `<p>${total - left} / ${total}개 끝났어요. 남은 것 ${left}개.</p><p class="hint">잠시 쉬었다가 준비되면 ‘다음’을 누르세요.</p>`;
    $('#bNext').textContent = '다음';
  }
  $('#bTitle').textContent = title; $('#bBody').innerHTML = h;
  showPage('pgBreak');
}
$('#bNext').onclick = () => { if (!S) return; if (S.idx < S.plan.length) startTrack(); };
$('#bPractice').onclick = () => { if (!S) return; startPractice(); };
$('#bEnd').onclick = () => {
  if (!S) return;
  const left = S.plan.length - S.idx;
  endSession(left > 0 ? `중간에 끝냄 (남은 측정 ${left}개)` : '계획한 측정 모두 마침');
};
const pendingOf = (C, phase) => C?.tm && ['playing', 'awaiting'].includes(phase) ? { ...JSON.parse(JSON.stringify(C.tm)), tg: C.pend?.tg, d: C.pend?.d } : null;
$('#stopBtn').onclick = () => {
  const C = S?.cur || null; if (!C) return;
  const phase = C.phase || null;
  if (C.practice) {
    logEv('practice-stopped', { fm: C.fm, done: PRACTICE_N - C.left, of: PRACTICE_N, phase, pending: pendingOf(C, phase) });
    S.token = null; S.cur = null; stopAll(); awaiting = null;
    showBreak('practice', { k: C.k, u: C.u, n: PRACTICE_N - C.left }); return;
  }
  const at = iso(), msg = '지금 하던 것은 버리고 멈출까요?\n끝난 것은 저장되어 있어요.';
  const go = confirm(msg);
  if (C.tm && ['playing', 'awaiting'].includes(phase)) C.tm.ev.push({ t: at, type: 'stop-dialog', phase, answer: go ? 'stop' : 'keep', closedAt: iso() });
  logEv('stop-dialog', { phase, text: msg, answer: go ? 'stop' : 'keep', openedAt: at, fm: C.fm, trials: C.track.trials.length });
  if (!go) return;
  const T = C.track;
  logEv('track-abandoned', { fm: C.fm, round: C.round, extra: C.extra, stopVia: 'stop-button', phase, order: S.idx + 1, startedAt: C.startIso,
    trialList: JSON.parse(JSON.stringify(T.trials)), reversals: T.reversals.slice(), revAt: T.revAt.slice(), depthNow: T.depth,
    pending: pendingOf(C, phase), P: snapP(PR), keepMonitor: keepMonSince(C.keepMonAtStart) });
  S.session.current = null; S.token = null; S.cur = null; S.lastEnd = performance.now();
  saveStore();
  showBreak('stopped');
};
// 계획한 바퀴가 끝남 — 회기를 끝난 것으로 적고 결과를 보여 줌. ‘한 번 더’를 고르면 회기를 다시 열어 이어 감
function planDone() {
  const sess = S.session;
  sess.end = iso(); sess.endReason = '계획한 측정 모두 마침'; sess.keepMonitor = keepMonSince(sess.keepMonAtStart);
  logEv('plan-done', { rounds: roundsOf() });
  saveStore();
  JUST = sess;
  S.offer = makeOffer();
  if (!S.offer) { closeSession(); showEnd(sess, { offers: false }); return; }
  showEnd(sess, { offers: true });
}
// 1바퀴 뒤: 한 바퀴 더 (같은 주파수, 새 순서) · 2바퀴 뒤: 두 값이 3 dB 넘게 다른 주파수만 한 번 더 (Park 2015 의 규칙, 숫자 둘일 때만)
function makeOffer() {
  const R = roundsOf(), runs = S.session.runs;
  if (R === 1) return { kind: 'again', fms: PLAN_FMS.slice() };
  if (R === 2 && !S.session.rounds.some(r => r.extra)) {
    const fms = PLAN_FMS.filter(f => {
      const v = runs.filter(r => r.fm === f && !r.extra && !r.ceiling && r.thr !== null).map(r => r.thr);
      return v.length === 2 && Math.abs(v[0] - v[1]) > PR.extraIfDiff;
    });
    if (fms.length) return { kind: 'extra', fms };
  }
  return null;
}
function offerText(o) {
  if (!o) return '';
  const tail = '<p class="hint">한 번 더 하면, 다 끝난 뒤에 결과 파일을 저장해 주세요.</p>';
  if (o.kind === 'again') return `<p><b>시간이 되시면 한 번 더 해 주세요.</b> 같은 소리들을 다른 순서로 다시 합니다 (${estMin(o.fms.length)}분쯤). 두 번 하면 결과가 더 정확해집니다.</p>` + tail;
  return `<p><b>두 번 잰 값이 많이 다른 소리가 ${o.fms.length}개 있습니다.</b> 그것만 한 번 더 하면 더 정확해집니다 (${estMin(o.fms.length)}분쯤).</p>` + tail;
}
$('#againBtn').onclick = () => {
  if (!S?.offer) return;
  const o = S.offer, sess = S.session;
  sess.decisions.push({ at: iso(), what: o.kind === 'again' ? 'again-offer' : 'extra-offer', answer: 'yes', fms: o.fms.slice() });
  sess.end = null; sess.endReason = null;
  const round = addRound(o.fms, o.kind === 'extra');
  logEv('round-added', { round, extra: o.kind === 'extra', fms: o.fms.slice() });
  S.offer = null; saveStore();
  showBreak('round', { round, extra: o.kind === 'extra' });
};
$('#finishBtn').onclick = () => {
  if (!S?.offer) return;
  const o = S.offer, sess = S.session;
  sess.decisions.push({ at: iso(), what: o.kind === 'again' ? 'again-offer' : 'extra-offer', answer: 'no', fms: o.fms.slice() });
  S.offer = null; saveStore();
  closeSession();
  showEnd(sess, { offers: false });
};
function endSession(reason) {
  if (!S) return;
  const sess = S.session;
  stopAll(); awaiting = null;
  sess.end = iso(); sess.endReason = reason; sess.keepMonitor = keepMonSince(sess.keepMonAtStart);
  logEv('session-end', { reason });
  saveStore();
  JUST = sess;
  closeSession();
  showEnd(sess, { offers: false });
}
function closeSession() { if (!S) return; logEv('session-close'); S.session.updated = iso(); saveStore(); S = null; wakeOff(); }
$('#toHome').onclick = () => {
  if (S && S.offer) { S.session.decisions.push({ at: iso(), what: S.offer.kind === 'again' ? 'again-offer' : 'extra-offer', answer: 'left-page', fms: S.offer.fms.slice() }); S.offer = null; }
  if (S) closeSession();
  JUST = null; renderHome(); showPage('pgHome');
};

/* ───────────── 결과 (참가자) ───────────── */
function verdict(r) {
  if (r.ceiling) return { kind: 'ceil', main: '재지 못함', sub: r.n0 >= 6 && !r.atChance ? '가장 큰 떨림은 알아챘지만 그보다 약한 떨림은 어려웠어요' : '가장 큰 떨림에서도 자주 틀렸어요' };
  if (r.thr === null || r.thr === undefined) return { kind: 'none', main: '재지 못함', sub: '숫자를 낼 만큼 진행되지 않았어요' };
  const ref = !!(r.atChance || r.incomplete);
  return { kind: 'num', main: fmtPct(pct(r.thr)), sub: `${r.thr.toFixed(1)} dB${ref ? ' · 참고 값' : ''}`, ref };
}
function byFm(runs) {
  const m = new Map();
  for (const r of runs) { if (!m.has(r.fm)) m.set(r.fm, []); m.get(r.fm).push(r); }
  return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([fm, rs]) => ({ fm, rs: rs.slice().sort((a, b) => (a.order || 0) - (b.order || 0)) }));
}
const meanOf = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
function endTableHtml(sess) {
  const rows = byFm(sess.runs || []);
  if (!rows.length) return '<p>끝난 측정이 없습니다.</p>';
  const maxN = Math.max(...rows.map(x => x.rs.length));
  const head = `<tr><th>떨림 빠르기</th>${Array.from({ length: maxN }, (_, i) => `<th>${maxN > 1 ? `${i + 1}번째` : '알아챈 가장 약한 떨림'}</th>`).join('')}${maxN > 1 ? '<th>평균</th>' : ''}</tr>`;
  const body = rows.map(({ fm, rs }) => {
    const cells = Array.from({ length: maxN }, (_, i) => { const r = rs[i]; if (!r) return '<td></td>'; const v = verdict(r); return `<td>${esc(v.main)}<small>${esc(v.sub)}</small></td>`; }).join('');
    const nums = rs.filter(r => !r.ceiling && r.thr !== null && !r.atChance && !r.incomplete).map(r => r.thr);
    const avg = maxN > 1 ? `<td>${nums.length >= 2 && nums.length === rs.length ? `${esc(fmtPct(pct(meanOf(nums))))}<small>${meanOf(nums).toFixed(1)} dB</small>` : ''}</td>` : '';
    return `<tr><td class="hz">${fm} Hz</td>${cells}${avg}</tr>`;
  }).join('');
  return `<table class="tbl">${head}${body}</table>`;
}
// TMTF 그림: 가로 = 떨림 빠르기(로그), 세로 = 알아챈 가장 약한 떨림(dB, 위로 갈수록 약한 떨림까지 = 예민)
function chartHtml(sess) {
  const rows = byFm(sess.runs || []);
  if (!rows.length) return '';
  const narrow = (window.innerWidth || 800) < 560;   // 휴대폰: 그림을 좁게 그려 글씨가 작아지지 않게
  const W = narrow ? 360 : 640, H = narrow ? 260 : 300, L = 62, R = 18, T = 16, B = 48;
  const fms = rows.map(x => x.fm), lo = Math.log(Math.min(...fms) / 1.5), hi = Math.log(Math.max(...fms) * 1.5);
  const allThr = (sess.runs || []).filter(r => r.thr !== null && !r.ceiling).map(r => r.thr);
  const minDb = Math.min(-30, Math.floor(Math.min(0, ...allThr) / 6) * 6);
  const x = f => L + (W - L - R) * (Math.log(f) - lo) / (hi - lo || 1);
  const y = d => T + (H - T - B) * (1 - d / minDb);   // 0 dB(100%) 아래, 약한 떨림일수록 위
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="떨림 빠르기에 따른 결과 그림">`;
  for (let d = 0; d >= minDb; d -= 6) s += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(d)}" y2="${y(d)}"/><text class="tick" x="${L - 8}" y="${y(d) + 4}" text-anchor="end">${esc(fmtPct(pct(d)))}</text>`;
  for (const f of fms) s += `<line class="grid" x1="${x(f)}" x2="${x(f)}" y1="${T}" y2="${H - B}"/><text class="tick" x="${x(f)}" y="${H - B + 18}" text-anchor="middle">${f}</text>`;
  s += `<text class="axl" x="${(L + W - R) / 2}" y="${H - 8}" text-anchor="middle">떨림 빠르기 (Hz)</text>`;
  const pts = [];
  for (const { fm, rs } of rows) {
    const nums = rs.filter(r => !r.ceiling && r.thr !== null).map(r => r.thr);
    for (const v of nums) s += `<circle class="pt2" cx="${x(fm)}" cy="${y(v)}" r="5"/>`;
    if (nums.length && nums.length === rs.length) pts.push([x(fm), y(meanOf(nums))]);
    if (rs.some(r => r.ceiling || r.thr === null)) { const cx = x(fm), cy = y(0) - 2; s += `<path class="ceil" d="M${cx - 8},${cy - 12} L${cx + 8},${cy - 12} L${cx},${cy} Z"/>`; }
  }
  if (pts.length > 1) s += `<polyline class="ln" points="${pts.map(p => p.join(',')).join(' ')}"/>`;
  for (const p of pts) s += `<circle class="pt" cx="${p[0]}" cy="${p[1]}" r="6.5"/>`;
  return s + '</svg><p class="hint">위로 갈수록 약한 떨림까지 알아챈 것입니다. 빈 동그라미 = 한 번 잰 값, 채운 동그라미 = 평균, ▽ = 재지 못함.</p>';
}
let SHOWN = null;
function showEnd(sess, opt = {}) {
  SHOWN = sess;
  const offers = !!(opt.offers && S && S.session === sess && S.offer);
  $('#endTitle').textContent = offers ? '한 바퀴 끝! 수고하셨습니다' : '수고하셨습니다';
  $('#endWho').textContent = [sess.code || '번호 없음', EAR[sess.ear] || '', PATH[sess.path] || '', localTime(sess.start)].filter(Boolean).join(' · ');
  $('#endTable').innerHTML = endTableHtml(sess);
  $('#endChart').innerHTML = chartHtml(sess);
  const single = byFm(sess.runs || []).some(x => x.rs.length < 2);
  const notes = ['% 가 작을수록 약한 떨림까지 알아챈 것입니다.'];
  if (single) notes.push('한 번만 잰 값은 참고용입니다.');
  if ((sess.runs || []).some(r => r.ceiling || r.thr === null)) notes.push('‘재지 못함’은 가장 큰 떨림에서도 자주 틀려 숫자를 내지 못했다는 뜻입니다.');
  if ((sess.runs || []).some(r => r.atChance || r.incomplete)) notes.push('‘참고 값’은 숫자는 나왔지만 믿기 어려운 값입니다.');
  notes.push('이 결과는 진단이 아닙니다. 처리기 설정은 청능사와 상의하세요.');
  $('#endNotes').innerHTML = notes.map(t => `<p>${esc(t)}</p>`).join('') + focusHtml(sess);
  $('#againBox').hidden = !offers;
  $('#againText').innerHTML = offers ? offerText(S.offer) : '';
  $('#sendState').textContent = '';
  $('#shareFile').hidden = !canShareFile();
  showPage('pgEnd');
}
// 끝 질문(고르지 않으면 null) — 이 화면에서 방금 끝낸 회기에만, 화면에 보였을 때만 답으로 침
let JUST = null;
const evTo = (sess, type, detail = {}) => { sess.events.push({ t: iso(), s: null, type, ...detail }); sess.updated = iso(); };
function focusHtml(sess) {
  if (JUST !== sess) return '';
  sess.focusEndShown = true;
  return `<div class="mt"><p><b>오늘 집중은 어땠나요?</b> <span class="opt">(안 골라도 됩니다)</span></p><div class="choices three" id="focusPick">${Object.entries(FOCUS).map(([k, t]) => `<button class="choice${sess.focusEnd === k ? ' on' : ''}" data-v="${k}">${esc(t)}</button>`).join('')}</div></div>`;
}
$('#endNotes').addEventListener('click', e => {
  const b = e.target.closest ? e.target.closest('.choice') : e.target;
  if (!b || !b.dataset || !b.dataset.v || !SHOWN || JUST !== SHOWN) return;
  SHOWN.focusEnd = b.dataset.v; SHOWN.focusEndAt = iso();
  $$('#focusPick .choice').forEach(x => x.classList.toggle('on', x.dataset.v === SHOWN.focusEnd));
  if (S && S.session === SHOWN) logEv('focus-end', { v: SHOWN.focusEnd }); else evTo(SHOWN, 'focus-end', { v: SHOWN.focusEnd });
  saveStore();
});

/* ── 결과 파일 · 글 ── */
const stamp = t => { const d = t ? new Date(t) : new Date(), z = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}_${z(d.getHours())}-${z(d.getMinutes())}`; };
const asciiCode = s => String(s || '').replace(/[^0-9A-Za-z_-]/g, '') || 'anon';
function exportObj(sessions) { return { format: FORMAT, formatVersion: 1, app: APP_VERSION, exportedAt: iso(), procKey: PROC_KEY, sessions }; }
function fileNameFor(sessions, kind) {
  if (kind === 'all') return `TMTF_all_${stamp()}.json`;
  const s = sessions[0];
  return `TMTF_${asciiCode(s.code)}_${s.ear || 'X'}_${stamp(s.start)}.json`;
}
function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function saveFile(sessions, kind) {
  if (!sessions.length) { alert('저장할 결과가 없습니다.'); return; }
  const name = fileNameFor(sessions, kind);
  download(name, JSON.stringify(exportObj(sessions), null, 1), 'application/json');
  for (const s of sessions) { (s.exports ||= []).push({ at: iso(), how: kind === 'all' ? 'file-all' : 'file', name }); }
  saveStore();
  return name;
}
function canShareFile() {
  try { return !!(navigator.canShare && navigator.share && navigator.canShare({ files: [new File(['{}'], 'TMTF.json', { type: 'application/json' })] })); } catch { return false; }
}
function summaryText(sess) {
  const lines = ['소리 떨림 검사 결과 (TMTF)', [sess.code || '번호 없음', EAR[sess.ear] || '', PATH[sess.path] || '', localTime(sess.start)].filter(Boolean).join(' · ')];
  for (const { fm, rs } of byFm(sess.runs || [])) lines.push(`${fm} Hz: ` + rs.map(r => { const v = verdict(r); return v.kind === 'num' ? `${v.main} (${v.sub})` : v.main; }).join(' / '));
  lines.push(`(앱 ${APP_VERSION})`);
  return lines.join('\n');
}
$('#saveFile').onclick = () => { if (!SHOWN) return; const name = saveFile([SHOWN], 'one'); if (name) $('#sendState').textContent = `저장했습니다: ${name} (다운로드 폴더)`; };
$('#shareFile').onclick = async () => {
  if (!SHOWN) return;
  const name = fileNameFor([SHOWN], 'one'), file = new File([JSON.stringify(exportObj([SHOWN]), null, 1)], name, { type: 'application/json' });
  try {
    await navigator.share({ files: [file], title: '소리 떨림 검사 결과', text: summaryText(SHOWN) });
    (SHOWN.exports ||= []).push({ at: iso(), how: 'share', name }); saveStore();
    $('#sendState').textContent = '보냈습니다.';
  } catch (e) { $('#sendState').textContent = e && e.name === 'AbortError' ? '' : '바로 보내기가 되지 않습니다. ‘결과 파일 저장’을 눌러 주세요.'; }
};
$('#copyText').onclick = async () => {
  if (!SHOWN) return;
  const t = summaryText(SHOWN);
  let ok = false;
  try { await navigator.clipboard.writeText(t); ok = true; } catch { }
  if (!ok) {
    try { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); ok = document.execCommand('copy'); ta.remove(); } catch { }
  }
  if (ok) { (SHOWN.exports ||= []).push({ at: iso(), how: 'copy-text' }); saveStore(); }
  $('#sendState').textContent = ok ? '결과 글을 복사했습니다. 카톡 창에 붙여 넣으세요. (자세한 기록은 파일에만 있습니다)' : '복사가 되지 않습니다. ‘결과 파일 저장’을 눌러 주세요.';
};

/* ───────────── 받은 결과 보기 (검사를 보낸 분용) ───────────── */
const VIEW = { sessions: [] };
// 기록된 답으로 계단을 다시 돌려 깊이 · 반전 · 역치 · 멈춤이 저장값과 같은지
function replayCheck(run, P) {
  try {
    const T = new Track(P);
    for (let i = 0; i < (run.trials || []).length; i++) {
      const t = run.trials[i];
      if (T.done) return { ok: false, why: `시행 ${i + 1}: 계단이 이미 끝난 뒤` };
      if (Math.abs(T.depth - t.d) > 1e-9) return { ok: false, why: `시행 ${i + 1}: 깊이 ${t.d} ≠ ${T.depth}` };
      T.respond(!!t.c);
    }
    const r = T.result();
    const same = T.done === true && !!r.ceiling === !!run.ceiling && (r.thr ?? null) === (run.thr ?? null) && JSON.stringify(T.reversals) === JSON.stringify(run.reversals || []);
    return same ? { ok: true } : { ok: false, why: `역치 ${r.thr} · 기록 ${run.thr}` };
  } catch (e) { return { ok: false, why: String(e && e.message || e) }; }
}
function rmsCheck(run) {
  let worst = 0, scaled = 0;
  for (const t of run.trials || []) { if (Array.isArray(t.rms) && t.rms.length) worst = Math.max(worst, Math.max(...t.rms) - Math.min(...t.rms)); if (t.scaled) scaled++; }
  return { ok: worst <= 0.1 && !scaled, worst: +worst.toFixed(3), scaled };
}
function stairSvg(run) {
  const tr = run.trials || []; if (!tr.length) return '';
  const W = 300, H = 140, L = 30, R = 6, T = 8, B = 18;
  const minD = Math.min(-20, ...tr.map(t => t.d)), n = tr.length;
  const x = i => L + (W - L - R) * (n === 1 ? 0.5 : i / (n - 1)), y = d => T + (H - T - B) * (d / minD);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}">`;
  for (let d = 0; d >= minD; d -= 10) s += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(d)}" y2="${y(d)}"/><text class="tick" x="${L - 4}" y="${y(d) + 4}" text-anchor="end">${d}</text>`;
  s += `<polyline class="stair" points="${tr.map((t, i) => `${x(i)},${y(t.d)}`).join(' ')}"/>`;
  if (run.thr !== null && !run.ceiling) s += `<line class="thr" x1="${L}" x2="${W - R}" y1="${y(run.thr)}" y2="${y(run.thr)}"/>`;
  const rv = new Set(run.revAt || []);
  tr.forEach((t, i) => { s += `<circle class="${t.c ? 'c1' : 'c0'}" cx="${x(i)}" cy="${y(t.d)}" r="2.6"/>`; if (rv.has(i)) s += `<circle class="rv" cx="${x(i)}" cy="${y(t.d)}" r="5"/>`; });
  return s + '</svg>';
}
function viewSessHtml(s, src) {
  const runs = (s.runs || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  const P = s.P || snapP(PR);
  const vs = s.build?.verified?.status, df = s.build?.differ;
  const vf = (vs === 'pass' || vs === 'pass-code' ? `<span class="good">${esc(VERIFIED_TXT[vs])}</span>` : s.build?.sha256 ? esc(VERIFIED_TXT[vs] || '검산 기록과 다른 코드') + (s.build.verified?.differ?.length ? ` (${esc(s.build.verified.differ.join(', '))})` : '') : '코드 확인 못 함(파일로 연 화면 등)')
    + (df && df.length ? ` · 화면이 받은 파일 ≠ 서버 파일: ${esc(df.join(', '))}` : '');
  const rowsH = runs.map(r => {
    const v = verdict(r), rp = replayCheck(r, r.P || P), rm = rmsCheck(r);
    const pos = [0, 1, 2].map(k => { const tt = (r.trials || []).filter(t => t.tg === k); return tt.length ? `${tt.filter(t => t.c).length}/${tt.length}` : '-'; }).join(' · ');
    return `<tr><td>${r.round || 1}${r.extra ? '+' : ''}</td><td>${r.fm}</td><td>${r.thr ?? ''}</td><td>${esc(v.main)}</td><td>${r.ceiling ? '재지 못함' : r.atChance ? '우연 수준' : r.incomplete ? '미완' : ''}</td>
      <td>${r.k0}/${r.n0}${r.pChance !== null && r.pChance !== undefined ? ` (p ${(+r.pChance).toFixed(3)})` : ''}</td><td>${r.sd ?? ''}</td><td>${r.nTrials}</td><td>${r.nDunno}</td><td>${r.durS !== undefined ? (r.durS / 60).toFixed(1) : ''}</td>
      <td class="${rp.ok ? 'good' : 'bad'}">${rp.ok ? '같음' : esc(rp.why)}</td><td class="${rm.ok ? 'good' : 'bad'}">${rm.ok ? '같음' : `차 ${rm.worst} dB${rm.scaled ? ` · 줄임 ${rm.scaled}` : ''}`}</td><td>${pos}</td></tr>`;
  }).join('');
  const ab = (s.events || []).filter(e => e.type === 'track-abandoned').length, gaps = (s.events || []).filter(e => e.type === 'keep-gap-start').length;
  const meta = [`${esc(localTime(s.start))} – ${s.end ? esc(localTime(s.end)) : '끝 없음'}`, esc(s.endReason || ''), `앱 ${esc(s.app || '')}`, vf,
    `표본화 ${s.env?.audio?.sampleRate ?? '?'} Hz`, `볼륨 ${s.osVolume ?? '모름'}`, `연습 ${(s.practiceTrials || []).length}번`, ab ? `버린 측정 ${ab}` : '', gaps ? `<span class="bad">출력 끊김 ${gaps}번</span>` : '',
    s.focusEnd ? `집중 ${esc(FOCUS[s.focusEnd] || s.focusEnd)}` : '', s.info && (s.info.age || s.info.ciYears || s.info.onset || s.info.maker) ? `나이 ${esc(s.info.age || '-')} · 사용 ${esc(s.info.ciYears || '-')} · 시작 ${esc(s.info.onset || '-')} · 회사 ${esc(s.info.maker || '-')}` : '',
    s.info?.note ? `메모: ${esc(s.info.note)}` : '', src ? `파일 ${esc(src)}` : ''].filter(Boolean).join(' · ');
  return `<div class="card vsess"><h3>${esc(s.code || '번호 없음')} · ${esc(EAR[s.ear] || s.ear || '')} · ${esc(PATH[s.path] || s.path || '')}</h3><p class="meta">${meta}</p>
    <div class="tablewrap"><table class="tbl dense"><tr><th>바퀴</th><th>Hz</th><th>역치 dB</th><th>깊이</th><th>표시</th><th>0 dB 맞힘</th><th>반전 SD</th><th>시행</th><th>모르겠음</th><th>분</th><th>계단 다시</th><th>구간 세기</th><th>자리별 맞힘 1·2·3</th></tr>${rowsH}</table></div>
    ${chartHtml(s)}
    <div class="stairs">${runs.map(r => `<figure>${stairSvg(r)}<figcaption>${r.fm} Hz · ${r.round || 1}바퀴${r.extra ? '(더)' : ''} · ${esc(verdict(r).main)}</figcaption></figure>`).join('')}</div></div>`;
}
function renderViewer() {
  $('#vList').innerHTML = VIEW.sessions.map(x => viewSessHtml(x.s, x.src)).join('');
  $('#vCsvRuns').disabled = $('#vCsvTrials').disabled = !VIEW.sessions.length;
}
$('#vFiles').addEventListener('change', async e => {
  const files = [...(e.target.files || [])];
  let n = 0; const bad = [];
  for (const f of files) {
    try {
      const o = JSON.parse(await f.text());
      if (!o || o.format !== FORMAT || !Array.isArray(o.sessions)) throw new Error('이 검사의 결과 파일이 아님');
      for (const s of o.sessions) if (!VIEW.sessions.some(x => x.s.id === s.id)) { VIEW.sessions.push({ s, src: f.name }); n++; }
    } catch (err) { bad.push(`${f.name}: ${err.message || err}`); }
  }
  e.target.value = '';
  $('#vState').textContent = `검사 ${n}개를 열었습니다.` + (bad.length ? ` 열지 못한 파일: ${bad.join(' / ')}` : '');
  renderViewer();
});
$('#vLocal').onclick = () => {
  let n = 0;
  for (const s of DB.sessions) if ((s.runs || []).length && !VIEW.sessions.some(x => x.s.id === s.id)) { VIEW.sessions.push({ s, src: '이 기기' }); n++; }
  $('#vState').textContent = `이 기기의 검사 ${n}개를 열었습니다.`;
  renderViewer();
};
$('#vHome').onclick = () => { renderHome(); showPage('pgHome'); };
const csvCell = v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
$('#vCsvRuns').onclick = () => {
  const head = ['파일', '번호', '귀', '듣는방법', '볼륨', '회기', '회기시작', '앱', 'build', '검산', '바퀴', '더', '순서', '변조Hz', '역치dB', '깊이%', '재지못함', '미완', '0dB시행', '0dB맞힘', '우연p', '우연수준',
    '반전SD', '시행수', '모르겠음', '걸린초', '앞쉬는초', '표본화Hz', '출력지연ms', '계단다시', '구간세기차dB', '출력끊김', '절차', '나이', '사용기간', '난청시작', '회사', '집중', '받은파일다름'];
  const lines = [head.join(',')];
  for (const { s, src } of VIEW.sessions) for (const r of (s.runs || [])) {
    const rp = replayCheck(r, r.P || s.P || snapP(PR)), rm = rmsCheck(r);
    lines.push([src, s.code, EAR[s.ear] || s.ear, PATH[s.path] || s.path, s.osVolume, s.id, s.start, s.app, s.build?.sha256, s.build?.verified?.status, r.round, r.extra ? 1 : 0, r.order, r.fm, r.thr,
      r.thr === null || r.ceiling ? '' : pct(r.thr).toFixed(1), r.ceiling ? 1 : 0, r.incomplete ? 1 : 0, r.n0, r.k0, r.pChance === null || r.pChance === undefined ? '' : (+r.pChance).toFixed(4), r.atChance ? 1 : 0,
      r.sd, r.nTrials, r.nDunno, r.durS, r.breakBeforeS, r.audio?.sampleRate, r.audio?.outputLatencyMs, rp.ok ? 1 : 0, rm.worst, (r.keepMonitor?.gaps || []).length + (r.keepMonitor?.openAtEnd ? 1 : 0), s.procKey,
      s.info?.age, s.info?.ciYears, s.info?.onset, s.info?.maker, s.focusEnd, (s.build?.differ || []).join(' ')].map(csvCell).join(','));
  }
  download(`TMTF_runs_${stamp()}.csv`, '﻿' + lines.join('\n'), 'text/csv');
};
$('#vCsvTrials').onclick = () => {
  const head = ['파일', '번호', '귀', '회기', '측정순서', '바퀴', '변조Hz', '시행', '일시', '깊이dB', '정답구간', '답구간', '정오', '모르겠음', '입력', '반응ms', '씨앗들', '변조위상', '구간RMSdBFS', '구간봉우리dBFS',
    '앞무음s', '예약늦음', '출력지연ms', '불빛어긋남ms', '화면가려짐', '다시들려준횟수', '이른입력', '시행사건', '반전', '반전번호', '역치에쓴반전', '출력확인후ms', '출력끊김중'];
  const lines = [head.join(',')];
  for (const { s, src } of VIEW.sessions) for (const r of (s.runs || [])) {
    const revAt = r.revAt || [], nRev = revAt.length, nUse = r.ceiling || r.thr === null ? 0 : Math.min((r.P || s.P || PR).avgLast, nRev);
    (r.trials || []).forEach((t, i) => {
      const ri = revAt.indexOf(i);
      lines.push([src, s.code, EAR[s.ear] || s.ear, s.id, r.order, r.round, r.fm, i + 1, t.at, t.d, t.tg + 1, t.a + 1, t.c, t.u || 0, t.inp, t.rt, (t.seeds || []).join(' '), t.phase ?? '',
        (t.rms || []).join(' '), (t.pk || []).join(' '), t.lead ?? '', t.late ? 1 : 0, t.latMs ?? '', t.drift ?? '', t.hid ? 1 : 0, t.rep ?? '', t.early ?? '',
        (t.ev || []).map(e => e.type + (e.key !== undefined ? ':' + e.key : '') + (e.answer ? ':' + e.answer : '')).join(' '),
        ri < 0 ? 0 : 1, ri < 0 ? '' : ri + 1, ri < 0 ? '' : (ri + 1 > nRev - nUse ? 1 : 0), t.kOk ?? '', t.kGap === undefined ? '' : t.kGap ? 1 : 0].map(csvCell).join(','));
    });
  }
  download(`TMTF_trials_${stamp()}.csv`, '﻿' + lines.join('\n'), 'text/csv');
};

/* ───────────── 처음 ───────────── */
loadStore();
closeOrphans();
if (LINK.code) $('#codeIn').value = LINK.code;
$('#fmInfo').textContent = `검사할 떨림 빠르기: ${PLAN_FMS.join(' · ')} Hz${LINK.fms ? ' (받은 링크에 적힌 값)' : ''}`;
renderHome();
(async () => { BUILD_LOAD = await computeBuild('force-cache'); })();
