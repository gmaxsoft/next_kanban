# Tickety — konfiguracja i użycie

System ticketów tworzy zgłoszenia z **przychodzących e-maili** (Resend Inbound / JSON webhook). Każdy zespół może mieć własną skrzynkę (np. `it@pwginfo.pl`, `hr@firma.pl`). Odpowiedzi z panelu idą do klienta przez Resend z numerem ticketu w temacie (`[T-101]`).

Dostęp do `/tickets` mają tylko konta **ADMINISTRATOR**.

---

## Szybki start

1. Ustaw zmienne w `.env` (patrz niżej).
2. Uruchom migracje: `npx prisma migrate deploy`.
3. W **Ustawienia → Zespoły** wpisz skrzynkę ticketów dla zespołu (np. `it@pwginfo.pl`).
4. Skonfiguruj webhook u dostawcy e-mail na URL:

   `https://TWOJA-DOMENA/api/webhooks/inbound-email`

5. Przetestuj lokalnie (sekcja „Test lokalny”).

---

## Zmienne środowiskowe

| Zmienna | Opis |
| --- | --- |
| `RESEND_API_KEY` | Klucz API Resend — potrzebny do **pobierania treści** maili Inbound oraz **wysyłki odpowiedzi** |
| `EMAIL_FROM` | Adres nadawcy odpowiedzi (zweryfikowana domena w Resend) |
| `RESEND_WEBHOOK_SECRET` | Signing secret webhooka Resend (nagłówki Svix: `svix-id`, `svix-timestamp`, `svix-signature`) |
| `INBOUND_EMAIL_WEBHOOK_SECRET` | Alternatywa / testy: `Authorization: Bearer …` lub nagłówek `x-webhook-secret` |
| `AUTH_URL` | Publiczny URL aplikacji (linki w mailach) |

Przykład w `.env`:

```env
RESEND_API_KEY="re_..."
EMAIL_FROM="Support <support@twoja-domena.pl>"
RESEND_WEBHOOK_SECRET="whsec_..."
INBOUND_EMAIL_WEBHOOK_SECRET="silny-losowy-sekret"
AUTH_URL="https://kanban.twoja-domena.pl"
```

**Bezpieczeństwo:** w produkcji ustaw przynajmniej jeden z sekretów (`RESEND_WEBHOOK_SECRET` lub `INBOUND_EMAIL_WEBHOOK_SECRET`). Bez nich weryfikacja działa tylko w `NODE_ENV=development` (z ostrzeżeniem w logach).

Endpoint webhooka jest **publiczny** (bez sesji Auth.js) — chroni go wyłącznie weryfikacja podpisu / sekretu.

---

## Mapowanie skrzynki → zespół

1. Zaloguj się jako ADMINISTRATOR.
2. Otwórz **Ustawienia → Zespoły**.
3. Przy tworzeniu / edycji zespołu uzupełnij pole **Skrzynka ticketów** pełnym adresem, np. `it@pwginfo.pl`.

Gdy przyjdzie mail na ten adres (pole `to` / `received_for` w payloadzie), nowy ticket dostanie ten zespół automatycznie. Lokalna część adresu (`it`) też jest dopasowywana, jeśli pełny adres się nie zgadza.

Możesz później zmienić zespół na stronie szczegółów ticketu — przed utworzeniem karty Kanban.

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
| `src/app/api/webhooks/inbound-email/route.ts` | Endpoint POST |
| `src/lib/inbound-email.ts` | Weryfikacja, normalizacja payloadu, ingest |
| `src/lib/tickets.ts` | Numery `[T-n]`, listy, kolumna To Do |
| `src/app/actions/tickets.ts` | Status, odpowiedź, notatka, create task |
| `src/app/(app)/tickets/` | UI listy i szczegółów |
| `prisma/schema.prisma` | modele `Ticket`, `TicketMessage`; `Team.inboundEmail` |

---

## Rozwiązywanie problemów

| Objaw | Co sprawdzić |
| --- | --- |
| `401 Unauthorized webhook` | Sekret / nagłówki Svix; raw body przy weryfikacji |
| Ticket bez treści | `RESEND_API_KEY` + dostęp do Receiving API |
| Ticket bez zespołu | `inboundEmail` w Ustawieniach zgodny z `to` |
| Odpowiedź nie dochodzi | `RESEND_API_KEY`, `EMAIL_FROM`, weryfikacja domeny |
| Brak menu Tickety | Konto bez roli ADMINISTRATOR |
| Duplikat nie tworzy drugiego ticketu | Ten sam `messageId` — zamierzone |
