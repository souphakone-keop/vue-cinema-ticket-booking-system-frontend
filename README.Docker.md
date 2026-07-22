# Docker Guide — Frontend

How to build, run, and update this frontend service in Docker. See
[README.md](./README.md) for the rest of the project overview.

## Files involved

| File | Purpose |
|---|---|
| `Dockerfile` | Multi-stage build: `node:20-alpine` builds the static bundle, `nginx:alpine` serves it |
| `nginx.conf` | Serves `dist/` with an `index.html` fallback for the SPA |
| `compose.yaml` | Standalone `frontend` service definition — meant to be merged into the backend team's main `docker-compose.yml`, not run alone |

## 1. Build the image

```bash
docker build -t cinema-frontend \
  --build-arg VITE_API_BASE_URL=http://localhost:8080 \
  .
```

`--build-arg VITE_API_BASE_URL` is **required if the backend isn't at
`localhost:8080`**. Vite inlines `VITE_*` env vars into the JS bundle at
build time — there is no way to change the API URL after the image is
built without rebuilding.

## 2. Run the container

```bash
docker run -d --name cinema-frontend -p 3000:80 cinema-frontend
```

Open `http://localhost:3000`. Port `80` inside the container is fixed
(nginx); only the host-side port (`3000` here) is arbitrary — just don't
map it to `8080`, since the backend already listens there.

Stop/remove:

```bash
docker stop cinema-frontend && docker rm cinema-frontend
```

## 3. Updating code

This is a **static build**, not a dev server — nginx only serves whatever
was in `dist/` at build time. There's no volume mount or hot-reload wired
up, so code changes need a rebuild to take effect:

```bash
docker stop cinema-frontend && docker rm cinema-frontend
docker build -t cinema-frontend --build-arg VITE_API_BASE_URL=http://localhost:8080 .
docker run -d --name cinema-frontend -p 3000:80 cinema-frontend
```

For active development, run `npm run dev` on the host instead (instant
reload) and only build the Docker image when you need to test the
containerized/production build.

## 4. Running with the full system (backend + redis + ...)

This repo only owns the `frontend` service in `compose.yaml`. To run
everything with one command, the backend team merges that service into
their `docker-compose.yml`:

```yaml
services:
  frontend:
    build:
      context: ../vue-cinema-ticket-booking-system-frontend   # adjust to actual path
      args:
        VITE_API_BASE_URL: http://localhost:8080
    ports:
      - "3000:80"
    depends_on:
      - backend
```

`VITE_API_BASE_URL` must be a URL the **browser** can reach — e.g.
`http://localhost:8080` — not an internal Docker network hostname like
`http://backend:8080`, since the built JS runs client-side in the user's
browser, not inside the Docker network.

Once merged:

```bash
docker compose up --build   # rebuild + start everything (use after code changes)
docker compose up           # start with existing images (faster, no rebuild)
docker compose down          # stop and remove all containers
```

## Troubleshooting

- **Blank page / 404 on assets**: usually a `base` mismatch in
  `vite.config.js` (must be `/` for nginx-root deployment) or a stale
  build — rebuild the image.
- **API calls go to the wrong host**: `VITE_API_BASE_URL` was wrong (or
  omitted) at build time — rebuild with the correct `--build-arg`.
- **`nginx:alpine: failed to resolve source metadata` / TLS timeout**:
  transient Docker Hub network issue — retry the build.
- **Port already in use**: another container (likely the backend) is
  already bound to that host port — pick a different host port in the
  `-p` mapping, the container's internal port (`80`) doesn't need to
  change.
