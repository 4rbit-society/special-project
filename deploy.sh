#!/usr/bin/env bash
#
# deploy.sh — one-shot deploy for the special-project fullstack app.
#
# What it does:
#   1. Checks for docker + docker compose
#   2. Creates root .env from .env.example (auto-generates secrets for testing)
#   3. Builds & starts database + backend + frontend with docker compose
#   4. Installs/configures host nginx as a reverse proxy on port 80
#   5. Prints access info and Cloudflare next steps
#
# Run:  chmod +x deploy.sh && ./deploy.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

ENV_FILE=".env"
ENV_EXAMPLE=".env.example"
COMPOSE_FILE="compose.yaml"

log()  { printf '[deploy] %s\n' "$*"; }
warn() { printf '[deploy] ! %s\n' "$*" >&2; }
abort() { printf '[deploy] X %s\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------------------
# 0. Prerequisites
# ---------------------------------------------------------------------------
command -v docker >/dev/null 2>&1 || abort "docker is not installed."
docker compose version >/dev/null 2>&1 || abort "docker compose plugin is not installed."

if ! docker info >/dev/null 2>&1; then
  abort "docker daemon is not running (try: sudo systemctl start docker)."
fi

# ---------------------------------------------------------------------------
# 1. Environment file
# ---------------------------------------------------------------------------
if [[ ! -f "$ENV_FILE" ]]; then
  if [[ ! -f "$ENV_EXAMPLE" ]]; then
    abort "$ENV_EXAMPLE not found — cannot create .env"
  fi
  log "Creating $ENV_FILE from $ENV_EXAMPLE (auto-generating test secrets)..."
  cp "$ENV_EXAMPLE" "$ENV_FILE"
  # Auto-generate secrets so a testing deploy works out of the box.
  DB_PASSWORD="$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 24)"
  MYSQL_ROOT_PASSWORD="$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 24)"
  JWT_SECRET="$(openssl rand -base64 32 | tr -dc 'A-Za-z0-9' | head -c 32)"
  sed -i "s#DB_PASSWORD=replace-with-a-random-database-password#DB_PASSWORD=$DB_PASSWORD#" "$ENV_FILE"
  sed -i "s#MYSQL_ROOT_PASSWORD=replace-with-a-different-random-root-password#MYSQL_ROOT_PASSWORD=$MYSQL_ROOT_PASSWORD#" "$ENV_FILE"
  sed -i "s#JWT_SECRET=replace-with-at-least-32-random-characters#JWT_SECRET=$JWT_SECRET#" "$ENV_FILE"
  log "Generated secrets are written to $ENV_FILE."
else
  log "$ENV_FILE already exists — keeping it."
fi

# ---------------------------------------------------------------------------
# 2. Build & start services (database + backend + frontend on this host)
# ---------------------------------------------------------------------------
log "Building and starting containers (docker compose up)..."
docker compose up -d --build

log "Waiting for backend healthcheck..."
docker compose exec -T backend sh -c '
  for i in $(seq 1 60); do
    if node -e "fetch('"'"'http://127.0.0.1:3001/api/health'"'"').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null; then
      exit 0
    fi
    sleep 2
  done
  exit 1
' || abort "backend did not become healthy."

log "All services are up."

# ---------------------------------------------------------------------------
# 3. Host nginx reverse proxy on port 80
# ---------------------------------------------------------------------------
setup_nginx() {
  if ! command -v nginx >/dev/null 2>&1; then
    log "nginx not found — attempting to install (needs sudo)..."
    if command -v apt-get >/dev/null 2>&1; then
      sudo apt-get update -y && sudo apt-get install -y nginx || return 1
    elif command -v apk >/dev/null 2>&1; then
      sudo apk add --no-cache nginx || return 1
    else
      warn "no supported package manager; install nginx manually."
      return 1
    fi
  fi

  local conf="/etc/nginx/conf.d/araw.conf"
  log "Writing host nginx reverse-proxy config to $conf"
  sudo tee "$conf" >/dev/null <<'EOF'
# special-project reverse proxy (host port 80 -> containers on this host)
server {
    listen 80 default_server;
    server_name _;

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
    }

    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
    }
}
EOF

  if sudo nginx -t 2>/dev/null; then
    if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files 2>/dev/null | grep -q nginx; then
      sudo systemctl enable --now nginx 2>/dev/null || sudo systemctl restart nginx 2>/dev/null || sudo nginx -s reload 2>/dev/null || true
    else
      sudo nginx -s reload 2>/dev/null || sudo nginx 2>/dev/null || true
    fi
    log "Host nginx reverse proxy is listening on :80."
  else
    warn "nginx config test failed — apply $conf manually."
    return 1
  fi
}

setup_nginx || true

# ---------------------------------------------------------------------------
# 4. Summary
# ---------------------------------------------------------------------------
SERVER_IP="$(hostname -I | awk '{print $1}')"
cat <<EOF

================================================================================
Deploy complete
================================================================================
Services (docker compose, all on this host):
  database : MySQL      -> 127.0.0.1:${DB_PUBLISHED_PORT:-3306}  (loopback only)
  backend  : API        -> 127.0.0.1:3001                         (loopback only)
  frontend : nginx SPA  -> 127.0.0.1:5173                         (loopback only)

Access (host nginx reverse proxy on :80):
  http://${SERVER_IP}/            -> frontend SPA
  http://${SERVER_IP}/api/...     -> backend API

Environment: $ENV_FILE (DB_PASSWORD, JWT_SECRET etc. were auto-generated).
DB schema + seed run automatically on backend container startup.

--------------------------------------------------------------------------------
Cloudflare (HTTPS/SSL)
--------------------------------------------------------------------------------
Cloudflare proxying requires a DOMAIN NAME — you cannot orange-cloud a bare IP.
Since you have no domain yet, pick one:

A) Get a domain, add it to Cloudflare:
   - DNS: A record @ -> ${SERVER_IP}, proxy ON (orange cloud)
   - SSL/TLS: Full or Flexible (Cloudflare edge -> your host)
   - Then visit https://your-domain.com (Cloudflare handles the edge cert).

B) No domain yet — Cloudflare Tunnel (cloudflared):
   - Install cloudflared, run: cloudflared tunnel --url http://localhost:80
   - Gives you a https://*.trycloudflare.com URL (Cloudflare edge, HTTPS included).

Pick A or B and let me know which you want wired into deploy.sh.
================================================================================
EOF
