# Tickety — konfiguracja i użycie

System ticketów tworzy zgłoszenia z **przychodzących e-maili**. Dostępne są **dwie metody odbioru**, które korzystają z tej samej warstwy serwisowej `processIncomingEmail`:

1. **Webhook** — `POST /api/webhooks/inbound-email` (Resend Inbound / JSON)
2. **IMAP** — `GET|POST /api/cron/check-imap` (poll skrzynek zespołów z `inboundType=IMAP`)

Każdy zespół może mieć własną skrzynkę (np. `it@pwginfo.pl`). Odpowiedzi z panelu idą do klienta przez Resend z numerem ticketu w temacie (`[T-101]`).

Dostęp do `/tickets` mają tylko konta **ADMINISTRATOR**.

---

## Szybki start

1. Ustaw zmienne w `.env` (patrz niżej).
2. Uruchom migracje: `npx prisma migrate deploy`.
3. W **Ustawienia → Zespoły** wybierz tryb **Webhook** lub **IMAP** i uzupełnij skrzynkę / dane IMAP.
4. Dla webhooka skonfiguruj URL u dostawcy:

   `https://TWOJA-DOMENA/api/webhooks/inbound-email`

5. Dla IMAP ustaw cron na:

   `https://TWOJA-DOMENA/api/cron/check-imap`  
   z nagłówkiem `Authorization: Bearer CRON_SECRET`

6. Przetestuj lokalnie (sekcje „Test lokalny” / „Test IMAP”).

---

## Zmienne środowiskowe

| Zmienna | Opis |
| --- | --- |
| `RESEND_API_KEY` | Klucz API Resend — treść Inbound + wysyłka odpowiedzi |
| `EMAIL_FROM` | Adres nadawcy odpowiedzi |
| `RESEND_WEBHOOK_SECRET` | Signing secret webhooka Resend (Svix) |
| `INBOUND_EMAIL_WEBHOOK_SECRET` | Bearer / `x-webhook-secret` dla prostego JSON |
| `CRON_SECRET` | Bearer dla `/api/cron/check-imap` |
| `AUTH_URL` | Publiczny URL aplikacji |

```env
RESEND_API_KEY="re_..."
EMAIL_FROM="Support <support@twoja-domena.pl>"
RESEND_WEBHOOK_SECRET="whsec_..."
INBOUND_EMAIL_WEBHOOK_SECRET="silny-losowy-sekret"
CRON_SECRET="silny-losowy-cron-sekret"
AUTH_URL="https://kanban.twoja-domena.pl"
```

**Bezpieczeństwo:** w produkcji ustaw sekrety. Webhook i cron są poza sesją Auth.js — chroni je wyłącznie Bearer / podpis Svix.

---

## Wspólna logika (`processIncomingEmail`)

Plik: `src/lib/inbound-email.ts`

Obie ścieżki (webhook i IMAP) normalizują e-mail do obiektu:

- `fromEmail`, `fromName`
- `toAddresses`
- `subject`, `text`, `html`
- `messageId` / `externalId` (deduplikacja)

Następnie wywołują `processIncomingEmail(...)`, która:

- tworzy nowy ticket albo dopina wiadomość do wątku `[T-n]`,
- pomija duplikaty po `Message-ID`,
- opcjonalnie ustawia `preferredTeamId` (IMAP zawsze przypina zespół właściciela skrzynki).

---

## Mapowanie skrzynki → zespół

1. Zaloguj się jako ADMINISTRATOR.
2. **Ustawienia → Zespoły** → utwórz / edytuj zespół.
3. Uzupełnij **Skrzynka ticketów** oraz **Tryb odbioru**:
   - **Webhook** — maile trafiają przez Resend/JSON na wspólny endpoint; zespół wybierany po adresie `to`.
   - **IMAP** — podaj host, port, użytkownika, hasło, TLS, folder (`INBOX`); cron odpytuje tylko te zespoły.

---

## Konfiguracja IMAP + cron

1. W zespole ustaw `inboundType = IMAP` i dane dostępowe.
2. Ustaw `CRON_SECRET` w `.env`.
3. Wywołuj okresowo (co 1–5 minut):

```bash
curl -X POST "https://TWOJA-DOMENA/api/cron/check-imap" ^
  -H "Authorization: Bearer TWOJ_CRON_SECRET"
```

Endpoint:

- łączy się przez **imapflow** ze wszystkimi zespołami IMAP,
- pobiera **UNSEEN**,
- parsuje treść (**mailparser**),
- woła `processIncomingEmail`,
- oznacza mail jako **`\Seen`** po sukcesie,
- zawsze wywołuje `client.logout()` (zamyka socket).

Przykład crona systemowego:

```cron
*/2 * * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://TWOJA-DOMENA/api/cron/check-imap
```

Vercel Cron (jeśli hostujesz na Vercel) — dodaj job wskazujący na ten URL i przekaż sekret w nagłówku zgodnie z dokumentacją platformy.

### Test IMAP lokalnie

```bash
curl -X POST http://localhost:3000/api/cron/check-imap ^
  -H "Authorization: Bearer TWOJ_CRON_SECRET"
```

Oczekiwana odpowiedź:

```json
{
  "ok": true,
  "totals": { "teams": 1, "fetched": 2, "created": 1, "appended": 1, "duplicates": 0, "errors": 0 },
  "mailboxes": [ ... ]
}
```

---

## Konfiguracja Resend Inbound

1. W panelu Resend włącz **Receiving** dla domeny / adresu.
2. **Webhooks → Add Webhook**
   - URL: `https://TWOJA-DOMENA/api/webhooks/inbound-email`
   - Event: `email.received`
3. Skopiuj **signing secret** do `RESEND_WEBHOOK_SECRET`.
4. Upewnij się, że `RESEND_API_KEY` ma uprawnienia do odczytu received emails — webhook Resend zawiera tylko metadane; aplikacja dociąga treść przez `emails.receiving.get(email_id)`.

Przekieruj skrzynki zespołów (MX / forward) na adresy Inbound Resend albo użyj aliasów domeny podpiętej w Resend.

---

## Format webhooka (JSON)

### A) Resend — event `email.received`

Aplikacja rozpoznaje payload z `type: "email.received"` i polem `data` (`from`, `to`, `subject`, `message_id`, `email_id`, …). Treść HTML/text pobierana jest z API Resend.

### B) Prosty JSON (testy / inny provider)

```json
{
  "from": "Klient <klient@example.com>",
  "to": ["it@pwginfo.pl"],
  "subject": "Problem z serwerem",
  "text": "Serwer nie odpowiada od rana.",
  "html": "<p>Serwer nie odpowiada od rana.</p>",
  "messageId": "<unikalne-id@example.com>"
}
```

Nagłówki (jeden z wariantów):

```http
x-webhook-secret: silny-losowy-sekret
```

lub

```http
Authorization: Bearer silny-losowy-sekret
```

---

## Numeracja i wątki

- Numery zaczynają się od **T-100** (autoincrement w bazie).
- Nowy mail **bez** `[T-123]` w temacie → nowy ticket.
- Mail z tematem zawierającym `[T-123]` (np. `Re: [T-123] Problem…`) → wiadomość dopisywana do istniejącego ticketu.
- Duplikaty po `messageId` / `email_id` są ignorowane (idempotencja).

Statusy: `Open` · `In Progress` · `Resolved`. Odpowiedź e-mail lub nowe inbound po Resolved zwykle wraca ticket do pracy (Open / In Progress).

---

## Praca w panelu

### Lista — `/tickets`

- Kolumny: ID, temat, nadawca, zespół, status, data przybycia.
- Filtry: status, zespół, wyszukiwanie (temat, e-mail, `T-101`).

### Szczegóły — `/tickets/[id]`

| Akcja | Opis |
| --- | --- |
| Historia | E-maile inbound, odpowiedzi outbound, notatki wewnętrzne |
| Zmień status | Open / In Progress / Resolved |
| Zapisz zespół | Ręczny wybór zespołu (nadpisuje auto-mapowanie) |
| Utwórz zadanie na tablicy Kanban | Karta w kolumnie „Do zrobienia” / „To Do” / pierwszej kolumnie; tytuł `[T-101] …`; link ticket ↔ task |
| Wyślij e-mail | Odpowiedź do nadawcy; temat `Re: [T-101] …`; wymaga `RESEND_API_KEY` |
| Notatka wewnętrzna | Tylko w panelu, bez maila |

---

## Test lokalny

Z uruchomionym `npm run dev`:

```bash
curl -X POST http://localhost:3000/api/webhooks/inbound-email ^
  -H "Content-Type: application/json" ^
  -H "x-webhook-secret: TWOJ_INBOUND_EMAIL_WEBHOOK_SECRET" ^
  -d "{\"from\":\"klient@example.com\",\"to\":[\"it@pwginfo.pl\"],\"subject\":\"Test\",\"text\":\"Treść testowa\",\"messageId\":\"<local-test-1@example.com>\"}"
```

Oczekiwana odpowiedź:

```json
{ "ok": true, "created": true, "ticketId": "...", "displayId": "T-101" }
```

Dopisanie do wątku:

```bash
curl -X POST http://localhost:3000/api/webhooks/inbound-email ^
  -H "Content-Type: application/json" ^
  -H "x-webhook-secret: TWOJ_INBOUND_EMAIL_WEBHOOK_SECRET" ^
  -d "{\"from\":\"klient@example.com\",\"to\":[\"it@pwginfo.pl\"],\"subject\":\"Re: [T-101] Test\",\"text\":\"Kolejna wiadomość\",\"messageId\":\"<local-test-2@example.com>\"}"
```

Na Windows PowerShell możesz użyć `Invoke-WebRequest` zamiast `curl`.

Do testów z internetu (Resend → localhost) użyj tunelu (ngrok, Cloudflare Tunnel) i podaj publiczny URL webhooka.

---

## Pliki w kodzie

| Ścieżka | Rola |
| --- | --- |
| `src/lib/inbound-email.ts` | `processIncomingEmail`, normalizacja, weryfikacja webhooka |
| `src/lib/imap-inbox.ts` | Poll IMAP (imapflow + mailparser) |
| `src/app/api/webhooks/inbound-email/route.ts` | Webhook POST |
| `src/app/api/cron/check-imap/route.ts` | Cron IMAP |
| `src/lib/tickets.ts` | Numery `[T-n]`, listy, kolumna To Do |
| `src/app/actions/tickets.ts` | Status, odpowiedź, notatka, create task |
| `src/app/(app)/tickets/` | UI listy i szczegółów |
| `prisma/schema.prisma` | `Ticket`, `Team.inboundType`, pola IMAP |

---

## Rozwiązywanie problemów

| Objaw | Co sprawdzić |
| --- | --- |
| `401 Unauthorized webhook` | Sekret / nagłówki Svix; raw body przy weryfikacji |
| `401` na `/api/cron/check-imap` | `Authorization: Bearer CRON_SECRET` |
| Ticket bez treści (Resend) | `RESEND_API_KEY` + Receiving API |
| IMAP: 0 fetched | `inboundType=IMAP`, host/user/hasło, folder, UNSEEN |
| IMAP: błędy połączenia | port/TLS, firewall, app password |
| Ticket bez zespołu (webhook) | `inboundEmail` zgodny z `to` |
| Odpowiedź nie dochodzi | `RESEND_API_KEY`, `EMAIL_FROM`, domena |
| Duplikat nie tworzy drugiego ticketu | Ten sam `Message-ID` — zamierzone |
