// GameUI.tsx - 게임 UI (타이머, 이동 횟수, 진행도, 컨트롤)

import React from 'react'
import { useGameStore } from '../store'
import { Difficulty, DIFFICULTY_CONFIGS } from '../types'

export const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export const GameUI: React.FC = () => {
  const { 
    difficulty, 
    elapsedTime, 
    moveCount, 
    isComplete, 
    isPlaying,
    pieces, 
    placedPieces,
    showPreview,
    showGhost,
    soundEnabled,
    togglePreview,
    toggleGhost,
    toggleSound,
    resetGame,
    setDifficulty,
  } = useGameStore()

  const placedCount = Array.from(placedPieces.values()).filter(p => 
    pieces.find(pc => pc.correctX === p.x && pc.correctY === p.y && pc.rotation === p.rotation)
  ).length
  const totalCount = pieces.length
  const progress = totalCount > 0 ? (placedCount / totalCount) * 100 : 0

  const handleDifficultyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (isPlaying && !isComplete) {
      if (!confirm('난이도를 변경하면 현재 게임이 초기화됩니다. 계속하시겠습니까?')) {
        e.currentTarget.value = difficulty
        return
      }
    }
    setDifficulty(e.currentTarget.value as Difficulty)
  }

  return (
    <header className="game-header">
      <div className="header-left">
        <h1>Photo Puzzle</h1>
        <span className="difficulty-badge">{DIFFICULTY_CONFIGS[difficulty].label}</span>
      </div>

      <div className="header-center">
        <div className="stats">
          <div className="stat">
            <span className="stat-value">{formatTime(elapsedTime)}</span>
            <span className="stat-label">시간</span>
          </div>
          <div className="stat-divider">|</div>
          <div className="stat">
            <span className="stat-value">{moveCount}</span>
            <span className="stat-label">이동</span>
          </div>
          <div className="stat-divider">|</div>
          <div className="stat">
            <span className="stat-value">{placedCount} / {totalCount}</span>
            <span className="stat-label">조각</span>
          </div>
        </div>
        
        <div className="progress-bar" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="header-right">
        <div className="controls">
          <button 
            className={`icon-btn ${showPreview ? 'active' : ''}`}
            onClick={togglePreview}
            title="미리보기 (P)"
            aria-pressed={showPreview}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
          <button 
            className={`icon-btn ${showGhost ? 'active' : ''}`}
            onClick={toggleGhost}
            title="가이드 이미지 (G)"
            aria-pressed={showGhost}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 9h6v6H9z" />
            </svg>
          </button>
          <button 
            className={`icon-btn ${soundEnabled ? '' : 'muted'}`}
            onClick={toggleSound}
            title="사운드 (S)"
            aria-pressed={soundEnabled}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          </button>
        </div>
        
        <div className="main-controls">
          <select 
            value={difficulty} 
            onChange={handleDifficultyChange} 
            disabled={isPlaying && !isComplete}
            className="difficulty-select"
            aria-label="난이도 변경"
          >
            {(Object.entries(DIFFICULTY_CONFIGS) as [Difficulty, typeof DIFFICULTY_CONFIGS[Difficulty]][]).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
          <button 
            className="btn-reset"
            onClick={() => {
              if (confirm('정말 처음부터 다시 하시겠습니까?')) resetGame()
            }}
            disabled={!isPlaying}
          >
            다시 시작
          </button>
        </div>
      </div>
    </header>
  )
}