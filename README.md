# 🎬 Cinema Ticket Booking System — Frontend

*[ภาษาไทย](./README.th.md)*

Vue 3 (Composition API) frontend for an online cinema ticket booking system. Handles
customer-facing browsing/booking as well as a separate admin panel, and talks to a
Go backend over REST + WebSocket.

This repo is **frontend only**. Backend (Go, MongoDB, Redis distributed lock,
message queue) lives in a separate repository.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Vue 3 (`<script setup>`, Composition API) |
| Routing | Vue Router 5 (hash history) |
| HTTP | Axios |
| Styling | Tailwind CSS 4 + daisyUI |
| Realtime | Native WebSocket |
| Auth | Email/password (JWT) + Google Identity Services (Google Sign-In) |
| Build | Vite |
| Deployment | Docker multi-stage build → nginx |

## Project Structure

```
src/
├── main.js                   # App entry, mounts router
├── router/index.js           # Routes + auth/role navigation guards
├── lib/http.js                # Axios instances (user + admin), token injection, 401 handling
├── composables/
│   ├── useGoogleAuth.js       # Loads Google Identity Services script, renders sign-in button
│   └── useSeatSocket.js       # WebSocket client for live seat-map updates
│
├── UserPage/                  # Customer-facing app
│   ├── mainPage/               # Layout shell (navbar + footer + <router-view>)
│   ├── navBar/, footer/
│   ├── loginPage/               # login.vue, register.vue
│   ├── homePage/                # Movie list
│   ├── showtimesPage/           # Showtimes for a movie
│   ├── seatsPage/                # Seat map, seat locking, real-time updates
│   ├── bookingConfirmPage/        # Review + confirm booking
│   ├── myTicketPage/             # User's booking history
│   └── profilePage/
│
└── AdminPage/                  # Admin panel (separate session from user side)
    ├── mainPage/                 # Sidebar layout shell
    ├── loginPage/                  # login.vue, logout.vue
    ├── homePage/                   # Dashboard
    ├── moviesPage/, showtimesPage/, usersPage/
    ├── bookingsPage/                # All bookings, filterable
    └── auditLogsPage/                # System event log, filterable
```

## Authentication & Sessions

Two independent sessions are kept in `localStorage`, each with its own Axios
instance (`http` and `adminHttp` in `src/lib/http.js`):

| | Storage keys | Axios client |
|---|---|---|
| User | `token`, `user` | `http` |
| Admin | `admin_token`, `admin_user` | `adminHttp` |

- Login (`/auth/login`) and Google Sign-In both return a JWT + user object
  (including `role`). The JWT is attached as `Authorization: Bearer <token>`
  on every request via an Axios request interceptor.
- A response interceptor watches for `401` on either client: it clears that
  session's storage and redirects to the matching login page
  (`/login` or `/admin/login`).
- **Role enforcement is done by the backend** (`RequireRole(ADMIN)` on admin
  endpoints) — the frontend router guard only checks the locally-stored
  `role` to avoid rendering admin screens for non-admins. It is a UX gate,
  not a security boundary; a user who bypasses it still gets a `403` from
  the API.

### Google Sign-In

`useGoogleAuth.js` lazily loads the Google Identity Services script and
renders the official button. Requires `VITE_GOOGLE_CLIENT_ID` — without it,
the button silently doesn't render (logged as a console warning) and
email/password login still works.

## Booking Flow (Seats Page)

`src/UserPage/seatsPage/index.vue` is the core interactive piece:

1. On mount, fetches the seat map (`GET /showtimes/:id/seats`) and opens a
   WebSocket (`connectSeatSocket`, see `useSeatSocket.js`) scoped to that
   showtime.
2. Tapping an `AVAILABLE` seat calls `POST /seats/:id/lock`; tapping a seat
   the user already holds calls `POST /seats/:id/unlock`. A `409` response
   means someone else grabbed it first — the seat map self-corrects via the
   next WebSocket broadcast.
3. A client-side countdown mirrors the backend's 5-minute lock TTL
   (`LOCK_TTL_SECONDS`). When it hits zero the local selection is cleared
   and the user is shown a "hold expired" notice.
4. Any locked-but-unconfirmed seats are released (`POST /seats/:id/unlock`)
   if the user navigates away without confirming (`onBeforeUnmount`).
5. Selected seats + showtime are handed off via `sessionStorage` to
   `bookingConfirmPage`, which calls `POST /bookings/confirm` to finalize.
6. WebSocket messages (`{ seat_id, status }`) update any seat in the map in
   real time — including seats the current user doesn't hold — so all
   viewers of the same showtime stay in sync.

## Admin Panel

- Separate login (`/admin/login`), separate session/localStorage keys,
  separate sidebar layout (`AdminPage/mainPage`).
- **Bookings** (`/admin/bookings`): all bookings, filterable by user ID,
  showtime ID, status, and date range.
- **Audit Logs** (`/admin/audit-logs`): system events (`BOOKING_SUCCESS`,
  `BOOKING_TIMEOUT`, `SEAT_RELEASED`, `SYSTEM_ERROR`), filterable by user ID
  and event type.
- Movies / Showtimes / Users pages for basic CRUD/listing.

## Environment Variables

None are committed (`.env` is gitignored). Create a `.env` file at the repo
root with:

```
VITE_API_BASE_URL=http://localhost:8080   # Go backend base URL (REST + WS)
VITE_GOOGLE_CLIENT_ID=<your-google-oauth-client-id>
```

Both are read via `import.meta.env.*`. `VITE_API_BASE_URL` falls back to
`http://localhost:8080` if unset; `VITE_GOOGLE_CLIENT_ID` has no fallback —
without it, Google Sign-In just doesn't render.

⚠️ Vite inlines `VITE_*` variables **at build time**, not runtime — see
Docker section below.

## Local Development

```bash
npm install
npm run dev       # http://localhost:5173
npm run build      # production build → dist/
npm run preview    # preview the production build locally
```

Requires the backend (and Redis) running separately, or `VITE_API_BASE_URL`
pointed at wherever it's hosted.

## Docker

Multi-stage build: Node builds the static bundle, nginx serves it.

```bash
docker build -t cinema-frontend \
  --build-arg VITE_API_BASE_URL=http://localhost:8080 \
  .
docker run -p 8080:80 cinema-frontend
```

Because Vite bakes `VITE_*` vars into the JS bundle at build time, the
backend URL **must** be passed as a `--build-arg` (or via `build.args` in
`docker-compose.yml`) — setting it as a container runtime env var has no
effect after the image is built.

`nginx.conf` serves the SPA with `try_files $uri $uri/ /index.html`
(the app itself uses hash-based routing, so this mainly matters for
direct-hit static asset requests).

To wire this into the full system's `docker compose up --build`, add a
`frontend` service in the backend repo's `docker-compose.yml` pointing
`build.context` at this repo and `build.args.VITE_API_BASE_URL` at the
backend service's internal address (e.g. `http://backend:8080`).
