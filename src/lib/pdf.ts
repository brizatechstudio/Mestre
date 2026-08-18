import { jsPDF } from 'jspdf'
import type { Client, Quote, QuoteItem, QuotePhoto, Receipt, Settings, WorkOrder } from '../types'
import { money, quoteTotal, shortDate } from './utils'

type RGB = [number, number, number]

type PdfTheme = {
  primary: RGB
  secondary: RGB
  dark: RGB
  soft: RGB
  soft2: RGB
  onPrimary: RGB
}

type BrandAssets = {
  logoDataUrl?: string
  logoFormat?: 'PNG' | 'JPEG'
  theme: PdfTheme
}

const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const MARGIN = 14
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const DEFAULT_PRIMARY: RGB = [24, 99, 255]
const DEFAULT_SECONDARY: RGB = [38, 208, 255]
const TEXT: RGB = [31, 41, 55]
const MUTED: RGB = [100, 116, 139]
const LINE: RGB = [226, 232, 240]
const WHITE: RGB = [255, 255, 255]
const SOFT_NEUTRAL: RGB = [248, 250, 252]

function sanitizeFilename(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function clamp(value: number, min = 0, max = 255) {
  return Math.max(min, Math.min(max, value))
}

function mix(a: RGB, b: RGB, amount: number): RGB {
  return [
    Math.round(a[0] * (1 - amount) + b[0] * amount),
    Math.round(a[1] * (1 - amount) + b[1] * amount),
    Math.round(a[2] * (1 - amount) + b[2] * amount),
  ]
}

function luminance(rgb: RGB) {
  const linear = rgb.map((channel) => {
    const c = channel / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

function saturation(rgb: RGB) {
  const max = Math.max(...rgb) / 255
  const min = Math.min(...rgb) / 255
  const l = (max + min) / 2
  const delta = max - min
  if (delta === 0) return 0
  return delta / (1 - Math.abs(2 * l - 1))
}

function colorDistance(a: RGB, b: RGB) {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2)
}

function darkBrandColor(primary: RGB, secondary: RGB): RGB {
  const darker = luminance(primary) <= luminance(secondary) ? primary : secondary
  if (luminance(darker) < 0.16) return mix(darker, [4, 10, 20], 0.18)
  return mix(darker, [4, 10, 20], 0.68)
}

function createTheme(primary = DEFAULT_PRIMARY, secondary = DEFAULT_SECONDARY): PdfTheme {
  const dark = darkBrandColor(primary, secondary)
  return {
    primary,
    secondary,
    dark,
    soft: mix(primary, WHITE, 0.91),
    soft2: mix(secondary, WHITE, 0.94),
    onPrimary: luminance(primary) > 0.48 ? [15, 23, 36] : WHITE,
  }
}

function extractPalette(data: Uint8ClampedArray): PdfTheme {
  type Bucket = { rgb: RGB; count: number; sat: number; lum: number }
  const buckets = new Map<string, Bucket>()

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3]
    if (alpha < 80) continue
    const rgb: RGB = [data[i], data[i + 1], data[i + 2]]
    // Fundo branco ou quase branco não deve virar a cor da identidade.
    if (rgb[0] > 242 && rgb[1] > 242 && rgb[2] > 242) continue

    const q: RGB = [
      clamp(Math.round(rgb[0] / 24) * 24),
      clamp(Math.round(rgb[1] / 24) * 24),
      clamp(Math.round(rgb[2] / 24) * 24),
    ]
    const key = q.join(',')
    const current = buckets.get(key)
    if (current) current.count += 1
    else buckets.set(key, { rgb: q, count: 1, sat: saturation(q), lum: luminance(q) })
  }

  const candidates = [...buckets.values()]
  if (!candidates.length) return createTheme()

  const colorful = candidates
    .filter((c) => c.sat > 0.2 && c.lum > 0.025 && c.lum < 0.88)
    .sort((a, b) => {
      const scoreA = a.count * (0.7 + a.sat * 1.8) * (a.lum > 0.08 && a.lum < 0.72 ? 1.2 : 0.75)
      const scoreB = b.count * (0.7 + b.sat * 1.8) * (b.lum > 0.08 && b.lum < 0.72 ? 1.2 : 0.75)
      return scoreB - scoreA
    })

  const dominant = [...candidates].sort((a, b) => b.count - a.count)
  const primary = (colorful[0] ?? dominant[0]).rgb

  const secondaryCandidate = [...colorful, ...dominant]
    .filter((c) => colorDistance(c.rgb, primary) > 75)
    .sort((a, b) => b.count * (0.6 + b.sat) - a.count * (0.6 + a.sat))[0]

  let secondary: RGB
  if (secondaryCandidate) secondary = secondaryCandidate.rgb
  else if (luminance(primary) > 0.35) secondary = mix(primary, [5, 12, 24], 0.58)
  else secondary = mix(primary, WHITE, 0.45)

  return createTheme(primary, secondary)
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    if (/^https?:\/\//i.test(src)) image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Não foi possível carregar a logo.'))
    image.src = src
  })
}

function isEdgeBackgroundPixel(data: Uint8ClampedArray, index: number) {
  const r = data[index]
  const g = data[index + 1]
  const b = data[index + 2]
  const a = data[index + 3]
  if (a < 24) return true
  const nearWhite = r > 245 && g > 245 && b > 245
  const lowSat = Math.max(r, g, b) - Math.min(r, g, b) < 18
  const bright = (r + g + b) / 3 > 242
  return nearWhite || (bright && lowSat)
}

function removeEdgeBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const image = ctx.getImageData(0, 0, width, height)
  const { data } = image
  const visited = new Uint8Array(width * height)
  const queue: number[] = []

  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return
    const idx = y * width + x
    if (visited[idx]) return
    const offset = idx * 4
    if (!isEdgeBackgroundPixel(data, offset)) return
    visited[idx] = 1
    queue.push(idx)
  }

  for (let x = 0; x < width; x += 1) {
    push(x, 0)
    push(x, height - 1)
  }
  for (let y = 1; y < height - 1; y += 1) {
    push(0, y)
    push(width - 1, y)
  }

  while (queue.length) {
    const idx = queue.shift()!
    const x = idx % width
    const y = Math.floor(idx / width)
    push(x - 1, y)
    push(x + 1, y)
    push(x, y - 1)
    push(x, y + 1)
  }

  for (let i = 0; i < visited.length; i += 1) {
    if (!visited[i]) continue
    const offset = i * 4
    data[offset + 3] = 0
  }

  ctx.putImageData(image, 0, 0)
}

function trimCanvasBounds(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const { data } = ctx.getImageData(0, 0, width, height)
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4
      const alpha = data[offset + 3]
      if (alpha < 20) continue
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }

  if (maxX < 0 || maxY < 0) return { x: 0, y: 0, width, height }

  const pad = 2
  return {
    x: Math.max(0, minX - pad),
    y: Math.max(0, minY - pad),
    width: Math.min(width - Math.max(0, minX - pad), maxX - minX + 1 + pad * 2),
    height: Math.min(height - Math.max(0, minY - pad), maxY - minY + 1 + pad * 2),
  }
}

async function prepareBrandAssets(logo?: string): Promise<BrandAssets> {
  if (!logo) return { theme: createTheme() }

  try {
    const image = await loadImage(logo)
    const sourceW = image.naturalWidth || image.width
    const sourceH = image.naturalHeight || image.height
    const workMax = 900
    const workScale = Math.min(1, workMax / Math.max(sourceW, sourceH))
    const workCanvas = document.createElement('canvas')
    workCanvas.width = Math.max(1, Math.round(sourceW * workScale))
    workCanvas.height = Math.max(1, Math.round(sourceH * workScale))
    const workCtx = workCanvas.getContext('2d', { willReadFrequently: true })
    if (!workCtx) return { theme: createTheme() }
    workCtx.clearRect(0, 0, workCanvas.width, workCanvas.height)
    workCtx.drawImage(image, 0, 0, workCanvas.width, workCanvas.height)

    removeEdgeBackground(workCtx, workCanvas.width, workCanvas.height)
    const bounds = trimCanvasBounds(workCtx, workCanvas.width, workCanvas.height)

    const trimmedCanvas = document.createElement('canvas')
    trimmedCanvas.width = Math.max(1, bounds.width)
    trimmedCanvas.height = Math.max(1, bounds.height)
    const trimmedCtx = trimmedCanvas.getContext('2d', { willReadFrequently: true })
    if (!trimmedCtx) return { theme: createTheme() }
    trimmedCtx.clearRect(0, 0, trimmedCanvas.width, trimmedCanvas.height)
    trimmedCtx.drawImage(workCanvas, bounds.x, bounds.y, bounds.width, bounds.height, 0, 0, trimmedCanvas.width, trimmedCanvas.height)

    const analysisCanvas = document.createElement('canvas')
    const maxAnalysis = 128
    const analysisScale = Math.min(1, maxAnalysis / Math.max(trimmedCanvas.width, trimmedCanvas.height))
    analysisCanvas.width = Math.max(1, Math.round(trimmedCanvas.width * analysisScale))
    analysisCanvas.height = Math.max(1, Math.round(trimmedCanvas.height * analysisScale))
    const analysisCtx = analysisCanvas.getContext('2d', { willReadFrequently: true })
    if (!analysisCtx) return { theme: createTheme() }
    analysisCtx.clearRect(0, 0, analysisCanvas.width, analysisCanvas.height)
    analysisCtx.drawImage(trimmedCanvas, 0, 0, analysisCanvas.width, analysisCanvas.height)
    const imageData = analysisCtx.getImageData(0, 0, analysisCanvas.width, analysisCanvas.height)
    const theme = extractPalette(imageData.data)

    const logoDataUrl = trimmedCanvas.toDataURL('image/png')
    return { logoDataUrl, logoFormat: 'PNG', theme }
  } catch {
    return { theme: createTheme() }
  }
}

function drawLogo(doc: jsPDF, logoDataUrl: string | undefined, logoFormat: 'PNG' | 'JPEG' = 'PNG', x: number, y: number, maxW: number, maxH: number) {
  if (!logoDataUrl) return false
  try {
    const props = doc.getImageProperties(logoDataUrl)
    const ratio = props.width / props.height
    let w = maxW
    let h = w / ratio
    if (h > maxH) {
      h = maxH
      w = h * ratio
    }
    doc.addImage(logoDataUrl, logoFormat, x + (maxW - w) / 2, y + (maxH - h) / 2, w, h, undefined, 'FAST')
    return true
  } catch {
    return false
  }
}

function drawPageFooter(doc: jsPDF, pageNumber: number, settings: Settings, theme: PdfTheme) {
  doc.setDrawColor(...mix(theme.primary, WHITE, 0.82))
  doc.line(MARGIN, PAGE_HEIGHT - 15, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 15)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  const left = settings.businessName || settings.professionalName || 'MESTRE'
  doc.text(`${left}  •  Orçamento gerado com MESTRE`, MARGIN, PAGE_HEIGHT - 9)
  doc.text(`Página ${pageNumber}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 9, { align: 'right' })
}

function startContinuationPage(doc: jsPDF, pageNumber: { value: number }, quote: Quote, settings: Settings, theme: PdfTheme) {
  drawPageFooter(doc, pageNumber.value, settings, theme)
  doc.addPage()
  pageNumber.value += 1
  doc.setFillColor(...theme.dark)
  doc.roundedRect(MARGIN, 12, CONTENT_WIDTH, 13, 4, 4, 'F')
  doc.setFillColor(...theme.primary)
  doc.roundedRect(MARGIN, 12, CONTENT_WIDTH, 2.5, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...WHITE)
  doc.text('ORÇAMENTO - CONTINUAÇÃO', MARGIN + 5, 20)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.text(`${quote.number}  •  ${shortDate(quote.createdAt)}`, PAGE_WIDTH - MARGIN - 5, 20, { align: 'right' })
  return 31
}

function ensureSpace(doc: jsPDF, y: number, needed: number, pageNumber: { value: number }, quote: Quote, settings: Settings, theme: PdfTheme) {
  if (y + needed <= PAGE_HEIGHT - 23) return { y, broke: false }
  return { y: startContinuationPage(doc, pageNumber, quote, settings, theme), broke: true }
}

function drawInfoCard(doc: jsPDF, label: string, heading: string, lines: string[], x: number, y: number, w: number, theme: PdfTheme) {
  const wrapped = lines.filter(Boolean).flatMap((line) => doc.splitTextToSize(line, w - 8) as string[])
  const h = Math.max(27, 18 + wrapped.length * 4)
  doc.setFillColor(...theme.soft2)
  doc.setDrawColor(...mix(theme.primary, WHITE, 0.79))
  doc.roundedRect(x, y, w, h, 4, 4, 'FD')
  doc.setFillColor(...theme.primary)
  doc.roundedRect(x, y, w, 2.5, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...theme.primary)
  doc.text(label.toUpperCase(), x + 4, y + 7)
  doc.setFontSize(11)
  doc.setTextColor(...TEXT)
  doc.text(heading || 'Não informado', x + 4, y + 13)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.4)
  doc.setTextColor(...MUTED)
  let yy = y + 18
  wrapped.forEach((line) => {
    doc.text(line, x + 4, yy)
    yy += 4
  })
  return h
}

function drawSectionTitle(doc: jsPDF, title: string, y: number, theme: PdfTheme, rightText?: string) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.7)
  const titleText = title.toUpperCase()
  const accentWidth = Math.min(CONTENT_WIDTH * 0.62, Math.max(32, doc.getTextWidth(titleText) + 10))
  doc.setFillColor(...theme.dark)
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 9, 3, 3, 'F')
  doc.setFillColor(...theme.primary)
  doc.roundedRect(MARGIN, y, accentWidth, 9, 3, 3, 'F')
  doc.setTextColor(...theme.onPrimary)
  doc.text(titleText, MARGIN + 5, y + 5.8)
  if (rightText) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...WHITE)
    doc.text(rightText, PAGE_WIDTH - MARGIN - 4, y + 5.6, { align: 'right' })
  }
  return y + 12
}

function drawItemsHeader(doc: jsPDF, y: number, theme: PdfTheme) {
  const cols = { desc: MARGIN + 2, qty: 124, unit: 148, total: PAGE_WIDTH - MARGIN - 2 }
  doc.setFillColor(...theme.soft)
  doc.rect(MARGIN, y, CONTENT_WIDTH, 8, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...mix(theme.dark, WHITE, 0.25))
  doc.text('Descrição', cols.desc, y + 5)
  doc.text('Qtd.', cols.qty, y + 5, { align: 'right' })
  doc.text('Unitário', cols.unit, y + 5, { align: 'right' })
  doc.text('Total', cols.total, y + 5, { align: 'right' })
  return { y: y + 9, cols }
}

function drawItems(doc: jsPDF, title: string, items: QuoteItem[], y: number, pageNumber: { value: number }, quote: Quote, settings: Settings, theme: PdfTheme) {
  const sectionTotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const right = items.length ? `${items.length} ${items.length === 1 ? 'item' : 'itens'}  •  ${money(sectionTotal)}` : 'Nenhum item'
  y = ensureSpace(doc, y, 24, pageNumber, quote, settings, theme).y
  y = drawSectionTitle(doc, title, y, theme, right)
  let header = drawItemsHeader(doc, y, theme)
  y = header.y

  if (!items.length) {
    doc.setDrawColor(...LINE)
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 12, 3, 3)
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8.5)
    doc.setTextColor(...MUTED)
    doc.text('Nenhum item adicionado nesta seção.', MARGIN + 4, y + 7)
    return y + 17
  }

  let rowIndex = 0
  for (const item of items) {
    const description = item.name || item.description || 'Item sem descrição'
    const descriptionLines = doc.splitTextToSize(description, 100) as string[]
    const rowHeight = Math.max(10, descriptionLines.length * 4.3 + 4)
    const ensured = ensureSpace(doc, y, rowHeight + 2, pageNumber, quote, settings, theme)
    if (ensured.broke) {
      y = drawSectionTitle(doc, `${title} - continuação`, ensured.y, theme)
      header = drawItemsHeader(doc, y, theme)
      y = header.y
    } else y = ensured.y

    if (rowIndex % 2 === 0) {
      doc.setFillColor(...mix(theme.soft, WHITE, 0.45))
      doc.roundedRect(MARGIN, y - 1, CONTENT_WIDTH, rowHeight, 2, 2, 'F')
    }

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.6)
    doc.setTextColor(...TEXT)
    doc.text(descriptionLines, MARGIN + 2, y + 5)
    doc.text(`${item.quantity} ${item.unit}`, header.cols.qty, y + 5, { align: 'right' })
    doc.text(money(item.unitPrice), header.cols.unit, y + 5, { align: 'right' })
    doc.setFont('helvetica', 'bold')
    doc.text(money(item.quantity * item.unitPrice), header.cols.total, y + 5, { align: 'right' })
    doc.setDrawColor(...mix(theme.primary, WHITE, 0.84))
    doc.line(MARGIN, y + rowHeight, PAGE_WIDTH - MARGIN, y + rowHeight)
    y += rowHeight + 1
    rowIndex += 1
  }
  return y + 4
}


function imageFormatFromDataUrl(dataUrl: string): 'PNG' | 'JPEG' {
  return dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG'
}

function drawPhotoInside(doc: jsPDF, source: string, x: number, y: number, maxW: number, maxH: number) {
  try {
    const props = doc.getImageProperties(source)
    const ratio = props.width / props.height
    let w = maxW
    let h = w / ratio
    if (h > maxH) {
      h = maxH
      w = h * ratio
    }
    const dx = x + (maxW - w) / 2
    const dy = y + (maxH - h) / 2
    doc.addImage(source, imageFormatFromDataUrl(source), dx, dy, w, h, undefined, 'FAST')
    return true
  } catch {
    return false
  }
}

function captionLines(doc: jsPDF, caption: string, width: number) {
  if (!caption.trim()) return [] as string[]
  const lines = doc.splitTextToSize(caption.trim(), width) as string[]
  if (lines.length <= 2) return lines
  const clipped = lines.slice(0, 2)
  clipped[1] = `${clipped[1].replace(/\s+$/, '')}…`
  return clipped
}

function drawQuotePhotos(
  doc: jsPDF,
  photos: QuotePhoto[],
  sources: Record<string, string>,
  y: number,
  pageNumber: { value: number },
  quote: Quote,
  settings: Settings,
  theme: PdfTheme,
) {
  if (!photos.length) return y

  y = ensureSpace(doc, y, 25, pageNumber, quote, settings, theme).y
  y = drawSectionTitle(doc, 'Fotos do serviço', y, theme, `${photos.length} ${photos.length === 1 ? 'foto' : 'fotos'}`)

  const gap = 6
  const cardW = (CONTENT_WIDTH - gap) / 2
  const cardH = 58
  const photoH = 43
  let column = 0

  photos.forEach((photo, index) => {
    if (column === 0) {
      const ensured = ensureSpace(doc, y, cardH + 5, pageNumber, quote, settings, theme)
      if (ensured.broke) {
        y = drawSectionTitle(doc, 'Fotos do serviço - continuação', ensured.y, theme)
      } else {
        y = ensured.y
      }
    }

    const x = MARGIN + column * (cardW + gap)
    doc.setFillColor(...WHITE)
    doc.setDrawColor(...mix(theme.primary, WHITE, 0.80))
    doc.roundedRect(x, y, cardW, cardH, 3.5, 3.5, 'FD')

    doc.setFillColor(...mix(theme.soft, WHITE, 0.38))
    doc.roundedRect(x + 3, y + 3, cardW - 6, photoH, 2.5, 2.5, 'F')

    const source = sources[photo.id]
    const ok = source ? drawPhotoInside(doc, source, x + 3, y + 3, cardW - 6, photoH) : false
    if (!ok) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.2)
      doc.setTextColor(...MUTED)
      doc.text('Foto indisponível', x + cardW / 2, y + 25, { align: 'center' })
    }

    doc.setFillColor(...theme.primary)
    doc.circle(x + 7, y + 7, 3.2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.4)
    doc.setTextColor(...theme.onPrimary)
    doc.text(String(index + 1), x + 7, y + 8, { align: 'center' })

    const lines = captionLines(doc, photo.caption, cardW - 8)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.7)
    doc.setTextColor(...TEXT)
    if (lines.length) {
      doc.text(lines, x + 4, y + 50)
    } else {
      doc.setTextColor(...MUTED)
      doc.text(`Foto ${index + 1} do local/serviço`, x + 4, y + 52)
    }

    if (column === 1) {
      column = 0
      y += cardH + 5
    } else {
      column = 1
    }
  })

  if (column === 1) y += cardH + 5
  return y + 2
}

function drawStatusPill(doc: jsPDF, status: Quote['status'], rightX: number, y: number, theme: PdfTheme) {
  const text = status
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.8)
  const w = Math.max(25, doc.getTextWidth(text) + 10)
  doc.setFillColor(...theme.soft)
  doc.roundedRect(rightX - w, y, w, 7, 3.5, 3.5, 'F')
  doc.setTextColor(...theme.primary)
  doc.text(text, rightX - w / 2, y + 4.6, { align: 'center' })
}

export async function generateQuotePdf(quote: Quote, client: Client | undefined, settings: Settings, photoSources: Record<string, string> = {}) {
  const assets = await prepareBrandAssets(settings.professionalLogo)
  const theme = assets.theme
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true })
  const totals = quoteTotal(quote.services, quote.materials, quote.discount, quote.taxPercent ?? 0, quote.profitMarginPercent ?? 0)
  const pageNumber = { value: 1 }

  // Fundo e faixa lateral usam a identidade extraída da logo.
  doc.setFillColor(251, 252, 254)
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F')
  doc.setFillColor(...theme.soft)
  doc.rect(0, 0, 6, PAGE_HEIGHT, 'F')
  doc.setFillColor(...theme.primary)
  doc.rect(0, 0, 2, PAGE_HEIGHT, 'F')

  const headerY = 14
  const headerH = 38
  doc.setFillColor(...theme.dark)
  doc.roundedRect(MARGIN, headerY, CONTENT_WIDTH, headerH, 6, 6, 'F')
  doc.setFillColor(...theme.primary)
  doc.roundedRect(MARGIN, headerY, CONTENT_WIDTH, 4, 4, 4, 'F')

  let contentX = MARGIN + 6
  if (assets.logoDataUrl) {
    const logoOk = drawLogo(doc, assets.logoDataUrl, assets.logoFormat, MARGIN + 4, headerY + 7, 36, 24)
    if (logoOk) contentX = MARGIN + 44
  }

  const businessTitle = settings.businessName || settings.professionalName || 'Profissional'
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...WHITE)
  doc.text(businessTitle, contentX, headerY + 16)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.4)
  doc.setTextColor(...mix(theme.secondary, WHITE, 0.62))
  const contactParts = [settings.professionalName && settings.professionalName !== businessTitle ? settings.professionalName : '', settings.phone, settings.email].filter(Boolean)
  if (contactParts.length) doc.text(contactParts.join('  •  '), contentX, headerY + 22)
  if (settings.document) doc.text(`CPF/CNPJ: ${settings.document}`, contentX, headerY + 27)

  const rightX = PAGE_WIDTH - MARGIN - 5
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...mix(theme.secondary, WHITE, 0.55))
  doc.text('ORÇAMENTO', rightX, headerY + 11, { align: 'right' })
  doc.setFontSize(14)
  doc.setTextColor(...WHITE)
  doc.text(quote.number, rightX, headerY + 18, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(223, 232, 244)
  doc.text(shortDate(quote.createdAt), rightX, headerY + 24, { align: 'right' })
  drawStatusPill(doc, quote.status, rightX, headerY + 27.5, theme)

  let y = headerY + headerH + 8

  const professionalLines = [settings.professionalName, settings.phone, settings.email, settings.document ? `CPF/CNPJ: ${settings.document}` : ''].filter(Boolean)
  const clientName = client?.name || quote.clientSnapshot?.name || 'Cliente não informado'
  const clientLines = [
    client?.phone || quote.clientSnapshot?.phone || '',
    client?.email || quote.clientSnapshot?.email || '',
    client?.document || quote.clientSnapshot?.document ? `CPF/CNPJ: ${client?.document || quote.clientSnapshot?.document}` : '',
    client?.address || quote.clientSnapshot?.address || '',
  ].filter(Boolean)

  const colGap = 8
  const colW = (CONTENT_WIDTH - colGap) / 2
  const leftH = drawInfoCard(doc, 'De', businessTitle, professionalLines, MARGIN, y, colW, theme)
  const rightH = drawInfoCard(doc, 'Para', clientName, clientLines, MARGIN + colW + colGap, y, colW, theme)
  y += Math.max(leftH, rightH) + 8

  y = drawItems(doc, 'Serviços', quote.services, y, pageNumber, quote, settings, theme)
  y = drawItems(doc, 'Materiais', quote.materials, y, pageNumber, quote, settings, theme)
  y = drawQuotePhotos(doc, quote.photos ?? [], photoSources, y, pageNumber, quote, settings, theme)

  const bottom = ensureSpace(doc, y, 84, pageNumber, quote, settings, theme)
  y = bottom.y
  const leftW = 118
  const rightW = CONTENT_WIDTH - leftW - 8

  doc.setFillColor(...WHITE)
  doc.setDrawColor(...mix(theme.primary, WHITE, 0.80))
  doc.roundedRect(MARGIN, y, leftW, 70, 4, 4, 'FD')
  doc.setFillColor(...theme.primary)
  doc.roundedRect(MARGIN, y, leftW, 3, 3, 3, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...theme.dark)
  doc.text('Observações e condições', MARGIN + 4, y + 9)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.4)
  doc.setTextColor(...TEXT)
  const obsLines = doc.splitTextToSize(quote.observations || 'Sem observações adicionais.', leftW - 8) as string[]
  let yy = y + 15
  doc.text(obsLines, MARGIN + 4, yy)
  yy += obsLines.length * 4.2 + 4
  doc.setTextColor(...MUTED)
  doc.text(`Condições de pagamento: ${quote.paymentTerms || 'Não informadas'}`, MARGIN + 4, yy)
  yy += 5
  doc.text(`Validade da proposta: ${quote.validityDays} dias`, MARGIN + 4, yy)
  if (settings.pixKey) {
    yy += 5
    doc.text(`Chave PIX: ${settings.pixKey}`, MARGIN + 4, yy)
  }

  const summaryX = MARGIN + leftW + 8
  doc.setFillColor(...theme.dark)
  doc.roundedRect(summaryX, y, rightW, 70, 4, 4, 'F')
  doc.setFillColor(...theme.primary)
  doc.roundedRect(summaryX, y, rightW, 3, 3, 3, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...WHITE)
  doc.text('Resumo financeiro', summaryX + 4, y + 9)

  const valueRow = (label: string, value: string, rowY: number, strong = false) => {
    doc.setFont('helvetica', strong ? 'bold' : 'normal')
    doc.setFontSize(strong ? 11 : 8.7)
    doc.setTextColor(...(strong ? WHITE : mix(theme.secondary, WHITE, 0.67)))
    doc.text(label, summaryX + 4, rowY)
    doc.text(value, summaryX + rightW - 4, rowY, { align: 'right' })
  }
  let summaryRowY = y + 16
  valueRow('Serviços', money(totals.servicesTotal), summaryRowY)
  summaryRowY += 7
  valueRow('Materiais', money(totals.materialsTotal), summaryRowY)
  summaryRowY += 7
  valueRow('Desconto', `- ${money(quote.discount)}`, summaryRowY)
  summaryRowY += 7
  if (quote.showProfitMarginInPdf !== false && (quote.profitMarginPercent ?? 0) > 0) {
    valueRow(`Margem (${quote.profitMarginPercent ?? 0}%)`, money(totals.profitAmount), summaryRowY)
    summaryRowY += 7
  }
  if (quote.showTaxInPdf !== false && (quote.taxPercent ?? 0) > 0) {
    valueRow(`Imposto (${quote.taxPercent ?? 0}%)`, money(totals.taxAmount), summaryRowY)
    summaryRowY += 7
  }
  doc.setDrawColor(...mix(theme.primary, WHITE, 0.42))
  doc.line(summaryX + 4, summaryRowY - 1.5, summaryX + rightW - 4, summaryRowY - 1.5)
  valueRow('TOTAL', money(totals.total), summaryRowY + 7, true)
  // Faixa discreta de identidade visual, sem texto adicional no resumo financeiro.
  doc.setFillColor(...theme.primary)
  doc.roundedRect(summaryX + 4, y + 64, rightW - 8, 2, 1, 1, 'F')

  drawPageFooter(doc, pageNumber.value, settings, theme)
  const filename = `${sanitizeFilename(quote.number)}-${sanitizeFilename(clientName) || 'cliente'}.pdf`
  doc.save(filename)
}


function drawDocumentHeader(doc: jsPDF, title: string, number: string, date: string, settings: Settings, assets: BrandAssets) {
  const theme = assets.theme
  doc.setFillColor(251, 252, 254)
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F')
  doc.setFillColor(...theme.soft)
  doc.rect(0, 0, 6, PAGE_HEIGHT, 'F')
  doc.setFillColor(...theme.primary)
  doc.rect(0, 0, 2, PAGE_HEIGHT, 'F')
  doc.setFillColor(...theme.dark)
  doc.roundedRect(MARGIN, 14, CONTENT_WIDTH, 36, 6, 6, 'F')
  doc.setFillColor(...theme.primary)
  doc.roundedRect(MARGIN, 14, CONTENT_WIDTH, 4, 4, 4, 'F')
  let x = MARGIN + 6
  if (assets.logoDataUrl && drawLogo(doc, assets.logoDataUrl, assets.logoFormat, MARGIN + 4, 21, 34, 20)) x = MARGIN + 43
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...WHITE)
  doc.text(settings.businessName || settings.professionalName || 'MESTRE', x, 30)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.2)
  doc.setTextColor(...mix(theme.secondary, WHITE, 0.65))
  const contact = [settings.phone, settings.email].filter(Boolean).join('  •  ')
  if (contact) doc.text(contact, x, 36)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...mix(theme.secondary, WHITE, 0.55))
  doc.text(title.toUpperCase(), PAGE_WIDTH - MARGIN - 5, 25, { align: 'right' })
  doc.setFontSize(14)
  doc.setTextColor(...WHITE)
  doc.text(number, PAGE_WIDTH - MARGIN - 5, 33, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(223, 232, 244)
  doc.text(date, PAGE_WIDTH - MARGIN - 5, 39, { align: 'right' })
  return 58
}

function drawDocumentItems(doc: jsPDF, title: string, items: QuoteItem[], y: number, theme: PdfTheme) {
  if (!items.length) return y
  y = drawSectionTitle(doc, title, y, theme)
  const cols = { desc: MARGIN + 3, qty: 128, unit: 154, total: PAGE_WIDTH - MARGIN - 3 }
  doc.setFillColor(...theme.soft)
  doc.rect(MARGIN, y, CONTENT_WIDTH, 8, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...theme.dark)
  doc.text('Descrição', cols.desc, y + 5); doc.text('Qtd.', cols.qty, y + 5, {align:'right'}); doc.text('Unitário', cols.unit, y + 5, {align:'right'}); doc.text('Total', cols.total, y + 5, {align:'right'})
  y += 10
  for (const item of items) {
    const lines = doc.splitTextToSize(item.name || item.description || 'Item', 100) as string[]
    const h = Math.max(9, lines.length * 4 + 3)
    if (y + h > PAGE_HEIGHT - 22) {
      doc.addPage(); y = 20
      doc.setFillColor(...theme.primary); doc.rect(MARGIN, 12, CONTENT_WIDTH, 3, 'F')
    }
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...TEXT)
    doc.text(lines, cols.desc, y + 4.5)
    doc.text(`${item.quantity} ${item.unit}`, cols.qty, y + 4.5, {align:'right'})
    doc.text(money(item.unitPrice), cols.unit, y + 4.5, {align:'right'})
    doc.setFont('helvetica','bold'); doc.text(money(item.quantity * item.unitPrice), cols.total, y + 4.5, {align:'right'})
    doc.setDrawColor(...LINE); doc.line(MARGIN, y + h, PAGE_WIDTH - MARGIN, y + h)
    y += h + 1
  }
  return y + 5
}

export async function generateWorkOrderPdf(order: WorkOrder, client: Client | undefined, settings: Settings) {
  const assets = await prepareBrandAssets(settings.professionalLogo)
  const theme = assets.theme
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true })
  let y = drawDocumentHeader(doc, 'Ordem de serviço', order.number, shortDate(order.createdAt), settings, assets)
  const clientName = client?.name || order.clientSnapshot?.name || 'Cliente não informado'
  const clientLines = [client?.phone || order.clientSnapshot?.phone || '', client?.email || order.clientSnapshot?.email || '', client?.address || order.clientSnapshot?.address || ''].filter(Boolean)
  const leftH = drawInfoCard(doc, 'Cliente', clientName, clientLines, MARGIN, y, 88, theme)
  const rightLines = [order.quoteNumber ? `Orçamento: ${order.quoteNumber}` : 'O.S. avulsa', `Status: ${order.status}`, order.scheduledDate ? `Data agendada: ${shortDate(order.scheduledDate)}` : ''].filter(Boolean)
  const rightH = drawInfoCard(doc, 'Execução', 'Dados da ordem', rightLines, MARGIN + 96, y, 86, theme)
  y += Math.max(leftH, rightH) + 8
  y = drawDocumentItems(doc, 'Serviços', order.services, y, theme)
  y = drawDocumentItems(doc, 'Materiais', order.materials, y, theme)
  if (y + 45 > PAGE_HEIGHT - 20) { doc.addPage(); y = 20 }
  doc.setFillColor(...WHITE); doc.setDrawColor(...mix(theme.primary, WHITE, .8)); doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 38, 4, 4, 'FD')
  doc.setFillColor(...theme.primary); doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 3, 3, 3, 'F')
  doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(...theme.dark); doc.text('Descrição / instruções de execução', MARGIN + 5, y + 10)
  doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...TEXT)
  doc.text(doc.splitTextToSize(order.description || 'Sem instruções adicionais.', CONTENT_WIDTH - 10), MARGIN + 5, y + 17)
  drawPageFooter(doc, doc.getNumberOfPages(), settings, theme)
  doc.save(`${sanitizeFilename(order.number)}-${sanitizeFilename(clientName) || 'cliente'}.pdf`)
}

export async function generateReceiptPdf(receipt: Receipt, client: Client | undefined, settings: Settings) {
  const assets = await prepareBrandAssets(settings.professionalLogo)
  const theme = assets.theme
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true })
  let y = drawDocumentHeader(doc, 'Recibo', receipt.number, shortDate(receipt.issueDate), settings, assets)
  const clientName = client?.name || receipt.clientSnapshot?.name || 'Cliente não informado'
  const clientLines = [client?.document || receipt.clientSnapshot?.document ? `CPF/CNPJ: ${client?.document || receipt.clientSnapshot?.document}` : '', client?.phone || receipt.clientSnapshot?.phone || '', client?.email || receipt.clientSnapshot?.email || ''].filter(Boolean)
  y += drawInfoCard(doc, 'Recebido de', clientName, clientLines, MARGIN, y, CONTENT_WIDTH, theme) + 10
  doc.setFillColor(...theme.dark); doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 38, 5, 5, 'F')
  doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(...mix(theme.secondary, WHITE, .65)); doc.text('VALOR RECEBIDO', MARGIN + 7, y + 11)
  doc.setFont('helvetica','bold'); doc.setFontSize(25); doc.setTextColor(...WHITE); doc.text(money(receipt.amount), MARGIN + 7, y + 25)
  doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...mix(theme.secondary, WHITE, .65)); doc.text(`Pagamento: ${receipt.paymentMethod}${receipt.quoteNumber ? `  •  Referência: ${receipt.quoteNumber}` : ''}`, MARGIN + 7, y + 32)
  y += 48
  doc.setFillColor(...WHITE); doc.setDrawColor(...mix(theme.primary, WHITE, .8)); doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 45, 4, 4, 'FD')
  doc.setFillColor(...theme.primary); doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 3, 3, 3, 'F')
  doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(...theme.dark); doc.text('Referente a', MARGIN + 5, y + 11)
  doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(...TEXT); doc.text(doc.splitTextToSize(receipt.description || 'Pagamento recebido.', CONTENT_WIDTH - 10), MARGIN + 5, y + 19)
  doc.setFontSize(8.5); doc.setTextColor(...MUTED); doc.text(`Emitido em ${shortDate(receipt.issueDate)} por ${settings.businessName || settings.professionalName || 'MESTRE'}.`, MARGIN + 5, y + 37)
  if (settings.pixKey) doc.text(`Chave PIX: ${settings.pixKey}`, MARGIN + 5, y + 42)
  drawPageFooter(doc, 1, settings, theme)
  doc.save(`${sanitizeFilename(receipt.number)}-${sanitizeFilename(clientName) || 'cliente'}.pdf`)
}
