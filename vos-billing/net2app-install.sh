#!/bin/bash
# =============================================================================
# net2app.com — VOS3000 Billing Platform One-Line Installer
# Usage:
#   curl -sSL https://raw.githubusercontent.com/eliasewu/vos-billing/main/vos-billing/net2app-install.sh | bash
# =============================================================================

set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

echo "=============================================="
echo " net2app.com — VOS3000 Billing Installer"
echo "=============================================="
echo ""

[ "$EUID" -eq 0 ] || err "Run as root"

# ── Node.js 20 via NVM ──────────────────────
if command -v node &>/dev/null && [ "$(node -v | cut -d. -f1 | tr -d 'v')" -ge 20 ]; then
    log "Node.js $(node -v)"
else
    log "Installing Node.js 20..."
    export NVM_DIR="$HOME/.nvm"
    [ ! -d "$NVM_DIR" ] && curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
    nvm install 20 && nvm use 20 && nvm alias default 20
    log "Node.js $(node -v)"
fi

NODE_BIN=$(which node)
NODE_ROOT=$(dirname $(dirname "$NODE_BIN"))

# ── Clone repo ──────────────────────────────
INSTALL_DIR="/opt/vos-billing"
REPO_URL="https://github.com/eliasewu/vos-billing.git"

if [ -d "$INSTALL_DIR" ]; then
    log "Updating existing installation..."
    cd "$INSTALL_DIR" && git pull origin master
else
    log "Cloning vos-billing..."
    git clone "$REPO_URL" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"

# ── Install dependencies ────────────────────
log "Installing dependencies..."
npm install --production

# ── Create .env if missing ──────────────────
if [ ! -f .env ]; then
    JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || uuidgen | tr -d '-')
    cat > .env << ENVEOF
DATABASE_URL=postgres://postgres:postgres@localhost:5432/vos_billing
VOS_DB_HOST=127.0.0.1
VOS_DB_PORT=3306
VOS_DB_USER=root
VOS_DB_PASSWORD=
VOS_DB_NAME=vos3000
JWT_SECRET=${JWT_SECRET}
NODE_ENV=production
ENVEOF
    log "Created .env — EDIT DB credentials!"
fi

# ── SSL Certificate ─────────────────────────
CERT_DIR="/etc/pki/tls"
if [ ! -f "${CERT_DIR}/private/vos-billing.key" ]; then
    log "Generating self-signed SSL (replace with Let's Encrypt)..."
    mkdir -p "${CERT_DIR}/certs" "${CERT_DIR}/private"
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "${CERT_DIR}/private/vos-billing.key" \
        -out "${CERT_DIR}/certs/vos-billing.crt" \
        -subj "/C=US/ST=NY/L=NewYork/O=net2app/CN=net2app.com" 2>/dev/null
    log "SSL cert created"
fi

# ── Build ───────────────────────────────────
log "Building Next.js..."
"$NODE_BIN" node_modules/.bin/next build 2>&1 | tail -3
log "Build complete"

# ── Systemd service ─────────────────────────
cat > /etc/systemd/system/vos-billing.service << UNITEOF
[Unit]
Description=net2app.com VOS3000 Billing (Next.js HTTPS)
After=network.target mysqld.service

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}
Environment=NODE_ENV=production
Environment=PATH=${NODE_ROOT}/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin
EnvironmentFile=${INSTALL_DIR}/.env
ExecStartPre=${NODE_BIN} ${INSTALL_DIR}/node_modules/.bin/next build
ExecStart=${NODE_BIN} ${INSTALL_DIR}/server.js
Restart=on-failure
RestartSec=10
TimeoutStartSec=180
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
UNITEOF

systemctl daemon-reload
systemctl enable vos-billing
systemctl restart vos-billing &

# ── Wait for health ─────────────────────────
echo -n "Waiting for service"
for i in $(seq 1 30); do
    if curl -skf https://localhost:3443/api/health > /dev/null 2>&1; then
        echo ""; log "Service healthy!"
        break
    fi
    echo -n "."; sleep 2
done

# ── Done ────────────────────────────────────
IP=$(hostname -I | awk '{print $1}')
echo ""
echo "=============================================="
echo " net2app.com — Billing Platform Ready"
echo "=============================================="
echo ""
echo "  Dashboard:  https://${IP}:3443/dashboard"
echo "  Login:      admin / admin123"
echo "  Status:     systemctl status vos-billing"
echo "  Logs:       journalctl -u vos-billing -f"
echo "  Domain:     https://net2app.com:3443/dashboard"
echo ""
echo "  SSL:        Replace self-signed cert with Let's Encrypt:"
echo "              certbot certonly --standalone -d net2app.com"
echo "=============================================="
