'use client';

import Link from 'next/link';
import HexScene from './HexScene';

function PostCard({ post }) {
  return (
    <article className="post-card">
      {post.data.image && (
        <Link href={`/posts/${post.slug}`} className="post-card-thumb">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.data.image} alt={post.data.title} loading="lazy" />
        </Link>
      )}
      <div className="post-card-body">
        <time className="post-date" dateTime={post.data.date}>{post.data.date}</time>
        <h2 className="post-title">
          <Link href={`/posts/${post.slug}`}>{post.data.title}</Link>
        </h2>
        {post.excerpt && <p className="post-excerpt">{post.excerpt}</p>}
        <Link className="post-more" href={`/posts/${post.slug}`}>읽기 →</Link>
      </div>
    </article>
  );
}

export default function HomeWithLoader({ posts }) {
  const list = Array.isArray(posts) ? posts : [];
  if (list.length === 0) {
    return <HexScene />;
  }
  return (
    <div className="page">
      <header className="site-header">
        <h1>AI 뉴스 번역 모음</h1>
        <p>매일 AI 뉴스를 모아 놓은 페이지입니다.</p>
      </header>
      <main className="post-list">
        {list.map((post) => <PostCard key={post.slug} post={post} />)}
      </main>
      <footer className="site-footer">
        <nav>
          <Link href="/privacy">개인정보 처리방침</Link>
          <span className="mx-2">·</span>
          <Link href="/contact">문의하기</Link>
        </nav>
        <p className="mt-4 text-sm">© 2026 AI 뉴스 번역 모음. All rights reserved.</p>
      </footer>
    </div>
  );
}