# Next Kanban

Tablica Kanban dla zespołu: konta (ADMINISTRATOR / Pracownik), tablice i zadania w MySQL, przeciąganie kart, komentarze z @wzmiankami, powiadomienia w aplikacji i e-mail oraz czat na żywo.

## Technologie

| Warstwa | Stack |
| --- | --- |
| Aplikacja | **Next.js 16** (App Router), **React 19**, **TypeScript** |
| UI | **Tailwind CSS 4**, **shadcn/ui** (Base UI), **lucide-react**, **next-themes** |
| Edytor | **TipTap** + sanitizacja **isomorphic-dompurify** |
| Auth | **Auth.js (NextAuth v5)** — Credentials + JWT, adapter Prisma |
| Baza | **Prisma 6** + **MySQL / MariaDB** |
| Kanban DnD | **@dnd-kit** |
| E-mail | **Resend** + szablony **react-email** |
| Czat | **Socket.io** (osobny proces Node.js) |
| Walidacja | **Zod 4** |

Główne ścieżki:

- `/` — pulpit (ADMIN: cały system; Pracownik: własne zadania i zespół)
- `/login` — logowanie
- `/settings` — zespoły i role (CRUD dla ADMINISTRATORA)
- `/tasks` — przegląd i przydzielanie zadań (tylko ADMINISTRATOR)
- `/boards` — lista tablic (tworzenie tylko ADMINISTRATOR; tablica należy do zespołu)
- `/boards/[id]` — tablica Kanban lub widok listy (dodawanie kart tylko ADMINISTRATOR)
- `/boards/[id]/tasks/[taskId]` — strona szczegółów zadania (opis WYSIWYG, assignee, komentarze, @wzmianki)
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

- **Role i zespoły** — ADMINISTRATOR zarządza tablicami, zadaniami, użytkownikami, rolami i zespołami; Pracownik pracuje w swoim zakresie (bez dodawania kart / bez `/tasks`).
- **Kanban** — widok tablicy i listy; przeciąganie zadań między kolumnami; filtry i paginacja list.
- **Szczegóły zadania** — dedykowana strona z opisem TipTap, assignee, terminem i komentarzami; `@imię` w komentarzu wysyła e-mail i tworzy powiadomienie w aplikacji.
- **Powiadomienia** — dzwonek w nagłówku (nieprzeczytane, oznaczanie jako przeczytane); także e-mail przy przypisaniu i komentarzu (Resend, wysyłka w tle).
- **Wyszukiwanie** — pole w nagłówku szuka tablic i zadań (wyniki zależne od roli).
- **Pulpit** — ADMIN widzi statystyki całego systemu; Pracownik — własne zadania i skróty zespołu.
- **Czat** — historia w MySQL, WebSocket, status Online/Offline.

## Struktura (skrót)

```
prisma/                 schemat i migracje (m.in. Notification)
server/socket.ts        lekki serwer Socket.io
src/app/                App Router, Server Actions, API
src/app/(app)/boards/[boardId]/tasks/[taskId]/  szczegóły zadania
src/components/         UI (Kanban, czat, layout, powiadomienia, wyszukiwarka)
src/emails/             szablony React Email
src/lib/                Prisma, auth, mail, mentions, notifications, czat
```
