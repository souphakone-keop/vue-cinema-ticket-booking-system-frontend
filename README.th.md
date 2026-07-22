# 🎬 Cinema Ticket Booking System — Frontend

*[English version](./README.md)*

Frontend ของระบบจองตั๋วหนังออนไลน์ เขียนด้วย Vue 3 (Composition API) รองรับทั้งฝั่ง
ผู้ใช้ทั่วไป (ดูหนัง จองที่นั่ง) และฝั่ง admin panel แยกต่างหาก โดยคุยกับ backend
(Go) ผ่าน REST API และ WebSocket

repo นี้เป็น **frontend เท่านั้น** ส่วน backend (Go, MongoDB, Redis distributed
lock, message queue) อยู่คนละ repository

## Tech Stack

| ส่วน | เทคโนโลยี |
|---|---|
| Framework | Vue 3 (`<script setup>`, Composition API) |
| Routing | Vue Router 5 (hash history) |
| HTTP | Axios |
| Styling | Tailwind CSS 4 + daisyUI |
| Realtime | Native WebSocket |
| Auth | Email/password (JWT) + Google Identity Services (Google Sign-In) |
| Build | Vite |
| Deployment | Docker multi-stage build → nginx |

## โครงสร้างโปรเจกต์

```
src/
├── main.js                   # จุดเริ่มแอป, mount router
├── router/index.js           # Routes + navigation guard เช็ค auth/role
├── lib/http.js                # Axios instance (user + admin), แนบ token, จัดการ 401
├── composables/
│   ├── useGoogleAuth.js       # โหลดสคริปต์ Google Identity Services, render ปุ่ม sign-in
│   └── useSeatSocket.js       # WebSocket client สำหรับอัปเดตผังที่นั่งแบบ real-time
│
├── UserPage/                  # ฝั่งผู้ใช้ทั่วไป
│   ├── mainPage/               # Layout หลัก (navbar + footer + <router-view>)
│   ├── navBar/, footer/
│   ├── loginPage/               # login.vue, register.vue
│   ├── homePage/                # รายการหนัง
│   ├── showtimesPage/           # รอบฉายของหนังเรื่องนั้น
│   ├── seatsPage/                # ผังที่นั่ง, การ lock ที่นั่ง, real-time update
│   ├── bookingConfirmPage/        # ตรวจสอบ + ยืนยันการจอง
│   ├── myTicketPage/             # ประวัติการจองของผู้ใช้
│   └── profilePage/
│
└── AdminPage/                  # หน้า admin (session แยกจากฝั่งผู้ใช้)
    ├── mainPage/                 # Layout แบบ sidebar
    ├── loginPage/                  # login.vue, logout.vue
    ├── homePage/                   # Dashboard
    ├── moviesPage/, showtimesPage/, usersPage/
    ├── bookingsPage/                # รายการ booking ทั้งหมด, filter ได้
    └── auditLogsPage/                # log เหตุการณ์ในระบบ, filter ได้
```

## Authentication & Session

เก็บ session แยกกัน 2 ชุดใน `localStorage` แต่ละชุดมี Axios instance ของตัวเอง
(`http` และ `adminHttp` ใน `src/lib/http.js`):

| | Storage keys | Axios client |
|---|---|---|
| User | `token`, `user` | `http` |
| Admin | `admin_token`, `admin_user` | `adminHttp` |

- Login (`/auth/login`) และ Google Sign-In จะคืน JWT + user object (มี `role`
  ติดมาด้วย) JWT จะถูกแนบเป็น `Authorization: Bearer <token>` ทุก request
  ผ่าน Axios request interceptor โดยอัตโนมัติ
- Response interceptor คอยดักจับ `401` ของทั้งสอง client: ถ้าเจอจะล้าง
  session ที่เกี่ยวข้องออกจาก storage แล้ว redirect ไปหน้า login ที่ตรงกัน
  (`/login` หรือ `/admin/login`)
- **การตรวจสอบ role จริงทำที่ backend** (`RequireRole(ADMIN)` ครอบ endpoint
  ของ admin) — router guard ฝั่ง frontend เช็คแค่ `role` ที่เก็บไว้ใน
  localStorage เพื่อไม่ให้ render หน้า admin ให้คนที่ไม่ใช่ admin เห็นเฉยๆ
  ถือเป็นแค่ UX gate ไม่ใช่ security boundary จริง — ต่อให้ผู้ใช้ทั่วไป
  หลุด guard นี้เข้ามาได้ ก็ยังโดน `403` จาก API อยู่ดี

### Google Sign-In

`useGoogleAuth.js` โหลดสคริปต์ Google Identity Services แบบ lazy แล้ว render
ปุ่ม sign-in ของ Google เอง ต้องมี `VITE_GOOGLE_CLIENT_ID` — ถ้าไม่ตั้งค่า
ปุ่มจะไม่ render (มี console warning เตือน) แต่ login แบบ email/password
ยังใช้งานได้ปกติ

## Booking Flow (หน้าเลือกที่นั่ง)

`src/UserPage/seatsPage/index.vue` คือหัวใจของระบบฝั่ง frontend:

1. ตอน mount จะดึงผังที่นั่ง (`GET /showtimes/:id/seats`) และเปิด WebSocket
   (`connectSeatSocket` ใน `useSeatSocket.js`) ผูกกับรอบฉายนั้น
2. กดที่นั่งที่ยัง `AVAILABLE` → เรียก `POST /seats/:id/lock`; กดที่นั่งที่
   ตัวเองล็อกอยู่แล้ว → เรียก `POST /seats/:id/unlock` ถ้าได้ `409` กลับมา
   แปลว่ามีคนอื่นแย่งไปก่อนแล้ว — ผังที่นั่งจะอัปเดตให้เองผ่าน WebSocket
   broadcast รอบถัดไป
3. มี countdown ฝั่ง client ที่ mirror ตาม TTL ของ lock ฝั่ง backend (5 นาที,
   ตัวแปร `LOCK_TTL_SECONDS`) เมื่อหมดเวลาจะล้างที่นั่งที่เลือกไว้ และแจ้ง
   เตือนว่า "hold expired"
4. ถ้าผู้ใช้ออกจากหน้านี้โดยยังไม่ได้ confirm ที่นั่งที่ล็อกไว้จะถูกปล่อย
   อัตโนมัติ (`POST /seats/:id/unlock`) ผ่าน `onBeforeUnmount`
5. ที่นั่งที่เลือก + ข้อมูลรอบฉายจะถูกส่งต่อผ่าน `sessionStorage` ไปยัง
   `bookingConfirmPage` ซึ่งจะเรียก `POST /bookings/confirm` เพื่อยืนยัน
   การจองจริง
6. ข้อความจาก WebSocket (`{ seat_id, status }`) จะอัปเดตที่นั่งใดๆ ในผังแบบ
   real-time — รวมถึงที่นั่งที่ผู้ใช้คนนี้ไม่ได้ล็อกอยู่ด้วย — ทำให้ทุกคน
   ที่ดูรอบฉายเดียวกันเห็นข้อมูลตรงกันตลอด

## Admin Panel

- Login แยกต่างหาก (`/admin/login`), session/localStorage keys แยก, layout
  แบบ sidebar แยก (`AdminPage/mainPage`)
- **Bookings** (`/admin/bookings`): ดู booking ทั้งหมด, filter ได้ตาม user
  ID, showtime ID, status, และช่วงวันที่
- **Audit Logs** (`/admin/audit-logs`): เหตุการณ์ในระบบ (`BOOKING_SUCCESS`,
  `BOOKING_TIMEOUT`, `SEAT_RELEASED`, `SYSTEM_ERROR`), filter ได้ตาม user ID
  และประเภทเหตุการณ์
- หน้า Movies / Showtimes / Users สำหรับ CRUD/แสดงรายการพื้นฐาน

## Environment Variables

ไม่มีการ commit ค่าจริงไว้ (`.env` อยู่ใน gitignore) ให้สร้างไฟล์ `.env`
ที่ root ของโปรเจกต์ ใส่:

```
VITE_API_BASE_URL=http://localhost:8080   # URL ของ Go backend (REST + WS)
VITE_GOOGLE_CLIENT_ID=<your-google-oauth-client-id>
```

ทั้งสองตัวถูกอ่านผ่าน `import.meta.env.*` — `VITE_API_BASE_URL` มีค่า
fallback เป็น `http://localhost:8080` ถ้าไม่ตั้งค่า; `VITE_GOOGLE_CLIENT_ID`
ไม่มี fallback — ถ้าไม่ตั้งค่า Google Sign-In จะไม่ขึ้นปุ่มให้กดเฉยๆ

⚠️ Vite จะ inline ค่า `VITE_*` **ตอน build time** ไม่ใช่ runtime — ดูหัวข้อ
Docker ด้านล่างประกอบ

## รันแบบ Local Development

```bash
npm install
npm run dev       # http://localhost:5173
npm run build      # production build → dist/
npm run preview    # preview production build บนเครื่อง
```

ต้องมี backend (และ Redis) รันอยู่แยกต่างหาก หรือชี้ `VITE_API_BASE_URL` และ  `VITE_GOOGLE_CLIENT_ID`
ไปที่ที่ backend ถูก host ไว้จริง