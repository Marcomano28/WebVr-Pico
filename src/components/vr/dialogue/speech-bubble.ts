export const SPEECH_BUBBLE_MIN_WIDTH = 96
export const SPEECH_BUBBLE_MIN_HEIGHT = 58
export const SPEECH_BUBBLE_TEXT_PAD_X = 88
export const SPEECH_BUBBLE_TEXT_PAD_Y = 52

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function getResponsiveBubbleMaxWidth(viewportWidth: number) {
  if (viewportWidth < 560) return Math.max(250, viewportWidth - 28)
  if (viewportWidth < 900) return Math.min(390, viewportWidth * 0.56)

  return Math.min(520, viewportWidth * 0.36)
}

function ovalPath(w: number, h: number) {
  const cx = w / 2
  const cy = h / 2
  const rx = w / 2
  const ry = h / 2
  const kx = rx * 0.56
  const ky = ry * 0.56

  return [
    `M${cx} ${cy - ry}`,
    `C${cx + kx} ${cy - ry} ${cx + rx} ${cy - ky} ${cx + rx} ${cy}`,
    `C${cx + rx} ${cy + ky} ${cx + kx} ${cy + ry} ${cx} ${cy + ry}`,
    `C${cx - kx} ${cy + ry} ${cx - rx} ${cy + ky} ${cx - rx} ${cy}`,
    `C${cx - rx} ${cy - ky} ${cx - kx} ${cy - ry} ${cx} ${cy - ry}Z`,
  ].join(' ')
}

export function getSpeechBubbleExit(angleDeg: number, w: number, h: number) {
  const rad = angleDeg * Math.PI / 180
  const rx = Math.max(w / 2 - 3, 1)
  const ry = Math.max(h / 2 - 3, 1)
  const scale = 1 / Math.sqrt(
    (Math.cos(rad) ** 2) / (rx ** 2) +
    (Math.sin(rad) ** 2) / (ry ** 2)
  )

  return {
    x: w / 2 + Math.cos(rad) * scale,
    y: h / 2 + Math.sin(rad) * scale
  }
}

function tailPath(exitX: number, exitY: number, tipX: number, tipY: number) {
  const dx = tipX - exitX
  const dy = tipY - exitY
  const distance = Math.hypot(dx, dy)

  if (distance < 8) return ''

  const nx = -dy / distance
  const ny = dx / distance
  const baseWidth = clamp(distance * 0.075, 6, 12)
  const bend = clamp(distance * 0.22, 14, 54) * (tipX >= exitX ? 1 : -1)
  const midX = (exitX + tipX) / 2 + nx * bend
  const midY = (exitY + tipY) / 2 + ny * bend
  const midWidth = baseWidth * 0.38

  return [
    `M${exitX + nx * baseWidth} ${exitY + ny * baseWidth}`,
    `Q${midX + nx * midWidth} ${midY + ny * midWidth} ${tipX + nx * 1.2} ${tipY + ny * 1.2}`,
    `Q${midX - nx * midWidth} ${midY - ny * midWidth} ${exitX - nx * baseWidth} ${exitY - ny * baseWidth}`,
    'Z'
  ].join(' ')
}

function highlightPath(w: number, h: number) {
  return `M${w * 0.28} ${h * 0.23} C${w * 0.41} ${h * 0.14} ${w * 0.63} ${h * 0.17} ${w * 0.68} ${h * 0.29}`
}

function thoughtCircles(exitX: number, exitY: number, tipX: number, tipY: number) {
  const dx = exitX - tipX
  const dy = exitY - tipY
  const distance = Math.hypot(dx, dy)

  if (distance < 14) return ''

  const circles = [
    { t: 0.22, r: 4.4 },
    { t: 0.48, r: 6.8 },
    { t: 0.74, r: 9.8 }
  ]

  return circles.map(({ t, r }) => {
    const x = tipX + dx * t
    const y = tipY + dy * t

    return `<circle cx="${x}" cy="${y}" r="${r}" fill="var(--speech-fill)" stroke="var(--speech-stroke)" stroke-width="2"/>`
  }).join('')
}

export function buildSpeechBubbleSvg(w: number, h: number, tipX: number, tipY: number) {
  const angleDeg = Math.atan2(tipY - h / 2, tipX - w / 2) * 180 / Math.PI
  const exit = getSpeechBubbleExit(angleDeg, w, h)
  const tail = tailPath(exit.x, exit.y, tipX, tipY)

  return `
    <path d="${tail}" fill="var(--speech-fill)" stroke="var(--speech-stroke)" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="${ovalPath(w, h)}" fill="var(--speech-fill)" stroke="var(--speech-stroke)" stroke-width="2.5"/>
    <path d="${highlightPath(w, h)}" fill="none" stroke="var(--speech-highlight)" stroke-width="1.8" stroke-linecap="round"/>
  `
}

export function buildThoughtBubbleSvg(w: number, h: number, tipX: number, tipY: number) {
  const angleDeg = Math.atan2(tipY - h / 2, tipX - w / 2) * 180 / Math.PI
  const exit = getSpeechBubbleExit(angleDeg, w, h)

  return `
    ${thoughtCircles(exit.x, exit.y, tipX, tipY)}
    <path d="${ovalPath(w, h)}" fill="var(--speech-fill)" stroke="var(--speech-stroke)" stroke-width="2.5"/>
    <path d="${highlightPath(w, h)}" fill="none" stroke="var(--speech-highlight)" stroke-width="1.8" stroke-linecap="round"/>
  `
}
