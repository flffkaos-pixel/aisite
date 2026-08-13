// store.ts - Zustand 전역 상태 관리

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { 
  GameState, 
  GameActions, 
  Difficulty 
} from './types'
import { generatePuzzle } from './puzzleEngine'

const INITIAL_STATE: GameState = {
  difficulty: 'normal',
  sourceImage: null,
  sourceImageUrl: null,
  pieces: [],
  placedPieces: new Map(),
  selectedPieceId: null,
  dragOffset: { x: 0, y: 0 },
  startTime: 0,
  elapsedTime: 0,
  moveCount: 0,
  isComplete: false,
  isPlaying: false,
  showPreview: false,
  showGhost: true,
  soundEnabled: true,
}

const SAVE_KEY = 'photo-puzzle-save'

export const useGameStore = create<GameState & GameActions>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      setDifficulty: (difficulty: Difficulty) => {
        set({ difficulty })
        if (get().sourceImage) {
          get().initializeGame()
        }
      },

      setSourceImage: (image: HTMLImageElement, url: string) => {
        set({ sourceImage: image, sourceImageUrl: url })
        get().initializeGame()
      },

      initializeGame: () => {
        const { sourceImage, difficulty } = get()
        if (!sourceImage) return

        const pieces = generatePuzzle(sourceImage, difficulty)
        const now = Date.now()
        
        set({
          pieces,
          placedPieces: new Map(),
          selectedPieceId: null,
          dragOffset: { x: 0, y: 0 },
          startTime: now,
          elapsedTime: 0,
          moveCount: 0,
          isComplete: false,
          isPlaying: true,
        })
      },

      selectPiece: (pieceId: string, offsetX: number, offsetY: number) => {
        const { pieces, isComplete } = get()
        if (isComplete) return
        
        const piece = pieces.find(p => p.id === pieceId)
        if (!piece || piece.isPlaced) return

        // 선택된 조각을 맨 위로
        set(state => ({
          pieces: state.pieces.map(p => 
            p.id === pieceId ? { ...p, zIndex: 1000 } : { ...p, zIndex: p.isPlaced ? 10 : 1 }
          ),
          selectedPieceId: pieceId,
          dragOffset: { x: offsetX, y: offsetY },
        }))
      },

      dragPiece: (clientX: number, clientY: number) => {
        const { selectedPieceId, dragOffset, pieces } = get()
        if (!selectedPieceId) return

        const piece = pieces.find(p => p.id === selectedPieceId)
        if (!piece) return

        const x = clientX - dragOffset.x
        const y = clientY - dragOffset.y

        set(state => ({
          placedPieces: new Map(state.placedPieces).set(selectedPieceId, { x, y, rotation: piece.rotation }),
        }))
      },

      releasePiece: (pieceId: string) => {
        const { pieces, placedPieces, moveCount, soundEnabled } = get()
        const piece = pieces.find(p => p.id === pieceId)
        if (!piece) return

        const placed = placedPieces.get(pieceId)
        if (!placed) return

        // 스냅 체크
        const threshold = 35
        const isNearX = Math.abs(placed.x - piece.correctX) < threshold
        const isNearY = Math.abs(placed.y - piece.correctY) < threshold
        const isCorrectRot = piece.rotation === 0

        if (isNearX && isNearY && isCorrectRot) {
          // 정확한 위치에 스냅
          set(state => ({
            pieces: state.pieces.map(p => 
              p.id === pieceId ? { ...p, isPlaced: true } : p
            ),
            placedPieces: new Map(state.placedPieces).set(pieceId, { 
              x: piece.correctX, 
              y: piece.correctY, 
              rotation: 0 
            }),
            moveCount: moveCount + 1,
            selectedPieceId: null,
          }))

          // 완료 체크
          const newPlaced = new Map(placedPieces).set(pieceId, { x: piece.correctX, y: piece.correctY, rotation: 0 })
          const allPlaced = pieces.every(p => 
            p.id === pieceId || (newPlaced.get(p.id)?.x === p.correctX && newPlaced.get(p.id)?.y === p.correctY && newPlaced.get(p.id)?.rotation === 0)
          )
          
          if (allPlaced) {
            get().completeGame()
          }
        } else {
          // 제자리로
          set(() => ({
            moveCount: moveCount + 1,
            selectedPieceId: null,
          }))
        }

        // 사운드
        if (soundEnabled) {
          playSound(isNearX && isNearY && isCorrectRot ? 'snap' : 'release')
        }
      },

      rotatePiece: (pieceId: string) => {
        const { pieces, soundEnabled } = get()
        const piece = pieces.find(p => p.id === pieceId)
        if (!piece || piece.isPlaced) return

        const newRotation = (piece.rotation + 90) % 360
        set(state => ({
          pieces: state.pieces.map(p => 
            p.id === pieceId ? { ...p, rotation: newRotation } : p
          ),
          placedPieces: new Map(state.placedPieces).set(pieceId, { 
            x: piece.correctX, 
            y: piece.correctY, 
            rotation: newRotation 
          }),
        }))
        
        if (soundEnabled) {
          playSound('rotate')
        }
      },

      togglePreview: () => set(state => ({ showPreview: !state.showPreview })),
      toggleGhost: () => set(state => ({ showGhost: !state.showGhost })),
      toggleSound: () => set(state => ({ soundEnabled: !state.soundEnabled })),

      updateTimer: () => {
        const { startTime, isPlaying, isComplete } = get()
        if (!isPlaying || isComplete || !startTime) return
        set({ elapsedTime: Math.floor((Date.now() - startTime) / 1000) })
      },

      completeGame: () => {
        const { elapsedTime, moveCount, difficulty, soundEnabled } = get()
        set({ isComplete: true, isPlaying: false })
        
        if (soundEnabled) {
          playSound('complete')
        }
        
        // 기록 저장
        const record = { difficulty, time: elapsedTime, moves: moveCount, date: Date.now() }
        const records = JSON.parse(localStorage.getItem('puzzle-records') || '[]')
        records.push(record)
        localStorage.setItem('puzzle-records', JSON.stringify(records.slice(-50)))
      },

      resetGame: () => {
        const { sourceImage, difficulty } = get()
        if (sourceImage) {
          get().initializeGame()
        } else {
          set({ ...INITIAL_STATE, difficulty })
        }
      },

      saveGame: () => {
        const { pieces, placedPieces, difficulty, sourceImageUrl, elapsedTime, moveCount, startTime } = get()
        const saveData = {
          difficulty,
          sourceImageUrl,
          pieces: pieces.map(p => ({
            id: p.id,
            row: p.row,
            col: p.col,
            rotation: p.rotation,
            isPlaced: p.isPlaced,
          })),
          placedPieces: Array.from(placedPieces.entries()),
          elapsedTime,
          moveCount,
          startTime,
          timestamp: Date.now(),
        }
        localStorage.setItem(SAVE_KEY, JSON.stringify(saveData))
      },

      loadGame: () => {
        const saveData = localStorage.getItem(SAVE_KEY)
        if (!saveData) return false

        try {
          const data = JSON.parse(saveData)
          if (!data.sourceImageUrl) return false

          // 이미지 로드 후 상태 복원
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.src = data.sourceImageUrl
          img.onload = () => {
            const pieces = generatePuzzle(img, data.difficulty)
            // 저장된 상태 적용
            const pieceMap = new Map<string, {rotation: number, isPlaced: boolean}>(data.pieces.map((p: {id: string, rotation: number, isPlaced: boolean}) => [p.id, {rotation: p.rotation, isPlaced: p.isPlaced}]))
            const restoredPieces = pieces.map(p => {
              const saved = pieceMap.get(p.id)
              if (saved) {
                return { ...p, rotation: saved.rotation, isPlaced: saved.isPlaced }
              }
              return p
            })

            set({
              difficulty: data.difficulty,
              sourceImage: img,
              sourceImageUrl: data.sourceImageUrl,
              pieces: restoredPieces,
              placedPieces: new Map(data.placedPieces),
              elapsedTime: data.elapsedTime,
              moveCount: data.moveCount,
              startTime: data.startTime,
              isPlaying: true,
              isComplete: false,
            })
          }
          return true
        } catch {
          return false
        }
      },
    }),
    {
      name: 'photo-puzzle-settings',
      partialize: (state) => ({
        difficulty: state.difficulty,
        showPreview: state.showPreview,
        showGhost: state.showGhost,
        soundEnabled: state.soundEnabled,
      }),
    }
  )
)

// 간단한 사운드 합성
function playSound(type: 'snap' | 'release' | 'rotate' | 'complete') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    switch (type) {
      case 'snap':
        osc.frequency.setValueAtTime(800, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1)
        gain.gain.setValueAtTime(0.1, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)
        osc.start()
        osc.stop(ctx.currentTime + 0.15)
        break
      case 'release':
        osc.frequency.setValueAtTime(400, ctx.currentTime)
        gain.gain.setValueAtTime(0.05, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)
        osc.start()
        osc.stop(ctx.currentTime + 0.1)
        break
      case 'rotate':
        osc.frequency.setValueAtTime(600, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.05)
        gain.gain.setValueAtTime(0.08, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)
        osc.start()
        osc.stop(ctx.currentTime + 0.1)
        break
      case 'complete':
        [523, 659, 784, 1047].forEach((freq, i) => {
          const o = ctx.createOscillator()
          const g = ctx.createGain()
          o.connect(g)
          g.connect(ctx.destination)
          o.frequency.value = freq
          g.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.1)
          g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.3)
          o.start(ctx.currentTime + i * 0.1)
          o.stop(ctx.currentTime + i * 0.1 + 0.4)
        })
        break
    }
  } catch {
    // 오디오 컨텍스트 실패 시 무시
  }
}