---
slug: "welcome"
title: "ML_Bear Times 한국어 판을 시작합니다"
date: "2026-08-11T00:00:00+09:00"
image: ""
source_url: "https://www.ml-bear-times.com/"
source_title: "ML_Bear Times"
translated: false
---

이곳은 일본 AI 뉴스레터 [ML_Bear Times](https://www.ml-bear-times.com/) 의 글을 매일 자동으로 한국어로 옮겨 싣는 사이트입니다.

## 어떻게 동작하나요?

- GitHub Actions가 하루 1번(한국 시간 자정) 실행됩니다.
- 대상 사이트의 RSS에서 최신 글을 추출합니다.
- Gemini API로 일본어 원문을 한국어 Markdown으로 번역합니다.
- 그 결과를 Git에 커밋하면 Vercel이 자동으로 배포합니다.

## 첫 글이 곧 도착합니다

이 샘플 게시글은 자동 동기화가 실행되기 전, 사이트가 정상적으로 동작하는지 확인하기 위한 자리표시글입니다.
GitHub Actions가 한 번 실행되면 실제 뉴스 번역 글들이 자동으로 채워집니다.

---

원문의 저작권은 원저작자(ML_Bear)에게 있으며, 이 사이트는 번역판을 자동으로 생성·서비스합니다.
번역은 LLM에 의해 자동 생성되므로 오역이 있을 수 있습니다.
