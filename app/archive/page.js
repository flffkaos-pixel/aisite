import Link from 'next/link';
import { listPosts } from '../../lib/posts';

export const dynamic = 'force-static';

const PER_PAGE = 15;

export default function Archive({ searchParams }) {
  const posts = listPosts();
  const page = Math.max(1, parseInt(searchParams?.page || '1', 10));
  const start = (page - 1) * PER_PAGE;
  const slice = posts.slice(start, start + PER_PAGE);
  const last = Math.max(1, Math.ceil(posts.length / PER_PAGE));

  return (
    <>
      <section className="hero">
        <h1>아카이브</h1>
        <p>지금까지 한국어로 옮긴 글 {posts.length}편</p>
      </section>

      {posts.length === 0 ? (
        <p className="muted">아직 번역된 글이 없습니다.</p>
      ) : (
        <div className="list">
          {slice.map(p => (
            <Link key={p.slug} className="list-item" href={`/posts/${p.slug}`}>
              <div className="title">{p.data.title}</div>
              <div className="date">{formatDate(p.data.date)}</div>
            </Link>
          ))}
        </div>
      )}

      <div className="pagination">
        {page > 1 ? (
          <Link href={`/archive?page=${page - 1}`}>← 이전</Link>
        ) : (
          <span style={{ opacity: 0.4 }}>← 이전</span>
        )}
        <span className="active">{page} / {last}</span>
        {page < last ? (
          <Link href={`/archive?page=${page + 1}`}>다음 →</Link>
        ) : (
          <span style={{ opacity: 0.4 }}>다음 →</span>
        )}
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
