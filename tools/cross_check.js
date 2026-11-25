// 자극 · 계단 JS 쪽 (와우TMTF 3.1, Claude 2026-10-22 · 3.2: 변조 55 · 65 Hz 더함 — 5 Hz 간격 주파수 · 3.3: 직접 정하기 3구간 · 광대역 · Won 규칙 더함) — tools/cross_check.py 가 부름: 앱의 js/protocols.js · js/stim.js · js/track.js 를 그대로 올려
// 정해 둔 경우마다 Stim.make 결과(RMS · 봉우리 · 위상 · 줄임 · 표본 몇 개 · 합)와 Track 진행(응답 · 깊이 · 반전 · 반전 시행 · 결과)을 JSON 한 줄로 냄.
//   deno run --allow-read tools/cross_check.js
const root = new URL('../', import.meta.url);
const read = f => Deno.readTextFileSync(new URL(f, root));
(0, eval)(['js/protocols.js', 'js/stim.js', 'js/track.js'].map(read).join('\n;\n') + '\n;globalThis.__T = { PROTOCOLS, CUSTOM_PROCS, resolveProtocol, Stim, Track };');
const { PROTOCOLS, resolveProtocol, Stim, Track } = globalThis.__T;
const pick = (P, ks) => Object.fromEntries(ks.map(k => [k, P[k] ?? null]));
const protos = [
  ['uw', resolveProtocol({ proto: 'uw' })],
  ['deruiter', resolveProtocol({ proto: 'deruiter' })],
  ['custom-wide-cos2-rove', resolveProtocol({ proto: 'custom', nAFC: 2, band: 'wide', dur: 1, isi: 0, proc: 'std', rove: 3, ramp: 'cos2' })],
  ['custom-ci-short', resolveProtocol({ proto: 'custom', nAFC: 3, band: 'ci', dur: 0.5, isi: 0.5, proc: 'short', rove: 0, ramp: 'linear' })],
  // 3.3: 참가자용 화면(js/app.js)의 절차 그대로 — 직접 정하기 3구간 · 광대역 · 0.5 s · 쉼 0.5 s · Won 규칙(반전 14 · 마지막 10) · 흔들기 없음 · 10 ms 직선
  ['custom-3-wide-std', resolveProtocol({ proto: 'custom', nAFC: 3, band: 'wide', dur: 0.5, isi: 0.5, proc: 'std', rove: 0, ramp: 'linear' })],
];
const stim = [];
const seeds = [1, 123456789, 4294967295], gains = [0, 2.5, 30];   // 30 dB → 봉우리가 0.99 를 넘어 줄임(scaled)
for (const [name, P] of protos) for (const fs of [44100, 48000]) for (const fm of [5, 55, 65, 100, 300]) for (const depthDb of [null, 0, -6, -20, -40]) seeds.forEach((seed, si) => {
  const gainDb = gains[si], o = Stim.make({ fs, dur: P.dur, band: P.band, fm, depthDb, phase: P.phase, rampMs: P.rampMs, rampShape: P.rampShape, gainDb, seed });
  const x = o.data, N = x.length, R = Math.min(Math.round(fs * P.rampMs / 1000), Math.floor(N / 2));
  let sum = 0, sumAbs = 0; for (let i = 0; i < N; i++) { sum += x[i]; sumAbs += Math.abs(x[i]); }
  stim.push({ proto: name, P: pick(P, ['dur', 'band', 'phase', 'rampMs', 'rampShape']), fs, fm, depthDb, gainDb, seed, N, rmsDb: o.rmsDb, peakDb: o.peakDb, phase: o.phase, scaled: o.scaled,
    idx: [0, 1, R, N >> 1, N - 2, N - 1], samples: [x[0], x[1], x[R], x[N >> 1], x[N - 2], x[N - 1]], sum, sumAbs });
});
// 계단: 절차마다 듣는 사람 여러 명 — 응답은 깊이에 따라 씨앗 난수로(정답 확률 = 깊이가 역치보다 크면 hi, 아니면 lo), 늘 맞음 · 늘 틀림(끝 규칙 · 미완 · 측정 불가 길)
const tracks = [];
const procs = [['uw', PROTOCOLS.uw], ['deruiter', PROTOCOLS.deruiter], ['custom-std', resolveProtocol({ proto: 'custom', nAFC: 2, band: 'wide', dur: 1, isi: 0, proc: 'std', rove: 0, ramp: 'linear' })],
  ['custom-short', resolveProtocol({ proto: 'custom', nAFC: 3, band: 'wide', dur: 0.5, isi: 0, proc: 'short', rove: 0, ramp: 'linear' })],
  ['custom-std3', resolveProtocol({ proto: 'custom', nAFC: 3, band: 'wide', dur: 0.5, isi: 0.5, proc: 'std', rove: 0, ramp: 'linear' })]];   // 3.3: 3구간 · Won 규칙 · 0 dB 4번 멈춤
for (const [name, P] of procs) {
  const listeners = [];
  for (let k = 0; k < 40; k++) listeners.push({ thr: -4 - (k % 10) * 3, hi: 0.95 - (k % 3) * 0.05, lo: 1 / P.nAFC + (k % 4) * 0.05, seed: 1000 + k });
  listeners.push({ always: true }, { never: true });
  for (const L of listeners) {
    const T = new Track(P), rng = L.seed ? Stim.makeRng(L.seed) : null, cs = [];
    for (let i = 0; !T.done && i < 400; i++) {
      const c = L.always ? true : L.never ? false : rng.uniform() < (T.depth > L.thr ? L.hi : L.lo);
      cs.push(c ? 1 : 0); T.respond(c);
    }
    const r = T.result();
    tracks.push({ proc: name, P: pick(P, ['nAFC', 'startDb', 'bigUntil', 'big', 'small', 'totalRev', 'avgLast', 'ceiling']), listener: L, cs, ds: T.trials.map(t => t.d), reversals: T.reversals, revAt: T.revAt ?? null,
      result: { thr: r.thr, sd: r.sd, ceiling: !!r.ceiling, incomplete: !!r.incomplete, n0: r.n0, k0: r.k0, p: r.p, atChance: !!r.atChance }, done: T.done, nextDepth: T.depth });
  }
}
// 난수 0 씨앗 (1.2.14): mulberry32 의 균등 난수가 정확히 0 이 되는 상태가 있음 (씨앗 2463401483 의 첫 난수). Stim 의 gauss 는 u 가 0 이면 다시 뽑으므로(while (u === 0))
// 그 뒤 난수가 한 칸씩 밀림 — 0 이 놓이는 자리를 바꿔 가며(첫 u · 첫 v · 둘째 u · 가운데 u · 가운데 v · 마지막 u · 변조 위상 · 쓰지 않는 자리) 파이썬 기준 구현이 같은 순서로 따라가는지.
const GAMMA = 0x6D2B79F5, ZERO_STATE = (2463401483 + GAMMA) >>> 0;
const seedWithZeroAt = j => (ZERO_STATE - Math.imul(j + 1, GAMMA)) >>> 0;   // j 번째(0부터) 균등 난수가 0 이 되는 씨앗
const stimZero = [];
{
  const P = protos[4][1];   // 참가자용 화면의 절차 (3구간 · 광대역 · 0.5 s · 10 ms 직선 · 무작위 위상)
  for (const fs of [44100, 48000]) {
    const N = Math.round(fs * P.dur); let n = 1; while (n < N) n <<= 1;
    const nPair = (n / 2 - 1) - Math.max(1, Math.ceil(20 * n / fs)) + 1;   // 잡음에 쓰는 주파수 칸 수 = 가우스 쌍 수 (균등 난수 2·nPair 개, 그다음이 변조 위상)
    const spots = [['첫 u', 0], ['첫 v', 1], ['둘째 u', 2], ['가운데 u', 20000], ['가운데 v', 20001], ['마지막 u', 2 * nPair - 2], ['변조 위상', 2 * nPair], ['쓰지 않는 자리', 2 * nPair + 2]];
    for (const [where, j] of spots) for (const depthDb of [null, 0, -20]) {
      const seed = seedWithZeroAt(j), rng = Stim.makeRng(seed);
      let u = null; for (let i = 0; i <= j; i++) u = rng.uniform();
      const o = Stim.make({ fs, dur: P.dur, band: P.band, fm: 100, depthDb, phase: P.phase, rampMs: P.rampMs, rampShape: P.rampShape, gainDb: 0, seed });
      const x = o.data, R = Math.min(Math.round(fs * P.rampMs / 1000), Math.floor(N / 2));
      let sum = 0, sumAbs = 0; for (let i = 0; i < N; i++) { sum += x[i]; sumAbs += Math.abs(x[i]); }
      stimZero.push({ proto: 'custom-3-wide-std', where, zeroAt: j, zeroOk: u === 0, P: pick(P, ['dur', 'band', 'phase', 'rampMs', 'rampShape']), fs, fm: 100, depthDb, gainDb: 0, seed, N: x.length, rmsDb: o.rmsDb, peakDb: o.peakDb, phase: o.phase, scaled: o.scaled,
        idx: [0, 1, R, N >> 1, N - 2, N - 1], samples: [x[0], x[1], x[R], x[N >> 1], x[N - 2], x[N - 1]], sum, sumAbs });
    }
  }
}
console.log(JSON.stringify({ stim, tracks, stimZero }));
