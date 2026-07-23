#!/bin/bash
# =============================================================================
# VOS3000 Automated License Key Generator
# Replaces manual steps into a single command:
#   ./dat_7.unknown > 1.dat
#   ./85 1.dat <IP> 0 0 0 en_us <PRODUCT_KEY>
#   Upload to key gen portal
#   Download and install license
#
# Usage:
#   bash gen-license.sh
#   bash gen-license.sh --auto-upload    # tries to upload via curl
#   bash gen-license.sh --ip 1.2.3.4     # override auto-detected IP
# =============================================================================

set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }
info() { echo -e "${CYAN}[i]${NC} $1"; }

# ─── Configuration ──────────────────────────────────────
PRODUCT_KEY="564f53333030303231383058"       # VOS3000 build 2185
KEYGEN_URL="http://136.244.103.214:6069/elias"
KEYGEN_USER="elias"
KEYGEN_PASS="eli@01234@#el"
LICENSE_DEST="/home/kunshi/license.dat"
VOS3000_CONF="/home/kunshi/vos3000/etc/server.conf"
WORK_DIR="/root"
AUTO_UPLOAD=false
OVERRIDE_IP=""

# ─── Parse args ─────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case "$1" in
        --auto-upload) AUTO_UPLOAD=true; shift ;;
        --ip) OVERRIDE_IP="$2"; shift 2 ;;
        *) shift ;;
    esac
done

echo "=============================================="
echo " VOS3000 License Key Generator"
echo "=============================================="
echo ""

# ─── Step 1: Detect server IP ───────────────────────────
if [ -n "$OVERRIDE_IP" ]; then
    SERVER_IP="$OVERRIDE_IP"
    info "Using provided IP: $SERVER_IP"
else
    SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
    if [ -z "$SERVER_IP" ]; then
        SERVER_IP=$(ip route get 8.8.8.8 2>/dev/null | awk '{print $7; exit}')
    fi
    if [ -z "$SERVER_IP" ]; then
        err "Could not detect server IP. Use --ip <address>"
    fi
    log "Detected server IP: $SERVER_IP"
fi

# ─── Step 2: Check tools ─────────────────────────────────
cd "$WORK_DIR"

if [ ! -f "./dat_7.unknown" ]; then
    err "dat_7.unknown not found in $WORK_DIR. Upload it first."
fi
chmod +x ./dat_7.unknown 2>/dev/null || true
log "Found dat_7.unknown"

# Check for ./85 signer
SIGN_TOOL="./85"
if [ ! -f "$SIGN_TOOL" ]; then
    # Try common locations
    for loc in "/root/85" "/home/kunshi/85" "/home/kunshi/vos3000/bin/85"; do
        [ -f "$loc" ] && SIGN_TOOL="$loc" && break
    done
fi

if [ -f "$SIGN_TOOL" ]; then
    chmod +x "$SIGN_TOOL" 2>/dev/null || true
    log "Found signing tool at $SIGN_TOOL"
else
    warn "Signing tool './85' not found!"
    warn "Upload dat_7.unknown and 85 binary to /root/"
    warn "Continuing — you'll need to sign manually..."
fi

# ─── Step 3: Generate license request (1.dat) ─────────────
# Warn if VOS3000 is running
if pgrep -f vos3000 &>/dev/null; then
    warn "VOS3000 appears to be running. Stop it first:"
    warn "  service vos3000d stop"
fi

log "Generating license request file..."
./dat_7.unknown > 1.dat

# Validate output
if [ ! -s 1.dat ]; then
    err "License request generation failed — 1.dat is empty. Check dat_7.unknown."
fi

SIZE=$(stat -c%s 1.dat 2>/dev/null || stat -f%z 1.dat 2>/dev/null)
log "License request generated: 1.dat ($SIZE bytes)"

# Preview (if xxd available)
if command -v xxd &>/dev/null; then
    info "Request preview (first 3 lines):"
    xxd 1.dat | head -3
    echo ""
fi

# ─── Step 4: Sign with product key ───────────────────────
if [ -f "$SIGN_TOOL" ]; then
    BEFORE_SIGN=$(stat -c%s 1.dat 2>/dev/null || stat -f%z 1.dat 2>/dev/null)
    log "Signing license request with product key..."
    log "Command: $SIGN_TOOL 1.dat $SERVER_IP 0 0 0 en_us $PRODUCT_KEY"
    "$SIGN_TOOL" 1.dat "$SERVER_IP" 0 0 0 en_us "$PRODUCT_KEY"
    AFTER_SIGN=$(stat -c%s 1.dat 2>/dev/null || stat -f%z 1.dat 2>/dev/null)
    if [ "$AFTER_SIGN" != "$BEFORE_SIGN" ]; then
        log "License request signed ($BEFORE_SIGN → $AFTER_SIGN bytes)"
    else
        log "License request signed (in-place, $AFTER_SIGN bytes)"
    fi
else
    warn "Manual signing required:"
    echo ""
    echo "  cd $WORK_DIR"
    echo "  ./85 1.dat $SERVER_IP 0 0 0 en_us $PRODUCT_KEY"
    echo ""
fi

# ─── Step 5: Upload to key gen portal ─────────────────────
echo ""
echo "=============================================="
echo " Step 5: Upload to Key Generator Portal"
echo "=============================================="
echo ""
info "Portal URL:  $KEYGEN_URL"
info "Username:    $KEYGEN_USER"
info "Password:    $KEYGEN_PASS"
echo ""

if $AUTO_UPLOAD; then
    log "Attempting automatic upload via curl (best-effort)..."
    
    # Try to login and upload
    COOKIE_JAR="/tmp/keygen-cookies.txt"
    
    # Attempt login
    LOGIN_RESULT=$(curl -s -c "$COOKIE_JAR" -L "$KEYGEN_URL" \
        -d "username=$KEYGEN_USER" \
        -d "password=$KEYGEN_PASS" \
        -w "%{http_code}" -o /tmp/keygen-login.html 2>&1)
    
    if [ "$LOGIN_RESULT" = "200" ] || [ "$LOGIN_RESULT" = "302" ]; then
        log "Logged in to key gen portal (HTTP $LOGIN_RESULT)"
        
        # Attempt file upload
        UPLOAD_RESULT=$(curl -s -b "$COOKIE_JAR" -X POST \
            -F "file=@$WORK_DIR/1.dat" \
            -w "%{http_code}" -o /tmp/keygen-response.html \
            "$KEYGEN_URL" 2>&1)
        
        if [ "$UPLOAD_RESULT" = "200" ] || [ "$UPLOAD_RESULT" = "302" ]; then
            log "File uploaded successfully (HTTP $UPLOAD_RESULT)"
            info "Check portal response: /tmp/keygen-response.html"
        else
            warn "Upload returned HTTP $UPLOAD_RESULT — check portal manually"
        fi
    else
        warn "Login returned HTTP $LOGIN_RESULT — upload manually"
    fi
    
    rm -f "$COOKIE_JAR"
    warn "Auto-upload is best-effort. If it failed, follow manual steps below."
else
    warn "MANUAL UPLOAD REQUIRED:"
    echo ""
    echo "  1. Open: $KEYGEN_URL"
    echo "  2. Login: $KEYGEN_USER / $KEYGEN_PASS"
    echo "  3. Upload: $WORK_DIR/1.dat"
    echo "  4. Download the license file"
    echo ""
fi

# ─── Step 6: Install license ──────────────────────────────
echo "=============================================="
echo " Step 6: Install License"
echo "=============================================="
echo ""

# Check if license was auto-downloaded
DOWNLOADED_LICENSE=""
for loc in "/tmp/license.dat" "/tmp/license" "/root/license.dat" "$HOME/Downloads/license.dat"; do
    [ -f "$loc" ] && DOWNLOADED_LICENSE="$loc" && break
done

if [ -n "$DOWNLOADED_LICENSE" ]; then
    log "Found downloaded license: $DOWNLOADED_LICENSE"
    cp "$DOWNLOADED_LICENSE" "$LICENSE_DEST"
    log "License installed to $LICENSE_DEST"
else
    warn "Place the downloaded license file at $LICENSE_DEST"
    echo ""
    echo "  # After downloading from the portal, run:"
    echo "  cp /path/to/license.dat $LICENSE_DEST"
    echo ""
fi

# ─── Step 7: Verify ──────────────────────────────────────
echo "=============================================="
echo " Step 7: Verify"
echo "=============================================="
echo ""

if [ -f "$LICENSE_DEST" ]; then
    LIC_SIZE=$(stat -c%s "$LICENSE_DEST" 2>/dev/null || stat -f%z "$LICENSE_DEST" 2>/dev/null)
    log "License file: $LICENSE_DEST ($LIC_SIZE bytes)"
else
    warn "License not yet installed"
fi

if [ -f "$VOS3000_CONF" ]; then
    ACCESS_UUID=$(grep "ACCESS_UUID" "$VOS3000_CONF" 2>/dev/null | cut -d= -f2)
    [ -n "$ACCESS_UUID" ] && log "ACCESS_UUID: $ACCESS_UUID"
fi

# ─── Done ────────────────────────────────────────────────
echo ""
echo "=============================================="
echo -e " ${GREEN}License Generation Complete${NC}"
echo "=============================================="
echo ""
echo "  Server IP:     $SERVER_IP"
echo "  Request file:  $WORK_DIR/1.dat"
echo "  License dest:  $LICENSE_DEST"
echo "  Product key:   $PRODUCT_KEY"
echo "  Portal:        $KEYGEN_URL"
echo ""
echo "  After installing the license, restart VOS3000:"
echo "    service vos3000d restart"
echo "=============================================="
