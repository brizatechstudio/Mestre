import { usingFirebaseBackend } from './env'
import { callSupabaseStorage } from './supabaseStorage'

export type ProcessedLogo = {
  dataUrl: string
  contentType: 'image/png' | 'image/jpeg'
  fileName: string
}

export type StoredLogo = {
  url: string
  path: string
  provider: 'local' | 'supabase'
}


export async function processLogoFile(file: File): Promise<ProcessedLogo> {
  if (file.size > 5 * 1024 * 1024) throw new Error('A logo deve ter no máximo 5 MB.')
  if (!file.type.startsWith('image/')) throw new Error('Escolha um arquivo de imagem.')

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'))
    reader.readAsDataURL(file)
  })

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Não foi possível abrir essa imagem.'))
    img.src = dataUrl
  })

  const maxSide = 900
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height))
  const source = document.createElement('canvas')
  source.width = Math.max(1, Math.round(image.width * scale))
  source.height = Math.max(1, Math.round(image.height * scale))
  const sourceCtx = source.getContext('2d', { willReadFrequently: true })
  if (!sourceCtx) throw new Error('Não foi possível processar a imagem.')
  sourceCtx.clearRect(0, 0, source.width, source.height)
  sourceCtx.drawImage(image, 0, 0, source.width, source.height)

  const pixels = sourceCtx.getImageData(0, 0, source.width, source.height)
  let minX = source.width
  let minY = source.height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const i = (y * source.width + x) * 4
      const a = pixels.data[i + 3]
      const r = pixels.data[i]
      const g = pixels.data[i + 1]
      const b = pixels.data[i + 2]
      const visible = a > 20 && !(r > 248 && g > 248 && b > 248)
      if (visible) {
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
  }

  if (maxX < 0) {
    minX = 0
    minY = 0
    maxX = source.width - 1
    maxY = source.height - 1
  }

  const pad = Math.max(4, Math.round(Math.max(source.width, source.height) * 0.02))
  minX = Math.max(0, minX - pad)
  minY = Math.max(0, minY - pad)
  maxX = Math.min(source.width - 1, maxX + pad)
  maxY = Math.min(source.height - 1, maxY + pad)

  const cropW = Math.max(1, maxX - minX + 1)
  const cropH = Math.max(1, maxY - minY + 1)
  const finalMax = 720
  const finalScale = Math.min(1, finalMax / Math.max(cropW, cropH))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(cropW * finalScale))
  canvas.height = Math.max(1, Math.round(cropH * finalScale))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Não foi possível processar a imagem.')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(source, minX, minY, cropW, cropH, 0, 0, canvas.width, canvas.height)

  let output = canvas.toDataURL('image/png')
  let contentType: ProcessedLogo['contentType'] = 'image/png'
  let fileName = 'professional-logo.png'

  if (output.length > 2_200_000) {
    const jpg = document.createElement('canvas')
    jpg.width = canvas.width
    jpg.height = canvas.height
    const jpgCtx = jpg.getContext('2d')
    if (!jpgCtx) throw new Error('Não foi possível otimizar a imagem.')
    jpgCtx.fillStyle = '#ffffff'
    jpgCtx.fillRect(0, 0, jpg.width, jpg.height)
    jpgCtx.drawImage(canvas, 0, 0)
    output = jpg.toDataURL('image/jpeg', 0.9)
    contentType = 'image/jpeg'
    fileName = 'professional-logo.jpg'
  }

  return { dataUrl: output, contentType, fileName }
}


export async function storeProfessionalLogo(uid: string, logo: ProcessedLogo, previousPath?: string): Promise<StoredLogo> {
  if (!usingFirebaseBackend) {
    return { url: logo.dataUrl, path: '', provider: 'local' }
  }

  const result = await callSupabaseStorage({
    action: 'upload',
    dataUrl: logo.dataUrl,
    fileName: logo.fileName,
    previousPath,
  })

  if (!result.url || !result.path) throw new Error('O Supabase não retornou a URL da logo.')
  if (!result.path.startsWith(`user-logos/${uid}/`)) throw new Error('O caminho retornado pelo Storage é inválido.')
  return { url: result.url, path: result.path, provider: 'supabase' }
}

export async function removeProfessionalLogo(uid: string, path?: string) {
  if (!path || !usingFirebaseBackend) return
  if (!path.startsWith(`user-logos/${uid}/`)) return
  await callSupabaseStorage({ action: 'delete', path })
}

export function logoProviderLabel() {
  return usingFirebaseBackend ? 'Supabase Storage' : 'armazenamento local'
}

export async function storeLegacyDataUrlLogo(uid: string, dataUrl: string) {
  const contentType: ProcessedLogo['contentType'] = dataUrl.startsWith('data:image/jpeg') ? 'image/jpeg' : 'image/png'
  const fileName = contentType === 'image/jpeg' ? 'professional-logo.jpg' : 'professional-logo.png'
  return storeProfessionalLogo(uid, { dataUrl, contentType, fileName })
}
