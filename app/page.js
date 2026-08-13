import { listPosts } from '../lib/posts';
import HomeWithLoader from '../components/HomeWithLoader';

export default function Page() {
  const posts = listPosts();
  console.log('Page posts count:', posts.length);
  return <HomeWithLoader posts={posts} />;
}
