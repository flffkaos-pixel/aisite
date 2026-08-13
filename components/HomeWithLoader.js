'use client';

import { useEffect, useState } from 'react';
import HexScene from './HexScene';

export default function HomeWithLoader({ posts }) {
  // Show loader only if there are no posts (should not happen with current data)
  const [showLoader, setShowLoader] = useState(!(posts && posts.length > 0));

  // Optionally hide loader after a short delay to avoid flash if posts become available later
  useEffect(() => {
    if (showLoader && posts && posts.length > 0) {
      const id = setTimeout(() => setShowLoader(false), 100);
      return () => clearTimeout(id);
    }
  }, [showLoader, posts]);

  if (showLoader) {
    return <HexScene />;
  }

  return (
    <div>
      <h1>Korean AI News</h1>
      <div>
        {posts.map((post) => (
          <div key={post.slug} style={{ borderBottom: '1px solid #eee', padding: '16px 0' }}>
            <h2>{post.data.title}</h2>
            <p>{post.data.date}</p>
            <p>{post.content.slice(0, 200)}...</p>
          </div>
        ))}
      </div>
    </div>
  );
}
