import './globals.css';

export const metadata = {
  title: 'ML_Bear Times 한국어 판',
  description: '매일 전해지는 AI 뉴스 — 한국어로 옮긴 ML_Bear Times',
  metadataBase: new URL('https://aisite-kr.vercel.app'),
  openGraph: {
    title: 'ML_Bear Times 한국어 판',
    description: '매일 전해지는 AI 뉴스 — 한국어로 옮긴 ML_Bear Times',
    type: 'website'
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <header className="site-header">
          <div className="wrap">
            <a className="logo" href="/">ML_Bear Times <span className="logo-kr">한국어 판</span></a>
            <nav>
              <a href="/archive">아카이브</a>
              <a href="/about">소개</a>
            </nav>
          </div>
        </header>
        <main className="wrap main">{children}</main>
        <footer className="site-footer">
          <div className="wrap">
            <div>
              <a href="https://www.ml-bear-times.com/" target="_blank" rel="noopener noreferrer">원본 사이트 (일본어)</a>
              {' · '}<a href="https://www.ml-bear-times.com/rss/" target="_blank" rel="noopener noreferrer">RSS</a>
            </div>
            <div className="muted">© {new Date().getFullYear()} ML_Bear Times 한국어 판. 원문의 저작권은 원저작자에게 있습니다.</div>
          </div>
        </footer>
      </body>
    </html>
  );
}
