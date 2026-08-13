// StartScreen.tsx - 시작 화면 (사진 선택, 난이도 선택)

import React, { useRef, useState } from 'react'
import { useGameStore } from '../store'
import { Difficulty, DIFFICULTY_CONFIGS } from '../types'

export const StartScreen: React.FC = () => {
  const { setSourceImage, setDifficulty, difficulty, loadGame } = useGameStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일을 선택해주세요.')
      return
    }

    const url = URL.createObjectURL(file)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = url
    img.onload = () => {
      setSourceImage(img, url)
      setPreviewUrl(url)
    }
    img.onerror = () => {
      alert('이미지를 불러올 수 없습니다.')
      URL.revokeObjectURL(url)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleClickUpload = () => fileInputRef.current?.click()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }

  const hasSave = localStorage.getItem('photo-puzzle-save')

  return (
    <div className="start-screen">
      <div className="start-container">
        <header className="start-header">
          <h1>Photo Puzzle</h1>
          <p>내 사진으로 퍼즐을 만들고 맞춰보세요</p>
        </header>

        <div className="upload-area">
          <div 
            className={`drop-zone ${dragActive ? 'active' : ''} ${previewUrl ? 'has-preview' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClickUpload}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleClickUpload()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleChange}
              style={{ display: 'none' }}
            />
            
            {previewUrl ? (
              <>
                <img src={previewUrl} alt="Preview" className="preview-image" />
                <div className="upload-hint">다른 사진 선택</div>
              </>
            ) : (
              <>
                <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <p className="upload-text">사진을 드래그하거나 클릭해서 업로드</p>
                <p className="upload-subtext">JPG, PNG, WebP 지원 · 최대 20MB</p>
              </>
            )}
          </div>
        </div>

        <div className="difficulty-section">
          <h2>난이도 선택</h2>
          <div className="difficulty-grid" role="radiogroup" aria-label="난이도 선택">
            {(Object.entries(DIFFICULTY_CONFIGS) as [Difficulty, typeof DIFFICULTY_CONFIGS[Difficulty]][]).map(([key, config]) => (
              <button
                key={key}
                className={`difficulty-card ${difficulty === key ? 'selected' : ''}`}
                onClick={() => setDifficulty(key)}
                role="radio"
                aria-checked={difficulty === key}
              >
                <span className="difficulty-label">{config.label}</span>
                <span className="difficulty-desc">
                  {config.rows}×{config.cols} = {config.pieceCount}조각
                </span>
                <div className="difficulty-preview">
                  {[...Array(Math.min(config.rows, 4))].map((_, r) => (
                    <div key={r} className="preview-row">
                      {[...Array(Math.min(config.cols, 8))].map((_, c) => (
                        <div key={c} className="preview-piece" />
                      ))}
                    </div>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>

        {hasSave && (
          <button className="continue-btn" onClick={() => loadGame()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            이어서 하기
          </button>
        )}

        <footer className="start-footer">
          <p>조각 수: 50 ~ 1,000개 · 회전 기능 · 자동 저장 · 기록 관리</p>
        </footer>
      </div>
    </div>
  )
}