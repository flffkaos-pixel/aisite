// puzzleEngine.ts - 퍼즐 조각 생성 엔진 (핵심 로직)

import { Point, Edge, PuzzlePiece, PuzzleConfig, DIFFICULTY_CONFIGS, Difficulty } from './types'

// 시드 기반 결정적 랜덤
function seededRandom(seed: number, offset: number): number {
  const x = Math.sin(seed * 12.9898 + offset * 78.233) * 43758.5453
  return x - Math.floor(x)
}

// 베지에 곡선 돌기/홈
function generateKnob(t: number, knobSize: number, isOutward: boolean): Point {
  const height = knobSize * (isOutward ? 1 : -1)
  return { x: t, y: height * Math.sin(Math.PI * t) }
}

// 가장자리 포인트 생성 (결정적)
function generateEdgePoints(
  knobSize: number, 
  isOutward: boolean, 
  jitter: number, 
  seed: number, 
  offset: number
): Point[] {
  const points: Point[] = []
  const segments = 20
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const knob = generateKnob(t, knobSize, isOutward)
    const jitterX = (seededRandom(seed, offset + i * 0.1) - 0.5) * jitter * 0.02
    const jitterY = (seededRandom(seed, offset + i * 0.1 + 100) - 0.5) * jitter * 0.02
    points.push({ x: t + jitterX, y: knob.y + jitterY })
  }
  return points
}

// 공유 에지 생성 (인접 조각 완벽 매칭 보장)
function generateSharedEdge(
  isHorizontal: boolean,
  edgeIndex: number,
  knobSize: number,
  jitter: number,
  puzzleSeed: number
): { points: Point[]; outward: boolean } {
  const seed = puzzleSeed + (isHorizontal ? edgeIndex * 10000 : edgeIndex * 100000)
  const outward = seededRandom(seed, 1) > 0.5
  const points = generateEdgePoints(knobSize, outward, jitter, seed, 10)
  return { points, outward }
}

// 직선 에지 (테두리용)
function createStraightEdge(direction: Edge['direction']): Edge {
  const points = Array.from({ length: 21 }, (_, i) => ({ x: i / 20, y: 0 }))
  return { points, direction, normalized: points }
}

// 조각의 네 모서리 생성
function generatePieceEdges(
  row: number,
  col: number,
  rows: number,
  cols: number,
  config: PuzzleConfig,
  puzzleSeed: number
): { top: Edge | null; right: Edge | null; bottom: Edge | null; left: Edge | null } {
  // 공유 에지 (전역 퍼즐 시드 + 에지 위치로 시드 고정)
  const sharedTop = row > 0 
    ? generateSharedEdge(true, row, config.knobSize, config.edgeJitter, puzzleSeed)
    : null
  const sharedBottom = row < rows - 1
    ? generateSharedEdge(true, row + 1, config.knobSize, config.edgeJitter, puzzleSeed)
    : null
  const sharedLeft = col > 0
    ? generateSharedEdge(false, col, config.knobSize, config.edgeJitter, puzzleSeed)
    : null
  const sharedRight = col < cols - 1
    ? generateSharedEdge(false, col + 1, config.knobSize, config.edgeJitter, puzzleSeed)
    : null

  const makeEdge = (shared: { points: Point[]; outward: boolean } | null, direction: Edge['direction'], _isOutward: boolean): Edge | null => {
    if (!shared) return createStraightEdge(direction)
    return { points: shared.points, direction, normalized: shared.points }
  }

  return {
    top: makeEdge(sharedTop, 'top', sharedTop ? !sharedTop.outward : false)!,
    bottom: makeEdge(sharedBottom, 'bottom', sharedBottom ? sharedBottom.outward : false)!,
    left: makeEdge(sharedLeft, 'left', sharedLeft ? !sharedLeft.outward : false)!,
    right: makeEdge(sharedRight, 'right', sharedRight ? sharedRight.outward : false)!,
  }
}

// SVG 패스 생성 (클램프로 bounds 이탈 방지)
function buildShapePath(edges: PuzzlePiece['edges'], w: number, h: number): string {
  const { top, right, bottom, left } = edges
  let path = 'M 0 0 '

  if (top) {
    for (const p of top.normalized) {
      const clampedY = Math.max(0, Math.min(h, p.y * h))
      path += `L ${p.x * w} ${clampedY} `
    }
  } else {
    path += `L ${w} 0 `
  }

  if (right) {
    for (const p of right.normalized) {
      const clampedX = Math.max(0, Math.min(w, w - p.y * h))
      path += `L ${clampedX} ${p.x * h} `
    }
  } else {
    path += `L ${w} ${h} `
  }

  if (bottom) {
    for (let i = bottom.normalized.length - 1; i >= 0; i--) {
      const p = bottom.normalized[i]
      const clampedY = Math.max(0, Math.min(h, h - p.y * h))
      path += `L ${p.x * w} ${clampedY} `
    }
  } else {
    path += `L 0 ${h} `
  }

  if (left) {
    for (let i = left.normalized.length - 1; i >= 0; i--) {
      const p = left.normalized[i]
      const clampedX = Math.max(0, Math.min(w, p.y * h))
      path += `L ${clampedX} ${p.x * h} `
    }
  } else {
    path += `L 0 0 `
  }

  path += 'Z'
  return path
}

// 메인: 퍼즐 조각 생성
export function generatePuzzle(image: HTMLImageElement, difficulty: Difficulty): PuzzlePiece[] {
  const diffConfig = DIFFICULTY_CONFIGS[difficulty]
  const imgW = image.naturalWidth
  const imgH = image.naturalHeight
  
  // 화면 크기에 맞게 보드 크기 계산 (최대 90% 화면)
  const maxBoardW = window.innerWidth * 0.85
  const maxBoardH = window.innerHeight * 0.7
  const scale = Math.min(maxBoardW / imgW, maxBoardH / imgH, 1)
  
  const boardW = imgW * scale
  const boardH = imgH * scale
  const pieceW = boardW / diffConfig.cols
  const pieceH = boardH / diffConfig.rows
  
  const config: PuzzleConfig = {
    ...diffConfig,
    pieceWidth: pieceW,
    pieceHeight: pieceH,
    boardOffsetX: (window.innerWidth - boardW) / 2,
    boardOffsetY: (window.innerHeight - boardH) / 2 + 60, // 헤더 공간
    knobSize: 0.3,
    edgeJitter: 0.15,
  }

  const pieces: PuzzlePiece[] = []
  const puzzleSeed = 42

  // 돌기 수용을 위한 패딩 (knobSize * max(pieceW, pieceH))
  const padding = config.knobSize * Math.max(pieceW, pieceH)

  for (let row = 0; row < diffConfig.rows; row++) {
    for (let col = 0; col < diffConfig.cols; col++) {
      const edges = generatePieceEdges(row, col, diffConfig.rows, diffConfig.cols, config, puzzleSeed)
      
      // shapePath는 elementBounds(패딩 포함) 기준으로 생성
      const elementW = pieceW + 2 * padding
      const elementH = pieceH + 2 * padding
      const shapePath = buildShapePath(edges, elementW, elementH)

      // 원본 이미지 좌표 (스케일 보정용)
      const srcPieceW = imgW / diffConfig.cols
      const srcPieceH = imgH / diffConfig.rows
      
      pieces.push({
        id: `piece-${row}-${col}`,
        row,
        col,
        bounds: {
          x: col * pieceW,
          y: row * pieceH,
          w: pieceW,
          h: pieceH,
        },
        imageBounds: {
          x: col * srcPieceW,
          y: row * srcPieceH,
          w: srcPieceW,
          h: srcPieceH,
        },
        // 돌기 수용 패딩
        padding,
        // 실제 엘리먼트 크기 (패딩 포함)
        elementBounds: {
          x: col * pieceW - padding,
          y: row * pieceH - padding,
          w: pieceW + 2 * padding,
          h: pieceH + 2 * padding,
        },
        edges,
        shapePath,
        image,
        rotation: 0,
        isPlaced: false,
        // 정답 위치는 elementBounds 기준 (패딩 보정)
        correctX: col * pieceW + config.boardOffsetX - padding,
        correctY: row * pieceH + config.boardOffsetY - padding,
      })
    }
  }

  // 조각 섞기 (피셔-예이츠)
  for (let i = pieces.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(puzzleSeed + i, 999) * (i + 1))
    ;[pieces[i], pieces[j]] = [pieces[j], pieces[i]]
  }

  // 초기 위치 랜덤 배치 (보드 영역 밖)
  const margin = 100
  pieces.forEach((piece, i) => {
    const side = i % 4
    const spacing = 20
    const cols = Math.ceil(Math.sqrt(pieces.length))
    const row = Math.floor(i / cols)
    const col = i % cols
    
    switch (side) {
      case 0: // 위
        piece.correctX = config.boardOffsetX + col * (piece.bounds.w + spacing)
        piece.correctY = config.boardOffsetY - piece.bounds.h - margin - row * (piece.bounds.h + spacing)
        break
      case 1: // 오른쪽
        piece.correctX = config.boardOffsetX + config.cols * pieceW + margin + row * (piece.bounds.w + spacing)
        piece.correctY = config.boardOffsetY + col * (piece.bounds.h + spacing)
        break
      case 2: // 아래
        piece.correctX = config.boardOffsetX + col * (piece.bounds.w + spacing)
        piece.correctY = config.boardOffsetY + config.rows * pieceH + margin + row * (piece.bounds.h + spacing)
        break
      case 3: // 왼쪽
        piece.correctX = config.boardOffsetX - piece.bounds.w - margin - row * (piece.bounds.w + spacing)
        piece.correctY = config.boardOffsetY + col * (piece.bounds.h + spacing)
        break
    }
  })

  return pieces
}

// 난이도별 설정 생성 헬퍼
export function createPuzzleConfig(difficulty: Difficulty, image: HTMLImageElement): PuzzleConfig {
  const diffConfig = DIFFICULTY_CONFIGS[difficulty]
  const imgW = image.naturalWidth
  const imgH = image.naturalHeight
  const maxBoardW = window.innerWidth * 0.85
  const maxBoardH = window.innerHeight * 0.7
  const scale = Math.min(maxBoardW / imgW, maxBoardH / imgH, 1)
  
  return {
    ...diffConfig,
    pieceWidth: (imgW * scale) / diffConfig.cols,
    pieceHeight: (imgH * scale) / diffConfig.rows,
    boardOffsetX: (window.innerWidth - imgW * scale) / 2,
    boardOffsetY: (window.innerHeight - imgH * scale) / 2 + 60,
    knobSize: 0.3,
    edgeJitter: 0.15,
  }
}

// 에지 매칭 검사
export function doEdgesMatch(edgeA: Edge, edgeB: Edge): boolean {
  if (edgeA.points.length !== edgeB.points.length) return false
  for (let i = 0; i < edgeA.points.length; i++) {
    const diff = Math.abs(edgeA.points[i].y + edgeB.points[i].y)
    if (diff > 0.05) return false
  }
  return true
}

// 스냅 임계값 내인지 확인
export function isNearCorrectPosition(piece: PuzzlePiece, x: number, y: number, threshold: number = 30): boolean {
  return Math.abs(x - piece.correctX) < threshold && Math.abs(y - piece.correctY) < threshold
}

// 회전 후 올바른 방향인지 확인
export function isCorrectRotation(piece: PuzzlePiece): boolean {
  return piece.rotation === 0
}