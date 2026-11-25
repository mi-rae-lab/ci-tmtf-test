module

public import Mathlib.Analysis.SpecialFunctions.Trigonometric.Basic
public import Mathlib.Analysis.SpecialFunctions.Pow.Real
public import Mathlib.Analysis.SpecialFunctions.Log.Base
import Mathlib.Algebra.Field.GeomSum
import Mathlib.Tactic.Ring
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.NormNum

/-!
# 실수 · 복소수 해석 형식 검증 — Mathlib 4 (v4.36.0) 기반

core Lean 4 유리수 모형(`TMTF.Level` · `TMTF.Sam` · `TMTF.Ramp` · `TMTF.Band` · `TMTF.Track` · `TMTF.Spectrum`)에서
초월 함수와 제곱근·복소수가 없어 다룰 수 없었던 `js/stim.js` · `js/track.js` 의 실수(`ℝ`) · 복소수(`ℂ`) 성질을 직접 증명함:

1. **실수 RMS 정규화 (`js/stim.js` `rms`, `make`)**:
   `rmsR (c·x) = |c|·rmsR x`, `g = T / rmsR x` 이면 `rmsR (g·x) = T`,
   변조·비변조 두 구간의 실수 RMS 정확 일치, `TARGET_RMS = 0.05` 의 dBFS 범위 `(−26.021, −26.020)` 및 헤드룸.
2. **dB ↔ 선형 변조 깊이 (`10^(D/20)` · `20·log₁₀ m`)와 실제 `Real.sin` 과변조 없음**:
   `modDepth` 양수 · 단조증가 · `D = 0 → 1` · `D = −40 → 1/100` · `depthDb`/`modDepth` 정확 역함수,
   `D ≤ 0` 이면 모든 주파수 `fm` · 시각 `t` · 무작위 위상 `φ` 에서 `0 ≤ 1 + 10^(D/20)·sin(2π·fm·t + φ) ≤ 2`.
3. **임의의 주기 표본 수 `K ≥ 3` 및 임의의 무작위 위상 `φ ∈ ℝ` 에 대한 실제 `Real.sin` SAM 세기**
   (Viemeister 1979; Shen & Richards 2013):
   복소 단위근 합(`∑ exp(2πi a k / K) = 0`)으로부터
   `∑ sin(2πk/K + φ) = 0`, `∑ sin²(2πk/K + φ) = K/2`,
   평균 제곱 `(1/K) ∑ (1 + m·sin(2πk/K + φ))² = 1 + m²/2`,
   Viemeister 제곱근 보정 `1/√(1 + m²/2)` 의 정확 세기 보존 `= 1`,
   및 `10·log₁₀(3/2)` · `10·log₁₀(5/6)` · `10·log₁₀(8/3)` 의 실제 `Real.logb 10` 범위.
4. **올림 코사인(`cos²`) 경사 (`js/stim.js` `Math.sin(t * π / 2) ** 2`)**:
   `0 ≤ cos2Ramp t ≤ 1`, `(0, 1)` 에서 `0 < cos2Ramp t < 1`, 상보 대칭 `cos2Ramp t + cos2Ramp (1 − t) = 1`, `[0, 1]` 순증가.
5. **버터워스 대역통과 실수 이득 (`js/stim.js` `1 / Math.sqrt(...)`)**:
   `0 < bpGainR ≤ 1` 및 제곱 = 유리수 크기 제곱 응답 `G2`.
6. **Box–Muller 가우스 생성 (`js/stim.js` `gauss`)**:
   `0 < u ≤ 1` 이면 `−2·ln u ≥ 0` (`Math.sqrt` 의 `NaN` 원천 불가) 및 `(r·cos(2πv))² + (r·sin(2πv))² = −2·ln u`.
7. **켤레 대칭 역 푸리에 변환(IDFT)의 순수 실수 출력 및 Parseval 항등식 (`js/stim.js` `noise`)**:
   `X 0` 실수이고 `X (n − k) = conj (X k)` 이면 모든 표본 `j` 에서 `(idft n X j).im = 0` (`out[i] = re[i]` 무손실),
   `noise()` 의 `[kStart, kEnd]` 스펙트럼 구성이 이 조건을 만족함,
   및 Parseval 항등식 `∑ ‖idft n X j‖² = (1/n) ∑ ‖X k‖²`.
8. **Levitt (1971) 2-down 1-up 실수 수렴점 (`p = 1/√2`)**:
   `p² = 1/2` 및 `0.7071 < 1/√2 < 0.7072`.
9. **변조 깊이 추정기 `measureDepth` (`js/stim.js`)의 위상 불변 정확 복원**:
   이상 포락선 `A·(1 + m·sin(2π k_m i / L + φ))` 에서 `(2·√(c² + s²)/L)/mean = m` (`A > 0, m ≥ 0`, 임의의 `φ ∈ ℝ`).
-/

@[expose] public section

namespace TMTF

open scoped BigOperators

/-! ## 1. 실수 RMS 정규화 (`js/stim.js` `rms`, `make`) -/

/-- 실수 신호의 평균 제곱(평균 세기) -/
noncomputable def msR (x : Nat → ℝ) (n : Nat) : ℝ :=
  (∑ i ∈ Finset.range n, (x i) ^ 2) / (n : ℝ)

/-- 실수 신호의 RMS (`js/stim.js` `rms`) -/
noncomputable def rmsR (x : Nat → ℝ) (n : Nat) : ℝ :=
  Real.sqrt (msR x n)

/-- 앱 목표 RMS (`js/stim.js` `TARGET_RMS = 0.05`) -/
noncomputable def targetRmsR : ℝ := 1 / 20

theorem msR_nonneg (x : Nat → ℝ) (n : Nat) : 0 ≤ msR x n := by
  unfold msR
  apply div_nonneg
  · exact Finset.sum_nonneg fun i _ => sq_nonneg (x i)
  · exact Nat.cast_nonneg n

theorem rmsR_nonneg (x : Nat → ℝ) (n : Nat) : 0 ≤ rmsR x n :=
  Real.sqrt_nonneg _

theorem msR_scale (c : ℝ) (x : Nat → ℝ) (n : Nat) :
    msR (fun i => c * x i) n = c ^ 2 * msR x n := by
  unfold msR
  have h : ∑ i ∈ Finset.range n, (c * x i) ^ 2 = c ^ 2 * ∑ i ∈ Finset.range n, (x i) ^ 2 := by
    rw [Finset.mul_sum]
    refine Finset.sum_congr rfl fun i _ => ?_
    ring
  rw [h, mul_div_assoc]

theorem rmsR_scale (c : ℝ) (x : Nat → ℝ) (n : Nat) :
    rmsR (fun i => c * x i) n = |c| * rmsR x n := by
  unfold rmsR
  rw [msR_scale, Real.sqrt_mul (sq_nonneg c), Real.sqrt_sq_eq_abs]

/-- `g = T / rms(x)` 를 곱하면 실수 RMS 는 정확히 `T` (`js/stim.js` L126) -/
theorem rmsR_equalized {x : Nat → ℝ} {n : Nat} {T : ℝ} (hT : 0 ≤ T) (hx : 0 < rmsR x n) :
    rmsR (fun i => (T / rmsR x n) * x i) n = T := by
  rw [rmsR_scale]
  have hdiv : 0 ≤ T / rmsR x n := div_nonneg hT hx.le
  rw [abs_of_nonneg hdiv, div_mul_cancel₀ T hx.ne']

/-- 변조 · 비변조 두 구간을 각자 `T / rms` 로 맞추면 실수 RMS 가 정확히 같음 -/
theorem equal_rmsR {a b : Nat → ℝ} {na nb : Nat} {T : ℝ}
    (hT : 0 ≤ T) (ha : 0 < rmsR a na) (hb : 0 < rmsR b nb) :
    rmsR (fun i => (T / rmsR a na) * a i) na = rmsR (fun i => (T / rmsR b nb) * b i) nb := by
  rw [rmsR_equalized hT ha, rmsR_equalized hT hb]

/-- `TARGET_RMS = 0.05` 에서 `m = 1` · `4.5σ` 잡음 봉우리 `= 0.45 < 0.99` 헤드룸 -/
theorem targetRms_headroom :
    (45 / 10 : ℝ) * (2 * targetRmsR) = 9 / 20 ∧ (9 / 20 : ℝ) < 99 / 100 := by
  unfold targetRmsR
  constructor <;> norm_num

/-! ## 2. dB ↔ 선형 변조 깊이 (`10^(D/20)`) 및 실제 `Real.sin` 과변조 없음 -/

/-- 데시벨 깊이 `D` 의 선형 변조 깊이 `m = 10^(D/20)` (`js/stim.js` L111) -/
noncomputable def modDepth (D : ℝ) : ℝ := (10 : ℝ) ^ (D / 20)

/-- 선형 변조 깊이 `m` 의 데시벨 표현 `20·log₁₀ m` -/
noncomputable def depthDb (m : ℝ) : ℝ := 20 * Real.logb 10 m

theorem modDepth_pos (D : ℝ) : 0 < modDepth D :=
  Real.rpow_pos_of_pos (by norm_num) _

theorem modDepth_zero : modDepth 0 = 1 := by
  unfold modDepth
  norm_num

theorem modDepth_neg40 : modDepth (-40) = 1 / 100 := by
  unfold modDepth
  have h : (-40 : ℝ) / 20 = (-2 : ℤ) := by norm_num
  rw [h, Real.rpow_intCast]
  norm_num

theorem modDepth_le_one {D : ℝ} (hD : D ≤ 0) : modDepth D ≤ 1 := by
  unfold modDepth
  calc (10 : ℝ) ^ (D / 20) ≤ (10 : ℝ) ^ (0 : ℝ) :=
        Real.rpow_le_rpow_of_exponent_le (by norm_num) (by linarith)
    _ = 1 := Real.rpow_zero 10

theorem modDepth_strictMono : StrictMono modDepth := by
  intro a b hab
  unfold modDepth
  exact Real.rpow_lt_rpow_of_exponent_lt (by norm_num) (by linarith)

theorem depthDb_modDepth (D : ℝ) : depthDb (modDepth D) = D := by
  unfold depthDb modDepth
  rw [Real.logb_rpow (by norm_num) (by norm_num)]
  ring

theorem modDepth_depthDb {m : ℝ} (hm : 0 < m) : modDepth (depthDb m) = m := by
  unfold modDepth depthDb
  have h : 20 * Real.logb 10 m / 20 = Real.logb 10 m := by ring
  rw [h, Real.rpow_logb (by norm_num) (by norm_num) hm]

/-- `D ≤ 0` (`Track` 계단 범위 `[-40, 0]`)이면 모든 `fm, t, φ` 에서 실제 `sin` 포락선이 `[0, 2]` 안 → 과변조 없음 -/
theorem sam_env_bounds {D : ℝ} (hD : D ≤ 0) (fm t φ : ℝ) :
    0 ≤ 1 + modDepth D * Real.sin (2 * Real.pi * fm * t + φ) ∧
    1 + modDepth D * Real.sin (2 * Real.pi * fm * t + φ) ≤ 2 := by
  have hm0 : 0 ≤ modDepth D := (modDepth_pos D).le
  have hm1 : modDepth D ≤ 1 := modDepth_le_one hD
  have hs0 : -1 ≤ Real.sin (2 * Real.pi * fm * t + φ) := Real.neg_one_le_sin _
  have hs1 : Real.sin (2 * Real.pi * fm * t + φ) ≤ 1 := Real.sin_le_one _
  constructor
  · have h1 : -modDepth D ≤ modDepth D * Real.sin (2 * Real.pi * fm * t + φ) := by
      have := mul_le_mul_of_nonneg_left hs0 hm0
      linarith
    linarith
  · have h2 : modDepth D * Real.sin (2 * Real.pi * fm * t + φ) ≤ modDepth D := by
      have := mul_le_mul_of_nonneg_left hs1 hm0
      linarith
    linarith

/-! ### `Real.logb 10` 정확한 데시벨 경계 -/

private theorem logb10_lower_of_pow {x : ℝ} (hx : 0 < x) {b : ℕ} {k : ℕ}
    (h1 : (10 : ℝ) ^ k < x ^ b) (hb : 0 < b) :
    (k : ℝ) / (b : ℝ) < Real.logb 10 x := by
  have hbR : (0 : ℝ) < (b : ℝ) := Nat.cast_pos.mpr hb
  rw [Real.lt_logb_iff_rpow_lt (by norm_num) hx]
  have hpow : ((10 : ℝ) ^ ((k : ℝ) / (b : ℝ))) ^ (b : ℝ) < x ^ (b : ℝ) := by
    rw [← Real.rpow_mul (by norm_num)]
    have hmul : (k : ℝ) / (b : ℝ) * (b : ℝ) = (k : ℝ) := div_mul_cancel₀ _ hbR.ne'
    rw [hmul, Real.rpow_natCast, Real.rpow_natCast]
    exact h1
  by_contra hle
  have hle' : x ≤ (10 : ℝ) ^ ((k : ℝ) / (b : ℝ)) := not_lt.mp hle
  have hge := Real.rpow_le_rpow hx.le hle' hbR.le
  linarith

private theorem logb10_upper_of_pow {x : ℝ} (hx : 0 < x) {b : ℕ} {k : ℕ}
    (h1 : x ^ b < (10 : ℝ) ^ k) (hb : 0 < b) :
    Real.logb 10 x < (k : ℝ) / (b : ℝ) := by
  have hbR : (0 : ℝ) < (b : ℝ) := Nat.cast_pos.mpr hb
  rw [Real.logb_lt_iff_lt_rpow (by norm_num) hx]
  have hpow : x ^ (b : ℝ) < ((10 : ℝ) ^ ((k : ℝ) / (b : ℝ))) ^ (b : ℝ) := by
    rw [← Real.rpow_mul (by norm_num)]
    have hmul : (k : ℝ) / (b : ℝ) * (b : ℝ) = (k : ℝ) := div_mul_cancel₀ _ hbR.ne'
    rw [hmul, Real.rpow_natCast, Real.rpow_natCast]
    exact h1
  by_contra hle
  have hle' : (10 : ℝ) ^ ((k : ℝ) / (b : ℝ)) ≤ x := not_lt.mp hle
  have hge := Real.rpow_le_rpow (Real.rpow_pos_of_pos (by norm_num) _).le hle' hbR.le
  linarith

private theorem logb10_lower_of_nat_div {p q b k : ℕ} (hp : 0 < p) (hq : 0 < q) (hb : 0 < b)
    (h : q ^ b * 10 ^ k < p ^ b) :
    (k : ℝ) / (b : ℝ) < Real.logb 10 ((p : ℝ) / (q : ℝ)) := by
  have hqR : (0 : ℝ) < (q : ℝ) := Nat.cast_pos.mpr hq
  have hx : (0 : ℝ) < (p : ℝ) / (q : ℝ) := div_pos (Nat.cast_pos.mpr hp) hqR
  apply logb10_lower_of_pow hx _ hb
  rw [div_pow, lt_div_iff₀ (pow_pos hqR b)]
  have hR : ((q ^ b * 10 ^ k : ℕ) : ℝ) < ((p ^ b : ℕ) : ℝ) := Nat.cast_lt.mpr h
  push_cast at hR
  linarith

private theorem logb10_upper_of_nat_div {p q b k : ℕ} (hp : 0 < p) (hq : 0 < q) (hb : 0 < b)
    (h : p ^ b < q ^ b * 10 ^ k) :
    Real.logb 10 ((p : ℝ) / (q : ℝ)) < (k : ℝ) / (b : ℝ) := by
  have hqR : (0 : ℝ) < (q : ℝ) := Nat.cast_pos.mpr hq
  have hx : (0 : ℝ) < (p : ℝ) / (q : ℝ) := div_pos (Nat.cast_pos.mpr hp) hqR
  apply logb10_upper_of_pow hx _ hb
  rw [div_pow, div_lt_iff₀ (pow_pos hqR b)]
  have hR : ((p ^ b : ℕ) : ℝ) < ((q ^ b * 10 ^ k : ℕ) : ℝ) := Nat.cast_lt.mpr h
  push_cast at hR
  linarith

set_option exponentiation.threshold 2000 in
/-- `TARGET_RMS = 0.05` 는 정확히 `−26.021 < 20·log₁₀(0.05) < −26.020` dBFS -/
theorem targetRms_dbfs_bounds :
    -(26021 / 1000 : ℝ) < depthDb targetRmsR ∧ depthDb targetRmsR < -(26020 / 1000 : ℝ) := by
  unfold depthDb targetRmsR
  have hlog_eq : Real.logb 10 (1 / 20 : ℝ) = -(1 + Real.logb 10 2) := by
    have h1 : (1 / 20 : ℝ) = (20 : ℝ)⁻¹ := one_div 20
    have h2 : (20 : ℝ) = 10 * 2 := by norm_num
    rw [h1, Real.logb_inv, h2, Real.logb_mul (by norm_num) (by norm_num),
      Real.logb_self_eq_one (by norm_num)]
  -- 10^301 < 2^1000 ⇒ 301/1000 < log₁₀ 2
  have hlo2 : (301 : ℝ) / 1000 < Real.logb 10 2 := by
    have hnat : (10 : ℕ) ^ 301 < 2 ^ 1000 := by decide
    have hR : (10 : ℝ) ^ (301 : ℕ) < (2 : ℝ) ^ (1000 : ℕ) := by exact_mod_cast hnat
    exact logb10_lower_of_pow (b := 1000) (k := 301) (by norm_num) hR (by omega)
  -- 100·2^1000 < 108·10^301 과 108^20 < 10·100^20 ⇒ 2^20000 < 10^6021 ⇒ log₁₀ 2 < 6021/20000
  have hhi2 : Real.logb 10 2 < (6021 : ℝ) / 20000 := by
    have ha_nat : 100 * 2 ^ 1000 < 108 * 10 ^ 301 := by decide
    have hb_nat : 108 ^ 20 < 10 * 100 ^ 20 := by decide
    have ha : (2 : ℝ) ^ (1000 : ℕ) < (108 / 100 : ℝ) * (10 : ℝ) ^ (301 : ℕ) := by
      have hR : ((100 * 2 ^ 1000 : ℕ) : ℝ) < ((108 * 10 ^ 301 : ℕ) : ℝ) := Nat.cast_lt.mpr ha_nat
      push_cast at hR
      linarith
    have hb : ((108 / 100 : ℝ)) ^ (20 : ℕ) < 10 := by
      have hR : ((108 ^ 20 : ℕ) : ℝ) < ((10 * 100 ^ 20 : ℕ) : ℝ) := Nat.cast_lt.mpr hb_nat
      push_cast at hR
      rw [div_pow, div_lt_iff₀ (by positivity)]
      linarith
    have hc : ((2 : ℝ) ^ (1000 : ℕ)) ^ (20 : ℕ) <
        ((108 / 100 : ℝ) * (10 : ℝ) ^ (301 : ℕ)) ^ (20 : ℕ) :=
      pow_lt_pow_left₀ ha (by positivity) (by omega)
    have hd : ((108 / 100 : ℝ) * (10 : ℝ) ^ (301 : ℕ)) ^ (20 : ℕ) =
        ((108 / 100 : ℝ)) ^ (20 : ℕ) * (10 : ℝ) ^ (6020 : ℕ) := by
      rw [mul_pow, ← pow_mul]
    have he : ((108 / 100 : ℝ)) ^ (20 : ℕ) * (10 : ℝ) ^ (6020 : ℕ) <
        10 * (10 : ℝ) ^ (6020 : ℕ) :=
      mul_lt_mul_of_pos_right hb (by positivity)
    have hf : ((2 : ℝ) ^ (1000 : ℕ)) ^ (20 : ℕ) = (2 : ℝ) ^ (20000 : ℕ) := by rw [← pow_mul]
    have hg : (10 : ℝ) * (10 : ℝ) ^ (6020 : ℕ) = (10 : ℝ) ^ (6021 : ℕ) := by
      rw [← pow_succ']
    have hfinal : (2 : ℝ) ^ (20000 : ℕ) < (10 : ℝ) ^ (6021 : ℕ) :=
      calc (2 : ℝ) ^ (20000 : ℕ) = ((2 : ℝ) ^ (1000 : ℕ)) ^ (20 : ℕ) := hf.symm
        _ < ((108 / 100 : ℝ) * (10 : ℝ) ^ (301 : ℕ)) ^ (20 : ℕ) := hc
        _ = ((108 / 100 : ℝ)) ^ (20 : ℕ) * (10 : ℝ) ^ (6020 : ℕ) := hd
        _ < 10 * (10 : ℝ) ^ (6020 : ℕ) := he
        _ = (10 : ℝ) ^ (6021 : ℕ) := hg
    exact logb10_upper_of_pow (b := 20000) (k := 6021) (by norm_num) hfinal (by omega)
  rw [hlog_eq]
  constructor <;> linarith

set_option exponentiation.threshold 2000 in
/-- 논문 글자대로의 보정(`m = 1` 에서 세기 비 `3/2`)의 실제 `10·log₁₀(3/2) ∈ (1.76, 1.77)` dB -/
theorem db_three_halves_real :
    (176 / 100 : ℝ) < 10 * Real.logb 10 (3 / 2 : ℝ) ∧
    10 * Real.logb 10 (3 / 2 : ℝ) < (177 / 100 : ℝ) := by
  have hlo : (176 : ℝ) / 1000 < Real.logb 10 ((3 : ℝ) / (2 : ℝ)) :=
    logb10_lower_of_nat_div (p := 3) (q := 2) (b := 1000) (k := 176)
      (by omega) (by omega) (by omega) (by decide)
  have hhi : Real.logb 10 ((3 : ℝ) / (2 : ℝ)) < (177 : ℝ) / 1000 :=
    logb10_upper_of_nat_div (p := 3) (q := 2) (b := 1000) (k := 177)
      (by omega) (by omega) (by omega) (by decide)
  constructor <;> linarith

set_option exponentiation.threshold 2000 in
/-- 옆띠 경계 40 Hz 띠(`m = 1` 비 `5/6`)의 실제 `10·log₁₀(5/6) ∈ (−0.80, −0.79)` dB -/
theorem strip_db_real :
    -(80 / 100 : ℝ) < 10 * Real.logb 10 (5 / 6 : ℝ) ∧
    10 * Real.logb 10 (5 / 6 : ℝ) < -(79 / 100 : ℝ) := by
  have hinv : Real.logb 10 (5 / 6 : ℝ) = -Real.logb 10 ((6 : ℝ) / (5 : ℝ)) := by
    have : (5 / 6 : ℝ) = ((6 : ℝ) / (5 : ℝ))⁻¹ := by norm_num
    rw [this, Real.logb_inv]
  have hlo : (79 : ℝ) / 1000 < Real.logb 10 ((6 : ℝ) / (5 : ℝ)) :=
    logb10_lower_of_nat_div (p := 6) (q := 5) (b := 1000) (k := 79)
      (by omega) (by omega) (by omega) (by decide)
  have hhi : Real.logb 10 ((6 : ℝ) / (5 : ℝ)) < (80 : ℝ) / 1000 :=
    logb10_upper_of_nat_div (p := 6) (q := 5) (b := 1000) (k := 80)
      (by omega) (by omega) (by omega) (by decide)
  rw [hinv]
  constructor <;> linarith

set_option exponentiation.threshold 2000 in
/-- 같은 RMS 에서 포락선 봉우리/평균 세기 비(`m = 1` 에서 `8/3`)의 실제 `10·log₁₀(8/3) ∈ (4.25, 4.26)` dB -/
theorem crest_m1_db_real :
    (425 / 100 : ℝ) < 10 * Real.logb 10 (8 / 3 : ℝ) ∧
    10 * Real.logb 10 (8 / 3 : ℝ) < (426 / 100 : ℝ) := by
  have hlo : (425 : ℝ) / 1000 < Real.logb 10 ((8 : ℝ) / (3 : ℝ)) :=
    logb10_lower_of_nat_div (p := 8) (q := 3) (b := 1000) (k := 425)
      (by omega) (by omega) (by omega) (by decide)
  have hhi : Real.logb 10 ((8 : ℝ) / (3 : ℝ)) < (426 : ℝ) / 1000 :=
    logb10_upper_of_nat_div (p := 8) (q := 3) (b := 1000) (k := 426)
      (by omega) (by omega) (by omega) (by decide)
  constructor <;> linarith

/-! ## 3. 임의의 `K ≥ 3` · 임의의 위상 `φ ∈ ℝ` 에 대한 실제 `Real.sin` SAM 세기 -/

/-- 복소 단위근의 합: `K ∤ a` 이면 `∑_{k < K} exp(2πi · a · k / K) = 0` -/
theorem exp_root_sum_zero {K : ℕ} (a : ℤ) (hK : 0 < K) (ha : ¬ (K : ℤ) ∣ a) :
    ∑ k ∈ Finset.range K,
      Complex.exp (2 * Real.pi * Complex.I * (a : ℂ) * (k : ℂ) / (K : ℂ)) = 0 := by
  set r : ℂ := Complex.exp (2 * Real.pi * Complex.I * (a : ℂ) / (K : ℂ))
  have hr_pow : ∀ k : ℕ,
      Complex.exp (2 * Real.pi * Complex.I * (a : ℂ) * (k : ℂ) / (K : ℂ)) = r ^ k := by
    intro k
    rw [← Complex.exp_nat_mul]
    congr 1
    ring
  simp_rw [hr_pow]
  have hr_ne_one : r ≠ 1 := by
    intro h
    rw [Complex.exp_eq_one_iff] at h
    rcases h with ⟨n, hn⟩
    have hpi : (2 * Real.pi * Complex.I : ℂ) ≠ 0 := by
      have h1 : (Real.pi : ℂ) ≠ 0 := Complex.ofReal_ne_zero.mpr Real.pi_ne_zero
      exact mul_ne_zero (mul_ne_zero two_ne_zero h1) Complex.I_ne_zero
    have hK_ne : (K : ℂ) ≠ 0 := Nat.cast_ne_zero.mpr hK.ne'
    have heq : (a : ℂ) / (K : ℂ) = (n : ℂ) := by
      apply mul_left_cancel₀ hpi
      have : 2 * Real.pi * Complex.I * ((a : ℂ) / (K : ℂ)) =
          2 * Real.pi * Complex.I * (a : ℂ) / (K : ℂ) := by ring
      rw [this, hn]
      ring
    have heq2 : (a : ℂ) = (n : ℂ) * (K : ℂ) := (div_eq_iff hK_ne).mp heq
    have hint : a = (K : ℤ) * n := by
      have hcast : ((a : ℤ) : ℂ) = (((K : ℤ) * n : ℤ) : ℂ) := by
        rw [heq2]
        push_cast
        ring
      exact_mod_cast hcast
    exact ha ⟨n, hint⟩
  rw [geom_sum_eq hr_ne_one]
  have hrK : r ^ K = 1 := by
    rw [← Complex.exp_nat_mul]
    have hK_ne : (K : ℂ) ≠ 0 := Nat.cast_ne_zero.mpr hK.ne'
    have harg : (K : ℂ) * (2 * Real.pi * Complex.I * (a : ℂ) / (K : ℂ)) =
        (a : ℂ) * (2 * Real.pi * Complex.I) := by
      field_simp [hK_ne]
    rw [harg, Complex.exp_int_mul_two_pi_mul_I]
  rw [hrK, sub_self, zero_div]

/-- `K ∤ a` 이면 임의의 위상 `φ ∈ ℝ` 에 대해 `∑_{k < K} cos(2π a k / K + φ) = 0` -/
theorem cos_harmonic_sum_zero {K : ℕ} (a : ℤ) (hK : 0 < K) (ha : ¬ (K : ℤ) ∣ a) (φ : ℝ) :
    ∑ k ∈ Finset.range K, Real.cos (2 * Real.pi * (a : ℝ) * (k : ℝ) / (K : ℝ) + φ) = 0 := by
  have hsum := exp_root_sum_zero a hK ha
  have hmul : Complex.exp ((φ : ℂ) * Complex.I) *
      ∑ k ∈ Finset.range K,
        Complex.exp (2 * Real.pi * Complex.I * (a : ℂ) * (k : ℂ) / (K : ℂ)) = 0 := by
    rw [hsum, mul_zero]
  rw [Finset.mul_sum] at hmul
  have hre : (∑ k ∈ Finset.range K,
      Complex.exp ((φ : ℂ) * Complex.I) *
        Complex.exp (2 * Real.pi * Complex.I * (a : ℂ) * (k : ℂ) / (K : ℂ))).re = 0 := by
    rw [hmul, Complex.zero_re]
  rw [Complex.re_sum] at hre
  rw [← hre]
  refine Finset.sum_congr rfl fun k _ => ?_
  rw [← Complex.exp_add]
  have harg : (φ : ℂ) * Complex.I + 2 * Real.pi * Complex.I * (a : ℂ) * (k : ℂ) / (K : ℂ) =
      (((2 * Real.pi * (a : ℝ) * (k : ℝ) / (K : ℝ) + φ : ℝ) : ℂ)) * Complex.I := by
    push_cast
    ring
  rw [harg, Complex.exp_ofReal_mul_I_re]

/-- `K ∤ a` 이면 임의의 위상 `φ ∈ ℝ` 에 대해 `∑_{k < K} sin(2π a k / K + φ) = 0` -/
theorem sin_harmonic_sum_zero {K : ℕ} (a : ℤ) (hK : 0 < K) (ha : ¬ (K : ℤ) ∣ a) (φ : ℝ) :
    ∑ k ∈ Finset.range K, Real.sin (2 * Real.pi * (a : ℝ) * (k : ℝ) / (K : ℝ) + φ) = 0 := by
  have hsum := exp_root_sum_zero a hK ha
  have hmul : Complex.exp ((φ : ℂ) * Complex.I) *
      ∑ k ∈ Finset.range K,
        Complex.exp (2 * Real.pi * Complex.I * (a : ℂ) * (k : ℂ) / (K : ℂ)) = 0 := by
    rw [hsum, mul_zero]
  rw [Finset.mul_sum] at hmul
  have him : (∑ k ∈ Finset.range K,
      Complex.exp ((φ : ℂ) * Complex.I) *
        Complex.exp (2 * Real.pi * Complex.I * (a : ℂ) * (k : ℂ) / (K : ℂ))).im = 0 := by
    rw [hmul, Complex.zero_im]
  rw [Complex.im_sum] at him
  rw [← him]
  refine Finset.sum_congr rfl fun k _ => ?_
  rw [← Complex.exp_add]
  have harg : (φ : ℂ) * Complex.I + 2 * Real.pi * Complex.I * (a : ℂ) * (k : ℂ) / (K : ℂ) =
      (((2 * Real.pi * (a : ℝ) * (k : ℝ) / (K : ℝ) + φ : ℝ) : ℂ)) * Complex.I := by
    push_cast
    ring
  rw [harg, Complex.exp_ofReal_mul_I_im]

/-- `K ≥ 2`, 임의의 위상 `φ`: 한 주기 균등 표본의 사인 합 = 0 -/
theorem sin_cycle_sum_zero {K : ℕ} (hK : 2 ≤ K) (φ : ℝ) :
    ∑ k ∈ Finset.range K, Real.sin (2 * Real.pi * (k : ℝ) / (K : ℝ) + φ) = 0 := by
  have hndiv : ¬ (K : ℤ) ∣ (1 : ℤ) := by
    intro ⟨q, hq⟩
    have hK2 : (2 : ℤ) ≤ (K : ℤ) := by exact_mod_cast hK
    have hq0 : q ≤ 0 ∨ 1 ≤ q := by omega
    rcases hq0 with hq0 | hq1
    · nlinarith
    · nlinarith
  have h := sin_harmonic_sum_zero 1 (by omega) hndiv φ
  convert h using 2 with k
  push_cast
  ring_nf

/-- `K ≥ 3`, 임의의 위상 `φ`: 한 주기 균등 표본의 사인 제곱 합 = `K / 2` -/
theorem sin_sq_cycle_sum {K : ℕ} (hK : 3 ≤ K) (φ : ℝ) :
    ∑ k ∈ Finset.range K, (Real.sin (2 * Real.pi * (k : ℝ) / (K : ℝ) + φ)) ^ 2 = (K : ℝ) / 2 := by
  have hndiv : ¬ (K : ℤ) ∣ (2 : ℤ) := by
    intro ⟨q, hq⟩
    have hK3 : (3 : ℤ) ≤ (K : ℤ) := by exact_mod_cast hK
    have hq0 : q ≤ 0 ∨ 1 ≤ q := by omega
    rcases hq0 with hq0 | hq1
    · nlinarith
    · nlinarith
  have hcos := cos_harmonic_sum_zero 2 (by omega) hndiv (2 * φ)
  have hident : ∀ k : ℕ,
      (Real.sin (2 * Real.pi * (k : ℝ) / (K : ℝ) + φ)) ^ 2 =
        (1 / 2 : ℝ) * (1 - Real.cos (2 * Real.pi * ((2 : ℤ) : ℝ) * (k : ℝ) / (K : ℝ) + 2 * φ)) := by
    intro k
    have h2 : 2 * Real.pi * ((2 : ℤ) : ℝ) * (k : ℝ) / (K : ℝ) + 2 * φ =
        2 * (2 * Real.pi * (k : ℝ) / (K : ℝ) + φ) := by push_cast; ring
    have hcs := Real.sin_sq_add_cos_sq (2 * Real.pi * (k : ℝ) / (K : ℝ) + φ)
    rw [h2, Real.cos_two_mul']
    linarith
  simp_rw [hident]
  rw [← Finset.mul_sum, Finset.sum_sub_distrib, Finset.sum_const, Finset.card_range,
    nsmul_eq_mul, mul_one, hcos, sub_zero]
  ring

/-- **핵심 정리 (Viemeister 1979 · Shen & Richards 2013)**:
    임의의 `K ≥ 3`, 임의의 변조 깊이 `m ∈ ℝ`, 임의의 시작 위상 `φ ∈ ℝ` 에서
    실제 `Real.sin` 정현 진폭 변조 포락선 `1 + m·sin(2πk/K + φ)` 의 한 주기 평균 제곱 = `1 + m²/2` -/
theorem sam_real_cycle_power {K : ℕ} (hK : 3 ≤ K) (m φ : ℝ) :
    (1 / (K : ℝ)) *
      ∑ k ∈ Finset.range K, (1 + m * Real.sin (2 * Real.pi * (k : ℝ) / (K : ℝ) + φ)) ^ 2 =
      1 + m ^ 2 / 2 := by
  have hKpos : (0 : ℝ) < (K : ℝ) := Nat.cast_pos.mpr (by omega)
  have hexp : ∀ k : ℕ,
      (1 + m * Real.sin (2 * Real.pi * (k : ℝ) / (K : ℝ) + φ)) ^ 2 =
        1 + (2 * m) * Real.sin (2 * Real.pi * (k : ℝ) / (K : ℝ) + φ) +
          m ^ 2 * (Real.sin (2 * Real.pi * (k : ℝ) / (K : ℝ) + φ)) ^ 2 := by
    intro k; ring
  simp_rw [hexp]
  rw [Finset.sum_add_distrib, Finset.sum_add_distrib,
    Finset.sum_const, Finset.card_range, nsmul_eq_mul, mul_one,
    ← Finset.mul_sum, ← Finset.mul_sum,
    sin_cycle_sum_zero (by omega) φ, sin_sq_cycle_sum hK φ]
  field_simp [hKpos.ne']
  ring

/-- Viemeister 제곱근 보정 `1 / √(1 + m²/2)` 을 곱하면 한 주기 평균 제곱이 정확히 `1` -/
theorem viemeister_sqrt_correction {K : ℕ} (hK : 3 ≤ K) (m φ : ℝ) :
    (1 / (K : ℝ)) *
      ∑ k ∈ Finset.range K,
        ((1 / Real.sqrt (1 + m ^ 2 / 2)) *
          (1 + m * Real.sin (2 * Real.pi * (k : ℝ) / (K : ℝ) + φ))) ^ 2 = 1 := by
  have hpos : 0 < 1 + m ^ 2 / 2 := by positivity
  have hpull : ∀ k : ℕ,
      ((1 / Real.sqrt (1 + m ^ 2 / 2)) *
        (1 + m * Real.sin (2 * Real.pi * (k : ℝ) / (K : ℝ) + φ))) ^ 2 =
        (1 / (1 + m ^ 2 / 2)) *
          (1 + m * Real.sin (2 * Real.pi * (k : ℝ) / (K : ℝ) + φ)) ^ 2 := by
    intro k
    rw [mul_pow, one_div, inv_pow, Real.sq_sqrt hpos.le, one_div]
  simp_rw [hpull, ← Finset.mul_sum]
  have hrw : (1 / (K : ℝ)) * ((1 / (1 + m ^ 2 / 2)) *
      ∑ k ∈ Finset.range K, (1 + m * Real.sin (2 * Real.pi * (k : ℝ) / (K : ℝ) + φ)) ^ 2) =
      (1 / (1 + m ^ 2 / 2)) * ((1 / (K : ℝ)) *
        ∑ k ∈ Finset.range K, (1 + m * Real.sin (2 * Real.pi * (k : ℝ) / (K : ℝ) + φ)) ^ 2) := by
    ring
  rw [hrw, sam_real_cycle_power hK m φ, one_div_mul_cancel hpos.ne']

/-! ## 4. 올림 코사인(`cos²`) 경사 (`js/stim.js` L123) -/

/-- `js/stim.js` L123: `rampShape === 'cos2' ? Math.sin(t * Math.PI / 2) ** 2 : t` -/
noncomputable def cos2Ramp (t : ℝ) : ℝ := (Real.sin (t * Real.pi / 2)) ^ 2

theorem cos2Ramp_bounds (t : ℝ) : 0 ≤ cos2Ramp t ∧ cos2Ramp t ≤ 1 := by
  unfold cos2Ramp
  exact ⟨sq_nonneg _, Real.sin_sq_le_one _⟩

theorem cos2Ramp_zero : cos2Ramp 0 = 0 := by
  unfold cos2Ramp
  simp

theorem cos2Ramp_one : cos2Ramp 1 = 1 := by
  unfold cos2Ramp
  simp

/-- `(0, 1)` 안의 표본점 `(i + 0.5)/R` 에서 `0 < cos2Ramp t < 1` -/
theorem cos2Ramp_open_bounds {t : ℝ} (ht0 : 0 < t) (ht1 : t < 1) :
    0 < cos2Ramp t ∧ cos2Ramp t < 1 := by
  unfold cos2Ramp
  have hpi : 0 < Real.pi := Real.pi_pos
  have ha0 : 0 < t * Real.pi / 2 := by positivity
  have ha1 : t * Real.pi / 2 < Real.pi / 2 := by nlinarith
  have hsin_pos : 0 < Real.sin (t * Real.pi / 2) :=
    Real.sin_pos_of_pos_of_lt_pi ha0 (by linarith)
  have hsin_lt_one : Real.sin (t * Real.pi / 2) < 1 := by
    have hlt := Real.sin_lt_sin_of_lt_of_le_pi_div_two (by linarith) le_rfl ha1
    simpa [Real.sin_pi_div_two] using hlt
  constructor
  · exact sq_pos_of_pos hsin_pos
  · nlinarith

/-- 상보 대칭: `cos2Ramp t + cos2Ramp (1 − t) = 1` (`sin² θ + cos² θ = 1`) -/
theorem cos2Ramp_compl (t : ℝ) : cos2Ramp t + cos2Ramp (1 - t) = 1 := by
  unfold cos2Ramp
  have h : (1 - t) * Real.pi / 2 = Real.pi / 2 - t * Real.pi / 2 := by ring
  rw [h, Real.sin_pi_div_two_sub]
  exact Real.sin_sq_add_cos_sq _

/-- `[0, 1]` 에서 `cos2Ramp` 은 순증가 -/
theorem cos2Ramp_strictMonoOn : StrictMonoOn cos2Ramp (Set.Icc 0 1) := by
  intro a ha b hb hab
  unfold cos2Ramp
  have hpi : 0 < Real.pi := Real.pi_pos
  have hsin_a_nonneg : 0 ≤ Real.sin (a * Real.pi / 2) :=
    Real.sin_nonneg_of_nonneg_of_le_pi (by nlinarith [ha.1]) (by nlinarith [ha.2])
  have hsin_lt : Real.sin (a * Real.pi / 2) < Real.sin (b * Real.pi / 2) :=
    Real.sin_lt_sin_of_lt_of_le_pi_div_two (by nlinarith [ha.1]) (by nlinarith [hb.2]) (by nlinarith)
  nlinarith

/-! ## 5. 버터워스 대역통과 실수 이득 (`js/stim.js` L87) -/

/-- `js/stim.js` L87: `g = 1 / Math.sqrt((1 + (lo / f) ** o2) * (1 + (f / hi) ** o2))` -/
noncomputable def bpGainR (lo hi f : ℝ) (order : ℕ) : ℝ :=
  1 / Real.sqrt ((1 + (lo / f) ^ (2 * order)) * (1 + (f / hi) ^ (2 * order)))

theorem bpGainR_pos_le_one {lo hi f : ℝ} (hlo : 0 < lo) (hhi : 0 < hi) (hf : 0 < f) (order : ℕ) :
    0 < bpGainR lo hi f order ∧ bpGainR lo hi f order ≤ 1 := by
  unfold bpGainR
  have ha : 0 ≤ (lo / f) ^ (2 * order) := by positivity
  have hb : 0 ≤ (f / hi) ^ (2 * order) := by positivity
  have hprod : 1 ≤ (1 + (lo / f) ^ (2 * order)) * (1 + (f / hi) ^ (2 * order)) := by nlinarith
  have hsqrt_ge : 1 ≤ Real.sqrt ((1 + (lo / f) ^ (2 * order)) * (1 + (f / hi) ^ (2 * order))) :=
    calc (1 : ℝ) = Real.sqrt 1 := Real.sqrt_one.symm
      _ ≤ Real.sqrt ((1 + (lo / f) ^ (2 * order)) * (1 + (f / hi) ^ (2 * order))) :=
        Real.sqrt_le_sqrt hprod
  constructor
  · exact div_pos one_pos (lt_of_lt_of_le one_pos hsqrt_ge)
  · exact div_le_one_of_le₀ hsqrt_ge (by linarith)

/-- 실수 진폭 이득의 제곱 = 유리수 세기 응답 `G2` (`TMTF.Band`) -/
theorem bpGainR_sq {lo hi f : ℝ} (hlo : 0 < lo) (hhi : 0 < hi) (hf : 0 < f) (order : ℕ) :
    (bpGainR lo hi f order) ^ 2 =
      1 / ((1 + (lo / f) ^ (2 * order)) * (1 + (f / hi) ^ (2 * order))) := by
  unfold bpGainR
  have hnonneg : 0 ≤ (1 + (lo / f) ^ (2 * order)) * (1 + (f / hi) ^ (2 * order)) := by positivity
  rw [div_pow, one_pow, Real.sq_sqrt hnonneg]

/-! ## 6. Box–Muller 가우스 변환 (`js/stim.js` L58–61) -/

/-- `0 < u ≤ 1` (`js/stim.js`: `while (u === 0) u = uniform()`)이면 `−2·ln u ≥ 0` → `Math.sqrt` 의 `NaN` 불가 -/
theorem boxMuller_radicand_nonneg {u : ℝ} (hu0 : 0 < u) (hu1 : u ≤ 1) :
    0 ≤ -2 * Real.log u := by
  have hlog : Real.log u ≤ 0 := Real.log_nonpos hu0.le hu1
  linarith

/-- Box–Muller 극좌표 반지름 항등식: `z₁² + z₂² = −2·ln u` -/
theorem boxMuller_radius_sq {u : ℝ} (hu0 : 0 < u) (hu1 : u ≤ 1) (v : ℝ) :
    (Real.sqrt (-2 * Real.log u) * Real.cos (2 * Real.pi * v)) ^ 2 +
      (Real.sqrt (-2 * Real.log u) * Real.sin (2 * Real.pi * v)) ^ 2 = -2 * Real.log u := by
  have hnn := boxMuller_radicand_nonneg hu0 hu1
  calc (Real.sqrt (-2 * Real.log u) * Real.cos (2 * Real.pi * v)) ^ 2 +
        (Real.sqrt (-2 * Real.log u) * Real.sin (2 * Real.pi * v)) ^ 2
      = (Real.sqrt (-2 * Real.log u)) ^ 2 *
          ((Real.cos (2 * Real.pi * v)) ^ 2 + (Real.sin (2 * Real.pi * v)) ^ 2) := by ring
    _ = (-2 * Real.log u) * 1 := by rw [Real.sq_sqrt hnn, Real.cos_sq_add_sin_sq]
    _ = -2 * Real.log u := mul_one _

/-! ## 7. 켤레 대칭 역 푸리에 변환(IDFT)의 순수 실수 출력 및 Parseval 항등식 (`js/stim.js` `noise`) -/

/-- `n` 점 역 이산 푸리에 변환 (`js/stim.js` `fft(re, im, true)`) -/
noncomputable def idft (n : ℕ) (X : ℕ → ℂ) (j : ℕ) : ℂ :=
  (1 / (n : ℂ)) *
    ∑ k ∈ Finset.range n,
      X k * Complex.exp (2 * Real.pi * Complex.I * (k : ℂ) * (j : ℂ) / (n : ℂ))

private theorem conj_fourier_arg (k j n : ℕ) :
    starRingEnd ℂ (2 * (Real.pi : ℂ) * Complex.I * (k : ℂ) * (j : ℂ) / (n : ℂ)) =
      -(2 * (Real.pi : ℂ) * Complex.I * (k : ℂ) * (j : ℂ) / (n : ℂ)) := by
  simp only [map_div₀, map_mul, map_ofNat, Complex.conj_ofReal, Complex.conj_I,
    Complex.conj_natCast]
  ring

/-- **켤레 대칭 스펙트럼의 역변환은 순수 실수**:
    `X 0` 이 실수이고 `1 ≤ k < n` 에서 `X (n − k) = conj (X k)` 이면
    모든 표본 `j` 에서 `(idft n X j).im = 0` (`js/stim.js` L94 `out[i] = re[i]` 에 허수부 손실 없음) -/
theorem idft_real_of_conj_symm {n : ℕ} (hn : 0 < n) (X : ℕ → ℂ)
    (h0 : (X 0).im = 0)
    (hsym : ∀ k, 1 ≤ k → k < n → X (n - k) = starRingEnd ℂ (X k))
    (j : ℕ) : (idft n X j).im = 0 := by
  rw [← Complex.conj_eq_iff_im]
  unfold idft
  rw [map_mul, map_div₀, map_one, Complex.conj_natCast, map_sum]
  congr 1
  have hrange : Finset.range n = insert 0 (Finset.Ico 1 n) := by
    ext k
    simp only [Finset.mem_range, Finset.mem_insert, Finset.mem_Ico]
    omega
  have hnotmem : (0 : ℕ) ∉ Finset.Ico 1 n := by simp
  rw [hrange, Finset.sum_insert hnotmem, Finset.sum_insert hnotmem]
  have hterm0 :
      starRingEnd ℂ (X 0 * Complex.exp (2 * Real.pi * Complex.I * ((0 : ℕ) : ℂ) * (j : ℂ) / (n : ℂ))) =
        X 0 * Complex.exp (2 * Real.pi * Complex.I * ((0 : ℕ) : ℂ) * (j : ℂ) / (n : ℂ)) := by
    simp [Complex.conj_eq_iff_im.mpr h0]
  rw [hterm0]
  congr 1
  refine Finset.sum_bij (fun k _ => n - k) ?_ ?_ ?_ ?_
  · intro k hk
    rw [Finset.mem_Ico] at hk ⊢
    omega
  · intro a ha b hb hab
    rw [Finset.mem_Ico] at ha hb
    omega
  · intro k hk
    rw [Finset.mem_Ico] at hk
    refine ⟨n - k, ?_, by omega⟩
    rw [Finset.mem_Ico]
    omega
  · intro k hk
    rw [Finset.mem_Ico] at hk
    rw [map_mul, ← hsym k hk.1 hk.2, ← Complex.exp_conj, conj_fourier_arg]
    congr 1
    have hK_ne : (n : ℂ) ≠ 0 := Nat.cast_ne_zero.mpr hn.ne'
    have hsub : ((n - k : ℕ) : ℂ) = (n : ℂ) - (k : ℂ) := Nat.cast_sub hk.2.le
    rw [hsub]
    have hsplit :
        2 * Real.pi * Complex.I * ((n : ℂ) - (k : ℂ)) * (j : ℂ) / (n : ℂ) =
          (j : ℂ) * (2 * Real.pi * Complex.I) +
            (-(2 * Real.pi * Complex.I * (k : ℂ) * (j : ℂ) / (n : ℂ))) := by
      field_simp [hK_ne]
      ring
    rw [hsplit, Complex.exp_add, Complex.exp_nat_mul_two_pi_mul_I, one_mul]

/-- `js/stim.js` `noise()` 가 채우는 스펙트럼 모형:
    `k ∈ [kStart, kEnd]` 에 `z k`, `n − k` 에 `conj (z k)`, 나머지 0 (`1 ≤ kStart`, `2 * kEnd < n`) -/
noncomputable def noiseSpec (n kStart kEnd : ℕ) (z : ℕ → ℂ) (k : ℕ) : ℂ :=
  if kStart ≤ k ∧ k ≤ kEnd then z k
  else if kStart ≤ n - k ∧ n - k ≤ kEnd ∧ k < n then starRingEnd ℂ (z (n - k))
  else 0

/-- `js/stim.js` `noise()` 의 스펙트럼 구성은 모든 표본에서 순수 실수 시간 신호를 만듦 -/
theorem noiseSpec_idft_real {n kStart kEnd : ℕ} (hs : 1 ≤ kStart) (he : 2 * kEnd < n)
    (z : ℕ → ℂ) (j : ℕ) :
    (idft n (noiseSpec n kStart kEnd z) j).im = 0 := by
  apply idft_real_of_conj_symm (by omega)
  · unfold noiseSpec
    split_ifs <;> try omega
    exact Complex.zero_im
  · intro k hk1 hkn
    unfold noiseSpec
    have hsub : n - (n - k) = k := by omega
    split_ifs <;> try omega
    · simp
    · rw [hsub]
    · simp

/-- **Parseval 항등식 (IDFT)**:
    `∑_{j < n} ‖idft n X j‖² = (1 / n) · ∑_{k < n} ‖X k‖²`
    (주파수 영역에서 칸마다 이득 `g(k)` 를 곱한 세기가 시간 영역 전체 세기에 정확히 `g(k)²` 로 보존됨) -/
theorem idft_parseval {n : ℕ} (hn : 0 < n) (X : ℕ → ℂ) :
    ∑ j ∈ Finset.range n, ‖idft n X j‖ ^ 2 =
      (1 / (n : ℝ)) * ∑ k ∈ Finset.range n, ‖X k‖ ^ 2 := by
  have hcomplex :
      (∑ j ∈ Finset.range n, ((‖idft n X j‖ ^ 2 : ℝ) : ℂ)) =
        ((1 / (n : ℝ) : ℝ) : ℂ) * ∑ k ∈ Finset.range n, ((‖X k‖ ^ 2 : ℝ) : ℂ) := by
    have hnorm : ∀ z : ℂ, ((‖z‖ ^ 2 : ℝ) : ℂ) = z * starRingEnd ℂ z := by
      intro z
      rw [Complex.mul_conj, Complex.normSq_eq_norm_sq]
    simp_rw [hnorm]
    have hK_ne : (n : ℂ) ≠ 0 := Nat.cast_ne_zero.mpr hn.ne'
    have hterm : ∀ j : ℕ,
        idft n X j * starRingEnd ℂ (idft n X j) =
          (1 / ((n : ℂ) * (n : ℂ))) *
            ∑ k ∈ Finset.range n, ∑ l ∈ Finset.range n,
              X k * starRingEnd ℂ (X l) *
                Complex.exp (2 * Real.pi * Complex.I * (((k : ℤ) - (l : ℤ) : ℤ) : ℂ) * (j : ℂ) / (n : ℂ)) := by
      intro j
      unfold idft
      rw [map_mul, map_div₀, map_one, Complex.conj_natCast, map_sum]
      have hfactor :
          (1 / (n : ℂ) * ∑ k ∈ Finset.range n,
              X k * Complex.exp (2 * Real.pi * Complex.I * (k : ℂ) * (j : ℂ) / (n : ℂ))) *
            (1 / (n : ℂ) * ∑ l ∈ Finset.range n,
              starRingEnd ℂ (X l * Complex.exp (2 * Real.pi * Complex.I * (l : ℂ) * (j : ℂ) / (n : ℂ)))) =
            (1 / ((n : ℂ) * (n : ℂ))) *
              ((∑ k ∈ Finset.range n,
                  X k * Complex.exp (2 * Real.pi * Complex.I * (k : ℂ) * (j : ℂ) / (n : ℂ))) *
                (∑ l ∈ Finset.range n,
                  starRingEnd ℂ (X l * Complex.exp (2 * Real.pi * Complex.I * (l : ℂ) * (j : ℂ) / (n : ℂ))))) := by
        ring
      rw [hfactor]
      congr 1
      rw [Finset.sum_mul]
      refine Finset.sum_congr rfl fun k _ => ?_
      rw [Finset.mul_sum]
      refine Finset.sum_congr rfl fun l _ => ?_
      rw [map_mul, ← Complex.exp_conj, conj_fourier_arg]
      calc X k * Complex.exp (2 * Real.pi * Complex.I * (k : ℂ) * (j : ℂ) / (n : ℂ)) *
            (starRingEnd ℂ (X l) * Complex.exp (-(2 * Real.pi * Complex.I * (l : ℂ) * (j : ℂ) / (n : ℂ))))
          = X k * starRingEnd ℂ (X l) *
              (Complex.exp (2 * Real.pi * Complex.I * (k : ℂ) * (j : ℂ) / (n : ℂ)) *
                Complex.exp (-(2 * Real.pi * Complex.I * (l : ℂ) * (j : ℂ) / (n : ℂ)))) := by ring
        _ = X k * starRingEnd ℂ (X l) *
              Complex.exp (2 * Real.pi * Complex.I * (((k : ℤ) - (l : ℤ) : ℤ) : ℂ) * (j : ℂ) / (n : ℂ)) := by
            rw [← Complex.exp_add]
            congr 2
            push_cast
            ring
    simp_rw [hterm, ← Finset.mul_sum]
    rw [Finset.sum_comm]
    have hinner : ∀ k ∈ Finset.range n,
        ∑ j ∈ Finset.range n, ∑ l ∈ Finset.range n,
          X k * starRingEnd ℂ (X l) *
            Complex.exp (2 * Real.pi * Complex.I * (((k : ℤ) - (l : ℤ) : ℤ) : ℂ) * (j : ℂ) / (n : ℂ)) =
        (n : ℂ) * (X k * starRingEnd ℂ (X k)) := by
      intro k hk
      rw [Finset.sum_comm]
      have hortho : ∀ l ∈ Finset.range n,
          ∑ j ∈ Finset.range n,
            X k * starRingEnd ℂ (X l) *
              Complex.exp (2 * Real.pi * Complex.I * (((k : ℤ) - (l : ℤ) : ℤ) : ℂ) * (j : ℂ) / (n : ℂ)) =
          if l = k then (n : ℂ) * (X k * starRingEnd ℂ (X k)) else 0 := by
        intro l hl
        rw [← Finset.mul_sum]
        by_cases hlk : l = k
        · subst hlk
          simp only [↓reduceIte, sub_self, Int.cast_zero, mul_zero, zero_mul, zero_div,
            Complex.exp_zero, Finset.sum_const, Finset.card_range, nsmul_eq_mul, mul_one]
          ring
        · simp only [hlk, ↓reduceIte]
          have hklt : k < n := Finset.mem_range.mp hk
          have hllt : l < n := Finset.mem_range.mp hl
          have hndiv : ¬ (n : ℤ) ∣ ((k : ℤ) - (l : ℤ)) := by
            intro ⟨q, hq⟩
            have hq_cases : q ≤ -1 ∨ q = 0 ∨ 1 ≤ q := by omega
            rcases hq_cases with hq1 | hq0 | hq2
            · nlinarith
            · subst hq0; omega
            · nlinarith
          rw [exp_root_sum_zero ((k : ℤ) - (l : ℤ)) hn hndiv, mul_zero]
      rw [Finset.sum_congr rfl hortho, Finset.sum_ite_eq']
      simp [hk]
    rw [Finset.sum_congr rfl hinner, ← Finset.mul_sum]
    push_cast
    field_simp [hK_ne]
  have hre := congrArg Complex.re hcomplex
  simp only [Complex.re_sum, Complex.ofReal_re, Complex.mul_re, Complex.ofReal_im, zero_mul,
    sub_zero] at hre
  exact hre

/-! ## 8. Levitt (1971) 2-down 1-up 실수 수렴점 (`p = 1 / √2 ≈ 0.7071`) -/

/-- Levitt (1971) 2-down 1-up 수렴 정답률 `p = 1 / √2` -/
noncomputable def levitt2d1u : ℝ := 1 / Real.sqrt 2

theorem levitt2d1u_pos : 0 < levitt2d1u := by
  unfold levitt2d1u
  positivity

/-- 내려갈 확률 `p²` = 올라갈 확률 `1 − p²` = `1 / 2` -/
theorem levitt2d1u_fixed_point : levitt2d1u ^ 2 = 1 / 2 := by
  unfold levitt2d1u
  rw [div_pow, one_pow, Real.sq_sqrt (by norm_num)]

/-- `0.7071 < 1 / √2 < 0.7072` -/
theorem levitt2d1u_bounds : (7071 / 10000 : ℝ) < levitt2d1u ∧ levitt2d1u < (7072 / 10000 : ℝ) := by
  have hsq := levitt2d1u_fixed_point
  have hpos := levitt2d1u_pos
  constructor
  · nlinarith
  · nlinarith

/-! ## 9. `measureDepth` (`js/stim.js` L137–155) 의 위상 불변 변조 깊이 정확 복원 -/

/-- **변조 깊이 추정기 정확성 (`js/stim.js` `measureDepth`)**:
    이상 포락선 `e(i) = A·(1 + m·sin(2π·k_m·i/L + φ))` (`A > 0`, `m ≥ 0`, `L ∤ k_m`, `L ∤ 2·k_m`)에서
    `mean = (1/L) ∑ e(i)`, `c = ∑ e(i) cos(2π k_m i / L)`, `s = ∑ e(i) sin(2π k_m i / L)` 일 때
    `(2 · √(c² + s²) / L) / mean = m` — 진폭 `A` 와 무작위 위상 `φ` 에 무관하게 `m` 을 정확히 복원 -/
theorem measureDepth_exact {L : ℕ} (k_m : ℤ) (hL : 0 < L)
    (h1 : ¬ (L : ℤ) ∣ k_m) (h2 : ¬ (L : ℤ) ∣ (2 * k_m))
    {A m : ℝ} (hA : 0 < A) (hm : 0 ≤ m) (φ : ℝ) :
    let e : ℕ → ℝ := fun i => A * (1 + m * Real.sin (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ) + φ))
    let mean : ℝ := (∑ i ∈ Finset.range L, e i) / (L : ℝ)
    let c : ℝ := ∑ i ∈ Finset.range L, e i * Real.cos (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ))
    let s : ℝ := ∑ i ∈ Finset.range L, e i * Real.sin (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ))
    (2 * Real.sqrt (c ^ 2 + s ^ 2) / (L : ℝ)) / mean = m := by
  intro e mean c s
  have hLpos : (0 : ℝ) < (L : ℝ) := Nat.cast_pos.mpr hL
  have hsin1 := sin_harmonic_sum_zero k_m hL h1 φ
  have hcos1 := cos_harmonic_sum_zero k_m hL h1 0
  have hsin10 := sin_harmonic_sum_zero k_m hL h1 0
  have hsin2 := sin_harmonic_sum_zero (2 * k_m) hL h2 φ
  have hcos2 := cos_harmonic_sum_zero (2 * k_m) hL h2 φ
  -- 1) mean = A
  have hmean : mean = A := by
    change (∑ i ∈ Finset.range L,
        A * (1 + m * Real.sin (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ) + φ))) / (L : ℝ) = A
    have hsplit : ∀ i : ℕ,
        A * (1 + m * Real.sin (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ) + φ)) =
          A + (A * m) * Real.sin (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ) + φ) := by
      intro i; ring
    simp_rw [hsplit]
    rw [Finset.sum_add_distrib, Finset.sum_const, Finset.card_range, nsmul_eq_mul,
      ← Finset.mul_sum, hsin1, mul_zero, add_zero]
    field_simp [hLpos.ne']
  -- 2) c = (A * m * L / 2) * sin φ
  have hc : c = A * m * (L : ℝ) / 2 * Real.sin φ := by
    change ∑ i ∈ Finset.range L,
        A * (1 + m * Real.sin (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ) + φ)) *
          Real.cos (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ)) =
        A * m * (L : ℝ) / 2 * Real.sin φ
    have hterm : ∀ i : ℕ,
        A * (1 + m * Real.sin (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ) + φ)) *
          Real.cos (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ)) =
          A * Real.cos (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ) + 0) +
            (A * m / 2) * Real.sin (2 * Real.pi * ((2 * k_m : ℤ) : ℝ) * (i : ℝ) / (L : ℝ) + φ) +
            (A * m / 2) * Real.sin φ := by
      intro i
      have harg2 : 2 * Real.pi * ((2 * k_m : ℤ) : ℝ) * (i : ℝ) / (L : ℝ) + φ =
          (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ) + φ) +
            (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ)) := by push_cast; ring
      have hprod : Real.sin (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ) + φ) *
            Real.cos (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ)) =
          (Real.sin ((2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ) + φ) +
              (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ))) + Real.sin φ) / 2 := by
        have hadd := Real.sin_add (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ) + φ)
          (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ))
        have hsub := Real.sin_sub (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ) + φ)
          (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ))
        have hsimpl : (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ) + φ) -
            (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ)) = φ := by ring
        rw [hsimpl] at hsub
        linarith
      rw [add_zero, harg2]
      calc A * (1 + m * Real.sin (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ) + φ)) *
            Real.cos (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ))
          = A * Real.cos (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ)) +
              (A * m) * (Real.sin (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ) + φ) *
                Real.cos (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ))) := by ring
        _ = A * Real.cos (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ)) +
              (A * m) * ((Real.sin ((2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ) + φ) +
                (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ))) + Real.sin φ) / 2) := by rw [hprod]
        _ = A * Real.cos (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ)) +
              (A * m / 2) * Real.sin ((2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ) + φ) +
                (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ))) +
              (A * m / 2) * Real.sin φ := by ring
    simp_rw [hterm]
    rw [Finset.sum_add_distrib, Finset.sum_add_distrib,
      ← Finset.mul_sum, ← Finset.mul_sum,
      hcos1, hsin2, mul_zero, mul_zero, add_zero, zero_add,
      Finset.sum_const, Finset.card_range, nsmul_eq_mul]
    ring
  -- 3) s = (A * m * L / 2) * cos φ
  have hs : s = A * m * (L : ℝ) / 2 * Real.cos φ := by
    change ∑ i ∈ Finset.range L,
        A * (1 + m * Real.sin (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ) + φ)) *
          Real.sin (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ)) =
        A * m * (L : ℝ) / 2 * Real.cos φ
    have hterm : ∀ i : ℕ,
        A * (1 + m * Real.sin (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ) + φ)) *
          Real.sin (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ)) =
          A * Real.sin (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ) + 0) -
            (A * m / 2) * Real.cos (2 * Real.pi * ((2 * k_m : ℤ) : ℝ) * (i : ℝ) / (L : ℝ) + φ) +
            (A * m / 2) * Real.cos φ := by
      intro i
      have harg2 : 2 * Real.pi * ((2 * k_m : ℤ) : ℝ) * (i : ℝ) / (L : ℝ) + φ =
          (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ) + φ) +
            (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ)) := by push_cast; ring
      have hprod : Real.sin (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ) + φ) *
            Real.sin (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ)) =
          (Real.cos φ - Real.cos ((2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ) + φ) +
              (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ)))) / 2 := by
        have hadd := Real.cos_add (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ) + φ)
          (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ))
        have hsub := Real.cos_sub (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ) + φ)
          (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ))
        have hsimpl : (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ) + φ) -
            (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ)) = φ := by ring
        rw [hsimpl] at hsub
        linarith
      rw [add_zero, harg2]
      calc A * (1 + m * Real.sin (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ) + φ)) *
            Real.sin (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ))
          = A * Real.sin (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ)) +
              (A * m) * (Real.sin (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ) + φ) *
                Real.sin (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ))) := by ring
        _ = A * Real.sin (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ)) +
              (A * m) * ((Real.cos φ - Real.cos ((2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ) + φ) +
                (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ)))) / 2) := by rw [hprod]
        _ = A * Real.sin (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ)) -
              (A * m / 2) * Real.cos ((2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ) + φ) +
                (2 * Real.pi * (k_m : ℝ) * (i : ℝ) / (L : ℝ))) +
              (A * m / 2) * Real.cos φ := by ring
    simp_rw [hterm]
    rw [Finset.sum_add_distrib, Finset.sum_sub_distrib,
      ← Finset.mul_sum, ← Finset.mul_sum,
      hsin10, hcos2, mul_zero, mul_zero, sub_zero, zero_add,
      Finset.sum_const, Finset.card_range, nsmul_eq_mul]
    ring
  -- 4) Combine: √(c² + s²) = A * m * L / 2
  rw [hmean, hc, hs]
  have hsq : (A * m * (L : ℝ) / 2 * Real.sin φ) ^ 2 + (A * m * (L : ℝ) / 2 * Real.cos φ) ^ 2 =
      (A * m * (L : ℝ) / 2) ^ 2 := by
    calc (A * m * (L : ℝ) / 2 * Real.sin φ) ^ 2 + (A * m * (L : ℝ) / 2 * Real.cos φ) ^ 2
        = (A * m * (L : ℝ) / 2) ^ 2 * ((Real.sin φ) ^ 2 + (Real.cos φ) ^ 2) := by ring
      _ = (A * m * (L : ℝ) / 2) ^ 2 * 1 := by rw [Real.sin_sq_add_cos_sq]
      _ = (A * m * (L : ℝ) / 2) ^ 2 := mul_one _
  have hnn : 0 ≤ A * m * (L : ℝ) / 2 := by positivity
  rw [hsq, Real.sqrt_sq hnn]
  field_simp [hLpos.ne', hA.ne']

end TMTF
end
