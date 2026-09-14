# Next Kanban

Tablica Kanban dla zespołu: konta (ADMINISTRATOR / Pracownik), tablice i zadania w MySQL, przeciąganie kart, komentarze, powiadomienia e-mail i czat na żywo.

## Technologie

| Warstwa | Stack |
| --- | --- |
| Aplikacja | **Next.js 16** (App Router), **React 19**, **TypeScript** |
| UI | **Tailwind CSS 4**, **shadcn/ui** (Base UI), **lucide-react**, **next-themes** |
| Auth | **Auth.js (NextAuth v5)** — Credentials + JWT, adapter Prisma |
| Baza | **Prisma 6** + **MySQL / MariaDB** |
| Kanban DnD | **@dnd-kit** |
| E-mail | **Resend** + szablony **react-email** |
| Czat | **Socket.io** (osobny proces Node.js) |
| Walidacja | **Zod 4** |

Główne ścieżki:

- `/` — pulpit
- `/login` — logowanie
- `/settings` — zespoły i role (CRUD dla ADMINISTRATORA)
- `/tasks` — przydzielanie zadań załodze (tylko ADMINISTRATOR)
- `/boards` — lista tablic (tworzenie tylko ADMINISTRATOR)
- `/boards/[id]` — tablica Kanban (dodawanie kart tylko ADMINISTRATOR)
- `/chat` — czat w obrębie wybranego zespołu
- `/users` — lista zespołu (edycja: ADMINISTRATOR wszystkich, Pracownik tylko siebie)
- `/profile` — profil, zespół, zmiana hasła

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

# Opcjonalnie — bez klucza maile są pomijane, UI działa
RESEND_API_KEY=""
EMAIL_FROM="Next Kanban <onboarding@resend.dev>"

SOCKET_PORT="3001"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3001"
```

Utwórz bazę `kanban_db` (lub inną, zgodną z `DATABASE_URL`).

### 3. Migracje i konto ADMIN

```bash
npx prisma migrate deploy
npx prisma db seed
```

Seed tworzy konto:

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

## Przydatne skrypty

| Komenda | Opis |
| --- | --- |
| `npm run dev` | Next.js + Socket.io |
| `npm run build` | Build produkcyjny Next.js |
| `npm run lint` | ESLint |
| `npx prisma migrate deploy` | Aplikuje migracje |
| `npx prisma db seed` | Konto ADMIN |
| `npx prisma studio` | Podgląd bazy |

## Co robi aplikacja

- **Role** — ADMINISTRATOR tworzy tablice, przydziela zadania załodze i konta; Pracownik pracuje na tablicach (bez dodawania kart).
- **Kanban** — przeciąganie zadań między kolumnami i w kolumnie; stan (`columnId`, `order`) zapisuje Server Action.
- **Zadania** — `/tasks`: status (kolumna), wielu assignee, termin; panel szczegółów i filtry na tablicy.
- **E-mail** — powiadomienie przy przypisaniu do zadania i przy komentarzu (wysyłka w tle przez `after()`).
- **Czat** — historia z MySQL, nowe wiadomości przez WebSocket, status Online/Offline z aktywnych połączeń.

## Struktura (skrót)

```
prisma/           schemat i migracje
server/socket.ts  lekki serwer Socket.io
src/app/          App Router, Server Actions, API
src/components/   UI (Kanban, czat, layout)
src/emails/       szablony React Email
src/lib/          Prisma, auth, mail, czat
```
