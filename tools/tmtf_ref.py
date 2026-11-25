# -*- coding: utf-8 -*-
"""와우TMTF 기준 구현 (3.1, Claude 2026-10-22) — 앱 코드(js/track.js · js/stim.js)를 쓰지 않고 문서(주석 · 방법.md)대로 따로 짠 파이썬.
tools/cross_check.py(JS = 파이썬 대조)와 tools/verify_result.py(결과 파일만으로 다시 만들기)가 씀.

계단 staircase(P, cs): 2-down 1-up. 보폭 = 반전이 bigUntil 번 되기 전 big, 그 뒤 small. 깊이는 −40 ~ 0 dB 로 자름.
  0 dB 시행 수 n0 · 정답 k0. ceiling 'stop4' 면 0 dB 에서 4번 틀리면 멈춤(역치 0 · 측정 불가). 반전 totalRev 번이면 끝. 시행 160번이면 끝(미완).
  역치 = 마지막 avgLast 반전 평균(반전 4개 미만이면 없음), SD = 표본 SD, 소수 둘째 자리(JS toFixed 처럼 — 같은 거리면 큰 쪽).
  우연 수준: 0 dB 시행 6번 이상일 때 단측 이항 P(X ≥ k0 | n0, 1/nAFC) > 0.05.
자극 make(...): 씨앗 → mulberry32 균등 난수 → Box–Muller(한 쌍에서 cos 먼저, sin 은 다음 차례 · u 가 0 이면 다시 뽑음) → 주파수 칸마다 (실수, 허수) = (가우스, 가우스) × 대역 모양
  → 켤레 대칭 → 역FFT 의 실수부 앞 N 표본(float32) → RMS 1 → 변조 [1 + m·sin(2π·fm·n/fs + φ)] (φ = 0 또는 잡음 다음 난수 × 2π) → 경사(가운데 반 표본 위치)
  → RMS 0.05 × 이득 → 봉우리가 0.99 를 넘으면 0.99 로 줄임."""
import math
from decimal import ROUND_HALF_DOWN, ROUND_HALF_UP, Decimal

import numpy as np

M32 = np.uint64(0xFFFFFFFF)


def to_fixed(x, nd=2):
    """JS Number.prototype.toFixed 처럼 (정확한 2진 값에서 가장 가까운 것, 같은 거리면 큰 쪽) — 뒤에 +() 로 숫자로 돌린 값"""
    q = Decimal(1).scaleb(-nd)
    d = Decimal(x)
    r = d.quantize(q, rounding=ROUND_HALF_UP) if d >= 0 else -((-d).quantize(q, rounding=ROUND_HALF_DOWN))
    return float(r) + 0.0


def binom_tail(k, n, p0):
    return min(1.0, sum(math.comb(n, i) * p0 ** i * (1 - p0) ** (n - i) for i in range(k, n + 1)))


def staircase(P, cs, max_trials=160):
    depth = P.get('startDb') if P.get('startDb') is not None else 0
    run = dirn = 0
    rev, rev_at, ds = [], [], []
    n0 = k0 = miss = 0
    done = ceil = inc = False
    for i, c in enumerate(cs):
        if done:
            return {'error': f'{i + 1}번째 시행이 계단이 끝난 뒤', 'ds': ds, 'rev': rev, 'revAt': rev_at}
        ds.append(depth)
        if depth >= 0:
            n0 += 1
            if c:
                k0 += 1
            else:
                miss += 1
        d = 0
        if c:
            run += 1
            if run >= 2:
                run = 0
                d = -1
        else:
            run = 0
            d = +1
        if d:
            if dirn != 0 and d != dirn:
                rev.append(depth)
                rev_at.append(i)
            dirn = d
            step = P['big'] if len(rev) < P['bigUntil'] else P['small']
            depth = max(-40, min(0, depth + d * step))
        if P.get('ceiling') == 'stop4' and miss >= 4:
            done = ceil = True
        elif len(rev) >= P['totalRev']:
            done = True
        elif i + 1 >= max_trials:
            done = inc = True
    p0 = 1 / P['nAFC']
    if n0 < 6:
        ch = {'n0': n0, 'k0': k0, 'p': None, 'atChance': False}
    else:
        pv = binom_tail(k0, n0, p0)
        ch = {'n0': n0, 'k0': k0, 'p': pv, 'atChance': pv > 0.05}
    if ceil:
        res = {'thr': 0, 'ceiling': True, 'sd': None, 'incomplete': False}
    else:
        used = rev[-P['avgLast']:] if P['avgLast'] else []
        if len(used) < 4:
            res = {'thr': None, 'ceiling': False, 'sd': None, 'incomplete': True}
        else:
            m = sum(used) / len(used)
            sd = math.sqrt(sum((x - m) ** 2 for x in used) / max(1, len(used) - 1))
            res = {'thr': to_fixed(m), 'ceiling': False, 'sd': to_fixed(sd), 'incomplete': inc or len(used) < P['avgLast']}
    res.update(ch)
    res.update(ds=ds, rev=rev, revAt=rev_at, done=done, nextDepth=depth)
    return res


def uniforms(seed, M):
    k = np.arange(1, M + 1, dtype=np.uint64)
    t = (np.uint64(seed & 0xFFFFFFFF) + k * np.uint64(0x6D2B79F5)) & M32
    t = ((t ^ (t >> np.uint64(15))) * (t | np.uint64(1))) & M32
    t = (t ^ ((t + (((t ^ (t >> np.uint64(7))) * (t | np.uint64(61))) & M32)) & M32)) & M32
    return ((t ^ (t >> np.uint64(14))) & M32).astype(np.float64) / 4294967296.0


def gauss_seq(seed, ng):
    """가우스 난수 ng 개와, 거기에 쓴 균등 난수의 개수(그다음 난수가 변조 위상)를 돌려줌.
    쌍마다 (u, v) = 균등 난수 둘. u 가 정확히 0 이면 log 를 못 쓰므로 JS(stim.js: while (u === 0) u = uniform())처럼 0 이 아닐 때까지 다시 뽑음
    — 그만큼 뒤의 난수가 밀리고 쓴 개수도 늘어남. v 는 0 이어도 그대로 씀. (1.2.14: 전에는 u 자리에 0 이 있으면 예외로 멈췄음 — 예: 씨앗 2463401483 의 첫 난수)"""
    npair = (ng + 1) // 2
    U = uniforms(seed, 2 * npair)
    u, v = U[0::2], U[1::2]
    used = 2 * npair
    if np.any(u == 0):   # 드문 길(난수 하나가 0 일 확률 2^-32): 순서대로 따라가며 다시 뽑음
        extra = 8
        while True:
            U = uniforms(seed, 2 * npair + extra)
            u, v, i = np.empty(npair), np.empty(npair), 0
            for k in range(npair):
                while i < len(U) and U[i] == 0:
                    i += 1
                if i + 1 >= len(U):
                    break
                u[k], v[k] = U[i], U[i + 1]
                i += 2
            else:
                used = i
                break
            extra *= 2
    r = np.sqrt(-2 * np.log(u))
    G = np.empty(2 * npair)
    G[0::2] = r * np.cos(2 * np.pi * v)
    G[1::2] = r * np.sin(2 * np.pi * v)
    return G[:ng], used


def next_pow2(n):
    p = 1
    while p < n:
        p <<= 1
    return p


def rms32(x):
    return math.sqrt(float(np.mean(x.astype(np.float64) ** 2)))


def make(fs, dur, band, fm, depth_db, phase='random', ramp_ms=10, ramp_shape='linear', gain_db=0, seed=1):
    """돌려줌: x(float32), rmsDb, peakDb, phase(φ 또는 None), scaled"""
    N = int(math.floor(fs * dur + 0.5))
    n = next_pow2(N)
    t = band.get('type', 'wide')
    lo = 20 if t == 'wide' else band['lo']
    hi = fs / 2 if t == 'wide' else band['hi']
    k0 = 1 if t == 'bp' else max(1, math.ceil(lo * n / fs))
    k1 = n // 2 - 1 if t == 'bp' else min(n // 2 - 1, math.floor(hi * n / fs))
    ks = np.arange(k0, k1 + 1)
    G, used = gauss_seq(seed, 2 * len(ks))
    g = np.ones(len(ks))
    if t == 'bp':
        f = ks * fs / n
        o2 = 2 * (band.get('order') or 2)
        g = 1 / np.sqrt((1 + (lo / f) ** o2) * (1 + (f / hi) ** o2))
    X = np.zeros(n, dtype=np.complex128)
    X[ks] = G[0::2] * g + 1j * (G[1::2] * g)
    X[n - ks] = np.conj(X[ks])
    x = np.fft.ifft(X).real[:N].astype(np.float32)
    r = rms32(x) or 1.0
    x = (x.astype(np.float64) / r).astype(np.float32)
    ph = None
    if depth_db is not None:
        m = 10 ** (depth_db / 20)
        ph = 0.0 if phase == 'zero' else float(uniforms(seed, used + 1)[used]) * 2 * math.pi
        w = 2 * math.pi * fm / fs
        x = (x.astype(np.float64) * (1 + m * np.sin(w * np.arange(N) + ph))).astype(np.float32)
    R = min(int(math.floor(fs * ramp_ms / 1000 + 0.5)), N // 2)
    if R > 0:
        i = np.arange(R)
        tt = (i + 0.5) / R
        a = np.sin(tt * np.pi / 2) ** 2 if ramp_shape == 'cos2' else tt
        x[:R] = (x[:R].astype(np.float64) * a).astype(np.float32)
        x[N - 1 - i] = (x[N - 1 - i].astype(np.float64) * a).astype(np.float32)
    gg = 0.05 * 10 ** (gain_db / 20) / (rms32(x) or 1.0)
    x = (x.astype(np.float64) * gg).astype(np.float32)
    peak = float(np.max(np.abs(x)))
    scaled = False
    if peak > 0.99:
        x = (x.astype(np.float64) * (0.99 / peak)).astype(np.float32)
        peak = 0.99
        scaled = True
    rr = rms32(x)
    return {'x': x, 'rmsDb': 20 * math.log10(rr or 1e-12), 'peakDb': 20 * math.log10(peak or 1e-12), 'phase': ph, 'scaled': scaled, 'N': N}
