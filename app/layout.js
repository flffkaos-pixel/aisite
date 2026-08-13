import './globals.css';

export const metadata = {
  title: 'AI 뉴스 번역 모음',
  description: '매일 일본 AI 뉴스를 모아 놓은 페이지입니다.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
