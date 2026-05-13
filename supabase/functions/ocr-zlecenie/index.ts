// PROCES 1 - SZYBKI (~3-8s)
// Konwertuje plik na JPG → Gemini wizualnie analizuje dokument → zwraca JSON do formularza
// WAŻNE: nie OCR tekstu — wizualne rozumowanie całego dokumentu

import { createClient } from 'npm:@supabase/supabase-js@2'
import { GoogleGenerativeAI } from 'npm:@google/generative-ai'
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { PROMPT_OCR_FAST } from '../_shared/prompts.ts'
import { fileToImageParts } from '../_shared/convert-to-jpg.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const genai = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY')!)
const model = genai.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: {
    // @ts-ignore
    thinkingConfig: { thinkingBudget: 0 }, // szybki tryb - bez thinking
  },
})

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const formData = await req.formData()
    const uploadedFile = formData.get('pdf') as File | null

    if (!uploadedFile) {
      return errorResponse('Brak pliku', 400)
    }

    // 1. Wczytaj bajty pliku
    const fileBuffer = await uploadedFile.arrayBuffer()
    const fileBytes = new Uint8Array(fileBuffer)
    const originalMime = uploadedFile.type || 'application/octet-stream'
    const originalName = uploadedFile.name || 'upload'

    // 2. Konwertuj plik na obrazy JPEG (PDF → JPG strona po stronie, DOCX → JPG, obraz → JPG)
    const imageParts = await fileToImageParts(fileBytes, originalMime, originalName, 4)

    if (imageParts.length === 0) {
      return errorResponse('Nie można przekonwertować pliku na obraz. Sprawdź format (PDF, DOCX, JPG, PNG).', 422)
    }

    console.log(`OCR: ${originalName} → ${imageParts.length} stron(y) JPEG`)

    // 3. Zapisz oryginalny plik do Supabase Storage (fire & forget, nie blokuje)
    const safeExt = originalName.split('.').pop()?.replace(/[^a-z0-9]/gi, '') || 'pdf'
    const fileName = `${Date.now()}_${originalName.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 60)}.${safeExt}`
    let pdfUrl: string | null = null

    supabase.storage
      .from('pdfs')
      .upload(fileName, fileBuffer, { contentType: originalMime, upsert: false })
      .then(({ data, error }) => {
        if (!error && data) {
          const { data: urlData } = supabase.storage.from('pdfs').getPublicUrl(data.path)
          pdfUrl = urlData.publicUrl
        }
      })
      .catch(() => {})

    // 4. Wyślij WSZYSTKIE strony jako obrazy JPEG do Gemini — wizualna analiza całego dokumentu
    const geminiParts = [
      ...imageParts,
      PROMPT_OCR_FAST,
    ]

    const geminiResponse = await model.generateContent(geminiParts)
    const rawText = geminiResponse.response.text()

    // 5. Parsuj JSON z odpowiedzi
    let extracted: Record<string, unknown> = {}
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0])
      }
    } catch {
      return errorResponse('Błąd parsowania odpowiedzi AI: ' + rawText.substring(0, 500), 422)
    }

    // 6. Sprawdź czy kontrahent już istnieje w bazie (po NIP)
    let kontrahentMatch: Record<string, unknown> | null = null
    const nip = extracted.zleceniodawca_nip as string
    if (nip) {
      const { data: existing } = await supabase
        .from('kontrahenci')
        .select('id, nazwa, nip, adres_kod, adres_miasto, kraj, email, telefon')
        .eq('nip', nip)
        .maybeSingle()
      if (existing) kontrahentMatch = existing
    }

    // 7. Zwróć dane do frontendu
    return jsonResponse({
      success: true,
      pdf_url: pdfUrl,
      pdf_filename: fileName,
      extracted,
      kontrahent_match: kontrahentMatch,
      usage: {
        model: 'gemini-2.5-flash',
        pages: imageParts.length,
        input_tokens: geminiResponse.response.usageMetadata?.promptTokenCount ?? 0,
        output_tokens: geminiResponse.response.usageMetadata?.candidatesTokenCount ?? 0,
      },
    })

  } catch (err) {
    console.error('ocr-zlecenie error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Nieznany błąd')
  }
})
