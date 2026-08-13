// types.ts - 퍼즐 게임 타입 정의

export interface Point {
  x: number
  y: number
}

export interface Edge {
  points: Point[]
  direction: 'top' | 'right' | 'bottom' | 'left'
  normalized: Point[]
}

export interface PuzzlePiece {
  id: string
  row: number
  col: number
  bounds: { x: number; y: number; w: number; h: number }
  // 돌기 수용을 위한 패딩 및 실제 엘리먼트 크기
  padding: number
  elementBounds: { x: number; y: number; w: number; h: number }
  // clipPath가 elementBounds 기준으로 생성됨
  shapePath: string
  edges: { top: Edge | null; right: Edge | null; bottom: Edge | null; left: Edge | null }
  image: HTMLImageElement | null
  imageBounds: { x: number; y: number; w: number; h: number }
  rotation: number  // 0, 90, 180, 270
  isPlaced: boolean
  correctX: number
  correctY: number
}

export interface PuzzleConfig {
  pieceCount: number
  rows: number
  cols: number
  pieceWidth: number
  pieceHeight: number
  boardOffsetX: number
  boardOffsetY: number
  knobSize: number
  edgeJitter: number
}

export type Difficulty = 'easy' | 'normal' | 'hard' | 'expert' | 'master'

export const DIFFICULTY_CONFIGS: Record<Difficulty, { pieceCount: number; rows: number; cols: number; label: string }> = {
  easy: { pieceCount: 50, rows: 5, cols: 10, label: '쉬움 (50조각)' },
  normal: { pieceCount: 100, rows: 8, cols: 12, label: '보통 (100조각)' },
  hard: { pieceCount: 200, rows: 10, cols: 20, label: '어려움 (200조각)' },
  expert: { pieceCount: 500, rows: 20, cols: 25, label: '전문가 (500조각)' },
  master: { pieceCount: 1000, rows: 25, cols: 40, label: '마스터 (1000조각)' },
}

export interface GameState {
  // 설정
  difficulty: Difficulty
  sourceImage: HTMLImageElement | null
  sourceImageUrl: string | null
  
  // 게임 상태
  pieces: PuzzlePiece[]
  placedPieces: Map<string, { x: number; y: number; rotation: number }>
  selectedPieceId: string | null
  dragOffset: { x: number; y: number }
  
  // 진행도
  startTime: number
  elapsedTime: number
  moveCount: number
  isComplete: boolean
  isPlaying: boolean
  
  // UI 상태
  showPreview: boolean
  showGhost: boolean
  soundEnabled: boolean
}

export interface GameActions {
  setDifficulty: (difficulty: Difficulty) => void
  setSourceImage: (image: HTMLImageElement, url: string) => void
  initializeGame: () => void
  selectPiece: (pieceId: string, offsetX: number, offsetY: number) => void
  dragPiece: (x: number, y: number) => void
  releasePiece: (pieceId: string) => void
  rotatePiece: (pieceId: string) => void
  togglePreview: () => void
  toggleGhost: () => void
  toggleSound: () => void
  updateTimer: () => void
  completeGame: () => void
  resetGame: () => void
  saveGame: () => void
  loadGame: () => boolean
}