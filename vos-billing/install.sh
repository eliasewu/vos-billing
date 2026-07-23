#!/bin/bash
# =============================================================================
# VOS3000 Billing Platform — One-Line Installer
# Usage:
#   curl -sSL https://raw.githubusercontent.com/USER/REPO/main/install.sh | bash
#   or:
#   git clone <repo> vos-billing && cd vos-billing && bash install.sh
# =============================================================================
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${CYAN}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

echo "=============================================="
echo " VOS3000 Billing Platform Installer"
echo "=============================================="
echo ""

# ── Check root ──────────────────────────────────
[ "$EUID" -eq 0 ] || err "Please run as root"

# ── Check OS ────────────────────────────────────
if [ -f /etc/redhat-release ]; then
    log "Detected RHEL/CentOS $(cat /etc/redhat-release 2>/dev/null | grep -oP '\d+' | head -1)"
    PKG_MGR="yum"
elif [ -f /etc/debian_version ]; then
    log "Detected Debian/Ubuntu"
    PKG_MGR="apt-get"
else
    warn "Unknown OS — proceeding anyway"
    PKG_MGR="yum"
fi

# ── Install Node.js 20 via NVM ───────────────────
if command -v node &>/dev/null && [ "$(node -v | cut -d. -f1 | tr -d 'v')" -ge 20 ]; then
    log "Node.js $(node -v) already installed"
else
    log "Installing Node.js 20 via NVM..."
    export NVM_DIR="$HOME/.nvm"
    if [ ! -d "$NVM_DIR" ]; then
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
    fi
    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
    nvm install 20
    nvm use 20
    nvm alias default 20
    log "Node.js $(node -v) / npm $(npm -v)"
fi

NODE_BIN=$(which node)
NODE_PATH=$(dirname $(dirname "$NODE_BIN"))
log "Node path: $NODE_PATH"

# ── Install dependencies ─────────────────────────
log "Installing npm dependencies..."
npm install --production
log "Dependencies installed"

# ── Create .env if missing ───────────────────────
if [ ! -f .env ]; then
    JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || uuidgen 2>/dev/null | tr -d '-' || echo "change-me")
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
    warn "Created .env — EDIT with your VOS3000 DB credentials!"
else
    log ".env already exists"
fi

# ── Generate self-signed SSL cert ────────────────
CERT_DIR="/etc/pki/tls"
if [ ! -f "${CERT_DIR}/private/vos-billing.key" ]; then
    log "Generating self-signed SSL certificate..."
    mkdir -p "${CERT_DIR}/certs" "${CERT_DIR}/private"
    openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
        -keyout "${CERT_DIR}/private/vos-billing.key" \
        -out "${CERT_DIR}/certs/vos-billing.crt" \
        -subj "/C=US/ST=NY/L=NewYork/O=VOS3000/CN=localhost" 2>/dev/null
    log "SSL certificate created (10 year validity)"
    warn "Replace with Let's Encrypt for production: certbot certonly --standalone -d yourdomain.com"
else
    log "SSL certificate already exists"
fi

# ── Build Next.js ────────────────────────────────
log "Building Next.js (production)..."
"$NODE_BIN" node_modules/.bin/next build 2>&1 | tail -3
log "Build complete"

# ── Create systemd service ───────────────────────
INSTALL_DIR=$(pwd)
SERVICE_FILE="/etc/systemd/system/vos-billing.service"

log "Creating systemd service..."
cat > "$SERVICE_FILE" << UNITEOF
[Unit]
Description=VOS3000 Billing Web Platform (Next.js HTTPS)
After=network.target mysqld.service

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}
Environment=NODE_ENV=production
Environment=PATH=${NODE_PATH}/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin
EnvironmentFile=${INSTALL_DIR}/.env
ExecStartPre=${NODE_BIN} ${INSTALL_DIR}/node_modules/.bin/next build
ExecStart=${NODE_BIN} ${INSTALL_DIR}/server.js
ExecStartPost=/usr/bin/bash -c 'for i in \$(seq 1 30); do curl -skf https://localhost:3443/api/health > /dev/null 2>&1 && exit 0; sleep 1; done; echo "Health check timed out" && exit 1'
Restart=on-failure
RestartSec=10
TimeoutStartSec=180
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
UNITEOF

# ── Start service ────────────────────────────────
log "Enabling and starting vos-billing service..."
systemctl daemon-reload
systemctl enable vos-billing
systemctl start vos-billing &

# ── Wait for health check ────────────────────────
echo ""
echo -n "Waiting for service to start"
for i in $(seq 1 60); do
    if curl -skf https://localhost:3443/api/health > /dev/null 2>&1; then
        echo ""
        log "Service is healthy!"
        break
    fi
    echo -n "."
    sleep 2
done

# ── Done ─────────────────────────────────────────
IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "YOUR_IP")
echo ""
echo "=============================================="
echo -e " ${GREEN}Installation Complete!${NC}"
echo "=============================================="
echo ""
echo "  Dashboard:   https://${IP}:3443/dashboard"
echo "  Login:       admin / admin123"
echo "  Service:     systemctl status vos-billing"
echo "  Logs:        journalctl -u vos-billing -f"
echo "  SSL Cert:    ${CERT_DIR}/certs/vos-billing.crt"
echo ""
echo "  ⚠  Edit .env to set VOS3000 DB credentials"
echo "  ⚠  Replace self-signed cert with Let's Encrypt"
echo "=============================================="
