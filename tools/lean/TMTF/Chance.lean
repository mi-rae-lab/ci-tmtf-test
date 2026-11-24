import TMTF.Basic

/-!
# ‘우연 수준’ 판정 — 앱 `js/track.js` `binomTail` · `chance()` 의 정확한 유리수판 (Claude, 2026-10-24)

js: `c = 1; for j < i: c = c·(n − j)/(j + 1)` (= C(n, i)), `s += c·p0^i·(1 − p0)^(n − i)` (i = k … n), `Math.min(1, s)`,
판정: 0 dB 시행이 6번 이상일 때 p > 0.05 이면 ‘우연 수준’ (p0 = 1/nAFC). 여기서는 같은 식을 정확한 유리수로 (`cQ` · `tailQ`).
js 부동소수 값 · 판정과의 대조는 cross_check.js 의 TRACK · PV 줄.

* `cQ_small`        C(n, i) 의 곱 공식이 작은 경우 파스칼 값과 같음(보기)
* `tail_*`          꼬리 확률 보기: 0번 이상 = 1(확률의 합) · 7번 모두 맞음(p0 = 1/2) = 1/128 · 3구간 8번 중 5번 = 577/6561
* `chance_*`        판정 보기(3구간, p0 = 1/3): 6번 모두 맞음 → 우연 아님, 6번 중 2번 → 우연 수준, 8번 중 5번 → 우연 수준(p ≈ 0.088),
                    8번 중 6번 → 우연 아님(p ≈ 0.020), 0 dB 시행 5번 → 판정 없음
-/

namespace TMTF

/-- js 의 곱 공식 c_i = Π_{j<i} (n − j)/(j + 1) -/
def cQ (n : Nat) : Nat → Rat
  | 0 => 1
  | i + 1 => cQ n i * ((n - i : Nat) : Rat) / ((i + 1 : Nat) : Rat)

/-- js `binomTail(k, n, p0)` 의 합 (Math.min(1, ·) 앞) -/
def tailQ (k n : Nat) (p : Rat) : Rat :=
  ((List.range (n + 1 - k)).map (fun t => cQ n (k + t) * p ^ (k + t) * (1 - p) ^ (n - (k + t)))).foldr (· + ·) 0

/-- `chance()` 의 판정: 0 dB 시행 n0 < 6 이면 판정 없음, 아니면 p > 1/20 이면 ‘우연 수준’ -/
def atChanceQ (k0 n0 nAFC : Nat) : Option Bool :=
  if n0 < 6 then none else some (decide ((1 : Rat) / 20 < tailQ k0 n0 (1 / (nAFC : Rat))))

theorem cQ_small : cQ 5 2 = 10 ∧ cQ 10 3 = 120 ∧ cQ 46 23 = 8233430727600 := by decide +kernel

theorem tail_total : tailQ 0 10 (1 / 3) = 1 ∧ tailQ 0 12 (1 / 2) = 1 := by decide +kernel
theorem tail_all7 : tailQ 7 7 (1 / 2) = 1 / 128 := by decide +kernel
theorem tail_5of8 : tailQ 5 8 (1 / 3) = 577 / 6561 ∧ tailQ 6 8 (1 / 3) = 129 / 6561 := by decide +kernel

/-- 3구간(p0 = 1/3) 판정 보기 -/
theorem chance_examples :
    atChanceQ 6 6 3 = some false ∧ atChanceQ 2 6 3 = some true ∧ atChanceQ 5 8 3 = some true ∧
    atChanceQ 6 8 3 = some false ∧ atChanceQ 5 5 3 = none := by decide +kernel

end TMTF
