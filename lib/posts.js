/**
 * lib/posts.js
 * content/posts/*.md 를 읽어서 frontmatter + 본문 제공.
 */
const fs = require('fs');
const path = require('path');

const matter = (() => {
  try { return require('gray-matter'); }
  catch { return null; }
})();

const POSTS_DIR = path.resolve(process.cwd(), 'content', 'posts');

function listPosts() {
  if (!fs.existsSync(POSTS_DIR)) return [];
  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
  const posts = [];
  for (const f of files) {
    const raw = fs.readFileSync(path.join(POSTS_DIR, f), 'utf8');
    let data = {};
    let content = raw;
    if (matter) {
      const parsed = matter(raw);
      data = parsed.data || {};
      content = parsed.content || '';
    } else {
      const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(raw);
      if (m) {
        const fmLines = m[1].split('\n');
        for (const line of fmLines) {
          const mm = /^([a-zA-Z_]+):\s*"?(.*?)"?\s*$/.exec(line);
          if (mm) data[mm[1]] = mm[2];
        }
        content = m[2];
      }
    }
    const slug = f.replace(/\.md$/, '');
    posts.push({ slug, data, content, path: f });
  }
  // 최신순
  posts.sort((a, b) => (b.data.date || '').localeCompare(a.data.date || ''));
  return posts;
}

function getPost(slug) {
  const f = path.join(POSTS_DIR, `${slug}.md`);
  if (!fs.existsSync(f)) return null;
  const raw = fs.readFileSync(f, 'utf8');
  let data = {}, content = raw;
  if (matter) {
    const parsed = matter(raw);
    data = parsed.data || {};
    content = parsed.content || '';
  } else {
    const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(raw);
    if (m) {
      const fmLines = m[1].split('\n');
      for (const line of fmLines) {
        const mm = /^([a-zA-Z_]+):\s*"?(.*?)"?\s*$/.exec(line);
        if (mm) data[mm[1]] = mm[2];
      }
      content = m[2];
    }
  }
  return { slug, data, content };
}

module.exports = { listPosts, getPost };
