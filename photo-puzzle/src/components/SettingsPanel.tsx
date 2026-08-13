// SettingsPanel.tsx - 설정 패널

import React, { useState } from 'react'
import { useGameStore } from '../store'

export const SettingsPanel: React.FC = () => {
  const { showPreview, showGhost, soundEnabled, togglePreview, toggleGhost, toggleSound } = useGameStore()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button 
        className="settings-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="설정 열기"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {isOpen && (
        <div className="settings-overlay" onClick={() => setIsOpen(false)}>
          <div className="settings-panel" onClick={e => e.stopPropagation()}>
            <div className="settings-header">
              <h3>설정</h3>
              <button className="close-btn" onClick={() => setIsOpen(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="settings-content">
              <div className="setting-group">
                <h4>게임 플레이</h4>
                
                <label className="setting-item">
                  <span className="setting-info">
                    <strong>미리보기</strong>
                    <span>원본 이미지를 반투명으로 표시</span>
                  </span>
                  <button 
                    className={`toggle-switch ${showPreview ? 'on' : ''}`}
                    onClick={togglePreview}
                    role="switch"
                    aria-checked={showPreview}
                  >
                    <span className="toggle-thumb" />
                  </button>
                </label>

                <label className="setting-item">
                  <span className="setting-info">
                    <strong>가이드 이미지</strong>
                    <span>배경에 완성된 그림 희미하게 표시</span>
                  </span>
                  <button 
                    className={`toggle-switch ${showGhost ? 'on' : ''}`}
                    onClick={toggleGhost}
                    role="switch"
                    aria-checked={showGhost}
                  >
                    <span className="toggle-thumb" />
                  </button>
                </label>

                <label className="setting-item">
                  <span className="setting-info">
                    <strong>사운드</strong>
                    <span>효과음 켜기/끄기</span>
                  </span>
                  <button 
                    className={`toggle-switch ${soundEnabled ? 'on' : ''}`}
                    onClick={toggleSound}
                    role="switch"
                    aria-checked={soundEnabled}
                  >
                    <span className="toggle-thumb" />
                  </button>
                </label>
              </div>

              <div className="setting-group">
                <h4>조작 방법</h4>
                <div className="controls-help">
                  <div className="control-help">
                    <kbd>드래그</kbd> <span>조각 이동</span>
                  </div>
                  <div className="control-help">
                    <kbd>더블클릭</kbd> <span>조각 회전 (90°)</span>
                  </div>
                  <div className="control-help">
                    <kbd>우클릭</kbd> <span>조각 회전 (90°)</span>
                  </div>
                  <div className="control-help">
                    <kbd>P</kbd> <span>미리보기 토글</span>
                  </div>
                  <div className="control-help">
                    <kbd>G</kbd> <span>가이드 토글</span>
                  </div>
                  <div className="control-help">
                    <kbd>S</kbd> <span>사운드 토글</span>
                  </div>
                </div>
              </div>

              <div className="setting-group">
                <h4>데이터 관리</h4>
                <div className="data-actions">
                  <button className="btn-danger" onClick={() => {
                    if (confirm('모든 저장 데이터(기록, 자동저장)가 삭제됩니다. 계속하시겠습니까?')) {
                      localStorage.removeItem('photo-puzzle-save')
                      localStorage.removeItem('puzzle-records')
                      alert('삭제되었습니다.')
                    }
                  }}>
                    모든 데이터 삭제
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}