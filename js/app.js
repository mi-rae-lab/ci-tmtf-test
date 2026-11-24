// 소리 떨림 검사 (TMTF) — 참가자용 화면 · 기록 · 검사 흐름 (Claude, 2026-11-24)
// 자극 · 계단은 js/protocols.js · js/stim.js · js/track.js 를 그대로 씀 (Lean 4 · 따로 짠 파이썬과 대조한 코드 — tools/ · 방법.md).
// 절차는 하나로 고정: protocols.js ‘직접 정하기’ 의 3구간 · 광대역 잡음 · 0.5 s · 쉼 0.5 s · 무작위 변조 위상 · 10 ms 직선 경사 · 흔들기 없음 ·
//   Won 규칙(0 dB 에서 시작, 반전 4번까지 4 dB, 그 뒤 2 dB, 반전 14번 중 마지막 10번 평균) · 0 dB 에서 4번 틀리면 멈춤 · 맞음/틀림 바로 보임.
// 기록은 이 기기 브라우저(localStorage)에만 — 참가자가 ‘결과 파일 저장’을 눌러야 파일로 나감. 서버로 보내는 것은 없음.
'use strict';

const APP_VERSION = '1.2.0 (2026-11-24)';   // 1.2.0: 18 Hz 연결 유지 신호(tone18all)·실제 출력 18 Hz 감시·네 번 소리 점검(3초×2회)·formatVersion 2
const APP_FILES = ['index.html', 'style.css', 'js/protocols.js', 'js/stim.js', 'js/track.js', 'js/app.js'];   // build 해시 (tools/run_checks.py 와 같은 목록)
const FORMAT = 'ci-tmtf-public';
const FORMAT_VERSION = 2;
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
const localTime = t => { try { return new Date(t).toLocaleString(LANG === 'en' ? 'en-US' : 'ko-KR'); } catch { return String(t); } };

/* ───────────── HTTPS 보안 연결 확인 ───────────── */
const isLocalHost = h => {
  const s = String(h || '').toLowerCase();
  return s === 'localhost' || s === '127.0.0.1' || s === '[::1]' || s === '::1';
};
function httpsRedirectUrl(loc = location) {
  if (!loc || loc.protocol !== 'http:') return null;
  const host = loc.hostname || String(loc.host || '').split(':')[0];
  if (!host || isLocalHost(host)) return null;
  return 'https://' + (loc.host || host) + (loc.pathname || '/') + (loc.search || '') + (loc.hash || '');
}
function isInsecureHttp(loc = location) { return !!httpsRedirectUrl(loc); }
function isSecureOrigin(loc = location) {
  if (!loc) return false;
  if (loc.protocol === 'https:') return true;
  const host = loc.hostname || String(loc.host || '').split(':')[0];
  return loc.protocol === 'http:' && isLocalHost(host);
}
const HTTPS_UPGRADE = httpsRedirectUrl();
if (HTTPS_UPGRADE) { try { location.replace(HTTPS_UPGRADE); } catch { } }

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
const EAR_EN = { L: 'Left', R: 'Right', B: 'Both' };
const PATH = { speaker: '컴퓨터·휴대폰 스피커', headphone: '이어폰·헤드폰', wired: '유선 연결 (오디오 케이블·유선 스트리머)', bt: '블루투스 연결 (음성처리기 무선 연결)', other: '기타 방법' };
const PATH_EN = { speaker: 'Computer / phone speaker', headphone: 'Earphones / headphones', wired: 'Wired to sound processor (audio cable / wired streamer)', bt: 'Bluetooth to sound processor', other: 'Other' };
const FOCUS = { good: '잘 됨', mid: '보통', bad: '잘 안 됨' };
const FOCUS_EN = { good: 'Good', mid: 'Okay', bad: 'Hard to focus' };
const AGE_LBL = { '-19': '10대 이하', '20s': '20대', '30s': '30대', '40s': '40대', '50s': '50대', '60s': '60대', '70+': '70대 이상' };
const AGE_EN = { '-19': 'Under 20', '20s': '20s', '30s': '30s', '40s': '40s', '50s': '50s', '60s': '60s', '70+': '70+' };
const YEARS_LBL = { '<1': '1년 미만', '1-5': '1–5년', '5-10': '5–10년', '10+': '10년 이상', unknown: '모름' };
const YEARS_EN = { '<1': 'Under 1 year', '1-5': '1–5 years', '5-10': '5–10 years', '10+': 'Over 10 years', unknown: 'Not sure' };
const ONSET_LBL = { pre: '말을 배우기 전', post: '말을 배운 뒤', unknown: '모름' };
const ONSET_EN = { pre: 'Before learning speech', post: 'After learning speech', unknown: 'Not sure' };
const MAKER_LBL = { cochlear: '코클리어', medel: '메드엘', ab: '어드밴스드 바이오닉스', oticon: '오티콘', todoc: '토닥', other: '기타', unknown: '모름' };
const MAKER_EN = { cochlear: 'Cochlear', medel: 'MED-EL', ab: 'Advanced Bionics', oticon: 'Oticon', todoc: 'TODOC', other: 'Other', unknown: 'Not sure' };
function snapP(P) {
  return { id: P.id, nAFC: P.nAFC, dur: P.dur, isi: P.isi, rampMs: P.rampMs, rampShape: P.rampShape, band: P.band, phase: P.phase, startDb: P.startDb,
    bigUntil: P.bigUntil, big: P.big, small: P.small, totalRev: P.totalRev, avgLast: P.avgLast, ceiling: P.ceiling, rove: P.rove || 0, leadS: LEAD_S, feedback: !!P.feedback };
}

/* ───────────── 링크로 받는 값 (?id=P02&hz=10,50,100&lang=en) ───────────── */
const QS = (() => { try { return new URLSearchParams(location.search || ''); } catch { return new URLSearchParams(''); } })();
let LANG = /^en\b/i.test(QS.get('lang') || '') ? 'en' : 'ko';
const tx = (ko, en) => LANG === 'en' ? en : ko;
const earName = k => (LANG === 'en' ? EAR_EN[k] : EAR[k]) || k || '';
const pathName = k => (LANG === 'en' ? PATH_EN[k] : PATH[k]) || k || '';
const focusName = k => (LANG === 'en' ? FOCUS_EN[k] : FOCUS[k]) || k || '';
function inAppBrowser(ua = navigator.userAgent) {
  const s = String(ua || '');
  if (/KAKAOTALK/i.test(s)) return tx('카카오톡', 'KakaoTalk');
  if (/NAVER\(/i.test(s) || /\bNAVER\b/i.test(s)) return tx('네이버 앱', 'Naver app');
  if (/Instagram/i.test(s)) return tx('인스타그램', 'Instagram');
  if (/FBAN|FBAV/i.test(s)) return tx('페이스북', 'Facebook');
  if (/Line\//i.test(s)) return tx('라인', 'LINE');
  if (/DaumApps/i.test(s)) return tx('다음 앱', 'Daum app');
  if (/Everytime/i.test(s)) return tx('에브리타임', 'Everytime');
  return null;
}
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
let DB = { format: FORMAT, formatVersion: FORMAT_VERSION, sessions: [], decisions: [] };
const STORE = { ok: true, error: null, blocked: false, moved: null, bytes: 0 };
const STORE_WARN_BYTES = 3 * 1024 * 1024;
let saveTimer = null, saveDirty = false;
function loadStore() {
  let raw = null;
  try { raw = localStorage.getItem(STORE_KEY); } catch (e) { STORE.ok = false; STORE.error = String(e && e.name || e); return; }
  if (!raw) return;
  STORE.bytes = raw.length * 2;
  try {
    const o = JSON.parse(raw);
    if (!o || !Array.isArray(o.sessions)) throw new Error('형식이 다름');
    DB = { ...DB, ...o, formatVersion: FORMAT_VERSION, sessions: o.sessions, decisions: Array.isArray(o.decisions) ? o.decisions : [] };
  } catch {
    // 읽지 못한 기록은 지우지 않고 다른 이름으로 옮겨 둠 — 옮기지 못하면 덮어쓰지 않도록 저장을 막음
    const k = STORE_KEY + '.unreadable.' + Date.now();
    try { localStorage.setItem(k, raw); STORE.moved = k; } catch { STORE.blocked = true; }
    STORE.error = '전에 저장된 기록을 읽지 못했습니다';
  }
}
function saveStore() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  saveDirty = false;
  if (STORE.blocked) return false;
  try {
    const raw = JSON.stringify(DB);
    const wasHigh = STORE.bytes >= STORE_WARN_BYTES;
    localStorage.setItem(STORE_KEY, raw);
    STORE.bytes = raw.length * 2;
    if (!STORE.ok || (!wasHigh && STORE.bytes >= STORE_WARN_BYTES)) { STORE.ok = true; STORE.error = null; renderEnvWarn(); }
    return true;
  } catch (e) { STORE.ok = false; STORE.error = String(e && e.name || e); renderEnvWarn(); return false; }
}
// 시행 중 잦은 저장은 피드백 대기 시간(150 ms)으로 묶어 응답 지연 감소 — 창 닫힘 · 숨김 시 즉시 저장
function scheduleSave(ms = 150) {
  saveDirty = true;
  if (saveTimer) return;
  saveTimer = setTimeout(() => { saveTimer = null; if (saveDirty) saveStore(); }, ms);
}
function flushSave() { if (saveDirty) saveStore(); }
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
    const recP = fetch('검증_통과.json', { cache: 'no-store' })
      .then(async r => r.ok ? { rec: await r.json(), err: null } : { rec: null, err: 'http ' + r.status })
      .catch(e => ({ rec: null, err: String(e && e.message || e) }));
    const fileRes = await Promise.all(APP_FILES.map(async f => {
      const r = await fetch(assetUrl(f, mode), { cache: mode });
      if (!r.ok) return { f, err: `${f}: ${r.status}` };
      const buf = await r.arrayBuffer();
      const sha = await sha256Hex(buf);
      const ver = f === 'js/app.js' ? (/const APP_VERSION = '([^']+)'/.exec(new TextDecoder().decode(buf)) || [])[1] || null : null;
      return { f, sha, ver, err: null };
    }));
    const bad = fileRes.find(x => x.err);
    if (bad) return { ok: false, error: bad.err, mode };
    const files = {};
    let version = null;
    for (const x of fileRes) {
      files[x.f] = x.sha;
      if (x.f === 'js/app.js') version = x.ver;
    }
    const [whole, recOut] = await Promise.all([
      sha256Hex(new TextEncoder().encode(Object.keys(files).sort().map(k => `${k}:${files[k]}\n`).join(''))),
      recP,
    ]);
    const verified = recOut.rec ? verifyBuild(recOut.rec, whole, files) : { status: 'no-record', error: recOut.err };
    return { ok: true, buildSha256: whole, files, version, verified, passRec: recOut.rec, at: iso(), mode };
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
const STALE_MSG = '프로그램이 새 버전으로 업데이트되었습니다.\n화면을 새로고침한 뒤 다시 시작해 주세요.';

/* ───────────── 소리 · 18 Hz 연결 유지 신호 ───────────── */
const KEEP_HZ = 18;
const KEEP_DBFS = -45;          // 꼭대기 −45 dBFS = 진폭 0.005623 (RMS −48 dBFS, 자극보다 22 dB 낮음)
const KEEP_TOL_DB = 1.5;        // 실제 출력 18 Hz 허용 오차 (−45 ± 1.5 dBFS)
const KEEP_WARMUP_MS = 3000;    // 유지 신호를 막 켠 직후 장치 안정 대기 (3초)
let ctx = null, master = null, live = [], mon = null, AUDIO_ERR = null;
let keep = null, keepMode = 'tone18all', keepUserOff = false;   // 기본: tone18all (시행 중에도 계속)
const keepKindOf = m => (m === 'tone18all' || m === 'tone18') ? 'tone18' : null;
const effectiveKeepMode = () => keepUserOff ? 'off' : keepMode;
const wins = [];   // 소리 버퍼가 나가는 [t0, tEnd] — 출력 확인이 그 동안은 ‘버퍼’ 로 봄
function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) throw new Error('이 브라우저는 소리를 만들 수 없습니다 (AudioContext 없음)');
    try { ctx = new AC({ latencyHint: 'interactive' }); } catch { ctx = new AC(); }
    master = ctx.createGain(); master.connect(ctx.destination);
    try { mon = ctx.createAnalyser(); mon.fftSize = 32768; master.connect(mon); } catch { mon = null; }
    ctx.onstatechange = () => { try { keepMonTick(); } catch { } };
  }
  if (ctx.state !== 'running') { try { const p = ctx.resume(); if (p && p.catch) p.catch(() => { }); } catch { } }
  return ctx;
}
function audioOk() {
  try { audio(); return true; }
  catch (e) { AUDIO_ERR = String(e && e.message || e); renderEnvWarn(); alert('이 브라우저에서는 소리를 재생할 수 없습니다. 최신 버전의 크롬·엣지·사파리로 열어 주세요.'); return false; }
}
function keepStart(when) {
  const kind = keepKindOf(keepMode);
  if (!kind || keepUserOff) return;
  // 같은 방식이 지금 나오고 있으면 그대로 — 다시 켜면 발진기가 끊겼다 새로 시작함
  if (when === undefined && keep && ctx && keep.kind === kind && keep.from <= ctx.currentTime + 0.005) return;
  if (keep) { try { keep.node.stop(0); } catch { } keep = null; }
  if (!ctx) return;
  const t = Math.max(when ?? 0, ctx.currentTime);
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.value = KEEP_HZ;
  g.gain.value = 10 ** (KEEP_DBFS / 20);
  o.connect(g); g.connect(master); o.start(t);
  const wall = new Date(Date.now() + (t - ctx.currentTime) * 1000).toISOString();
  const perf = performance.now() + (t - ctx.currentTime) * 1000;
  keep = { node: o, gain: g, kind, from: t, wall, perf };
  if (when === undefined) {
    if (!KEEPMON.firstKeepAt) KEEPMON.firstKeepAt = wall;
    if (KEEPMON.keepWarmSince === null) KEEPMON.keepWarmSince = perf;
    renderKeepUi();
  }
}
function keepStop(when) {
  if (keep) { try { keep.node.stop(when === undefined ? 0 : Math.max(when, ctx.currentTime)); } catch { } keep = null; }
  if (when === undefined) { KEEPMON.keepWarmSince = null; renderKeepUi(); }
}
const keepState = () => keep ? { kind: keep.kind, since: keep.from, wall: keep.wall, mode: keepMode, duringTrials: keepMode === 'tone18all', hz: KEEP_HZ, dbfs: KEEP_DBFS } : null;
function setKeepMode(m) {
  keepMode = m;
  if (!keepKindOf(m)) keepStop();
  else if (ctx && !keepUserOff) keepStart();
  renderKeepUi();
}
function keepWarmupRemainMs() {
  if (keepUserOff || !keepKindOf(keepMode) || KEEPMON.keepWarmSince === null) return 0;
  return Math.max(0, Math.round(KEEP_WARMUP_MS - (performance.now() - KEEPMON.keepWarmSince)));
}
function play(data, when, opt = {}) {
  const b = ctx.createBuffer(1, data.length, ctx.sampleRate);
  b.copyToChannel(data, 0);
  const s = ctx.createBufferSource(); s.buffer = b; s.connect(master); s.start(when);
  const tEnd = when + data.length / ctx.sampleRate;
  wins.push({ t0: when, tEnd }); if (wins.length > 50) wins.shift();
  // tone18: 버퍼 시작 순간 유지 신호 멈춤, 끝 순간 재개(표본 단위 틈 0) · tone18all: 멈추지 않고 master 에서 더함
  if (keepMode === 'tone18' && !keepUserOff && !opt.noKeepSwitch) { keepStop(when); keepStart(tEnd); }
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
// 네 번 소리 점검용 삑 하나 (1 kHz 1·2·3·4배음, 진폭 1/h, 120 ms, 올림 코사인 경사 앞·뒤 20 ms, RMS −24 dBFS, 꼭대기 0.89 제한)
function onsetBeep(sr, dur = 120) {
  const n = Math.round(dur / 1000 * sr), x = new Float32Array(n);
  for (let h = 1; h <= 4; h++) { const w = 2 * Math.PI * 1000 * h / sr; for (let i = 0; i < n; i++) x[i] += (1 / h) * Math.sin(w * i); }
  const up = Math.round(0.02 * sr), dn = Math.round(Math.min(0.02, dur / 4000) * sr);
  for (let i = 0; i < up && i < n; i++) x[i] *= 0.5 * (1 - Math.cos(Math.PI * i / up));
  for (let i = 0; i < dn && i < n; i++) x[n - 1 - i] *= 0.5 * (1 - Math.cos(Math.PI * i / dn));
  let ss = 0, pk = 0; for (let i = 0; i < n; i++) { ss += x[i] * x[i]; pk = Math.max(pk, Math.abs(x[i])); }
  let g = 10 ** (-24 / 20) / (Math.sqrt(ss / n) || 1); if (pk * g > 0.89) g = 0.89 / pk;
  for (let i = 0; i < n; i++) x[i] *= g;
  return x;
}
// 네 번 소리 = [30 ms 무음] 삑 [130 ms] 삑 [130 ms] 삑 [130 ms] 삑 [130 ms] — 총 1,030 ms
function fourBeeps(sr) {
  const b = onsetBeep(sr), pre = Math.round(0.03 * sr), gap = Math.round(0.13 * sr);
  const x = new Float32Array(pre + 4 * (b.length + gap));
  for (let k = 0, o = pre; k < 4; k++, o += b.length + gap) x.set(b, o);
  return x;
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
    outputLatencyMs: ctx.outputLatency !== undefined ? +(ctx.outputLatency * 1000).toFixed(1) : null, state: ctx.state, keepalive: effectiveKeepMode() };
}
function systemEnv() {
  let tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { }
  return { app: APP_VERSION, ua: navigator.userAgent, platform: navigator.userAgentData?.platform || navigator.platform || '', lang: navigator.language, uiLang: LANG, tz,
    cores: navigator.hardwareConcurrency || null, touch: navigator.maxTouchPoints || 0, screen: `${screen.width}x${screen.height}@${devicePixelRatio}`, window: `${innerWidth}x${innerHeight}`,
    origin: location.protocol === 'file:' ? 'file' : location.origin, secure: isSecureOrigin() };
}

/* ───────────── 실제 출력 18 Hz · 연속성 확인 (1초마다) ─────────────
   출력 바로 앞 분석기(32,768 표본)에서 18 Hz 한 칸 DFT(Hann 창, −45 ± 1.5 dBFS) · 오디오 상태 · 시계(1 ± 0.05)를 1초마다 확인.
   끊기면 시각 · 까닭 · 길이를 회기 사건 · 측정 · 회기에 남김. */
let mbuf = null, mcos = null, msin = null, mwin = null, mws = 0, mfs = 0, mlast = null;
function monitor(needSignal = true) {
  if (!ctx || !mon) return null;
  const N = mon.fftSize, fs = ctx.sampleRate;
  let rms = 0, db18 = null;
  if (needSignal) {
    if (!mbuf || mbuf.length !== N || mfs !== fs) {
      mbuf = new Float32Array(N); mcos = new Float32Array(N); msin = new Float32Array(N); mwin = new Float32Array(N); mws = 0; mfs = fs;
      const w = 2 * Math.PI * KEEP_HZ / fs;
      for (let n = 0; n < N; n++) { const h = 0.5 - 0.5 * Math.cos(2 * Math.PI * n / (N - 1)); mwin[n] = h; mws += h; mcos[n] = Math.cos(w * n); msin[n] = Math.sin(w * n); }
    }
    mon.getFloatTimeDomainData(mbuf);
    let re = 0, im = 0, ss = 0;
    for (let n = 0; n < N; n++) { const x = mbuf[n], v = x * mwin[n]; re += v * mcos[n]; im += v * msin[n]; ss += x * x; }
    const amp = 2 * Math.hypot(re, im) / mws;
    rms = Math.sqrt(ss / N);
    db18 = amp > 1e-7 ? +(20 * Math.log10(amp)).toFixed(2) : null;
  }
  const now = ctx.currentTime, perf = performance.now(), winS = N / fs;
  const rate = mlast && perf - mlast.perf > 200 ? (now - mlast.ctx) / ((perf - mlast.perf) / 1000) : null;
  mlast = { ctx: now, perf };
  return { db18, rmsDb: needSignal && rms > 1e-7 ? +(20 * Math.log10(rms)).toFixed(2) : null, state: ctx.state,
    rate: rate === null ? null : +rate.toFixed(4), winS, inBuffer: wins.some(b => b.t0 < now && b.tEnd > now - winS), keep: keepState(), perf };
}
const KEEPMON = { page: uid(), since: null, polls: 0, ok: 0, buffer: 0, off: 0, gaps: [], open: null, last: null, lastOkAt: null, lastOkPerf: null,
  firstKeepAt: null, keepWarmSince: null, db18Min: null, db18Max: null };
const KEEP_RATE_TOL = 0.05;
const keepMonSnap = () => ({ page: KEEPMON.page, since: KEEPMON.since, polls: KEEPMON.polls, ok: KEEPMON.ok, buffer: KEEPMON.buffer, off: KEEPMON.off,
  gaps: KEEPMON.gaps.length, open: KEEPMON.open ? { ...KEEPMON.open } : null, lastOkAt: KEEPMON.lastOkAt });
function keepMonSince(k0) {
  const same = k0 && k0.page === KEEPMON.page, b = same ? k0 : { polls: 0, ok: 0, buffer: 0, gaps: 0 };
  return { mode: effectiveKeepMode(), polls: KEEPMON.polls - b.polls, ok: KEEPMON.ok - b.ok, buffer: KEEPMON.buffer - b.buffer,
    gaps: KEEPMON.gaps.slice(b.gaps), openAtEnd: KEEPMON.open ? { ...KEEPMON.open } : null, lastOkAt: KEEPMON.lastOkAt,
    lastDb18: KEEPMON.last?.db18 ?? null, db18Min: KEEPMON.db18Min, db18Max: KEEPMON.db18Max, spansReload: !same };
}
function keepMonTick() {
  const exp = (S || ONSET.running) ? effectiveKeepMode() : null;
  const needSig = !!(exp && keepKindOf(exp));
  const m = monitor(needSig);
  if (!m) return null;
  let cls, why = null;
  if (!exp) cls = 'off';
  else if (m.state !== 'running') { cls = 'gap'; why = `오디오가 ${m.state}`; }
  else if (m.rate !== null && Math.abs(m.rate - 1) > KEEP_RATE_TOL) { cls = 'gap'; why = `오디오 시계 ${m.rate} (실제 시간과 다름)`; }
  else if (exp === 'tone18' && m.inBuffer) cls = 'buffer';
  else if (needSig) {
    if (m.db18 !== null && Math.abs(m.db18 - KEEP_DBFS) <= KEEP_TOL_DB) cls = 'ok';
    else if (keep && (ctx.currentTime - keep.from) < m.winS + 0.05 && m.db18 !== null && m.db18 < KEEP_DBFS) cls = 'buffer';
    else { cls = 'gap'; why = m.db18 === null ? '출력에 18 Hz 없음' : `출력 18 Hz 크기 ${m.db18} dBFS`; }
  } else if (m.inBuffer) cls = 'buffer';
  else cls = 'ok';
  const at = iso();
  KEEPMON.polls++;
  if (cls !== 'gap') KEEPMON[cls]++;
  if (m.db18 !== null) {
    KEEPMON.db18Min = KEEPMON.db18Min === null ? m.db18 : Math.min(KEEPMON.db18Min, m.db18);
    KEEPMON.db18Max = KEEPMON.db18Max === null ? m.db18 : Math.max(KEEPMON.db18Max, m.db18);
  }
  if (cls === 'ok') { KEEPMON.lastOkAt = at; KEEPMON.lastOkPerf = m.perf; if (!KEEPMON.since) KEEPMON.since = at; }
  KEEPMON.last = { at, cls, why, db18: m.db18, rmsDb: m.rmsDb, rate: m.rate, state: m.state, mode: exp || effectiveKeepMode() };
  if (cls === 'gap') {
    if (!KEEPMON.open) {
      KEEPMON.open = { from: at, why, state: m.state, rate: m.rate, db18: m.db18, mode: exp, run: S?.cur && !S.cur.practice ? S.idx + 1 : null, n: 0 };
      logEv('keep-gap-start', { ...KEEPMON.open });
    }
    KEEPMON.open.n++;
  } else if (KEEPMON.open) {
    const g = { ...KEEPMON.open, to: at, durS: +((Date.parse(at) - Date.parse(KEEPMON.open.from)) / 1000).toFixed(1), endedBy: cls };
    KEEPMON.gaps.push(g); KEEPMON.open = null;
    logEv('keep-gap-end', g);
  }
  return KEEPMON.last;
}
// 회기 · 점검 중이 아니고 열린 끊김도 없을 때는 32,768샘플 오디오 복사 · 18 Hz DFT 연산을 건너뛰어 배터리 절약
const KEEPMON_TIMER = setInterval(() => { if (!S && !ONSET.running && !KEEPMON.open) return; try { keepMonTick(); } catch (e) { console.error(e); } }, 1000);

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
function showPage(id, opt = {}) {
  $$('.page').forEach(p => p.classList.toggle('on', p.id === id));
  if (!opt.noScroll) { try { window.scrollTo(0, 0); } catch { } }
  if (!opt.noFocus) {
    const pg = $('#' + id), hd = pg && (pg.querySelector('h2') || pg.querySelector('.ttl'));
    if (hd) { try { hd.setAttribute('tabindex', '-1'); hd.focus({ preventScroll: true }); } catch { } }
  }
}
function renderEnvWarn() {
  const m = [];
  const inApp = inAppBrowser();
  if (inApp) m.push(tx(`${inApp} 앱 내 브라우저에서는 결과 파일 저장이 되지 않을 수 있습니다. 메뉴에서 Safari(아이폰)나 Chrome(안드로이드)으로 열어 주세요.`, `Opening inside ${inApp} may block saving result files. Please open this link in Safari (iPhone) or Chrome (Android).`));
  if (isInsecureHttp()) m.push(tx('보안 연결(HTTPS)이 아닙니다. 주소가 https:// 로 시작하는지 확인해 주세요.', 'This connection is not HTTPS. Please make sure the address starts with https://.'));
  if (AUDIO_ERR) m.push(tx('이 브라우저에서는 소리를 재생할 수 없습니다. 최신 버전의 크롬·엣지·사파리로 열어 주세요.', 'This browser cannot play sound. Please open in the latest Chrome, Edge, or Safari.'));
  if (STORE.blocked || !STORE.ok) m.push(tx('이 브라우저는 결과를 저장하지 못합니다. 검사가 끝나면 반드시 ‘결과 파일 저장’을 눌러 주세요.', 'This browser cannot save records locally. Please be sure to tap “Save result file” when done.'));
  if (STORE.error && STORE.moved) m.push(tx('이전에 저장된 기록 하나를 읽지 못해 따로 보관했습니다.', 'An earlier saved record could not be read and was kept separately.'));
  if (STORE.bytes >= STORE_WARN_BYTES) m.push(tx('이 브라우저에 저장된 검사 기록이 많습니다. 먼저 ‘모두 파일로 저장’으로 백업해 주세요.', 'Many test records are stored in this browser. Please back them up using “Save all to file”.'));
  if (LINK.hz && String(LINK.hz).trim() && !LINK.fms) m.push(tx('링크에 적힌 떨림 속도를 읽지 못해 기본값으로 검사합니다.', 'Could not read the test rates in the link; using the default rates instead.'));
  const el = $('#envWarn'); if (!el) return;
  el.hidden = !m.length; el.innerHTML = m.map(esc).join('<br>');
}

/* ── 처음 화면 ── */
function renderFmInfo() {
  $('#fmInfo').textContent = tx(
    `검사할 떨림 속도: ${PLAN_FMS.join(' · ')} Hz${LINK.fms ? ' (안내 링크 지정)' : ''}`,
    `Flutter rates to test: ${PLAN_FMS.join(' · ')} Hz${LINK.fms ? ' (from link)' : ''}`
  );
}
function renderHome() {
  $('#homeTime').textContent = tx(`약 ${estMin(PLAN_FMS.length)}분 (중간에 쉴 수 있습니다)`, `About ${estMin(PLAN_FMS.length)} min (you can take breaks)`);
  const ss = DB.sessions.filter(s => (s.runs || []).length).slice().sort((a, b) => String(b.start).localeCompare(String(a.start)));
  $('#homeSaved').hidden = !ss.length;
  $('#homeSavedList').innerHTML = ss.slice(0, 12).map(s => `<div class="row wrap gap saved">
    <span>${esc(localTime(s.start))} · ${esc(earName(s.ear))} · ${tx(`측정 ${s.runs.length}개`, `${s.runs.length} runs`)}${s.code ? ' · ' + esc(s.code) : ''}</span>
    <button class="btn small" data-open="${esc(s.id)}">${tx('결과 보기', 'View results')}</button></div>`).join('')
    + (ss.length > 12 ? `<p class="hint">${tx(`이전 검사 ${ss.length - 12}개는 ‘모두 파일로 저장’에 포함되어 있습니다.`, `${ss.length - 12} older sessions are included in “Save all to file”.`)}</p>` : '');
  renderEnvWarn();
}
$('#homeSavedList').addEventListener('click', e => { const id = e.target?.dataset?.open; if (!id) return; const s = DB.sessions.find(x => x.id === id); if (s) showEnd(s, { offers: false }); });
$('#homeSaveAll').onclick = () => saveFile(DB.sessions.filter(s => (s.runs || []).length || (s.events || []).length), 'all');
$('#goSetup').onclick = () => { PRE.setupAt = PRE.setupAt || iso(); showPage('pgSetup'); };
$('#goViewer').onclick = () => { showPage('pgViewer'); };

/* ── 준비 ── */
const PRE = { ear: null, path: null, noise: [], demo: [], volOkAt: null, setupAt: null, keepEvents: [], warmupWaitedMs: 0, onset: null, onsetHistory: [] };
function renderKeepUi() {
  const badge = $('#keepBadge'), btn = $('#keepToggle');
  if (!badge || !btn) return;
  if (keepUserOff || !keepKindOf(keepMode)) {
    badge.className = 'pill off';
    badge.textContent = tx('꺼짐', 'Off');
    btn.textContent = tx('유지 신호 다시 켜기', 'Turn keepalive on');
    btn.setAttribute('aria-pressed', 'false');
  } else if (keep) {
    badge.className = 'pill ok';
    badge.textContent = tx('켜짐 (유지 중)', 'On (active)');
    btn.textContent = tx('유지 신호 끄기', 'Turn keepalive off');
    btn.setAttribute('aria-pressed', 'true');
  } else {
    badge.className = 'pill ok';
    badge.textContent = tx('소리 재생 시 자동 켜짐 (권장)', 'Turns on with sound (recommended)');
    btn.textContent = tx('유지 신호 끄기', 'Turn keepalive off');
    btn.setAttribute('aria-pressed', 'true');
  }
}
$('#keepToggle').onclick = () => {
  keepUserOff = !keepUserOff;
  if (keepUserOff) {
    keepStop();
    PRE.keepEvents.push({ at: iso(), action: 'user-off', mode: 'off' });
  } else {
    if (audioOk()) keepStart();
    PRE.keepEvents.push({ at: iso(), action: 'user-on', mode: keepMode });
  }
  renderKeepUi();
};
function pick(groupSel, key) {
  $(groupSel).addEventListener('click', e => {
    const b = e.target.closest ? e.target.closest('.choice') : e.target;
    if (!b || !b.dataset || !b.dataset.v) return;
    PRE[key] = b.dataset.v;
    $$(groupSel + ' .choice').forEach(x => { const on = x.dataset.v === PRE[key]; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    syncSetup();
  });
}
pick('#earPick', 'ear'); pick('#pathPick', 'path');
function syncSetup() {
  const isBt = PRE.path === 'bt';
  $('#btNote').hidden = !isBt;
  if ($('#soundBtNote')) $('#soundBtNote').hidden = !isBt;
  const ready = !!(PRE.ear && PRE.path);
  $('#setupNext').disabled = !ready; $('#setupNeed').hidden = ready;
}
$('#setupBack').onclick = () => showPage('pgHome');
$('#setupNext').onclick = () => { if (PRE.ear && PRE.path) { syncSetup(); showPage('pgSound'); } };
const optVal = id => { const v = $(id).value; return v === '' ? null : v; };
function infoNow() {
  const note = $('#infoNote').value.trim();
  return { age: optVal('#infoAge'), ciYears: optVal('#infoYears'), onset: optVal('#infoOnset'), maker: optVal('#infoMaker'), note: note || null, shown: !!$('#moreBox').open };
}

/* ── 소리 크기 ── */
let noiseTimer = null;
$('#noisePlay').onclick = () => {
  if (!audioOk()) return;
  if (!keepUserOff) keepStart();
  stopAll(); clearTimeout(noiseTimer);
  const m = stim(PRACTICE_FM, null, 10);
  play(m.data, ctx.currentTime + 0.05);
  PRE.noise.push({ at: iso(), seed: m.seed, durS: 10, rmsDb: +m.rmsDb.toFixed(3), sampleRate: ctx.sampleRate });
  $('#noiseState').textContent = tx('소리가 재생되는 중입니다 (10초)', 'Playing sound (10 s)');
  noiseTimer = setTimeout(() => { $('#noiseState').textContent = ''; }, 10200);
};
$('#noiseStop').onclick = () => { stopAll(); clearTimeout(noiseTimer); $('#noiseState').textContent = ''; const L = PRE.noise[PRE.noise.length - 1]; if (L && !L.stoppedAt) L.stoppedAt = iso(); };
function demo(mod) {
  if (!audioOk()) return;
  if (!keepUserOff) keepStart();
  stopAll(); clearTimeout(noiseTimer); $('#noiseState').textContent = '';
  const m = stim(PRACTICE_FM, mod ? 0 : null, 2);
  play(m.data, ctx.currentTime + 0.05);
  PRE.demo.push({ at: iso(), kind: mod ? 'mod' : 'flat', fm: PRACTICE_FM, depthDb: mod ? 0 : null, seed: m.seed, phase: m.phase, durS: 2 });
}
$('#demoMod').onclick = () => demo(true);
$('#demoFlat').onclick = () => demo(false);
$('#volOk').addEventListener('change', () => { PRE.volOkAt = $('#volOk').checked ? iso() : null; $('#soundNext').disabled = !$('#volOk').checked; });
$('#soundBack').onclick = () => { stopAll(); showPage('pgSetup'); };
$('#soundNext').onclick = () => {
  if (!audioOk()) return;
  stopAll(); clearTimeout(noiseTimer); $('#noiseState').textContent = '';
  if (!keepUserOff) keepStart();
  openOnsetCheck();
};

/* ───────────── 짧은 소리 점검 (네 번 소리 · 앞 무음 3초 × 2회) ───────────── */
const ONSET_GAPS = [3000, 3000];
const ONSET = { running: false, token: 0, idx: 0, phase: 'idle', trials: [], cur: null, timer: null };
const round2 = v => Math.round(v * 100) / 100;
function summarizeOnset(trials) {
  const T = trials || [], resp = T.map(t => t.resp), miss = resp.filter(v => v < 4).length;
  const grp = new Map();
  for (const t of T) { const k = t.silenceBeforeMs; if (!grp.has(k)) grp.set(k, []); grp.get(k).push(t); }
  const byGap = [...grp.entries()].sort((a, b) => a[0] - b[0]).map(([gap, a]) => ({
    gap,
    n: a.length,
    meanResp: round2(meanOf(a.map(t => t.resp))),
    miss: round2(a.filter(t => t.resp < 4).length / a.length),
    firstWeak: round2(a.filter(t => t.first === 'yes').length / a.length),
  }));
  const worst = Math.max(0, ...byGap.map(g => Math.max(g.miss, g.firstWeak)));
  const verdict = !T.length ? '건너뜀' : worst >= 0.34 ? '온셋 잘림 의심' : (miss || T.some(t => t.first === 'yes')) ? '가끔 누락' : '정상';
  return { resp, missed: miss, byGap, verdict };
}
function cancelOnsetTimer() {
  ONSET.token++;
  if (ONSET.timer) { clearTimeout(ONSET.timer); ONSET.timer = null; }
  stopAll();
}
function setOnProg(v) {
  const c = Math.max(0, Math.min(1, v));
  $('#onProgBar').style.width = (100 * c).toFixed(1) + '%';
  const w = $('#onProgWrap'); if (w) w.setAttribute('aria-valuenow', String(Math.round(c * 100)));
}
function setOnState(cls, txt) {
  const el = $('#onState'); if (!el) return;
  el.className = 'on-state' + (cls ? ' ' + cls : '');
  el.textContent = txt;
}
function setOnLocked(locked) {
  $$('#onCountPick .choice').forEach(b => { b.disabled = locked; });
  $('#onReplay').disabled = locked;
}
function openOnsetCheck() {
  cancelOnsetTimer();
  ONSET.running = true; ONSET.idx = 0; ONSET.trials = []; ONSET.cur = null; ONSET.phase = 'idle';
  $('#onsetTrialCard').hidden = false;
  $('#onsetResCard').hidden = true;
  showPage('pgOnset');
  runOnsetTrial();
}
function playOnsetBeeps(tok, isReplay) {
  ONSET.phase = 'playing';
  setOnLocked(true);
  setOnState('busy', tx('짧은 소리가 나오는 중입니다...', 'Playing short beeps...'));
  const buf = fourBeeps(ctx.sampleRate);
  play(buf, ctx.currentTime + 0.04);
  if (!isReplay) {
    ONSET.cur = { gapMs: ONSET_GAPS[ONSET.idx], replays: 0, resp: null, first: null, tEnd: null, keepAtPlay: keepState(), keepMode: effectiveKeepMode() };
  }
  const durMs = Math.round(buf.length / ctx.sampleRate * 1000) + 60;
  ONSET.timer = setTimeout(() => {
    if (ONSET.token !== tok || !ONSET.running) return;
    ONSET.timer = null;
    ONSET.phase = 'awaiting';
    if (!isReplay && ONSET.cur) ONSET.cur.tEnd = performance.now();
    setOnLocked(false);
    setOnState('ready', tx('들린 대로 선택해 주세요.', 'Please select what you heard.'));
  }, durMs);
}
function runOnsetTrial() {
  const tok = ++ONSET.token;
  if (ONSET.timer) { clearTimeout(ONSET.timer); ONSET.timer = null; }
  const gapMs = ONSET_GAPS[ONSET.idx];
  $('#onTitle').textContent = tx(`소리 점검 ${ONSET.idx + 1} / ${ONSET_GAPS.length}`, `Sound check ${ONSET.idx + 1} / ${ONSET_GAPS.length}`);
  setOnProg(ONSET.idx / ONSET_GAPS.length);
  $$('#onCountPick .choice').forEach(b => { b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); });
  $$('#onFirstPick .choice').forEach(b => { b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); });
  $('#onFirstBox').hidden = true;
  $('#onTrialNext').disabled = true;
  setOnLocked(true);
  const startWait = () => {
    ONSET.phase = 'waiting';
    setOnState('busy', tx(`${gapMs / 1000}초 동안 조용히 기다린 뒤 짧은 소리가 나옵니다...`, `Waiting ${gapMs / 1000} s quietly before the beeps...`));
    ONSET.timer = setTimeout(() => {
      if (ONSET.token !== tok || !ONSET.running) return;
      ONSET.timer = null;
      playOnsetBeeps(tok, false);
    }, gapMs);
  };
  const warm = ONSET.idx === 0 ? keepWarmupRemainMs() : 0;
  if (warm > 0) {
    ONSET.phase = 'warmup';
    setOnState('busy', tx('소리가 안정될 때까지 잠시 기다립니다 (3초)...', 'Warming up audio (3 s)...'));
    ONSET.timer = setTimeout(() => {
      if (ONSET.token !== tok || !ONSET.running) return;
      ONSET.timer = null;
      PRE.warmupWaitedMs = (PRE.warmupWaitedMs || 0) + warm;
      startWait();
    }, warm);
  } else startWait();
}
function commitOnsetTrial() {
  if (!ONSET.running || !ONSET.cur || ONSET.cur.resp === null) return;
  if (ONSET.cur.resp > 0 && !ONSET.cur.first) return;
  const c = ONSET.cur;
  ONSET.trials.push({
    presented: 4,
    resp: c.resp,
    first: c.resp > 0 ? c.first : null,
    silenceBeforeMs: c.gapMs,
    rt: c.tEnd !== null ? Math.round(performance.now() - c.tEnd) : 0,
    replays: c.replays,
    keepalive: { mode: c.keepMode, active: !!c.keepAtPlay, db18: KEEPMON.last?.db18 ?? null },
    at: iso(),
  });
  ONSET.cur = null;
  ONSET.idx++;
  if (ONSET.idx < ONSET_GAPS.length) { runOnsetTrial(); return; }
  ONSET.running = false; ONSET.phase = 'done';
  setOnProg(1);
  PRE.onset = {
    skipped: false,
    gaps: ONSET_GAPS.slice(),
    keepaliveMode: effectiveKeepMode(),
    keepaliveAtStart: keepState(),
    trials: ONSET.trials.slice(),
    summary: summarizeOnset(ONSET.trials),
    completedAt: iso(),
  };
  $('#onsetTrialCard').hidden = true;
  $('#onsetResCard').hidden = false;
  renderOnsetResult();
}
function renderOnsetResult() {
  const o = PRE.onset; if (!o || !o.summary) return;
  const msgEl = $('#onResMsg'), listEl = $('#onResList');
  const hasZero = o.trials.some(t => t.resp === 0);
  const v = o.summary.verdict;
  if (hasZero) {
    msgEl.className = 'on-res warn';
    msgEl.textContent = tx('소리가 들리지 않은 것으로 보입니다. 기기 연결과 볼륨, 무음 스위치를 확인해 주세요.',
      'It looks like no sound was heard. Please check your connection, volume, and silent switch.');
  } else if (v === '온셋 잘림 의심' || v === '가끔 누락') {
    msgEl.className = 'on-res warn';
    msgEl.textContent = tx('소리 앞부분이 잘리는 것으로 보입니다. 가능하면 유선 연결이나 스피커를 사용해 주세요. 그대로 진행하셔도 됩니다.',
      'The start of sounds may be getting cut off. Use a wired connection or speaker if possible, though you may still continue.');
  } else {
    msgEl.className = 'on-res ok';
    msgEl.textContent = tx('짧은 소리가 모두 정상적으로 들렸습니다. 이제 연습을 시작하시면 됩니다.',
      'All four short beeps were heard clearly. You are ready to start practice.');
  }
  const fTxt = f => f === 'yes' ? tx('첫 소리 약함/짧음', 'first softer/shorter')
    : f === 'no' ? tx('첫 소리 같음', 'first normal')
    : f === 'unsure' ? tx('첫 소리 모르겠음', 'first unsure') : tx('소리 안 들림', 'no sound');
  listEl.innerHTML = o.trials.map((t, i) => `<li>${tx(`${i + 1}회 (${t.silenceBeforeMs / 1000}초 대기): ${t.resp}개 들림 · ${fTxt(t.first)}`,
    `Check ${i + 1} (${t.silenceBeforeMs / 1000} s wait): ${t.resp} heard · ${fTxt(t.first)}`)}${t.replays ? tx(` · 다시 듣기 ${t.replays}회`, ` · replayed ${t.replays}x`) : ''}</li>`).join('');
}
$('#onCountPick').addEventListener('click', e => {
  const b = e.target.closest ? e.target.closest('.choice') : e.target;
  if (!b || b.disabled || !b.dataset || b.dataset.v === undefined || !ONSET.running || ONSET.phase !== 'awaiting' || !ONSET.cur) return;
  const val = Number(b.dataset.v);
  ONSET.cur.resp = val;
  $$('#onCountPick .choice').forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
  if (val === 0) { ONSET.cur.first = null; $('#onFirstBox').hidden = true; commitOnsetTrial(); return; }
  $('#onFirstBox').hidden = false;
  $('#onTrialNext').disabled = !ONSET.cur.first;
});
$('#onFirstPick').addEventListener('click', e => {
  const b = e.target.closest ? e.target.closest('.choice') : e.target;
  if (!b || !b.dataset || !b.dataset.v || !ONSET.running || ONSET.phase !== 'awaiting' || !ONSET.cur) return;
  ONSET.cur.first = b.dataset.v;
  $$('#onFirstPick .choice').forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
  $('#onTrialNext').disabled = false;
});
$('#onTrialNext').onclick = () => commitOnsetTrial();
$('#onReplay').onclick = () => {
  if (!ONSET.running || ONSET.phase !== 'awaiting' || !ONSET.cur) return;
  ONSET.cur.replays++;
  const tok = ++ONSET.token;
  playOnsetBeeps(tok, true);
};
$('#onsetSkip').onclick = () => {
  cancelOnsetTimer();
  ONSET.running = false; ONSET.phase = 'idle';
  PRE.onset = {
    skipped: true,
    gaps: ONSET_GAPS.slice(),
    keepaliveMode: effectiveKeepMode(),
    keepaliveAtStart: keepState(),
    trials: ONSET.trials.slice(),
    summary: summarizeOnset(ONSET.trials),
    skippedAt: iso(),
  };
  startSession();
};
$('#onsetBack').onclick = () => {
  cancelOnsetTimer();
  ONSET.running = false; ONSET.phase = 'idle';
  if (PRE.onset) { PRE.onsetHistory.push(PRE.onset); PRE.onset = null; }
  showPage('pgSound');
};
$('#onsetAgain').onclick = () => {
  if (PRE.onset) { PRE.onsetHistory.push(PRE.onset); PRE.onset = null; }
  openOnsetCheck();
};
$('#onsetStart').onclick = () => { startSession(); };

/* ───────────── 검사 진행 ───────────── */
let S = null;
function logEv(type, detail = {}) { if (S?.session) { S.session.events.push({ t: iso(), s: +((performance.now() - S.t0) / 1000).toFixed(2), type, ...detail }); S.session.updated = iso(); } }
async function startSession() {
  if (S) return;
  if (!audioOk()) return;
  if (!keepUserOff) keepStart();
  cancelOnsetTimer(); ONSET.running = false; ONSET.phase = 'idle';
  stopAll(); clearTimeout(noiseTimer); $('#noiseState').textContent = '';
  $('#soundNext').disabled = true;
  $('#onsetSkip').disabled = true; $('#onsetStart').disabled = true;
  const bi = await computeBuild('no-store');
  $('#soundNext').disabled = !$('#volOk').checked;
  $('#onsetSkip').disabled = false; $('#onsetStart').disabled = false;
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
  const warmRemain = keepWarmupRemainMs();
  if (warmRemain > 0) {
    await new Promise(r => setTimeout(r, warmRemain));
    PRE.warmupWaitedMs = (PRE.warmupWaitedMs || 0) + warmRemain;
  }
  const osv = $('#osVol').value.trim();
  const onsetSnap = PRE.onset ? { ...PRE.onset, retries: PRE.onsetHistory.slice() }
    : { skipped: true, gaps: ONSET_GAPS.slice(), keepaliveMode: effectiveKeepMode(), keepaliveAtStart: keepState(), trials: [], summary: summarizeOnset([]), retries: PRE.onsetHistory.slice() };
  const session = {
    id: uid(), format: FORMAT, formatVersion: FORMAT_VERSION, app: APP_VERSION, start: iso(), end: null, endReason: null, updated: iso(),
    code: cleanCode($('#codeIn').value) || null, ear: PRE.ear, path: PRE.path, osVolume: osv === '' || !isFinite(+osv) ? null : +osv, info: infoNow(),
    proto: PR.id, procKey: PROC_KEY, cond: { ...COND }, P: snapP(PR),
    fmsPlan: PLAN_FMS.slice(), link: { search: location.search || '', code: LINK.code || null, hz: LINK.hz ?? null, hzUsed: !!LINK.fms },
    plan: [], rounds: [], practiceFm: PRACTICE_FM, practiceN: PRACTICE_N, practiceTrials: [], practiceRounds: 0,
    runs: [], events: [], decisions: [], current: null,
    setup: { setupAt: PRE.setupAt, noise: PRE.noise.slice(), demo: PRE.demo.slice(), volOkAt: PRE.volOkAt },
    keepalive: { mode: effectiveKeepMode(), configMode: keepMode, userOff: keepUserOff, hz: KEEP_HZ, dbfs: KEEP_DBFS,
      stateAtStart: keepState(), warmupWaitedMs: PRE.warmupWaitedMs || 0, toggles: PRE.keepEvents.slice() },
    onsetCheck: onsetSnap,
    env: { ...systemEnv(), audio: audioEnv() },
    build: { sha256: base ? base.buildSha256 : null, verified: run0 ? runVerified : base ? base.verified : null, from: run0 ? 'load' : base ? 'server' : null,
      running: pack(BUILD_LOAD, runVerified), server: pack(bi), differ },   // differ: 화면이 받은 파일 ≠ 서버 파일 (null = 비교 못 함)
    buildAtLoad: BUILD_LOAD?.ok ? BUILD_LOAD.buildSha256 : null,
    keepMonAtStart: null, keepMonitor: null, focusEnd: null, focusEndShown: false,
  };
  DB.sessions.push(session);
  // 다음 회기는 소리 크기 확인부터 다시 (귀 · 듣는 방법 · 유지 신호 발진기는 그대로 유지)
  PRE.noise = []; PRE.demo = []; PRE.volOkAt = null; PRE.setupAt = null; PRE.keepEvents = []; PRE.warmupWaitedMs = 0; PRE.onset = null; PRE.onsetHistory = [];
  $('#volOk').checked = false; $('#soundNext').disabled = true;
  JUST = null;
  S = { session, plan: [], idx: 0, cur: null, token: null, t0: performance.now(), lastEnd: null, practiceRound: 0, offer: null };
  mlast = null;
  session.keepMonAtStart = keepMonSnap();
  addRound(PLAN_FMS, false);
  logEv('session-start', { fms: PLAN_FMS.slice(), practiceN: PRACTICE_N, keepalive: session.keepalive.mode, onsetVerdict: onsetSnap.summary?.verdict ?? null,
    build: session.build.sha256, verified: session.build.verified?.status ?? null, differ });
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
const IV_BTNS = $$('.iv');
function setTitle(t) { $('#tTitle').textContent = t; }
function setProg(v) {
  const c = Math.max(0, Math.min(1, v));
  $('#progBar').style.width = (100 * c).toFixed(1) + '%';
  const w = $('#progWrap'); if (w) w.setAttribute('aria-valuenow', String(Math.round(c * 100)));
}
function setFb(cls, t) { const el = $('#fb'); el.className = 'fb' + (cls ? ' ' + cls : ''); el.textContent = t; }
function startPractice() {
  S.practiceRound++; S.session.practiceRounds = S.practiceRound;
  S.cur = { practice: true, fm: PRACTICE_FM, left: PRACTICE_N, k: 0, u: 0, startIso: iso(), startPt: performance.now(), replays: 0, phase: 'idle', keepMonAtStart: keepMonSnap() };
  logEv('practice-start', { fm: PRACTICE_FM, n: PRACTICE_N, round: S.practiceRound });
  showPage('pgTest'); setTitle(tx(`연습 1 / ${PRACTICE_N}`, `Practice 1 / ${PRACTICE_N}`)); setProg(0);
  $('#tNote').textContent = tx('연습 결과는 최종 기록에 포함되지 않습니다.', 'Practice trials are not counted in your results.');
  nextTrial();
}
function trackTitle() {
  const item = S.plan[S.idx], inRound = S.plan.filter(x => x.round === item.round), k = inRound.indexOf(item) + 1;
  const head = item.extra ? tx('한 번 더', 'Extra check') : item.round > 1 ? tx(`${item.round}차 검사`, `Round ${item.round}`) : tx('검사', 'Test');
  return `${head} ${k} / ${inRound.length}`;
}
function startTrack() {
  const item = S.plan[S.idx], now = performance.now();
  S.cur = { fm: item.fm, round: item.round, extra: !!item.extra, practice: false, track: new Track(PR), startIso: iso(), startPt: now,
    breakS: S.lastEnd !== null ? +((now - S.lastEnd) / 1000).toFixed(1) : null, replays: 0, phase: 'idle', keepMonAtStart: keepMonSnap() };
  logEv('track-start', { fm: item.fm, round: item.round, extra: !!item.extra, order: S.idx + 1 });
  showPage('pgTest'); setTitle(trackTitle()); setProg(0); $('#tNote').textContent = '';
  saveCurrent(true);
  nextTrial();
}
// 하던 측정을 회기 기록에 — 화면이 닫혀도 그때까지의 시행이 남게 (다음에 열 때 버린 측정으로 옮김)
function saveCurrent(immediate = false) {
  const C = S?.cur;
  if (!C || C.practice) return;
  S.session.current = { fm: C.fm, round: C.round, extra: C.extra, order: S.idx + 1, startedAt: C.startIso, trialList: C.track.trials, reversals: C.track.reversals, revAt: C.track.revAt,
    depthNow: C.track.depth, P: snapP(PR) };
  S.session.updated = iso();
  if (immediate) saveStore(); else scheduleSave();
}
let awaiting = null;
function nextTrial() {
  const C = S.cur, n = PR.nAFC;
  if (document.hidden) { C.needReplay = true; return; }
  const depth = C.practice ? 0 : C.track.depth;
  setFb('', '');
  const btns = IV_BTNS;
  btns.forEach(b => { b.className = 'iv'; b.disabled = true; b.removeAttribute('aria-busy'); });
  $('#dunno').disabled = true;
  const tg = randInt(n);
  let made;
  try { made = btns.map((_, i) => stim(C.fm, i === tg ? depth : null)); }
  catch (e) { logEv('stim-error', { fm: C.fm, d: depth, msg: String(e && e.message || e) }); setFb('no', tx('소리를 생성하지 못했습니다. 화면을 새로고침해 주세요.', 'Could not generate sound. Please refresh the page.')); return; }
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
      btns.forEach((b, i) => { b.classList.toggle('playing', i === on); if (i === on) b.setAttribute('aria-busy', 'true'); else b.removeAttribute('aria-busy'); });
      if (on === 0 && C.tm.drift === null) C.tm.drift = Math.round(performance.now() - expect0);
      lit = on;
    }
    if (h >= t0 + (n - 1) * step + PR.dur) {
      btns.forEach(b => { b.classList.remove('playing'); b.removeAttribute('aria-busy'); b.disabled = false; b.classList.add('ready'); });
      $('#dunno').disabled = false;
      C.phase = 'awaiting';
      awaiting = { tg, depth, t: performance.now(), n };
      return;
    }
    nextFrame(frame);
  };
  nextFrame(frame);
}
// 다음 화면 갱신 때 실행 — 브라우저가 화면 갱신을 멈춰도(가려진 창 등) 50 ms 타이머로 이어 감 (먼저 실행된 쪽이 남은 타이머를 해제)
function nextFrame(f) {
  let done = false, rid = 0, tid = 0;
  const go = () => {
    if (done) return;
    done = true;
    if (rid) { try { cancelAnimationFrame(rid); } catch { } }
    if (tid) clearTimeout(tid);
    f();
  };
  rid = requestAnimationFrame(go);
  if (!done) tid = setTimeout(go, 50);
}
function answer(i, dunno, inp) {
  if (!awaiting || !S?.cur) return;
  if (!dunno && !(i >= 0 && i < awaiting.n)) { logEv('ignored-input', { key: i + 1, how: inp, phase: 'awaiting', why: 'no-such-interval' }); return; }
  const a = awaiting; awaiting = null;
  if (dunno) i = randInt(a.n);   // 모르겠음 = 구간 가운데 무작위 하나로 침 (특정 번호 쪽으로 치우치지 않는 찍기)
  const correct = i === a.tg, rt = Math.round(performance.now() - a.t);
  const btns = IV_BTNS;
  btns.forEach(b => { b.disabled = true; b.classList.remove('ready'); try { b.blur(); } catch { } });
  $('#dunno').disabled = true;
  if (PR.feedback) {
    btns[a.tg].classList.add('right');
    if (dunno) setFb('mid', tx(`떨리는 소리는 ${a.tg + 1}번이었습니다`, `The fluttering sound was #${a.tg + 1}`));
    else if (correct) setFb('ok', tx('맞았습니다', 'Correct'));
    else { btns[i].classList.add('wrong'); setFb('no', tx(`아쉽습니다. ${a.tg + 1}번이었습니다`, `Not quite. It was #${a.tg + 1}`)); }
  }
  const C = S.cur; C.phase = 'feedback';
  const meta = { a: i, tg: a.tg, u: dunno ? 1 : 0, rt, inp, ...C.tm };
  if (C.practice) {
    S.session.practiceTrials.push({ fm: C.fm, d: a.depth, c: correct ? 1 : 0, round: S.practiceRound, ...meta });
    if (correct && !dunno) C.k++;
    if (dunno) C.u++;
    C.left--; setProg((PRACTICE_N - C.left) / PRACTICE_N);
    S.session.updated = iso(); scheduleSave();
    setTimeout(() => { if (S?.cur !== C) return; if (C.left > 0) { setTitle(tx(`연습 ${PRACTICE_N - C.left + 1} / ${PRACTICE_N}`, `Practice ${PRACTICE_N - C.left + 1} / ${PRACTICE_N}`)); nextTrial(); } else practiceDone(); }, 1000);
    return;
  }
  C.track.respond(correct, meta);
  C.replays = 0;
  setProg(C.track.reversals.length / C.track.P.totalRev);
  saveCurrent(false);
  setTimeout(() => { if (S?.cur !== C) return; if (C.track.done) finishTrack(); else nextTrial(); }, 900);
}
IV_BTNS.forEach(b => b.addEventListener('click', () => answer(+b.dataset.i, false, 'click')));
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
  } else if ($('#pgOnset').classList.contains('on')) {
    if (ONSET.running && ONSET.phase === 'awaiting') {
      if (['0', '1', '2', '3', '4'].includes(e.key)) { e.preventDefault(); const b = $('#onCountPick').querySelector(`[data-v="${e.key}"]`); if (b) b.click(); }
      else if (e.key === 'Enter' && !$('#onTrialNext').disabled) { e.preventDefault(); $('#onTrialNext').click(); }
      else if ((e.key === 'r' || e.key === 'R') && !$('#onReplay').disabled) { e.preventDefault(); $('#onReplay').click(); }
    } else if (!$('#onsetResCard').hidden && e.key === 'Enter') { e.preventDefault(); $('#onsetStart').click(); }
  } else if ($('#pgBreak').classList.contains('on') && (e.key === 'Enter' || e.key === ' ') && !$('#bNext').hidden) { e.preventDefault(); $('#bNext').click(); }
});
// 소리가 나는 동안 화면(탭)이 가려지면: 그 시행은 버리고, 돌아오면 같은 깊이로 다시 들려줌
document.addEventListener('visibilitychange', () => {
  if (document.hidden) flushSave();
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
    $('#tNote').textContent = tx('다른 화면으로 이동하여 소리를 다시 들려드립니다.', 'You switched away, so we will play that sound again.');
    setTimeout(() => { if (S?.cur === C && !document.hidden) { $('#tNote').textContent = C.practice ? tx('연습 결과는 최종 기록에 포함되지 않습니다.', 'Practice trials are not counted in your results.') : ''; nextTrial(); } }, 700);
  }
});
window.addEventListener('pagehide', () => flushSave());
window.addEventListener('beforeunload', e => { flushSave(); if (S && !S.session.end) { e.preventDefault(); e.returnValue = ''; } });
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
    title = tx('연습 완료', 'Practice complete');
    h = info.n
      ? tx(`<p>${info.n}번 중 <b>${info.k}번</b> 맞았습니다.</p>`, `<p>You got <b>${info.k}</b> out of ${info.n} right.</p>`)
      : tx('<p>연습을 건너뛰었습니다.</p>', '<p>Practice skipped.</p>');
    if (info.n && info.k < 2) {
      h += tx('<p class="hint">떨리는 소리가 잘 구별되지 않으면 볼륨을 조금 키우거나 ‘연습 한 번 더’를 눌러 주세요. 그래도 어려우면 그대로 시작하셔도 됩니다.</p>',
        '<p class="hint">If the fluttering sound was hard to tell apart, try raising the volume slightly or tap “Practice again”. You can also start as is.</p>');
      if (S.session.path === 'bt') {
        h += tx('<p class="hint warn">블루투스 연결로 소리 앞부분이 끊긴다면 가능하면 유선 연결이나 스피커를 사용해 주세요.</p>',
          '<p class="hint warn">If Bluetooth clipped the start of the sound, try using a wired connection or speaker if possible.</p>');
      }
    }
    h += tx('<p>이제 본 검사를 시작합니다. 맞힐수록 떨림이 미세해져 점점 어려워집니다. <b>떨림이 아주 조금이라도 느껴지면 그 번호를 선택해 주세요.</b> 세 소리가 완전히 똑같이 들릴 때만 ‘모르겠음’을 눌러 주세요.</p>',
      '<p>Now the test begins. The flutter gets softer as you get answers right. <b>If you notice even a tiny flutter, pick that number.</b> Only press “Not sure” when all three sounds feel completely identical.</p>');
    h += tx('<p class="hint">검사가 끝날 때까지 볼륨은 바꾸지 말아 주세요.</p>', '<p class="hint">Please do not change your volume until the test finishes.</p>');
    $('#bNext').textContent = tx('검사 시작', 'Start test');
  } else if (kind === 'stopped') {
    title = tx('잠시 멈췄습니다', 'Paused');
    h = tx('<p>진행 중이던 구간은 처음부터 다시 시작합니다. 이미 마친 구간은 안전하게 저장되어 있습니다.</p>', '<p>This part will restart from the beginning. Finished parts are saved.</p>');
    $('#bNext').textContent = tx('다시 시작', 'Restart');
  } else if (kind === 'round') {
    title = info.extra ? tx('차이가 큰 항목만 한 번 더', 'Extra check for larger differences') : tx(`${info.round}차 검사`, `Round ${info.round}`);
    h = tx(`<p>${info.extra ? '1·2차 결과 차이가 큰 항목만 한 번 더 확인합니다.' : '같은 소리들을 다른 순서로 한 번 더 검사합니다.'} ${left}개 항목, 약 ${estMin(left)}분 걸립니다.</p><p class="hint">준비되시면 ‘다음’을 눌러 주세요.</p>`,
      `<p>${info.extra ? 'We will repeat only the rates where your two runs differed most.' : 'We will test the same sounds again in a new order.'} ${left} left, about ${estMin(left)} min.</p><p class="hint">Press “Next” when ready.</p>`);
    $('#bNext').textContent = tx('다음', 'Next');
  } else {
    title = tx('잘하셨습니다', 'Nice work');
    h = tx(`<p>${total}개 중 ${total - left}개를 마쳤습니다. (남은 검사: ${left}개)</p><p class="hint">잠시 쉬신 뒤 준비되시면 ‘다음’을 눌러 주세요.</p>`,
      `<p>${total - left} / ${total} done. ${left} left.</p><p class="hint">Take a short break and press “Next” when ready.</p>`);
    $('#bNext').textContent = tx('다음', 'Next');
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
  const at = iso(), msg = '진행 중이던 구간은 취소하고 잠시 멈출까요?\n이미 마친 구간은 저장되어 있습니다.';
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
  const tail = tx('<p class="hint">한 번 더 진행하시면, 모두 끝난 뒤에 결과 파일을 저장해 주세요.</p>', '<p class="hint">If you do another round, please save your result file after finishing.</p>');
  if (o.kind === 'again') return tx(`<p><b>시간이 되시면 한 번 더 진행해 주세요.</b> 같은 소리들을 다른 순서로 다시 검사합니다 (약 ${estMin(o.fms.length)}분). 두 번 측정하면 결과가 더 정확해집니다.</p>`,
    `<p><b>If you have time, please do one more round.</b> We will test the same sounds in a new order (about ${estMin(o.fms.length)} min). Two rounds give more reliable results.</p>`) + tail;
  return tx(`<p><b>1·2차 결과 차이가 큰 항목이 ${o.fms.length}개 있습니다.</b> 해당 항목만 한 번 더 확인하면 더 정확해집니다 (약 ${estMin(o.fms.length)}분).</p>`,
    `<p><b>${o.fms.length} sound rate(s) differed noticeably between your two rounds.</b> Repeating just those will improve accuracy (about ${estMin(o.fms.length)} min).</p>`) + tail;
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
function closeSession() { if (!S) return; logEv('session-close'); S.session.updated = iso(); saveStore(); S = null; if (KEEPMON.open) { try { keepMonTick(); } catch { } } wakeOff(); }
$('#toHome').onclick = () => {
  if (S && S.offer) { S.session.decisions.push({ at: iso(), what: S.offer.kind === 'again' ? 'again-offer' : 'extra-offer', answer: 'left-page', fms: S.offer.fms.slice() }); S.offer = null; }
  if (S) closeSession();
  JUST = null; renderHome(); showPage('pgHome');
};

/* ───────────── 결과 (참가자) ───────────── */
function verdict(r) {
  if (r.ceiling) return { kind: 'ceil', main: tx('재지 못함', 'Not measured'), sub: r.n0 >= 6 && !r.atChance
    ? tx('가장 큰 떨림은 구별했지만, 그보다 약한 떨림은 어려웠습니다', 'Detected the strongest flutter, but softer flutter was too hard')
    : tx('가장 큰 떨림에서도 자주 틀렸습니다', 'Frequently missed even the strongest flutter') };
  if (r.thr === null || r.thr === undefined) return { kind: 'none', main: tx('재지 못함', 'Not measured'), sub: tx('수치를 산출할 만큼 진행되지 않았습니다', 'Not enough responses to estimate a value') };
  const ref = !!(r.atChance || r.incomplete);
  return { kind: 'num', main: fmtPct(pct(r.thr)), sub: `${r.thr.toFixed(1)} dB${ref ? tx(' · 참고 값', ' · reference only') : ''}`, ref };
}
function byFm(runs) {
  const m = new Map();
  for (const r of runs) { if (!m.has(r.fm)) m.set(r.fm, []); m.get(r.fm).push(r); }
  return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([fm, rs]) => ({ fm, rs: rs.slice().sort((a, b) => (a.order || 0) - (b.order || 0)) }));
}
const meanOf = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
function endTableHtml(sess) {
  const rows = byFm(sess.runs || []);
  if (!rows.length) return `<p>${tx('완료된 측정이 없습니다.', 'No completed runs.')}</p>`;
  const maxN = Math.max(...rows.map(x => x.rs.length));
  const head = `<tr><th>${tx('떨림 속도', 'Flutter rate')}</th>${Array.from({ length: maxN }, (_, i) => `<th>${maxN > 1 ? tx(`${i + 1}차`, `Run ${i + 1}`) : tx('구별한 최소 떨림', 'Softest flutter detected')}</th>`).join('')}${maxN > 1 ? `<th>${tx('평균', 'Average')}</th>` : ''}</tr>`;
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
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${tx('떨림 빠르기에 따른 결과 그림', 'Results chart by flutter rate')}">`;
  for (let d = 0; d >= minDb; d -= 6) s += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(d)}" y2="${y(d)}"/><text class="tick" x="${L - 8}" y="${y(d) + 4}" text-anchor="end">${esc(fmtPct(pct(d)))}</text>`;
  for (const f of fms) s += `<line class="grid" x1="${x(f)}" x2="${x(f)}" y1="${T}" y2="${H - B}"/><text class="tick" x="${x(f)}" y="${H - B + 18}" text-anchor="middle">${f}</text>`;
  s += `<text class="axl" x="${(L + W - R) / 2}" y="${H - 8}" text-anchor="middle">${tx('떨림 속도 (Hz)', 'Flutter rate (Hz)')}</text>`;
  const pts = [];
  for (const { fm, rs } of rows) {
    const nums = rs.filter(r => !r.ceiling && r.thr !== null).map(r => r.thr);
    for (const v of nums) s += `<circle class="pt2" cx="${x(fm)}" cy="${y(v)}" r="5"/>`;
    if (nums.length && nums.length === rs.length) pts.push([x(fm), y(meanOf(nums))]);
    if (rs.some(r => r.ceiling || r.thr === null)) { const cx = x(fm), cy = y(0) - 2; s += `<path class="ceil" d="M${cx - 8},${cy - 12} L${cx + 8},${cy - 12} L${cx},${cy} Z"/>`; }
  }
  if (pts.length > 1) s += `<polyline class="ln" points="${pts.map(p => p.join(',')).join(' ')}"/>`;
  for (const p of pts) s += `<circle class="pt" cx="${p[0]}" cy="${p[1]}" r="6.5"/>`;
  return s + `</svg><p class="hint">${tx('위로 갈수록 더 약한 떨림까지 구별한 것입니다. 빈 원 = 1회 측정값, 채운 원 = 평균, ▽ = 재지 못함.', 'Higher means detecting softer flutter. Open circle = single run, filled circle = average, ▽ = not measured.')}</p>`;
}
let SHOWN = null;
function showEnd(sess, opt = {}) {
  SHOWN = sess;
  const offers = !!(opt.offers && S && S.session === sess && S.offer);
  $('#endTitle').textContent = offers ? tx('1차 검사 완료! 수고하셨습니다', 'Round 1 complete! Well done') : tx('수고하셨습니다', 'All done! Thank you');
  $('#endWho').textContent = [sess.code || tx('번호 없음', 'No ID'), earName(sess.ear), pathName(sess.path), localTime(sess.start)].filter(Boolean).join(' · ');
  $('#endTable').innerHTML = endTableHtml(sess);
  $('#endChart').innerHTML = chartHtml(sess);
  const single = byFm(sess.runs || []).some(x => x.rs.length < 2);
  const notes = [tx('% 수치가 작을수록 더 약한 떨림까지 구별한 것입니다.', 'A smaller % means you detected softer flutter.')];
  if (single) notes.push(tx('한 번만 측정한 값은 참고용입니다.', 'Values from a single run are for reference only.'));
  if ((sess.runs || []).some(r => r.ceiling || r.thr === null)) notes.push(tx('‘재지 못함’은 가장 큰 떨림에서도 자주 틀려 수치를 내지 못했다는 뜻입니다.', '“Not measured” means even the strongest flutter was frequently missed.'));
  if ((sess.runs || []).some(r => r.atChance || r.incomplete)) notes.push(tx('‘참고 값’은 수치는 나왔으나 변동이 커서 참고용으로만 보아야 하는 결과입니다.', '“Reference only” values are less reliable estimates.'));
  notes.push(tx('이 결과는 의학적 진단이 아닙니다. 음성처리기 설정 변경은 반드시 청능사와 상의해 주세요.', 'These results are not a medical diagnosis. Talk to your audiologist before changing any sound processor settings.'));
  $('#endNotes').innerHTML = notes.map(t => `<p>${esc(t)}</p>`).join('') + focusHtml(sess);
  $('#againBox').hidden = !offers;
  $('#againText').innerHTML = offers ? offerText(S.offer) : '';
  if (!opt.keepState) $('#sendState').textContent = '';
  $('#shareFile').hidden = !canShareFile('TMTF.json', 'application/json');
  $('#shareReport').hidden = !canShareFile('TMTF_report.html', 'text/html');
  showPage('pgEnd', opt);
}
// 끝 질문(고르지 않으면 null) — 이 화면에서 방금 끝낸 회기에만, 화면에 보였을 때만 답으로 침
let JUST = null;
const evTo = (sess, type, detail = {}) => { sess.events.push({ t: iso(), s: null, type, ...detail }); sess.updated = iso(); };
function focusHtml(sess) {
  if (JUST !== sess) return '';
  sess.focusEndShown = true;
  return `<div class="mt"><p><b>${tx('오늘 검사할 때 집중은 잘 되셨나요?', 'How was your focus today?')}</b> <span class="opt">${tx('(선택 사항)', '(optional)')}</span></p><div class="choices three" id="focusPick" role="group" aria-label="${tx('집중도', 'Focus')}">${Object.keys(FOCUS).map(k => `<button class="choice${sess.focusEnd === k ? ' on' : ''}" data-v="${k}" aria-pressed="${sess.focusEnd === k ? 'true' : 'false'}">${esc(focusName(k))}</button>`).join('')}</div></div>`;
}
$('#endNotes').addEventListener('click', e => {
  const b = e.target.closest ? e.target.closest('.choice') : e.target;
  if (!b || !b.dataset || !b.dataset.v || !SHOWN || JUST !== SHOWN) return;
  SHOWN.focusEnd = b.dataset.v; SHOWN.focusEndAt = iso();
  $$('#focusPick .choice').forEach(x => { const on = x.dataset.v === SHOWN.focusEnd; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
  if (S && S.session === SHOWN) logEv('focus-end', { v: SHOWN.focusEnd }); else evTo(SHOWN, 'focus-end', { v: SHOWN.focusEnd });
  saveStore();
});

/* ── 결과 파일 · 글 ── */
const stamp = t => { const d = t ? new Date(t) : new Date(), z = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}_${z(d.getHours())}-${z(d.getMinutes())}`; };
const asciiCode = s => String(s || '').replace(/[^0-9A-Za-z_-]/g, '') || 'anon';
function exportObj(sessions) { return { format: FORMAT, formatVersion: FORMAT_VERSION, app: APP_VERSION, exportedAt: iso(), procKey: PROC_KEY, sessions }; }
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
  if (!sessions.length) { alert(tx('저장할 결과가 없습니다.', 'There are no results to save.')); return; }
  const name = fileNameFor(sessions, kind);
  download(name, JSON.stringify(exportObj(sessions), null, 1), 'application/json');
  for (const s of sessions) { (s.exports ||= []).push({ at: iso(), how: kind === 'all' ? 'file-all' : 'file', name }); }
  saveStore();
  return name;
}
function canShareFile(name = 'TMTF.json', type = 'application/json') {
  try { return !!(navigator.canShare && navigator.share && navigator.canShare({ files: [new File(['{}'], name, { type })] })); } catch { return false; }
}
function summaryText(sess) {
  const lines = [tx('소리 떨림 검사 결과 (TMTF)', 'Sound Flutter Test Results (TMTF)'), [sess.code || tx('번호 없음', 'No ID'), earName(sess.ear), pathName(sess.path), localTime(sess.start)].filter(Boolean).join(' · ')];
  for (const { fm, rs } of byFm(sess.runs || [])) lines.push(`${fm} Hz: ` + rs.map(r => { const v = verdict(r); return v.kind === 'num' ? `${v.main} (${v.sub})` : v.main; }).join(' / '));
  lines.push(`(${tx('앱', 'App')} ${APP_VERSION})`);
  return lines.join('\n');
}
$('#saveFile').onclick = () => { if (!SHOWN) return; const name = saveFile([SHOWN], 'one'); if (name) $('#sendState').textContent = tx(`저장했습니다: ${name} (다운로드 폴더)`, `Saved: ${name} (Downloads folder)`); };
$('#saveReport').onclick = () => {
  if (!SHOWN) return;
  const name = saveSpecialistReport([SHOWN], 'one', null, true);
  if (name) $('#sendState').textContent = tx(`저장했습니다: ${name} (브라우저에서 열어 인쇄·PDF로 저장해 전문가께 전달하실 수 있습니다)`, `Saved: ${name} (open in a browser to print or save as PDF for your audiologist or CI engineer)`);
};
$('#shareFile').onclick = async () => {
  if (!SHOWN) return;
  const name = fileNameFor([SHOWN], 'one'), file = new File([JSON.stringify(exportObj([SHOWN]), null, 1)], name, { type: 'application/json' });
  try {
    await navigator.share({ files: [file], title: tx('소리 떨림 검사 결과', 'Sound Flutter Test Results'), text: summaryText(SHOWN) });
    (SHOWN.exports ||= []).push({ at: iso(), how: 'share', name }); saveStore();
    $('#sendState').textContent = tx('공유했습니다.', 'Shared.');
  } catch (e) { $('#sendState').textContent = e && e.name === 'AbortError' ? '' : tx('공유 기능을 사용할 수 없습니다. ‘결과 파일 저장’을 눌러 주세요.', 'Direct sharing is unavailable. Please tap “Save result file”.'); }
};
$('#shareReport').onclick = async () => {
  if (!SHOWN) return;
  const name = reportFileNameFor([SHOWN], 'one'), file = new File([specialistReportHtml([SHOWN])], name, { type: 'text/html' });
  try {
    await navigator.share({ files: [file], title: tx('소리 떨림 검사 전문가 참고 보고서', 'Sound Flutter Test Specialist Reference Report'), text: summaryText(SHOWN) });
    (SHOWN.exports ||= []).push({ at: iso(), how: 'share-report', name }); saveStore();
    $('#sendState').textContent = tx('전문가용 보고서를 공유했습니다.', 'Specialist report shared.');
  } catch (e) { $('#sendState').textContent = e && e.name === 'AbortError' ? '' : tx('공유 기능을 사용할 수 없습니다. ‘전문가용 보고서 저장’을 눌러 주세요.', 'Direct sharing is unavailable. Please tap “Save specialist report”.'); }
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
  $('#sendState').textContent = ok ? tx('요약을 복사했습니다. 메신저나 메모장에 붙여 넣어 사용하세요. (자세한 기록은 결과 파일에만 들어 있습니다)', 'Summary copied. Paste it into a message. (Full trial data is only in the saved file.)') : tx('복사하지 못했습니다. ‘결과 파일 저장’을 눌러 주세요.', 'Copy failed. Please tap “Save result file”.');
};

/* ───────────── 받은 결과 보기 (검사를 보낸 분용) ───────────── */
const VIEW = { sessions: [], rendered: new Set() };
// 공통 헬퍼: 모르겠음(u=1) 제외 자리별 맞힘 · build 무결성 문자열 · 주파수별 대표값
function posStats(run) {
  const chosen = (run.trials || []).filter(t => !t.u);
  return [0, 1, 2].map(k => { const tt = chosen.filter(t => t.tg === k); return tt.length ? `${tt.filter(t => t.c).length}/${tt.length}` : '-'; }).join(' · ');
}
function buildStatusHtml(s) {
  const vs = s.build?.verified?.status, df = s.build?.differ;
  return (vs === 'pass' || vs === 'pass-code' ? `<span class="good">${esc(VERIFIED_TXT[vs])}</span>` : s.build?.sha256 ? esc(VERIFIED_TXT[vs] || '검산 기록과 다른 코드') + (s.build.verified?.differ?.length ? ` (${esc(s.build.verified.differ.join(', '))})` : '') : '코드 확인 못 함(파일로 연 화면 등)')
    + (df && df.length ? ` · 화면이 받은 파일 ≠ 서버 파일: ${esc(df.join(', '))}` : '');
}
function repThrOf(rs) {
  if (!rs || !rs.length) return null;
  if (rs.some(r => r.ceiling || r.thr === null || r.thr === undefined)) return { kind: 'ceil', n: rs.length };
  const norm = rs.filter(r => !r.atChance && !r.incomplete).map(r => r.thr);
  if (norm.length === rs.length) return { kind: 'num', thr: meanOf(norm), n: norm.length };
  const nums = rs.map(r => r.thr);
  return { kind: 'ref', thr: meanOf(nums), n: nums.length };
}
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
  const vf = buildStatusHtml(s);
  const rowsH = runs.map(r => {
    const v = verdict(r), rp = replayCheck(r, r.P || P), rm = rmsCheck(r);
    const pos = posStats(r);
    return `<tr><td>${r.round || 1}${r.extra ? '+' : ''}</td><td>${r.fm}</td><td>${r.thr ?? ''}</td><td>${esc(v.main)}</td><td>${r.ceiling ? tx('재지 못함', 'Ceiling') : r.atChance ? tx('우연 수준', 'At chance') : r.incomplete ? tx('미완', 'Incomplete') : ''}</td>
      <td>${r.k0}/${r.n0}${r.pChance !== null && r.pChance !== undefined ? ` (p ${(+r.pChance).toFixed(3)})` : ''}</td><td>${r.sd ?? ''}</td><td>${r.nTrials}</td><td>${r.nDunno}</td><td>${r.durS !== undefined ? (r.durS / 60).toFixed(1) : ''}</td>
      <td class="${rp.ok ? 'good' : 'bad'}">${rp.ok ? tx('같음', 'Match') : esc(rp.why)}</td><td class="${rm.ok ? 'good' : 'bad'}">${rm.ok ? tx('같음', 'Match') : `차 ${rm.worst} dB${rm.scaled ? ` · 줄임 ${rm.scaled}` : ''}`}</td><td>${pos}</td></tr>`;
  }).join('');
  const ab = (s.events || []).filter(e => e.type === 'track-abandoned').length, gaps = (s.events || []).filter(e => e.type === 'keep-gap-start').length;
  const kk = sessionKeepKey(s), oc = s.onsetCheck;
  const ocTxt = oc ? (oc.skipped ? tx('소리 점검: 건너뜀', 'Onset: skipped')
    : `${tx('소리 점검', 'Onset')}: ${esc(oc.summary?.verdict || '')} (${(oc.summary?.resp || []).join(',')})`) : '';
  const meta = [`${esc(localTime(s.start))} – ${s.end ? esc(localTime(s.end)) : tx('끝 없음', 'no end')}`, esc(s.endReason || ''), `${tx('앱', 'App')} ${esc(s.app || '')}`, vf,
    `${tx('유지 신호', 'Keepalive')}: ${esc(keepModeLabel(kk))}`, ocTxt,
    `${tx('표본화', 'SR')} ${s.env?.audio?.sampleRate ?? '?'} Hz`, `${tx('볼륨', 'Vol')} ${s.osVolume ?? tx('모름', '?')}`, `${tx('연습', 'Practice')} ${(s.practiceTrials || []).length}`, ab ? `${tx('버린 측정', 'Abandoned')} ${ab}` : '', gaps ? `<span class="bad">${tx('출력 끊김', 'Audio gaps')} ${gaps}</span>` : '',
    s.focusEnd ? `${tx('집중', 'Focus')} ${esc(focusName(s.focusEnd))}` : '', s.info && (s.info.age || s.info.ciYears || s.info.onset || s.info.maker) ? `나이 ${esc(s.info.age || '-')} · 사용 ${esc(s.info.ciYears || '-')} · 시작 ${esc(s.info.onset || '-')} · 회사 ${esc(s.info.maker || '-')}` : '',
    s.info?.note ? `${tx('메모', 'Note')}: ${esc(s.info.note)}` : '', src ? `${tx('파일', 'File')} ${esc(src)}` : ''].filter(Boolean).join(' · ');
  return `<div class="card vsess"><h3>${esc(s.code || tx('번호 없음', 'No ID'))} · ${esc(earName(s.ear))} · ${esc(pathName(s.path))}</h3><p class="meta">${meta}</p>
    <div class="tablewrap"><table class="tbl dense"><tr><th>${tx('바퀴', 'Rnd')}</th><th>Hz</th><th>${tx('역치 dB', 'Thr dB')}</th><th>${tx('깊이', 'Depth')}</th><th>${tx('표시', 'Flag')}</th><th>${tx('0 dB 맞힘', '0 dB')}</th><th>${tx('반전 SD', 'SD')}</th><th>${tx('시행', 'Trials')}</th><th>${tx('모르겠음', 'Unsure')}</th><th>${tx('분', 'Min')}</th><th>${tx('계단 다시', 'Replay')}</th><th>${tx('구간 세기', 'RMS')}</th><th>${tx('자리별 맞힘 1·2·3 (모르겠음 제외)', 'Interval 1·2·3 (excl. unsure)')}</th></tr>${rowsH}</table></div>
    ${chartHtml(s)}
    <div class="stairs">${runs.map(r => `<figure>${stairSvg(r)}<figcaption>${r.fm} Hz · ${r.round || 1}${tx('바퀴', 'R')}${r.extra ? tx('(더)', '+') : ''} · ${esc(verdict(r).main)}</figcaption></figure>`).join('')}</div></div>`;
}
// 회기별 유지 신호 방식 키 — 유지 신호 방식이 다른 회기는 비교에서 합치지 않고 분리
function sessionKeepKey(s) {
  if (!s || !s.keepalive) return 'legacy-none';
  return s.keepalive.userOff ? 'off' : (s.keepalive.mode || 'legacy-none');
}
function keepModeLabel(k) {
  const ko = { tone18all: '18 Hz 유지 신호 (시행 중 계속)', tone18: '18 Hz 유지 신호 (시행 사이만)', off: '유지 신호 끔 (사용자 선택)', 'legacy-none': '유지 신호 없음 (v1 기록)' };
  const en = { tone18all: '18 Hz keepalive (continuous)', tone18: '18 Hz keepalive (between trials)', off: 'Keepalive off (user)', 'legacy-none': 'No keepalive (v1 record)' };
  return (LANG === 'en' ? en[k] : ko[k]) || k;
}
// 같은 참가 번호 회기 묶어 비교 (색 + 선 모양 + 기호를 함께 구분)
const COMP_STYLES = [
  { col: '#1366d6', dash: '', sym: '●', mk: (x, y, c) => `<circle cx="${x}" cy="${y}" r="5.5" fill="${c}" stroke="var(--panel)" stroke-width="1.5"/>` },
  { col: '#0e7a48', dash: '6 4', sym: '■', mk: (x, y, c) => `<rect x="${x - 4.8}" y="${y - 4.8}" width="9.6" height="9.6" fill="${c}" stroke="var(--panel)" stroke-width="1.5"/>` },
  { col: '#b45309', dash: '2 3', sym: '▲', mk: (x, y, c) => `<path d="M${x},${y - 6} L${x + 6},${y + 5} L${x - 6},${y + 5} Z" fill="${c}" stroke="var(--panel)" stroke-width="1.5"/>` },
  { col: '#7c3aed', dash: '8 3 2 3', sym: '◆', mk: (x, y, c) => `<path d="M${x},${y - 6} L${x + 6},${y} L${x},${y + 6} L${x - 6},${y} Z" fill="${c}" stroke="var(--panel)" stroke-width="1.5"/>` },
];
function compareChartSvg(items, fms) {
  if (!fms.length) return '';
  const W = 680, H = 290, L = 62, R = 20, T = 18, B = 48;
  const lo = Math.log(Math.min(...fms) / 1.5), hi = Math.log(Math.max(...fms) * 1.5);
  const allThr = items.flatMap(it => (it.s.runs || []).filter(r => !r.ceiling && r.thr !== null && r.thr !== undefined).map(r => r.thr));
  const minDb = Math.min(-30, Math.floor(Math.min(0, ...allThr) / 6) * 6);
  const x = f => L + (W - L - R) * (Math.log(f) - lo) / (hi - lo || 1);
  const y = d => T + (H - T - B) * (1 - d / minDb);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${tx('같은 참가 번호 회기 비교 그림', 'Session comparison chart')}">`;
  for (let d = 0; d >= minDb; d -= 6) s += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(d)}" y2="${y(d)}"/><text class="tick" x="${L - 8}" y="${y(d) + 4}" text-anchor="end">${d} dB</text>`;
  for (const f of fms) s += `<line class="grid" x1="${x(f)}" x2="${x(f)}" y1="${T}" y2="${H - B}"/><text class="tick" x="${x(f)}" y="${H - B + 18}" text-anchor="middle">${f}</text>`;
  s += `<text class="axl" x="${(L + W - R) / 2}" y="${H - 8}" text-anchor="middle">${tx('떨림 속도 (Hz)', 'Flutter rate (Hz)')}</text>`;
  items.forEach((it, idx) => {
    const st = COMP_STYLES[idx % COMP_STYLES.length], map = new Map(byFm(it.s.runs || []).map(x => [x.fm, x.rs])), pts = [];
    for (const fm of fms) {
      const rep = repThrOf(map.get(fm));
      if (!rep) continue;
      if (rep.kind === 'num') pts.push([x(fm), y(rep.thr)]);
      else if (rep.kind === 'ceil') { const cx = x(fm), cy = y(0) - 2 - idx * 3; s += `<path d="M${cx - 6},${cy - 10} L${cx + 6},${cy - 10} L${cx},${cy} Z" fill="none" stroke="${st.col}" stroke-width="2"/>`; }
    }
    if (pts.length > 1) s += `<polyline fill="none" stroke="${st.col}" stroke-width="2.4" ${st.dash ? `stroke-dasharray="${st.dash}"` : ''} points="${pts.map(p => p.join(',')).join(' ')}"/>`;
    for (const p of pts) s += st.mk(p[0], p[1], st.col);
  });
  return s + '</svg>';
}
function groupCompareHtml(code, keepKey, items) {
  const fms = [...new Set(items.flatMap(it => (it.s.runs || []).map(r => r.fm)))].sort((a, b) => a - b);
  const maps = items.map(it => new Map(byFm(it.s.runs || []).map(x => [x.fm, x.rs])));
  const showDiff = items.length === 2;
  const cols = items.map((it, i) => {
    const st = COMP_STYLES[i % COMP_STYLES.length];
    return `<th><span class="cs${i % 4}">${st.sym}</span> #${i + 1} · ${esc(earName(it.s.ear))}<small>${esc(localTime(it.s.start))}</small></th>`;
  }).join('');
  const body = fms.map(fm => {
    const reps = maps.map(m => repThrOf(m.get(fm)));
    const cells = reps.map(rep => {
      if (!rep) return '<td>—</td>';
      if (rep.kind === 'ceil') return `<td>${tx('재지 못함', 'Not measured')}</td>`;
      const tag = rep.kind === 'ref' ? tx(' · 참고값', ' · ref') : rep.n === 1 ? tx(' (1회)', ' (1 run)') : ` (${rep.n}${tx('회 평균', ' avg')})`;
      return `<td><b>${rep.thr.toFixed(1)} dB</b><small>${esc(fmtPct(pct(rep.thr)))}${tag}</small></td>`;
    }).join('');
    let diffCell = '';
    if (showDiff) {
      if (reps[0]?.kind === 'num' && reps[1]?.kind === 'num') {
        const d = reps[1].thr - reps[0].thr;
        diffCell = `<td><b>${d >= 0 ? '+' : ''}${d.toFixed(1)} dB</b></td>`;
      } else diffCell = '<td>—</td>';
    }
    return `<tr><td class="hz">${fm} Hz</td>${cells}${diffCell}</tr>`;
  }).join('');
  const legend = items.map((it, i) => {
    const st = COMP_STYLES[i % COMP_STYLES.length];
    return `<span class="leg-item"><span class="leg-sym cs${i % 4}">${st.sym}</span> #${i + 1} ${esc(earName(it.s.ear))} · ${esc(pathName(it.s.path))} (${esc(localTime(it.s.start))})</span>`;
  }).join('');
  return `<div class="card vcomp"><h3>${tx(`참가 번호 ${esc(code)} 묶어 비교 (${items.length}개 회기 · ${esc(keepModeLabel(keepKey))})`, `Participant ${esc(code)} comparison (${items.length} sessions · ${esc(keepModeLabel(keepKey))})`)}</h3>
    <p class="hint">${tx('정상 측정값만 비교합니다. ‘재지 못함’은 숫자가 아니므로 차이나 평균을 내지 않습니다. (참고용 · 진단 아님)', 'Only normal thresholds are compared. “Not measured” is not numeric and excluded from averages/differences. (Reference only, not a diagnosis.)')}</p>
    <div class="tablewrap"><table class="tbl dense"><tr><th>Hz</th>${cols}${showDiff ? `<th>${tx('차이 (#2−#1)', 'Diff (#2−#1)')}</th>` : ''}</tr>${body}</table></div>
    ${compareChartSvg(items, fms)}<div class="legend">${legend}</div></div>`;
}
function renderViewerCompare() {
  const box = $('#vCompare'); if (!box) return;
  const byCode = new Map();
  for (const it of VIEW.sessions) {
    const c = String(it.s.code || '').trim();
    if (!c) continue;
    if (!byCode.has(c)) byCode.set(c, []);
    byCode.get(c).push(it);
  }
  const parts = [];
  for (const [code, all] of byCode.entries()) {
    const byMode = new Map();
    for (const it of all) {
      const mk = sessionKeepKey(it.s);
      if (!byMode.has(mk)) byMode.set(mk, []);
      byMode.get(mk).push(it);
    }
    if (byMode.size >= 2) {
      const modeNames = [...byMode.keys()].map(k => keepModeLabel(k)).join(' / ');
      parts.push(`<div class="warn" role="note">${tx(`참가 번호 ${esc(code)}에 유지 신호 방식이 다른 회기가 있어 합치지 않고 분리했습니다: ${esc(modeNames)}`,
        `Participant ${esc(code)} has sessions with different keepalive modes; they are kept separate: ${esc(modeNames)}`)}</div>`);
    }
    for (const [mk, arr] of byMode.entries()) {
      if (arr.length >= 2) parts.push(groupCompareHtml(code, mk, arr.slice().sort((a, b) => String(a.s.start).localeCompare(String(b.s.start)))));
    }
  }
  box.innerHTML = parts.join('');
}
function renderViewer(forceAll = false) {
  const list = $('#vList');
  if (forceAll) { VIEW.rendered.clear(); list.innerHTML = ''; }
  const added = VIEW.sessions.filter(x => !VIEW.rendered.has(x.s.id));
  if (added.length) {
    const htmls = added.map(x => { VIEW.rendered.add(x.s.id); return viewSessHtml(x.s, x.src); });
    if (!list.children.length) list.innerHTML = htmls.join('');
    else {
      const w = document.createElement('div');
      w.innerHTML = htmls.join('');
      while (w.children.length) list.appendChild(w.children[0]);
    }
  }
  renderViewerCompare();
  $('#vReport').disabled = $('#vCsvRuns').disabled = $('#vCsvTrials').disabled = !VIEW.sessions.length;
}
$('#vReport').onclick = () => {
  if (!VIEW.sessions.length) return;
  const name = saveSpecialistReport(VIEW.sessions.map(x => x.s), VIEW.sessions.length > 1 ? 'all' : 'one', VIEW.sessions.map(x => x.src), false);
  if (name) $('#vState').textContent = tx(`전문가용 보고서를 저장했습니다: ${name}`, `Saved specialist report: ${name}`);
};

/* ───────────── 전문가용 참고 보고서 (.html, 청능사 · 인공와우 엔지니어 전달용 · 참고용) ───────────── */
function medianOf(xs) {
  if (!xs.length) return null;
  const a = xs.slice().sort((x, y) => x - y), m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}
function reportFileNameFor(sessions, kind) {
  if (kind === 'all' || sessions.length > 1) return `TMTF_report_all_${stamp()}.html`;
  const s = sessions[0];
  return `TMTF_report_${asciiCode(s.code)}_${s.ear || 'X'}_${stamp(s.start)}.html`;
}
function reportChartSvg(sess) {
  const rows = byFm(sess.runs || []);
  if (!rows.length) return '';
  const W = 680, H = 310, L = 66, R = 64, T = 20, B = 48;
  const fms = rows.map(x => x.fm), lo = Math.log(Math.min(...fms) / 1.5), hi = Math.log(Math.max(...fms) * 1.5);
  const allThr = (sess.runs || []).filter(r => r.thr !== null && r.thr !== undefined && !r.ceiling).map(r => r.thr);
  const minDb = Math.min(-30, Math.floor(Math.min(0, ...allThr) / 6) * 6);
  const x = f => L + (W - L - R) * (Math.log(f) - lo) / (hi - lo || 1);
  const y = d => T + (H - T - B) * (1 - d / minDb);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="주파수별 변조 탐지 역치(TMTF) 그래프">`;
  for (let d = 0; d >= minDb; d -= 6) {
    const yy = y(d);
    s += `<line class="grid" x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}"/>`;
    s += `<text class="tick" x="${L - 8}" y="${yy + 4}" text-anchor="end">${d} dB</text>`;
    s += `<text class="tick" x="${W - R + 8}" y="${yy + 4}" text-anchor="start">${esc(fmtPct(pct(d)))}</text>`;
  }
  for (const f of fms) {
    const xx = x(f);
    s += `<line class="grid" x1="${xx}" x2="${xx}" y1="${T}" y2="${H - B}"/>`;
    s += `<text class="tick" x="${xx}" y="${H - B + 18}" text-anchor="middle">${f}</text>`;
  }
  s += `<text class="axl" x="${(L + W - R) / 2}" y="${H - 8}" text-anchor="middle">변조 주파수 (Hz, 로그 척도)</text>`;
  s += `<text class="axl" x="14" y="${(T + H - B) / 2}" text-anchor="middle" transform="rotate(-90 14 ${(T + H - B) / 2})">변조 깊이 (dB)</text>`;
  s += `<text class="axl" x="${W - 12}" y="${(T + H - B) / 2}" text-anchor="middle" transform="rotate(90 ${W - 12} ${(T + H - B) / 2})">변조 깊이 (%)</text>`;
  const pts = [];
  for (const { fm, rs } of rows) {
    const norm = rs.filter(r => !r.ceiling && r.thr !== null && r.thr !== undefined && !r.atChance && !r.incomplete);
    const prov = rs.filter(r => !r.ceiling && r.thr !== null && r.thr !== undefined && (r.atChance || r.incomplete));
    for (const r of norm) s += `<circle class="pt2" cx="${x(fm)}" cy="${y(r.thr)}" r="5"/>`;
    for (const r of prov) s += `<circle class="pt-ref" cx="${x(fm)}" cy="${y(r.thr)}" r="5"/>`;
    if (norm.length && norm.length === rs.length) pts.push([x(fm), y(meanOf(norm.map(r => r.thr)))]);
    if (rs.some(r => r.ceiling || r.thr === null || r.thr === undefined)) {
      const cx = x(fm), cy = y(0) - 2;
      s += `<path class="ceil" d="M${cx - 8},${cy - 12} L${cx + 8},${cy - 12} L${cx},${cy} Z"/>`;
    }
  }
  if (pts.length > 1) s += `<polyline class="ln" points="${pts.map(p => p.join(',')).join(' ')}"/>`;
  for (const p of pts) s += `<circle class="pt" cx="${p[0]}" cy="${p[1]}" r="6"/>`;
  return s + '</svg><p class="cap">위로 갈수록 약한 변조까지 탐지(높은 민감도). 빈 원(○): 정상 개별 측정 · 점선 원: 참고값(우연 수준/미완) · 채운 원(●) 및 연결선: 정상 측정 대표값(2회 이상 평균, 1회 측정은 잠정 참고값) · ▽: 재지 못함(평균 제외).</p>';
}
function reportRunBadge(r) {
  if (r.ceiling || r.thr === null || r.thr === undefined) return '<span class="badge bad">재지 못함</span>';
  if (r.atChance) return '<span class="badge warn">우연 수준 (참고값)</span>';
  if (r.incomplete) return '<span class="badge warn">미완 (참고값)</span>';
  return '<span class="badge ok">정상</span>';
}
function reportSessionHtml(s, src, idx, total) {
  const runs = (s.runs || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  const P = s.P || snapP(PR);
  const rows = byFm(runs);
  const evs = s.events || [];
  const prTr = s.practiceTrials || [];
  const prRight = prTr.filter(t => t.c && !t.u).length;
  const prDunno = prTr.filter(t => t.u).length;
  const durMin = s.start && s.end ? ((Date.parse(s.end) - Date.parse(s.start)) / 60000) : null;
  const info = s.info || {};
  const vs = s.build?.verified?.status, df = s.build?.differ;
  const buildStatus = vs ? (VERIFIED_TXT[vs] || vs) : (s.build?.sha256 ? '검산 기록과 다른 코드' : '확인 불가(로컬 file:// 등)');
  const bandTxt = P.band?.type === 'wide' ? '광대역 가우스 잡음 (20 Hz – fs/2, 구간마다 독립 재추출)' : `대역 제한 잡음 (${esc(JSON.stringify(P.band))})`;
  const rampTxt = `${P.rampMs ?? 10} ms ${P.rampShape === 'cos2' ? '코사인²(cos²)' : '직선(linear)'} 경사`;
  const phaseTxt = P.phase === 'random' ? '구간마다 [0, 2π) 균등 무작위 (Shen & Richards 2013)' : esc(P.phase || '0');
  const ceilTxt = P.ceiling === 'stop4' ? '0 dB에서 4회 오답 시 즉시 중단(재지 못함, 숫자 아님 · De Ruiter et al. 2015)' : esc(P.ceiling || '없음');
  const pathTxt = (PATH[s.path] || s.path || '미입력') + (s.path === 'bt' ? ' (주의: 블루투스 스트리밍 특성상 자극 앞부분 잘림 가능)' : '');

  // 1. 주파수별 요약 표 (재지 못함은 절대 0 dB로 평균 내지 않음)
  const maxN = rows.length ? Math.max(...rows.map(x => x.rs.length)) : 0;
  const sumTable = !rows.length ? '<p class="muted">완료된 측정이 없습니다.</p>' : (() => {
    const head = `<tr><th>변조 주파수</th>${Array.from({ length: maxN }, (_, i) => `<th>${i + 1}차 측정</th>`).join('')}<th>대표값 (평균)</th></tr>`;
    const body = rows.map(({ fm, rs }) => {
      const cells = Array.from({ length: maxN }, (_, i) => {
        const r = rs[i];
        if (!r) return '<td class="muted">—</td>';
        if (r.ceiling || r.thr === null || r.thr === undefined) {
          const reason = r.ceiling ? (r.n0 >= 6 && !r.atChance ? '0 dB 4오답 중단(100% 일부 탐지)' : '0 dB 4오답 중단') : '역치 미산출';
          return `<td><b>재지 못함</b><small>${esc(reason)}</small></td>`;
        }
        const tag = r.atChance ? ' · 우연 수준(참고값)' : r.incomplete ? ' · 미완(참고값)' : '';
        return `<td><b>${r.thr.toFixed(2)} dB</b> (${esc(fmtPct(pct(r.thr)))})<small>SD ${r.sd !== null && r.sd !== undefined ? r.sd.toFixed(2) + ' dB' : '—'}${tag}</small></td>`;
      }).join('');
      const norm = rs.filter(r => !r.ceiling && r.thr !== null && r.thr !== undefined && !r.atChance && !r.incomplete).map(r => r.thr);
      let rep = '<span class="muted">산출 불가</span>';
      if (norm.length >= 2 && norm.length === rs.length) {
        const m = meanOf(norm), diff = Math.max(...norm) - Math.min(...norm);
        rep = `<b>${m.toFixed(2)} dB</b> (${esc(fmtPct(pct(m)))})<small>${norm.length}회 평균 · 범위차 ${diff.toFixed(2)} dB</small>`;
      } else if (norm.length === 1 && rs.length === 1) {
        rep = `${norm[0].toFixed(2)} dB (${esc(fmtPct(pct(norm[0])))})<small>1회 측정 · 잠정 참고값</small>`;
      } else if (rs.some(r => r.ceiling || r.thr === null || r.thr === undefined)) {
        rep = '<span class="muted">평균 제외 (‘재지 못함’ 포함)</span>';
      } else {
        rep = '<span class="muted">참고값만 존재 (평균 제외)</span>';
      }
      return `<tr><td class="num"><b>${fm} Hz</b></td>${cells}<td>${rep}</td></tr>`;
    }).join('');
    return `<table><thead>${head}</thead><tbody>${body}</tbody></table>`;
  })();

  // 2. 측정(Run)별 상세 표 + 품질 지표 집계
  let rpPass = 0, worstRms = 0, scaledN = 0, lateN = 0, earlySum = 0;
  const drifts = [], rpBadList = [];
  const runRows = runs.map(r => {
    const rp = replayCheck(r, r.P || P), rm = rmsCheck(r);
    if (rp.ok) rpPass++; else rpBadList.push(`#${r.order}(${r.fm}Hz): ${rp.why}`);
    worstRms = Math.max(worstRms, rm.worst || 0);
    scaledN += rm.scaled || 0;
    const tr = r.trials || [];
    const chosen = tr.filter(t => !t.u);
    for (const t of tr) {
      if (typeof t.drift === 'number' && isFinite(t.drift)) drifts.push(t.drift);
      if (t.late) lateN++;
      earlySum += t.early || 0;
    }
    const pos = posStats(r);
    const rtMed = medianOf(chosen.map(t => t.rt).filter(v => typeof v === 'number' && isFinite(v)));
    const dunnoPct = r.nTrials ? ((100 * (r.nDunno || 0)) / r.nTrials).toFixed(0) + '%' : '0%';
    const thrCell = r.ceiling || r.thr === null || r.thr === undefined ? '재지 못함' : `${r.thr.toFixed(2)} dB (${esc(fmtPct(pct(r.thr)))})`;
    const pTxt = r.pChance !== null && r.pChance !== undefined ? ` (p=${(+r.pChance).toFixed(3)})` : '';
    return `<tr><td class="num">${r.order ?? ''}</td><td class="num">${r.round || 1}${r.extra ? '+' : ''}</td><td class="num"><b>${r.fm}</b></td>
      <td class="num"><b>${thrCell}</b></td><td class="num">${r.sd !== null && r.sd !== undefined ? r.sd.toFixed(2) : '—'}</td>
      <td>${reportRunBadge(r)}</td><td class="num">${r.k0 ?? 0}/${r.n0 ?? 0}${pTxt}</td><td class="num">${r.nTrials ?? tr.length}</td>
      <td class="num">${r.nDunno ?? 0} (${dunnoPct})</td><td class="num">${rtMed !== null ? Math.round(rtMed) : '—'}</td>
      <td class="num">${r.durS !== undefined ? (r.durS / 60).toFixed(1) : '—'}</td><td class="num">${r.breakBeforeS !== null && r.breakBeforeS !== undefined ? r.breakBeforeS.toFixed(0) : '—'}</td>
      <td class="num">${pos}</td></tr>`;
  }).join('');

  // 3. 계단 궤적 그림 + 반전 깊이 목록
  const stairFigs = runs.map(r => {
    const rev = r.reversals || [], avgLast = (r.P || P).avgLast || 10;
    const revTxt = rev.length ? rev.map((d, i) => i >= rev.length - avgLast && !r.ceiling ? `<b>${d}</b>` : String(d)).join(', ') : '없음';
    const thrLbl = r.ceiling || r.thr === null || r.thr === undefined ? '재지 못함' : `${r.thr.toFixed(2)} dB (${fmtPct(pct(r.thr))})`;
    return `<figure>${stairSvg(r)}<figcaption><b>#${r.order} · ${r.fm} Hz · ${r.round || 1}바퀴${r.extra ? '(추가)' : ''}</b> — ${esc(thrLbl)}${r.sd !== null && r.sd !== undefined ? ` · SD ${r.sd.toFixed(2)} dB` : ''}<br><span class="muted">반전(${rev.length}회, 굵은 값=평균 사용): ${revTxt}</span></figcaption></figure>`;
  }).join('');

  // 4. 품질 · 무결성 요약
  const abEvs = evs.filter(e => e.type === 'track-abandoned');
  const gapStarts = evs.filter(e => e.type === 'keep-gap-start');
  const gapEnds = evs.filter(e => e.type === 'keep-gap-end');
  const hidN = evs.filter(e => e.type === 'hidden').length;
  const voidN = evs.filter(e => e.type === 'trial-void').length;
  const driftMed = medianOf(drifts), driftMax = drifts.length ? Math.max(...drifts.map(x => Math.abs(x))) : null;
  const gapDetail = gapStarts.length ? gapStarts.map((g, i) => `${localTime(g.from)} (${g.why || '원인 미상'}${gapEnds[i]?.durS !== undefined ? `, ${gapEnds[i].durS}s` : ''})`).join('; ') : '없음';
  const abDetail = abEvs.length ? abEvs.map(a => `${a.fm} Hz (${a.stopVia || '중단'}, ${a.trialList?.length ?? 0}시행, 당시 깊이 ${a.depthNow ?? '?'} dB)`).join('; ') : '없음';
  const noiseList = s.setup?.noise || [], demoList = s.setup?.demo || [];
  const noiseTxt = noiseList.length ? `${noiseList.length}회 (RMS ${noiseList.map(x => x.rmsDb + ' dBFS').join(', ')})` : '0회';
  const demoTxt = demoList.length ? `${demoList.length}회 (떨림 ${demoList.filter(x => x.kind === 'mod').length} · 비떨림 ${demoList.filter(x => x.kind === 'flat').length})` : '0회';

  // 5. 시행별 원시 기록표 (접이식)
  const rawDetails = runs.map(r => {
    const tr = r.trials || [], revAt = r.revAt || [], nRev = revAt.length;
    const nUse = r.ceiling || r.thr === null || r.thr === undefined ? 0 : Math.min((r.P || P).avgLast || 10, nRev);
    const tRows = tr.map((t, i) => {
      const ri = revAt.indexOf(i);
      const revMark = ri < 0 ? '' : `${ri + 1}${ri + 1 > nRev - nUse ? ' (사용)' : ''}`;
      const flags = [];
      if (t.early) flags.push(`이른입력 ${t.early}`);
      if (t.hid) flags.push('가려짐');
      if (t.rep) flags.push(`재제시 ${t.rep}`);
      if (t.late) flags.push('예약늦음');
      if (t.kGap) flags.push('출력끊김중');
      if (t.scaled) flags.push('피크감쇠');
      const ansTxt = t.a !== undefined && t.a !== null ? `${t.a + 1}${t.u ? ' (난수)' : ''}` : '—';
      return `<tr><td class="num">${i + 1}</td><td class="num">${t.d}</td><td class="num">${t.tg !== undefined ? t.tg + 1 : '—'}</td><td class="num">${ansTxt}</td>
        <td>${t.c ? '<span class="good">맞음</span>' : '<span class="bad">틀림</span>'}</td><td class="num">${t.u ? '예' : ''}</td>
        <td>${esc(t.inp || '')}</td><td class="num">${t.rt ?? '—'}</td><td class="num">${esc((t.rms || []).join(' / '))}</td>
        <td class="num">${esc((t.pk || []).join(' / '))}</td><td class="num">${revMark}</td><td>${esc(flags.join(', '))}</td></tr>`;
    }).join('');
    return `<details class="raw"><summary>#${r.order} · ${r.fm} Hz (${r.round || 1}바퀴${r.extra ? ' 추가' : ''}) — 전체 시행 ${tr.length}건 펼쳐 보기</summary>
      <div class="tw"><table class="dense"><thead><tr><th>#</th><th>깊이(dB)</th><th>정답</th><th>답</th><th>정오</th><th>모르겠음</th><th>입력</th><th>반응(ms)</th><th>구간 RMS(dBFS)</th><th>봉우리(dBFS)</th><th>반전</th><th>특이사항</th></tr></thead><tbody>${tRows}</tbody></table></div></details>`;
  }).join('');

  return `<article class="sess">
    ${total > 1 ? `<div class="sess-tag">회기 ${idx + 1} / ${total}${src ? ` · 출처: ${esc(src)}` : ''}</div>` : ''}
    <section class="sec">
      <h2>1. 회기 · 대상자 · 청취 환경 정보</h2>
      <div class="kv-grid">
        <table class="kv"><tbody>
          <tr><th>참가 번호</th><td>${esc(s.code || '미입력 (익명)')}</td></tr>
          <tr><th>검사 귀</th><td>${esc(EAR[s.ear] || s.ear || '미입력')}</td></tr>
          <tr><th>소리 전달 경로</th><td>${esc(pathTxt)}</td></tr>
          <tr><th>기기 볼륨 기록값</th><td>${s.osVolume !== null && s.osVolume !== undefined ? esc(String(s.osVolume)) : '미기록'}</td></tr>
          <tr><th>검사 일시</th><td>${esc(localTime(s.start))} – ${s.end ? esc(localTime(s.end)) : '종료 미기록'}${durMin !== null && isFinite(durMin) ? ` (약 ${durMin.toFixed(1)}분)` : ''}</td></tr>
          <tr><th>종료 사유</th><td>${esc(s.endReason || '미기록')}</td></tr>
          <tr><th>계획 변조 주파수</th><td>${esc((s.fmsPlan || []).join(' · '))} Hz (${(s.rounds || []).length}바퀴)</td></tr>
          <tr><th>검사 후 집중도 자기보고</th><td>${s.focusEnd ? esc(FOCUS[s.focusEnd] || s.focusEnd) : '미선택'}</td></tr>
        </tbody></table>
        <table class="kv"><tbody>
          <tr><th>나이대 (선택)</th><td>${esc(AGE_LBL[info.age] || info.age || '미입력')}</td></tr>
          <tr><th>해당 귀 인공와우 사용 기간</th><td>${esc(YEARS_LBL[info.ciYears] || info.ciYears || '미입력')}</td></tr>
          <tr><th>난청 시작 시기</th><td>${esc(ONSET_LBL[info.onset] || info.onset || '미입력')}</td></tr>
          <tr><th>음성처리기(인공와우 외부기기) 제조사</th><td>${esc(MAKER_LBL[info.maker] || info.maker || '미입력')}</td></tr>
          <tr><th>참가자 메모</th><td>${esc(info.note || '없음')}</td></tr>
          <tr><th>오디오 · 유지 신호</th><td>표본화 ${s.env?.audio?.sampleRate ?? '?'} Hz · baseLatency ${s.env?.audio?.baseLatencyMs ?? '?'} ms · outputLatency ${s.env?.audio?.outputLatencyMs ?? '?'} ms<br>유지 신호: ${esc(keepModeLabel(sessionKeepKey(s)))}${s.keepalive?.stateAtStart?.wall ? ` (시작 ${esc(localTime(s.keepalive.stateAtStart.wall))})` : ''}${s.keepalive?.warmupWaitedMs ? ` · 초기 대기 ${(s.keepalive.warmupWaitedMs / 1000).toFixed(1)} s` : ''}</td></tr>
          <tr><th>네 번 소리 점검 (온셋)</th><td>${(() => {
            const oc = s.onsetCheck;
            if (!oc) return '기록 없음 (v1 파일)';
            if (oc.skipped) return `건너뜀${oc.trials?.length ? ` (일부 ${oc.trials.length}회 기록)` : ''}`;
            const sum = oc.summary || summarizeOnset(oc.trials || []);
            const det = (oc.trials || []).map((t, i) => `${i + 1}회(${t.silenceBeforeMs / 1000}s): ${t.resp}개/${t.first === 'yes' ? '첫소리약함' : t.first === 'no' ? '정상' : t.first || '-'}`).join(' · ');
            return `<b>${esc(sum.verdict)}</b>${det ? ` — ${esc(det)}` : ''}`;
          })()}</td></tr>
          <tr><th>준비 · 연습 기록</th><td>기준 잡음 ${esc(noiseTxt)} · 데모 ${esc(demoTxt)} · 연습 ${prTr.length}시행 (직접 맞힘 ${prRight}, 모르겠음 ${prDunno}, ${s.practiceRounds || 0}회차)</td></tr>
          <tr><th>브라우저 · 화면</th><td>${esc(s.env?.platform || '')} · 화면 ${esc(s.env?.screen || '')} · 창 ${esc(s.env?.window || '')}</td></tr>
        </tbody></table>
      </div>
    </section>

    <section class="sec">
      <h2>2. 주파수별 종합 결과 (TMTF 요약 및 곡선)</h2>
      <div class="tw">${sumTable}</div>
      ${reportChartSvg(s)}
    </section>

    <section class="sec">
      <h2>3. 측정(Run)별 상세 결과 및 계단 궤적</h2>
      ${runs.length ? `<div class="tw"><table class="dense"><thead><tr><th>#</th><th>바퀴</th><th>Hz</th><th>역치 (dB / %)</th><th>SD</th><th>판정</th><th>0 dB 맞힘</th><th>시행</th><th>모르겠음</th><th>반응(ms)</th><th>분</th><th>휴식(s)</th><th>자리별 맞힘 1·2·3 (모르겠음 제외)</th></tr></thead><tbody>${runRows}</tbody></table></div>
      <p class="cap">반응(ms): 직접 고른 답(모르겠음 제외) 반응시간 중앙값 · 자리별 맞힘 1·2·3: 모르겠음 시행을 제외한 구간별 정답/출현 수.</p>
      <div class="stairs">${stairFigs}</div>` : '<p class="muted">완료된 측정이 없습니다.</p>'}
    </section>

    <section class="sec">
      <h2>4. 자극(Stimulus) 및 적응 계단(Staircase) 기술 명세</h2>
      <div class="kv-grid">
        <table class="kv"><tbody>
          <tr><th colspan="2" class="subh">자극 생성 명세 (Stimulus)</th></tr>
          <tr><th>과제 구조</th><td>${P.nAFC ?? 3}구간 강제선택 (${P.nAFC ?? 3}AFC oddity)</td></tr>
          <tr><th>구간 길이 · 쉼(ISI)</th><td>구간 ${P.dur ?? 0.5} s × ${P.nAFC ?? 3}, 구간 간 쉼 ${P.isi ?? 0.5} s, 첫 구간 앞 무음(lead) ${P.leadS ?? LEAD_S} s</td></tr>
          <tr><th>반송파</th><td>${bandTxt}</td></tr>
          <tr><th>변조 수식 (SAM)</th><td>s(t) = [1 + m·sin(2π·fm·t + φ)]·n(t), m = 10^(D/20) (D: dB, 0 dB = 100%)</td></tr>
          <tr><th>변조 시작 위상 φ</th><td>${phaseTxt}</td></tr>
          <tr><th>켜짐 · 꺼짐 경사</th><td>${rampTxt}</td></tr>
          <tr><th>구간 음압(RMS) 맞춤</th><td>경사 적용 후 구간별 RMS = 0.05 (−26.02 dBFS) 정확 정규화 · 레벨 흔들기(roving) ±${P.rove ?? 0} dB</td></tr>
          <tr><th>자극 재현성</th><td>구간별 32비트 잡음 씨앗(mulberry32) 및 위상 기록 → 파형 사후 재현 가능</td></tr>
          <tr><th>조건 식별 키 (procKey)</th><td class="mono">${esc(s.procKey || PROC_KEY)}</td></tr>
        </tbody></table>
        <table class="kv"><tbody>
          <tr><th colspan="2" class="subh">적응 계단 · 채점 · 반복 규칙 (Staircase)</th></tr>
          <tr><th>적응 절차</th><td>2-down 1-up (70.7% 정답률 지점 추적 · Levitt 1971)</td></tr>
          <tr><th>시작 깊이 · 범위</th><td>${P.startDb ?? 0} dB (100%) 시작 · 허용 범위 −40 ~ 0 dB</td></tr>
          <tr><th>보폭 (Step size)</th><td>초기 ${P.bigUntil ?? 4}회 반전까지 ${P.big ?? 4} dB, 이후 ${P.small ?? 2} dB (Won et al. 2011)</td></tr>
          <tr><th>종료 · 역치 산출</th><td>총 ${P.totalRev ?? 14}회 반전 완료 시 종료 · 마지막 ${P.avgLast ?? 10}회 반전 깊이 산술 평균(dB) 및 SD · 최대 160시행(초과 시 미완)</td></tr>
          <tr><th>천장(재지 못함) 규칙</th><td>${ceilTxt}</td></tr>
          <tr><th>우연 수준 검정</th><td>0 dB 시행 수 n0 ≥ 6일 때 단측 이항검정 P(X ≥ k0 | n0, 1/${P.nAFC ?? 3}) &gt; 0.05이면 참고값(우연 수준) 표시</td></tr>
          <tr><th>‘모르겠음’ 처리</th><td>3구간 중 균등 무작위 1개 선택(치우침 없는 찍기, p = 1/3) · 시행별 u=1 기록 · 자리별 맞힘 분석 제외</td></tr>
          <tr><th>반복 · 3차 추가 규칙</th><td>전 주파수 무작위 1바퀴 → 선택 2바퀴 → 정상 두 값 차 &gt; 3 dB 주파수만 3차 추가 제안 (Park et al. 2015)</td></tr>
          <tr><th>피드백</th><td>${P.feedback === false ? '없음' : '시행마다 시각 피드백 제공 (맞음 · 틀림 · 모르겠음 구분 표시)'}</td></tr>
        </tbody></table>
      </div>
    </section>

    <section class="sec">
      <h2>5. 데이터 품질 · 신뢰도 · 보안 및 코드 무결성 점검</h2>
      <table class="kv"><tbody>
        <tr><th>연결 보안 (HTTPS)</th><td>${(() => {
          const o = String(s.env?.origin || '');
          if (o.startsWith('https://')) return `<span class="good">HTTPS 보안 연결</span> (${esc(o)})`;
          if (o === 'file') return '로컬 파일 실행 (file://)';
          if (o.startsWith('http://')) {
            const h = o.replace(/^http:\/\//, '').split(':')[0];
            return isLocalHost(h) ? `로컬 미리보기 (${esc(o)})` : `<span class="bad">비보안 HTTP 연결</span> (${esc(o)})`;
          }
          return esc(o || '미기록');
        })()}</td></tr>
        <tr><th>계단 사후 재계산 (replayCheck)</th><td>${runs.length ? (rpPass === runs.length ? `<span class="good">전체 ${rpPass}/${runs.length}개 측정 일치</span> (기록된 정오열로 계단 깊이·반전·역치·중단 완전 재현)` : `<span class="bad">일치 ${rpPass}/${runs.length}</span> — 불일치: ${esc(rpBadList.join('; '))}`) : '측정 없음'}</td></tr>
        <tr><th>구간 음압(RMS) 정합성</th><td>${runs.length ? (worstRms <= 0.1 && !scaledN ? `<span class="good">정상</span> (최대 구간 간 RMS 차 ${worstRms.toFixed(3)} dB, 피크 감쇠 0건)` : `<span class="bad">확인 필요</span> (최대 RMS 차 ${worstRms.toFixed(3)} dB, 피크 감쇠 ${scaledN}건)`) : '측정 없음'}</td></tr>
        <tr><th>오디오 출력 · 18 Hz 감시 (1초)</th><td>${gapStarts.length ? `<span class="bad">출력 끊김/이탈 ${gapStarts.length}건</span> — ${esc(gapDetail)}` : `<span class="good">끊김 없음</span> (폴링 ${s.keepMonitor?.polls ?? '—'}회 중 정상 ${s.keepMonitor?.ok ?? '—'} · 버퍼 ${s.keepMonitor?.buffer ?? '—'}${s.keepMonitor?.db18Min !== null && s.keepMonitor?.db18Min !== undefined ? ` · 18 Hz ${s.keepMonitor.db18Min}~${s.keepMonitor.db18Max} dBFS` : ''})`}</td></tr>
        <tr><th>타이밍 · 행동 품질</th><td>불빛-소리 어긋남(drift): ${driftMed !== null ? `중앙 ${Math.round(driftMed)} ms, 최대 |${Math.round(driftMax)}| ms` : '기록 없음'} · 예약 지연(late): ${lateN}건 · 이른 입력(early): ${earlySum}회 · 화면 가려짐: ${hidN}회 (재제시 ${voidN}시행)</td></tr>
        <tr><th>중간 중단 · 버린 측정</th><td>${abEvs.length ? `${abEvs.length}건 — ${esc(abDetail)}` : '없음'}</td></tr>
        <tr><th>앱 판 · 코드 무결성 (build)</th><td>앱 ${esc(s.app || '')} · <b>${esc(buildStatus)}</b>${df && df.length ? ` · 화면≠서버 파일: ${esc(df.join(', '))}` : ''}<br><span class="mono muted">SHA-256: ${esc(s.build?.sha256 || '미기록')} (자극·계단 코드는 독립 Python 기준 구현 및 Lean 4 형식 증명으로 6단계 검증됨)</span></td></tr>
      </tbody></table>
    </section>

    <section class="sec">
      <h2>6. 측정별 전체 시행 원시 기록 (상세 검토용)</h2>
      ${runs.length ? rawDetails : '<p class="muted">시행 기록이 없습니다.</p>'}
    </section>
  </article>`;
}
function specialistReportHtml(sessions, srcs = null) {
  const body = sessions.map((s, i) => reportSessionHtml(s, srcs ? srcs[i] : null, i, sessions.length)).join('');
  const titleCode = sessions.length === 1 ? (sessions[0].code || '익명') : `${sessions.length}개 회기`;
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'">
<title>소리 떨림 검사 (TMTF) 전문가 참고 보고서 — ${esc(titleCode)}</title>
<style>
*{box-sizing:border-box}
body{margin:0;background:#f5f7fa;color:#111827;font-family:'Pretendard','Apple SD Gothic Neo','Malgun Gothic',system-ui,-apple-system,sans-serif;font-size:14px;line-height:1.55;word-break:keep-all}
.bar{position:sticky;top:0;z-index:10;background:#ffffff;border-bottom:1px solid #d9e0ea;padding:10px 20px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between}
.bar .meta{font-size:12.5px;color:#526072}
.bar .btns{display:flex;gap:8px;flex-wrap:wrap}
.bar button{font-family:inherit;font-size:13px;font-weight:700;padding:8px 14px;border-radius:8px;border:1px solid #cbd5e1;background:#ffffff;color:#111827;cursor:pointer}
.bar button.pri{background:#1366d6;border-color:#1366d6;color:#ffffff}
.sheet{max-width:960px;margin:20px auto 48px;background:#ffffff;border:1px solid #d9e0ea;border-radius:14px;padding:28px 32px;box-shadow:0 4px 16px rgba(15,23,42,.05)}
.head{border-bottom:2px solid #111827;padding-bottom:14px;margin-bottom:16px;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:10px}
.head h1{margin:0;font-size:22px;letter-spacing:-.02em}
.head .sub{margin:4px 0 0;font-size:13px;color:#526072}
.head .stamp{font-size:12px;color:#526072;text-align:right;font-variant-numeric:tabular-nums}
.notice{background:#fff8e6;border:1px solid #e6b85c;border-left:4px solid #c97a00;border-radius:8px;padding:12px 15px;margin-bottom:20px;font-size:13px;color:#4a2e00}
.notice strong{display:block;font-size:14px;margin-bottom:4px;color:#7c4700}
.notice ul{margin:4px 0 0;padding-left:18px}
.notice li{margin:2px 0}
.sess{margin-top:22px}
.sess + .sess{border-top:3px solid #111827;padding-top:22px;page-break-before:always}
.sess-tag{display:inline-block;font-size:12px;font-weight:700;padding:3px 10px;border-radius:999px;background:#eef2f7;color:#334155;margin-bottom:10px}
.sec{margin-bottom:22px;break-inside:avoid-page}
h2{margin:0 0 10px;font-size:15.5px;letter-spacing:-.015em;padding-bottom:5px;border-bottom:1px solid #e2e8f0;color:#0f172a}
.kv-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.tw{overflow-x:auto}
table{border-collapse:collapse;width:100%;font-size:13px;font-variant-numeric:tabular-nums}
th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left;vertical-align:top}
thead th{background:#f8fafc;color:#334155;font-weight:700;white-space:nowrap}
table.kv th{width:34%;background:#f8fafc;color:#334155;font-weight:600}
table.kv th.subh{width:auto;background:#eef2f7;color:#0f172a;font-weight:700}
table.dense{font-size:11.5px}
table.dense th,table.dense td{padding:5px 5px;white-space:nowrap}
table.dense thead th{white-space:normal;line-height:1.25}
td.num{text-align:right;white-space:nowrap}
td small{display:block;color:#526072;font-size:11.5px;margin-top:2px}
.mono{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:11.5px;word-break:break-all}
.muted{color:#64748b}
.good{color:#0e7a48;font-weight:700}
.bad{color:#c92a2a;font-weight:700}
.badge{display:inline-block;padding:1px 7px;border-radius:999px;font-size:11px;font-weight:700;white-space:nowrap}
.badge.ok{background:#ecfdf3;color:#0e7a48;border:1px solid #a7f3d0}
.badge.warn{background:#fff9eb;color:#92400e;border:1px solid #fcd34d}
.badge.bad{background:#fff1f2;color:#b91c1c;border:1px solid #fecdd3}
svg.chart{width:100%;height:auto;display:block;margin-top:12px;background:#ffffff}
.chart .grid{stroke:#e2e8f0;stroke-width:1;stroke-dasharray:2 3}
.chart .tick{fill:#475569;font-size:11.5px;font-variant-numeric:tabular-nums}
.chart .axl{fill:#1e293b;font-size:12px;font-weight:700}
.chart .ln{fill:none;stroke:#1366d6;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}
.chart .pt{fill:#1366d6;stroke:#ffffff;stroke-width:1.8}
.chart .pt2{fill:#ffffff;stroke:#1366d6;stroke-width:2.2}
.chart .pt-ref{fill:#ffffff;stroke:#b45309;stroke-width:2;stroke-dasharray:3 2}
.chart .ceil{fill:none;stroke:#c92a2a;stroke-width:2.2;stroke-linejoin:round}
.chart .stair{fill:none;stroke:#64748b;stroke-width:1.5;stroke-linejoin:round}
.chart .c1{fill:#0e7a48}
.chart .c0{fill:#ffffff;stroke:#c92a2a;stroke-width:1.5}
.chart .rv{fill:none;stroke:#1366d6;stroke-width:1.5}
.chart .thr{stroke:#1366d6;stroke-width:1.5;stroke-dasharray:5 4}
.cap{margin:6px 0 0;font-size:12px;color:#526072}
.stairs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}
.stairs figure{margin:0;padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;background:#fafbfd;break-inside:avoid}
.stairs svg.chart{margin-top:0;background:transparent}
.stairs figcaption{font-size:11.5px;color:#334155;margin-top:4px;line-height:1.45;font-variant-numeric:tabular-nums}
details.raw{border:1px solid #e2e8f0;border-radius:8px;padding:6px 10px;margin:8px 0;background:#fafbfd}
details.raw summary{cursor:pointer;font-weight:700;font-size:12.5px;color:#1e293b;padding:2px 0}
details.raw .tw{margin-top:8px}
.foot{margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:11.5px;color:#64748b}
@media (max-width:740px){.sheet{margin:0;border:none;border-radius:0;padding:18px 14px}.kv-grid,.stairs{grid-template-columns:1fr}}
@media print{
  @page{size:A4;margin:12mm}
  body{background:#ffffff;font-size:11.5px}
  .bar{display:none}
  .sheet{max-width:none;margin:0;padding:0;border:none;box-shadow:none}
  .notice{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .badge,.good,.bad,svg.chart{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
</style>
</head>
<body>
<div class="bar">
  <span class="meta">전문가(청능사 · 인공와우 엔지니어) 전달용 참고 보고서 · 외부 전송 없는 오프라인 문서</span>
  <div class="btns">
    <button type="button" onclick="const ds=[...document.querySelectorAll('details.raw')];const o=ds.some(d=>!d.open);ds.forEach(d=>d.open=o)">시행 원시표 모두 펼치기/접기</button>
    <button type="button" class="pri" onclick="window.print()">인쇄 / PDF 저장</button>
  </div>
</div>
<main class="sheet">
  <header class="head">
    <div>
      <h1>소리 떨림 검사 (TMTF) 전문가 참고 보고서</h1>
      <p class="sub">Temporal Modulation Transfer Function · 청능사 · 인공와우 엔지니어 참고용</p>
    </div>
    <div class="stamp">문서 생성: ${esc(localTime(iso()))}<br>앱 판: ${esc(APP_VERSION)}</div>
  </header>
  <aside class="notice">
    <strong>참고용 고지 — 진단 도구가 아닙니다</strong>
    <ul>
      <li>본 보고서는 <b>임상·연구 참고용</b>이며 의학적 진단 도구가 아닙니다. 인공와우 맵(MAP) 변경 및 임상 결정은 청능사의 표준 검사와 종합 평가로 판단해야 합니다.</li>
      <li>결과는 <b>청취자 + 음성처리기(인공와우 외부기기: 프로그램·볼륨·전처리) + 소리 전달 경로 + 재생 기기</b>가 합쳐진 값이며, 제시 음압(dB SPL/dBA)은 보정되지 않은 자가 조절 볼륨 기준입니다.</li>
      <li>본 절차(3AFC, 광대역 잡음, 0.5 s + ISI 0.5 s, 10 ms 직선 경사, 무작위 위상, Won 규칙 14반전/마지막 10반전, 0 dB 4오답 중단)는 Won et al. (2011), Park et al. (2015), De Ruiter et al. (2015)의 원절차와 다르므로 문헌 수치와 직접 순위 비교하지 마세요.</li>
      <li>‘재지 못함’은 숫자가 아니므로 평균에 포함하지 않으며, 1회 측정값·‘우연 수준’·‘미완’은 참고 값입니다.</li>
    </ul>
  </aside>
  ${body}
  <footer class="foot">
    참고 문헌: Levitt (1971) JASA 49:467 · Viemeister (1979) JASA 66:1364 · Won et al. (2011) JASA 130:376 · Park et al. (2015) JARO 16:389 · De Ruiter et al. (2015) Ear Hear 36:557 · Shen &amp; Richards (2013) JASA · Goehring &amp; Carlyon (2026) AUDITO.<br>
    이 파일은 참가자 기기에서 로컬로 생성된 독립 HTML 문서이며 외부 네트워크 요청을 포함하지 않습니다. 원시 데이터 재검증(계단·자극 파형 재생성)에는 함께 저장된 .json 결과 파일과 tools/verify_result.py 를 사용하세요.
  </footer>
</main>
</body>
</html>`;
}
function saveSpecialistReport(sessions, kind, srcs = null, recordExport = true) {
  if (!sessions.length) { alert('저장할 결과가 없습니다.'); return; }
  const name = reportFileNameFor(sessions, kind);
  download(name, specialistReportHtml(sessions, srcs), 'text/html;charset=utf-8');
  if (recordExport) {
    for (const s of sessions) { (s.exports ||= []).push({ at: iso(), how: kind === 'all' ? 'report-html-all' : 'report-html', name }); }
    saveStore();
  }
  return name;
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
  $('#vState').textContent = tx(`검사 ${n}개를 열었습니다.`, `Opened ${n} session(s).`) + (bad.length ? tx(` 열지 못한 파일: ${bad.join(' / ')}`, ` Could not open: ${bad.join(' / ')}`) : '');
  renderViewer();
});
$('#vLocal').onclick = () => {
  let n = 0;
  for (const s of DB.sessions) if ((s.runs || []).length && !VIEW.sessions.some(x => x.s.id === s.id)) { VIEW.sessions.push({ s, src: tx('이 기기', 'This device') }); n++; }
  $('#vState').textContent = tx(`이 기기의 검사 ${n}개를 열었습니다.`, `Opened ${n} session(s) from this device.`);
  renderViewer();
};
$('#vHome').onclick = () => { renderHome(); showPage('pgHome'); };
const csvCell = v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
$('#vCsvRuns').onclick = () => {
  const head = ['파일', '번호', '귀', '듣는방법', '볼륨', '회기', '회기시작', '앱', 'build', '검산', '바퀴', '더', '순서', '변조Hz', '역치dB', '깊이%', '재지못함', '미완', '0dB시행', '0dB맞힘', '우연p', '우연수준',
    '반전SD', '시행수', '모르겠음', '걸린초', '앞쉬는초', '표본화Hz', '출력지연ms', '계단다시', '구간세기차dB', '출력끊김', '절차', '나이', '사용기간', '난청시작', '회사', '집중', '받은파일다름', '유지신호', '온셋판정', '온셋응답'];
  const lines = [head.join(',')];
  for (const { s, src } of VIEW.sessions) for (const r of (s.runs || [])) {
    const rp = replayCheck(r, r.P || s.P || snapP(PR)), rm = rmsCheck(r);
    const oc = s.onsetCheck;
    lines.push([src, s.code, EAR[s.ear] || s.ear, PATH[s.path] || s.path, s.osVolume, s.id, s.start, s.app, s.build?.sha256, s.build?.verified?.status, r.round, r.extra ? 1 : 0, r.order, r.fm, r.thr,
      r.thr === null || r.ceiling ? '' : pct(r.thr).toFixed(1), r.ceiling ? 1 : 0, r.incomplete ? 1 : 0, r.n0, r.k0, r.pChance === null || r.pChance === undefined ? '' : (+r.pChance).toFixed(4), r.atChance ? 1 : 0,
      r.sd, r.nTrials, r.nDunno, r.durS, r.breakBeforeS, r.audio?.sampleRate, r.audio?.outputLatencyMs, rp.ok ? 1 : 0, rm.worst, (r.keepMonitor?.gaps || []).length + (r.keepMonitor?.openAtEnd ? 1 : 0), s.procKey,
      s.info?.age, s.info?.ciYears, s.info?.onset, s.info?.maker, s.focusEnd, (s.build?.differ || []).join(' '),
      sessionKeepKey(s), oc ? (oc.skipped ? '건너뜀' : (oc.summary?.verdict || '')) : '', oc?.summary?.resp ? oc.summary.resp.join(' ') : ''].map(csvCell).join(','));
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

/* ───────────── 한/영 언어 전환 (?lang=en 또는 상단 단추) ───────────── */
const UI_TEXT = {
  ko: {
    title: '소리 떨림 검사',
    txt: {
      appTitle: '소리 떨림 검사', appSub: '인공와우 사용자를 위한 소리 듣기 검사',
      hWhat: '어떤 검사인가요?', hLearn: '이 검사를 하면 알 수 있는 것', hPrep: '준비할 것', hPrep1: '조용한 장소',
      hPrep3: '평소 사용하는 음성처리기 프로그램과 볼륨', hPrep4: '컴퓨터 사용을 권장합니다 (휴대폰·태블릿도 가능)',
      goSetup: '시작하기', hSaved: '이 기기에 저장된 검사', homeSaveAll: '모두 파일로 저장',
      goViewer: '결과 파일 열기 (청능사·연구자용)',
      qEar: '어느 쪽 귀로 검사하시나요?', earHint: '한쪽 귀만 검사할 때는 반대쪽 음성처리기(인공와우 외부기기)나 보청기를 잠시 빼 주세요.',
      qPath: '소리를 듣는 방법을 선택해 주세요.',
      btNote: '블루투스 연결은 소리 앞부분이 끊길 수 있습니다. 가능하면 유선 연결이나 스피커를 권장하지만, 그대로 진행하셔도 됩니다.',
      qCode: '참가 번호', qCodeOpt: '(안내받은 번호가 있을 때만 입력)', codeHint: '개인정보 보호를 위해 이름은 적지 마세요.',
      moreSum: '추가 정보 입력 (선택 사항)', lblAge: '나이', lblYears: '인공와우 사용 기간 (이쪽 귀)',
      lblOnset: '청력이 떨어진 시기', lblMaker: '음성처리기 제조사', lblNote: '메모 (짧게)',
      setupBack: '뒤로', setupNext: '다음', setupNeed: '1번과 2번 항목을 선택해 주세요.',
      hSound: '소리 크기 맞추기',
      snd3: '볼륨을 맞춘 뒤에는 검사가 끝날 때까지 바꾸지 말아 주세요.',
      noisePlay: '소리 재생', noiseStop: '정지', lblOsVol: '현재 기기 볼륨 수치 (알고 있다면 입력)',
      iphoneHint: '아이폰은 측면 무음 스위치를 해제해야 소리가 납니다.',
      hDemo: '떨리는 소리 미리 들어보기', demoMod: '떨리는 소리', demoFlat: '떨리지 않는 소리',
      soundBtNote: '블루투스로 연결되어 있습니다. 다음 단계의 짧은 소리 점검으로 소리 앞부분이 잘리는지 확인하실 수 있습니다.',
      hKeep: '소리 끊김 방지', keepDesc: '소리가 끊기지 않도록 거의 들리지 않는 아주 낮은 소리를 계속 내보냅니다.',
      volOkLbl: '편안한 크기로 맞췄습니다', soundBack: '뒤로', soundNext: '다음: 소리 점검',
      onsetSkip: '건너뛰고 연습 시작', onReplay: '다시 듣기', onFirstQ: '첫 소리가 나머지보다 작거나 짧았나요?',
      onTrialNext: '다음', onKeysHint: '키보드: 숫자 0–4, 다음은 Enter', hOnRes: '소리 점검 결과',
      onsetBack: '소리 맞추기로', onsetAgain: '점검 다시 하기', onsetStart: '연습 시작하기',
      stopBtn: '잠시 멈춤', dunno: '모르겠음', keysHint: '키보드: 1 · 2 · 3, 모르겠음은 0',
      bEnd: '여기까지만 하기', bPractice: '연습 한 번 더',
      againBtn: '한 번 더 하기', finishBtn: '여기서 마치기',
      hSend: '결과 저장 및 공유', sendDesc: '‘결과 파일 저장’은 전체 기록 파일(.json), ‘전문가용 보고서 저장’은 청능사·엔지니어께 보여드릴 참고 문서(.html, 인쇄·PDF 가능)입니다.',
      saveFile: '결과 파일 저장', saveReport: '전문가용 보고서 저장', shareFile: '파일 공유하기', shareReport: '보고서 공유하기', copyText: '요약 복사', toHome: '처음으로',
      hViewer: '결과 파일 열기', vDesc: '참가자가 보낸 결과 파일(.json)을 선택하면 이 화면에서 열립니다. 파일은 브라우저 안에서만 처리되며 외부로 전송되지 않습니다.',
      vFilesLbl: '파일 선택', vLocal: '이 기기에 저장된 검사', vReport: '전문가용 보고서 저장', vCsvRuns: '측정 CSV 저장', vCsvTrials: '시행 CSV 저장', vHome: '처음으로',
    },
    html: {
      hWhat1: '‘쉬—’ 하는 소리 <b>세 개</b>를 차례로 들려드립니다. 그중 <b>하나만 떨리게 들립니다.</b>',
      hWhat2: '떨리는 소리가 <b>몇 번째</b>였는지 고르시면 됩니다.',
      hWhat3: '처음에는 쉽지만, 맞힐수록 떨림이 미세해져 점점 어려워집니다. <b>떨림이 아주 조금이라도 느껴지면 그 번호를 선택해 주세요.</b> 세 소리가 완전히 똑같이 들릴 때만 ‘모르겠음’을 눌러 주세요.',
      hLearn1: '<b>미세한 소리 떨림 감지 수준</b>: 느린 떨림부터 빠른 떨림까지 얼마나 약한 떨림을 구별할 수 있는지 그래프로 확인할 수 있습니다.',
      hLearn2: '<b>말소리 리듬·변화 파악 참고</b>: 말소리는 크기가 빠르게 변하며 이어집니다. 내 귀와 음성처리기(인공와우 외부기기)가 이런 빠른 소리 변화를 얼마나 잘 따라가는지 참고할 수 있습니다.',
      hLearn3: '<b>양쪽 귀 및 설정 전후 비교</b>: 왼쪽·오른쪽 귀를 따로 해보거나, 음성처리기 설정·프로그램을 바꾸기 전과 후를 같은 조건으로 비교해 볼 수 있습니다.',
      hLearn4: '<b>상담용 보고서 저장</b>: 검사가 끝나면 <b>전문가용 보고서</b>로 저장해 청능사나 인공와우 엔지니어와 상담할 때 참고 자료로 활용할 수 있습니다.',
      hNotice1: '이 검사는 <b>의학적 진단이 아닙니다.</b> 음성처리기 설정 변경은 반드시 청능사와 상의해 주세요.',
      hNotice2: '이름이나 연락처는 묻지 않습니다. 결과는 이 기기에만 저장되며, 직접 <b>‘결과 파일 저장’</b>을 누르지 않으면 외부로 전송되지 않습니다.',
      snd1: '<b>‘소리 재생’</b>을 누르면 10초 동안 ‘쉬—’ 하는 소리가 나옵니다.',
      snd2: '기기 볼륨을 조절해 <b>편안하게 잘 들리는 크기</b>로 맞춰 주세요. 너무 크게 올리지 마세요.',
      demoHint: '떨림이 빠를 때는 ‘거칠게’ 또는 ‘웅웅’ 울리듯 들릴 수 있습니다. 나머지 두 소리와 <b>다르게 들리는 소리</b>를 고르시면 됩니다.',
      onPrompt: '짧은 소리가 <b>몇 개</b> 들렸나요?',
      askText: '세 소리 중 <b>떨리는 소리</b>는 몇 번째인가요?',
    },
    steps: ['준비', '소리 맞추기', '소리 점검', '연습 · 검사'],
    onCounts: ['0개', '1개', '2개', '3개', '4개'],
    onFirst: { yes: '예', no: '아니오', unsure: '모르겠음' },
    ear: EAR, path: PATH, age: AGE_LBL, years: YEARS_LBL, onset: ONSET_LBL, maker: MAKER_LBL, none: '선택 안 함',
    codePh: '예: P02', ivAria: ['1번', '2번', '3번'], progAria: '진행률', onProgAria: '점검 진행률',
  },
  en: {
    title: 'Sound Flutter Test',
    txt: {
      appTitle: 'Sound Flutter Test', appSub: 'A listening test for cochlear implant users',
      hWhat: 'How does it work?', hLearn: 'What you can learn from this test', hPrep: 'Before you start', hPrep1: 'A quiet room',
      hPrep3: 'Your everyday sound processor program and volume', hPrep4: 'A computer works best. Phones and tablets also work.',
      goSetup: 'Start', hSaved: 'Saved tests on this device', homeSaveAll: 'Save all to file',
      goViewer: 'Open result files (for clinicians / researchers)',
      qEar: 'Which ear are you testing?', earHint: 'If testing one ear, please take off the sound processor or hearing aid on the other side.',
      qPath: 'How are you listening?',
      btNote: 'Bluetooth may clip the start of sounds. Use a wired connection or speaker if you can, though Bluetooth still works.',
      qCode: 'Participant ID', qCodeOpt: '(only if you were given one)', codeHint: 'Please do not enter your name.',
      moreSum: 'Optional info (you can skip this)', lblAge: 'Age group', lblYears: 'Years using CI in this ear',
      lblOnset: 'When hearing loss started', lblMaker: 'Sound processor brand', lblNote: 'Short note (optional)',
      setupBack: 'Back', setupNext: 'Next', setupNeed: 'Please choose answers for 1 and 2.',
      hSound: 'Set a comfortable volume',
      snd3: 'Once set, please keep the volume the same until the test finishes.',
      noisePlay: 'Play sound', noiseStop: 'Stop', lblOsVol: 'Current device volume number (if known)',
      iphoneHint: 'On iPhone, switch off the side silent toggle so sound can play.',
      hDemo: 'Hear an example', demoMod: 'Fluttering sound', demoFlat: 'Steady sound',
      soundBtNote: 'You selected Bluetooth. The quick sound check on the next step can check if the start of sounds is cut off.',
      hKeep: 'Keep sound steady', keepDesc: 'To prevent the start of sounds from cutting off, this page continuously plays a very low, nearly silent tone.',
      volOkLbl: 'Volume is comfortable', soundBack: 'Back', soundNext: 'Next: Sound check',
      onsetSkip: 'Skip to practice', onReplay: 'Replay', onFirstQ: 'Did the first beep sound softer or shorter than the rest?',
      onTrialNext: 'Next', onKeysHint: 'Keyboard: 0–4, Enter for Next', hOnRes: 'Sound check result',
      onsetBack: 'Back to volume', onsetAgain: 'Check again', onsetStart: 'Start practice',
      stopBtn: 'Pause', dunno: 'Not sure', keysHint: 'Keyboard: 1 · 2 · 3, Not sure: 0',
      bEnd: 'Finish here', bPractice: 'Practice again',
      againBtn: 'Do one more round', finishBtn: 'Finish here',
      hSend: 'Save & share results', sendDesc: '“Save result file” downloads the full data (.json). “Save specialist report” saves a printable/PDF reference report (.html) for your audiologist or CI engineer.',
      saveFile: 'Save result file', saveReport: 'Save specialist report', shareFile: 'Share file', shareReport: 'Share report', copyText: 'Copy summary', toHome: 'Home',
      hViewer: 'Open result files', vDesc: 'Open participant .json result files here. Everything stays in your browser and is never uploaded.',
      vFilesLbl: 'Choose files', vLocal: 'Saved on this device', vReport: 'Save specialist report', vCsvRuns: 'Export runs CSV', vCsvTrials: 'Export trials CSV', vHome: 'Home',
    },
    html: {
      hWhat1: 'You will hear <b>three</b> steady “shh” sounds in a row. Only <b>one of them flutters.</b>',
      hWhat2: 'Pick <b>which one</b> was the fluttering sound.',
      hWhat3: 'It starts easy and gets harder as you get answers right. <b>If you notice even a tiny flutter, pick that number.</b> Only press “Not sure” when all three sounds feel completely identical.',
      hLearn1: '<b>Flutter detection level</b>: See on a chart how soft a flutter you can hear, from slow to fast flutter.',
      hLearn2: '<b>Speech rhythm &amp; change reference</b>: Speech relies on rapid loudness changes, so this gives a reference for how your ear and sound processor follow quick sound changes.',
      hLearn3: '<b>Left/right &amp; before/after comparison</b>: Repeat under the same setup to compare left vs. right ear, or before and after changing a sound processor program or setting.',
      hLearn4: '<b>Consultation report</b>: Save a <b>specialist report</b> at the end to share as a reference with your audiologist or CI engineer.',
      hNotice1: 'This test is <b>not a medical diagnosis.</b> Talk to your audiologist before changing any sound processor settings.',
      hNotice2: 'We never ask for your name or contact details. Results stay only in this browser and leave <b>only when you tap “Save result file”.</b>',
      snd1: 'Tap <b>“Play sound”</b> to hear a steady “shh” sound for 10 seconds.',
      snd2: 'Adjust your device volume to a <b>comfortable, clearly audible level</b>. Do not make it too loud.',
      demoHint: 'Faster flutter can sound rough or buzzing. Just pick whichever sound feels <b>different from the other two</b>.',
      onPrompt: 'How many short beeps did you hear?',
      askText: 'Which of the three sounds was <b>fluttering</b>?',
    },
    steps: ['Setup', 'Volume', 'Sound check', 'Practice & test'],
    onCounts: ['0', '1', '2', '3', '4'],
    onFirst: { yes: 'Yes', no: 'No', unsure: 'Not sure' },
    ear: EAR_EN, path: PATH_EN, age: AGE_EN, years: YEARS_EN, onset: ONSET_EN, maker: MAKER_EN, none: 'Not selected',
    codePh: 'e.g. P02', ivAria: ['Sound 1', 'Sound 2', 'Sound 3'], progAria: 'Progress', onProgAria: 'Sound check progress',
  },
};
function setSelectLabels(id, map, noneTxt) {
  const el = $('#' + id); if (!el) return;
  for (const o of el.querySelectorAll('option')) {
    const v = o.getAttribute('value');
    if (v === '') o.textContent = noneTxt;
    else if (map[v]) o.textContent = map[v];
  }
}
function applyLang(lang, rerender = true) {
  LANG = lang === 'en' ? 'en' : 'ko';
  const L = UI_TEXT[LANG];
  if (document.documentElement) document.documentElement.setAttribute('lang', LANG);
  document.title = L.title;
  const lt = $('#langToggle');
  if (lt) { lt.textContent = LANG === 'en' ? 'KO' : 'EN'; lt.setAttribute('aria-label', LANG === 'en' ? 'Switch to Korean' : 'Switch to English'); }
  for (const [id, v] of Object.entries(L.txt)) { const el = $('#' + id); if (el) el.textContent = v; }
  for (const [id, v] of Object.entries(L.html)) { const el = $('#' + id); if (el) el.innerHTML = v; }
  $$('.st-l1').forEach(el => { el.textContent = L.steps[0]; });
  $$('.st-l2').forEach(el => { el.textContent = L.steps[1]; });
  $$('.st-l3').forEach(el => { el.textContent = L.steps[2]; });
  $$('.st-l4').forEach(el => { el.textContent = L.steps[3]; });
  $$('#earPick .choice').forEach(b => { if (L.ear[b.dataset.v]) b.textContent = L.ear[b.dataset.v]; });
  $$('#pathPick .choice').forEach(b => { if (L.path[b.dataset.v]) b.textContent = L.path[b.dataset.v]; });
  $$('#onCountPick .choice').forEach(b => { const k = Number(b.dataset.v); if (L.onCounts[k]) b.textContent = L.onCounts[k]; });
  $$('#onFirstPick .choice').forEach(b => { if (L.onFirst[b.dataset.v]) b.textContent = L.onFirst[b.dataset.v]; });
  setSelectLabels('infoAge', L.age, L.none);
  setSelectLabels('infoYears', L.years, L.none);
  setSelectLabels('infoOnset', L.onset, L.none);
  setSelectLabels('infoMaker', L.maker, L.none);
  const ci = $('#codeIn'); if (ci) ci.setAttribute('placeholder', L.codePh);
  IV_BTNS.forEach((b, i) => b.setAttribute('aria-label', L.ivAria[i]));
  const pw = $('#progWrap'); if (pw) pw.setAttribute('aria-label', L.progAria);
  const opw = $('#onProgWrap'); if (opw) opw.setAttribute('aria-label', L.onProgAria);
  renderFmInfo();
  renderKeepUi();
  if (rerender) {
    renderHome();
    syncSetup();
    if (PRE.onset && $('#pgOnset').classList.contains('on') && !$('#onsetResCard').hidden) renderOnsetResult();
    if (SHOWN && $('#pgEnd').classList.contains('on')) showEnd(SHOWN, { offers: !!(S && S.session === SHOWN && S.offer), noScroll: true, noFocus: true, keepState: true });
    if (VIEW.sessions.length) renderViewer(true);
  }
}
$('#langToggle').onclick = () => applyLang(LANG === 'en' ? 'ko' : 'en', true);

/* ───────────── 처음 ───────────── */
loadStore();
closeOrphans();
if (LINK.code) $('#codeIn').value = LINK.code;
if (LANG === 'en') applyLang('en', false); else { renderFmInfo(); renderKeepUi(); }
renderHome();
(async () => { BUILD_LOAD = await computeBuild('force-cache'); })();
