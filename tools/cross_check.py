# -*- coding: utf-8 -*-
"""자극 · 계단 JS = 파이썬 대조 (와우TMTF 3.1, Claude 2026-10-22) — 전수 검산 1단계.
앱의 js/stim.js · js/track.js 를 deno 로 그대로 돌린 결과(tools/cross_check.js)를, 앱 코드를 쓰지 않고 따로 짠 tools/tmtf_ref.py 와 견줌.
  자극 750개: 절차 5(Won/Park · De Ruiter · 직접 정하기 3 — 광대역 · 와우 대역 · 코사인² · 무작위 위상 · 3.3 의 3구간 광대역 0.5 s · 쉼 0.5 s) × 표본화 2 × 변조 5(5 · 55 · 65 · 100 · 300 — 55 · 65 는 3.2 의 5 Hz 간격) × 깊이 5 × 씨앗 3(이득 0 · 2.5 · 30 dB)
             → RMS · 봉우리 1e-6 dB, 위상 1e-12, 줄임 같음, 표본 6개 1e-7, 합 1e-4
  계단 210개: 절차 5(3.3: 직접 정하기 3구간 · Won 규칙 · 0 dB 4번 멈춤 더함) × 듣는 사람 42 (씨앗 난수 응답 40 · 늘 맞음 · 늘 틀림) → 깊이 · 반전 · 반전 시행 · 역치 · SD · 측정 불가 · 미완 · 0 dB 시행 · 우연 판정이 모두 같음
사용 (저장소 폴더에서): python -I -X utf8 tools/cross_check.py      (마지막 줄 ‘판정: 통과/실패’)"""
import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tmtf_ref import make, staircase, uniforms  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def deno():
    for c in ('deno', os.path.expandvars(r'%LOCALAPPDATA%\Microsoft\WinGet\Links\deno.exe')):
        try:
            subprocess.run([c, '--version'], capture_output=True, timeout=30)
            return c
        except Exception:
            continue
    return None


def main():
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    dn = deno()
    if not dn:
        print('판정: 실패 — deno 를 찾지 못함')
        return 1
    p = subprocess.run([dn, 'run', '--allow-read', 'tools/cross_check.js'], capture_output=True, timeout=600, cwd=ROOT, env={**os.environ, 'NO_COLOR': '1'})
    if p.returncode != 0:
        print(p.stderr.decode('utf-8', errors='replace')[-2000:])
        print('판정: 실패 — cross_check.js 가 끝나지 않음')
        return 1
    J = json.loads(p.stdout.decode('utf-8'))
    bad = []
    worst = {'rms': 0.0, 'pk': 0.0, 'smp': 0.0, 'sum': 0.0}
    n_scaled = 0
    def cmp_stim(c, worst, label='자극'):
        """JS 가 만든 자극 하나를 파이썬 기준 구현으로 다시 만들어 견줌 — 다르면 bad 에 한 줄"""
        P = c['P']
        try:
            o = make(c['fs'], P['dur'], P['band'], c['fm'], c['depthDb'], P['phase'], P['rampMs'], P['rampShape'], c['gainDb'], c['seed'])
        except Exception as e:
            bad.append(f"{label} {c['proto']} fs {c['fs']} fm {c['fm']} 깊이 {c['depthDb']} 씨앗 {c['seed']}: 파이썬이 만들지 못함 — {type(e).__name__}: {e}")
            return
        x = o['x']
        d_rms, d_pk = abs(o['rmsDb'] - c['rmsDb']), abs(o['peakDb'] - c['peakDb'])
        d_smp = max(abs(float(x[i]) - s) for i, s in zip(c['idx'], c['samples']))
        d_sum = max(abs(float(x.astype('float64').sum()) - c['sum']), abs(float(abs(x.astype('float64')).sum()) - c['sumAbs']))
        worst.update(rms=max(worst['rms'], d_rms), pk=max(worst['pk'], d_pk), smp=max(worst['smp'], d_smp), sum=max(worst['sum'], d_sum))
        ph_ok = (o['phase'] is None and c['phase'] is None) or (o['phase'] is not None and c['phase'] is not None and abs(o['phase'] - c['phase']) < 1e-12)
        if o['N'] != c['N'] or d_rms > 1e-6 or d_pk > 1e-6 or d_smp > 1e-7 or d_sum > 1e-4 or not ph_ok or o['scaled'] != c['scaled']:
            bad.append(f"{label} {c['proto']} fs {c['fs']} fm {c['fm']} 깊이 {c['depthDb']} 씨앗 {c['seed']}: N {o['N']}/{c['N']} RMS {d_rms:.2e} 봉우리 {d_pk:.2e} 표본 {d_smp:.2e} 합 {d_sum:.2e} 위상 {o['phase']}/{c['phase']} 줄임 {o['scaled']}/{c['scaled']}")

    for c in J['stim']:
        cmp_stim(c, worst)
        n_scaled += c['scaled']
    # 난수 0 씨앗 (1.2.14): 균등 난수가 정확히 0 인 자리가 있는 씨앗 — JS 는 가우스의 u 자리에서 0 을 만나면 다시 뽑아 뒤 난수가 밀림
    worst0 = {'rms': 0.0, 'pk': 0.0, 'smp': 0.0, 'sum': 0.0}
    zero = J.get('stimZero') or []
    for c in zero:
        if not c['zeroOk'] or float(uniforms(c['seed'], c['zeroAt'] + 1)[c['zeroAt']]) != 0.0:
            bad.append(f"난수 0 씨앗 {c['seed']}: {c['zeroAt']}번째 균등 난수가 0 이 아님 (시험 씨앗이 잘못됨)")
        cmp_stim(c, worst0, f"난수 0 씨앗({c['where']})")
    if not zero:
        bad.append('난수 0 씨앗 경우가 없음 (cross_check.js 의 stimZero)')
    n_ceil = n_inc = 0
    for t in J['tracks']:
        r = staircase(t['P'], [bool(c) for c in t['cs']])
        R = t['result']
        n_ceil += R['ceiling']
        n_inc += R['incomplete']
        same = ('error' not in r and r['ds'] == t['ds'] and r['rev'] == t['reversals'] and (t['revAt'] is None or r['revAt'] == t['revAt']) and r['thr'] == R['thr'] and r['sd'] == R['sd']
                and r['ceiling'] == R['ceiling'] and r['incomplete'] == R['incomplete'] and r['n0'] == R['n0'] and r['k0'] == R['k0'] and r['atChance'] == R['atChance']
                and ((r['p'] is None and R['p'] is None) or (r['p'] is not None and R['p'] is not None and abs(r['p'] - R['p']) <= 1e-12 * max(1, abs(R['p']))))
                and r['done'] == t['done'] and r['nextDepth'] == t['nextDepth'])
        if not same:
            bad.append(f"계단 {t['proc']} {json.dumps(t['listener'])}: 파이썬 thr {r.get('thr')} sd {r.get('sd')} 반전 {len(r.get('rev', []))} · JS thr {R['thr']} sd {R['sd']} 반전 {len(t['reversals'])} · revAt {'없음' if t['revAt'] is None else '있음'}")
    no_rev_at = sum(1 for t in J['tracks'] if t['revAt'] is None)
    print(f"자극 {len(J['stim'])}개 (줄임 {n_scaled}개): 최대 차 RMS {worst['rms']:.2e} dB · 봉우리 {worst['pk']:.2e} dB · 표본 {worst['smp']:.2e} · 합 {worst['sum']:.2e}")
    print(f"난수 0 씨앗 자극 {len(zero)}개 (0 이 놓인 자리 {len({c['where'] for c in zero})}가지 × 표본화 2 × 깊이 3): 최대 차 RMS {worst0['rms']:.2e} dB · 봉우리 {worst0['pk']:.2e} dB · 표본 {worst0['smp']:.2e} · 합 {worst0['sum']:.2e}")
    print(f"계단 {len(J['tracks'])}개 (측정 불가 {n_ceil} · 미완 {n_inc}): 깊이 · 반전 · 반전 시행 · 역치 · SD · 우연 판정 대조" + (f" — JS 에 revAt 없음 {no_rev_at}개" if no_rev_at else ''))
    if no_rev_at:
        bad.append(f'Track 이 반전 시행(revAt)을 남기지 않음 ({no_rev_at}개)')
    for b in bad[:12]:
        print('  ✗', b)
    if bad:
        print(f'판정: 실패 — {len(bad)}개')
        return 1
    print(f"판정: 통과 — 자극 {len(J['stim'])}개 · 계단 {len(J['tracks'])}개 JS = 파이썬 (+ 난수 0 씨앗 자극 {len(zero)}개)")
    return 0


if __name__ == '__main__':
    sys.exit(main())
