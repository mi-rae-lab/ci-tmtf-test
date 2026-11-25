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
  await tryOk('처음 화면: 기본 떨림 속도 10 · 50 · 75 · 100 · 150 · 200 · 300 Hz · 약 25분 · 링크 번호(?id=P02) · 경고 없음 · 경고창 없음', () => [
    vis('#pgHome') && $('#fmInfo').textContent === '검사할 떨림 속도: 10 · 50 · 75 · 100 · 150 · 200 · 300 Hz' && $('#homeTime').textContent.startsWith('약 25분') && $('#codeIn').value === 'P02' && $('#envWarn').hidden && $('#homeSaved').hidden && !H.dialogs.length,
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
  await tryOk('회기 시작: 번호 · 귀 · 듣는 방법 · 볼륨 · 더 알려 주기(나이만, 나머지 null · 상자 열림) · 조건 이름 · 절차 · 계획(7개 무작위 한 바퀴) · build 통과 · 준비 기록 옮김 · 준비 칸 비움 · 링크', () => {
    const okPlan = sess.plan.length === 7 && sess.plan.map(x => x.fm).sort((a, b) => a - b).join() === '10,50,75,100,150,200,300' && sess.plan.every(x => x.round === 1 && !x.extra) && sess.rounds.length === 1
      && sess.rounds[0].order.join() === sess.plan.map(x => x.fm).join();
    const c = [sess.code === 'P02', sess.ear === 'R', sess.path === 'wired', sess.osVolume === 30,
      sess.info.age === '40s' && sess.info.ciYears === null && sess.info.onset === null && sess.info.maker === null && sess.info.note === null && sess.info.shown === true,
      sess.procKey === PROC_KEY && JSON.stringify(sess.P) === JSON.stringify(snapP(PR)), okPlan, sess.build.sha256 === H.expectBuild && sess.build.verified.status === 'pass', sess.buildAtLoad === H.expectBuild,
      sess.setup.noise.length === 1 && sess.setup.demo.length === 2 && !!sess.setup.volOkAt, PRE.noise.length === 0 && PRE.demo.length === 0 && !$('#volOk').checked && $('#soundNext').disabled,
      sess.events.some(e => e.type === 'session-start'), sess.practiceFm === 10 && sess.env.audio.sampleRate === 48000, sess.link.code === 'P02' && sess.link.hz === null && !sess.link.hzUsed,
      sess.fmsPlan.join() === '10,50,75,100,150,200,300', sess.end === null && sess.format === 'ci-tmtf-public' && sess.app === APP_VERSION];
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
  $$('.iv')[[1, 2, 0][awaiting.tg]].click();
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
  await tryOk('쉬는 화면에서 Enter = 다음(검사 시작) · 첫 측정 제목', () => [vis('#pgTest') && S.idx === 0 && $('#tTitle').textContent === '검사 1 / 7', $('#tTitle').textContent]);

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
      else { const i = r === 'C' ? a.tg : [[1, 2], [2, 0], [0, 1]][a.tg][ri(2)]; if (n % 3 === 0) $$('.iv')[i].click(); else H.key(String(i + 1)); }
      n++;
      await until(() => !awaiting || !S || S.cur !== C0, 5000, '답한 뒤');
    }
    return C0;
  }
  const THR1 = { 10: -18, 50: -14, 75: -11, 100: -8, 150: -4, 200: null, 300: -2 };
  // 지금 측정이 늘 찍기(200 Hz)면 그 측정만 역치 −12 dB 로 (keep: 그 측정을 결과로 남기는 자리인지 — 역치 점검에서 그만큼 바꿔 봄)
  let goodKept = null;
  const GOOD = keep => { const fm = S.plan[S.idx].fm; if (THR1[fm] === null && keep) goodKept = fm; return { ...THR1, [fm]: THR1[fm] ?? -12 }; };
  const nextFm = () => S.plan[S.idx].fm;
  // 첫 측정: 그대로
  await runTrack(THR1);
  await until(() => vis('#pgBreak'), 10000, '쉬는 화면 1');
  await tryOk('측정 끝 → 쉬는 화면(7개 중 1개 완료 · 남은 6) · 기록 1개 · 하던 측정(current) 비움', () => [$('#bBody').textContent.includes('7개 중 1개를 마쳤습니다') && sess.runs.length === 1 && sess.current === null && $('#bPractice').hidden && !$('#bSaveLater').hidden, $('#bBody').textContent]);
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
  // 1.2.12 중간 저장 후 나중에 이어서 하기 (3/7 완료 시점에서 저장 → 홈 표시 → closeOrphans 보호 → 이어서 진행)
  $('#bSaveLater').click();
  const savedPaused = vis('#pgHome') && S === null && sess.paused === true && sess.end === null && sess.resumeIdx === 3 && !$('#homeResume').hidden && $$('#homeResumeList [data-resume]').length === 1;
  sess.updated = new Date(Date.now() - 600000).toISOString();   // 10분 경과 시뮬레이션
  const orphanClosed = closeOrphans();
  const stillPaused = sess.paused === true && sess.end === null && orphanClosed === 0;
  $$('#homeResumeList [data-resume]')[0].click();
  await until(() => vis('#pgBreak') && S && S.session.id === sess.id && S.idx === 3, 15000, '중간 저장 이어하기');
  await tryOk('1.2.12 중간 저장 후 이어서 하기: #bSaveLater → #homeResume · closeOrphans 보호 · 이어서 하기(3/7 유지 · session-pause/resume 사건)', () => [
    savedPaused && stillPaused && S.idx === 3 && S.plan.length === 7 && sess.paused === false && $('#bTitle').textContent === '저장해 둔 검사 이어하기' && !$('#bPractice').hidden
      && sess.events.some(e => e.type === 'session-pause' && e.done === 3 && e.left === 4) && sess.events.some(e => e.type === 'session-resume' && e.done === 3 && e.left === 4),
    `sv=${savedPaused} keep=${stillPaused} idx=${S?.idx} ttl=${$('#bTitle').textContent}`]);
  for (let k = 0; k < 4; k++) {
    $('#bNext').click();
    await runTrack(THR1);
    await until(() => vis('#pgBreak') || vis('#pgEnd'), 10000, '쉬는 화면');
  }
  await until(() => vis('#pgEnd'), 20000, '한 바퀴 끝');
  const r1 = sess.runs.slice();
  await tryOk('한 바퀴 끝: 측정 7개(주파수마다 하나) · 회기 끝 시각 · ‘한 번 더’ 제안 · 끝 질문 · 결과 표 7줄 · 그림', () => {
    const c = [r1.length === 7, r1.map(r => r.fm).sort((a, b) => a - b).join() === '10,50,75,100,150,200,300', !!sess.end && sess.endReason === '계획한 측정 모두 마침', S && S.offer && S.offer.kind === 'again',
      !$('#againBox').hidden && $('#againText').textContent.includes('한 번 더'), !!$('#focusPick') && $$('#focusPick .choice').length === 3, $('#endTable').querySelectorAll('tr').length === 8, $('#endChart').innerHTML.includes('<svg'),
      $('#endTitle').textContent === '1차 검사 완료! 수고하셨습니다', $('#endWho').textContent.startsWith('P02 · 오른쪽 · 유선 연결')];
    return [c.every(Boolean), bits(c)];
  });
  await tryOk('측정 기록: 계단 다시 돌리기 = 저장값 · 세 소리 세기 같음 · 시행마다 씨앗 3 · 반전 시행 수 = 반전 수 · 순서 · 바퀴', () => {
    const bad = r1.filter(r => { const rp = replayCheck(r, sess.P), rm = rmsCheck(r);
      return !(rp.ok && rm.ok && r.trials.every(t => t.seeds.length === 3 && t.rms.length === 3 && [0, 1, 2].includes(t.tg)) && r.revAt.length === r.reversals.length && r.nTrials === r.trials.length && r.round === 1 && !r.extra); });
    return [!bad.length && r1.map(r => r.order).join() === '1,2,3,4,5,6,7', bad.map(r => r.fm).join()];
  });
  await tryOk('역치가 모형과 맞음: 10 · 50 · 75 · 100 Hz 는 모형 값 ± 6 dB, 200 Hz(늘 찍기)는 재지 못함 또는 우연 수준', () => {
    const g = fm => r1.find(r => r.fm === fm);
    const near = (fm, thr) => { const r = g(fm); return !r.ceiling && r.thr !== null && Math.abs(r.thr - thr) <= 6; };
    const r200 = g(200);
    return [near(10, -18) && near(50, -14) && near(75, -11) && near(100, -8) && (goodKept === 200 ? near(200, -12) : (r200.ceiling || r200.atChance)), r1.map(r => `${r.fm}:${r.thr}${r.ceiling ? '(천장)' : ''}`).join(' ') + (goodKept ? ` · ${goodKept} Hz 는 −12 dB 모형` : '')];
  });
  await tryOk('회기 사건: 측정 시작 8(다시 1) · 끝 7 · 버림 1 · 멈춤 창 2 · 가려짐/돌아옴 · plan-done', () => {
    const n = t => sess.events.filter(e => e.type === t).length;
    return [n('track-start') === 8 && n('track-end') === 7 && n('track-abandoned') === 1 && n('stop-dialog') === 2 && n('trial-void') === 1 && n('hidden') === 1 && n('visible') === 1 && n('plan-done') === 1 && n('practice-start') === 2 && n('practice-stopped') === 1,
      ['track-start', 'track-end', 'track-abandoned', 'stop-dialog', 'trial-void', 'plan-done'].map(t => t + ' ' + n(t)).join(' · ')];
  });
  $$('#focusPick .choice').find(b => b.dataset.v === 'mid').click();
  await tryOk('끝 질문 고름 → 회기 focusEnd · 보였음 표시 · 그 단추만 켜짐', () => [sess.focusEnd === 'mid' && sess.focusEndShown === true && $$('#focusPick .choice.on').length === 1, sess.focusEnd]);

  // ── 한 바퀴 더 (50 Hz 만 모형을 −4 dB 로 → 두 값이 3 dB 넘게 달라짐)
  $('#againBtn').click();
  await tryOk('‘한 번 더’ → 회기를 다시 엶(끝 지움) · 2바퀴 계획 7개(새 순서) · 쉬는 화면 ‘2번째 바퀴’ · 답 기록', () => {
    const p2 = S.plan.filter(x => x.round === 2);
    return [sess.end === null && sess.endReason === null && p2.length === 7 && sess.rounds.length === 2 && vis('#pgBreak') && $('#bTitle').textContent === '2차 검사'
      && sess.decisions.at(-1).what === 'again-offer' && sess.decisions.at(-1).answer === 'yes' && sess.events.some(e => e.type === 'round-added'), `${p2.length} ${$('#bTitle').textContent}`];
  });
  const THR2 = { ...THR1, 50: -4 };
  for (let k = 0; k < 7; k++) {
    $('#bNext').click();
    if (k === 0) await until(() => S.cur && awaiting, 10000, '2바퀴 첫 시행');
    if (k === 0) ok('2차 첫 측정 제목 ‘2차 검사 1 / 7’', $('#tTitle').textContent === '2차 검사 1 / 7', $('#tTitle').textContent);
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
    const c = [S === null, $('#endTitle').textContent === '수고하셨습니다', $('#againBox').hidden, !!$('#focusPick'), sess.runs.length === 14 + extraFms.length, !!sess.end,
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
  await tryOk('저장된 검사 → 결과 화면(끝 질문 · 제안 없음)', () => [vis('#pgEnd') && !$('#focusPick') && $('#againBox').hidden && $('#endTable').querySelectorAll('tr').length === 8, '']);
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
  await tryOk('‘여기까지만 하기’ → 중간에 끝냄(남은 측정 7개) · 회기 닫음 · 결과 화면(측정 없음) · 끝 질문 보임 · 출력 확인 요약(끊김 2건)', () => [S === null && s3.endReason === '중간에 끝냄 (남은 측정 7개)' && !!s3.end && vis('#pgEnd') && $('#endTable').textContent.includes('완료된 측정이 없습니다') && !!$('#focusPick') && s3.keepMonitor && s3.keepMonitor.gaps.length === 2, `${s3.endReason} gaps=${s3.keepMonitor?.gaps?.length}`]);
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
  await tryOk('1.2.10 더블탭 확대 방지: CSS touch-action:manipulation · 비활성/배경 연타 차단 · 활성 버튼/핀치 줌 유지', () => {
    const css = new TextDecoder().decode(H.fileBytes('style.css'));
    const idx = new TextDecoder().decode(H.fileBytes('index.html'));
    const cssOk = /\*\{[^}]*touch-action:manipulation/.test(css) && !/user-scalable\s*=\s*no|maximum-scale\s*=\s*1/i.test(idx);
    const tap = (target, nTouches = 1) => {
      const touches = Array.from({ length: nTouches }, () => ({ clientX: 50, clientY: 50 }));
      H.docFire('touchstart', { type: 'touchstart', target, touches });
      const ev = { type: 'touchend', target, touches: [], changedTouches: touches, cancelable: true, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
      H.docFire('touchend', ev);
      return ev.defaultPrevented;
    };
    const bg = $('#pgHome');
    const firstTap = tap(bg);
    const secondBgTap = tap(bg);
    const disBtn = $$('.iv')[0];
    const prevDis = disBtn.disabled;
    disBtn.disabled = true;
    const secondDisTap = tap(disBtn);
    disBtn.disabled = prevDis;
    const enBtn = $('#goSetup');
    enBtn.disabled = false;
    const enabledTap = tap(enBtn);
    const pinchTap = tap(bg, 2);
    const dbl = { type: 'dblclick', target: bg, cancelable: true, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
    H.docFire('dblclick', dbl);
    const okAll = cssOk && !firstTap && secondBgTap && secondDisTap && !enabledTap && !pinchTap && dbl.defaultPrevented;
    return [okAll, `css=${cssOk} t1=${firstTap} t2bg=${secondBgTap} t2dis=${secondDisTap} en=${enabledTap} pinch=${pinchTap} dbl=${dbl.defaultPrevented}`];
  });
  await tryOk('1.2.11 ISO 14971 청력 안전장치: −1 dBFS 리미터 · 비정상 버퍼 가드 · 1.5 s 소프트 스타트 · 80%+ 볼륨 경고 · Esc/즉시 소리 끄기', () => {
    const lim = ctx && ctx._compressors && ctx._compressors[0];
    const limOk = !!(lim && lim.threshold.value === -1 && lim.knee.value === 0 && lim.ratio.value === 20 && master.outs.includes(lim) && lim.outs.includes(ctx.destination));
    const envOk = !!(audioEnv()?.safety?.limiter && audioEnv().safety.limiterThresholdDb === -1 && audioEnv().safety.softStartS === 1.5 && audioEnv().safety.peakGuard === 0.99);
    const bad = new Float32Array([NaN, Infinity, -Infinity, 2.0, -1.0]);
    const san = sanitizeAudioBuffer(bad);
    const sanOk = san.every(x => Number.isFinite(x) && Math.abs(x) <= 0.990001) && san[0] === 0 && san[1] === 0 && san[2] === 0 && Math.abs(san[3] - 0.99) < 1e-5;
    const good = new Float32Array([0.1, -0.2, 0.05]);
    const sameRef = sanitizeAudioBuffer(good) === good;
    const rampOk = !!(ctx._gains && ctx._gains.some(g => g.ramps.length >= 2 && g.ramps[0].op === 'set' && g.ramps[0].v <= 0.01 && g.ramps[1].op === 'linear' && g.ramps[1].v === 1 && Math.abs((g.ramps[1].t - g.ramps[0].t) - 1.5) < 1e-6));
    showPage('pgSound', { noScroll: true, noFocus: true });
    $('#osVol').value = '85'; $('#osVol').dispatchEvent({ type: 'input' });
    const highOn = !$('#volHighWarn').hidden;
    $('#osVol').value = '50'; $('#osVol').dispatchEvent({ type: 'input' });
    const highOff = $('#volHighWarn').hidden;
    $('#noisePlay').click();
    const playingBeforeEsc = $('#noiseState').textContent !== '';
    H.key('Escape', $('#osVol'));
    const escStoppedSound = $('#noiseState').textContent === '';
    // 검사 중 즉시 소리 끄기(emergencyMute) 확인
    const prevS = S;
    S = { session: { events: [] }, cur: { fm: 10, practice: true, phase: 'playing', replays: 0 }, token: {} };
    showPage('pgTest', { noScroll: true, noFocus: true });
    $('#muteNowBtn').click();
    const muteOk = S.cur.phase === 'suspended' && !$('#resumeAudioWrap').hidden && $('#tNote').textContent.includes('즉시 멈췄습니다') && S.session.events.some(e => e.type === 'safety-mute');
    S = prevS;
    showPage('pgHome', { noScroll: true, noFocus: true });
    const allOk = limOk && envOk && sanOk && sameRef && rampOk && highOn && highOff && playingBeforeEsc && escStoppedSound && muteOk;
    return [allOk, `lim=${limOk} env=${envOk} san=${sanOk} ref=${sameRef} ramp=${rampOk} hi=${highOn}/${highOff} esc=${playingBeforeEsc}/${escStoppedSound} mute=${muteOk}`];
  });

  // ══════════ 1.2.14 회귀 시험 — 오류 점검 14건 (재현 조건 그대로 · 가짜 화면 · 가짜 오디오) ══════════
  // 앞 시험이 실패해도 다음 장면이 따로 돌도록 장면마다 처음 화면 · 빈 기록에서 시작함. #9 · #10 · #11 의 파이썬 쪽은 tools/verify_result_check.py · tools/cross_check.py
  const storedDb = () => JSON.parse(H.store.get(STORE_KEY) || '{"sessions":[],"decisions":[]}');
  const db18Now = () => { const m = monitor(true); return m ? m.db18 : null; };   // 가짜 분석기에 지금 실제로 나가는 18 Hz (dBFS · 없으면 null)
  const evN = (s, type) => s.events.filter(e => e.type === type).length;
  const wrongKey = () => String((awaiting.tg + 1) % 3 + 1);
  async function resetAll() {
    await wait(150);                                   // 진행 중인 시작 · 이어하기 준비가 있으면 끝나게
    if (S) { clearCurTimers(S.cur); S = null; }
    cancelOnsetTimer(); ONSET.running = false; ONSET.phase = 'idle'; ONSET.cur = null;
    awaiting = null; LAST_BREAK = null; JUST = null; SHOWN = null;
    if (document.hidden) H.visibility(false);
    H.store.clear(); DB.sessions = []; DB.decisions = []; DB.rev = null;
    STORE.syncedRev = null; STORE.bytes = 0; STORE.ok = true; STORE.error = null;
    clearViewerState(); resetSetupForm();
    PRE.noise = []; PRE.demo = []; PRE.keepEvents = []; PRE.onset = null; PRE.onsetHistory = []; PRE.warmupWaitedMs = 0;
    H.confirmAnswer = true; H.downloads.length = 0;
    renderHome(); showPage('pgHome', { noScroll: true, noFocus: true });
  }
  function toSound({ code = '', ear = 'R', path = 'wired', keepOn = true } = {}) {
    $('#goSetup').click();
    $('#codeIn').value = code;
    $('#earPick').querySelector(`[data-v="${ear}"]`).click(); $('#pathPick').querySelector(`[data-v="${path}"]`).click();
    $('#setupNext').click();
    if (!$('#volOk').checked) $('#volOk').click();
    if (keepUserOff === keepOn) $('#keepToggle').click();   // 유지 신호를 바라는 상태로
  }
  const freshKeep = () => { $('#keepToggle').click(); $('#keepToggle').click(); };   // 껐다 켬 = 유지 신호를 막 켠 상태(3초 안정 대기가 남음)
  async function answerNow(correct) { await until(() => S && S.cur && awaiting, 15000, '답 기다림'); H.key(correct ? String(awaiting.tg + 1) : wrongKey()); }
  // 새로 연 화면 흉내: 오디오 · 유지 신호 상태를 처음 값으로 (표본화율 = 그 화면의 출력 장치)
  function freshPage(sampleRate) {
    H.sampleRate = sampleRate;
    stopAll(); if (keep) { try { keep.node.stop(0); } catch { } }
    ctx = null; master = null; limiter = null; mon = null; live = []; keep = null; keepMode = 'tone18all'; keepUserOff = false;
    wins.length = 0; mlast = null; KEEPMON.keepWarmSince = null; KEEPMON.page = uid();
    renderKeepUi();
  }

  // ── 장면 1: 소리 점검 (#12 · #13)
  await resetAll();
  toSound({ code: 'P12' }); freshKeep();
  $('#soundNext').click();
  await tryOk('1.2.14 #12 소리 점검의 대기(안정 대기 · 3초 무음) 중 Esc → ‘다시 듣기’가 이번 점검의 준비 · 대기를 처음부터 다시 시작(1 · 2회 모두) → 소리가 나오고 답을 받음', async () => {
    const res = [];
    for (const idx of [0, 1]) {
      await until(() => ONSET.running && ONSET.idx === idx && (ONSET.phase === 'warmup' || ONSET.phase === 'waiting'), 10000, `점검 ${idx + 1} 대기`);
      const ph = ONSET.phase, nB = starts().length;
      H.key('Escape');
      const paused = ONSET.phase === 'suspended' && !$('#onReplay').disabled && $$('#onCountPick .choice').every(b => b.disabled);
      await wait(80);                                  // 멈춘 동안에는 대기가 흐르지 않음 (소리가 저절로 나오지 않음)
      const quiet = ONSET.phase === 'suspended' && starts().length === nB;
      $('#onReplay').click();
      const again = ONSET.running && ONSET.idx === idx && (ONSET.phase === 'warmup' || ONSET.phase === 'waiting') && ONSET.cur === null && $('#onReplay').disabled;
      let heard = false;
      try { await until(() => ONSET.phase === 'awaiting' && ONSET.idx === idx, 4000, '다시 시작한 점검의 소리'); heard = starts().length === nB + 1 && !$$('#onCountPick .choice')[0].disabled; } catch { }
      res.push(`${ph}:${+paused}${+quiet}${+again}${+heard}`);
      if (!heard) { runOnsetTrial(); await until(() => ONSET.phase === 'awaiting' && ONSET.idx === idx, 10000, '점검 복구'); }   // 실패해도 다음 점검으로
      $('#onCountPick').querySelector('[data-v="4"]').click(); $('#onFirstPick').querySelector('[data-v="no"]').click(); $('#onTrialNext').click();
    }
    await until(() => !$('#onsetResCard').hidden, 5000, '점검 결과');
    const rec = !!PRE.onset && PRE.onset.trials.length === 2 && PRE.onset.trials.every(t => t.resp === 4 && t.replays === 0 && t.silenceBeforeMs === 3000);
    return [res.length === 2 && res[0].startsWith('warmup') && res[1].startsWith('waiting') && res.every(r => r.endsWith(':1111')) && rec, res.join(' ') + ' rec=' + rec];
  });
  await tryOk('1.2.14 #13 소리 점검: 다른 단추(점검 다시 하기 · 소리 맞추기로 · 다시 듣기)에 초점을 두고 Enter → 공통 단축키(연습 시작 · 다음)가 가로채지 않음 · 초점이 단추 밖이면 그대로 동작', async () => {
    if ($('#onsetResCard').hidden) throw new Error('점검 결과 화면이 아님');
    const e1 = H.key('Enter', $('#onsetAgain')), e2 = H.key('Enter', $('#onsetBack'));
    await wait(150);                                   // 가로챘다면 그 사이 검사가 시작됨
    const resCard = !e1.defaultPrevented && !e2.defaultPrevented && S === null && vis('#pgOnset') && !$('#onsetResCard').hidden && DB.sessions.length === 0;
    let trial = false, body = false;
    if (S === null) {
      $('#onsetAgain').click();
      await until(() => ONSET.running && ONSET.phase === 'awaiting' && ONSET.idx === 0, 10000, '다시 한 점검');
      $('#onCountPick').querySelector('[data-v="4"]').click(); $('#onFirstPick').querySelector('[data-v="no"]').click();
      const e3 = H.key('Enter', $('#onReplay'));
      trial = !e3.defaultPrevented && ONSET.idx === 0 && ONSET.phase === 'awaiting' && ONSET.trials.length === 0;
      const e4 = H.key('Enter');
      body = !!e4.defaultPrevented && ONSET.trials.length === 1;
    }
    return [resCard && trial && body, `결과화면=${resCard} 시행중=${trial} 본문Enter=${body} S=${!!S}`];
  });

  // ── 장면 2: 검사 A (유지 신호 켬) — #2 · #1 · #14 · #13 · #4 · #3 · #6
  await resetAll();
  toSound({ code: 'P07' }); freshKeep();               // 유지 신호를 막 켠 상태 → 시작할 때 3초 안정 대기가 남음(‘오디오 준비 중’)
  $('#soundNext').click();
  await tryOk('1.2.14 #2 오디오 준비 중 ‘건너뛰고 연습 시작’을 거듭 눌러도 검사는 한 건 — 참가 번호 · 귀 · 연결 방법과 답이 같은 검사에 · 준비(파일 확인 · 소리 안정 대기)가 끝날 때까지 시작 단추 잠금', async () => {
    $('#onsetSkip').click();
    startSession();                                    // 첫 입력 직후(파일 확인 중)의 겹친 진입
    let locked = true, tries = 0;
    for (let i = 0; i < 600 && !S; i++) {
      if (!$('#onsetSkip').disabled || !$('#onsetStart').disabled) locked = false;   // 준비가 끝나기 전에 단추가 다시 열림
      $('#onsetSkip').click(); tries++;
      await wait(1);
    }
    await wait(150);                                   // 겹쳐 들어간 시작이 있었다면 그 사이 검사가 더 생김
    await until(() => S && S.cur && awaiting, 15000, '연습 첫 시행');
    const sA = S.session;
    H.key(String(awaiting.tg + 1));
    const one = DB.sessions.length === 1 && DB.sessions[0] === sA && evN(sA, 'session-start') === 1 && evN(sA, 'practice-start') === 1 && storedDb().sessions.length === 1;
    const who = sA.code === 'P07' && sA.ear === 'R' && sA.path === 'wired';
    const unlocked = !$('#onsetSkip').disabled && !$('#onsetStart').disabled && !$('#onsetBack').disabled;
    return [one && who && sA.practiceTrials.length === 1 && locked && unlocked && tries > 3,
      `검사=${DB.sessions.length}건 번호=${sA.code} 귀=${sA.ear} 연결=${sA.path} 답=${sA.practiceTrials.length} 잠금=${locked} 누름=${tries}`];
  });
  await tryOk('1.2.14 #1 검사 중 ‘소리 끄기’ · Esc → 검사음과 18 Hz 유지 신호를 함께 끔(출력에 18 Hz 없음 · 끊김으로 적지 않음) · 화면을 가렸다 돌아와도 저절로 켜지지 않음 · ‘소리 다시 재생’ 때만 원래 설정으로(막 켠 신호 3초 안정 뒤 같은 시행을 다시)', async () => {
    await until(() => S && S.cur && S.cur.practice && awaiting, 15000, '연습 시행');
    const C = S.cur, s = S.session, res = [], gaps0 = evN(s, 'keep-gap-start'), nTr = s.practiceTrials.length;
    for (const how of ['button', 'key-esc']) {
      await until(() => S.cur === C && awaiting, 15000, '답 기다림');
      const on0 = Math.abs(db18Now() + 45) < 0.05, oscStops = H.oscLog.filter(x => x.ev === 'stop').length;
      if (how === 'button') $('#muteNowBtn').click(); else H.key('Escape');
      const ev = s.events.filter(e => e.type === 'safety-mute').at(-1);
      const off = keep === null && db18Now() === null && H.oscLog.filter(x => x.ev === 'stop').length === oscStops + 1;
      const ui = C.phase === 'suspended' && !$('#resumeAudioWrap').hidden && $$('.iv').every(b => b.disabled) && !!ev && ev.via === how;
      keepMonTick();
      H.visibility(true); await wait(20); H.visibility(false); await wait(40);
      const stays = keep === null && db18Now() === null && C.phase === 'suspended' && !awaiting;
      const noGap = !!KEEPMON.last && KEEPMON.last.cls !== 'gap' && !KEEPMON.open && evN(s, 'keep-gap-start') === gaps0;
      const nB = starts().length;
      $('#resumeAudioBtn').click();
      await until(() => S.cur === C && awaiting, 15000, '다시 재생');
      const back = !!keep && Math.abs(db18Now() + 45) < 0.05 && effectiveKeepMode() === 'tone18all' && starts().length === nB + 3 && $('#resumeAudioWrap').hidden && $('#tNote').textContent.includes('연습');
      const warmed = !!keep && starts().at(-3).at - keep.from >= 2.9;   // 유지 신호를 다시 켠 뒤 3초가 지나서야 첫 소리를 예약
      res.push(`${how}:${+on0}${+off}${+ui}${+stays}${+noGap}${+back}${+warmed}`);
    }
    return [res.every(r => r.endsWith(':1111111')) && s.practiceTrials.length === nTr && evN(s, 'keep-gap-start') === gaps0 && !KEEPMON.open, res.join(' ')];
  });
  await tryOk('1.2.14 #14 마지막(세 번째) 연습 답 직후 피드백 중 ‘소리 끄기’ → ‘소리 다시 재생’: 네 번째 시행 없이 연습 끝 화면으로 (연습 3번 · 남은 횟수 0)', async () => {
    const s = S.session;
    while (s.practiceTrials.length < 2) await answerNow(true);
    await until(() => S.cur && S.cur.practice && awaiting && s.practiceTrials.length === 2, 15000, '세 번째 연습');
    const C = S.cur;
    H.key(String(awaiting.tg + 1));                    // 세 번째 답 → 피드백(1초)
    const fb = C.phase === 'feedback' && C.left === 0 && s.practiceTrials.length === 3;
    $('#muteNowBtn').click();
    const nB = starts().length;
    $('#resumeAudioBtn').click();
    await until(() => vis('#pgBreak') || awaiting, 15000, '연습 끝 또는 네 번째 시행');
    const done = vis('#pgBreak') && S.cur === null && !awaiting && starts().length === nB && C.left === 0 && s.practiceTrials.length === 3
      && $('#bBody').textContent.includes('3번 중') && evN(s, 'practice-end') === 1;
    const detail = `피드백=${fb} 화면=${vis('#pgBreak') ? '연습 끝' : '시행'} 남은=${C.left} 연습답=${s.practiceTrials.length} 새소리=${starts().length - nB}`;
    if (!done && awaiting) { H.key(String(awaiting.tg + 1)); await until(() => vis('#pgBreak'), 15000, '복구'); }   // 실패해도 다음 시험으로
    return [fb && done, detail + (done ? '' : ` → 네 번째 답 뒤 남은=${C.left}`)];
  });
  await tryOk('1.2.14 #13 쉬는 화면: ‘저장하고 나중에 이어하기’ · ‘여기까지만 하기’ · ‘연습 한 번 더’ · 언어 단추에 초점을 두고 Enter · Space → 공통 단축키(다음)가 가로채지 않음 · 초점이 단추 밖이면 그대로 ‘다음’', async () => {
    if (!vis('#pgBreak') || !S) throw new Error('쉬는 화면이 아님');
    const s = S.session, res = [];
    for (const [key, id] of [['Enter', '#bSaveLater'], [' ', '#bSaveLater'], ['Enter', '#bEnd'], [' ', '#bEnd'], ['Enter', '#bPractice'], [' ', '#langToggle']]) {
      const n = evN(s, 'track-start'), e = H.key(key, $(id));
      const kept = !e.defaultPrevented && vis('#pgBreak') && !!S && S.cur === null && evN(s, 'track-start') === n;
      res.push(+kept);
      if (!kept && S && S.cur) { $('#stopBtn').click(); await until(() => vis('#pgBreak'), 5000, '복구'); }   // 가로채서 시작된 측정을 되돌림
    }
    const n1 = evN(s, 'track-start'), e = H.key('Enter');   // 초점이 단추 밖(본문)
    const nextOk = !!e.defaultPrevented && !!S.cur && !S.cur.practice && evN(s, 'track-start') === n1 + 1;
    return [res.every(Boolean) && nextOk, `단추에 초점=${res.join('')} 본문 Enter=${nextOk}`];
  });
  await tryOk('1.2.14 #1 ‘소리 끄기’ 뒤 ‘잠시 멈춤’ → ‘다시 시작’: 쉬는 동안 유지 신호는 꺼진 채 · 다시 시작할 때 원래 설정으로 켜고 3초 뒤 첫 소리', async () => {
    await until(() => S && S.cur && !S.cur.practice && awaiting, 20000, '측정 첫 시행');
    const fm = S.cur.fm;
    $('#muteNowBtn').click();
    $('#stopBtn').click();                             // 확인 창 ‘그만’ → 버린 측정 → 쉬는 화면
    const rest = vis('#pgBreak') && S.cur === null && keep === null && db18Now() === null;
    await wait(60);
    const still = keep === null && db18Now() === null;
    $('#bNext').click();
    await until(() => S.cur && awaiting, 20000, '다시 시작한 측정');
    const back = !!keep && Math.abs(db18Now() + 45) < 0.05 && S.cur.fm === fm && starts().at(-3).at - keep.from >= 2.9 && !KEEPMON.open;
    return [rest && still && back, `쉬는 동안 꺼짐=${rest}/${still} 다시 켜고 3초 뒤=${back}`];
  });
  await tryOk('1.2.14 #1 출력 확인: 유지 신호를 막 켠 뒤 분석 창(약 0.7초)이 차기 전의 무음은 끊김으로 적지 않음(‘소리 끄기’를 푼 직후가 그런 때) · 창이 찬 뒤에도 18 Hz 가 없으면 끊김', () => {
    if (!S) throw new Error('검사 중이 아님');
    const s = S.session, g0 = evN(s, 'keep-gap-start');
    keepStop(); keepStart();                           // 막 켬
    H.forceSilent = true;
    let early, late;
    try {
      early = keepMonTick().cls;                       // 창이 덜 참
      keep.from -= 1;                                  // 1초 전에 켠 셈 → 창이 찼는데도 무음
      late = keepMonTick().cls;
    } finally { H.forceSilent = false; }
    const back = keepMonTick().cls;
    return [early === 'buffer' && late === 'gap' && back === 'ok' && !KEEPMON.open && evN(s, 'keep-gap-start') === g0 + 1, `${early} → ${late} → ${back}`];
  });
  await tryOk('1.2.14 #14 측정의 마지막 답(0 dB 네 번째 오답 → 계단 끝) 직후 ‘소리 끄기’ → ‘소리 다시 재생’: 소리를 더 들려주지 않고 측정을 마침 (기록 4시행 = 들려준 4시행)', async () => {
    await until(() => S && S.cur && !S.cur.practice && awaiting, 20000, '측정 시행');
    const s = S.session, C = S.cur, r0 = s.runs.length;
    for (let k = 0; k < 4; k++) { await until(() => S.cur === C && awaiting, 15000, '오답 시행'); H.key(wrongKey()); }
    const ended = C.track.done && C.track.ceiling && C.phase === 'feedback';
    $('#muteNowBtn').click();
    const nB = starts().length;
    $('#resumeAudioBtn').click();
    await until(() => vis('#pgBreak') || awaiting, 15000, '측정 끝 또는 남는 시행');
    const run = s.runs.at(-1);
    const done = vis('#pgBreak') && S.cur === null && starts().length === nB && s.runs.length === r0 + 1 && run.ceiling && run.trials.length === 4 && run.nTrials === 4;
    const detail = `계단 끝=${ended} 화면=${vis('#pgBreak') ? '쉬는 화면' : '시행'} 측정=${s.runs.length - r0} 새소리=${starts().length - nB}`;
    if (!done && awaiting) { H.key('1'); await until(() => vis('#pgBreak'), 15000, '복구'); }
    return [ended && done, detail];
  });
  await tryOk('1.2.14 #4 중간 저장 실패(저장 공간 부족): 쉬는 화면 · 검사 상태 유지 + 실패 알림 · 홈으로 가지 않음(‘이어서 하기’를 보이지 않음) · 회기에 실패 기록', async () => {
    if (!vis('#pgBreak') || !S) throw new Error('쉬는 화면이 아님');
    const s = S.session, idx = S.idx;
    flushSave();
    const real = localStorage.setItem;
    localStorage.setItem = () => { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; };
    let stay = false, detail = '';
    try {
      $('#bSaveLater').click();
      stay = vis('#pgBreak') && !!S && S.session === s && S.idx === idx && !s.paused && s.resumeIdx === undefined && !isResumable(s) && $('#homeResume').hidden
        && $('#bBody').textContent.includes('저장하지 못했습니다') && evN(s, 'session-pause') === 0 && evN(s, 'session-pause-failed') === 1;
      detail = `화면=${vis('#pgBreak') ? '쉬는 화면' : vis('#pgHome') ? '홈' : '기타'} 검사 유지=${!!S} 중단 표시=${!!s.paused} 이어서 하기 보임=${!$('#homeResume').hidden}`;
    } finally { localStorage.setItem = real; }
    const st = storedDb().sessions.find(x => x.id === s.id);
    const notStored = !!st && !st.paused;              // 저장소에는 중단 표시가 없음 — 화면도 그에 맞아야 새로 고침 뒤 달라지지 않음
    if (!S) {                                          // 수정 전: 홈으로 가 버림 → 다음 시험을 위해 메모리의 검사를 이어 감
      const b = $$('#homeResumeList [data-resume]').find(x => x.dataset.resume === s.id); if (b) b.click();
      await until(() => S && vis('#pgBreak'), 5000, '복구');
    }
    return [stay && notStored, detail + ` 저장소의 중단 표시=${!!(st && st.paused)}`];
  });
  await tryOk('1.2.14 #3 다른 탭이 기록을 저장해도 진행 중인 검사 = 저장 목록의 그 항목(같은 객체) → 이 탭의 이후 진행(중간 저장)이 저장소에 남음 · 다른 탭의 기록도 그대로 · 새로 고침 뒤에도 ‘이어서 하기’ · 결과 화면이 보던 검사도 같은 객체', async () => {
    if (!vis('#pgBreak') || !S) throw new Error('쉬는 화면이 아님');
    const s = S.session;
    flushSave(); saveStore();
    // 다른 탭: 같은 기록을 읽어 다른 검사(P88 — 연습만 하고 끝낸 검사)를 더해 저장 → 이 탭에 storage 사건
    const other = storedDb();
    other.sessions.push({ id: 'other-tab-p88', format: FORMAT, formatVersion: FORMAT_VERSION, app: APP_VERSION, start: iso(), end: iso(), endReason: '중간에 끝냄 (남은 측정 7개)', updated: iso(),
      code: 'P88', ear: 'L', path: 'speaker', plan: [], runs: [], practiceTrials: [], decisions: [], events: [{ t: iso(), s: 0, type: 'session-start' }] });
    other.rev = 'other-tab-rev-1';
    const raw = JSON.stringify(other);
    H.store.set(STORE_KEY, raw);
    handleStorageEvent({ key: STORE_KEY, newValue: raw });
    const same = DB.sessions.filter(x => x.id === s.id).length === 1 && DB.sessions.find(x => x.id === s.id) === s && DB.sessions.some(x => x.id === 'other-tab-p88');
    $('#bSaveLater').click();                          // 이 탭의 이후 진행
    const st = storedDb().sessions.find(x => x.id === s.id);
    const saved = vis('#pgHome') && S === null && !!st && st.paused === true && st.resumeIdx === 1 && st.runs.length === 1 && st.events.some(e => e.type === 'session-pause')
      && storedDb().sessions.some(x => x.id === 'other-tab-p88');
    loadStore(); renderHome();                         // 새로 고침 흉내: 저장소에서 다시 읽음
    const reload = !$('#homeResume').hidden && $$('#homeResumeList [data-resume]').some(b => b.dataset.resume === s.id);
    // 결과 화면이 보고 있는 검사: 다른 탭이 같은 내용을 저장 → 같은 객체 그대로 · 더 새 판을 저장 → 그 객체로 옮겨 감
    const a2 = DB.sessions.find(x => x.id === s.id);
    SHOWN = a2; JUST = a2;
    const o2 = storedDb(); o2.rev = 'other-tab-rev-2';
    H.store.set(STORE_KEY, JSON.stringify(o2)); handleStorageEvent({ key: STORE_KEY, newValue: JSON.stringify(o2) });
    const shownSame = SHOWN === a2 && JUST === a2 && DB.sessions.includes(a2);
    const o3 = storedDb(); o3.rev = 'other-tab-rev-3';
    Object.assign(o3.sessions.find(x => x.id === s.id), { updated: new Date(Date.now() + 5000).toISOString(), focusEnd: 'good' });
    H.store.set(STORE_KEY, JSON.stringify(o3)); handleStorageEvent({ key: STORE_KEY, newValue: JSON.stringify(o3) });
    const shownNew = !!SHOWN && SHOWN !== a2 && SHOWN.focusEnd === 'good' && JUST === SHOWN && DB.sessions.includes(SHOWN);
    SHOWN = null; JUST = null;
    return [same && saved && reload && shownSame && shownNew, `같은 객체=${same} 중간 저장이 저장소에=${saved} 새로 고침 뒤 이어하기=${reload} 결과 화면=${shownSame}/${shownNew}`];
  });
  await tryOk('1.2.14 #6 완료한 측정이 없는 기록만 있어도(첫 측정 전에 끝낸 검사 · 중간 저장된 검사) 홈에 ‘이 기기 기록 지우기’가 보임 · 누르면 모두 지워지고 숨음', () => {
    renderHome();
    const all = DB.sessions;
    const real = all.length === 2 && all.some(isResumable) && all.some(s => s.id === 'other-tab-p88' && !s.runs.length) && !$('#homeSaved').hidden && !$('#homeResume').hidden;
    const only = pred => { DB.sessions = all.filter(pred); renderHome(); return !$('#homeSaved').hidden; };
    const endedOnly = only(s => s.id === 'other-tab-p88') && $('#homeResume').hidden && $$('#homeSavedList [data-open]').length === 0 && $('#homeSavedList').textContent.includes('1개');
    const pausedOnly = only(s => s.id !== 'other-tab-p88') && !$('#homeResume').hidden;
    const empty = !only(() => false);
    DB.sessions = all; renderHome();
    H.confirmAnswer = true;
    const nC = H.dialogs.filter(d => d[0] === 'confirm').length;
    $('#homeClearAll').click();
    const cleared = H.dialogs.filter(d => d[0] === 'confirm').length === nC + 1 && DB.sessions.length === 0 && !H.store.has(STORE_KEY) && $('#homeSaved').hidden && $('#homeResume').hidden;
    return [real && endedOnly && pausedOnly && empty && cleared, `실제 상태=${real} 끝낸 검사만=${endedOnly} 중간 저장만=${pausedOnly} 빈 기록=${empty} 지움=${cleared}`];
  });

  // ── 장면 3: 검사 B — 유지 신호를 끄고 48 kHz 로 시작 → 중간 저장 → 새로 연 화면(44.1 kHz · 유지 신호 기본값 켜짐)에서 이어 함 (#2 · #5 · #10 · #7 · #9)
  let finalObj = null, backupObj = null;
  try {
    await resetAll();
    H.sampleRate = 48000;
    toSound({ code: 'P08', ear: 'L', keepOn: false });
    $('#soundNext').click(); $('#onsetSkip').click();
    await until(() => S && S.cur && S.cur.practice && awaiting, 20000, 'B 연습');
    const sB = S.session;
    for (let k = 0; k < 3; k++) await answerNow(true);
    await until(() => vis('#pgBreak'), 15000, 'B 연습 끝');
    $('#bSaveLater').click();
    const resumeBtn = () => $$('#homeResumeList [data-resume]').find(b => b.dataset.resume === sB.id);
    freshPage(44100);
    await tryOk('1.2.14 #2 · #5 ‘이어서 하기’를 거듭 눌러도 한 번만 이어 감 · 유지 신호를 끈 검사는 새로 연 화면(기본값 켜짐)에서도 끈 채로 — 18 Hz 발진기 0개 · 기록(꺼짐) = 실제 출력', async () => {
      resumeBtn().click();
      resumeSession(sB.id);
      for (let i = 0; i < 600 && !S; i++) { const b = resumeBtn(); if (b) b.click(); await wait(1); }
      await wait(150);
      await until(() => S && S.session === sB && vis('#pgBreak'), 15000, 'B 이어하기');
      const ev = sB.events.filter(e => e.type === 'session-resume').at(-1);
      const once = evN(sB, 'session-resume') === 1;
      const off = keepUserOff === true && keep === null && ctx.sampleRate === 44100 && ctx._oscs.length === 0 && db18Now() === null
        && ev.audio.keepalive === 'off' && ev.audio.sampleRate === 44100 && sB.keepalive.userOff === true && sessionKeepKey(sB) === 'off' && $('#keepBadge').textContent.includes('꺼짐');
      return [once && off, `이어하기 사건=${evN(sB, 'session-resume')}번 유지 신호 끔 유지=${off} (발진기 ${ctx._oscs.length}개 · 18 Hz ${db18Now()} dBFS · 기록 ${sessionKeepKey(sB)})`];
    });
    $('#bPractice').click();
    for (let k = 0; k < 3; k++) await answerNow(true);
    await until(() => vis('#pgBreak'), 15000, 'B 연습 2 끝');
    $('#bNext').click();
    // 측정 1: 한 번 틀림 → 다음 소리가 나는 동안 화면이 가려짐(무효) → 돌아와 다시 듣고 틀림 → 셋째 시행에서 ‘잠시 멈춤’(버린 측정) → 처음부터 다시 네 번 틀림(재지 못함)
    await answerNow(false);
    await until(() => S.cur && S.cur.phase === 'playing', 15000, '가려질 소리');
    H.visibility(true); await wait(5); H.visibility(false);
    await answerNow(false);
    await until(() => S.cur && awaiting, 15000, '멈출 시행');
    $('#stopBtn').click();
    await until(() => vis('#pgBreak'), 5000, 'B 버린 측정');
    $('#bNext').click();
    for (let k = 0; k < 4; k++) await answerNow(false);
    await until(() => vis('#pgBreak'), 15000, 'B 측정 1 끝');
    $('#bSaveLater').click();                          // 측정 1개인 채로 중간 저장 → ‘결과 백업’
    $$('#homeResumeList [data-backup]').find(b => b.dataset.backup === sB.id).click();
    backupObj = JSON.parse(await (await H.takeDownloads())[0].blob.text());
    resumeBtn().click();
    await until(() => S && S.session === sB && vis('#pgBreak'), 15000, 'B 다시 이어하기');
    $('#bNext').click();
    for (let k = 0; k < 4; k++) await answerNow(false);
    await until(() => vis('#pgBreak'), 15000, 'B 측정 2 끝');
    $('#bEnd').click();
    await until(() => vis('#pgEnd'), 5000, 'B 끝');
    $('#saveFile').click();
    finalObj = JSON.parse(await (await H.takeDownloads())[0].blob.text());
    if (H.dump) H.dump(finalObj, 'resume');            // → tools/verify_result_check.py 가 따로 짠 파이썬으로 다시 만들어 봄
  } catch (e) { ok('1.2.14 장면 3(검사 B: 중간 저장 → 표본화율이 다른 화면에서 이어하기)이 끝까지 돎', false, e.stack || e.message); }
  H.sampleRate = 48000;
  await tryOk('1.2.14 #10 표본화율이 바뀐 화면에서 이어 한 검사: 연습 · 측정 · 버린 측정 · 가려져 버린 시행마다 만든 때의 표본화율(sr)이 남음 (48 kHz 로 시작 → 44.1 kHz 로 이음)', () => {
    const s = finalObj.sessions[0], pr = s.practiceTrials;
    const ab = s.events.filter(e => e.type === 'track-abandoned'), vd = s.events.filter(e => e.type === 'trial-void');
    const c = [s.env.audio.sampleRate === 48000, pr.length === 6 && pr.slice(0, 3).every(t => t.sr === 48000) && pr.slice(3).every(t => t.sr === 44100),
      s.runs.length === 2 && s.runs.every(r => r.audio.sampleRate === 44100 && r.trials.length === 4 && r.trials.every(t => t.sr === 44100)),
      ab.length === 1 && ab[0].trialList.length === 2 && ab[0].trialList.every(t => t.sr === 44100) && !!ab[0].pending && ab[0].pending.sr === 44100,
      vd.length === 1 && !!vd[0].heard && vd[0].heard.sr === 44100, s.events.filter(e => e.type === 'session-resume').length === 2 && s.events.filter(e => e.type === 'session-resume').every(e => e.audio.sampleRate === 44100)];
    return [c.every(Boolean), bits(c) + ` 연습 sr=${pr.map(t => t.sr).join()}`];
  });
  await tryOk('1.2.14 #7 받은 결과 보기: 같은 검사의 중간 백업(측정 1개)을 먼저 열고 완료본(측정 2개)을 열면 화면 · CSV 가 완료본으로 바뀜(쓰는 파일 표시) · 거꾸로 다시 열어도 완료본 유지 · 어느 쪽이 최신인지 알 수 없으면 쓰는 파일을 알림', async () => {
    showPage('pgViewer', { noScroll: true, noFocus: true }); clearViewerState();
    const open = async (o, name) => {
      $('#vState').textContent = ''; $('#vFiles').files = [new File([JSON.stringify(o)], name)];
      $('#vFiles').dispatchEvent({ type: 'change', target: $('#vFiles') });
      await until(() => $('#vState').textContent !== '', 5000, name + ' 열기');
      return $('#vState').textContent;
    };
    const rows = () => $('#vList').querySelectorAll('tr').length - 1, cur = () => VIEW.sessions[0];
    await open(backupObj, 'backup.json');
    const first = backupObj.sessions[0].runs.length === 1 && finalObj.sessions[0].runs.length === 2 && VIEW.sessions.length === 1 && cur().s.runs.length === 1 && rows() === 1;
    const m2 = await open(finalObj, 'final.json');
    const upd = VIEW.sessions.length === 1 && cur().s.runs.length === 2 && cur().src === 'final.json' && rows() === 2 && $('#vList').innerHTML.includes('final.json') && !$('#vList').innerHTML.includes('backup.json')
      && m2.includes('final.json');
    $('#vCsvRuns').click();
    const R = H.parseCsv(await (await H.takeDownloads())[0].blob.text()).filter(r => r.length > 1);
    const csvOk = R.length - 1 === 2 && R.slice(1).every(r => r[0] === 'final.json');
    const m3 = await open(backupObj, 'backup.json');
    const keepNew = VIEW.sessions.length === 1 && cur().s.runs.length === 2 && cur().src === 'final.json' && rows() === 2 && m3.includes('backup.json') && m3.includes('final.json');
    const m4 = await open(finalObj, 'final-copy.json');   // 같은 내용을 또 엶 → 그대로
    const dup = VIEW.sessions.length === 1 && cur().src === 'final.json' && rows() === 2;
    const fork = JSON.parse(JSON.stringify(finalObj)); fork.sessions[0].runs[1].trials[0].c = 1;   // 시각 · 측정 수는 같은데 내용이 다른 파일
    const m5 = await open(fork, 'edited.json');
    const conflict = VIEW.sessions.length === 1 && cur().src === 'final.json' && m5.includes('edited.json') && m5.includes('final.json') && m5 !== m4;
    clearViewerState(); showPage('pgHome', { noScroll: true, noFocus: true });
    return [first && upd && csvOk && keepNew && dup && conflict, `백업 먼저=${first} 완료본으로 바뀜=${upd} CSV=${csvOk}(${R.length - 1}줄) 거꾸로=${keepNew} 같은 파일=${dup} 판단 불가 알림=${conflict} | ${m2}`];
  });
  await tryOk('1.2.14 #9 받은 결과 보기: 소리 기록(씨앗 · 세기 · 봉우리)이 없는 시행은 구간 세기 ‘같음’이 아니라 ‘확인 못 함’ · 측정 CSV 의 구간세기차는 빈칸 · 전문가 보고서는 ‘확인 불가’', async () => {
    const bare = JSON.parse(JSON.stringify(finalObj.sessions[0])); bare.id = 'no-sound-record';
    for (const r of bare.runs) for (const t of r.trials) { delete t.seeds; delete t.rms; delete t.pk; delete t.phase; }
    const sameN = h => (h.match(/class="good">같음/g) || []).length;
    const hBare = viewSessHtml(sanitizeSession(bare), 'bare.json'), hFull = viewSessHtml(sanitizeSession(finalObj.sessions[0]), 'final.json');
    const viewOk = hBare.includes('확인 못 함') && sameN(hBare) === 2 && sameN(hFull) === 4 && !hFull.includes('확인 못 함');   // 측정 2개: 계단 다시 2 (+ 구간 세기 2)
    const rep = specialistReportHtml([bare]), repFull = specialistReportHtml([finalObj.sessions[0]]);
    const repOk = rep.includes('확인 불가') && !repFull.includes('확인 불가');
    VIEW.sessions = [{ s: sanitizeSession(bare), src: 'bare.json' }, { s: sanitizeSession(finalObj.sessions[0]), src: 'final.json' }];
    renderViewer(true);
    $('#vCsvRuns').click();
    const R = H.parseCsv(await (await H.takeDownloads())[0].blob.text()).filter(r => r.length > 1), ix = R[0].indexOf('구간세기차dB');
    const csvOk = R.length === 5 && R.slice(1).filter(r => r[0] === 'bare.json').every(r => r[ix] === '') && R.slice(1).filter(r => r[0] === 'final.json').every(r => r[ix] !== '' && +r[ix] <= 0.1);
    clearViewerState();
    return [viewOk && repOk && csvOk, `뷰어=${viewOk}(같음 ${sameN(hBare)}/${sameN(hFull)}) 보고서=${repOk} CSV=${csvOk}`];
  });
  await tryOk('1.2.14 #8 참가자 그림의 평균점은 정상 측정만(표 · 전문가 보고서와 같은 규칙): 정상 −20 dB + 미완 −4 dB → 표 평균 빈칸 · 그림에도 −12 dB 평균점 없음 · 참고 값은 점선 원으로 구별 / 3차 제안 = 두 값이 모두 숫자이고 3 dB 넘게 다를 때(재지 못함 · 산출 불가 제외 — 방법.md §3-5)', () => {
    const run = (fm, order, thr, x = {}) => ({ id: 'r' + order, fm, round: order % 2 ? 1 : 2, order, thr, sd: 1, ceiling: false, incomplete: false, atChance: false, n0: 2, k0: 2, nTrials: 30, nDunno: 0, reversals: [], revAt: [], trials: [], ...x });
    const sess = { id: 'mix', start: iso(), ear: 'R', path: 'wired', P: snapP(PR), events: [],
      runs: [run(10, 1, -20), run(10, 2, -4, { incomplete: true }), run(50, 3, -16), run(50, 4, -13), run(100, 5, -10, { atChance: true })] };
    const ch = chartHtml(sess), tb = endTableHtml(sess), cnt = re => (ch.match(re) || []).length;
    const y = d => 16 + (300 - 16 - 48) * (1 - d / -30);   // 그림의 세로 자리 (넓은 화면 · 가장 약한 눈금 −30 dB)
    const means = [...ch.matchAll(/class="pt" cx="[^"]+" cy="([^"]+)"/g)].map(m => +m[1]);
    const chartOk = means.length === 1 && Math.abs(means[0] - y(-14.5)) < 1e-6 && cnt(/class="pt2"/g) === 3 && cnt(/class="pt-ref"/g) === 2 && ch.includes('점선 원 = 참고 값');
    const row = hz => tb.split('<tr>').find(r => r.includes(`>${hz} Hz</td>`)) || '';
    const tableOk = row(10).endsWith('<td></td></tr>') && row(50).includes('-14.5 dB') && !tb.includes('-12.0 dB');   // 10 Hz: 평균 칸 비움 · 50 Hz: 정상 둘의 평균
    const css = new TextDecoder().decode(H.fileBytes('style.css')).includes('.chart .pt-ref{');
    const keepS = S;
    S = { session: { rounds: [{ round: 1 }, { round: 2 }], fmsPlan: [10, 50, 100, 200, 300], runs: [
      run(10, 1, -20), run(10, 2, -4, { incomplete: true }),          // 숫자 둘(하나는 참고 값) · 차 16 dB → 제안
      run(50, 3, -16), run(50, 4, -14),                               // 차 2 dB → 제안 안 함
      run(100, 5, -10), run(100, 6, 0, { ceiling: true }),            // 재지 못함은 숫자가 아님 → 제안 안 함
      run(200, 7, -10), run(200, 8, null, { incomplete: true }),      // 산출 불가 → 제안 안 함
      run(300, 9, -2, { atChance: true }), run(300, 10, -8)] } };     // 우연 수준(참고 값)도 숫자 · 차 6 dB → 제안
    let o = null; try { o = makeOffer(); } finally { S = keepS; }
    const offerOk = !!o && o.kind === 'extra' && o.fms.join() === '10,300';
    const repTxt = specialistReportHtml([sess]).includes('두 값이 모두 숫자이고 차가 &gt; 3 dB');
    return [chartOk && tableOk && css && offerOk && repTxt, `그림=${chartOk}(평균점 ${means.map(v => v.toFixed(1)).join()} · 빈 원 ${cnt(/class="pt2"/g)} · 점선 원 ${cnt(/class="pt-ref"/g)}) 표=${tableOk} css=${css} 제안=${o ? o.fms.join() : null} 보고서 문구=${repTxt}`];
  });
  await resetAll();
  clearInterval(KEEPMON_TIMER);
})();
