// 화면 코드 점검의 안쪽 (참가자용, Claude 2026-11-24) — tools/app_check.js 가 화면 js 뒤에 이어 붙여 같은 범위에서 돌림: app.js 안의 이름(DB · S · awaiting · 함수들)을 그대로 씀.
// 듣는 사람 모형(정신물리 곡선 · 늘 찍기)으로 실제 흐름을 처음부터 끝까지: 준비 → 소리 크기 → 연습 → 한 바퀴(화면 가려짐 · 멈춤 창 · 버린 측정) → 한 바퀴 더 →
// 차이 큰 것만 한 번 더 → 결과 · 파일 · 글 → 받은 결과 보기 · CSV → 기록 되살리기 · 바뀐 파일 막기 · 중간에 끝내기 · 출력 확인 · 저장소 · 네트워크
globalThis.__scope = (async () => {
  const H = globalThis.__H, ok = H.ok;
  const wait = ms => new Promise(r => H.realSetTimeout(r, ms));
  async function until(f, ms = 30000, what = '') { const t0 = Date.now(); while (!f()) { if (Date.now() - t0 > ms) throw new Error('기다림 초과: ' + what); await wait(1); } }
  async function tryOk(name, f) { try { const r = await f(); const [c, d] = Array.isArray(r) ? r : [r, '']; ok(name, !!c, d); } catch (e) { ok(name, false, e.stack || e.message); } }
  const vis = id => $(id).classList.contains('on');
  const rng = Stim.makeRng(20261124);
  const ri = n => Math.floor(rng.uniform() * n);
  const starts = () => H.audioLog.filter(x => x.ev === 'start');
  const bits = c => c.map(x => x ? 1 : 0).join('');
  const V = APP_VERSION.split(' ')[0];   // index.html 의 ?v=

  // ── 처음 화면 · build
  await until(() => BUILD_LOAD !== null, 15000, 'build');
  await tryOk('처음: build 해시 = 앱 파일 6개 SHA-256 을 따로 계산한 값 · 통과 기록 없으면 no-record', async () => {
    const fh = {}; for (const f of H.appFiles) fh[f] = await H.sha256(H.fileBytes(f));
    const whole = await H.sha256(new TextEncoder().encode(Object.keys(fh).sort().map(k => `${k}:${fh[k]}\n`).join('')));
    return [BUILD_LOAD.ok && BUILD_LOAD.buildSha256 === whole && JSON.stringify(BUILD_LOAD.files) === JSON.stringify(fh) && BUILD_LOAD.verified.status === 'no-record', JSON.stringify(BUILD_LOAD).slice(0, 240)];
  });
  await tryOk('처음 열 때 build = force-cache(화면이 실제로 받은 판) · 화면이 부른 주소 그대로(?v=) · 화면 주소 = index.html', () =>
    [BUILD_LOAD.mode === 'force-cache' && H.calls.includes(`GET js/app.js?v=${V} force-cache`) && H.calls.includes(`GET style.css?v=${V} force-cache`) && H.calls.includes('GET index.html force-cache'), H.calls.slice(0, 7).join(' | ')]);
  H.expectBuild = BUILD_LOAD.buildSha256;
  // 통과 기록(검증_통과.json 꼴): 마지막 통과의 파일 해시 + history — 처음 열 때는 기록이 없었고(no-record), 회기를 시작할 때 다시 읽어 맞댐
  H.passRecord = { last: { ok: true, at: '2026-11-24T00:00:00+09:00', appVersion: APP_VERSION, buildSha256: BUILD_LOAD.buildSha256, files: { ...BUILD_LOAD.files } },
    history: [{ at: '2026-11-24T00:00:00+09:00', buildSha256: BUILD_LOAD.buildSha256, appVersion: APP_VERSION }] };
  await tryOk('처음 화면: 기본 떨림 속도 10 · 50 · 100 · 150 · 200 Hz · 약 20분 · 링크 번호(?id=P02) · 경고 없음 · 경고창 없음', () => [
    vis('#pgHome') && $('#fmInfo').textContent === '검사할 떨림 속도: 10 · 50 · 100 · 150 · 200 Hz' && $('#homeTime').textContent.startsWith('약 20분') && $('#codeIn').value === 'P02' && $('#envWarn').hidden && $('#homeSaved').hidden && !H.dialogs.length,
    `${$('#fmInfo').textContent} | ${$('#homeTime').textContent} | ${$('#codeIn').value}`]);
  await tryOk('절차 고정: 조건 이름 · 스냅숏 (3구간 · 0.5 s · 쉼 0.5 s · 10 ms 직선 · 광대역 · 무작위 위상 · 0 dB 시작 · Won 규칙 · 0 dB 4번 멈춤 · 맞음/틀림 · 앞 무음 0.25 s · 3 dB 규칙)', () => {
    const want = { id: 'custom', nAFC: 3, dur: 0.5, isi: 0.5, rampMs: 10, rampShape: 'linear', band: { type: 'wide' }, phase: 'random', startDb: 0, bigUntil: 4, big: 4, small: 2, totalRev: 14, avgLast: 10, ceiling: 'stop4', rove: 0, leadS: 0.25, feedback: true };
    return [PROC_KEY === '직접·3구간·광대역·0.5초·쉼0.5초·흔들기없음·반전14·마지막10·직선경사' && JSON.stringify(snapP(PR)) === JSON.stringify(want) && PR.extraIfDiff === 3, PROC_KEY + ' ' + JSON.stringify(snapP(PR))];
  });
  await tryOk('링크 떨림 빠르기(?hz=): 고를 수 있는 칸만 · 하나라도 틀리면 통째로 버림 · 12개까지 · 정렬 · 겹침 없앰', () => {
    const c = [['10,50,100', '10,50,100'], ['100 10 50', '10,50,100'], ['10,10,50', '10,50'], ['10,51', null], ['', null], ['abc', null], ['10.5', null],
      [Array.from({ length: 13 }, (_, i) => (i + 1) * 5).join(','), null], ['56,57,58,59,61', null], ['66,69', null], ['64', '64'], ['2,512', '2,512'], ['1', null], ['600', null], [null, null]];
    const bad = c.filter(([s, w]) => { const r = parseFms(s); return (r ? r.join(',') : null) !== w; });
    return [!bad.length, JSON.stringify(bad.map(([s]) => [s, parseFms(s)]))];
  });
  await tryOk('번호 다듬기: 글자 · 숫자 · 한글 · _ - 만, 20자까지 · 파일 이름은 영문 · 숫자만(없으면 anon)', () =>
    [cleanCode(' P 0<2>/') === 'P02' && cleanCode('가나다-1_x') === '가나다-1_x' && cleanCode('a'.repeat(30)).length === 20 && asciiCode('가나') === 'anon' && asciiCode('P02') === 'P02', '']);

  // ── 준비
  $('#goSetup').click();
  await tryOk('준비: 귀 · 듣는 방법을 고르기 전에는 다음 막힘', () => [vis('#pgSetup') && $('#setupNext').disabled && !$('#setupNeed').hidden, '']);
  $('#earPick').querySelector('[data-v="R"]').click();
  await tryOk('귀 고름 → 그 단추만 켜짐 · 아직 다음 막힘', () => [PRE.ear === 'R' && $$('#earPick .choice.on').length === 1 && $('#setupNext').disabled, PRE.ear]);
  $('#pathPick').querySelector('[data-v="bt"]').click();
  await tryOk('블루투스 → 앞부분 잘림 안내 · 다음 열림', () => [PRE.path === 'bt' && !$('#btNote').hidden && !$('#setupNext').disabled && $('#setupNeed').hidden, '']);
  $('#pathPick').querySelector('[data-v="wired"]').click();
  await tryOk('선으로 연결로 바꿈 → 안내 숨김 · 켜진 단추 하나', () => [PRE.path === 'wired' && $('#btNote').hidden && $$('#pathPick .choice.on').length === 1, '']);
  $('#infoAge').value = '40s'; $('#moreBox').open = true;
  $('#setupNext').click();
  await tryOk('다음 → 소리 크기 화면 · 시작은 크기 확인 전 막힘', () => [vis('#pgSound') && $('#soundNext').disabled, '']);

  // ── 소리 크기 · 들어 보기
  const n0 = starts().length;
  $('#noisePlay').click();
  await tryOk('잡음 틀기: 10 s 버퍼 하나 · 세기 −26.02 dBFS(변조 없음) · 기록(씨앗 · 표본화)', () => {
    const e = starts().slice(n0), d = e[0]?.data, r = d ? 20 * Math.log10(Stim.rms(d)) : null;
    return [e.length === 1 && Math.abs(e[0].dur - 10) < 1e-9 && Math.abs(r - 20 * Math.log10(Stim.TARGET_RMS)) < 1e-3 && PRE.noise.length === 1 && PRE.noise[0].sampleRate === 48000 && $('#noiseState').textContent.includes('10초'), `${e.length} ${e[0]?.dur} ${r}`];
  });
  $('#noiseStop').click();
  await tryOk('멈춤: 소리 멈춤 · 멈춘 시각 기록 · 안내 지움', () => [H.audioLog.some(x => x.ev === 'stop') && !!PRE.noise[0].stoppedAt && $('#noiseState').textContent === '', '']);
  $('#demoMod').click(); const dm = starts().at(-1);
  $('#demoFlat').click(); const df = starts().at(-1);
  await tryOk('들어 보기: 떨리는 소리 = 10 Hz 100%(포락선 깊이 ≈ 1) · 떨리지 않는 소리 ≈ 0 · 둘 다 2 s · 같은 세기 · 기록', () => {
    const m1 = Stim.measureDepth(dm.data, 48000, 10), m0 = Stim.measureDepth(df.data, 48000, 10);
    const r1 = 20 * Math.log10(Stim.rms(dm.data)), r0 = 20 * Math.log10(Stim.rms(df.data));
    return [m1 > 0.7 && m0 < 0.25 && dm.dur === 2 && df.dur === 2 && Math.abs(r1 - r0) < 1e-3 && PRE.demo.length === 2 && PRE.demo[0].kind === 'mod' && PRE.demo[0].depthDb === 0 && PRE.demo[1].depthDb === null,
      `${m1.toFixed(3)} ${m0.toFixed(3)} ${r1.toFixed(4)} ${r0.toFixed(4)}`];
  });
  $('#volOk').click();
  await tryOk('크기 확인 → 시작 열림 · 시각 기록 · 18 Hz 유지 신호 1개 자동 켜짐(keepStart 여러 번 호출해도 발진기 1개 · 멈춤 0번)', () => {
    keepStart(); keepStart();
    const stN = H.oscLog.filter(x => x.ev === 'start').length, spN = H.oscLog.filter(x => x.ev === 'stop').length;
    return [!$('#soundNext').disabled && !!PRE.volOkAt && stN === 1 && spN === 0 && keep && keep.node.frequency.value === 18 && $('#keepBadge').textContent.includes('켜짐'), `st=${stN} sp=${spN}`];
  });
  $('#osVol').value = '30';
  $('#soundNext').click();
  // ── 짧은 소리 점검 (네 번 소리 · 앞 무음 3초 × 2회)
  await until(() => vis('#pgOnset') && ONSET.running && ONSET.phase === 'awaiting' && ONSET.idx === 0, 20000, '네 번 소리 점검 1회');
  await tryOk('네 번 소리 점검 1회: 1,030 ms 버퍼 재생 · 다시 듣기 동작 · 4개+아니오 응답', async () => {
    const b1 = starts().at(-1);
    const durOk = b1 && Math.abs(b1.dur - 1.03) < 1e-4;
    $('#onReplay').click();
    await until(() => ONSET.phase === 'awaiting', 10000, '다시 듣기 완료');
    const repOk = ONSET.cur.replays === 1;
    $('#onCountPick').querySelector('[data-v="4"]').click();
    const firstShown = !$('#onFirstBox').hidden && $('#onTrialNext').disabled;
    $('#onFirstPick').querySelector('[data-v="no"]').click();
    const nextReady = !$('#onTrialNext').disabled;
    $('#onTrialNext').click();
    return [durOk && repOk && firstShown && nextReady, `dur=${b1?.dur} rep=${repOk} first=${firstShown} next=${nextReady}`];
  });
  await until(() => ONSET.running && ONSET.phase === 'awaiting' && ONSET.idx === 1, 20000, '네 번 소리 점검 2회');
  $('#onCountPick').querySelector('[data-v="4"]').click();
  $('#onFirstPick').querySelector('[data-v="no"]').click();
  $('#onTrialNext').click();
  await until(() => !$('#onsetResCard').hidden, 10000, '네 번 소리 점검 결과');
  await tryOk('네 번 소리 점검 완료: 3초 × 2회 기록 · 판정 ‘정상’ · 쉬운 정상 안내', () => [
    PRE.onset && !PRE.onset.skipped && PRE.onset.trials.length === 2 && PRE.onset.trials.every(t => t.silenceBeforeMs === 3000 && t.resp === 4 && t.first === 'no')
      && PRE.onset.trials[0].replays === 1 && PRE.onset.summary.verdict === '정상' && $('#onResMsg').textContent.includes('정상적으로 들렸습니다'),
    JSON.stringify(PRE.onset?.summary)]);
  $('#onsetStart').click();
  await until(() => S && S.cur && S.cur.practice && awaiting, 20000, '연습 첫 시행');
  const sess = S.session;
  await tryOk('회기 시작: 번호 · 귀 · 듣는 방법 · 볼륨 · 더 알려 주기(나이만, 나머지 null · 상자 열림) · 조건 이름 · 절차 · 계획(5개 무작위 한 바퀴) · build 통과 · 준비 기록 옮김 · 준비 칸 비움 · 링크', () => {
    const okPlan = sess.plan.length === 5 && sess.plan.map(x => x.fm).sort((a, b) => a - b).join() === '10,50,100,150,200' && sess.plan.every(x => x.round === 1 && !x.extra) && sess.rounds.length === 1
      && sess.rounds[0].order.join() === sess.plan.map(x => x.fm).join();
    const c = [sess.code === 'P02', sess.ear === 'R', sess.path === 'wired', sess.osVolume === 30,
      sess.info.age === '40s' && sess.info.ciYears === null && sess.info.onset === null && sess.info.maker === null && sess.info.note === null && sess.info.shown === true,
      sess.procKey === PROC_KEY && JSON.stringify(sess.P) === JSON.stringify(snapP(PR)), okPlan, sess.build.sha256 === H.expectBuild && sess.build.verified.status === 'pass', sess.buildAtLoad === H.expectBuild,
      sess.setup.noise.length === 1 && sess.setup.demo.length === 2 && !!sess.setup.volOkAt, PRE.noise.length === 0 && PRE.demo.length === 0 && !$('#volOk').checked && $('#soundNext').disabled,
      sess.events.some(e => e.type === 'session-start'), sess.practiceFm === 10 && sess.env.audio.sampleRate === 48000, sess.link.code === 'P02' && sess.link.hz === null && !sess.link.hzUsed,
      sess.fmsPlan.join() === '10,50,100,150,200', sess.end === null && sess.format === 'ci-tmtf-public' && sess.app === APP_VERSION];
    return [c.every(Boolean), bits(c)];
  });

  // ── 연습
  await tryOk('연습 시행: 소리 3개 · 0.5 s · 1.0 s 간격(0.5 + 쉼 0.5) · 앞 무음 0.25 s · 떨리는 소리 = 정답 자리(100%) · 세 소리 세기 같음 · 소리 뒤 단추 열림 · 제목', () => {
    const e = starts().slice(-3), a = awaiting, C = S.cur;
    const gaps = [e[1].t - e[0].t, e[2].t - e[1].t], lead = e[0].t - e[0].at;
    const dep = e.map(x => Stim.measureDepth(x.data, 48000, 10)), rms = e.map(x => 20 * Math.log10(Stim.rms(x.data)));
    const c = [e.length === 3, e.every(x => Math.abs(x.dur - 0.5) < 1e-9), gaps.every(g => Math.abs(g - 1.0) < 1e-9), Math.abs(lead - 0.25) < 0.02, dep.indexOf(Math.max(...dep)) === a.tg && dep[a.tg] > 0.5,
      Math.max(...rms) - Math.min(...rms) < 1e-3 && Math.abs(rms[0] - 20 * Math.log10(Stim.TARGET_RMS)) < 1e-3, C.tm.seeds.length === 3 && C.tm.rms.length === 3 && C.tm.lead > 0.2,
      $$('.iv').every(b => !b.disabled && b.classList.contains('ready')), !$('#dunno').disabled, $('#tTitle').textContent === '연습 1 / 3'];
    return [c.every(Boolean), bits(c) + ' 깊이 ' + dep.map(x => x.toFixed(2)).join(',') + ' 정답 ' + a.tg + ' 앞 ' + lead.toFixed(3)];
  });
  H.key(String(awaiting.tg + 1));
  await tryOk('연습 답(키 · 맞음): ‘맞았습니다’ · 정답 칸 초록 · 기록(깊이 0 · 맞음 · key · 반응 ms · 씨앗 3 · 연습 차례 1)', () => {
    const t = sess.practiceTrials[0];
    return [t && t.d === 0 && t.c === 1 && t.inp === 'key' && t.u === 0 && t.round === 1 && t.seeds.length === 3 && t.rt >= 0 && t.fm === 10 && $('#fb').textContent === '맞았습니다' && $$('.iv')[t.tg].classList.contains('right'), JSON.stringify(t).slice(0, 200)];
  });
  await until(() => S.cur.phase === 'playing' && sess.practiceTrials.length === 1, 10000, '연습 2 소리');
  H.key('2');
  await until(() => awaiting, 10000, '연습 2 답 기다림');
  await tryOk('소리 나는 동안 누른 키 = 그 시행의 이른 입력 (답으로 안 침)', () => [S.cur.tm.early === 1 && S.cur.tm.ev[0].type === 'early-input' && S.cur.tm.ev[0].key === 2 && sess.practiceTrials.length === 1, JSON.stringify(S.cur.tm.ev)]);
  $$('.iv')[(awaiting.tg + 1) % 3].click();
  await tryOk('연습 답(클릭 · 틀림): ‘아쉽습니다’ · 고른 칸 빨강 · 기록에 이른 입력 1', () => { const t = sess.practiceTrials[1]; return [t.c === 0 && t.inp === 'click' && t.early === 1 && $('#fb').textContent.startsWith('아쉽습니다') && $$('.iv')[t.a].classList.contains('wrong'), JSON.stringify(t).slice(0, 160)]; });
  await until(() => awaiting && sess.practiceTrials.length === 2, 10000, '연습 3');
  H.key('0');
  await tryOk('모르겠음(0): 무작위 자리로 침(u 1) · ‘떨리는 소리는 n번이었습니다’ · 고른 칸 표시 없음', () => { const t = sess.practiceTrials[2]; return [t.u === 1 && t.inp === 'key' && t.a >= 0 && t.a < 3 && $('#fb').textContent === `떨리는 소리는 ${t.tg + 1}번이었습니다` && !$$('.iv').some(b => b.classList.contains('wrong')), JSON.stringify(t).slice(0, 120)]; });
  await until(() => vis('#pgBreak'), 10000, '연습 끝 화면');
  await tryOk('연습 끝: 3번 중 1번(모르겠음은 셈에서 뺌) · 도움말 · 연습 한 번 더 · 검사 시작 · 모르겠음 안내 문구', () => [
    $('#bBody').textContent.includes('3번 중 1번') && !$('#bPractice').hidden && $('#bNext').textContent === '검사 시작' && $('#bBody').textContent.includes('볼륨을 조금 키우거나')
      && $('#bBody').textContent.includes('떨림이 아주 조금이라도 느껴지면 그 번호를 선택해 주세요') && $('#bBody').textContent.includes('세 소리가 완전히 똑같이 들릴 때만')
      && $('#pgHome').textContent.includes('떨림이 아주 조금이라도 느껴지면 그 번호를 선택해 주세요'), $('#bBody').textContent.slice(0, 160)]);
  $('#bPractice').click();
  await until(() => awaiting && S.cur?.practice && S.practiceRound === 2, 10000, '연습 한 번 더');
  ok('연습 한 번 더: 연습 차례 2 · 제목 ‘연습 1 / 3’', $('#tTitle').textContent === '연습 1 / 3' && sess.practiceRounds === 2, $('#tTitle').textContent);
  $('#stopBtn').click();
  await tryOk('연습 그만: 확인 창 없이 연습 끝 화면(‘건너뛰었어요’) · 회기 사건 practice-stopped(몇 번째 · 답하기 전 시행)', () => {
    const ev = sess.events.filter(e => e.type === 'practice-stopped').at(-1);
    return [vis('#pgBreak') && ev && ev.done === 0 && ev.of === 3 && ev.phase === 'awaiting' && ev.pending && ev.pending.seeds.length === 3 && $('#bBody').textContent.includes('연습을 건너뛰었습니다') && !H.dialogs.length, JSON.stringify(ev).slice(0, 200)];
  });
  H.key('Enter');
  await until(() => S.cur && !S.cur.practice, 10000, 'Enter 로 검사 시작');
  await tryOk('쉬는 화면에서 Enter = 다음(검사 시작) · 첫 측정 제목', () => [vis('#pgTest') && S.idx === 0 && $('#tTitle').textContent === '검사 1 / 5', $('#tTitle').textContent]);

  // ── 측정: 듣는 사람 모형
  const model = thr => depth => { const p = thr === null ? 1 / 3 : 1 / 3 + (2 / 3) / (1 + Math.exp(-(depth - thr) / 1.5)); return rng.uniform() < 0.04 ? 'U' : rng.uniform() < p ? 'C' : 'W'; };
  async function runTrack(thrMap, onTrial) {
    await until(() => S && S.cur && !S.cur.practice && awaiting, 20000, '측정 첫 시행');
    const C0 = S.cur, mdl = model(thrMap[C0.fm]);
    let n = 0;
    while (S && S.cur === C0) {
      if (onTrial) await onTrial(n, C0);
      if (!S || S.cur !== C0) break;
      await until(() => !S || S.cur !== C0 || awaiting, 20000, '답 기다림');
      if (!S || S.cur !== C0) break;
      const a = awaiting, r = mdl(a.depth);
      if (r === 'U') H.key('0');
      else { const i = r === 'C' ? a.tg : (a.tg + 1 + ri(2)) % 3; if (n % 3 === 0) $$('.iv')[i].click(); else H.key(String(i + 1)); }
      n++;
      await until(() => !awaiting || !S || S.cur !== C0, 5000, '답한 뒤');
    }
    return C0;
  }
  const THR1 = { 10: -18, 50: -14, 100: -8, 150: -3, 200: null };
  // 지금 측정이 늘 찍기(200 Hz)면 그 측정만 역치 −12 dB 로 (keep: 그 측정을 결과로 남기는 자리인지 — 역치 점검에서 그만큼 바꿔 봄)
  let goodKept = null;
  const GOOD = keep => { const fm = S.plan[S.idx].fm; if (THR1[fm] === null && keep) goodKept = fm; return { ...THR1, [fm]: THR1[fm] ?? -12 }; };
  const nextFm = () => S.plan[S.idx].fm;
  // 첫 측정: 그대로
  await runTrack(THR1);
  await until(() => vis('#pgBreak'), 10000, '쉬는 화면 1');
  await tryOk('측정 끝 → 쉬는 화면(5개 중 1개 완료 · 남은 4) · 기록 1개 · 하던 측정(current) 비움', () => [$('#bBody').textContent.includes('5개 중 1개를 마쳤습니다') && sess.runs.length === 1 && sess.current === null && $('#bPractice').hidden, $('#bBody').textContent]);
  // 둘째: 소리 나는 중 화면 가려짐 → 그 시행 버리고, 돌아오면 같은 깊이로 다시
  $('#bNext').click();
  // 가려짐 · 멈춤 시험 자리는 늘 ‘잘 듣는 사람’ 모형 — 무작위 순서로 늘 찍기(200 Hz)가 걸리면 시험 시행 전에 측정이 끝나 버림
  await runTrack(GOOD(true), async (n, C0) => {
    if (n !== 3) return;
    await until(() => C0.phase === 'playing', 10000, '가려짐 시험 소리');
    const pend = { ...C0.pend }, nTr = C0.track.trials.length;
    H.visibility(true);
    await tryOk('소리 나는 중 화면 가려짐 → 그 시행 버림(trial-void: 씨앗 · 정답 자리 · 깊이) · 다시 들려줄 표시', () => {
      const ev = sess.events.filter(e => e.type === 'trial-void').at(-1);
      return [ev && ev.heard && ev.heard.tg === pend.tg && ev.heard.d === pend.d && ev.heard.seeds.length === 3 && ev.trialNo === nTr + 1 && C0.needReplay && sess.events.some(e => e.type === 'hidden'), JSON.stringify(ev).slice(0, 160)];
    });
    await wait(5);
    H.visibility(false);
    await until(() => awaiting && S.cur === C0, 20000, '다시 들려줌');
    await tryOk('돌아오면 같은 깊이로 다시 들려줌 · 시행 기록 rep 1 · 안내 문구', () => [awaiting.depth === pend.d && C0.tm.rep === 1 && C0.track.trials.length === nTr && sess.events.some(e => e.type === 'visible'), `${awaiting.depth} ${pend.d} ${C0.tm.rep}`]);
  });
  await until(() => vis('#pgBreak'), 10000, '쉬는 화면 2');
  // 셋째: 멈춤 창 ‘계속’ → 그대로, ‘그만’ → 버린 측정(시행 전부) → 같은 주파수를 처음부터
  $('#bNext').click();
  const fm3 = S.plan[S.idx].fm;
  let abandonedN = 0;
  await runTrack(GOOD(false), async (n, C0) => {
    if (n === 2) {
      await until(() => awaiting && S.cur === C0, 10000, '멈춤 창 계속');
      H.confirmAnswer = false; $('#stopBtn').click(); H.confirmAnswer = true;
      await tryOk('멈춤 창 ‘계속’: 문구 그대로 · 답하기 전 시행에 stop-dialog · 회기 사건 · 측정은 그대로', () => {
        const ev = sess.events.filter(e => e.type === 'stop-dialog').at(-1);
        return [ev && ev.answer === 'keep' && ev.text === '진행 중이던 구간은 취소하고 잠시 멈출까요?\n이미 마친 구간은 저장되어 있습니다.' && C0.tm.ev.some(x => x.type === 'stop-dialog' && x.answer === 'keep') && S.cur === C0 && awaiting, JSON.stringify(ev).slice(0, 160)];
      });
    }
    if (n === 5) {
      await until(() => awaiting && S.cur === C0, 10000, '멈춤 창 그만');
      abandonedN = C0.track.trials.length;
      $('#stopBtn').click();
    }
  });
  await tryOk('멈춤 창 ‘그만’: 버린 측정(시행 전부 · 반전 · 지금 깊이 · 답하기 전 시행 · 절차) · 쉬는 화면 ‘멈췄어요’ · 같은 주파수 다시 · 결과엔 안 들어감', () => {
    const ev = sess.events.filter(e => e.type === 'track-abandoned').at(-1);
    return [ev && ev.stopVia === 'stop-button' && ev.trialList.length === abandonedN && abandonedN === 5 && ev.pending && ev.pending.seeds.length === 3 && ev.P.totalRev === 14 && ev.fm === fm3
      && vis('#pgBreak') && $('#bTitle').textContent === '잠시 멈췄습니다' && $('#bNext').textContent === '다시 시작' && nextFm() === fm3 && sess.runs.length === 2 && sess.current === null, JSON.stringify(ev).slice(0, 200)];
  });
  $('#bNext').click();
  await runTrack(THR1);
  await until(() => vis('#pgBreak'), 10000, '쉬는 화면 3');
  for (let k = 0; k < 2; k++) {
    $('#bNext').click();
    await runTrack(THR1);
    await until(() => vis('#pgBreak') || vis('#pgEnd'), 10000, '쉬는 화면');
  }
  await until(() => vis('#pgEnd'), 20000, '한 바퀴 끝');
  const r1 = sess.runs.slice();
  await tryOk('한 바퀴 끝: 측정 5개(주파수마다 하나) · 회기 끝 시각 · ‘한 번 더’ 제안 · 끝 질문 · 결과 표 5줄 · 그림', () => {
    const c = [r1.length === 5, r1.map(r => r.fm).sort((a, b) => a - b).join() === '10,50,100,150,200', !!sess.end && sess.endReason === '계획한 측정 모두 마침', S && S.offer && S.offer.kind === 'again',
      !$('#againBox').hidden && $('#againText').textContent.includes('한 번 더'), !!$('#focusPick') && $$('#focusPick .choice').length === 3, $('#endTable').querySelectorAll('tr').length === 6, $('#endChart').innerHTML.includes('<svg'),
      $('#endTitle').textContent === '1차 검사 완료! 수고하셨습니다', $('#endWho').textContent.startsWith('P02 · 오른쪽 · 유선 연결')];
    return [c.every(Boolean), bits(c)];
  });
  await tryOk('측정 기록: 계단 다시 돌리기 = 저장값 · 세 소리 세기 같음 · 시행마다 씨앗 3 · 반전 시행 수 = 반전 수 · 순서 · 바퀴', () => {
    const bad = r1.filter(r => { const rp = replayCheck(r, sess.P), rm = rmsCheck(r);
      return !(rp.ok && rm.ok && r.trials.every(t => t.seeds.length === 3 && t.rms.length === 3 && [0, 1, 2].includes(t.tg)) && r.revAt.length === r.reversals.length && r.nTrials === r.trials.length && r.round === 1 && !r.extra); });
    return [!bad.length && r1.map(r => r.order).join() === '1,2,3,4,5', bad.map(r => r.fm).join()];
  });
  await tryOk('역치가 모형과 맞음: 10 · 50 · 100 Hz 는 모형 값 ± 6 dB, 200 Hz(늘 찍기)는 재지 못함 또는 우연 수준', () => {
    const g = fm => r1.find(r => r.fm === fm);
    const near = (fm, thr) => { const r = g(fm); return !r.ceiling && r.thr !== null && Math.abs(r.thr - thr) <= 6; };
    const r200 = g(200);
    return [near(10, -18) && near(50, -14) && near(100, -8) && (goodKept === 200 ? near(200, -12) : (r200.ceiling || r200.atChance)), r1.map(r => `${r.fm}:${r.thr}${r.ceiling ? '(천장)' : ''}`).join(' ') + (goodKept ? ` · ${goodKept} Hz 는 −12 dB 모형` : '')];
  });
  await tryOk('회기 사건: 측정 시작 6(다시 1) · 끝 5 · 버림 1 · 멈춤 창 2 · 가려짐/돌아옴 · plan-done', () => {
    const n = t => sess.events.filter(e => e.type === t).length;
    return [n('track-start') === 6 && n('track-end') === 5 && n('track-abandoned') === 1 && n('stop-dialog') === 2 && n('trial-void') === 1 && n('hidden') === 1 && n('visible') === 1 && n('plan-done') === 1 && n('practice-start') === 2 && n('practice-stopped') === 1,
      ['track-start', 'track-end', 'track-abandoned', 'stop-dialog', 'trial-void', 'plan-done'].map(t => t + ' ' + n(t)).join(' · ')];
  });
  $$('#focusPick .choice').find(b => b.dataset.v === 'mid').click();
  await tryOk('끝 질문 고름 → 회기 focusEnd · 보였음 표시 · 그 단추만 켜짐', () => [sess.focusEnd === 'mid' && sess.focusEndShown === true && $$('#focusPick .choice.on').length === 1, sess.focusEnd]);

  // ── 한 바퀴 더 (50 Hz 만 모형을 −4 dB 로 → 두 값이 3 dB 넘게 달라짐)
  $('#againBtn').click();
  await tryOk('‘한 번 더’ → 회기를 다시 엶(끝 지움) · 2바퀴 계획 5개(새 순서) · 쉬는 화면 ‘2번째 바퀴’ · 답 기록', () => {
    const p2 = S.plan.filter(x => x.round === 2);
    return [sess.end === null && sess.endReason === null && p2.length === 5 && sess.rounds.length === 2 && vis('#pgBreak') && $('#bTitle').textContent === '2차 검사'
      && sess.decisions.at(-1).what === 'again-offer' && sess.decisions.at(-1).answer === 'yes' && sess.events.some(e => e.type === 'round-added'), `${p2.length} ${$('#bTitle').textContent}`];
  });
  const THR2 = { ...THR1, 50: -4 };
  for (let k = 0; k < 5; k++) {
    $('#bNext').click();
    if (k === 0) await until(() => S.cur && awaiting, 10000, '2바퀴 첫 시행');
    if (k === 0) ok('2차 첫 측정 제목 ‘2차 검사 1 / 5’', $('#tTitle').textContent === '2차 검사 1 / 5', $('#tTitle').textContent);
    await runTrack(THR2);
    await until(() => vis('#pgBreak') || vis('#pgEnd'), 10000, '2바퀴 쉬는 화면');
  }
  await until(() => vis('#pgEnd'), 20000, '2바퀴 끝');
  await tryOk('2바퀴 뒤 제안 = 두 숫자 값이 3 dB 넘게 다른 주파수만(50 Hz 포함, Park 2015 규칙 · 재지 못함은 안 셈)', () => {
    const o = S?.offer, want = PLAN_FMS.filter(f => { const v = sess.runs.filter(r => r.fm === f && !r.ceiling && r.thr !== null).map(r => r.thr); return v.length === 2 && Math.abs(v[0] - v[1]) > 3; });
    return [o && o.kind === 'extra' && o.fms.join() === want.join() && o.fms.includes(50) && $('#againText').textContent.includes(`${o.fms.length}개`), JSON.stringify(o) + ' ' + want.join()];
  });
  const extraFms = S.offer.fms.slice();
  $('#againBtn').click();
  await tryOk('차이 큰 항목만 한 번 더 → 3차(더) 계획 · 쉬는 화면 제목', () => [S.plan.filter(x => x.round === 3 && x.extra).length === extraFms.length && $('#bTitle').textContent === '차이가 큰 항목만 한 번 더', $('#bTitle').textContent]);
  for (let k = 0; k < extraFms.length; k++) {
    $('#bNext').click();
    if (k === 0) { await until(() => S.cur && awaiting, 10000, '더 첫 시행'); ok('더 측정 제목 ‘한 번 더 1 / n’', $('#tTitle').textContent === `한 번 더 1 / ${extraFms.length}`, $('#tTitle').textContent); }
    await runTrack(THR2);
    await until(() => vis('#pgBreak') || vis('#pgEnd'), 10000, '더 쉬는 화면');
  }
  await until(() => vis('#pgEnd'), 20000, '모두 끝');
  await tryOk('모두 끝: 더 제안 없음 → 회기 닫음(S 없음) · 제목 ‘수고하셨습니다’ · 제안 상자 숨김 · 끝 질문은 그대로 보임 · 표에 1·2·3번째 칸', () => {
    const c = [S === null, $('#endTitle').textContent === '수고하셨습니다', $('#againBox').hidden, !!$('#focusPick'), sess.runs.length === 10 + extraFms.length, !!sess.end,
      sess.runs.filter(r => r.extra).length === extraFms.length && sess.runs.filter(r => r.extra).every(r => r.round === 3), $('#endTable').innerHTML.includes('3차'), sess.events.some(e => e.type === 'session-close')];
    return [c.every(Boolean), bits(c)];
  });

  // ── 결과 파일 · 글
  $('#saveFile').click();
  const dl = await H.takeDownloads();
  let fileObj = null;
  await tryOk('결과 파일 저장: 이름 TMTF_P02_R_날짜_시각.json · 형식 · 회기 하나(측정 · 시행 · 연습 · 사건 · 준비 · build 다) · 저장 기록', async () => {
    fileObj = JSON.parse(await dl[0].blob.text());
    const s = fileObj.sessions[0];
    return [dl.length === 1 && /^TMTF_P02_R_\d{4}-\d\d-\d\d_\d\d-\d\d\.json$/.test(dl[0].name) && fileObj.format === 'ci-tmtf-public' && fileObj.formatVersion === 2 && fileObj.procKey === PROC_KEY && fileObj.sessions.length === 1
      && s.id === sess.id && s.runs.length === sess.runs.length && s.practiceTrials.length === 3 && s.events.length === sess.events.length && s.setup.noise.length === 1 && s.build.sha256 === H.expectBuild
      && s.keepalive && s.keepalive.mode === 'tone18all' && s.onsetCheck && !s.onsetCheck.skipped && s.onsetCheck.summary.verdict === '정상' && sess.exports.some(x => x.how === 'file'),
      dl[0]?.name];
  });
  if (H.dump && fileObj) H.dump(fileObj);
  $('#saveReport').click();
  const repDl = await H.takeDownloads();
  await tryOk('전문가용 보고서 저장(.html): 참고용·비진단 고지 · 자극·계단 명세 · 결과표 · TMTF/계단 SVG · HTTPS/무결성 · CSP · 원시 시행표 · 외부 자원 없음 · 저장 기록', async () => {
    const h = repDl[0] ? await repDl[0].blob.text() : '';
    const okName = repDl.length === 1 && /^TMTF_report_P02_R_\d{4}-\d\d-\d\d_\d\d-\d\d\.html$/.test(repDl[0].name);
    const hasCore = h.includes('TMTF 검사 전문가 참고 보고서') && h.includes('참고용 고지 — 진단 도구가 아닙니다') && h.includes('For research and educational purposes only')
      && h.includes('광대역 가우스 잡음') && h.includes('−26.02 dBFS') && h.includes('2-down 1-up') && h.includes('70.7%')
      && h.includes(PROC_KEY) && h.includes('자리별 맞힘 1·2·3 (모르겠음 제외)') && h.includes('계단 사후 재계산 (replayCheck)')
      && h.includes('HTTPS 보안 연결') && h.includes("connect-src 'none'") && h.includes("script-src 'none'") && !h.includes('onclick=') && h.includes('name="referrer" content="no-referrer"')
      && h.includes(H.expectBuild) && h.includes('<svg class="chart"') && h.includes('<details class="raw">')
      && ['10.1121/1.1912375', '10.1121/1.383531', '10.1121/1.3592521', '10.1121/1.4773271', '10.1007/s10162-014-0499-z', '10.1097/AUD.0000000000000162', '10.1177/23312165261416179'].every(d => h.includes(d))
      && !/\b(?:src|href)\s*=\s*["']https?:/i.test(h) && !/url\(\s*['"]?https?:/i.test(h);
    const logged = sess.exports.some(x => x.how === 'report-html' && x.name === repDl[0]?.name) && $('#sendState').textContent.includes(repDl[0]?.name);
    return [okName && hasCore && logged, `${repDl[0]?.name} len=${h.length}`];
  });
  $('#copyText').click();
  await wait(20);
  await tryOk('결과 글 복사: 번호 · 귀 · 주파수마다 값 · 앱 판 · 안내', () => {
    const t = H.clip.at(-1)?.text || '';
    return [t.startsWith('TMTF 검사 결과\nP02 · 오른쪽 · 유선 연결') && PLAN_FMS.every(f => t.includes(`\n${f} Hz: `)) && t.includes(`(앱 ${APP_VERSION})`) && $('#sendState').textContent.includes('복사했습니다') && sess.exports.some(x => x.how === 'copy-text'), t.slice(0, 200)];
  });
  await tryOk('바로 보내기 단추: 이 환경(navigator.share 없음)에서는 숨김', () => [$('#shareFile').hidden, '']);

  // ── 받은 결과 보기
  $('#toHome').click();
  await tryOk('처음으로 → 저장된 검사 목록(측정 있는 회기 1개 · 결과 보기 단추)', () => [vis('#pgHome') && !$('#homeSaved').hidden && $$('#homeSavedList [data-open]').length === 1, $('#homeSavedList').textContent.slice(0, 100)]);
  $$('#homeSavedList [data-open]')[0].click();
  await tryOk('저장된 검사 → 결과 화면(끝 질문 · 제안 없음)', () => [vis('#pgEnd') && !$('#focusPick') && $('#againBox').hidden && $('#endTable').querySelectorAll('tr').length === 6, '']);
  $('#toHome').click();
  $('#goViewer').click();
  const good = new File([JSON.stringify(fileObj)], 'P02.json'), wrong = new File(['{"a":1}'], 'other.json');
  $('#vFiles').files = [good, wrong];
  $('#vFiles').dispatchEvent({ type: 'change', target: $('#vFiles') });
  await until(() => $('#vState').textContent.includes('열었습니다'), 10000, '받은 결과 열기');
  await tryOk('받은 결과 보기: 이 검사 파일만 엶(다른 파일은 못 엶 표시) · 측정 줄 = 측정 수 · 계단 다시 · 구간 세기 모두 같음 · 계단 그림', () => {
    const rows = $('#vList').querySelectorAll('tr').length - 1, html = $('#vList').innerHTML;
    return [VIEW.sessions.length === 1 && $('#vState').textContent.includes('검사 1개') && $('#vState').textContent.includes('other.json') && rows === sess.runs.length
      && (html.match(/class="good">같음/g) || []).length === 2 * sess.runs.length && !html.includes('class="bad"') && $('#vList').querySelectorAll('figure').length === sess.runs.length && !$('#vCsvRuns').disabled, `${rows} · ${$('#vState').textContent}`];
  });
  await tryOk('받은 결과 보기: 자리별 맞힘 1·2·3 은 모르겠음(u=1) 시행 제외', () => {
    const mock = {
      id: 'pos-check', start: iso(), ear: 'R', path: 'wired', P: snapP(PR), events: [], runs: [{
        round: 1, fm: 10, order: 1, thr: null, ceiling: false, incomplete: true, n0: 0, k0: 0, nTrials: 5, nDunno: 3,
        trials: [
          { d: 0, tg: 0, a: 0, c: 1, u: 0 },
          { d: 0, tg: 0, a: 1, c: 0, u: 1 },
          { d: 0, tg: 1, a: 0, c: 0, u: 0 },
          { d: 0, tg: 1, a: 1, c: 1, u: 1 },
          { d: 0, tg: 2, a: 2, c: 1, u: 1 },
        ],
      }],
    };
    const h = viewSessHtml(mock, '시험');
    return [h.includes('자리별 맞힘 1·2·3 (모르겠음 제외)') && h.includes('<td>1/1 · 0/1 · -</td>'), h.slice(0, 260)];
  });
  $('#vReport').click();
  const vRep = await H.takeDownloads();
  await tryOk('받은 결과 보기: 전문가용 보고서 저장 단추 동작 · .html 출력 · 참고용 고지 포함', async () => {
    const h = vRep[0] ? await vRep[0].blob.text() : '';
    return [!$('#vReport').disabled && vRep.length === 1 && /^TMTF_report_P02_R_.*\.html$/.test(vRep[0].name) && h.includes('참고용 고지') && $('#vState').textContent.includes(vRep[0].name), vRep[0]?.name || 'none'];
  });
  $('#vCsvRuns').click(); $('#vCsvTrials').click();
  const csvs = await H.takeDownloads();
  await tryOk('측정 CSV: 줄 = 측정 수 · 계단다시 모두 1 · 구간세기차 ≤ 0.1 dB · 역치 = 기록 / 시행 CSV: 줄 = 시행 수 · 역치에쓴반전 = 측정마다 마지막 10개(재지 못함은 0)', async () => {
    const R = H.parseCsv(await csvs[0].blob.text()).filter(r => r.length > 1), T = H.parseCsv(await csvs[1].blob.text()).filter(r => r.length > 1);
    const hr = R[0], ht = T[0], ix = (h, k) => h.indexOf(k);
    const runsOk = R.slice(1).length === sess.runs.length && R.slice(1).every(r => r[ix(hr, '계단다시')] === '1' && +r[ix(hr, '구간세기차dB')] <= 0.1);
    const thrOk = R.slice(1).every(r => { const run = sess.runs.find(x => x.order === +r[ix(hr, '순서')]); return run && String(run.thr ?? '') === r[ix(hr, '역치dB')]; });
    const nTr = sess.runs.reduce((a, r) => a + r.trials.length, 0);
    const useOk = sess.runs.every(run => { const used = T.slice(1).filter(t => +t[ix(ht, '측정순서')] === run.order && t[ix(ht, '역치에쓴반전')] === '1').length; return used === (run.ceiling ? 0 : Math.min(10, run.reversals.length)); });
    return [csvs.length === 2 && /^TMTF_runs_/.test(csvs[0].name) && /^TMTF_trials_/.test(csvs[1].name) && runsOk && thrOk && T.length - 1 === nTr && useOk, `${R.length - 1} ${T.length - 1}/${nTr} ${runsOk} ${thrOk} ${useOk}`];
  });

  // ── 저장소 · 네트워크
  await tryOk('저장소: 이 앱 열쇠(ciTmtf.v1) 하나만 · 저장된 회기 = 화면의 회기', () => {
    const keys = [...H.store.keys()], o = JSON.parse(H.store.get('ciTmtf.v1'));
    return [keys.length === 1 && keys[0] === 'ciTmtf.v1' && o.sessions.length === DB.sessions.length && o.sessions[0].runs.length === sess.runs.length && o.format === 'ci-tmtf-public', keys.join(' ')];
  });
  await tryOk('네트워크: 앱 파일 · 통과 기록 읽기(GET)만 — 보내는 요청 없음 · 회기 시작 때는 no-store(서버의 지금 판)', () => {
    const allow = new Set([...H.appFiles, '검증_통과.json']);
    const bad = H.calls.filter(c => { const [m, u] = c.split(' '); return m !== 'GET' || !allow.has(u.split('?')[0]); });
    return [!bad.length && H.calls.length > 0 && H.calls.includes(`GET js/app.js?v=${V} no-store`) && H.calls.includes('GET index.html no-store'), bad.join(' | ') || `${H.calls.length}개`];
  });

  // ── 화면이 닫힌 회기 되살리기
  await tryOk('화면이 닫혀 끝나지 않은 회기: 다음에 열 때 끝난 것으로 · 하던 측정은 버린 측정(page-closed, 시행 그대로) · 2분 안에 고친 회기는 그대로', () => {
    const old = { id: 'orph-old', start: new Date(Date.now() - 3600e3).toISOString(), updated: new Date(Date.now() - 600e3).toISOString(), end: null, events: [], runs: [],
      current: { fm: 50, round: 1, order: 2, trialList: [{ d: 0, c: 1 }, { d: 0, c: 1 }], reversals: [], revAt: [], depthNow: -4 } };
    const fresh = { id: 'orph-new', start: iso(), updated: iso(), end: null, events: [], runs: [], current: null };
    DB.sessions.push(old, fresh);
    const n = closeOrphans(), ev = old.events[0];
    const res = [n === 1, old.end === old.updated && old.endReason === '화면이 닫힘 (다음에 열었을 때 발견)' && !!old.closedFoundAt, ev && ev.type === 'track-abandoned' && ev.stopVia === 'page-closed' && ev.trialList.length === 2 && ev.depthNow === -4, old.current === null, fresh.end === null];
    DB.sessions = DB.sessions.filter(s => !s.id.startsWith('orph-')); saveStore();
    return [res.every(Boolean), bits(res)];
  });

  // ── 판 확인 (1.0.1): 새 판(서버 app.js 의 판 번호가 다름)이면 막고, 지문만 다르면 막지 않고 회기에 남김
  await tryOk('통과 기록과 맞대기: 전체 해시가 기록에 있음 → pass · index.html 만 다름 → pass-code · 코드 파일이 다름 → not-checked(다른 파일) · 기록 없음 → not-checked', () => {
    const files = { ...BUILD_LOAD.files }, rec = { last: { ok: true, files: { ...files }, at: 'x', appVersion: APP_VERSION }, history: [{ buildSha256: H.expectBuild, at: 'x', appVersion: APP_VERSION }] };
    const a = verifyBuild(rec, H.expectBuild, files), b = verifyBuild(rec, 'other', { ...files, 'index.html': 'zz' }), c = verifyBuild(rec, 'other', { ...files, 'js/stim.js': 'zz' });
    const d = verifyBuild({ history: [] }, 'other', files), e = verifyBuild({ ...rec, last: { ...rec.last, ok: false } }, 'other', { ...files, 'index.html': 'zz' });
    return [a.status === 'pass' && b.status === 'pass-code' && b.differ.join() === 'index.html' && c.status === 'not-checked' && c.differ.join() === 'js/stim.js' && d.status === 'not-checked' && e.status === 'not-checked',
      [a, b, c, d, e].map(x => x.status).join(' ')];
  });
  $('#vHome').click(); $('#goSetup').click();
  await tryOk('1.2.7 새 참가자 검사 시작 시 이전 참가자의 번호·귀·경로·선택 정보·메모·볼륨 초기화', () => [
    PRE.ear === null && PRE.path === null && $('#setupNext').disabled && $('#codeIn').value === '' && $('#infoAge').value === '' && $('#infoNote').value === '' && $('#osVol').value === '',
    `ear=${PRE.ear} path=${PRE.path} code=${$('#codeIn').value} age=${$('#infoAge').value}`]);
  $('#earPick').querySelector('[data-v="R"]').click(); $('#pathPick').querySelector('[data-v="wired"]').click(); $('#setupNext').click();
  $('#volOk').click();
  const nS = DB.sessions.length, nD = DB.decisions.length;
  H.override['js/app.js'] = H.fileBytes('js/app.js') && new TextDecoder().decode(H.fileBytes('js/app.js')).replace(/const APP_VERSION = '[^']+'/, "const APP_VERSION = '9.9.9 (시험)'");
  $('#soundNext').click(); $('#onsetSkip').click();
  await until(() => H.dialogs.some(d => d[0] === 'alert'), 10000, '새 판 경고');
  await tryOk('새 판이 나옴(서버 app.js 판 번호 9.9.9 ≠ 지금 1.0.x) → 새로 고침 안내 · 시작 안 함 · DB.decisions 에 막힘(두 판 번호 · 두 해시)', () => {
    const d = DB.decisions.at(-1);
    return [H.dialogs.filter(x => x[0] === 'alert').at(-1)[1] === STALE_MSG && DB.sessions.length === nS && S === null && DB.decisions.length === nD + 1 && d.what === 'session-start' && d.answer === 'blocked'
      && d.reason === 'new-version' && d.running === APP_VERSION && d.server === '9.9.9 (시험)' && d.pageBuild === H.expectBuild && d.fileBuild !== H.expectBuild, JSON.stringify(d)];
  });
  delete H.override['js/app.js'];
  await tryOk('브라우저 캐시에 옛 stim.js(화면이 받은 판 ≠ 서버 판, 판 번호는 같음) → 받은 판 해시가 달라짐 · 그 파일 이름이 나옴 · 받은 판은 not-checked', async () => {
    H.cached['js/stim.js'] = '// 옛 stim';
    const bl = await computeBuild('force-cache'), now = await computeBuild('no-store');
    delete H.cached['js/stim.js'];
    return [bl.ok && now.ok && bl.buildSha256 !== now.buildSha256 && now.buildSha256 === H.expectBuild && bl.version === APP_VERSION && now.version === APP_VERSION
      && bl.verified.status === 'not-checked' && bl.verified.differ.join() === 'js/stim.js' && now.verified.status === 'pass', `${bl.verified.status} ${now.verified.status}`];
  });
  // 오는 길에 화면 파일이 바뀌는 컴퓨터(예: 보안 프로그램이 페이지에 코드를 끼워 넣음 — 받을 때마다 다르게) → 막지 않고 시작 · 회기에 다른 파일 · 코드는 검산한 것 그대로(pass-code)
  {
    const html0 = new TextDecoder().decode(H.fileBytes('index.html'));
    H.cached['index.html'] = html0.replace('</body>', '<script src="https://inject.example/a.js?k=1"></script></body>');
    H.override['index.html'] = html0.replace('</body>', '<script src="https://inject.example/a.js?k=2"></script></body>');
    const keep = BUILD_LOAD; BUILD_LOAD = await computeBuild('force-cache');
    const nA = H.dialogs.filter(d => d[0] === 'alert').length;
    $('#soundNext').click(); $('#onsetSkip').click();
    await until(() => S && S.cur && S.cur.practice && awaiting, 20000, '끼워 넣은 화면 회기');
    const si = S.session;
    await tryOk('화면 파일만 오는 길에 바뀜 → 경고 없이 시작 · build.differ = [index.html] · 받은 판 · 서버 판 모두 pass-code · 판 번호 같음 · 회기 사건에 differ', () => [
      H.dialogs.filter(d => d[0] === 'alert').length === nA && si.build.differ.join() === 'index.html' && si.build.from === 'load' && si.build.verified.status === 'pass-code'
        && si.build.running.verified.status === 'pass-code' && si.build.server.verified.status === 'pass-code' && si.build.running.version === APP_VERSION && si.build.server.version === APP_VERSION
        && si.build.sha256 === BUILD_LOAD.buildSha256 && si.events.find(e => e.type === 'session-start').differ.join() === 'index.html', JSON.stringify(si.build.verified) + ' ' + JSON.stringify(si.build.differ)]);
    $('#stopBtn').click();   // 연습 그만 → 쉬는 화면
    $('#bEnd').click();      // 오늘은 여기까지
    await tryOk('그 회기 끝냄 · 받은 결과 보기에 ‘검산 통과 코드 (index.html 만 다름…)’ · ‘화면이 받은 파일 ≠ 서버 파일: index.html’', () => {
      const h = viewSessHtml(si, '시험');
      return [S === null && !!si.end && h.includes('index.html 만 다름') && h.includes('화면이 받은 파일 ≠ 서버 파일: index.html'), si.endReason];
    });
    BUILD_LOAD = keep; delete H.cached['index.html']; delete H.override['index.html'];
    $('#toHome').click(); $('#goSetup').click(); $('#earPick').querySelector('[data-v="R"]').click(); $('#pathPick').querySelector('[data-v="wired"]').click(); $('#setupNext').click(); $('#volOk').click();
  }

  // ── 중간에 끝내기 · 나가기 경고 · 출력 확인
  const oscIdBeforeS3 = keep?.node?.id;
  $('#soundNext').click(); $('#onsetSkip').click();
  await until(() => S && S.cur && S.cur.practice && awaiting, 20000, '셋째 회기 연습');
  const s3 = S.session;
  await tryOk('새 회기: 귀 · 듣는 방법 · 유지 신호 발진기 그대로(멈춤 0번), 준비 기록은 새로 · 건너뛴 온셋 기록 · build pass', () => [
    s3 !== sess && s3.ear === 'R' && s3.path === 'wired' && s3.setup.noise.length === 0 && s3.setup.demo.length === 0 && s3.build.verified.status === 'pass' && s3.build.differ.length === 0
      && keep?.node?.id === oscIdBeforeS3 && H.oscLog.filter(x => x.ev === 'start').length === 1 && H.oscLog.filter(x => x.ev === 'stop').length === 0
      && s3.onsetCheck && s3.onsetCheck.skipped === true, JSON.stringify(H.oscLog)]);
  {
    let prevented = false;
    H.wins.beforeunload.forEach(f => f({ preventDefault() { prevented = true; }, returnValue: undefined }));
    ok('검사 중 나가려 하면 브라우저가 묻게 함(beforeunload)', prevented, '');
  }
  for (let k = 0; k < 3; k++) { await until(() => awaiting && S.cur?.practice, 10000, '연습 답'); H.key(String(awaiting.tg + 1)); await until(() => !awaiting, 5000); }
  await until(() => vis('#pgBreak'), 10000, '연습 끝');
  ok('연습 3번 모두 맞음 → 도움말 없음', $('#bBody').textContent.includes('3번 중 3번') && !$('#bBody').textContent.includes('볼륨을 조금 키우거나'), $('#bBody').textContent.slice(0, 80));
  await wait(60);
  await tryOk('출력 확인: 가짜 분석기 18 Hz −45.00 dBFS → ‘나오는 중’(ok) · db18 일치', () => [
    KEEPMON.polls > 0 && KEEPMON.ok > 0 && !KEEPMON.open && KEEPMON.last && KEEPMON.last.cls === 'ok' && Math.abs(KEEPMON.last.db18 - (-45)) < 0.05, JSON.stringify(KEEPMON.last)]);
  await H.ctxs[0].suspend();
  await wait(60);
  await tryOk('오디오가 멈춤(suspended) → 끊김 열림 · 회기 사건 keep-gap-start(까닭)', () => [!!KEEPMON.open && s3.events.some(e => e.type === 'keep-gap-start' && /suspended/.test(e.why)), JSON.stringify(KEEPMON.open)]);
  await H.ctxs[0].resume();
  await wait(60);
  await tryOk('다시 돎 → 끊김 닫힘 · keep-gap-end(길이)', () => [!KEEPMON.open && s3.events.some(e => e.type === 'keep-gap-end' && typeof e.durS === 'number'), '']);
  H.forceSilent = true;
  await wait(60);
  await tryOk('몰래 끊김(앱은 켜진 줄 아는데 출력에 18 Hz 없음) → 끊김 열림 · keep-gap-start', () => [
    !!KEEPMON.open && /18 Hz 없음/.test(KEEPMON.open.why || '') && s3.events.some(e => e.type === 'keep-gap-start' && /18 Hz 없음/.test(e.why || '')), JSON.stringify(KEEPMON.open)]);
  H.forceSilent = false;
  await wait(60);
  await tryOk('18 Hz 다시 나옴 → 몰래 끊김 닫힘 · keep-gap-end(길이)', () => [
    !KEEPMON.open && s3.events.filter(e => e.type === 'keep-gap-end' && typeof e.durS === 'number').length === 2, String(s3.events.filter(e => e.type === 'keep-gap-end').length)]);
  $('#bEnd').click();
  await tryOk('‘여기까지만 하기’ → 중간에 끝냄(남은 측정 5개) · 회기 닫음 · 결과 화면(측정 없음) · 끝 질문 보임 · 출력 확인 요약(끊김 2건)', () => [S === null && s3.endReason === '중간에 끝냄 (남은 측정 5개)' && !!s3.end && vis('#pgEnd') && $('#endTable').textContent.includes('완료된 측정이 없습니다') && !!$('#focusPick') && s3.keepMonitor && s3.keepMonitor.gaps.length === 2, `${s3.endReason} gaps=${s3.keepMonitor?.gaps?.length}`]);
  {
    let prevented = false;
    H.wins.beforeunload.forEach(f => f({ preventDefault() { prevented = true; } }));
    ok('끝난 뒤에는 나가기 경고 없음', !prevented, '');
  }
  $('#toHome').click();
  $('#homeSaveAll').click();
  const all = await H.takeDownloads();
  await tryOk('모두 파일로 저장: 측정 · 사건이 있는 회기 모두(3개) · 이름 TMTF_all_', async () => { const o = JSON.parse(await all[0].blob.text()); return [all.length === 1 && /^TMTF_all_/.test(all[0].name) && o.sessions.length === 3 && o.format === 'ci-tmtf-public', `${o.sessions.length}`]; });

  // ── 저장소를 못 읽을 때 · 못 쓸 때
  await tryOk('저장된 기록을 못 읽으면 지우지 않고 다른 이름으로 옮김 · 경고', () => {
    const keep = H.store.get('ciTmtf.v1'), saveDB = DB;
    H.store.set('ciTmtf.v1', '{깨진 기록');
    loadStore();
    const moved = STORE.moved && H.store.get(STORE.moved) === '{깨진 기록';
    renderEnvWarn();
    const warned = !$('#envWarn').hidden && $('#envWarn').textContent.includes('따로 보관');
    H.store.set('ciTmtf.v1', keep); H.store.delete(STORE.moved); DB = saveDB; STORE.moved = null; STORE.error = null; renderEnvWarn();
    return [moved && warned, String(STORE.moved)];
  });
  await tryOk('저장이 안 되면(용량 · 사생활 모드) 경고 · 화면은 계속', () => {
    const real = localStorage.setItem;
    localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
    const r = saveStore(); renderEnvWarn();
    const warned = !$('#envWarn').hidden && $('#envWarn').textContent.includes('저장하지 못합니다');
    localStorage.setItem = real; const r2 = saveStore(); renderEnvWarn();
    return [r === false && warned && r2 === true && $('#envWarn').hidden, `${r} ${warned} ${r2}`];
  });
  await tryOk('보안 · HTTPS: index.html 엄격한 CSP · no-referrer · 원격 HTTP→HTTPS 전환 · 로컬/file 예외 · 비보안 HTTP 경고', () => {
    const html0 = new TextDecoder().decode(H.fileBytes('index.html'));
    const cspOk = html0.includes('http-equiv="Content-Security-Policy"') && html0.includes("default-src 'none'")
      && html0.includes("script-src 'self'") && html0.includes("style-src 'self'") && html0.includes("connect-src 'self'")
      && html0.includes("font-src 'none'") && html0.includes("media-src 'none'") && html0.includes("frame-src 'none'") && html0.includes("worker-src 'none'")
      && html0.includes('spellcheck="false"') && !html0.includes('unsafe-inline') && html0.includes('name="referrer" content="no-referrer"');
    const rRemote = httpsRedirectUrl({ protocol: 'http:', host: 'mi-rae-lab.github.io', pathname: '/ci-tmtf-test/', search: '?id=P02', hash: '' });
    const rLocal = httpsRedirectUrl({ protocol: 'http:', host: 'localhost:8820', pathname: '/', search: '', hash: '' });
    const rLoop = httpsRedirectUrl({ protocol: 'http:', host: '127.0.0.1:8820', pathname: '/', search: '', hash: '' });
    const rHttps = httpsRedirectUrl({ protocol: 'https:', host: 'mi-rae-lab.github.io', pathname: '/', search: '', hash: '' });
    const rFile = httpsRedirectUrl({ protocol: 'file:', host: '', pathname: '/index.html', search: '', hash: '' });
    const keepProto = location.protocol;
    location.protocol = 'http:'; renderEnvWarn();
    const warned = !$('#envWarn').hidden && $('#envWarn').textContent.includes('HTTPS');
    location.protocol = keepProto; renderEnvWarn();
    return [cspOk && rRemote === 'https://mi-rae-lab.github.io/ci-tmtf-test/?id=P02' && rLocal === null && rLoop === null && rHttps === null && rFile === null && warned && $('#envWarn').hidden && sess.env.secure === true,
      `${cspOk} ${rRemote} ${warned} ${sess.env.secure}`];
  });
  await tryOk('nextFrame(): 먼저 실행된 쪽이 남은 setTimeout · requestAnimationFrame 을 즉시 해제하고 1회만 호출', () => {
    const oRaf = requestAnimationFrame, oCaf = cancelAnimationFrame, oSt = setTimeout, oCt = clearTimeout;
    try {
      let rafCb = null, stCb = null, clearedT = null, canceledR = null, calls = 0;
      globalThis.requestAnimationFrame = cb => { rafCb = cb; return 101; };
      globalThis.cancelAnimationFrame = id => { canceledR = id; };
      globalThis.setTimeout = cb => { stCb = cb; return 202; };
      globalThis.clearTimeout = id => { clearedT = id; };
      nextFrame(() => { calls++; });
      rafCb(); stCb();
      const okRaf = calls === 1 && clearedT === 202;
      rafCb = stCb = clearedT = canceledR = null; calls = 0;
      nextFrame(() => { calls++; });
      stCb(); rafCb();
      const okSt = calls === 1 && canceledR === 101;
      return [okRaf && okSt, `raf:${okRaf} st:${okSt}`];
    } finally {
      globalThis.requestAnimationFrame = oRaf; globalThis.cancelAnimationFrame = oCaf;
      globalThis.setTimeout = oSt; globalThis.clearTimeout = oCt;
    }
  });
  await tryOk('computeBuild(): 앱 파일 6개 + 검증_통과.json 7개 요청을 병렬 실행 · 해시 일치', async () => {
    const oFetch = globalThis.fetch;
    let inFlight = 0, maxInFlight = 0;
    try {
      globalThis.fetch = async (u, opt) => {
        inFlight++;
        if (inFlight > maxInFlight) maxInFlight = inFlight;
        await wait(5);
        try { return await oFetch(u, opt); } finally { inFlight--; }
      };
      const b = await computeBuild('no-store');
      return [maxInFlight === APP_FILES.length + 1 && b.ok && b.buildSha256 === H.expectBuild && b.verified.status === 'pass', `maxInFlight=${maxInFlight} ok=${b.ok}`];
    } finally {
      globalThis.fetch = oFetch;
    }
  });
  await tryOk('1.1.0 인앱 브라우저 감지 · 블루투스 소리 맞추기 안내 · 접근성(aria-pressed · progressbar)', () => {
    const inK = inAppBrowser('Mozilla/5.0 KAKAOTALK 10.0') === '카카오톡';
    const inN = inAppBrowser('Mozilla/5.0 NAVER(inapp)') === '네이버 앱';
    const inC = inAppBrowser('Mozilla/5.0 Chrome/120.0 Safari/537.36') === null;
    $('#earPick').querySelector('[data-v="R"]').click();
    const earPressed = $$('#earPick .choice').filter(b => b.getAttribute('aria-pressed') === 'true').length === 1;
    resetSetupForm();
    const pw = $('#progWrap');
    const progOk = pw && pw.getAttribute('role') === 'progressbar' && pw.getAttribute('aria-valuenow') !== null;
    const prevPath = PRE.path;
    PRE.path = 'bt'; syncSetup();
    const btShown = !$('#btNote').hidden && !$('#soundBtNote').hidden;
    PRE.path = prevPath; syncSetup();
    const btHidden = $('#btNote').hidden && $('#soundBtNote').hidden;
    return [inK && inN && inC && earPressed && progOk && btShown && btHidden, `${inK} ${inN} ${inC} ${earPressed} ${progOk} ${btShown} ${btHidden}`];
  });
  await tryOk('1.1.0 모바일 보고서 공유(#shareReport) · 저장 용량 경고 · 지연 저장(scheduleSave/flushSave)', async () => {
    const oCan = navigator.canShare, oSh = navigator.share;
    let sharedName = null;
    try {
      Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true, writable: true });
      Object.defineProperty(navigator, 'share', { value: async o => { sharedName = o.files?.[0]?.name || null; }, configurable: true, writable: true });
      SHOWN = sess;
      const canHtml = canShareFile('TMTF_report.html', 'text/html');
      await $('#shareReport').onclick();
      const logged = sess.exports.some(x => x.how === 'share-report' && x.name === sharedName);
      // 용량 경고 확인
      const keepB = STORE.bytes;
      STORE.bytes = STORE_WARN_BYTES + 100; renderEnvWarn();
      const sizeWarned = !$('#envWarn').hidden && $('#envWarn').textContent.includes('모두 파일로 저장');
      STORE.bytes = keepB; renderEnvWarn();
      // 지연 저장 → flushSave 즉시 반영
      scheduleSave(60000);
      const dirtyBefore = saveDirty;
      flushSave();
      const dirtyAfter = saveDirty;
      return [canHtml && /^TMTF_report_P02_R_.*\.html$/.test(sharedName || '') && logged && sizeWarned && $('#envWarn').hidden && dirtyBefore && !dirtyAfter, `${sharedName} ${logged} ${sizeWarned}`];
    } finally {
      Object.defineProperty(navigator, 'canShare', { value: oCan, configurable: true, writable: true });
      Object.defineProperty(navigator, 'share', { value: oSh, configurable: true, writable: true });
    }
  });
  await tryOk('1.1.0 유휴 시 KEEPMON 절전(S 없을 때 32,768샘플 오디오 복사 건너뜀)', () => {
    let copied = 0;
    const oGet = mon.getFloatTimeDomainData;
    mon.getFloatTimeDomainData = buf => { copied++; return oGet.call(mon, buf); };
    try {
      const m = monitor(false);
      keepMonTick();   // S === null 이므로 needRms = false
      return [S === null && m !== null && copied === 0, `copied=${copied}`];
    } finally {
      mon.getFloatTimeDomainData = oGet;
    }
  });
  await tryOk('1.1.0 받은 결과 보기: 증분 렌더링 + 같은 참가 번호 묶어 비교(#vCompare · 차이 dB · 겹침 SVG · 재지 못함 제외)', () => {
    const prevCount = $('#vList').children.length;
    const firstChildBefore = $('#vList').children[0];
    const s2 = {
      id: 'p02-second', code: 'P02', ear: 'L', path: 'wired', start: '2026-11-25T10:00:00+09:00', end: '2026-11-25T10:20:00+09:00',
      app: APP_VERSION, keepalive: { mode: 'tone18all', userOff: false }, P: snapP(PR), events: [],
      runs: [
        { order: 1, round: 1, fm: 10, thr: -20, sd: 1.2, ceiling: false, n0: 2, k0: 2, nTrials: 30, nDunno: 0, trials: [{ d: 0, tg: 0, a: 0, c: 1, u: 0 }] },
        { order: 2, round: 1, fm: 200, thr: 0, sd: null, ceiling: true, n0: 4, k0: 0, nTrials: 4, nDunno: 0, trials: [{ d: 0, tg: 0, a: 1, c: 0, u: 0 }] },
      ],
    };
    VIEW.sessions.push({ s: s2, src: 'P02_L.json' });
    renderViewer();
    const incOk = $('#vList').children.length === prevCount + 1 && $('#vList').children[0] === firstChildBefore;
    const cmp = $('#vCompare').innerHTML;
    const cmpOk = cmp.includes('참가 번호 P02 묶어 비교 (2개 회기') && cmp.includes('차이 (#2−#1)') && cmp.includes('<svg class="chart"') && cmp.includes('재지 못함');
    VIEW.sessions.pop(); renderViewer(true);
    return [incOk && cmpOk && $('#vCompare').innerHTML === '', `inc=${incOk} cmp=${cmpOk}`];
  });
  await tryOk('1.2.0 tone18 방식: 버퍼 시작 순간 멈춤 · 끝 순간 재개(틈 0) · 수동 끄기/켜기(#keepToggle) · 3초 대기', () => {
    setKeepMode('tone18');
    const n0 = H.oscLog.length, t0 = ctx.currentTime + 0.1, buf = new Float32Array(24000);   // 0.5 s
    play(buf, t0);
    const evs = H.oscLog.slice(n0), sp = evs.find(e => e.ev === 'stop'), st = evs.find(e => e.ev === 'start');
    const gap0 = !!sp && !!st && Math.abs(sp.t - t0) < 1e-9 && Math.abs(st.t - (t0 + 0.5)) < 1e-9;
    setKeepMode('tone18all');
    // 사용자 수동 끄기 → 발진기 멈춤, 다시 켜기 → 발진기 재개 + 3초 대기 설정
    $('#keepToggle').click();
    const offOk = keepUserOff === true && keep === null && $('#keepToggle').getAttribute('aria-pressed') === 'false';
    $('#keepToggle').click();
    const onOk = keepUserOff === false && !!keep && keepWarmupRemainMs() > 0 && $('#keepToggle').getAttribute('aria-pressed') === 'true';
    return [gap0 && offOk && onOk, `gap0=${gap0} off=${offOk} on=${onOk}`];
  });
  await tryOk('1.2.0 네 번 소리 자극(onsetBeep · fourBeeps) 표본/RMS(−24 dBFS) 및 §4-4 판정(정상 · 가끔 누락 · 온셋 잘림 의심)', () => {
    const b = onsetBeep(48000), fb = fourBeeps(48000);
    const bRms = 20 * Math.log10(Stim.rms(b));
    const sigOk = b.length === 5760 && fb.length === 49440 && Math.abs(bRms - (-24)) < 0.01;
    const sOk = summarizeOnset([{ silenceBeforeMs: 3000, resp: 4, first: 'no' }, { silenceBeforeMs: 3000, resp: 4, first: 'unsure' }]);
    const sOcc = summarizeOnset([
      { silenceBeforeMs: 3000, resp: 4, first: 'no' }, { silenceBeforeMs: 3000, resp: 4, first: 'no' },
      { silenceBeforeMs: 3000, resp: 4, first: 'no' }, { silenceBeforeMs: 3000, resp: 3, first: 'no' },
    ]);
    const sCutMiss = summarizeOnset([{ silenceBeforeMs: 3000, resp: 3, first: 'no' }, { silenceBeforeMs: 3000, resp: 4, first: 'no' }]);
    const sCutWeak = summarizeOnset([{ silenceBeforeMs: 3000, resp: 4, first: 'yes' }, { silenceBeforeMs: 3000, resp: 4, first: 'no' }]);
    return [sigOk && sOk.verdict === '정상' && sOk.byGap[0].firstWeak === 0 && sOcc.verdict === '가끔 누락' && sOcc.byGap[0].miss === 0.25
      && sCutMiss.verdict === '온셋 잘림 의심' && sCutMiss.byGap[0].miss === 0.5 && sCutWeak.verdict === '온셋 잘림 의심' && sCutWeak.byGap[0].firstWeak === 0.5,
      `rms=${bRms.toFixed(2)} ${sOk.verdict}/${sOcc.verdict}/${sCutMiss.verdict}/${sCutWeak.verdict}`];
  });
  await tryOk('1.2.0 formatVersion 1 옛 파일 하위 호환 · 유지 신호 방식이 다른 회기는 비교에서 분리', async () => {
    const v1Sess = {
      id: 'p02-v1-legacy', code: 'P02', ear: 'R', path: 'wired', start: '2026-11-20T10:00:00+09:00', end: '2026-11-20T10:20:00+09:00',
      app: '1.1.3 (2026-11-24)', P: snapP(PR), events: [],
      runs: [{ order: 1, round: 1, fm: 10, thr: -16, sd: 1.1, ceiling: false, n0: 2, k0: 2, nTrials: 20, nDunno: 0, trials: [{ d: 0, tg: 0, a: 0, c: 1, u: 0 }] }],
    };
    const v1File = new File([JSON.stringify({ format: FORMAT, formatVersion: 1, app: '1.1.3', procKey: PROC_KEY, sessions: [v1Sess] })], 'legacy_v1.json');
    $('#vFiles').files = [v1File];
    $('#vFiles').dispatchEvent({ type: 'change', target: $('#vFiles') });
    await until(() => VIEW.sessions.some(x => x.s.id === 'p02-v1-legacy'), 10000, 'v1 파일 열기');
    const cmp = $('#vCompare').innerHTML;
    const sepOk = cmp.includes('유지 신호 방식이 다른 회기가 있어 합치지 않고 분리했습니다') && !cmp.includes('묶어 비교');
    const repH = specialistReportHtml([v1Sess], ['legacy_v1.json']);
    const repOk = repH.includes('유지 신호 없음 (v1 기록)') && repH.includes('기록 없음 (v1 파일)');
    VIEW.sessions = VIEW.sessions.filter(x => x.s.id !== 'p02-v1-legacy'); renderViewer(true);
    return [sepOk && repOk, `sep=${sepOk} rep=${repOk}`];
  });
  await tryOk('1.1.0 한/영 언어 전환(applyLang · #langToggle): 영어 UI 전환 및 한국어 원복', () => {
    $('#langToggle').click();
    const enOk = LANG === 'en' && document.documentElement.getAttribute('lang') === 'en' && $('#appTitle').textContent === 'TMTF Test' && document.title === 'TMTF Test — Cochlear Implant Temporal Modulation Detection'
      && $('#goSetup').textContent === 'Start' && $('#tGuide').textContent.includes('tiny flutter')
      && $('#hLearn').textContent.includes('What you can learn') && $('#hKeep').textContent === 'Keep sound steady'
      && $('#onFirstQ').textContent.includes('first beep') && $('#legalDisclaimer').textContent.includes('For research and educational purposes only')
      && $('#dunno').textContent === 'Not sure' && $('#langToggle').textContent === 'KO' && $('#fmInfo').textContent.includes('Flutter rates');
    $('#langToggle').click();
    const koOk = LANG === 'ko' && document.documentElement.getAttribute('lang') === 'ko' && $('#appTitle').textContent === 'TMTF 검사' && document.title === 'TMTF 검사 — 인공와우 사용자용 시간 변조 탐지 검사'
      && $('header h1').textContent.trim() === 'TMTF 검사' && !!$('#pgTest').querySelector('#tGuide')
      && $('#goSetup').textContent === '시작하기' && $('#tGuide').textContent === '처음에는 쉽지만, 맞힐수록 떨림이 미세해져 점점 어려워집니다. 떨림이 아주 조금이라도 느껴지면 그 번호를 선택해 주세요. 세 소리가 완전히 똑같이 들릴 때만 ‘모르겠음’을 눌러 주세요.'
      && $('#hLearn').textContent === '이 검사를 하면 알 수 있는 것' && $('#hKeep').textContent === '소리 끊김 방지'
      && $('#onFirstQ').textContent.includes('첫 소리') && $('#legalDisclaimer').textContent.includes('연구 및 교육 목적')
      && $('#dunno').textContent === '모르겠음' && $('#langToggle').textContent === 'EN' && $('#fmInfo').textContent.includes('검사할 떨림 속도')
      && $('#snd1').textContent.includes('소리 재생') && $('#goViewer').textContent === '결과 파일 열기 (청능사·연구자용)';
    return [enOk && koOk, `en=${enOk} ko=${koOk}`];
  });
  await tryOk('1.2.6 영어(EN) 전체 번역 검증: 전 화면·aria-label·결과 보기·전문가 보고서·CSV에서 한글 잔여 0건', async () => {
    $('#langToggle').click();
    showEnd(sess, { offers: false, noScroll: true, noFocus: true });
    renderViewer(true);
    const koRe = /[가-힣]/;
    const pages = ['#pgHome', '#pgSetup', '#pgSound', '#pgEnd', '#pgViewer'];
    const badPages = pages.filter(sel => koRe.test($(sel).textContent));
    const ariaBad = $$('[aria-label]').map(el => el.getAttribute('aria-label')).filter(v => v && koRe.test(v));
    const repEn = specialistReportHtml([sess]);
    const repClean = repEn.replaceAll(PROC_KEY, 'PROC_KEY_CANON');
    const repOk = repEn.includes('<html lang="en">') && repEn.includes('TMTF Test Specialist Reference Report')
      && repEn.includes('Reference Notice — Not a Diagnostic Tool') && repEn.includes('Modulation frequency (Hz, log scale)')
      && !koRe.test(repClean);
    $('#vCsvRuns').click(); $('#vCsvTrials').click();
    const enCsvs = await H.takeDownloads();
    const rTxt = enCsvs[0] ? (await enCsvs[0].blob.text()).replaceAll(PROC_KEY, 'PROC_KEY_CANON') : '';
    const tTxt = enCsvs[1] ? await enCsvs[1].blob.text() : '';
    const csvOk = rTxt.replace(/^\uFEFF/, '').startsWith('file,code,ear,path,') && tTxt.replace(/^\uFEFF/, '').startsWith('file,code,ear,session,run_order,')
      && !koRe.test(rTxt) && !koRe.test(tTxt);
    const helpersOk = !koRe.test(endReasonText('계획한 측정 모두 마침')) && !koRe.test(endReasonText('중간에 끝냄 (남은 측정 3개)'))
      && !koRe.test(onsetVerdictText('온셋 잘림 의심')) && !koRe.test(gapWhyText('출력에 18 Hz 없음')) && !koRe.test(verifiedText('pass-code'));
    $('#toHome').click();
    $('#langToggle').click();
    return [!badPages.length && !ariaBad.length && repOk && csvOk && helpersOk,
      `badPages=${badPages.join(',')} ariaBad=${ariaBad.join(',')} rep=${repOk} csv=${csvOk} hlp=${helpersOk}` + (!repOk ? ' repKo=' + (repClean.match(/[가-힣][^<\n]{0,30}/g) || []).slice(0, 5).join('|') : '')];
  });
  ok('경고창은 새 판 하나뿐(지문만 다른 것은 경고 없음) · 확인 창은 멈춤 둘뿐', H.dialogs.filter(d => d[0] === 'alert').length === 1 && H.dialogs.filter(d => d[0] === 'confirm').length === 2, JSON.stringify(H.dialogs).slice(0, 200));
  await tryOk('1.2.7 보안(XSS 차단): 악성 JSON 주입 시 자료형 검증·이스케이프·보고서 script-src none·인라인 핸들러 0건', () => {
    const xss = '<script>alert(1)<\/script><img src=x onerror=alert(2)>';
    const evil = {
      id: 'evil-1', format: FORMAT, formatVersion: 2, app: xss, start: '2026-11-24T00:00:00Z', end: '2026-11-24T00:10:00Z',
      code: xss, ear: 'R', path: 'wired', osVolume: xss, procKey: xss,
      info: { age: xss, note: xss }, env: { origin: xss, platform: xss, audio: { sampleRate: xss } },
      P: { nAFC: xss, dur: xss, isi: xss, rampMs: xss, band: { type: xss }, ceiling: xss, rove: xss, startDb: xss, bigUntil: xss, big: xss, small: xss, totalRev: xss, avgLast: xss },
      runs: [{ order: xss, round: xss, fm: 10, thr: -12, sd: 1.1, ceiling: false, n0: xss, k0: xss, reversals: [xss, -10, -12], revAt: [0], nTrials: 1, nDunno: 0,
        trials: [{ d: 0, tg: 0, a: 0, c: 1, u: 0, inp: xss, rt: xss, rms: [-26], pk: [-10] }] }],
      events: [{ type: 'keep-gap-start', from: xss, why: xss }],
    };
    const clean = sanitizeSession(evil, true);
    const vh = viewSessHtml(clean, xss);
    const rh = specialistReportHtml([clean], [xss]);
    const noScript = !/<script/i.test(rh) && !/<script/i.test(vh) && !/<img\b/i.test(rh) && !/<img\b/i.test(vh) && !/<[a-z][^>]*\bon[a-z]+\s*=/i.test(rh) && !/<[a-z][^>]*\bon[a-z]+\s*=/i.test(vh);
    const cspStrict = rh.includes("script-src 'none'") && !rh.includes("script-src 'unsafe-inline'");
    const typed = clean.P.nAFC === 3 && clean.P.dur === 0.5 && clean.osVolume === null && clean.runs[0].reversals.length === 2;
    return [noScript && cspStrict && typed, `noScript=${noScript} csp=${cspStrict} typed=${typed}`];
  });
  await tryOk('1.2.7 160시행 전량 정답(−40 dB 바닥·반전 0회) 구분: 오답 안내·0 dB ▽ 미표시 · 상한/반전 부족 사유 구분', () => {
    const T = new Track(PR);
    for (let i = 0; i < 160; i++) T.respond(true);
    const res = T.result();
    const floorRun = { order: 1, round: 1, fm: 10, thr: res.thr, sd: res.sd, ceiling: res.ceiling, incomplete: res.incomplete, n0: res.n0, k0: res.k0, atChance: res.atChance, reversals: T.reversals, revAt: T.revAt, nTrials: T.trials.length, nDunno: 0, trials: T.trials };
    const ceilRun = { order: 2, round: 1, fm: 200, thr: 0, sd: null, ceiling: true, incomplete: false, n0: 4, k0: 0, atChance: false, reversals: [], revAt: [], nTrials: 4, nDunno: 0, trials: [] };
    const maxRun = { order: 3, round: 1, fm: 50, thr: null, sd: null, ceiling: false, incomplete: true, n0: 2, k0: 2, atChance: false, reversals: [-4], revAt: [3], nTrials: 160, nDunno: 0, trials: [{ d: -4, c: 1 }] };
    const fewRun = { order: 4, round: 1, fm: 100, thr: null, sd: null, ceiling: false, incomplete: false, n0: 2, k0: 2, atChance: false, reversals: [-4], revAt: [3], nTrials: 10, nDunno: 0, trials: [{ d: -4, c: 1 }] };
    const vF = verdict(floorRun), vC = verdict(ceilRun), vM = verdict(maxRun), vW = verdict(fewRun);
    const mockSess = { id: 'floor-s', start: iso(), ear: 'R', path: 'wired', P: snapP(PR), events: [], runs: [floorRun] };
    showEnd(mockSess, { offers: false, noScroll: true, noFocus: true });
    const notesTxt = $('#endNotes').textContent;
    const chHtml = chartHtml(mockSess);
    const repH = specialistReportHtml([mockSess]);
    const okAll = res.thr === null && !res.ceiling && vF.kind === 'floor' && !vF.sub.includes('틀렸') && vF.sub.includes('가장 약한 떨림')
      && vC.kind === 'ceil' && vM.kind === 'max' && vW.kind === 'few'
      && !notesTxt.includes('가장 큰 떨림에서도 자주 틀려') && notesTxt.includes('최대 횟수')
      && !chHtml.includes('class="ceil"') && repH.includes('최저 깊이(−40 dB) 반전 부족') && !repH.includes('0 dB 4오답 중단</td>');
    $('#toHome').click();
    return [okAll, `v=${vF.kind}/${vC.kind}/${vM.kind}/${vW.kind} ceilSvg=${chHtml.includes('class="ceil"')}`];
  });
  await tryOk('1.2.7 오디오 정지 시 미청취 채점 차단(소리 점검 · 본 검사) 및 빠른 탭 왕복 시 단일 재생 예약 유지', async () => {
    const c0 = H.ctxs[0], origResume = c0.resume.bind(c0);
    // 1) 소리 점검 중 오디오 재개 실패 → 응답 버튼 잠금 유지 · 다시 듣기만 활성
    await c0.suspend();
    c0.resume = async () => {};
    openOnsetCheck();
    await until(() => ONSET.phase === 'suspended', 10000, '온셋 오디오 정지');
    const onsetBlocked = $$('#onCountPick .choice').every(b => b.disabled) && !$('#onReplay').disabled;
    c0.resume = origResume;
    $('#onReplay').click();
    await until(() => ONSET.phase === 'awaiting', 10000, '온셋 재개 복구');
    const onsetRecovered = !$$('#onCountPick .choice')[0].disabled;
    cancelOnsetTimer(); ONSET.running = false; ONSET.phase = 'idle';
    // 2) 본 검사: 빠른 탭 왕복(hidden→visible→hidden→visible) 시 trial-void 1건만 · 겹침 없이 3버퍼만 재생 · 재개 복구
    $('#goSetup').click(); $('#earPick').querySelector('[data-v="L"]').click(); $('#pathPick').querySelector('[data-v="wired"]').click(); $('#setupNext').click(); $('#volOk').click();
    $('#soundNext').click(); $('#onsetSkip').click();
    await until(() => S && S.cur && S.cur.practice && S.cur.phase === 'playing', 15000, '탭 왕복 시험 재생');
    const s4 = S.session, voidBefore = s4.events.filter(e => e.type === 'trial-void').length;
    H.visibility(true); await wait(2);
    H.visibility(false); await wait(2);   // 700ms(가상) 지나기 전 다시 숨김
    H.visibility(true); await wait(2);
    const bufBefore = starts().length;
    H.visibility(false);
    await until(() => awaiting && S?.cur?.practice, 15000, '단일 재재생 완료');
    const voidAdded = s4.events.filter(e => e.type === 'trial-void').length - voidBefore;
    const bufAdded = starts().length - bufBefore;
    // 3) 본 검사 중 오디오 재개 실패 → 응답 잠금 · #resumeAudioWrap 표시 · 클릭으로 복구
    await c0.suspend();
    c0.resume = async () => {};
    H.key(String(awaiting.tg + 1));
    await until(() => S?.cur?.phase === 'suspended', 15000, '본 검사 오디오 정지');
    const testBlocked = $$('.iv').every(b => b.disabled) && $('#dunno').disabled && !$('#resumeAudioWrap').hidden;
    c0.resume = origResume;
    $('#resumeAudioBtn').click();
    await until(() => awaiting && S?.cur?.practice, 15000, '본 검사 재개 복구');
    const testRecovered = $('#resumeAudioWrap').hidden && !$('#dunno').disabled;
    $('#stopBtn').click(); $('#bEnd').click(); $('#toHome').click();
    return [onsetBlocked && onsetRecovered && voidAdded === 1 && bufAdded === 3 && testBlocked && testRecovered,
      `on=${onsetBlocked}/${onsetRecovered} void=${voidAdded} bufs=${bufAdded} tst=${testBlocked}/${testRecovered}`];
  });
  await tryOk('1.2.3+1.2.7 개인정보 · 삭제 동기화: # 해시 링크 · PII 경고 · 삭제 시 뷰어/결과 동시 초기화 · 타 탭 삭제 기록 부활 차단', () => {
    const pHash = parseLinkParams('#id=P99&hz=10,100&lang=en', '?id=P02');
    const hashOk = pHash.get('id') === 'P99' && pHash.get('hz') === '10,100' && pHash.get('lang') === 'en';
    const noQueryFetch = !assetUrl('index.html', 'force-cache').includes('?');
    $('#infoNote').value = '연락처 010-1234-5678'; $('#infoNote').dispatchEvent({ type: 'input' });
    const piiWarnOn = !$('#notePrivWarn').hidden && hasPiiLike('test@example.com') && hasPiiLike('900101-1234567');
    $('#infoNote').value = '조용한 방'; $('#infoNote').dispatchEvent({ type: 'input' });
    const piiWarnOff = $('#notePrivWarn').hidden;
    // 뷰어에 이 기기 기록 로드 + 결과 화면 표시 상태에서 삭제 → 뷰어/결과 모두 초기화
    $('#goViewer').click(); $('#vLocal').click();
    const loadedBefore = VIEW.sessions.length > 0;
    $('#vHome').click();
    showEnd(sess, { offers: false, noScroll: true, noFocus: true });
    showPage('pgHome', { noScroll: true, noFocus: true });
    H.confirmAnswer = true;
    $('#homeClearAll').click();
    const cleared = !H.store.has('ciTmtf.v1') && DB.sessions.length === 0 && $('#homeSaved').hidden && VIEW.sessions.length === 0 && $('#vList').innerHTML === '' && $('#vReport').disabled && SHOWN === null;
    // 타 탭 삭제 시뮬레이션: 다른 탭이 localStorage 를 지운 뒤 이 탭이 saveStore() 를 호출해도 오래된 기록이 부활하지 않음
    DB.sessions.push({ id: 'tab-ghost', start: iso(), end: iso(), runs: [{ fm: 10, thr: -10, trials: [] }], events: [] });
    saveStore();
    const syncedOk = H.store.has('ciTmtf.v1') && STORE.syncedRev !== null;
    H.store.delete('ciTmtf.v1');   // 다른 탭이 삭제
    saveStore();                    // 이 탭이 오래된 DB 를 저장 시도
    const noResurrect = !H.store.has('ciTmtf.v1') && DB.sessions.length === 0;
    // storage 이벤트 동기화 확인
    DB.sessions.push({ id: 'tab-ghost-2', start: iso(), end: iso(), runs: [{ fm: 10, thr: -10, trials: [] }], events: [] });
    saveStore(); $('#goViewer').click(); $('#vLocal').click();
    handleStorageEvent({ key: STORE_KEY, newValue: null });
    const storageSynced = DB.sessions.length === 0 && VIEW.sessions.length === 0 && SHOWN === null;
    return [hashOk && noQueryFetch && piiWarnOn && piiWarnOff && loadedBefore && cleared && syncedOk && noResurrect && storageSynced,
      `hash=${hashOk} clr=${cleared} noRes=${noResurrect} stSync=${storageSynced}`];
  });
  clearInterval(KEEPMON_TIMER);
})();
