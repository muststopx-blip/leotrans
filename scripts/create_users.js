// ============================================================
// LEOTRANS - Skrypt tworzenia użytkowników w Supabase
// Uruchomienie: node create_users.js
// Wymaga: node >= 18, dostępu do internetu
//
// Przed uruchomieniem:
//   1. Wstaw SERVICE_ROLE_KEY z Supabase Dashboard → Settings → API
//   2. Popraw email Dobrosławy Adamczewskiej (duplikat w arkuszu!)
//   3. Opcjonalnie zmień DEFAULT_PASSWORD
// ============================================================

const SUPABASE_URL = 'https://zfpqoslxvzblzqkhrqyg.supabase.co'
const SERVICE_ROLE_KEY = 'WSTAW_SERVICE_ROLE_KEY_TUTAJ'  // ← zmień!
const DEFAULT_PASSWORD = 'LeoTrans2026!'

// ============================================================
// STOŁY (5 grup roboczych)
// ============================================================
const STOLY = [
  { nazwa: 'Stół 1', skrot: 'S1' },
  { nazwa: 'Stół 2', skrot: 'S2' },
  { nazwa: 'Stół 3', skrot: 'S3' },
  { nazwa: 'Stół 4', skrot: 'S4' },
  { nazwa: 'Stół 5', skrot: 'S5' },
]

// ============================================================
// UŻYTKOWNICY
// stol: null = solo/admin (brak stołu), '1'-'5' = numer stołu
// rola: 'admin' | 'spedytor'
// ============================================================
const USERS = [
  // ADMINI (widzą wszystkie zlecenia)
  { imie_nazwisko: 'Olga Trafas',              email: 'olga@leo-trans.pl',        stol: null, rola: 'admin',    inicjaly: 'OT'  },
  { imie_nazwisko: 'Andrzej Trill',            email: 'andrzej.t@leo-trans.pl',   stol: null, rola: 'admin',    inicjaly: 'AT'  },
  { imie_nazwisko: 'Kamila Matysek',           email: 'kamila.m@leo-trans.pl',    stol: null, rola: 'admin',    inicjaly: 'KM'  },
  { imie_nazwisko: 'Julka Nowak',              email: 'julia.n@leo-trans.pl',     stol: null, rola: 'admin',    inicjaly: 'JN'  },
  { imie_nazwisko: 'Jakub Falkowski',          email: 'jakub.f@leo-trans.pl',     stol: null, rola: 'admin',    inicjaly: 'JF'  },

  // STÓŁ 1
  { imie_nazwisko: 'Filip Kukiełka',           email: 'filip.k@leo-trans.pl',     stol: '1',  rola: 'spedytor', inicjaly: 'FK'  },
  { imie_nazwisko: 'Dymytro Usanov',           email: 'dmytro@leo-trans.pl',      stol: '1',  rola: 'spedytor', inicjaly: 'DU'  },
  { imie_nazwisko: 'Mateusz Szypa',            email: 'mateusz.sz@leo-trans.pl',  stol: '1',  rola: 'spedytor', inicjaly: 'MS'  },

  // STÓŁ 2
  { imie_nazwisko: 'Oliwia Karolewska',        email: 'oliwia.k@leo-trans.pl',    stol: '2',  rola: 'spedytor', inicjaly: 'OK'  },
  { imie_nazwisko: 'Małgorzata Koziarek',      email: 'gosia@leo-trans.pl',       stol: '2',  rola: 'spedytor', inicjaly: 'MK'  },
  { imie_nazwisko: 'Ewelina Kucharczyk',       email: 'ewelina.k@leo-trans.pl',   stol: '2',  rola: 'spedytor', inicjaly: 'EK'  },

  // STÓŁ 3
  { imie_nazwisko: 'Karolina Chmielarz',       email: 'karolina.b@leo-trans.pl',  stol: '3',  rola: 'spedytor', inicjaly: 'KCh' },
  { imie_nazwisko: 'Donata Jankowska',         email: 'donata.j@leo-trans.pl',    stol: '3',  rola: 'spedytor', inicjaly: 'DJ'  },
  // UWAGA: Dobrosława ma ten sam email co Donata w arkuszu — zmień na prawidłowy!
  { imie_nazwisko: 'Dobrosława Adamczewska',   email: 'dob.a@leo-trans.pl',       stol: '3',  rola: 'spedytor', inicjaly: 'DA'  },

  // STÓŁ 4
  { imie_nazwisko: 'Kasia Poradzisz',          email: 'kasia.p@leo-trans.pl',     stol: '4',  rola: 'spedytor', inicjaly: 'KP'  },
  { imie_nazwisko: 'Justyna Woźniak',          email: 'justyna.w@leo-trans.pl',   stol: '4',  rola: 'spedytor', inicjaly: 'JW'  },
  { imie_nazwisko: 'Agata Walaszczyk',         email: 'agata.w@leo-trans.pl',     stol: '4',  rola: 'spedytor', inicjaly: 'AgW' },

  // STÓŁ 5
  { imie_nazwisko: 'Karolina Kobusińska',      email: 'karolina.k@leo-trans.pl',  stol: '5',  rola: 'spedytor', inicjaly: 'KK'  },
  { imie_nazwisko: 'Beata Szabarowska',        email: 'beata.sz@leo-trans.pl',    stol: '5',  rola: 'spedytor', inicjaly: 'BS'  },
  { imie_nazwisko: 'Małgorzata Astramowicz',   email: 'gosia.k@leo-trans.pl',     stol: '5',  rola: 'spedytor', inicjaly: 'MA'  },

  // SOLO
  { imie_nazwisko: 'Małgorzata Romatowska',    email: 'gosia.r@leo-trans.pl',     stol: null, rola: 'spedytor', inicjaly: 'MR'  },
  { imie_nazwisko: 'Magda Grzegorzewicz',      email: 'magda.g@leo-trans.pl',     stol: null, rola: 'spedytor', inicjaly: 'MG'  },
  { imie_nazwisko: 'Marcin Janiak',            email: 'marcin.j@leo-trans.pl',    stol: null, rola: 'spedytor', inicjaly: 'MJ'  },
  { imie_nazwisko: 'Kamil Dziuba',             email: 'kamil.d@leo-trans.pl',     stol: null, rola: 'spedytor', inicjaly: 'KD'  },
  { imie_nazwisko: 'Halyna Hudyma',            email: 'halyna.h@leo-trans.pl',    stol: null, rola: 'spedytor', inicjaly: 'HH'  },
  { imie_nazwisko: 'Raman Ramusik',            email: 'raman.r@leo-trans.pl',     stol: null, rola: 'spedytor', inicjaly: 'RaR' },
  { imie_nazwisko: 'Asia Jędrzejek',           email: 'asia.j@leo-trans.pl',      stol: null, rola: 'spedytor', inicjaly: 'AJ'  },
  { imie_nazwisko: 'Artur Wojciechowski',      email: 'artur.w@leo-trans.pl',     stol: null, rola: 'spedytor', inicjaly: 'AW'  },
]

// ============================================================
async function apiFetch(path, body) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
    },
    body: JSON.stringify(body),
  })
  return res.json()
}

async function dbQuery(table, body, method = 'POST') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(body),
  })
  return res.json()
}

async function main() {
  if (SERVICE_ROLE_KEY === 'WSTAW_SERVICE_ROLE_KEY_TUTAJ') {
    console.error('❌ Wstaw SERVICE_ROLE_KEY z Supabase Dashboard → Settings → API')
    process.exit(1)
  }

  console.log('🚀 LEOTRANS - Tworzenie użytkowników\n')

  // 1. Utwórz stoły
  console.log('📋 Tworzenie stołów...')
  const stolMap = {}
  for (const stol of STOLY) {
    const result = await dbQuery('stoly', stol)
    if (Array.isArray(result) && result[0]?.id) {
      stolMap[stol.skrot.replace('S', '')] = result[0].id
      console.log(`  ✓ ${stol.nazwa} → ${result[0].id}`)
    } else {
      // Pobierz istniejące
      const existing = await fetch(`${SUPABASE_URL}/rest/v1/stoly?skrot=eq.${stol.skrot}`, {
        headers: { 'Authorization': `Bearer ${SERVICE_ROLE_KEY}`, 'apikey': SERVICE_ROLE_KEY }
      }).then(r => r.json())
      if (existing[0]) {
        stolMap[stol.skrot.replace('S', '')] = existing[0].id
        console.log(`  ↩ ${stol.nazwa} już istnieje → ${existing[0].id}`)
      } else {
        console.log(`  ✗ ${stol.nazwa}: ${JSON.stringify(result)}`)
      }
    }
  }

  // 2. Utwórz użytkowników
  console.log('\n👥 Tworzenie użytkowników...')
  const results = { ok: [], failed: [] }

  for (const user of USERS) {
    process.stdout.write(`  ${user.inicjaly.padEnd(4)} ${user.imie_nazwisko.padEnd(30)} `)

    // Utwórz w Auth
    const authResult = await apiFetch('/auth/v1/admin/users', {
      email: user.email,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: {
        imie_nazwisko: user.imie_nazwisko,
        inicjaly: user.inicjaly,
      }
    })

    if (authResult.error) {
      console.log(`✗ ${authResult.error.message || JSON.stringify(authResult.error)}`)
      results.failed.push({ ...user, error: authResult.error.message })
      continue
    }

    const userId = authResult.id
    const stolId = user.stol ? stolMap[user.stol] : null

    // Zaktualizuj profil (tworzony automatycznie przez trigger)
    await fetch(`${SUPABASE_URL}/rest/v1/profile?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        imie_nazwisko: user.imie_nazwisko,
        inicjaly: user.inicjaly,
        rola: user.rola,
        stol_id: stolId || null,
      })
    })

    console.log(`✓ ${userId.substring(0, 8)}...`)
    results.ok.push(user)
  }

  // Podsumowanie
  console.log(`\n✅ Utworzono: ${results.ok.length}/${USERS.length} użytkowników`)
  if (results.failed.length > 0) {
    console.log(`\n❌ Błędy (${results.failed.length}):`)
    results.failed.forEach(u => console.log(`  - ${u.imie_nazwisko} (${u.email}): ${u.error}`))
  }

  console.log(`\n🔑 Hasło startowe dla wszystkich: ${DEFAULT_PASSWORD}`)
  console.log('   Użytkownicy powinni zmienić hasło po pierwszym logowaniu.')
}

main().catch(console.error)
