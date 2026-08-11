export const dynamic = 'force-static';

export default function About() {
  return (
    <>
      <section className="hero">
        <h1>소개</h1>
      </section>
      <div className="prose">
        <p>
          이 사이트는 일본 AI 뉴스레터{' '}
          <a href="https://www.ml-bear-times.com/" target="_blank" rel="noopener noreferrer">ML_Bear Times</a>의
          글을 매일 자동으로 스크랩해 한국어로 번역하여 서비스합니다. 원문의 저작권은 원저작자(ML_Bear)에게 있으며,
          이 사이트는 번역판을 자동 생성할 뿐입니다.
        </p>
        <h2>동작 방식</h2>
        <ul>
          <li>GitHub Actions가 하루 1회(한국 시간 자정) 실행됩니다.</li>
          <li>대상 사이트의 RSS 피드에서 최신 글을 추출합니다.</li>
          <li>Gemini API를 통해 일본어 원문을 한국어 Markdown으로 번역합니다.</li>
          <li>번역된 글을 commit하고 Vercel이 자동으로 배포합니다.</li>
        </ul>
        <h2>면책</h2>
        <p>
          번역은 LLM에 의해 자동 생성되므로 오역이 있을 수 있습니다. 중요한 내용은 원문을 확인해 주세요.
        </p>
      </div>
    </>
  );
}
