# LiveSub Desktop

실시간 음성 인식 번역 자막 데스크탑 앱. Electron 기반으로 설치만 하면 바로 사용할 수 있습니다.

## 주요 기능

- **실시간 음성 인식** — Chromium 내장 Web Speech API
- **이중 번역 엔진** — Google Cloud Translation / OpenAI LLM
- **모델 선택** — gpt-4.1-nano, gpt-4.1-mini, gpt-4o-mini
- **맥락 기반 번역** — STT 오류 보정 + 적절한 용어 선택
- **청크 번역** — 긴 발화 시 5초/50자 기준 중간 번역 후 최종 결과로 교체
- **API 키 관리** — Settings에서 입력/테스트, 안전하게 로컬 저장
- **설치형 앱** — Python/Node.js 설치 불필요

## 설치

### 빌드된 앱 (권장)

[Releases](https://github.com/Aiden-Kwak/live-sub-electron/releases) 페이지에서 다운로드:
- **macOS**: `.dmg` 파일
- **Windows**: `.exe` 설치 파일

### 직접 빌드

```bash
git clone https://github.com/Aiden-Kwak/live-sub-electron.git
cd live-sub-electron
npm install

# 개발 모드
npm run dev

# 배포용 빌드
npm run dist
```

## 사용법

1. 앱 실행 → Settings (톱니바퀴) → API 키 입력
   - Google 엔진: Google Cloud API 키
   - LLM 엔진: OpenAI API 키
2. Test 버튼으로 키 확인 → Save
3. 소스 언어(음성) / 타겟 언어(자막) 선택
4. 엔진 선택: **Google** (빠름) 또는 **LLM** (고품질)
5. 마이크 버튼 클릭 → 말하면 실시간 자막 표시

## 기술 스택

| 계층 | 스택 |
|------|------|
| 앱 프레임워크 | Electron |
| UI | React 19, TypeScript, TailwindCSS |
| 빌드 | Vite, electron-builder |
| 데이터 저장 | electron-store |
| 번역 | Google Cloud Translation API v2, OpenAI API |

## 프로젝트 구조

```
src/
├── main/                  # Electron main process
│   ├── index.ts           # 앱 진입점
│   ├── ipc-handlers.ts    # IPC 핸들러 (5개 채널)
│   ├── translator.ts      # Google/OpenAI API 호출
│   └── store.ts           # electron-store 설정 관리
├── preload/
│   └── index.ts           # contextBridge API
└── renderer/              # React UI
    ├── App.tsx
    ├── components/        # UI 컴포넌트
    ├── hooks/             # useSpeechRecognition, useSettings
    └── lib/               # 타입, IPC wrapper
```

## 보안

- API 키는 main process에서만 사용 (renderer에 노출 안 됨)
- `contextIsolation: true`, `nodeIntegration: false`
- IPC 통신은 contextBridge를 통해 안전하게 처리

## 라이선스

MIT
