export const metadata = {
  title: '문의하기',
  description: 'AI 뉴스 번역 모음 문의하기 페이지입니다.',
};

export default function ContactPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">문의하기</h1>
      <div className="prose prose-gray dark:prose-invert max-w-none">
        <p className="mb-6">본 사이트 관련 문의, 제휴 제안, 오류 신고 등은 아래 이메일로 연락 주세요.</p>
        
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg mb-8">
          <p className="font-medium mb-2">이메일</p>
          <p className="text-blue-600 dark:text-blue-400">ai-news-hub@example.com</p>
        </div>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">자주 묻는 질문</h2>
        <dl className="space-y-4">
          <dt className="font-medium">번역 출처는 어디인가요?</dt>
          <dd className="text-gray-600 dark:text-gray-300 ml-4 mb-4">ml-bear-times.com의 RSS 피드를 기반으로 번역합니다.</dd>
          
          <dt className="font-medium">업데이트 주기는 어떻게 되나요?</dt>
          <dd className="text-gray-600 dark:text-gray-300 ml-4 mb-4">매일 오전 8시, 오후 8시 (KST) 2회 자동 업데이트됩니다.</dd>
          
          <dt className="font-medium">번역 품질이 궁금합니다.</dt>
          <dd className="text-gray-600 dark:text-gray-300 ml-4 mb-4">AI 번역 모델(Groq gpt-oss)을 사용하며, 지속적으로 품질 개선 중입니다.</dd>
          
          <dt className="font-medium">원문 링크는 제공되나요?</dt>
          <dd className="text-gray-600 dark:text-gray-300 ml-4 mb-4">각 글 하단에 원문 출처 링크가 표시됩니다.</dd>
        </dl>
        
        <p className="mt-8 text-sm text-gray-500 dark:text-gray-400">
          <a href="/privacy" className="underline hover:text-blue-600">개인정보 처리방침</a>
        </p>
      </div>
    </main>
  );
}