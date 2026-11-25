# -*- coding: utf-8 -*-
"""전수 검산 (참가자용 소리 떨림 검사, Claude 2026-11-24 — 와우TMTF tools/run_checks.py 를 이 저장소에 맞게 옮김)
앱 파일을 고친 뒤 한 번 돌려 통과 기록(검증_통과.json)을 남김. 화면은 회기를 시작할 때 자기 파일의 build 해시를 이 기록과 맞대어 회기에 적음.

사용 (저장소 폴더에서):  python -I -X utf8 tools/run_checks.py        (또는 tools\\전수검산.bat)
필요: Python 3 + numpy · deno · Lean 4 (%USERPROFILE%\\.elan, 버전은 tools/lean/lean-toolchain)
단계 (앞 단계가 실패하면 뒤 단계는 건너뜀):
  1 자극 · 계단 JS = 파이썬   tools/cross_check.py — 앱의 stim.js · track.js(deno 로 그대로)를 따로 짠 tools/tmtf_ref.py 와 견줌 (자극 750개 · 계단 210개)
  2 화면 코드 점검            deno run tools/app_check.js — 가짜 화면 · 가짜 AudioContext · 빠른 시계로 준비부터 결과 파일 · 받은 결과 보기까지 (듣는 사람 모형)
  3 결과 파일 다시 만들기      tools/verify_result.py — 2단계에서 화면이 저장한 결과 파일을 따로 짠 파이썬으로: 계단 · 구간마다 소리(씨앗 → RMS · 봉우리 · 위상)
                              + tools/verify_result_check.py — 그 검산기가 제대로 견주는지 (표본화율이 바뀐 이어하기 회기 · 소리 기록을 지운 파일 · 값을 바꾼 파일의 판정)
  4 Lean 4 빌드               tools/lean 을 처음부터 (.lake/build 지움) — 판정: 종료 코드 0 + ‘Build completed successfully’ + warning · error · sorry 줄 0
  5 Lean 공리 감사            lake env lean MyAudit.lean — axiomDecls=0 · 공리 합집합 ⊆ {propext, Classical.choice, Quot.sound} · NONSTANDARD 0 · sorryAx 없음
  6 JS ↔ Lean 대조            tools/lean/cross_check.js → crosscheck.exe → 한 줄씩 비교 (+ 종류마다 일부러 바꾼 줄을 잡는지)
모두 통과 + 시작 · 끝 build 해시가 같을 때만 검증_통과.json 에 씀 (last + history). 로그는 tools/검산기록/ (git 에 안 올림)
"""
import datetime
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PASS = os.path.join(ROOT, '검증_통과.json')
LOGDIR = os.path.join(ROOT, 'tools', '검산기록')
PY = sys.executable
HOME = os.path.expanduser('~')


def now_iso():
    return datetime.datetime.now().astimezone().isoformat(timespec='seconds')


def app_files():
    """js/app.js 의 APP_FILES 그대로 — 화면이 해시하는 목록과 같게"""
    with open(os.path.join(ROOT, 'js', 'app.js'), encoding='utf-8') as f:
        m = re.search(r"const APP_FILES = \[([^\]]*)\]", f.read())
    return re.findall(r"'([^']+)'", m.group(1))


def build():
    h = {}
    for n in app_files():
        with open(os.path.join(ROOT, *n.split('/')), 'rb') as f:
            h[n] = hashlib.sha256(f.read()).hexdigest()
    whole = hashlib.sha256(''.join(f'{k}:{v}\n' for k, v in sorted(h.items())).encode()).hexdigest()
    return {'buildSha256': whole, 'files': h}


def tool_hashes():
    h = {}
    for n in sorted(os.listdir(os.path.join(ROOT, 'tools'))):
        p = os.path.join(ROOT, 'tools', n)
        if os.path.isfile(p) and n.endswith(('.py', '.js', '.bat')):
            with open(p, 'rb') as f:
                h['tools/' + n] = hashlib.sha256(f.read()).hexdigest()
    lean = os.path.join(ROOT, 'tools', 'lean')
    for dp, dns, fns in os.walk(lean):
        dns[:] = [d for d in dns if d != '.lake']
        for n in sorted(fns):
            if n.endswith(('.lean', '.js', '.toml', '.txt', '.json')) or n == 'lean-toolchain':
                p = os.path.join(dp, n)
                with open(p, 'rb') as f:
                    h[os.path.relpath(p, ROOT).replace(os.sep, '/')] = hashlib.sha256(f.read()).hexdigest()
    return h


def scrub(s):
    """기록에 이 컴퓨터의 경로(사용자 이름)가 남지 않게"""
    for a, b in ((ROOT, '<저장소>'), (ROOT.replace('\\', '/'), '<저장소>'), (HOME, '%USERPROFILE%'), (HOME.replace('\\', '/'), '%USERPROFILE%')):
        s = s.replace(a, b)
    return re.sub(r'[A-Za-z]:[\\/]Users[\\/][^\\/\s]+', '%USERPROFILE%', s)


def deno():
    for c in ('deno', os.path.expandvars(r'%LOCALAPPDATA%\Microsoft\WinGet\Links\deno.exe')):
        try:
            subprocess.run([c, '--version'], capture_output=True, timeout=30)
            return c
        except Exception:
            continue
    return None


def run(cmd, timeout=900, cwd=None):
    t0 = time.perf_counter()
    p = subprocess.run(cmd, capture_output=True, timeout=timeout, cwd=cwd or ROOT, env={**os.environ, 'PYTHONIOENCODING': 'utf-8', 'NO_COLOR': '1'})
    out = (p.stdout.decode('utf-8', errors='replace') + p.stderr.decode('utf-8', errors='replace')).strip()
    return p.returncode, out, round(time.perf_counter() - t0, 1)


def verdict(out):
    v = [l.strip() for l in out.splitlines() if l.strip().startswith('판정:')]
    return v[-1] if v else ''


def main():
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    os.makedirs(LOGDIR, exist_ok=True)
    t_all = time.perf_counter()
    b0 = build()
    dn = deno()
    steps = []
    tmp = tempfile.mkdtemp(prefix='tmtf_check_')
    print(f'전수 검산 시작 {now_iso()} · build {b0["buildSha256"][:12]} · 앱 파일 {len(b0["files"])}개')

    def step(no, name, fn):
        if steps and not all(s['ok'] for s in steps):
            steps.append({'no': no, 'name': name, 'ok': False, 'skipped': True, 'seconds': 0, 'detail': '앞 단계 실패로 건너뜀'})
            print(f'  {no} {name}: 건너뜀')
            return
        try:
            ok, detail, sec = fn()
        except Exception as e:
            ok, detail, sec = False, f'오류: {e}', 0
        detail = scrub(detail)
        steps.append({'no': no, 'name': name, 'ok': bool(ok), 'seconds': sec, 'detail': detail[-3000:]})
        print(f'  {no} {name}: {"통과" if ok else "실패"} ({sec} s) — {detail.splitlines()[-1][:160] if detail else ""}{"" if ok else chr(10) + detail[-1500:]}')

    def s1():
        c, out, sec = run([PY, '-I', '-X', 'utf8', 'tools/cross_check.py'], timeout=900)
        return c == 0 and verdict(out).startswith('판정: 통과'), out, sec

    dump = os.path.join(tmp, 'result.json')

    def s2():
        if not dn:
            return False, 'deno 를 찾지 못함', 0
        c, out, sec = run([dn, 'run', '--allow-read', f'--allow-write={tmp}', 'tools/app_check.js', '--dump', dump], timeout=900)
        bad = [l for l in out.splitlines() if l.startswith('✗')]
        v = verdict(out)
        return c == 0 and v.startswith('판정: 통과') and not bad and os.path.exists(dump), ' · '.join(bad[:6] + [v]), sec

    def s3():
        c, out, sec = run([PY, '-I', '-X', 'utf8', 'tools/verify_result.py', dump], timeout=900)
        if not (c == 0 and verdict(out).startswith('판정: 통과')):
            return False, out, sec
        # 검산기 자체 점검 (1.2.14): 같은 파일과, 화면 점검이 함께 저장한 이어하기 회기 파일(<dump>.resume.json)을 조금씩 바꿔 판정이 기대와 같은지
        c2, out2, sec2 = run([PY, '-I', '-X', 'utf8', 'tools/verify_result_check.py', dump], timeout=900)
        return c2 == 0 and verdict(out2).startswith('판정: 통과'), out + '\n' + out2, round(sec + sec2, 1)

    LEAN = os.path.join(ROOT, 'tools', 'lean')
    LAKE = os.path.join(HOME, '.elan', 'bin', 'lake.exe' if os.name == 'nt' else 'lake')
    STD_AX = {'propext', 'Classical.choice', 'Quot.sound'}

    def s4():
        if not os.path.exists(LAKE):
            return False, f'Lean (lake) 를 찾지 못함: {LAKE}', 0
        shutil.rmtree(os.path.join(LEAN, '.lake', 'build'), ignore_errors=True)   # 처음부터
        c, out, sec = run([LAKE, 'build'], timeout=1800, cwd=LEAN)
        lines = [l for l in out.splitlines() if not l.startswith('trace:')]
        bad = [l for l in lines if l.lstrip().startswith(('warning', 'error')) or 'sorry' in l]
        ok = c == 0 and any('Build completed successfully' in l for l in lines) and not bad
        return ok, (' | '.join(bad[:20]) + ' — ' if bad else '') + (lines[-1] if lines else ''), sec

    def s5():
        if not os.path.exists(LAKE):
            return False, f'Lean (lake) 를 찾지 못함: {LAKE}', 0
        c, out, sec = run([LAKE, 'env', 'lean', 'MyAudit.lean'], timeout=1800, cwd=LEAN)
        ls = out.splitlines()
        summ = next((l for l in ls if l.startswith('SUMMARY')), '')
        union = next((l for l in ls if l.startswith('UNION')), '')
        nonstd = next((l for l in ls if l.startswith('NONSTANDARD')), '')
        ax = set(union.split(' ', 1)[1].split(',')) - {''} if ' ' in union else set()
        ok = c == 0 and bool(summ) and ' axiomDecls=0 ' in summ + ' ' and ax <= STD_AX and nonstd.strip() == 'NONSTANDARD 0' and 'sorryAx' not in out
        return ok, f'{summ} · {union} · {nonstd}', sec

    def s6():
        if not dn:
            return False, 'deno 를 찾지 못함', 0
        exe = os.path.join(LEAN, '.lake', 'build', 'bin', 'crosscheck.exe' if os.name == 'nt' else 'crosscheck')
        if not os.path.exists(exe):
            return False, '대조 실행 파일이 없음 (4단계 빌드)', 0
        pin, pjs, plean = (os.path.join(tmp, n) for n in ('cross_in.txt', 'cross_js.txt', 'cross_lean.txt'))
        c1, o1, t1 = run([dn, 'run', '--allow-read', '--allow-write', 'tools/lean/cross_check.js', 'input', pin, pjs], timeout=1800)
        if c1 != 0:
            return False, o1, t1
        c2, o2, t2 = run([exe, pin, plean], timeout=1800, cwd=LEAN)
        if c2 != 0:
            return False, o2, round(t1 + t2, 1)
        c3, o3, t3 = run([dn, 'run', '--allow-read', 'tools/lean/cross_check.js', 'check', pjs, plean], timeout=1800)
        tl = [l.strip() for l in o3.splitlines() if l.strip()]
        ok = c3 == 0 and '판정: 통과' in tl
        return ok, ' · '.join(tl[:14] + tl[-1:]), round(t1 + t2 + t3, 1)

    step(1, '자극 · 계단 JS = 파이썬 (tools/cross_check.py)', s1)
    step(2, '화면 코드 점검 (tools/app_check.js)', s2)
    step(3, '결과 파일 다시 만들기 (tools/verify_result.py)', s3)
    step(4, 'Lean 4 빌드 (tools/lean, 처음부터)', s4)
    step(5, 'Lean 공리 감사 (MyAudit.lean)', s5)
    step(6, 'JS ↔ Lean 대조 (cross_check.js · crosscheck)', s6)
    shutil.rmtree(tmp, ignore_errors=True)
    b1 = build()
    same_build = b0['buildSha256'] == b1['buildSha256']
    ok = all(s['ok'] for s in steps) and same_build
    secs = round(time.perf_counter() - t_all, 1)
    with open(os.path.join(ROOT, 'js', 'app.js'), encoding='utf-8') as f:
        ver = next((l.split("'")[1] for l in f if l.startswith('const APP_VERSION')), None)
    rec = {'at': now_iso(), 'ok': ok, 'seconds': secs, 'buildSha256': b0['buildSha256'], 'buildSame': same_build, 'files': b0['files'], 'tools': tool_hashes(), 'steps': steps, 'appVersion': ver}
    stamp = datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
    with open(os.path.join(LOGDIR, f'{stamp}_{"통과" if ok else "실패"}.json'), 'w', encoding='utf-8') as f:
        json.dump(rec, f, ensure_ascii=False, indent=1)
    if ok:
        old = {}
        if os.path.exists(PASS):
            try:
                with open(PASS, encoding='utf-8') as f:
                    old = json.load(f)
            except Exception:
                old = {}
        hist = (old.get('history') or []) + [{k: rec[k] for k in ('at', 'buildSha256', 'appVersion', 'seconds')}]
        with open(PASS, 'w', encoding='utf-8', newline='\n') as f:
            json.dump({'last': rec, 'history': hist}, f, ensure_ascii=False, indent=1)
            f.write('\n')
    if not same_build:
        print('  ✗ 검산하는 동안 앱 파일이 바뀜 — 통과 기록을 쓰지 않음')
    print(f'판정: {"통과" if ok else "실패"} ({secs} s){" → 검증_통과.json" if ok else ""}')
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
