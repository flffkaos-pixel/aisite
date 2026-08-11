# ML_Bear Times 한국어판

[ml-bear-times.com](https://www.ml-bear-times.com/)의 AI 뉴스를 매일 자동으로 스크랩해 한국어로 번역하여 서비스하는 사이트입니다.

## 구조

- `app/` — Next.js 14 App Router (홈/아카이브/포스트)
- `content/posts/` — 번역된 Markdown 포스트 (frontmatter + 본문)
- `scripts/scrape.js` — 대상 사이트에서 글 URL/메타 추출
- `scripts/translate.js` — Markdown을 LLM API로 일본어→한국어 번역
- `scripts/sync.js` — 스크랩 + 번역 통합 실행
- `.github/workflows/sync-daily.yml` — 매일 자정(KST) 실행

## 로컬 실행

```bash
npm install
npm run dev
```

## 수동 동기화

```bash
node scripts/sync.js   # 모드: since-last (최근 미번역 글만)
node scripts/sync.js --all   # 전체 재번역
```

## 환경변수

`.env.local`:

```
LLM_API_URL=...
LLM_API_KEY=...
LLM_MODEL=...
```
