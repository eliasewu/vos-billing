#!/bin/bash
# =============================================================================
# VOS3000 Billing Platform — One-Line Uninstaller
# Usage:
#   curl -sSL https://raw.githubusercontent.com/USER/REPO/main/uninstall.sh | bash
#   or:
#   bash uninstall.sh
# =============================================================================
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }

echo "=============================================="
echo " VOS3000 Billing Platform Uninstaller"
echo "=============================================="
echo ""

[ "$EUID" -eq 0 ] || { echo "Please run as root"; exit 1; }

# Stop & disable service
if systemctl is-active --quiet vos-billing 2>/dev/null; then
    systemctl stop vos-billing
    log "Service stopped"
fi

if systemctl is-enabled --quiet vos-billing 2>/dev/null; then
    systemctl disable vos-billing
    log "Service disabled"
fi

# Remove service file
if [ -f /etc/systemd/system/vos-billing.service ]; then
    rm -f /etc/systemd/system/vos-billing.service
    systemctl daemon-reload
    log "Systemd service removed"
fi

# Remove files
DIR=$(dirname "$(readlink -f "$0")")
echo ""
echo "The vos-billing directory is at: $DIR"
echo ""
read -p "Remove the entire directory? [y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf "$DIR"
    log "Directory removed: $DIR"
fi

echo ""
echo "Uninstall complete."
