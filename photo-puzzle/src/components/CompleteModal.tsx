// CompleteModal.tsx - 완성 모달

import React, { useEffect } from 'react'
import { useGameStore } from '../store'
import { formatTime } from './GameUI'

export const CompleteModal: React.FC = () => {
  const { elapsedTime, moveCount, resetGame, isComplete } = useGameStore()

  useEffect(() => {
    if (isComplete) {
      // 축하 효과
      createConfetti()
    }
  }, [isComplete])

  const createConfetti = () => {
    const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181', '#aa96da', '#fcbad3']
    const container = document.createElement('div')
    container.className = 'confetti-container'
    container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;overflow:hidden;'
    document.body.appendChild(container)

    for (let i = 0; i < 100; i++) {
      const confetti = document.createElement('div')
      confetti.style.cssText = `
        position:absolute;
        width:${Math.random() * 8 + 4}px;
        height:${Math.random() * 8 + 4}px;
        background:${colors[Math.floor(Math.random() * colors.length)]};
        left:${Math.random() * 100}%;
        top:-20px;
        opacity:0;
        transform:rotate(${Math.random() * 360}deg);
        border-radius:${Math.random() > 0.5 ? '50%' : '0'};
        animation:confettiFall ${Math.random() * 2 + 2}s linear forwards;
      `
      container.appendChild(confetti)
    }

    // 애니메이션 키프레임 추가
    if (!document.getElementById('confetti-style')) {
      const style = document.createElement('style')
      style.id = 'confetti-style'
      style.textContent = `
        @keyframes confettiFall {
          to {
            transform: translateY(120vh) rotate(720deg);
            opacity: 0;
          }
        }
      `
      document.head.appendChild(style)
    }

    setTimeout(() => container.remove(), 5000)
  }

  if (!isComplete) return null

  return (
    <div className="modal-overlay" onClick={() => resetGame()}>
      <div className="modal complete-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-icon">🎉</div>
        <h2>퍼즐 완성!</h2>
        
        <div className="result-stats">
          <div className="result-stat">
            <span className="result-value">{formatTime(elapsedTime)}</span>
            <span className="result-label">걸린 시간</span>
          </div>
          <div className="result-stat">
            <span className="result-value">{moveCount}</span>
            <span className="result-label">이동 횟수</span>
          </div>
          <div className="result-stat">
            <span className="result-value">{Math.round(elapsedTime / Math.max(moveCount, 1) * 10) / 10}s</span>
            <span className="result-label">평균 이동 시간</span>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-primary" onClick={resetGame}>
            다시 하기
          </button>
          <button className="btn-secondary" onClick={resetGame}>
            다른 사진으로
          </button>
        </div>

        <p className="modal-hint">화면 아무 곳이나 클릭하면 다시 시작합니다</p>
      </div>
    </div>
  )
}