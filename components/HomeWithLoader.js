'use client';

import { useEffect, useState } from 'react';
import HexScene from './HexScene';

export default function HomeWithLoader({ posts }) {
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    // Hide loader when posts are available or after a short delay
    if (posts && posts.length > 0) {
      setShowLoader(false);
    } else {
      const id = setTimeout(() => setShowLoader(false), 2500);
      return () => clearTimeout(id);
    };
  }, [posts]);

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
