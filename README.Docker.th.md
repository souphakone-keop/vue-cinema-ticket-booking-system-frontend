# คู่มือ Docker — Frontend

*[English version](./README.Docker.md)*

วิธี build, รัน, และ update service frontend ตัวนี้ใน Docker ดู
[README.md](./README.md) ประกอบสำหรับภาพรวมโปรเจกต์ทั้งหมด

## ไฟล์ที่เกี่ยวข้อง

| ไฟล์ | หน้าที่ |
|---|---|
| `Dockerfile` | Multi-stage build: `node:20-alpine` build static bundle, `nginx:alpine` เป็นคน serve |
| `nginx.conf` | Serve `dist/` พร้อม fallback ไป `index.html` สำหรับ SPA |
| `compose.yaml` | นิยาม service `frontend` แบบเดี่ยว — มีไว้ให้ backend team merge เข้า `docker-compose.yml` หลัก ไม่ใช่รันไฟล์นี้เดี่ยวๆ |

## 1. Build image

```bash
docker build -t cinema-frontend \
  --build-arg VITE_API_BASE_URL=http://localhost:8080 \
  .
```

`--build-arg VITE_API_BASE_URL` **จำเป็นต้องใส่ถ้า backend ไม่ได้อยู่ที่
`localhost:8080`** เพราะ Vite bake ค่า `VITE_*` เข้าไปใน JS bundle ตอน
build time — ไม่มีทางเปลี่ยน API URL หลังจาก image build เสร็จแล้ว
นอกจาก build ใหม่เท่านั้น

## 2. รัน container

```bash
docker run -d --name cinema-frontend -p 3000:80 cinema-frontend
```

เปิดที่ `http://localhost:3000` — port `80` ข้างในตายตัว (nginx); มีแค่
port ฝั่ง host (ในตัวอย่างคือ `3000`) ที่เปลี่ยนได้ตามใจ — แค่อย่า map ไป
`8080` เพราะ backend ใช้ port นั้นอยู่แล้ว

หยุด/ลบ:

```bash
docker stop cinema-frontend && docker rm cinema-frontend
```

## 3. Update โค้ด

นี่เป็น **static build** ไม่ใช่ dev server — nginx serve แค่สิ่งที่อยู่ใน
`dist/` ตอน build เท่านั้น ไม่มี volume mount หรือ hot-reload ผูกไว้ ดังนั้น
แก้โค้ดแล้วต้อง rebuild ใหม่ถึงจะเห็นผล:

```bash
docker stop cinema-frontend && docker rm cinema-frontend
docker build -t cinema-frontend --build-arg VITE_API_BASE_URL=http://localhost:8080 .
docker run -d --name cinema-frontend -p 3000:80 cinema-frontend
```

ถ้ากำลังพัฒนาอยู่ ให้รัน `npm run dev` บนเครื่องตรงๆ แทน (reload ทันที
เร็วกว่ามาก) แล้วค่อย build เป็น Docker image ตอนต้องการทดสอบ build จริง
หรือ production เท่านั้น

## 4. รันรวมกับระบบทั้งหมด (backend + redis + ...)

repo นี้มีแค่ service `frontend` ใน `compose.yaml` เท่านั้น ถ้าจะรันทั้งระบบ
ด้วยคำสั่งเดียว backend team ต้อง merge service นี้เข้า
`docker-compose.yml` หลักของเขา:

```yaml
services:
  frontend:
    build:
      context: ../vue-cinema-ticket-booking-system-frontend   # ปรับ path ตามจริง
      args:
        VITE_API_BASE_URL: http://localhost:8080
    ports:
      - "3000:80"
    depends_on:
      - backend
```

`VITE_API_BASE_URL` ต้องเป็น URL ที่ **browser** เข้าถึงได้ เช่น
`http://localhost:8080` — ไม่ใช่ hostname ของ internal Docker network อย่าง
`http://backend:8080` เพราะ JS ที่ build ออกมารันฝั่ง client ในเบราว์เซอร์
ของผู้ใช้ ไม่ใช่ในเครือข่าย Docker

merge เสร็จแล้วรันด้วย:

```bash
docker compose up --build   # rebuild ทุก service ก่อนรัน (ใช้หลังแก้โค้ด)
docker compose up           # รันด้วย image เดิม (เร็วกว่า ไม่ rebuild)
docker compose down          # หยุด + ลบ container ทั้งหมด
```

## Troubleshooting

- **หน้าเว็บว่างเปล่า / asset ขึ้น 404**: ส่วนใหญ่เกิดจาก `base` ใน
  `vite.config.js` ไม่ตรง (ต้องเป็น `/` สำหรับ deploy ที่ nginx serve จาก
  root) หรือ build เก่าค้างอยู่ — ลอง build image ใหม่
- **API ยิงไปผิด host**: `VITE_API_BASE_URL` ผิดหรือไม่ได้ใส่ตอน build —
  build ใหม่พร้อม `--build-arg` ที่ถูกต้อง
- **`nginx:alpine: failed to resolve source metadata` / TLS timeout**:
  ปัญหาเน็ตชั่วคราวตอนดึง image จาก Docker Hub — build ซ้ำอีกครั้ง
- **Port ชนกัน (already in use)**: มี container อื่น (มักเป็น backend)
  จับ host port นั้นอยู่แล้ว — เปลี่ยน host port ใน `-p` แทน ไม่ต้องแก้
  port ภายใน container (`80`)
