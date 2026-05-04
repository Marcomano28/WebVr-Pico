'use client'

import React, { CSSProperties, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  SPEECH_BUBBLE_MIN_HEIGHT,
  SPEECH_BUBBLE_MIN_WIDTH,
  SPEECH_BUBBLE_TEXT_PAD_X,
  SPEECH_BUBBLE_TEXT_PAD_Y,
  buildSpeechBubbleSvg,
  buildThoughtBubbleSvg,
  clamp,
  getResponsiveBubbleMaxWidth
} from './speech-bubble'

const SPEECH_BUBBLE_REVEAL_DELAY_SHORT = 34
const SPEECH_BUBBLE_REVEAL_DELAY_LONG = 24
const SPEECH_BUBBLE_REVEAL_PAUSE_SOFT = 34
const SPEECH_BUBBLE_REVEAL_PAUSE_HARD = 62

export type BubbleVariant = 'tail' | 'thought'

export interface SpeechBubbleSize {
  w: number
  h: number
}

export interface SpeechBubblePlacement {
  x: number
  y: number
  tipX: number
  tipY: number
  offscreen: boolean
}

interface SpeechBubbleOverlayProps {
  text: string
  visible: boolean
  typing?: boolean
  reveal?: boolean
  variant?: BubbleVariant
  placement: SpeechBubblePlacement | null
  onSizeChange?: (size: SpeechBubbleSize) => void
}

function getSpeechBubbleRevealDelay(previousWord: string, totalWords: number) {
  let delay = totalWords > 18
    ? SPEECH_BUBBLE_REVEAL_DELAY_LONG
    : SPEECH_BUBBLE_REVEAL_DELAY_SHORT

  if (/[,;:]$/.test(previousWord)) {
    delay += SPEECH_BUBBLE_REVEAL_PAUSE_SOFT
  } else if (/[.!?...]$/.test(previousWord)) {
    delay += SPEECH_BUBBLE_REVEAL_PAUSE_HARD
  }

  return delay
}

function TypingDots() {
  return (
    <>
      <span />
      <span />
      <span />
    </>
  )
}

export default function SpeechBubbleOverlay({
  text,
  visible,
  typing = false,
  reveal = true,
  variant = 'tail',
  placement,
  onSizeChange
}: SpeechBubbleOverlayProps) {
  const [renderedText, setRenderedText] = useState('')
  const [viewportWidth, setViewportWidth] = useState(1024)
  const [bubbleSize, setBubbleSize] = useState<SpeechBubbleSize>({
    w: SPEECH_BUBBLE_MIN_WIDTH,
    h: SPEECH_BUBBLE_MIN_HEIGHT
  })

  const measureRef = useRef<HTMLDivElement>(null)
  const measureTextRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const updateViewportWidth = () => {
      setViewportWidth(window.innerWidth)
    }

    updateViewportWidth()
    window.addEventListener('resize', updateViewportWidth)

    return () => {
      window.removeEventListener('resize', updateViewportWidth)
    }
  }, [])

  useEffect(() => {
    if (!visible || typing) {
      setRenderedText('')
      return
    }

    if (!reveal) {
      setRenderedText(text)
      return
    }

    const words = text.trim().split(/\s+/).filter(Boolean)
    let timeout: number | null = null
    let active = true

    if (words.length <= 1) {
      setRenderedText(text)
      return
    }

    setRenderedText('')

    const revealNextWord = (index: number) => {
      if (!active) return

      const nextIndex = index + 1
      setRenderedText(words.slice(0, nextIndex).join(' '))

      if (nextIndex >= words.length) return

      timeout = window.setTimeout(
        () => revealNextWord(nextIndex),
        getSpeechBubbleRevealDelay(words[nextIndex - 1], words.length)
      )
    }

    revealNextWord(0)

    return () => {
      active = false
      if (timeout !== null) {
        window.clearTimeout(timeout)
      }
    }
  }, [reveal, text, typing, visible])

  useLayoutEffect(() => {
    if (!measureRef.current || !measureTextRef.current) return

    const measure = measureRef.current
    const measureText = measureTextRef.current
    const typingHtml = '<span></span><span></span><span></span>'

    measureText.classList.toggle('speech-bubble__typing', typing)

    if (typing) {
      measureText.innerHTML = typingHtml
    } else {
      measureText.textContent = text
    }

    measureText.style.width = 'auto'

    const maxWidth = getResponsiveBubbleMaxWidth(viewportWidth)
    let width = Math.ceil(measure.scrollWidth + SPEECH_BUBBLE_TEXT_PAD_X)
    width = clamp(width, SPEECH_BUBBLE_MIN_WIDTH, maxWidth)

    const textWidth = Math.max(width - SPEECH_BUBBLE_TEXT_PAD_X, 0)
    measureText.style.width = `${textWidth}px`

    const height = Math.max(
      Math.ceil(measure.scrollHeight + SPEECH_BUBBLE_TEXT_PAD_Y),
      SPEECH_BUBBLE_MIN_HEIGHT
    )
    const nextSize = { w: width, h: height }

    setBubbleSize((previous) => (
      previous.w === nextSize.w && previous.h === nextSize.h
        ? previous
        : nextSize
    ))
    onSizeChange?.(nextSize)
  }, [onSizeChange, text, typing, viewportWidth])

  const svgMarkup = useMemo(() => {
    if (!placement || placement.offscreen) return ''

    return variant === 'thought'
      ? buildThoughtBubbleSvg(bubbleSize.w, bubbleSize.h, placement.tipX, placement.tipY)
      : buildSpeechBubbleSvg(bubbleSize.w, bubbleSize.h, placement.tipX, placement.tipY)
  }, [bubbleSize.h, bubbleSize.w, placement, variant])

  const isOffscreen = !placement || placement.offscreen
  const style: CSSProperties = {
    width: bubbleSize.w,
    height: bubbleSize.h,
    transform: placement && !placement.offscreen
      ? `translate3d(${placement.x}px, ${placement.y}px, 0)`
      : undefined
  }

  return (
    <div
      className={`speech-bubble ${visible ? 'is-visible' : ''} ${isOffscreen ? 'is-offscreen' : ''}`}
      data-variant={variant}
      style={style}
      aria-live="polite"
    >
      <svg
        className="speech-bubble__svg"
        aria-hidden="true"
        width={bubbleSize.w}
        height={bubbleSize.h}
        viewBox={`0 0 ${bubbleSize.w} ${bubbleSize.h}`}
        dangerouslySetInnerHTML={{ __html: svgMarkup }}
      />
      <div className="speech-bubble__text-layer">
        <p className={`speech-bubble__text ${typing ? 'speech-bubble__typing' : ''}`}>
          {typing ? <TypingDots /> : renderedText}
        </p>
      </div>
      <div ref={measureRef} className="speech-bubble__measure">
        <p ref={measureTextRef} className="speech-bubble__text" />
      </div>
    </div>
  )
}
