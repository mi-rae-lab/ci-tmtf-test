# -*- coding: utf-8 -*-
"""결과 파일만으로 다시 만들기 (Claude, 2026-11-24 — 와우TMTF tools/verify_records.py 를 참가자용 결과 파일에 맞게 옮김). 파일을 읽기만 함.
앱 코드를 쓰지 않고 따로 짠 tools/tmtf_ref.py 로:
  1 계단: 측정마다 기록된 정오만 같은 절차(회기 P)의 계단에 넣어 시행마다 깊이 · 반전 · 반전 시행 · 역치 · SD · 재지 못함 · 0 dB 시행 · 우연 판정이 기록과 같은지.
          버린 측정(회기 사건 track-abandoned 의 trialList — ‘그만’ · 화면이 닫힘)도 깊이 · 반전이 이어지는지.
  2 자극: 시행마다 구간별 소리를 씨앗 · 절차 · 변조 주파수 · 깊이 · 정답 구간 · 표본화 주파수로 다시 만들어 기록된 RMS(0.001 dB 반올림) ·
          봉우리(0.01 dB 반올림) · 위상과 같은지 — 측정 · 연습 · 버린 측정 · 가려져 버린 시행(trial-void.heard) 모두.
사용:  python -I -X utf8 tools/verify_result.py <결과.json> [<결과.json> …] [--quick(자극 빼고)]     (numpy 필요)"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tmtf_ref import make, staircase  # noqa: E402


def check_track(P, tr, rec):
    """기록된 정오로 계단을 다시 돌려 기록과 견줌 — 다른 점 목록"""
    s = staircase(P, [bool(t['c']) for t in tr])
    pr = []
    if 'error' in s:
        return [s['error']]
    dd = next((i for i, (t, d) in enumerate(zip(tr, s['ds'])) if abs(t['d'] - d) > 1e-9), None)
    if dd is not None:
        pr.append(f"{dd + 1}번째 깊이 기록 {tr[dd]['d']} · 다시 {s['ds'][dd]}")
    if any('a' in t and 'tg' in t and t.get('u', 0) == 0 and (t['a'] == t['tg']) != bool(t['c']) for t in tr):
        pr.append('답 · 정답 구간과 정오가 다른 시행')
    if any('a' in t and 'tg' in t and t.get('u', 0) == 1 and (t['a'] == t['tg']) != bool(t['c']) for t in tr):
        pr.append('모르겠음 시행의 무작위 자리와 정오가 다름')
    if rec is None:
        return pr
    if s['rev'] != rec.get('reversals'):
        pr.append('반전 다름')
    if 'revAt' in rec and s['revAt'] != rec['revAt']:
        pr.append('반전 시행(revAt) 다름')
    if (s['thr'] is None) != (rec.get('thr') is None) or (s['thr'] is not None and abs(s['thr'] - rec['thr']) > 1e-9):
        pr.append(f"역치 다시 {s['thr']} · 기록 {rec.get('thr')}")
    if rec.get('sd') is not None and s['sd'] is not None and abs(rec['sd'] - s['sd']) > 1e-9:
        pr.append(f"SD 다시 {s['sd']} · 기록 {rec['sd']}")
    if bool(s['ceiling']) != bool(rec.get('ceiling')):
        pr.append('재지 못함 판정 다름')
    if (s['n0'], s['k0']) != (rec.get('n0'), rec.get('k0')):
        pr.append(f"0 dB 시행 다시 {s['k0']}/{s['n0']} · 기록 {rec.get('k0')}/{rec.get('n0')}")
    if bool(s['atChance']) != bool(rec.get('atChance')):
        pr.append(f"우연 판정 다시 {s['atChance']} · 기록 {rec.get('atChance')}")
    if not s['done'] and not rec.get('incomplete'):
        pr.append('규칙상 아직 안 끝남')
    if rec.get('nTrials') is not None and rec['nTrials'] != len(tr):
        pr.append(f"시행 수 기록 {rec['nTrials']} · 실제 {len(tr)}")
    return pr


def main():
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    quick = '--quick' in sys.argv
    if not args:
        print('사용: python -I -X utf8 tools/verify_result.py <결과.json> …')
        return 2
    bad = []
    n_run = n_ok = n_ab = n_ab_ok = n_sess = 0
    n_iv = n_tr = 0
    worst_pk = worst_rms = 0.0
    for path in args:
        name = os.path.basename(path)
        with open(path, encoding='utf-8') as f:
            o = json.load(f)
        if o.get('format') != 'ci-tmtf-public' or not isinstance(o.get('sessions'), list):
            bad.append(f'{name}: 이 검사의 결과 파일이 아님')
            continue
        for se in o['sessions']:
            n_sess += 1
            P = se.get('P')
            fs = ((se.get('env') or {}).get('audio') or {}).get('sampleRate')
            if not P:
                bad.append(f"{name} 회기 {se.get('id')}: 절차(P) 없음")
                continue
            for r in se.get('runs') or []:
                n_run += 1
                tr = r.get('trials') or []
                pr = check_track(P, tr, r) if tr else ['시행 없음']
                if pr:
                    bad.append(f"{name} 측정 {r.get('order')} ({r.get('fm')} Hz): " + ' · '.join(pr))
                else:
                    n_ok += 1
            for e in se.get('events') or []:
                if e.get('type') == 'track-abandoned' and isinstance(e.get('trialList'), list):
                    n_ab += 1
                    tl = e['trialList']
                    s = staircase(e.get('P') or P, [bool(t['c']) for t in tl])
                    okk = 'error' not in s and all(abs(t['d'] - d) <= 1e-9 for t, d in zip(tl, s['ds'])) and s['rev'] == e.get('reversals') and ('revAt' not in e or s['revAt'] == e['revAt'])
                    if okk and e.get('depthNow') is not None and tl:
                        okk = abs(e['depthNow'] - s['nextDepth']) <= 1e-9
                    if okk:
                        n_ab_ok += 1
                    else:
                        bad.append(f"{name} 버린 측정 {e.get('fm')} Hz ({e.get('stopVia')}): 계단이 이어지지 않음")
            if quick:
                continue

            def check(where, t, fm, tg, d, rfs):
                nonlocal n_iv, n_tr, worst_pk, worst_rms
                if not t.get('seeds') or not rfs:
                    return
                n_tr += 1
                for i, seed in enumerate(t['seeds']):
                    n_iv += 1
                    o2 = make(rfs, P['dur'], P['band'], fm, d if i == tg else None, P['phase'], P['rampMs'], P['rampShape'], 0, seed)
                    dp, dr = abs(o2['peakDb'] - t['pk'][i]), abs(o2['rmsDb'] - t['rms'][i])
                    worst_pk, worst_rms = max(worst_pk, dp), max(worst_rms, dr)
                    if dp > 0.0051 or dr > 0.00051 or (i == tg and d is not None and t.get('phase') is not None and abs((o2['phase'] or 0) - t['phase']) > 1e-9):
                        bad.append(f"{name} {where} 구간 {i + 1}: 봉우리 기록 {t['pk'][i]} · 다시 {o2['peakDb']:.4f}, RMS 기록 {t['rms'][i]} · 다시 {o2['rmsDb']:.4f}")

            for r in se.get('runs') or []:
                rfs = (r.get('audio') or {}).get('sampleRate') or fs
                for j, t in enumerate(r.get('trials') or []):
                    check(f"측정 {r.get('order')} 시행 {j + 1}", t, r['fm'], t.get('tg'), t.get('d'), rfs)
            for j, t in enumerate(se.get('practiceTrials') or []):
                check(f'연습 {j + 1}', t, t.get('fm'), t.get('tg'), t.get('d'), fs)
            for e in se.get('events') or []:
                if e.get('type') == 'track-abandoned' and isinstance(e.get('trialList'), list):
                    for j, t in enumerate(e['trialList']):
                        check(f"버린 측정 {e.get('fm')} Hz 시행 {j + 1}", t, e.get('fm'), t.get('tg'), t.get('d'), fs)
                if e.get('type') == 'trial-void' and e.get('heard') and e['heard'].get('tg') is not None:
                    check(f"가려져 버린 시행 {e.get('fm')} Hz", e['heard'], e.get('fm'), e['heard']['tg'], e['heard']['d'], fs)
    print(f'계단: 회기 {n_sess}개 · 측정 {n_run}개 중 {n_ok}개 같음 · 버린 측정 {n_ab}개 중 {n_ab_ok}개 이어짐')
    if not quick:
        print(f'자극: 시행 {n_tr}개 · 구간 {n_iv}개 다시 만듦 — 봉우리 최대 차 {worst_pk:.4f} dB (기록 0.01 반올림) · RMS 최대 차 {worst_rms:.5f} dB (0.001 반올림)')
    for b in bad[:15]:
        print('  ✗', b)
    ok = not bad and n_run > 0
    print(f'판정: {"통과" if ok else "실패 — " + str(len(bad)) + "개"} (읽기만 — 파일 {len(args)}개)')
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
