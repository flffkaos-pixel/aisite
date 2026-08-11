import Link from 'next/link';
import { listPosts } from '../lib/posts';

export const dynamic = 'force-static';

export default function Home() {
  const posts = listPosts();
  const latest = posts[0];
  const rest = posts.slice(1, 7);

  return (
    <>
      <section className="hero">
        <h1>매일, AI 뉴스를 한국어로.</h1>
        <p>일본 AI 뉴스레터 <a href="https://www.ml-bear-times.com/" target="_blank" rel="noopener noreferrer">ML_Bear Times</a>를 한국어로 옮겨 매일 자동 업데이트합니다.</p>
      </section>

      {latest ? (
        <section>
          <div className="section-title">최신 호</div>
          <Link className="list-item" href={`/posts/${latest.slug}`}>
            <div className="title">{latest.data.title}</div>
            <div className="date">{formatDate(latest.data.date)}</div>
          </Link>
        </section>
      ) : (
        <p className="muted">아직 번역된 글이 없습니다. GitHub Actions가 한 번 실행되면 글들이 여기 나타납니다.</p>
      )}

      {rest.length > 0 && (
        <section style={{ marginTop: 24 }}>
          <div className="section-title">이전 글</div>
          <div className="list">
            {rest.map(p => (
              <Link key={p.slug} className="list-item" href={`/posts/${p.slug}`}>
                <div className="title">{p.data.title}</div>
                <div className="date">{formatDate(p.data.date)}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="pagination">
        <Link href="/archive">전체 아카이브 →</Link>
      </div>
    </>
  );
}

function formatDate(d) {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
    weekday: 'short'
  });
}
