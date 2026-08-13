// GameBoard.tsx - 게임 보드 (퍼즐 조각 렌더링 및 드래그)

import React, { useRef, useEffect, useCallback, useMemo } from 'react'
import { useGameStore } from '../store'
import { PuzzlePiece } from '../types'

export const GameBoard: React.FC = () => {
  const { 
    pieces, 
    placedPieces, 
    selectedPieceId, 
    showGhost,
    selectPiece, 
    dragPiece, 
    releasePiece,
    rotatePiece,
  } = useGameStore()

  const boardRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>()

  // 전체 보드/이미지 크기 계산
  const boardRect = useMemo(() => {
    if (pieces.length === 0) return { left: 0, top: 0, width: 0, height: 0, imgWidth: 0, imgHeight: 0 }
    const left = Math.min(...pieces.map(p => p.correctX))
    const top = Math.min(...pieces.map(p => p.correctY))
    const right = Math.max(...pieces.map(p => p.correctX + p.bounds.w))
    const bottom = Math.max(...pieces.map(p => p.correctY + p.bounds.h))
    const firstPiece = pieces[0]
    const imgWidth = firstPiece.image?.naturalWidth || right - left
    const imgHeight = firstPiece.image?.naturalHeight || bottom - top
    return { left, top, width: right - left, height: bottom - top, imgWidth, imgHeight }
  }, [pieces])

  // 전역 마우스/터치 이벤트
  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
      if (selectedPieceId) {
        rafRef.current = requestAnimationFrame(() => dragPiece(clientX, clientY))
      }
    }

    const handleUp = () => {
      if (selectedPieceId) {
        releasePiece(selectedPieceId)
      }
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    window.addEventListener('touchmove', handleMove, { passive: false })
    window.addEventListener('touchend', handleUp)

    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleUp)
      rafRef.current && cancelAnimationFrame(rafRef.current)
    }
  }, [selectedPieceId, dragPiece, releasePiece])

  const handleMouseDown = useCallback((e: React.MouseEvent, piece: PuzzlePiece) => {
    if (piece.isPlaced) return
    e.preventDefault()
    e.stopPropagation()
    const rect = boardRef.current?.getBoundingClientRect()
    if (!rect) return
    const offsetX = e.clientX - rect.left - (placedPieces.get(piece.id)?.x ?? piece.correctX)
    const offsetY = e.clientY - rect.top - (placedPieces.get(piece.id)?.y ?? piece.correctY)
    selectPiece(piece.id, offsetX, offsetY)
  }, [placedPieces, selectPiece])

  const handleTouchStart = useCallback((e: React.TouchEvent, piece: PuzzlePiece) => {
    if (piece.isPlaced) return
    e.preventDefault()
    e.stopPropagation()
    const rect = boardRef.current?.getBoundingClientRect()
    if (!rect) return
    const touch = e.touches[0]
    const offsetX = touch.clientX - rect.left - (placedPieces.get(piece.id)?.x ?? piece.correctX)
    const offsetY = touch.clientY - rect.top - (placedPieces.get(piece.id)?.y ?? piece.correctY)
    selectPiece(piece.id, offsetX, offsetY)
  }, [placedPieces, selectPiece])

  const handleDoubleClick = useCallback((e: React.MouseEvent, piece: PuzzlePiece) => {
    e.stopPropagation()
    if (!piece.isPlaced) rotatePiece(piece.id)
  }, [rotatePiece])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
  }, [])

  if (pieces.length === 0) return null

  const { left: boardLeft, top: boardTop, width: boardWidth, height: boardHeight, imgWidth, imgHeight } = boardRect

  return (
    <div 
      className="game-board" 
      ref={boardRef}
      onContextMenu={handleContextMenu}
      style={{ 
        width: '100%', 
        height: '100%',
        position: 'relative',
      }}
    >
      {/* 고스트 이미지 (배경 가이드) */}
      {showGhost && pieces[0].image && (
        <div 
          className="ghost-image"
          style={{
            position: 'absolute',
            left: boardLeft,
            top: boardTop,
            width: boardWidth,
            height: boardHeight,
            backgroundImage: `url(${pieces[0].image.src})`,
            backgroundSize: `${imgWidth}px ${imgHeight}px`,
            backgroundPosition: '0 0',
            opacity: 0.12,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      )}

      {/* 보드 영역 테두리 */}
      <div 
        className="board-area"
        style={{
          position: 'absolute',
          left: boardLeft,
          top: boardTop,
          width: boardWidth,
          height: boardHeight,
          border: '2px dashed #dee2e6',
          borderRadius: '8px',
          pointerEvents: 'none',
          background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #f8f9fa 10px, #f8f9fa 20px)',
        }}
      />

      {/* 그리드 가이드 */}
      <div 
        className="grid-guide"
        style={{
          position: 'absolute',
          left: boardLeft,
          top: boardTop,
          width: boardWidth,
          height: boardHeight,
          pointerEvents: 'none',
        }}
      >
        <div className="grid-lines">
          {Array.from({ length: (pieces[0] as any)?.rows || 8 }, (_, row) => (
            <div key={row} className="grid-line-h" style={{ top: `${(100 * row) / ((pieces[0] as any)?.rows || 8)}%` }} />
          ))}
          {Array.from({ length: (pieces[0] as any)?.cols || 10 }, (_, col) => (
            <div key={col} className="grid-line-v" style={{ left: `${(100 * col) / ((pieces[0] as any)?.cols || 10)}%` }} />
          ))}
        </div>
      </div>

      {/* 퍼즐 조각들 */}
      {pieces.map(piece => {
        const placed = placedPieces.get(piece.id)
        const x = placed?.x ?? piece.correctX
        const y = placed?.y ?? piece.correctY
        const rotation = placed?.rotation ?? piece.rotation
        const isSelected = selectedPieceId === piece.id
        const isPlaced = piece.isPlaced

        // 이미지 소스 좌표 (원본 이미지 기준)
        const srcX = piece.imageBounds.x
        const srcY = piece.imageBounds.y
        // 패딩 보정: shapePath가 elementBounds 기준으로 생성되었으므로
        // 배경 이미지도 패딩만큼 오프셋 필요
        const padding = piece.padding

        const pieceStyle: React.CSSProperties = {
          position: 'absolute',
          left: x,
          top: y,
          width: piece.elementBounds.w,
          height: piece.elementBounds.h,
          transform: `rotate(${rotation}deg)${isSelected ? ' scale(1.02)' : ''}`,
          transformOrigin: 'center center',
          clipPath: `path('${piece.shapePath}')`,
          backgroundImage: piece.image ? `url(${piece.image.src})` : 'none',
          backgroundSize: `${imgWidth}px ${imgHeight}px`,
          // 패딩만큼 배경 위치 보정 (shapePath가 padding 포함 영역 기준이므로)
          backgroundPosition: `-${srcX + padding}px -${srcY + padding}px`,
          backgroundRepeat: 'no-repeat',
          zIndex: isSelected ? 1000 : isPlaced ? 10 : 1,
          filter: isPlaced && !isSelected 
            ? 'drop-shadow(0 2px 8px rgba(0,0,0,0.15))' 
            : 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))',
          transition: isSelected ? 'none' : 'transform 0.15s ease, filter 0.15s ease',
          cursor: isPlaced ? 'default' : 'grab',
        }

        return (
          <div
            key={piece.id}
            className={`puzzle-piece ${isSelected ? 'selected' : ''} ${isPlaced ? 'placed' : ''} ${rotation !== 0 ? 'rotated' : ''}`}
            style={pieceStyle}
            onMouseDown={(e) => handleMouseDown(e, piece)}
            onTouchStart={(e) => handleTouchStart(e, piece)}
            onDoubleClick={(e) => handleDoubleClick(e, piece)}
            onContextMenu={handleContextMenu}
            draggable={false}
          >
            {!isPlaced && rotation !== 0 && (
              <div className="rotation-indicator" title={`${rotation}° 회전됨`}>
                {rotation}°
              </div>
            )}
            {isPlaced && (
              <div className="placed-badge" title="완료됨">
                ✓
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}