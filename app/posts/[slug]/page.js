import Link from 'next/link';
import { listPosts, getPost } from '../../../lib/posts';
import Markdown from '../../../components/Markdown';

export function generateStaticParams() {
  return listPosts().map((post) => ({ slug: post.slug }));
}

export const dynamicParams = false;

export default function PostPage({ params }) {
  const post = getPost(params.slug);
  if (!post) {
    return (
      <div className="page">
        <p>게시물을 찾을 수 없습니다. <Link href="/">← 목록으로</Link></p>
      </div>
    );
  }
  return (
    <div className="page">
      <nav className="back-nav">
        <Link href="/">← 전체 뉴스 목록</Link>
      </nav>
      <article className="post-article">
        <header className="post-article-head">
          <time className="post-date" dateTime={post.data.date}>{post.data.date}</time>
          <h1>{post.data.title}</h1>
        </header>
        {post.data.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="post-article-image" src={post.data.image} alt={post.data.title} />
        )}
        <Markdown>{post.content}</Markdown>
      </article>
    </div>
  );
}