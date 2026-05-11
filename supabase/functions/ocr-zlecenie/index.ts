// PROCES 1 - SZYBKI (~3-5s)
// Przyjmuje PDF, wywołuje Gemini AI, zwraca dane do formularza
// Spedytor widzi wynik natychmiast

import { createClient } from 'npm:@supabase/supabase-js@2'
import { GoogleGenerativeAI } from 'npm:@google/generative-ai'
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { PROMPT_OCR_FAST } from '../_shared/prompts.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const genai = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY')!)
const model = genai.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: {
    // @ts-ignore - thinkingConfig not yet in type defs
    thinkingConfig: { thinkingBudget: 0 },
  },
})

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const formData = await req.formData()
    const pdfFile = formData.get('pdf') as File | null

    if (!pdfFile) {
      return errorResponse('Brak pliku PDF', 400)
    }

    // 1. Wczytaj PDF jako ArrayBuffer i zakoduj base64 chunkami
    // (spread ...Uint8Array na dużych plikach wysadza stos)
    const pdfBuffer = await pdfFile.arrayBuffer()
    const pdfBytes = new Uint8Array(pdfBuffer)
    let binary = ''
    const CHUNK = 8192
    for (let i = 0; i < pdfBytes.length; i += CHUNK) {
      binary += String.fromCharCode(...pdfBytes.subarray(i, i + CHUNK))
    }
    const pdfBase64 = btoa(binary)

    // 2. Zapisz PDF do Supabase Storage - prawdziwy fire & forget, nie blokuje odpowiedzi
    const fileName = `${Date.now()}_${pdfFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    let pdfUrl: string | null = null

    supabase.storage
      .from('pdfs')
      .upload(fileName, pdfBuffer, { contentType: 'application/pdf', upsert: false })
      .then(({ data, error }) => {
        if (!error && data) {
          const { data: urlData } = supabase.storage
            .from('pdfs')
            .getPublicUrl(data.path)
          pdfUrl = urlData.publicUrl
        }
      })
      .catch(() => { /* ignoruj błędy uploadu */ })

    // 3. Wywołaj Gemini (nie czekamy na upload)
    const geminiResponse = await model.generateContent([
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: pdfBase64,
        },
      },
      PROMPT_OCR_FAST,
    ])

    // 5. Parsuj odpowiedź
    const rawText = geminiResponse.response.text()

    let extracted: Record<string, unknown> = {}
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0])
      }
    } catch {
      return errorResponse('Błąd parsowania odpowiedzi AI: ' + rawText, 422)
    }

    // 6. Sprawdź czy kontrahent już istnieje (po NIP)
    let kontrahentMatch: Record<string, unknown> | null = null
    const nip = extracted.zleceniodawca_nip as string
    if (nip) {
      const { data: existing } = await supabase
        .from('kontrahenci')
        .select('id, nazwa, nip, adres_kod, adres_miasto, kraj, email, telefon')
        .eq('nip', nip)
        .maybeSingle()

      if (existing) {
        kontrahentMatch = existing
      }
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
        input_tokens: geminiResponse.response.usageMetadata?.promptTokenCount ?? 0,
        output_tokens: geminiResponse.response.usageMetadata?.candidatesTokenCount ?? 0,
      },
    })

  } catch (err) {
    console.error('ocr-zlecenie error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Nieznany błąd')
  }
})
