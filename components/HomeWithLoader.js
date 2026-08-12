'use client';

import { useEffect, useState } from 'react';
import { HexScene } from './HexScene';

export default function HomeWithLoader({ posts }) {
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    const id = setTimeout(() => setShowLoader(false), 2500);
    return () => clearTimeout(id);
  }, []);

  if (showLoader) {
    return <HexScene />;
  }

  return (
    <div>
      <h1>Korean AI News</h1>
      <div>
        {posts.map((post) => (
          <div key={post.id} style={{ borderBottom: '1px solid #eee', padding: '16px 0' }}>
            <h2>{post.frontmatter.title}</h2>
            <p>{post.frontmatter.date}</p>
            <p>{post.content.slice(0, 200)}...</p>
          </div>
        ))}
      </div>
    </div>
  );
}
