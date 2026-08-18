import type { QuotePhoto } from '../types'
import { usingFirebaseBackend } from './env'
import { callSupabaseStorage } from './supabaseStorage'

export const MAX_QUOTE_PHOTOS = 6
const MAX_ORIGINAL_FILE_SIZE = 12 * 1024 * 1024
const MAX_DATA_URL_LENGTH = 2_700_000

export type ProcessedQuotePhoto = {
  dataUrl: string
  contentType: 'image/jpeg'
  width: number
  height: number
}

export type StoredQuotePhoto = {
  path: string
  previewUrl: string
  localDataUrl?: string
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Não foi possível ler a foto.'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Não foi possível abrir a foto.'))
    image.src = src
  })
}

function renderJpeg(image: HTMLImageElement, maxSide: number, quality: number) {
  const width = image.naturalWidth || image.width
  const height = image.naturalHeight || image.height
  const scale = Math.min(1, maxSide / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Não foi possível processar a foto.')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
  return {
    dataUrl: canvas.toDataURL('image/jpeg', quality),
    width: canvas.width,
    height: canvas.height,
  }
}

export async function processQuotePhotoFile(file: File): Promise<ProcessedQuotePhoto> {
  if (!file.type.startsWith('image/')) throw new Error('Escolha somente arquivos de imagem.')
  if (file.size > MAX_ORIGINAL_FILE_SIZE) throw new Error('Cada foto original deve ter no máximo 12 MB.')

  const original = await readFileAsDataUrl(file)
  const image = await loadImage(original)

  const attempts = [
    { maxSide: 1600, quality: 0.82 },
    { maxSide: 1400, quality: 0.76 },
    { maxSide: 1200, quality: 0.70 },
    { maxSide: 1000, quality: 0.66 },
  ]

  let result = renderJpeg(image, attempts[0].maxSide, attempts[0].quality)
  for (const attempt of attempts.slice(1)) {
    if (result.dataUrl.length <= MAX_DATA_URL_LENGTH) break
    result = renderJpeg(image, attempt.maxSide, attempt.quality)
  }

  if (result.dataUrl.length > MAX_DATA_URL_LENGTH) {
    throw new Error('A foto ficou grande demais mesmo após a otimização. Tente outra imagem.')
  }

  return {
    ...result,
    contentType: 'image/jpeg',
  }
}

export async function storeQuotePhoto(uid: string, quoteId: string, photoId: string, photo: ProcessedQuotePhoto): Promise<StoredQuotePhoto> {
  if (!usingFirebaseBackend) {
    return { path: '', previewUrl: photo.dataUrl, localDataUrl: photo.dataUrl }
  }

  const result = await callSupabaseStorage({
    action: 'uploadQuotePhoto',
    quoteId,
    photoId,
    dataUrl: photo.dataUrl,
  })

  if (!result.path || !result.url) throw new Error('O Supabase não retornou a foto enviada.')
  if (!result.path.startsWith(`quote-photos/${uid}/${quoteId}/`)) throw new Error('O caminho retornado para a foto é inválido.')
  return { path: result.path, previewUrl: result.url }
}

export async function getQuotePhotoPreviewUrl(uid: string, photo: QuotePhoto) {
  if (photo.localDataUrl) return photo.localDataUrl
  if (!photo.path) return ''
  if (!usingFirebaseBackend) return ''
  if (!photo.path.startsWith(`quote-photos/${uid}/`)) throw new Error('Caminho de foto inválido.')

  const result = await callSupabaseStorage({ action: 'signedQuotePhoto', path: photo.path })
  if (!result.url) throw new Error('Não foi possível obter a foto do orçamento.')
  return result.url
}

export async function resolveQuotePhotoDataUrls(uid: string, photos: QuotePhoto[]) {
  const entries = await Promise.all(photos.map(async (photo) => {
    try {
      if (photo.localDataUrl) return [photo.id, photo.localDataUrl] as const
      const url = await getQuotePhotoPreviewUrl(uid, photo)
      if (!url) return null
      const response = await fetch(url)
      if (!response.ok) return null
      const blob = await response.blob()
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error('Não foi possível preparar a foto para o PDF.'))
        reader.readAsDataURL(blob)
      })
      return [photo.id, dataUrl] as const
    } catch (error) {
      console.error('resolveQuotePhotoDataUrls', error)
      return null
    }
  }))

  return Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => Boolean(entry)))
}

export async function removeQuotePhoto(uid: string, photo: QuotePhoto) {
  if (!usingFirebaseBackend || !photo.path) return
  if (!photo.path.startsWith(`quote-photos/${uid}/`)) throw new Error('Caminho de foto inválido.')
  await callSupabaseStorage({ action: 'deleteQuotePhoto', path: photo.path })
}

export async function removeQuotePhotosForQuote(uid: string, quoteId: string) {
  if (!usingFirebaseBackend) return
  await callSupabaseStorage({ action: 'deleteQuotePhotos', quoteId })
}

export function quotePhotoProviderLabel() {
  return usingFirebaseBackend ? 'Supabase Storage privado' : 'armazenamento local'
}
