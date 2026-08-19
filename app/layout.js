import './globals.css';

export const metadata = {
  title: {
    default: 'AI 뉴스 번역 모음',
    template: '%s | AI 뉴스 번역 모음',
  },
  description: '매일 최신 AI 뉴스를 한국어로 번역해 제공합니다. 오전/오후 2회 업데이트.',
  keywords: ['AI 뉴스', '인공지능', '머신러닝', '딥러닝', 'AI 트렌드', 'AI 번역'],
  authors: [{ name: 'AI 뉴스 번역 모음' }],
  creator: 'AI 뉴스 번역 모음',
  publisher: 'AI 뉴스 번역 모음',
  formatDetection: { telephone: false },
  metadataBase: new URL('https://ai-newshub-psi.vercel.app'),
  alternates: {
    canonical: 'https://ai-newshub-psi.vercel.app',
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://ai-newshub-psi.vercel.app',
    siteName: 'AI 뉴스 번역 모음',
    title: 'AI 뉴스 번역 모음',
    description: '매일 최신 AI 뉴스를 한국어로 번역해 제공합니다. 오전/오후 2회 업데이트.',
    images: [
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'AI 뉴스 번역 모음 - 매일 최신 AI 뉴스 한국어 번역',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI 뉴스 번역 모음',
    description: '매일 최신 AI 뉴스를 한국어로 번역해 제공합니다.',
    images: ['/og-image.svg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: '5m9WrjHo6HZ1aRzDjKvDEtLsv1Egv2K2yi-clQ1WHfk',
    naver: '167ff3fb1891c3bfff4597018555173118e33350',
  },
  other: {
    'naver-site-verification': '167ff3fb1891c3bfff4597018555173118e33350',
    'google-site-verification': '5m9WrjHo6HZ1aRzDjKvDEtLsv1Egv2K2yi-clQ1WHfk',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'AI 뉴스 번역 모음',
  url: 'https://ai-newshub-psi.vercel.app',
  description: '매일 최신 AI 뉴스를 한국어로 번역해 제공합니다.',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://ai-newshub-psi.vercel.app/search?q={search_term_string}',
    },
    'query-input': 'required name=search_term_string',
  },
  publisher: {
    '@type': 'Organization',
    name: 'AI 뉴스 번역 모음',
    logo: {
      '@type': 'ImageObject',
      url: 'https://ai-newshub-psi.vercel.app/favicon.svg',
    },
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1a1a2e" />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1955893232253258"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
