# -*- coding: utf-8 -*-
"""결과 파일 검산기(tools/verify_result.py)가 제대로 견주는지 — 전수 검산 3단계에서 verify_result.py 다음에 돎 (Claude, 2026-11-25 · 1.2.14)
화면 코드 점검(tools/app_check.js --dump)이 저장한 두 결과 파일을 조금씩 바꿔, 검산기의 판정이 기대와 같은지 봄. 받은 파일은 읽기만 하고, 바꾼 파일은 임시 폴더에 씀.
  기본 파일   <경로>.json         48 kHz 한 화면에서 끝낸 회기
  이어하기 파일 <경로>.resume.json  48 kHz 로 시작해 중간 저장 → 44.1 kHz 화면에서 이어 한 회기 (연습 · 버린 측정 · 가려져 버린 시행 · 측정)
경우 (기대 판정):
  1 기본 파일 그대로                                   → 통과
  2 이어하기 파일 그대로                                → 통과   (시행마다 적힌 표본화율 sr 을 먼저 씀)
  3 이어하기 파일에서 시행의 sr 을 지움 (1.2.12–1.2.13 파일 꼴) → 통과   (session-resume 사건의 표본화율을 따름)
  4 3 에서 이어하기 사건의 표본화율도 지움                  → 실패   (회기를 시작한 화면의 표본화율로는 맞지 않음 — 실제로 견준다는 확인)
  5 기본 파일에서 씨앗 · 세기 · 봉우리 기록을 모두 지움       → 검증할 수 없음 (다시 만든 구간 0개 · 통과가 아님)
  6 기본 파일에서 한 시행의 씨앗만 지움                    → 검증할 수 없음
  7 기본 파일에서 한 구간의 세기 기록을 0.01 dB 바꿈         → 실패
  8 기본 파일에서 한 시행의 씨앗을 균등 난수가 0 이 되는 씨앗(2463401483)으로 바꿈 → 실패 (세기 · 봉우리가 달라서 — 예외로 멈추지 않음)
  9 5 를 --quick(자극 빼고)으로                           → 통과   (계단만 봄)
사용:  python -I -X utf8 tools/verify_result_check.py <기본.json> [<이어하기.json>]     (이어하기 파일을 안 주면 <기본>.resume.json)"""
import copy
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))


def run_verify(path, *opts):
    p = subprocess.run([sys.executable, '-I', '-X', 'utf8', os.path.join(HERE, 'verify_result.py'), path, *opts], capture_output=True, timeout=900)
    out = (p.stdout.decode('utf-8', errors='replace') + p.stderr.decode('utf-8', errors='replace')).strip()
    v = [l.strip() for l in out.splitlines() if l.strip().startswith('판정:')]
    return p.returncode, (v[-1] if v else ''), out


def all_trials(se):
    """회기 안의 소리 기록이 있는 모든 시행 (측정 · 연습 · 버린 측정 · 가려져 버린 시행)"""
    for r in se.get('runs') or []:
        yield from r.get('trials') or []
    yield from se.get('practiceTrials') or []
    for e in se.get('events') or []:
        if e.get('type') == 'track-abandoned':
            yield from e.get('trialList') or []
        if e.get('type') == 'trial-void' and e.get('heard'):
            yield e['heard']


def main():
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if not args:
        print('사용: python -I -X utf8 tools/verify_result_check.py <기본.json> [<이어하기.json>]')
        return 2
    base_path = args[0]
    resume_path = args[1] if len(args) > 1 else re.sub(r'(\.json)?$', '.resume.json', base_path, count=1)
    for p in (base_path, resume_path):
        if not os.path.exists(p):
            print(f'판정: 실패 — 파일이 없음: {os.path.basename(p)} (tools/app_check.js --dump 가 두 파일을 함께 저장함)')
            return 1
    with open(base_path, encoding='utf-8') as f:
        base = json.load(f)
    with open(resume_path, encoding='utf-8') as f:
        resume = json.load(f)
    tmp = tempfile.mkdtemp(prefix='tmtf_vcheck_')
    cases = []   # 점검마다 맞음 · 틀림
    no = [0]     # 경우 번호 (위 설명의 1–9)

    def case(name, obj, want, *opts, src=None):
        """want: '통과' | '실패' | '검증할 수 없음' — 종료 코드는 통과만 0"""
        no[0] += 1
        path = src
        if path is None:
            path = os.path.join(tmp, f'case{no[0]}.json')
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(obj, f, ensure_ascii=False)
        code, verdict, out = run_verify(path, *opts)
        got = '통과' if verdict.startswith('판정: 통과') else '검증할 수 없음' if verdict.startswith('판정: 검증할 수 없음') else '실패' if verdict.startswith('판정: 실패') else '판정 없음(중단)'
        ok = got == want and (code == 0) == (want == '통과')
        cases.append(ok)
        print(f"  {'통과' if ok else '✗ 실패'} {no[0]} {name} — 기대 ‘{want}’ · 검산기 ‘{got}’ (종료 코드 {code})")
        if not ok:
            print('      ' + '\n      '.join(out.splitlines()[-6:]))
        return out

    # 앞선 확인: 이어하기 파일이 정말 두 표본화율에 걸쳐 있는지 (아니면 2–4 가 아무것도 시험하지 않음)
    rs = resume['sessions'][0]
    fs0 = ((rs.get('env') or {}).get('audio') or {}).get('sampleRate')
    rates = sorted({t.get('sr') for t in all_trials(rs) if t.get('sr')})
    kinds = {'연습': bool(rs.get('practiceTrials')), '측정': bool(rs.get('runs')),
             '버린 측정': any(e.get('type') == 'track-abandoned' and e.get('trialList') for e in rs.get('events') or []),
             '가려져 버린 시행': any(e.get('type') == 'trial-void' and e.get('heard') for e in rs.get('events') or [])}
    pre_ok = len(rates) == 2 and fs0 in rates and all(kinds.values()) and any(e.get('type') == 'session-resume' for e in rs.get('events') or [])
    cases.append(pre_ok)
    print(f"  {'통과' if pre_ok else '✗ 실패'} 0 이어하기 파일: 시작 {fs0} Hz · 시행의 표본화율 {rates} · " + ' · '.join(f"{k} {'있음' if v else '없음'}" for k, v in kinds.items()))

    case('기본 파일 그대로', None, '통과', src=base_path)
    case('이어하기 파일 그대로 (표본화율이 바뀐 뒤의 연습 · 버린 측정 · 가려져 버린 시행 · 측정)', None, '통과', src=resume_path)
    o = copy.deepcopy(resume)
    for t in all_trials(o['sessions'][0]):
        t.pop('sr', None)
    case('이어하기 파일에서 시행의 sr 을 지움 (1.2.12–1.2.13 파일 꼴 → session-resume 사건의 표본화율)', o, '통과')
    for e in o['sessions'][0]['events']:
        if e.get('type') == 'session-resume':
            (e.get('audio') or {}).pop('sampleRate', None)
    for r in o['sessions'][0]['runs']:
        (r.get('audio') or {}).pop('sampleRate', None)
    case('거기서 이어하기 사건 · 측정의 표본화율도 지움 (시작 화면의 표본화율로 다시 만들면 맞지 않아야 함)', o, '실패')

    o = copy.deepcopy(base)
    for t in all_trials(o['sessions'][0]):
        for k in ('seeds', 'rms', 'pk', 'phase'):
            t.pop(k, None)
    bare = o
    out = case('기본 파일에서 씨앗 · 세기 · 봉우리 기록을 모두 지움', bare, '검증할 수 없음')
    zero_made = '구간 0개 다시 만듦' in out
    cases.append(zero_made)
    print(f"  {'통과' if zero_made else '✗ 실패'}   └ 다시 만든 구간이 0개라고 적음")
    o = copy.deepcopy(base)
    o['sessions'][0]['runs'][0]['trials'][0].pop('seeds', None)
    case('기본 파일에서 한 시행의 씨앗만 지움', o, '검증할 수 없음')
    o = copy.deepcopy(base)
    t = o['sessions'][0]['runs'][0]['trials'][0]
    t['rms'][0] = round(t['rms'][0] + 0.01, 3)
    case('기본 파일에서 한 구간의 세기 기록을 0.01 dB 바꿈', o, '실패')
    o = copy.deepcopy(base)
    o['sessions'][0]['runs'][0]['trials'][0]['seeds'][0] = 2463401483
    case('기본 파일에서 한 구간의 씨앗을 균등 난수가 0 이 되는 씨앗(2463401483)으로 바꿈 (예외로 멈추지 않고 다름을 알림)', o, '실패')
    case('씨앗 · 세기 기록이 없는 파일을 --quick(자극 빼고)으로', bare, '통과', '--quick')

    shutil.rmtree(tmp, ignore_errors=True)
    ok = all(cases)
    print(f'판정: {"통과" if ok else "실패 — " + str(cases.count(False)) + "개"} (검산기 점검 {len(cases)}개: 경우 {no[0]}개 + 앞선 확인 · 구간 수 확인)')
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
