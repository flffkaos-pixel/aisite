/**
 * scripts/scrape.js
 *
 * ml-bear-times.com 의 RSS 피드에서 글 목록과 본문(HTML)을 추출한다.
 * Ghost 사이트는 /rss/ 에 content:encoded (전문 HTML) 을 포함한다.
 *
 * 출력: scripts/data/articles.json  { slug -> { slug, url, title, date, image, body_md } }
 *
 * Usage:
 *   node scripts/scrape.js                         # RSS 전체 (보통 ~20개)
 *   node scripts/scrape.js --limit 5               # 최근 5개만
 *   node scripts/scrape.js --url <post-url>        # 단일 URL (단일 페이지 스크랩)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'scripts', 'data');
const DATA_FILE = path.join(DATA_DIR, 'articles.json');
const RSS_URL = 'https://www.ml-bear-times.com/rss/';

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; aisite-kr-bot/1.0)',
      'Accept': 'text/html,application/xhtml+xml,application/rss+xml',
      'Accept-Language': 'ja,en;q=0.5'
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
  return res.text();
}

function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/&#39;/g, "'");
}

function stripTags(s) {
  return s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"').replace(/&#39;/g, "'");
}

/**
 * Lightweight XML RSS parser (no deps).
 * We only need: item -> { title, link, pubDate, content:encoded, media:content/url }
 */
function parseRSS(xml) {
  // Normalize self-closing media tags and grab items.
  const items = [];
  const reItem = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = reItem.exec(xml)) !== null) {
    const block = m[1];
    const title = tagCDATA(block, 'title');
    const link = tagRaw(block, 'link');
    const pubDate = tagRaw(block, 'pubDate');
    const content = tagCDATA(block, 'content:encoded');
    // media:content url="..."  or media:thumbnail url="..."
    const mediaM = /<media:(?:content|thumbnail)[^>]*url="([^"]+)"/.exec(block);
    const dateM = /<dc:creator><!\[CDATA\[([\s\S]*?)\]\]><\/dc:creator>/.exec(block);
    items.push({
      title: title || '',
      url: link,
      date: pubDate || null,
      author: dateM ? dateM[1] : null,
      image: mediaM ? mediaM[1] : null,
      html: content || ''
    });
  }
  return items;
}

function tagCDATA(block, name) {
  // Try CDATA first: <name><![CDATA[ ... ]]></name>
  const cdataM = new RegExp(`<${name}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${name}>`).exec(block);
  if (!cdataM) return '';
  return cdataM[1].replace(/^\s*<!\[CDATA\[/, '').replace(/\]\]>\s*$/, '').trim();
}

function tagRaw(block, name) {
  const m = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(block);
  return m ? m[1].trim() : '';
}

function slugFromUrl(url) {
  if (!url) return '';
  const parts = url.split('/').filter(Boolean);
  return parts[parts.length - 1] || url;
}

// Minimal HTML -> Markdown for Ghost posts.
function htmlToMarkdown(html) {
  let s = html || '';
  // strip script/style/nav
  s = s.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
  s = s.replace(/<nav[\s\S]*?<\/nav>/g, '');
  // kg-card wrappers are Ghost specific; unwrap divs/figure
  s = s.replace(/<\/?div[^>]*>/g, '\n');
  s = s.replace(/<figure[^>]*>/g, '\n').replace(/<\/figure>/g, '\n');
  s = s.replace(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/g, (_, t) => `\n*${stripTags(t).trim()}*\n`);

  // headings
  s = s.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/g, (_, n, t) => `\n${'#'.repeat(+n)} ${stripTags(t).trim()}\n`);
  // lists
  s = s.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/g, (_, t) => `\n${t}\n`);
  s = s.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/g, (_, t) => `\n${t}\n`);
  s = s.replace(/<li[^>]*>([\s\S]*?)<\/li>/g, (_, t) => `- ${stripTags(t).trim()}\n`);
  // blockquote
  s = s.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/g, (_, t) => `\n> ${stripTags(t).trim()}\n`);
  // images
  s = s.replace(/<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[^>]*\/?>/g, (_, src, alt) => `\n![${alt}](${src})\n`);
  s = s.replace(/<img[^>]*src="([^"]+)"[^>]*\/?>/g, (_, src) => `\n![](${src})\n`);
  // links (keep inner text)
  s = s.replace(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g, (_, href, t) => `[${stripTags(t).trim()}](${href})`);
  // paragraphs, br
  s = s.replace(/<p[^>]*>([\s\S]*?)<\/p>/g, (_, t) => `\n${stripTags(t).trim()}\n`);
  s = s.replace(/<br\s*\/?>/g, '\n');
  // inline emphasis
  s = s.replace(/<\/?strong[^>]*>/g, '**').replace(/<\/?b[^>]*>/g, '**');
  s = s.replace(/<\/?em[^>]*>/g, '*').replace(/<\/?i[^>]*>/g, '*');
  s = s.replace(/<code[^>]*>([\s\S]*?)<\/code>/g, (_, t) => `\`${stripTags(t)}\``);
  s = s.replace(/<hr\s*\/?>/g, '\n---\n');
  // any remaining tags
  s = s.replace(/<[^>]+>/g, '');
  // entities
  s = decodeEntities(s);
  // collapse blank lines
  s = s.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+\n/g, '\n').trim();
  return s;
}

async function fetchSinglePost(url) {
  const html = await fetchText(url);
  const titleM = /<title>([\s\S]*?)<\/title>/.exec(html) || /<meta[^>]+property="og:title"[^>]+content="([^"]+)"/.exec(html);
  const dateM = /<meta[^>]+property="article:published_time"[^>]+content="([^"]+)"/.exec(html) || /"datePublished"\s*:\s*"([^"]+)"/.exec(html);
  const imgM = /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/.exec(html);
  const bodyM = /<section[^>]*class="[^"]*post-content[^"]*"[^>]*>([\s\S]*?)<\/section>/.exec(html) || /<div[^>]*class="[^"]*gh-content[^"]*"[^>]*>([\s\S]*?)<\/div>/.exec(html) || /<main[^>]*>([\s\S]*?)<\/main>/.exec(html);
  return {
    title: titleM ? decodeEntities(titleM[1].trim()) : '',
    url,
    date: dateM ? dateM[1] : null,
    image: imgM ? imgM[1] : null,
    html: bodyM ? bodyM[1] : ''
  };
}

async function main() {
  ensureDir(DATA_DIR);
  const argv = process.argv.slice(2);
  const urlArg = argv.indexOf('--url');
  const limitArg = argv.indexOf('--limit');
  const LIMIT = limitArg >= 0 ? parseInt(argv[limitArg + 1], 10) : 0;

  const known = fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : {};
  const out = { ...known };

  if (urlArg >= 0) {
    const u = argv[urlArg + 1];
    process.stderr.write(`[post] ${u}\n`);
    const p = await fetchSinglePost(u);
    const slug = slugFromUrl(u);
    out[slug] = {
      slug,
      url: u,
      title: p.title,
      date: p.date,
      image: p.image,
      body: htmlToMarkdown(p.html)
    };
  } else {
    process.stderr.write(`[rss] ${RSS_URL}\n`);
    const xml = await fetchText(RSS_URL);
    const items = parseRSS(xml);
    process.stderr.write(`[rss] ${items.length} items\n`);
    const use = LIMIT > 0 ? items.slice(0, LIMIT) : items;
    let i = 0;
    for (const it of use) {
      i++;
      const slug = slugFromUrl(it.url);
      if (out[slug] && out[slug].body) {
        process.stderr.write(`[${i}/${use.length}] ${slug} (cached)\n`);
        continue;
      }
      process.stderr.write(`[${i}/${use.length}] ${slug}\n`);
      out[slug] = {
        slug,
        url: it.url,
        title: decodeEntities(it.title),
        date: it.date,
        image: it.image,
        body: htmlToMarkdown(it.html)
      };
    }
  }

  fs.writeFileSync(DATA_FILE, JSON.stringify(out, null, 2));
  process.stderr.write(`[done] wrote ${DATA_FILE} (${Object.keys(out).length} items)\n`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
