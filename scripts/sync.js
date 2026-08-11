/**
 * scripts/sync.js
 * scrape + translate 통합 실행 (GitHub Actions 의 entrypoint)
 */
const { spawnSync } = require('child_process');
const path = require('path');

function run(cmd, args, env) {
  console.log(`\n== ${cmd} ${args.join(' ')}\n`);
  const r = spawnSync(cmd, args, {
    stdio: 'inherit',
    env: { ...process.env, ...env },
    cwd: path.resolve(__dirname, '..')
  });
  if (r.status !== 0) {
    console.error(`Command failed: ${cmd} ${args.join(' ')}`);
    process.exit(r.status || 1);
  }
}

const node = process.execPath;
const scrapeScript = path.join(__dirname, 'scrape.js');
const translateScript = path.join(__dirname, 'translate.js');

// 1) scrape (RSS 모든 글)
let scrapeArgs = [scrapeScript];
if (process.env.SCRAPE_LIMIT) scrapeArgs.push('--limit', process.env.SCRAPE_LIMIT);
if (process.env.SCRAPE_URL) scrapeArgs.push('--url', process.env.SCRAPE_URL);
run(node, scrapeArgs);

// 2) translate (미번역 글만)
run(node, [translateScript]);
console.log('\n[sync] done');
