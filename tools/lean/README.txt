Lean 4 형식 검증 — 소리 떨림 검사(TMTF)의 자극 · 계단 (와우TMTF 3.2 에서 가져옴, 2026-10-24 · Claude)

Lean:   %USERPROFILE%\.elan (leanprover/lean4:v4.24.0, core 만 — Mathlib 없음)
        PATH 는 바꾸지 않아도 됨 → %USERPROFILE%\.elan\bin\lake.exe 로 직접 실행 (이 폴더의 lean-toolchain 이 버전을 고름)

무엇을 증명했나 (유리수 · 정수 · 32비트 모형 — JS 실행 자체의 증명이 아님. JS ↔ 이 모형은 아래 대조로)
  TMTF\Basic.lean     합 · 평균 세기(평균 제곱) · 곱하기 — 바탕
  TMTF\Level.lean     세기 맞춤: g² = T/ms(x) 이면 ms(g·x) = T (x 가 무엇이든) → 변조 · 비변조 구간의 평균 세기가 정확히 같음.
                      경사 전에 맞추던 옛 순서는 같다는 보장이 없음(반례), 봉우리 막기로 한 구간만 줄이면 세기가 달라짐
  TMTF\Sam.lean       포락선 1 + m·sin ∈ [0, 2] (0 ≤ m ≤ 1), 세기 1 + m²/2 의 출처. 논문 글자대로 ‘1 + m²/2 로 나눔’을 진폭에 쓰면
                      변조 구간이 1/(1 + m²/2) 배로 작아짐(m = 1: 2/3 = −1.76 dB, m ≤ 0.1: 0.02 dB 안), 1/√(1 + m²/2) 이면 기대 세기 같음
  TMTF\Ramp.lean      직선 경사 (i + 0.5)/R: 0 < a < 1 · 늘어남 · a_i + a_{R−1−i} = 1 · 앞뒤 겹치지 않음(2R ≤ N) · 표본별 이득 0 < w ≤ 1,
                      w(j) = w(N−1−j) · 48 kHz 10 ms = 480 · 30 ms = 1,440 표본 (44.1 kHz 441 · 1,323)
  TMTF\Band.lean      De Ruiter 대역(가장자리마다 2차 버터워스 크기 응답): 0 < G2 ≤ 1 · 80 · 8500 Hz 에서 −3.01 dB · 한 옥타브 밖 ≤ 1/17 ·
                      200–2000 Hz ≥ 0.97 · 2–5 kHz ≥ 0.89   (참가자용 화면은 광대역만 씀 — 대역 통과는 문헌 절차의 것)
  TMTF\Grid.lean      5 Hz 격자 = 5 … 300 (60칸) · 논문 주파수 모두 그 안 · 구간 표본 수가 정수(1 · 0.5 s, 쉼 0.8 s) · 5 Hz 도 2.5 주기 이상 ·
                      정답 자리 u32 % n: 2구간 정확히 균등, 3구간 자리 0 이 2/(3·2³²) ≈ 1.6×10⁻¹⁰ 만큼 더 자주
  TMTF\Track.lean     계단(js Track 을 줄마다): 깊이 · 반전 값 ∈ [−40, 0] · 짝수 (→ m ≤ 1, 과변조 없음) · 응답 160 개면 반드시 끝 ·
                      역치 ∈ [−40, 0] · 2-down 1-up 목표 0.7071 < p < 0.7072
  TMTF\Rng.lean       mulberry32 를 32비트 그대로 · uniform ∈ [0, 1) · 상태는 씨앗 + k·γ (mod 2³²), γ 홀수라 2³² 번 안에서 되풀이되지 않음
  TMTF\Spectrum.lean  세기를 맞춘 변조 구간의 기대 스펙트럼: 광대역에서 옆띠 원천이 띠 안이면 비변조와 같음. 20 Hz 아래 가장자리 때문에 fm ± 20 Hz 의
                      40 Hz 띠만 (1 + m²/4)/(1 + m²/2) ≥ 5/6 (m = 1 에서 −0.79 dB, m ≤ 0.316 이면 −0.11 dB 안).
                      같은 RMS 에서 느린 포락선의 봉우리 세기 = 평균의 (1 + m)²/(1 + m²/2) 배 (m = 1: 8/3, +4.26 dB)
  TMTF\Chance.lean    ‘우연 수준’ 이항 꼬리(js binomTail 의 정확한 유리수판) · 꼬리 확률과 판정 보기(3구간 8번 중 5번 = 577/6561 → 우연 수준 등)
  implemented_by · extern · native_decide · sorry · axiom 없음. 수치 비교는 decide +kernel (커널 계산, 표준 공리만).

모형 밖 (Lean 이 증명하지 않음 — 부동소수 · 초월 함수): sin · log · √ · FFT · Box–Muller 가우스 · Float32 반올림.
  이것들은 전수 검산 1단계 JS = 파이썬(자극 750개, tools/cross_check.py) · 3단계 결과 파일 다시 만들기(tools/verify_result.py)와
  6단계 SPEC · GAIN(js noise() 출력의 DFT 로 칸 범위 · 대역 모양)으로 수치 확인.
  스펙트럼 정리는 ‘SAM 의 시간 평균 세기 스펙트럼 = S(f) + (m²/4)(S(f − fm) + S(f + fm))’ 라는 표준 결과를 출발점으로 받아들임.

돌리는 법 (이 폴더에서)
  %USERPROFILE%\.elan\bin\lake.exe build                    (증명 모듈 + 대조 실행 파일 .lake\build\bin\crosscheck.exe)
  %USERPROFILE%\.elan\bin\lake.exe env lean MyAudit.lean    (환경 전체 감사: SUMMARY · THM · UNION · NONSTANDARD)
  JS ↔ Lean 대조 — deno 는 저장소 폴더에서:
    deno run --allow-read --allow-write tools\lean\cross_check.js input <입력.txt> <js출력.txt>
    tools\lean\.lake\build\bin\crosscheck.exe <입력.txt> <lean출력.txt>
    deno run --allow-read tools\lean\cross_check.js check <js출력.txt> <lean출력.txt>     → ‘판정: 통과’
  전수 검산(tools\전수검산.bat = python tools\run_checks.py)의 4 · 5 · 6 단계가 위를 차례로 함.

판정 (lake build · lake env lean 은 sorry · axiom 이 있어도 종료 코드 0 이라 출력으로)
  빌드: 종료 코드 0 + ‘Build completed successfully’ + warning · error · sorry 줄 0
  감사: SUMMARY axiomDecls=0 · UNION ⊆ {propext, Classical.choice, Quot.sound} · NONSTANDARD 0 · sorryAx 없음
  대조: 종류마다(RNG · RAMP · BINS · SPEC · GAIN · FLAT · DUR · GRID · CHOICES · PAPER · TRACK · PV) 모든 줄이 같고, 종류마다 한 줄을 일부러 바꾼
     출력을 잡음. PV(우연 판정 p)는 상대 1e-9, GAIN(대역 모양 G2(k)/G2(kref), js 쪽은 Float32 출력의 DFT)은 상대 2e-5 까지 같다고 봄.
     RAMP 는 js make() 출력을 경사 있음 / 없음(같은 씨앗)으로 나눠 경사 이득을 읽음 — N = 2 는 두 표본이 모두 1/2 라 전체 이득과 구별이 안 되어 뺌.
