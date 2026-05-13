// Konwersja dowolnego pliku (PDF, DOCX, JPEG, PNG...) na tablicę obrazów gotowych do Gemini
// Gemini akceptuje: image/jpeg, image/png, image/webp, image/gif, application/pdf

export type ImagePart = {
  inlineData: { data: string; mimeType: string }
}

/**
 * Konwertuje dowolny plik na image parts gotowe do wysłania do Gemini.
 */
export async function fileToImageParts(
  bytes: Uint8Array,
  mimeType: string,
  filename = '',
  maxPages = 4,
): Promise<ImagePart[]> {
  const mime = detectMime(bytes, mimeType, filename)
  console.log(`fileToImageParts: mime=${mime} filename=${filename} bytes=${bytes.length}`)

  try {
    if (mime.startsWith('image/')) {
      // Gemini akceptuje JPEG, PNG, WebP, GIF — przekazuj as-is, bez konwersji
      return [{ inlineData: { data: bytesToBase64(bytes), mimeType: mime } }]
    }
    if (mime === 'application/pdf') {
      return await pdfToImageParts(bytes, maxPages)
    }
    if (isDocx(mime, filename)) {
      return await docxToJpegParts(bytes)
    }
    console.error(`fileToImageParts: brak handlera dla mime=${mime}`)
  } catch (err) {
    console.error(`fileToImageParts error dla ${mime}:`, err)
  }

  return []
}

// --------------------------------------------------------
// WYKRYWANIE MIME Z MAGIC BYTES
// --------------------------------------------------------
function detectMime(bytes: Uint8Array, declared: string, filename: string): string {
  if (bytes.length >= 4) {
    if (bytes[0] === 0xFF && bytes[1] === 0xD8) return 'image/jpeg'
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return 'image/png'
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif'
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return 'application/pdf'
    if (
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes.length >= 12 && bytes[8] === 0x57 && bytes[9] === 0x45
    ) return 'image/webp'
    // ZIP-based (DOCX, XLSX, PPTX)
    if (bytes[0] === 0x50 && bytes[1] === 0x4B) {
      if (isDocx(declared, filename)) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }
  }
  if (declared && declared !== 'application/octet-stream') return declared
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf') return 'application/pdf'
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'png') return 'image/png'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'docx' || ext === 'doc') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  return declared || 'application/octet-stream'
}

function isDocx(mime: string, filename: string): boolean {
  return mime.includes('word') || mime.includes('docx') ||
    filename.endsWith('.docx') || filename.endsWith('.doc')
}

// --------------------------------------------------------
// PDF → strony jako PNG przez mupdf WASM
// Fallback: przekaż PDF inline do Gemini (obsługuje PDF natywnie)
// --------------------------------------------------------
async function pdfToImageParts(pdfBytes: Uint8Array, maxPages: number): Promise<ImagePart[]> {
  try {
    const mupdfModule = await import('npm:mupdf@1.3.0')
    // Obsługa zarówno default export jak i named exports
    // deno-lint-ignore no-explicit-any
    const mupdf = (mupdfModule as any).default ?? mupdfModule

    if (!mupdf.Document) {
      throw new Error(`mupdf.Document undefined — dostępne klucze: ${Object.keys(mupdf).join(', ')}`)
    }

    const doc = mupdf.Document.openDocument(pdfBytes, 'application/pdf')
    const numPages = Math.min(doc.countPages(), maxPages)
    console.log(`PDF mupdf: ${numPages} stron(y)`)
    const results: ImagePart[] = []

    for (let i = 0; i < numPages; i++) {
      try {
        const page = doc.loadPage(i)
        // Skala 2.5x dla czytelności drobnego druku
        const scale = 2.5
        const matrix = [scale, 0, 0, scale, 0, 0] as [number, number, number, number, number, number]
        const pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false, true)
        const pngData = pixmap.asPNG()
        // asPNG() może zwrócić Buffer lub Uint8Array — normalizuj
        const pngBytes = pngData instanceof Uint8Array ? pngData : new Uint8Array(pngData)
        // Przekaż jako PNG — Gemini akceptuje image/png, nie wymaga JPEG
        results.push({ inlineData: { data: bytesToBase64(pngBytes), mimeType: 'image/png' } })
        pixmap.destroy()
        page.destroy()
        console.log(`PDF strona ${i + 1}/${numPages}: ${pngBytes.length} bajtów PNG ✓`)
      } catch (pageErr) {
        console.warn(`PDF strona ${i + 1} błąd:`, pageErr)
      }
    }

    if (results.length > 0) return results
    throw new Error('Żadna strona PDF nie przetworzona przez mupdf')

  } catch (err) {
    console.error('mupdf failed — fallback: inline PDF do Gemini:', err)
    // Gemini 2.5 Flash obsługuje PDF natywnie — jako ostateczna opcja
    return [{ inlineData: { data: bytesToBase64(pdfBytes), mimeType: 'application/pdf' } }]
  }
}

// --------------------------------------------------------
// DOCX → JPEG (mammoth → tekst → OffscreenCanvas)
// Nie wymaga createImageBitmap — tylko rysowanie tekstu
// --------------------------------------------------------
async function docxToJpegParts(bytes: Uint8Array): Promise<ImagePart[]> {
  const mammoth = await import('npm:mammoth@1.8.0')

  const result = await mammoth.convertToHtml({ arrayBuffer: bytes.buffer as ArrayBuffer })
  const text = htmlToText(result.value)
  if (!text.trim()) return []

  return [await textToJpegPart(text)]
}

function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/td>/gi, '  ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function textToJpegPart(text: string): Promise<ImagePart> {
  const W = 1240
  const FONT_SIZE = 18
  const LINE_H = FONT_SIZE * 1.55
  const PAD = 50
  const MAX_W = W - PAD * 2
  const FONT = `${FONT_SIZE}px monospace`

  // Oblicz linie (tylko text drawing — nie wymaga createImageBitmap)
  const scratch = new OffscreenCanvas(W, 100)
  const ctx0 = scratch.getContext('2d')!
  ctx0.font = FONT

  const lines: string[] = []
  for (const raw of text.split('\n')) {
    if (!raw.trim()) { lines.push(''); continue }
    let cur = ''
    for (const word of raw.split(' ')) {
      const test = cur ? `${cur} ${word}` : word
      if (ctx0.measureText(test).width > MAX_W && cur) {
        lines.push(cur); cur = word
      } else { cur = test }
    }
    if (cur) lines.push(cur)
  }

  const H = Math.min(Math.ceil(lines.length * LINE_H) + PAD * 2, 9000)
  const canvas = new OffscreenCanvas(W, H)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#111111'
  ctx.font = FONT

  let y = PAD + FONT_SIZE
  for (const line of lines) {
    if (y > H - PAD) break
    ctx.fillText(line, PAD, y)
    y += LINE_H
  }

  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.92 })
  return { inlineData: { data: await blobToBase64(blob), mimeType: 'image/jpeg' } }
}

// --------------------------------------------------------
// UTILS
// --------------------------------------------------------
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const CHUNK = 8192
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

async function blobToBase64(blob: Blob): Promise<string> {
  return bytesToBase64(new Uint8Array(await blob.arrayBuffer()))
}
