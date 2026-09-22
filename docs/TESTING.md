# Testy

## Jednostkowe i integracyjne (Vitest)

```bash
npm test                 # wszystkie (unit + integration)
npm run test:unit
npm run test:integration
npm run test:watch
```

- `tests/unit/` — helpery (tickety, licencja, sesja/remember-me, list-query, auth webhook)
- `tests/integration/` — `processIncomingEmail` oraz Route Handlery (z mockami Prisma/IMAP)

## E2E (Playwright)

```bash
npm run test:e2e
```

Playwright sam startuje `npm run dev:next` (albo używa już działającego serwera poza CI) i ładuje `.env`.

### Logowanie admina

Używane są (w tej kolejności) `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD`, a gdy ich brak — `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` z `.env`.

```bash
# PowerShell (opcjonalnie nadpisz seed)
$env:E2E_ADMIN_EMAIL="admin@example.com"
$env:E2E_ADMIN_PASSWORD="haslo"
npm run test:e2e
```

Bez tych zmiennych testy `authenticated.spec.ts` i `admin-crud.spec.ts` są pomijane.

### Pokrycie E2E admina (`admin-crud.spec.ts`)

- logowanie z „Zapamiętaj mnie”
- utworzenie użytkownika
- utworzenie tablicy, dodanie zadania, edycja na tablicy
- utworzenie ticketu przez webhook inbound (`INBOUND_EMAIL_WEBHOOK_SECRET`) i zmiana statusu
