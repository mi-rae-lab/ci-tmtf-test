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
  await tryOk('처음 화면: 기본 떨림 빠르기 10 · 50 · 100 · 150 · 200 Hz · 20분쯤 · 링크 번호(?id=P02) · 경고 없음 · 경고창 없음', () => [
    vis('#pgHome') && $('#fmInfo').textContent === '검사할 떨림 빠르기: 10 · 50 · 100 · 150 · 200 Hz' && $('#homeTime').textContent.startsWith('20분쯤') && $('#codeIn').value === 'P02' && $('#envWarn').hidden && $('#homeSaved').hidden && !H.dialogs.length,
    `${$('#fmInfo').textContent} | ${$('#homeTime').textContent} | ${$('#codeIn').value}`]);
  await tryOk('절차 고정: 조건 이름 · 스냅숏 (3구간 · 0.5 s · 쉼 0.5 s · 10 ms 직선 · 광대역 · 무작위 위상 · 0 dB 시작 · Won 규칙 · 0 dB 4번 멈춤 · 맞음/틀림 · 앞 무음 0.25 s · 3 dB 규칙)', () => {
    const want = { id: 'custom', nAFC: 3, dur: 0.5, isi: 0.5, rampMs: 10, rampShape: 'linear', band: { type: 'wide' }, phase: 'random', startDb: 0, bigUntil: 4, big: 4, small: 2, totalRev: 14, avgLast: 10, ceiling: 'stop4', rove: 0, leadS: 0.25, feedback: true };
    return [PROC_KEY === '직접·3구간·광대역·0.5초·쉼0.5초·흔들기없음·반전14·마지막10·직선경사' && JSON.stringify(snapP(PR)) === JSON.stringify(want) && PR.extraIfDiff === 3, PROC_KEY + ' ' + JSON.stringify(snapP(PR))];
  });
  await tryOk('링크 떨림 빠르기(?hz=): 고를 수 있는 칸만 · 하나라도 틀리면 통째로 버림 · 12개까지 · 정렬 · 겹침 없앰', () => {
    const c = [['10,50,100', '10,50,100'], ['100 10 50', '10,50,100'], ['10,10,50', '10,50'], ['10,51', null], ['', null], ['abc', null], ['10.5', null],
      [Array.from({ length: 13 }, (_, i) => (i + 1) * 5).join(','), null], ['56,57,58,59,61', '56,57,58,59,61'], ['2,512', '2,512'], ['1', null], ['600', null], [null, null]];
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
  await tryOk('크기 확인 → 시작 열림 · 시각 기록', () => [!$('#soundNext').disabled && !!PRE.volOkAt, '']);
  $('#osVol').value = '30';
  $('#soundNext').click();
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
  await tryOk('연습 답(키 · 맞음): ‘맞았어요’ · 정답 칸 초록 · 기록(깊이 0 · 맞음 · key · 반응 ms · 씨앗 3 · 연습 차례 1)', () => {
    const t = sess.practiceTrials[0];
    return [t && t.d === 0 && t.c === 1 && t.inp === 'key' && t.u === 0 && t.round === 1 && t.seeds.length === 3 && t.rt >= 0 && t.fm === 10 && $('#fb').textContent === '맞았어요' && $$('.iv')[t.tg].classList.contains('right'), JSON.stringify(t).slice(0, 200)];
  });
  await until(() => S.cur.phase === 'playing' && sess.practiceTrials.length === 1, 10000, '연습 2 소리');
  H.key('2');
  await until(() => awaiting, 10000, '연습 2 답 기다림');
  await tryOk('소리 나는 동안 누른 키 = 그 시행의 이른 입력 (답으로 안 침)', () => [S.cur.tm.early === 1 && S.cur.tm.ev[0].type === 'early-input' && S.cur.tm.ev[0].key === 2 && sess.practiceTrials.length === 1, JSON.stringify(S.cur.tm.ev)]);
  $$('.iv')[(awaiting.tg + 1) % 3].click();
  await tryOk('연습 답(클릭 · 틀림): ‘아니에요’ · 고른 칸 빨강 · 기록에 이른 입력 1', () => { const t = sess.practiceTrials[1]; return [t.c === 0 && t.inp === 'click' && t.early === 1 && $('#fb').textContent.startsWith('아니에요') && $$('.iv')[t.a].classList.contains('wrong'), JSON.stringify(t).slice(0, 160)]; });
  await until(() => awaiting && sess.practiceTrials.length === 2, 10000, '연습 3');
  H.key('0');
  await tryOk('모르겠음(0): 무작위 자리로 침(u 1) · ‘떨리는 소리는 n번이었어요’ · 고른 칸 표시 없음', () => { const t = sess.practiceTrials[2]; return [t.u === 1 && t.inp === 'key' && t.a >= 0 && t.a < 3 && $('#fb').textContent === `떨리는 소리는 ${t.tg + 1}번이었어요` && !$$('.iv').some(b => b.classList.contains('wrong')), JSON.stringify(t).slice(0, 120)]; });
  await until(() => vis('#pgBreak'), 10000, '연습 끝 화면');
  await tryOk('연습 끝: 3번 가운데 1번(모르겠음은 셈에서 뺌) · 도움말 · 연습 한 번 더 · 검사 시작 · 모르겠음 안내 문구', () => [
    $('#bBody').textContent.includes('3번 가운데 1번') && !$('#bPractice').hidden && $('#bNext').textContent === '검사 시작' && $('#bBody').textContent.includes('볼륨을 조금 키우거나')
      && $('#bBody').textContent.includes('떨림이 아주 조금이라도 느껴지면 그 번호를 고르세요') && $('#bBody').textContent.includes('세 소리가 완전히 똑같이 들릴 때만')
      && $('#pgHome').textContent.includes('떨림이 아주 조금이라도 느껴지면 그 번호를 고르세요'), $('#bBody').textContent.slice(0, 160)]);
  $('#bPractice').click();
  await until(() => awaiting && S.cur?.practice && S.practiceRound === 2, 10000, '연습 한 번 더');
  ok('연습 한 번 더: 연습 차례 2 · 제목 ‘연습 1 / 3’', $('#tTitle').textContent === '연습 1 / 3' && sess.practiceRounds === 2, $('#tTitle').textContent);
  $('#stopBtn').click();
  await tryOk('연습 그만: 확인 창 없이 연습 끝 화면(‘건너뛰었어요’) · 회기 사건 practice-stopped(몇 번째 · 답하기 전 시행)', () => {
    const ev = sess.events.filter(e => e.type === 'practice-stopped').at(-1);
    return [vis('#pgBreak') && ev && ev.done === 0 && ev.of === 3 && ev.phase === 'awaiting' && ev.pending && ev.pending.seeds.length === 3 && $('#bBody').textContent.includes('연습을 건너뛰었어요') && !H.dialogs.length, JSON.stringify(ev).slice(0, 200)];
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
  await tryOk('측정 끝 → 쉬는 화면(1 / 5 끝 · 남은 4) · 기록 1개 · 하던 측정(current) 비움', () => [$('#bBody').textContent.includes('1 / 5개 끝났어요') && sess.runs.length === 1 && sess.current === null && $('#bPractice').hidden, $('#bBody').textContent]);
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
        return [ev && ev.answer === 'keep' && ev.text === '지금 하던 것은 버리고 멈출까요?\n끝난 것은 저장되어 있어요.' && C0.tm.ev.some(x => x.type === 'stop-dialog' && x.answer === 'keep') && S.cur === C0 && awaiting, JSON.stringify(ev).slice(0, 160)];
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
      && vis('#pgBreak') && $('#bTitle').textContent === '멈췄어요' && $('#bNext').textContent === '다시 시작' && nextFm() === fm3 && sess.runs.length === 2 && sess.current === null, JSON.stringify(ev).slice(0, 200)];
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
      $('#endTitle').textContent === '한 바퀴 끝! 수고하셨습니다', $('#endWho').textContent.startsWith('P02 · 오른쪽 · 선으로 처리기에 연결')];
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
    return [sess.end === null && sess.endReason === null && p2.length === 5 && sess.rounds.length === 2 && vis('#pgBreak') && $('#bTitle').textContent === '2번째 바퀴'
      && sess.decisions.at(-1).what === 'again-offer' && sess.decisions.at(-1).answer === 'yes' && sess.events.some(e => e.type === 'round-added'), `${p2.length} ${$('#bTitle').textContent}`];
  });
  const THR2 = { ...THR1, 50: -4 };
  for (let k = 0; k < 5; k++) {
    $('#bNext').click();
    if (k === 0) await until(() => S.cur && awaiting, 10000, '2바퀴 첫 시행');
    if (k === 0) ok('2바퀴 첫 측정 제목 ‘2번째 바퀴 1 / 5’', $('#tTitle').textContent === '2번째 바퀴 1 / 5', $('#tTitle').textContent);
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
  await tryOk('차이 큰 것만 한 번 더 → 3바퀴(더) 계획 · 쉬는 화면 제목', () => [S.plan.filter(x => x.round === 3 && x.extra).length === extraFms.length && $('#bTitle').textContent === '차이가 큰 것만 한 번 더', $('#bTitle').textContent]);
  for (let k = 0; k < extraFms.length; k++) {
    $('#bNext').click();
    if (k === 0) { await until(() => S.cur && awaiting, 10000, '더 첫 시행'); ok('더 측정 제목 ‘한 번 더 1 / n’', $('#tTitle').textContent === `한 번 더 1 / ${extraFms.length}`, $('#tTitle').textContent); }
    await runTrack(THR2);
    await until(() => vis('#pgBreak') || vis('#pgEnd'), 10000, '더 쉬는 화면');
  }
  await until(() => vis('#pgEnd'), 20000, '모두 끝');
  await tryOk('모두 끝: 더 제안 없음 → 회기 닫음(S 없음) · 제목 ‘수고하셨습니다’ · 제안 상자 숨김 · 끝 질문은 그대로 보임 · 표에 1·2·3번째 칸', () => {
    const c = [S === null, $('#endTitle').textContent === '수고하셨습니다', $('#againBox').hidden, !!$('#focusPick'), sess.runs.length === 10 + extraFms.length, !!sess.end,
      sess.runs.filter(r => r.extra).length === extraFms.length && sess.runs.filter(r => r.extra).every(r => r.round === 3), $('#endTable').innerHTML.includes('3번째'), sess.events.some(e => e.type === 'session-close')];
    return [c.every(Boolean), bits(c)];
  });

  // ── 결과 파일 · 글
  $('#saveFile').click();
  const dl = await H.takeDownloads();
  let fileObj = null;
  await tryOk('결과 파일 저장: 이름 TMTF_P02_R_날짜_시각.json · 형식 · 회기 하나(측정 · 시행 · 연습 · 사건 · 준비 · build 다) · 저장 기록', async () => {
    fileObj = JSON.parse(await dl[0].blob.text());
    const s = fileObj.sessions[0];
    return [dl.length === 1 && /^TMTF_P02_R_\d{4}-\d\d-\d\d_\d\d-\d\d\.json$/.test(dl[0].name) && fileObj.format === 'ci-tmtf-public' && fileObj.formatVersion === 1 && fileObj.procKey === PROC_KEY && fileObj.sessions.length === 1
      && s.id === sess.id && s.runs.length === sess.runs.length && s.practiceTrials.length === 3 && s.events.length === sess.events.length && s.setup.noise.length === 1 && s.build.sha256 === H.expectBuild && sess.exports.some(x => x.how === 'file'),
      dl[0]?.name];
  });
  if (H.dump && fileObj) H.dump(fileObj);
  $('#saveReport').click();
  const repDl = await H.takeDownloads();
  await tryOk('전문가용 보고서 저장(.html): 참고용·비진단 고지 · 자극·계단 명세 · 결과표 · TMTF/계단 SVG · HTTPS/무결성 · CSP · 원시 시행표 · 외부 자원 없음 · 저장 기록', async () => {
    const h = repDl[0] ? await repDl[0].blob.text() : '';
    const okName = repDl.length === 1 && /^TMTF_report_P02_R_\d{4}-\d\d-\d\d_\d\d-\d\d\.html$/.test(repDl[0].name);
    const hasCore = h.includes('참고용 고지 — 진단 도구가 아닙니다') && h.includes('임상·연구 참고용')
      && h.includes('광대역 가우스 잡음') && h.includes('−26.02 dBFS') && h.includes('2-down 1-up') && h.includes('70.7%')
      && h.includes(PROC_KEY) && h.includes('자리별 맞힘 1·2·3 (모르겠음 제외)') && h.includes('계단 사후 재계산 (replayCheck)')
      && h.includes('HTTPS 보안 연결') && h.includes("connect-src 'none'") && h.includes('name="referrer" content="no-referrer"')
      && h.includes(H.expectBuild) && h.includes('<svg class="chart"') && h.includes('<details class="raw">')
      && !/\b(?:src|href)\s*=\s*["']https?:/i.test(h) && !/url\(\s*['"]?https?:/i.test(h);
    const logged = sess.exports.some(x => x.how === 'report-html' && x.name === repDl[0]?.name) && $('#sendState').textContent.includes(repDl[0]?.name);
    return [okName && hasCore && logged, `${repDl[0]?.name} len=${h.length}`];
  });
  $('#copyText').click();
  await wait(20);
  await tryOk('결과 글 복사: 번호 · 귀 · 주파수마다 값 · 앱 판 · 안내', () => {
    const t = H.clip.at(-1)?.text || '';
    return [t.startsWith('소리 떨림 검사 결과 (TMTF)\nP02 · 오른쪽 · 선으로 처리기에 연결') && PLAN_FMS.every(f => t.includes(`\n${f} Hz: `)) && t.includes(`(앱 ${APP_VERSION})`) && $('#sendState').textContent.includes('복사했습니다') && sess.exports.some(x => x.how === 'copy-text'), t.slice(0, 200)];
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
  $('#vHome').click(); $('#goSetup').click(); $('#setupNext').click();
  $('#volOk').click();
  const nS = DB.sessions.length, nD = DB.decisions.length;
  H.override['js/app.js'] = H.fileBytes('js/app.js') && new TextDecoder().decode(H.fileBytes('js/app.js')).replace(/const APP_VERSION = '[^']+'/, "const APP_VERSION = '9.9.9 (시험)'");
  $('#soundNext').click();
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
    $('#soundNext').click();
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
    $('#toHome').click(); $('#goSetup').click(); $('#setupNext').click(); $('#volOk').click();
  }

  // ── 중간에 끝내기 · 나가기 경고 · 출력 확인
  $('#soundNext').click();
  await until(() => S && S.cur && S.cur.practice && awaiting, 20000, '셋째 회기 연습');
  const s3 = S.session;
  await tryOk('새 회기: 귀 · 듣는 방법은 그대로, 준비 기록은 새로(잡음 0 · 들어 보기 0) · build pass · 다른 파일 없음', () => [s3 !== sess && s3.ear === 'R' && s3.path === 'wired' && s3.setup.noise.length === 0 && s3.setup.demo.length === 0 && s3.build.verified.status === 'pass' && s3.build.differ.length === 0, JSON.stringify(s3.build.differ)]);
  {
    let prevented = false;
    H.wins.beforeunload.forEach(f => f({ preventDefault() { prevented = true; }, returnValue: undefined }));
    ok('검사 중 나가려 하면 브라우저가 묻게 함(beforeunload)', prevented, '');
  }
  for (let k = 0; k < 3; k++) { await until(() => awaiting && S.cur?.practice, 10000, '연습 답'); H.key(String(awaiting.tg + 1)); await until(() => !awaiting, 5000); }
  await until(() => vis('#pgBreak'), 10000, '연습 끝');
  ok('연습 3번 모두 맞음 → 도움말 없음', $('#bBody').textContent.includes('3번 가운데 3번') && !$('#bBody').textContent.includes('볼륨을 조금 키우거나'), $('#bBody').textContent.slice(0, 80));
  await wait(60);
  await tryOk('출력 확인: 회기 중 1초마다 — 오디오가 돌고 시계가 흐르면 ‘나오는 중’', () => [KEEPMON.polls > 0 && (KEEPMON.ok > 0 || KEEPMON.buffer > 0) && !KEEPMON.open && KEEPMON.last && KEEPMON.last.cls !== 'gap', JSON.stringify(KEEPMON.last)]);
  await H.ctxs[0].suspend();
  await wait(60);
  await tryOk('오디오가 멈춤(suspended) → 끊김 열림 · 회기 사건 keep-gap-start(까닭)', () => [!!KEEPMON.open && s3.events.some(e => e.type === 'keep-gap-start' && /suspended/.test(e.why)), JSON.stringify(KEEPMON.open)]);
  await H.ctxs[0].resume();
  await wait(60);
  await tryOk('다시 돎 → 끊김 닫힘 · keep-gap-end(길이)', () => [!KEEPMON.open && s3.events.some(e => e.type === 'keep-gap-end' && typeof e.durS === 'number'), '']);
  $('#bEnd').click();
  await tryOk('‘오늘은 여기까지’ → 중간에 끝냄(남은 측정 5개) · 회기 닫음 · 결과 화면(측정 없음) · 끝 질문 보임 · 출력 확인 요약', () => [S === null && s3.endReason === '중간에 끝냄 (남은 측정 5개)' && !!s3.end && vis('#pgEnd') && $('#endTable').textContent.includes('끝난 측정이 없습니다') && !!$('#focusPick') && s3.keepMonitor && s3.keepMonitor.gaps.length === 1, s3.endReason]);
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
      && !html0.includes('unsafe-inline') && html0.includes('name="referrer" content="no-referrer"');
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
  ok('경고창은 새 판 하나뿐(지문만 다른 것은 경고 없음) · 확인 창은 멈춤 둘뿐', H.dialogs.filter(d => d[0] === 'alert').length === 1 && H.dialogs.filter(d => d[0] === 'confirm').length === 2, JSON.stringify(H.dialogs).slice(0, 200));
  clearInterval(KEEPMON_TIMER);
})();
