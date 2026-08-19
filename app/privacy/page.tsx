export const metadata = {
  title: '개인정보 처리방침',
  description: 'AI 뉴스 번역 모음의 개인정보 처리방침입니다.',
};

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">개인정보 처리방침</h1>
      <div className="prose prose-gray dark:prose-invert max-w-none">
        <p className="mb-4"><strong>시행일:</strong> 2026년 8월 19일</p>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">1. 수집하는 개인정보</h2>
        <p className="mb-4">본 사이트는 별도의 회원가입이나 개인정보 수집 없이 운영됩니다. 구글 애드센스 광고 게재를 위해 쿠키가 사용될 수 있습니다.</p>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">2. 쿠키 및 광고</h2>
        <p className="mb-4">구글 애드센스는 사용자의 관심사에 맞는 광고를 표시하기 위해 쿠키(DART 쿠키 등)를 사용합니다. 사용자는 <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">구글 광고 설정</a>에서 맞춤 광고를 해제할 수 있습니다.</p>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">3. 제3자 서비스</h2>
        <p className="mb-4">본 사이트는 다음 제3자 서비스를 사용합니다:</p>
        <ul className="list-disc list-inside mb-4 space-y-2">
          <li>구글 애드센스 (광고 게재)</li>
          <li>구글 애널리틱스 (트래픽 분석, 선택적)</li>
          <li>Vercel (호스팅 및 분석)</li>
        </ul>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">4. 데이터 보관</h2>
        <p className="mb-4">개인식별정보를 수집하지 않으므로 별도 보관하지 않습니다. 서버 로그는 보안 및 서비스 개선 목적으로 일정 기간 보관 후 자동 삭제됩니다.</p>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">5. 사용자 권리</h2>
        <p className="mb-4">쿠키 설정 변경, 맞춤 광고 거부 등 브라우저 설정에서 관리 가능합니다.</p>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">6. 문의</h2>
        <p className="mb-4">본 방침 관련 문의는 <a href="/contact" className="text-blue-600 underline">문의하기</a> 페이지를 이용해 주세요.</p>
      </div>
    </main>
  );
}