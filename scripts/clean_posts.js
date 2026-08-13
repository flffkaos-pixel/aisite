/**
 * scripts/clean_posts.js
 * Removes scraped CSS junk and newsletter signup boilerplate from content/posts/*.md
 */
const fs = require('fs');
const path = require('path');

const DIR = path.resolve(__dirname, '..', 'content', 'posts');

const CSS_RE = /signup-form-wrapper|content-mobile-text|content-desktop-text|q-fontsize|@media|line-height|box-shadow|<(style|script)/i;
const SIGNUP_RE = /（ほぼ）毎日AIニュース|\(ほぼ\)毎日AIニュース|ぜひご登録ください/;

function cleanBody(body) {
  const out = [];
  for (const line of body.split('\n')) {
    if (CSS_RE.test(line)) continue;
    if (SIGNUP_RE.test(line)) continue;
    out.push(line);
  }
  // normalize: collapse 3+ blank lines into 1, trim leading/trailing blanks
  let text = out.join('\n');
  text = text.replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '').replace(/\n+$/, '');
  return text + '\n';
}

let changed = 0;
for (const f of fs.readdirSync(DIR).filter(f => f.endsWith('.md'))) {
  const fp = path.join(DIR, f);
  const raw = fs.readFileSync(fp, 'utf8');
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(raw);
  if (!m) continue;
  const body = cleanBody(m[2]);
  if (body !== m[2]) {
    fs.writeFileSync(fp, '---\n' + m[1] + '\n---\n' + body, 'utf8');
    changed++;
    console.log('cleaned', f);
  }
}
console.log('Done. Cleaned', changed, 'files.');