#!/usr/bin/env bash
# Installs Forjapp on a fresh Ubuntu 22.04/24.04 server (run from the repository folder):
#   sudo DOMAIN=appmaker7.com bash deploy/install.sh
# Safe to run again: it keeps an existing .env and only rebuilds/restarts the containers.
set -euo pipefail

DOMAIN="${DOMAIN:?Indica el dominio, por ejemplo: sudo DOMAIN=appmaker7.com bash deploy/install.sh}"
cd "$(dirname "$0")/.."

if [ "$(id -u)" -ne 0 ]; then echo "Ejecútalo con sudo." >&2; exit 1; fi

echo "==> Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh   # official Docker install script
fi

echo "==> Memoria de intercambio (Gradle necesita memoria al compilar APK)"
mem_kb=$(awk '/MemTotal/ {print $2}' /proc/meminfo)
if [ "$mem_kb" -lt 6000000 ] && ! swapon --show | grep -q .; then
  fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> Configuración (.env)"
if [ ! -f .env ]; then
  admin_pw=$(openssl rand -base64 24 | tr -d '/+=' | head -c 20)
  cat > .env <<ENV
DOMAIN=${DOMAIN}
APP_URL=https://${DOMAIN}
# Never change after the first build: it encrypts the apps' signing keys.
ENCRYPTION_KEY=$(openssl rand -hex 32)
SEED_ADMIN_EMAIL=${ADMIN_EMAIL:-admin@${DOMAIN}}
SEED_ADMIN_PASSWORD=${admin_pw}
MAIL_FROM="Forjapp <no-reply@${DOMAIN}>"
SMTP_URL=
ANTHROPIC_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
BUILDER_CONCURRENCY=1
ENV
  chmod 600 .env
  echo "    Administrador: ${ADMIN_EMAIL:-admin@${DOMAIN}}"
  echo "    Contraseña:    ${admin_pw}   (guárdala; también está en .env)"
else
  echo "    .env ya existe, se conserva."
fi

echo "==> Cortafuegos"
if command -v ufw >/dev/null 2>&1; then
  ufw allow OpenSSH >/dev/null && ufw allow 80/tcp >/dev/null && ufw allow 443/tcp >/dev/null && ufw --force enable >/dev/null
fi

echo "==> Construyendo y arrancando (la primera vez tarda 15-30 minutos: descarga el Android SDK)"
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

echo
echo "Listo. Abre https://${DOMAIN} (el certificado HTTPS puede tardar 1-2 minutos)."
echo "Logs: docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f web builder"
