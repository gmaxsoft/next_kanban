# Next Kanban

Tablica Kanban dla zespołu: konta (ADMINISTRATOR / Pracownik), tablice i zadania w MySQL, przeciąganie kart, komentarze z @wzmiankami, **tickety z e-maili przychodzących**, powiadomienia w aplikacji i e-mail oraz czat na żywo.

![Next Kanban — podgląd aplikacji](./screenshot.png)

## Technologie

| Warstwa | Stack |
| --- | --- |
| Aplikacja | **Next.js 16** (App Router), **React 19**, **TypeScript** |
| UI | **Tailwind CSS 4**, **shadcn/ui** (Base UI), **lucide-react**, **next-themes** |
| Edytor | **TipTap** + sanitizacja **isomorphic-dompurify** |
| Auth | **Auth.js (NextAuth v5)** — Credentials + JWT, adapter Prisma |
| Baza | **Prisma 6** + **MySQL / MariaDB** |
| Kanban DnD | **@dnd-kit** |
| E-mail / tickety | **Resend** (outbound + Inbound webhooks) + **react-email** |
| Czat | **Socket.io** (osobny proces Node.js) |
| Walidacja | **Zod 4** |

Główne ścieżki:

- `/` — pulpit (ADMIN: cały system; Pracownik: własne zadania i zespół)
- `/login` — logowanie
- `/settings` — zespoły (w tym skrzynka ticketów) i role (CRUD dla ADMINISTRATORA)
- `/tasks` — przegląd i przydzielanie zadań (tylko ADMINISTRATOR)
- `/tickets` — tickety z e-maili przychodzących (tylko ADMINISTRATOR)
- `/tickets/[id]` — wątek ticketu, odpowiedź e-mail, utworzenie karty Kanban
- `/boards` — lista tablic (tworzenie tylko ADMINISTRATOR; tablica należy do zespołu)
- `/boards/[id]` — tablica Kanban lub widok listy (dodawanie kart tylko ADMINISTRATOR)
- `/boards/[id]/tasks/[taskId]` — strona szczegółów zadania (opis WYSIWYG, assignee, komentarze, @wzmianki)
- `/chat` — czat w obrębie wybranego zespołu
- `/users` — lista zespołu (edycja: ADMINISTRATOR wszystkich, Pracownik tylko siebie)
- `/profile` — profil, zespół, zmiana hasła

Webhook / cron (publiczne, chronione sekretem — nie sesją Auth.js):

- `POST /api/webhooks/inbound-email` — przyjmowanie maili → Ticket / TicketMessage
- `GET|POST /api/cron/check-imap` — poll skrzynek IMAP zespołów (`Authorization: Bearer CRON_SECRET`)

### Tickety: webhook vs IMAP — gdzie login i hasło?

| Tryb | Login / hasło skrzynki | Co ustawić |
| --- | --- | --- |
| **Webhook** (Resend itd.) | **Nie** w Kanbanie | Sekret w `.env` + URL u dostawcy |
| **IMAP** | **Tak** — w panelu aplikacji | Ustawienia → Zespoły → tryb IMAP |

Przy **IMAP** podajesz host, port, TLS, użytkownika, hasło i folder (`INBOX`) przy edycji zespołu. Hasło trafia do bazy (`Team.imapPassword`); przy kolejnej edycji puste pole zostawia dotychczasowe hasło.

W `.env` dla IMAP jest tylko `CRON_SECRET` — to klucz Bearer do wywołania crona, **nie** hasło poczty. Cron woła `/api/cron/check-imap`, aplikacja loguje się danymi IMAP każdego zespołu, czyta maile **UNSEEN**, tworzy tickety i oznacza je jako przeczytane.

> Pełna instrukcja ticketów: **[docs/TICKETS.md](./docs/TICKETS.md)**

## Wymagania

- Node.js 20+
- MySQL lub MariaDB (np. na `localhost:3306`)
- npm

## Uruchomienie (development)

### 1. Zależności

```bash
npm install
```

### 2. Zmienne środowiskowe

Skopiuj `.env.example` do `.env` i uzupełnij dane:

```bash
copy .env.example .env
```

Najważniejsze pola:

```env
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/kanban_db"
AUTH_SECRET="wygeneruj: openssl rand -base64 32"
AUTH_URL="http://localhost:3000"

SEED_ADMIN_EMAIL="admin@kanban.local"
SEED_ADMIN_PASSWORD="ChangeMe123!"
SEED_ADMIN_NAME="Administrator"

# E-mail (Resend) — bez klucza UI działa, maile są pomijane
RESEND_API_KEY=""
EMAIL_FROM="Next Kanban <onboarding@resend.dev>"

# Tickety (inbound webhook) — szczegóły w docs/TICKETS.md
RESEND_WEBHOOK_SECRET=""
INBOUND_EMAIL_WEBHOOK_SECRET=""

# Cron IMAP — Bearer dla /api/cron/check-imap (nie hasło skrzynki!)
# Wygeneruj: openssl rand -base64 32
# Login/hasło IMAP: Ustawienia → Zespoły → tryb IMAP
CRON_SECRET=""

SOCKET_PORT="3001"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3001"

# Licencja instalacji — nazwa firmy na ekranie logowania
LICENSE_COMPANY_NAME="Nazwa Firmy Sp. z o.o."
LICENSE_VENDOR_NAME="MaxSoft.pl"
LICENSE_AUTHOR_NAME="MaxSoft.pl"
```

Utwórz bazę `kanban_db` (lub inną, zgodną z `DATABASE_URL`).

### 3. Migracje i konto ADMIN

```bash
npx prisma migrate deploy
npx prisma db seed
```

Seed tworzy m.in.:

- konto ADMINISTRATOR (`SEED_ADMIN_*`)
- zespoły (w tym Biuro) i przykładowych pracowników (w zależności od seeda)

Domyślne logowanie ADMIN:

- e-mail: `admin@kanban.local` (lub `SEED_ADMIN_EMAIL`)
- hasło: `ChangeMe123!` (lub `SEED_ADMIN_PASSWORD`)

### 4. Serwery deweloperskie

```bash
npm run dev
```

To startuje jednocześnie:

- Next.js — [http://localhost:3000](http://localhost:3000)
- Socket.io (czat) — [http://localhost:3001](http://localhost:3001)

Zaloguj się na `/login` danymi z seeda.

Tylko Next.js (bez czatu):

```bash
npm run dev:next
```

Tylko czat:

```bash
npm run chat
```

## Produkcja

```bash
npx prisma migrate deploy
npm run build
npm run start:all
```

`npm start` uruchamia sam Next.js. Czat wymaga osobnego procesu (`start:all` albo `tsx server/socket.ts`).

Dla ticketów: webhook Resend **albo** IMAP (dane skrzynki w zespole + cron z `CRON_SECRET`). Szczegóły: [docs/TICKETS.md](./docs/TICKETS.md).

## Przydatne skrypty

| Komenda | Opis |
| --- | --- |
| `npm run dev` | Next.js + Socket.io |
| `npm run build` | Build produkcyjny Next.js |
| `npm run lint` | ESLint |
| `npx prisma migrate deploy` | Aplikuje migracje |
| `npx prisma db seed` | Seed (role, zespoły, ADMIN, przykładowe dane) |
| `npx prisma studio` | Podgląd bazy |

## Co robi aplikacja

- **Role i zespoły** — ADMINISTRATOR zarządza tablicami, zadaniami, ticketami, użytkownikami, rolami i zespołami; Pracownik pracuje w swoim zakresie (bez dodawania kart / bez `/tasks` i `/tickets`).
- **Kanban** — widok tablicy i listy; przeciąganie zadań między kolumnami; filtry i paginacja list.
- **Szczegóły zadania** — dedykowana strona z opisem TipTap, assignee, terminem i komentarzami; `@imię` w komentarzu wysyła e-mail i tworzy powiadomienie w aplikacji.
- **Powiadomienia** — dzwonek w nagłówku (nieprzeczytane, oznaczanie jako przeczytane); także e-mail przy przypisaniu i komentarzu (Resend, wysyłka w tle).
- **Tickety** — webhook (sekrety w `.env`) lub IMAP (login/hasło skrzynki w **Ustawienia → Zespoły** + `CRON_SECRET` w `.env`) → zgłoszenia `[T-n]`; odpowiedź / notatka z `@imię` (powiadomienie); karta Kanban. Instrukcja: [docs/TICKETS.md](./docs/TICKETS.md).
- **Wyszukiwanie** — pole w nagłówku szuka tablic i zadań (wyniki zależne od roli).
- **Pulpit** — ADMIN widzi statystyki całego systemu; Pracownik — własne zadania i skróty zespołu.
- **Czat** — historia w MySQL, WebSocket, status Online/Offline.

## Struktura (skrót)

```
docs/TICKETS.md         konfiguracja i użycie ticketów
prisma/                 schemat i migracje (Notification, Ticket, …)
server/socket.ts        lekki serwer Socket.io
src/app/                App Router, Server Actions, API
src/app/api/webhooks/   inbound e-mail → tickety
src/app/(app)/tickets/  lista i szczegóły ticketów
src/app/(app)/boards/[boardId]/tasks/[taskId]/  szczegóły zadania
src/components/         UI (Kanban, tickety, czat, layout, …)
src/emails/             szablony React Email
src/lib/                Prisma, auth, mail, inbound-email, tickets, …
```

## Dokumentacja

| Dokument | Opis |
| --- | --- |
| [README.md](./README.md) | Uruchomienie aplikacji, stack, skrót funkcji |
| [docs/TICKETS.md](./docs/TICKETS.md) | Tickety: webhook, IMAP, skrzynki zespołów, panel |
| [docs/TESTING.md](./docs/TESTING.md) | Testy jednostkowe, integracyjne i E2E (Playwright) |
