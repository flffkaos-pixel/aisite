
[ml-bear-times.com](https://www.ml-bear-times.com/)??AI ?´ìŠ¤ë¥?ë§¤ì¼ ?ë™?¼ë¡œ ?¤í¬?©í•´ ?œêµ­?´ë¡œ ë²ˆì—­?˜ì—¬ ?œë¹„?¤í•˜???¬ì´?¸ì…?ˆë‹¤.

## êµ¬ì¡°

- `app/` ??Next.js 14 App Router (???„ì¹´?´ë¸Œ/?¬ìŠ¤??
- `content/posts/` ??ë²ˆì—­??Markdown ?¬ìŠ¤??(frontmatter + ë³¸ë¬¸)
- `scripts/scrape.js` ???€???¬ì´?¸ì—??ê¸€ URL/ë©”í? ì¶”ì¶œ
- `scripts/translate.js` ??Markdown??LLM APIë¡??¼ë³¸?´â†’?œêµ­??ë²ˆì—­
- `scripts/sync.js` ???¤í¬??+ ë²ˆì—­ ?µí•© ?¤í–‰
- `.github/workflows/sync-daily.yml` ??ë§¤ì¼ ?ì •(KST) ?¤í–‰

## ë¡œì»¬ ?¤í–‰

```bash
npm install
npm run dev
```

## ?˜ë™ ?™ê¸°??

```bash
node scripts/sync.js   # ëª¨ë“œ: since-last (ìµœê·¼ ë¯¸ë²ˆ??ê¸€ë§?
node scripts/sync.js --all   # ?„ì²´ ?¬ë²ˆ??
```

## ?˜ê²½ë³€??

`.env.local`:

```
LLM_API_URL=...
LLM_API_KEY=...
LLM_MODEL=...
```
