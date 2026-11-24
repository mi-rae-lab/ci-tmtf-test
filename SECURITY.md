# 보안 정책 (Security Policy)

## 지원 버전 (Supported Versions)

현재 `main` 브랜치의 최신 배포 버전(GitHub Pages)에 대해 보안 점검 및 업데이트를 지속적으로 제공합니다.

| 버전 | 보안 지원 |
|---|---|
| `main` 최신 (1.2.x) | 지원 |
| 이전 판 | 최신 판으로 새로고침 권장 |

## 취약점 제보 방법 (Reporting a Vulnerability)

보안 취약점이나 개인정보 보호 관련 문제를 발견하신 경우, **공개 이슈(Public Issue)로 올리지 마시고** GitHub의 **비공개 취약점 제보(Private vulnerability reporting)** 기능을 이용해 주세요.

1. 저장소 상단 **Security** 탭 → **Advisories** → **Report a vulnerability** 클릭
2. 재현 방법, 영향 범위, 가능한 경우 관련 스크린샷이나 JSON 예시(개인정보 제외)를 함께 작성해 주세요.

제보해 주신 내용은 확인 후 신속히 검토·수정하여 보안 업데이트로 반영하겠습니다.

## 보안 설계 원칙 및 지속적 점검

- **브라우저 내부 처리 원칙:** 백엔드 서버·쿠키·외부 CDN·분석 도구를 사용하지 않으며, 소리 생성·검사·저장·보고서·결과 열람을 브라우저 내부에서만 수행하도록 설계했습니다.
- **엄격한 CSP 및 입력 검증:** 앱 화면은 `default-src 'none'; script-src 'self'; connect-src 'self'`, 전문가용 HTML 보고서는 `script-src 'none'; connect-src 'none'` 정책과 JSON 자료형 검증·HTML 이스케이프를 적용했습니다.
- **지속적인 개선:** 엄격하게 설계했으나 모든 웹 환경에서 보안이 완벽하다고 보장할 수는 없습니다. CodeQL·자동 검산(CI)과 수동 점검을 통해 잠재적 취약점을 꾸준히 찾고 보완하겠습니다.
