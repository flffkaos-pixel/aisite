import { listPosts } from '../lib/posts';
import dynamic from 'next/dynamic';

const HomeWithLoader = dynamic(() => import('../components/HomeWithLoader.js'), { ssr: false });

export default function Page() {
  const posts = listPosts();
  return <HomeWithLoader posts={posts} />;
}
