/**
 * scripts/translate.js
 *
 * scripts/data/articles.json 에 있는 일본어 원문을 한국어로 번역하여
 * content/posts/<slug>.md 파일로 저장한다.
 *
 * OpenAI 호환 엔드포인트를 사용한다. Gemini의 OpenAI 호환 모드가 기본:
 *   LLM_API_URL=https://generativelanguage.googleapis.com/v1beta/openai/chat/completions
 *   LLM_MODEL=gemini-2.0-flash
 *   LLM_API_KEY=...
 *
 * 이미 content/posts/<slug>.md 가 존재하면 (frontmatter source_url 과 동일) 건너뛴다.
 *
 * Usage:
 *   node scripts/translate.js                 # 미번역 글만
 *   node scripts/translate.js --force          # 모두 재번역
 *   node scripts/translate.js --slug <slug>    # 단일
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'scripts', 'data', 'articles.json');
const POSTS_DIR = path.join(ROOT, 'content', 'posts');
const FRONT_FILE = path.join(ROOT, 'scripts', 'data', 'translated.json');

const API_URL = process.env.LLM_API_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const API_KEY = process.env.LLM_API_KEY || process.env.GEMINI_API_KEY || '';
// 콤마로 구분된 폴백 체인 지원: 앞 모델이 제거/접근불가면 다음으로 넘어감.
const MODELS = (process.env.LLM_MODEL || 'gemini-2.0-flash').split(',').map(s => s.trim()).filter(Boolean);

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function loadJSON(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return fallback; }
}

function saveJSON(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
}

function stripYAMLBlock(s) {
  // body 에 YAML front matter 가 없도록 보호 (시작이 --- 인 경우를 드물게 처리)
  if (s.startsWith('---')) return '\n' + s;
  return s;
}

const SYSTEM_PROMPT = `당신은 IT/AI 분야의 전문적인 일본어->한국어 번역가입니다.
규칙:
1. 원문 Markdown 구조(제목, 목록, 인용구, 링크, 이미지, 굵게/기울임)를 그대로 유지한다.
2. 링크 URL, 이미지 URL, 코드는 변경하지 않는다.
3. 고유명사(회사명, 제품명, 모델명, 인물명 등)는 가능하면 원어 그대로 둔다. 단 널리 알려진 경우 한국어 표기 허용.
4. AI/IT 용어는 한국어 산업 표준 표현 사용.
5. 트위터/X 인용문 뒤 "(번역)" 표기도 한국어로 "(번역)"으로 유지.
6. 부자연스러운 기계번역 톤을 피하고, 자연스러운 한국어 문장으로 다듬되 의미를 왜곡하지 않는다.
7. 출력은 번역된 Markdown 본문만. 설명, 주석, 사족 금지.
8. 원문에 뉴스레터/구독/브랜드(ML_Bear Times 등) 광고성 문구가 있다면 해당 문구는 번역하지 말고 생략한다.
9. 출력물에는 일본어가 전혀 남아 있으면 안 된다. (참고: 激化→치열해짐, 話題→화제, まとめ→요약, 行くぞ→가자, 優れた→뛰어난, 凌駕→능가, 操作→조작, 構築→구축, 離れる→벗어나다 등 일본어 어휘/문법/표현은 반드시 자연스러운 한국어로 옮긴다.) 인용문/트윗 원문도 한국어로 번역하되, 한국어 번역문 뒤에 "(번역)" 표기를 유지한다. 미번역 일본어 문장 하나도 남기지 않는다.`;

// 일본어 잔재 판정: 히라가나/가타카나/한자(한국어 문장에는 거의 안 씀) 문자 개수.
function countJp(s) {
  const m = (s || '').match(/[ぁ-んァ-ン一-龠]/g);
  return m ? m.length : 0;
}
// 번역 품질 검증: 잔재가 너무 많으면 실패로 처리해 재시도/마킹.
function isDirty(s) {
  return countJp(s) > 40;
}

async function translate(text) {
  // Chunk overlong text — smaller chunks to stay under Groq TPM limit (8000/min)
  const MAX = 2500; // chars per chunk (일본어 ≈ 1.5 tok/char; 본문+시스템 프롬프트 < 8000 TPM 유지)
  if (text.length <= MAX) return await callTranslate(text);

  // Split by paragraphs to preserve structure.
  const paras = text.split(/\n\n+/);
  const chunks = [];
  let cur = '';
  for (const p of paras) {
    if ((cur + '\n\n' + p).length > MAX) {
      if (cur) chunks.push(cur);
      cur = p;
    } else {
      cur = cur ? cur + '\n\n' + p : p;
    }
  }
  if (cur) chunks.push(cur);

  process.stderr.write(`  split into ${chunks.length} chunks\n`);
  const out = [];
  for (let i = 0; i < chunks.length; i++) {
    process.stderr.write(`  chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)\n`);
    out.push(await callTranslate(chunks[i]));
    // Delay between chunks to respect Groq TPM limit (12k/min)
    if (i < chunks.length - 1) {
      await new Promise(r => setTimeout(r, 45000)); // 45 sec
    }
  }
  const joined = out.join('\n\n');
  if (isDirty(joined)) {
    throw new Error(`output still contains japanese (${countJp(joined)} chars)`);
  }
  return joined;
}

async function callTranslate(text) {
  if (!API_KEY) throw new Error('LLM_API_KEY not set');
  const body = {
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: text }
    ],
    temperature: 0.2,
    max_tokens: 4096
  };
  let lastErr = null;
  for (const model of MODELS) {
    try {
      return await callModel(model, body);
    } catch (e) {
      lastErr = e;
      // モデル不存在/アクセス権なし → 次のモデルへフォールバック
      if (/model_not_found|does not exist|do not have access/i.test(e.message)) {
        process.stderr.write(`  model '${model}' unavailable, trying next\n`);
        continue;
      }
      throw e;
    }
  }
  throw lastErr || new Error('translate failed: no usable model');
}

async function callModel(model, body) {
  const payload = { ...body, model };
  // Reasonin형 모델: reasoning을 최소화해서 content에 실제 번역이 남도록.
  if (/gpt-oss/i.test(model)) {
    payload.reasoning_effort = 'low';
    payload.include_reasoning = false;
    // gpt-oss-120b free tier TPM 8000 → 출력 상한을 줄여 429/413 회피
    payload.max_tokens = 3000;
  } else if (/qwen/i.test(model)) {
    payload.reasoning_effort = 'none';
  }
  const MAX_RETRIES = 6;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const data = await res.json();
      const out = data?.choices?.[0]?.message?.content || '';
      if (!out.trim()) {
        process.stderr.write(`  empty response (attempt ${attempt}/${MAX_RETRIES})\n`);
        await new Promise(r => setTimeout(r, Math.min(30, 2 ** attempt) * 1000));
        continue;
      }
      return out.trim();
    }
    const t = await res.text();
    // Retry on 429 (rate limit) / 5xx with backoff; fail fast on 4xx others.
    const retriable = res.status === 429 || res.status >= 500;
    if (!retriable) throw new Error(`HTTP ${res.status}: ${t.slice(0, 500)}`);
    // Try to honor Retry-After / wait time from Groq error.
    let waitSec = Math.min(60, 2 ** attempt);
    try {
      const j = JSON.parse(t);
      const msg = (j?.error?.message || '').match(/try again in ([\d.]+)s/i);
      if (msg) waitSec = Math.min(90, Math.max(waitSec, parseFloat(msg[1]) + 1));
    } catch {}
    process.stderr.write(`  rate limited (HTTP ${res.status}), retry in ${waitSec}s (attempt ${attempt}/${MAX_RETRIES})\n`);
    await new Promise(r => setTimeout(r, waitSec * 1000));
  }
  throw new Error(`translate failed after ${MAX_RETRIES} retries (rate limited)`);
}

function mdEscape(s) {
  return (s || '').replace(/"/g, '\\"').replace(/\r?\n/g, ' ');
}

function writeFrontmatter({ slug, title, date, image, source_url, source_title }) {
  const lines = [
    '---',
    `slug: "${slug}"`,
    `title: "${mdEscape(title)}"`,
    `date: "${date || ''}"`,
    `image: "${image || ''}"`,
    `source_url: "${source_url}"`,
    `source_title: "${mdEscape(source_title)}"`,
    `translated: true`,
    '---'
  ];
  return lines.join('\n');
}

async function main() {
  if (!API_KEY) {
    process.stderr.write('WARN: LLM_API_KEY not set. Skipping translation, will only WRITE placeholders for missing slugs.\n');
  }
  if (!fs.existsSync(SRC)) {
    process.stderr.write(`No ${SRC}; run scrape first.\n`);
    process.exit(1);
  }
  ensureDir(POSTS_DIR);
  const articles = loadJSON(SRC, {});
  const done = loadJSON(FRONT_FILE, {});
  const argv = process.argv.slice(2);
  const all = argv.includes('--force');
  const fromToday = argv.includes('--from-today');
  const dirtyOnly = argv.includes('--dirty');
  const slugArg = argv.indexOf('--slug');
  const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const slugs = Object.keys(articles);
  let i = 0;
  for (const slug of slugs) {
    i++;
    const a = articles[slug];
    if (!a || !a.body) continue;
    if (fromToday && a.date && a.date < todayStr) {
      process.stderr.write(`[${i}/${slugs.length}] ${slug} (skip, before today)\n`);
      continue;
    }
    if (slugArg >= 0 && argv[slugArg + 1] !== slug) continue;
    if (!all && done[slug]?.translated) {
      process.stderr.write(`[${i}/${slugs.length}] ${slug} (skip, already translated)\n`);
      continue;
    }
    if (dirtyOnly) {
      const filePath = path.join(POSTS_DIR, `${slug}.md`);
      if (fs.existsSync(filePath)) {
        const existing = fs.readFileSync(filePath, 'utf8').replace(/^---[\s\S]*?---\s*/, '');
        if (!isDirty(existing)) {
          process.stderr.write(`[${i}/${slugs.length}] ${slug} (skip, clean)\n`);
          continue;
        }
      }
    }
    process.stderr.write(`[${i}/${slugs.length}] ${slug} translate(${a.body.length} chars)\n`);
    let krTitle = a.title;
    let krBody = a.body;
    if (API_KEY) {
      try {
        krTitle = await callTranslate(`다음 일본어 제목을 한국어로 번역해줘. 출력은 번역된 제목만.\n\n${a.title}`);
        krBody = await translate(a.body);
      } catch (e) {
        process.stderr.write(`  translate failed: ${e.message}\n`);
        done[slug] = { ...done[slug], translated: false, error: e.message, at: new Date().toISOString() };
        saveJSON(FRONT_FILE, done);
        continue;
      }
    }
    const fm = writeFrontmatter({
      slug,
      title: krTitle.trim(),
      date: a.date,
      image: a.image,
      source_url: a.url,
      source_title: a.title
    });
    const filePath = path.join(POSTS_DIR, `${slug}.md`);
    fs.writeFileSync(filePath, fm + '\n\n' + stripYAMLBlock(krBody) + '\n');
    done[slug] = { translated: !!API_KEY, at: new Date().toISOString(), file: filePath };
    saveJSON(FRONT_FILE, done);
    // throttle for Groq free tier (12k TPM) — wait 90 sec between articles
    await new Promise(r => setTimeout(r, 90000));
  }
  process.stderr.write(`[done] ${Object.keys(done).filter(s => done[s].translated).length}/${slugs.length} translated\n`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
