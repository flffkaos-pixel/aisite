// App.tsx - 메인 앱 컴포넌트

import React, { useEffect, useRef } from 'react'
import { useGameStore } from './store'
import { StartScreen } from './components/StartScreen'
import { GameBoard } from './components/GameBoard'
import { GameUI } from './components/GameUI'
import { CompleteModal } from './components/CompleteModal'
import { SettingsPanel } from './components/SettingsPanel'
import './App.css'

const App: React.FC = () => {
  const { 
    sourceImage, 
    isComplete, 
    isPlaying, 
    loadGame,
    updateTimer,
    saveGame,
  } = useGameStore()

  const timerRef = useRef<ReturnType<typeof setInterval>>()
  const saveRef = useRef<ReturnType<typeof setInterval>>()

  // 타이머
  useEffect(() => {
    if (isPlaying && !isComplete) {
      timerRef.current = window.setInterval(updateTimer, 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isPlaying, isComplete, updateTimer])

  // 자동 저장 (30초마다)
  useEffect(() => {
    if (isPlaying) {
      saveRef.current = window.setInterval(saveGame, 30000)
    }
    return () => { if (saveRef.current) clearInterval(saveRef.current) }
  }, [isPlaying, saveGame])

  // 저장된 게임 자동 로드 시도
  useEffect(() => {
    if (!sourceImage && !isPlaying) {
      loadGame()
    }
  }, [loadGame])

  if (!sourceImage) {
    return <StartScreen />
  }

  return (
    <div className="app">
      <GameUI />
      <GameBoard />
      {isComplete && <CompleteModal />}
      <SettingsPanel />
    </div>
  )
}

export default App