/**
 * lib/md.js
 * Markdown -> HTML (실행타임에 필요한 최소 렌더러).
 *
 * 의존성 (ESM 마이그레이션 이슈가 잦은) remark/remark-html을 쓰지 않고
 * Markdown 본문에 충분한 수준의 HTML을 만들어내는 최소 컨버터를 직접 구현.
 * Escape는 항상 먼저 한 뒤에 블록 트리를 만든다.
 */

function escapeHtml(s) {
  return s
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#39;');
}

function inline(s) {
  let t = escapeHtml(s);
  // images (md) — handle first
  t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
    (_, alt, src, title) => `<img src="${src}" alt="${alt}"${title ? ` title="${title}"` : ''} />`);
  // links
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
    (_, label, href, title) => `<a href="${href}"${title ? ` title="${title}"` : ''} target="_blank" rel="noopener noreferrer">${label}</a>`);
  // bold/italic/code
  t = t.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
  t = t.replace(/\*\*([^\*]+)\*\*/g, (_, c) => `<strong>${c}</strong>`);
  t = t.replace(/\*([^\*]+)\*/g, (_, c) => `<em>${c}</em>`);
  t = t.replace(/_([^_]+)_/g, (_, c) => `<em>${c}</em>`);
  return t;
}

function toHtml(md) {
  const lines = (md || '').replace(/\r\n?/g, '\n').split('\n');
  let out = '';
  let i = 0;
  let inList = 0; // 0 none, 1 ul, 2 ol
  let listType = '';
  let para = [];

  const closeList = () => {
    if (inList) {
      out += `</${listType}>\n`;
      inList = 0;
      listType = '';
    }
  };

  const flushPara = () => {
    if (para.length) {
      out += `<p>${inline(para.join(' '))}</p>\n`;
      para = [];
    }
  };

  while (i < lines.length) {
    let line = lines[i];

    // blank: paragraph break
    if (/^\s*$/.test(line)) {
      flushPara();
      closeList();
      i++;
      continue;
    }

    // heading
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      flushPara();
      closeList();
      const level = h[1].length;
      out += `<h${level}>${inline(h[2].trim())}</h${level}>\n`;
      i++;
      continue;
    }

    // horizontal rule
    if (/^\s*([-*_])\1\1\1*\s*$/.test(line)) {
      flushPara();
      closeList();
      out += '<hr />\n';
      i++;
      continue;
    }

    // blockquote (consecutive)
    const blockM = /^>\s?(.*)$/;
    if (blockM.test(line)) {
      flushPara();
      closeList();
      const buf = [];
      while (i < lines.length && blockM.test(lines[i])) {
        buf.push(lines[i].replace(blockM, '$1'));
        i++;
      }
      out += `<blockquote>${inline(buf.join('<br/>'))}</blockquote>\n`;
      continue;
    }

    // unordered list
    const ulM = /^\s*[-*+]\s+(.*)$/;
    const olM = /^\s*\d+\.\s+(.*)$/;
    if (ulM.test(line)) {
      flushPara();
      if (inList !== 1) { closeList(); inList = 1; listType = 'ul'; out += '<ul>\n'; }
      out += `<li>${inline(line.replace(ulM, '$1').trim())}</li>\n`;
      i++;
      continue;
    }
    if (olM.test(line)) {
      flushPara();
      if (inList !== 2) { closeList(); inList = 2; listType = 'ol'; out += '<ol>\n'; }
      out += `<li>${inline(line.replace(olM, '$1').trim())}</li>\n`;
      i++;
      continue;
    }

    // image-only line
    const img = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)\s*$/.exec(line.trim());
    if (img) {
      flushPara();
      closeList();
      out += `<p><img src="${img[2]}" alt="${img[1]}"${img[3] ? ` title="${img[3]}"` : ''} /></p>\n`;
      i++;
      continue;
    }

    // paragraph accumulation
    para.push(line.trim());
    i++;
  }

  flushPara();
  closeList();
  return out;
}

module.exports = { toHtml };
