import './globals.css';

export const metadata = {
  title: '',
  description: 'Loading Resources',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
