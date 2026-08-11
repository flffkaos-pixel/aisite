'use client';

import dynamic from 'next/dynamic';

const HexScene = dynamic(() => import('../components/HexScene'), { ssr: false });

export default function Home() {
  return <HexScene />;
}
