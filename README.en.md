# TMTF Test — for Cochlear Implant Users

[한국어](README.md) · **English**

A listening test where you find the **one fluttering sound** among three “shh” sounds.
It measures how faint a flutter you can detect at each flutter rate (10–300 Hz, 7 standard frequencies).
In research, this is called temporal modulation detection, or the TMTF (temporal modulation transfer function).

This TMTF test is designed for cochlear implant users.
Instead of delivering direct electric stimulation to the electrodes through a research interface (lab-only equipment), it presents sound through your everyday sound processor (the external part of the cochlear implant).
It is based on prior studies that measured TMTFs using acoustic stimulation via the sound processor (Won et al. 2011 · De Ruiter et al. 2015 · Park et al. 2015).

## Try it now

**https://mi-rae-lab.github.io/ci-tmtf-test/#lang=en**

No installation is needed. Open the link above in Chrome, Edge, or Safari.
The page opens in Korean by default; use the `EN` / `KO` button at the top right, or add `#lang=en` to the address as above.

## What you can learn from this test

- **Flutter detection level**: See on a chart how faint a flutter you can detect, from slow to fast flutter.
- **Reference for following speech rhythm and changes**: Speech is made of rapid, continuous changes in loudness. This gives a reference for how well your ear and sound processor (the external part of the cochlear implant) follow such quick sound changes.
- **Left/right and before/after comparison**: Test each ear separately, or compare results before and after changing a sound processor setting or program under the same conditions.
- **Report for consultations**: When the test is finished, save a **specialist report (`.html`)** to use as a reference when talking with your audiologist or cochlear implant engineer.

## What you need

- A quiet place
- About 25 minutes (you can save partway through and resume later)
- Your everyday sound processor program and volume
- A computer is recommended (phones and tablets also work)
  - On iPhone, switch off the side silent switch so sound can play.

## How it works

1. Tap **Start**, then choose the ear you are testing and how you are listening.
   - If you are testing one ear, please take off the sound processor (the external part of the cochlear implant) or hearing aid on the other side for now.
2. Tap **Play sound** and set your device volume to a comfortable, clearly audible level.
   - Start with your device volume at half or lower; the calibration noise fades in gradually over 1.5 seconds.
   - To keep the start of sounds from being cut off, a very low, nearly inaudible keep-alive tone turns on automatically while sound plays (you can turn it off).
   - Once set, please keep the volume the same until the test is finished.
3. Do the **sound check** twice (each time: a 3-second wait, then 4 short beeps). It checks whether the start of sounds is cut off. You can skip it if you want.
4. Do **practice** 3 times. Practice results are not included in the final record.
5. Do the **main test**. As each sound plays, boxes 1 · 2 · 3 light up in turn.
   - Choose the number of the fluttering sound. You can also use keys 1 · 2 · 3 on the keyboard.
   - If you notice even a tiny flutter, pick that number. Press **Not sure** (keyboard 0) only when all three sounds seem completely identical.
   - If the sound ever feels too loud or uncomfortable, tap **Mute now** (or press `Esc`) to stop audio immediately, adjust your volume, and resume without losing progress.
   - If you feel tired between runs, tap **Save & resume later** to store your progress in this browser and continue the remaining frequencies later from the home screen (**Resume test**).
   - It starts easy, but the flutter becomes subtler as you get answers right, so it gradually gets harder.
6. When the test is finished, tap **Save result file** and, if needed, send the file to your audiologist or the researcher.
   - When consulting your audiologist or cochlear implant engineer, you can also use **Save specialist report** (`.html`; open it in a browser to print or save as PDF; for reference only).
   - If you have time, please tap **Do one more round**. Measuring twice makes the results more accurate.

## Disclaimer and Legal Notice (Medical Device Disclaimer)

> **For research and educational purposes only. This software is not a medical device and does not replace official medical diagnostic instruments or professional clinical care.**

- **Not a medical device:** This tool has not received approval, clearance, or certification as a medical device (including digital medical device software, or SaMD) under the Republic of Korea's Medical Devices Act or Digital Medical Products Act, or under foreign regulations (such as those of the US FDA or the EU MDR). It is not made or provided for diagnosing, treating, mitigating, managing, preventing, or monitoring any disease, or for directly setting or changing a cochlear implant MAP.
- **Uncalibrated sound levels and hearing protection:** Because it runs on general-purpose computers, smartphones, and browsers, sound pressure levels (dB SPL) are not calibrated. Always use a comfortable volume, and take care to avoid discomfort or hearing damage from excessive loudness.
- **Legal compliance for research and clinical use:** A disclaimer alone does not exempt actual clinical care or diagnostic use from legal regulation. When this tool is used in academic research involving human participants, the relevant laws (such as Korea's Bioethics and Safety Act) must be followed, including review by an Institutional Review Board (IRB) and participant consent. If the use qualifies as a clinical trial, check separately whether prior approval from the relevant authorities (such as Korea's Ministry of Food and Drug Safety) is required.
- **No warranty and limitation of liability:** This software is provided “AS IS” under the MIT License, without warranty of any kind, express or implied. Always consult a qualified physician or audiologist about interpreting results, making medical decisions, or changing sound processor settings.

## Please note

- **This is not a medical diagnostic tool.** Always talk to your audiologist before changing your sound processor settings (MAP).
- The results reflect **the listener, the sound processor, and the sound delivery path all combined**.
  - If the sound processor program, volume, or connection method changes, the results may change too.
  - For this reason, it is difficult to compare your values directly with other people's.
- A Bluetooth connection may cut off the start of sounds.

## Hearing safety safeguards

Informed by the ISO 14971 risk-management hierarchy (inherent safety by design → protective measures → information for safety), the app applies layered audio safeguards without altering the verified stimulus mathematics:

- **Digital headroom and `-1 dBFS` output limiter:** All stimuli are generated at `-26 dBFS` (`TARGET_RMS = 0.05`) and pass through a pre-output `DynamicsCompressorNode` brickwall limiter (`-1 dBFS`) plus a buffer sanitizer that zeros non-finite samples (`NaN`/`Infinity`) and clamps peaks above `0.99` (completely transparent for normal stimuli).
- **1.5-second soft-start on volume setup:** To reduce startle risk when a device's volume was accidentally left high, the calibration noise fades in gradually over 1.5 s (main test trials retain the exact 10 ms linear ramp from the literature).
- **One-tap `Mute now` and `Esc` emergency stop:** On the volume setup, sound check, and test screens, audio can be cut immediately without a confirmation dialog; after lowering the volume, participants can tap **Resume sound** without losing their run.
- **Pre-playback safety notice and high-volume warning:** A hearing safety notice recommends starting at half volume or lower, and entering `80%` or higher in the device volume field triggers an immediate alert.
- *Note: Software safeguards do not replace physical sound-pressure calibration (dB SPL) or medical-device regulatory certification.*

## Privacy and security

- **In-browser processing (including the public GitHub Pages site):** The app uses no backend server, database, cookies, analytics tools (such as Google Analytics), or external CDNs, fonts, or scripts. Apart from loading the six static files and reading `검증_통과.json` (the verification record; `GET`, `credentials: 'omit'`, `no-referrer`), it makes no network transfers. Sound generation, the test itself, charts, reports, and opening result files are designed to run **only inside the browser**.
- **Strict CSP and HTTPS:** The app applies `default-src 'none'`, `connect-src 'self'`, `font-src 'none'`, `media-src 'none'`, `frame-src 'none'`, `worker-src 'none'`, `form-action 'none'`, `object-src 'none'`, and `no-referrer` policies, and automatically switches from HTTP to HTTPS on the hosted site.
- **Protecting what you type:** The app never asks for names or contact details. Input fields use `spellcheck="false"` to reduce text leaking to cloud spell checkers. If a phone number, email address, or Korean resident registration number pattern is typed into the note field, a warning appears immediately, inside the browser.
- **Local storage and instant deletion:** Results are stored **only in this device's browser (`localStorage`)**, and they are exported to a file only when the participant taps **Save result file**. After using a shared device, tap **Delete local records** on the home screen to completely erase the stored records right away.
- **Hash links (`#id=`) that stay out of server logs:** When you pass a participant ID through a link, use **`#id=P02`** (a URL hash) instead of `?id=`. The ID is then not included in the HTTP request, so it does not appear in the GitHub Pages static server logs.
- **Automated security checks:** GitHub Actions (`Security & Verification Checks`), CodeQL static analysis (0 open alerts; unbiased rejection sampling for random intervals), Secret scanning, and Dependabot continuously check security and privacy invariants on every change.
- **Ongoing security checks and updates:** The app was built strictly around blocking outbound transfers and processing everything in the browser, but security cannot be guaranteed to be perfect in every environment. We will keep checking for potential vulnerabilities and continue to release security updates.
- Result files contain the ear, the listening method, each trial's answer and response time, and browser and screen information (optional items such as age are included only if chosen).

---

## For clinicians and researchers sending the test

- **Add a participant ID through the link (`#` hash recommended — not sent to the server):** Add `#id=P02` to the end of the address to fill in the ID field. Anything after `#` is not sent to the server (the older `?id=P02` still works).
  - Example: `https://mi-rae-lab.github.io/ci-tmtf-test/#id=P02`
- **Change the flutter rates:** Write `#hz=10,50,100` to test with those values.
  - The defaults are the 7 standard Won et al. (2011) frequencies: **10 · 50 · 75 · 100 · 150 · 200 · 300 Hz** (presented in random order). *(Reference: the original laboratory study presented broadband noise at 65 dBA; in a browser, sound pressure is uncalibrated, so participants set a comfortable volume.)*
  - Allowed values are 5–300 Hz in 5 Hz steps, plus 2 · 4 · 8 · 16 · 32 · 64 · 128 · 256 · 512 Hz.
  - If any value is invalid, the defaults are used. Up to 12 values are allowed.
  - To use both, join them with `&`, as in `#id=P02&hz=10,50,100`.
- **Link to the English screen:** Add `#lang=en` to the address, or switch with the `EN` / `KO` button at the top right of the screen.
  - Example: `https://mi-rae-lab.github.io/ci-tmtf-test/#id=P02&lang=en`
- **Open result files:** Choose files under **Open result files (for clinicians / researchers)** at the bottom of the home screen to see the following (both `formatVersion: 1` and `2` are supported).
  - Tables and charts, a staircase plot for each run, the keep-alive tone mode, and the short sound check (onset) results
  - When there are two or more sessions with the same participant ID, they are compared automatically in a table and an overlaid chart (sessions with different keep-alive tone modes are kept separate rather than combined)
  - Checks for staircase replay, interval levels, and hits by target position (excluding “Not sure”)
  - You can also save a specialist report (`.html`), a runs CSV, and a trials CSV.
  - Files are read only within that screen.
- **Check a result file independently:** A separately written Python script, which does not use the app's code, rebuilds the staircase and the sounds (requires numpy).

  ```
  python -I -X utf8 tools/verify_result.py received_file.json
  ```
- **To use this in research,** you first need review by an Institutional Review Board (IRB) and participant consent.

## Test method (summary)

Full details are in [Methods](방법.en.md).

| | |
|---|---|
| Task | Three-interval oddity: pick the one that differs (0.5 s sound × 3, 0.5 s gaps) |
| Stimulus | Broadband Gaussian noise with sinusoidal amplitude modulation. The modulation starting phase is randomized in each interval. The average level (RMS) of the three sounds is matched exactly |
| Onset/offset | 10 ms linear ramps, 0.25 s of silence before the first sound |
| Staircase | 2-down 1-up (70.7% point). Starts at 100% modulation (0 dB), with 4 dB steps until the 4th reversal and 2 dB after that. Threshold is the mean of the last 10 of 14 reversals |
| Stopping rule | Stops as “could not measure” after 4 errors at 0 dB (the app's own safety rule; excluded from averages) |
| Repetition | One round (each frequency once), with an optional second round. If the two values differ by more than 3 dB, only that frequency is run once more (Won et al. 2011 · Park et al. 2015) |
| Feedback | Shows correct / incorrect after every answer |

## Verification

The stimulus and staircase code (`js/stim.js` · `js/track.js` · `js/protocols.js`) was checked in the three ways below. The screen flow was run from start to finish on a simulated screen.

- Comparison with an independently written Python implementation (`tools/cross_check.py`, `tools/verify_result.py`)
- **Formal proofs in Lean 4 + Mathlib4** (`tools/lean/TMTF/*.lean`, axiom audit `MyAudit.lean`)
- Line-by-line correspondence between the JS and Lean code (`tools/lean/cross_check.js`, `CrossCheck.lean`)

### Lean 4 & Mathlib4 Version and Verification Results

- **Lean 4**: `leanprover/lean4:v4.36.0` ([`tools/lean/lean-toolchain`](tools/lean/lean-toolchain))
- **Mathlib4**: `leanprover-community/mathlib4` tag **`v4.36.0`** (commit `fc4f59e577feb1a4956671bc04ac18aaaf8cd842`, [`tools/lean/lakefile.toml`](tools/lean/lakefile.toml) · [`tools/lean/lake-manifest.json`](tools/lean/lake-manifest.json))
- **Scope of formal proofs**: 10 core rational/integer/32-bit modules + real (`ℝ`) & complex (`ℂ`) analytic module using Mathlib4 ([`tools/lean/TMTF/RealAnalytic.lean`](tools/lean/TMTF/RealAnalytic.lean), 43 public theorems: real RMS equalization, `10^(D/20)` & `Real.sin` no-overmodulation, arbitrary `K ≥ 3` & random-phase `φ` SAM cycle power `1 + m²/2` with Viemeister `1/√(1 + m²/2)` correction, `cos²` ramp, Butterworth real gain, Box–Muller, conjugate-symmetric IDFT purely real output & Parseval identity, Levitt `1/√2`, and exact phase-invariant `measureDepth` recovery)
- **Latest 6-step full verification (`2026-11-25`, app `1.2.12`, `build eac094e03221`, total `107.5 s` — ALL PASS)**:

| Step | Check | Status | Time | Summary |
|---:|---|---|---:|---|
| 1 | Stimulus & staircase JS = Python | PASS | 7.2 s | 750 stimuli (max RMS diff `2.44e-11` dB) · 210 staircases match |
| 2 | UI & security check (`app_check.js`) | PASS | 52.8 s | 107 / 107 pass (7 rates · save/resume · CSP/XSS · KO/EN i18n · touch · safety) |
| 3 | Independent result replay (`verify_result.py`) | PASS | 5.5 s | 15/15 runs · 550 trials / 1,650 intervals match |
| 4 | Lean 4 + Mathlib4 clean rebuild | PASS | 25.6 s | `4198 jobs` succeeded · 0 warnings / errors / `sorry` |
| 5 | Lean axiom audit (`MyAudit.lean`) | PASS | 13.4 s | `consts=455` · `theorems=333` · `axiomDecls=0` · `UNION {Classical.choice, Quot.sound, propext}` · **`NONSTANDARD 0`** |
| 6 | JS ↔ Lean line-by-line cross-check | PASS | 3.0 s | `RNG 307/307` · `RAMP 120/120` · `GAIN 140/140` · `TRACK 360/360` · `PV 131/131` all match |

- Full report & theorem audit table: [tools/lean/검증_결과.md](tools/lean/검증_결과.md) · Machine-readable pass record: [검증_통과.json](검증_통과.json)

```
tools\전수검산.bat        (or python -I -X utf8 tools/run_checks.py)
```

- Requires: Python 3 + numpy, [deno](https://deno.com), Lean 4 (elan; run `lake exe cache get` inside `tools/lean` on a fresh clone)
- When all six steps pass, the result is recorded in `검증_통과.json` (the verification record).
- When a session starts, the test page compares the hashes of its own files with this record and writes the result into the session.
- A refresh prompt appears only when a new version is released. A hash mismatch alone does not block the test; it is recorded.

| File | Contents |
|---|---|
| `index.html` · `style.css` · `js/app.js` | Participant screens, records, test flow, results, viewing received results |
| `js/protocols.js` · `js/stim.js` · `js/track.js` | Procedure, stimuli (seeded, reproducible noise), adaptive staircase |
| `tools/` | Full verification (`run_checks.py`, `cross_check.*`, `tmtf_ref.py`, `app_check*.js`, `verify_result.py`, `lean/`) |

## Web standards

The app is built to web standards, with no build tools or external frameworks.

- **Semantic HTML5 and standard CSS3:** Meaningful markup such as `<header>`, `<main>`, `<section>`, `<footer>`, and `<details>`, with a responsive layout and support for the system dark mode (`prefers-color-scheme`) and reduced motion (`prefers-reduced-motion`).
- **Standard Web APIs:** Works only with standard APIs built into the browser (Web Audio API, Web Crypto API, Web Storage, Screen Wake Lock, Content Security Policy), with no plug-ins or external scripts.
- **Web accessibility (WAI-ARIA) and touch ergonomics:** Keyboard operation, visible focus, and `role`, `aria-label`, `aria-live`, `aria-pressed`, and `aria-current` attributes are applied, and information is never conveyed by color alone. On touch screens, accidental double-tap zoom is prevented (`touch-action: manipulation` plus an inactive-area guard) while preserving two-finger pinch-to-zoom for accessibility (WCAG).

## References

A comparison of the stimulus and staircase procedures with the original sources, and the differences, is in [Methods](방법.en.md).

1. Levitt, H. (1971). Transformed up-down methods in psychoacoustics. *The Journal of the Acoustical Society of America*, 49(2B), 467–477. https://doi.org/10.1121/1.1912375
2. Viemeister, N. F. (1979). Temporal modulation transfer functions based upon modulation thresholds. *The Journal of the Acoustical Society of America*, 66(5), 1364–1380. https://doi.org/10.1121/1.383531
3. Won, J. H., Drennan, W. R., Nie, K., Jameyson, E. M., & Rubinstein, J. T. (2011). Acoustic temporal modulation detection and speech perception in cochlear implant listeners. *The Journal of the Acoustical Society of America*, 130(1), 376–388. https://doi.org/10.1121/1.3592521
4. Shen, Y., & Richards, V. M. (2013). Temporal modulation transfer function for efficient assessment of auditory temporal resolution. *The Journal of the Acoustical Society of America*, 133(2), 1031–1042. https://doi.org/10.1121/1.4773271
5. Park, M.-H., Won, J. H., Horn, D. L., & Rubinstein, J. T. (2015). Acoustic temporal modulation detection in normal-hearing and cochlear implanted listeners: Effects of hearing mechanism and development. *Journal of the Association for Research in Otolaryngology*, 16(3), 389–399. https://doi.org/10.1007/s10162-014-0499-z
6. De Ruiter, A. M., Debruyne, J. A., Chenault, M. N., Francart, T., & Brokx, J. P. L. (2015). Amplitude modulation detection and speech recognition in late-implanted prelingually and postlingually deafened cochlear implant users. *Ear and Hearing*, 36(5), 557–566. https://doi.org/10.1097/AUD.0000000000000162
7. Goehring, T., & Carlyon, R. P. (2026). A web-based listening test system for cochlear implant research and its validation for remote testing. *Trends in Hearing*, 30, 23312165261416179. https://doi.org/10.1177/23312165261416179

## Credits

This tool was made with the help of Claude Opus 5.5, Fable 5.2, Gemini 4 Neon, and GPT Astra 6.2.

## License

MIT — [LICENSE](LICENSE)
