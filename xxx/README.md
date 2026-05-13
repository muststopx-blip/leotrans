# LEOTRANS — System zarządzania zleceniami transportowymi

**Firma:** LEO-TRANS MACIEJ LEW SPÓŁKA KOMANDYTOWA, Milicz  
**Powered by:** Mediafy  
**Repo:** https://github.com/muststopx-blip/leotrans  
**Aplikacja (prod):** http://serwer2657672.home.pl (FTP home.pl → /public_html/)

---

## Co to jest?

System webowy zastępujący ręczny obieg zleceń transportowych w firmie Leo-Trans.
Spedytor wgrywa PDF zlecenia od kontrahenta → AI wyciąga dane → formularz do weryfikacji → zapis do bazy → wiadomość dla kierowcy → eksport do SpedTrans.

## Szybki start

```bash
git clone https://github.com/muststopx-blip/leotrans.git
cd leotrans/aplikacja/leo.app
npm install
# Skopiuj .env.local od kolegi (plik z kluczami Supabase)
npm run dev
# → http://localhost:5173
```

**Login testowy:** muststopx@gmail.com / LeoTrans2026!

## Pliki dokumentacji (folder xxx/)

| Plik | Opis |
|------|------|
| [PROJEKT_OPIS.md](PROJEKT_OPIS.md) | Pełny opis projektu — wizja, architektura, flow |
| [STATUS.md](STATUS.md) | Co zrobione, co do zrobienia, znane bugi |
| [SETUP_SRODOWISKO.md](SETUP_SRODOWISKO.md) | Jak skonfigurować środowisko deweloperskie |
| [BAZA_DANYCH.md](BAZA_DANYCH.md) | Schemat bazy danych, tabele, migracje |
| [PROGRAMY_FIRMOWE.md](PROGRAMY_FIRMOWE.md) | SpedTrans, formaty, opisy oprogramowania firmy |

## Stack w skrócie

```
Frontend:   React 19 + Vite + Tailwind CSS
Hosting:    home.pl FTP (serwer2657672.home.pl)
Baza:       Supabase PostgreSQL (projekt: zfpqoslxvzblzqkhrqyg)
Backend:    Supabase Edge Functions (Deno/TypeScript)
AI OCR:     Gemini 2.5 Flash (szybki, bez thinking)
AI Enrich:  Gemini 2.5 Flash (max thinking 24576 tokenów)
AI Msg:     Claude Haiku 4.5 (wiadomość dla kierowcy)
Email OTP:  Resend (domena leo-trans.pl — do weryfikacji w prod)
```
