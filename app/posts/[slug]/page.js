import { notFound } from 'next/navigation';
import Link from 'next/link';
import { listPosts, getPost } from '../../../lib/posts';
import { toHtml } from '../../../lib/md';

export const dynamic = 'force-static';

export async function generateStaticParams() {
  return listPosts().map(p => ({ slug: p.slug }));
}

export default async function PostPage({ params }) {
  const post = getPost(params.slug);
  if (!post) notFound();
  const html = await toHtml(post.content);
  const data = post.data || {};

  return (
    <article className="post">
      <div className="muted">
        <Link href="/">← 홈</Link>
      </div>
      <h1 style={{ marginTop: 8 }}>{data.title}</h1>
      <div className="meta">
        <span>{formatDate(data.date)}</span>
        {data.source_url && (
          <a className="source" href={data.source_url} target="_blank" rel="noopener noreferrer">
            원문 보기 (일본어) ↗
          </a>
        )}
      </div>
      {data.image && <img className="hero-img" src={data.image} alt="" />}
      <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
    </article>
  );
}

function formatDate(d) {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
    weekday: 'long'
  });
}
