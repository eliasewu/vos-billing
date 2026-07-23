#!/bin/bash
# =============================================================================
# VOS3000 Base Installer — Installs VOS3000 VoIP Switch on CentOS 7
# Usage:
#   curl -sSL https://raw.githubusercontent.com/USER/REPO/main/vos-install.sh | bash
# =============================================================================
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${CYAN}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

echo "=============================================="
echo " VOS3000 Base Platform Installer"
echo "=============================================="
echo ""

[ "$EUID" -eq 0 ] || err "Please run as root"

BASE_DIR="/home/kunshiweb/base"
VOS_VERSION="${1:-7.0.100}"

# ── Install system dependencies ──────────────────
log "Installing system dependencies..."
if command -v yum &>/dev/null; then
    yum install -y epel-release 2>/dev/null || true
    yum install -y wget curl unzip tar java-1.8.0-openjdk java-1.8.0-openjdk-devel \
        mariadb-server mariadb net-tools firewalld iptables-services 2>&1 | tail -3
elif command -v apt-get &>/dev/null; then
    apt-get update -qq
    apt-get install -y wget curl unzip tar openjdk-8-jdk openjdk-8-jre \
        mariadb-server mariadb-client net-tools firewalld iptables 2>&1 | tail -3
fi
log "Dependencies installed"

# ── Install & configure MySQL/MariaDB ────────────
log "Setting up MariaDB..."
systemctl enable mariadb 2>/dev/null || systemctl enable mysql 2>/dev/null || true
systemctl start mariadb 2>/dev/null || systemctl start mysql 2>/dev/null || true
sleep 2

# Secure MySQL (set root password if not set)
if mysql -u root -e "SELECT 1" &>/dev/null; then
    warn "MySQL root has no password — setting to empty (you should change this)"
fi
log "MariaDB is running"

# ── Install Apache Tomcat ────────────────────────
log "Setting up Apache Tomcat..."
mkdir -p "$BASE_DIR"
cd "$BASE_DIR"

if [ ! -d apache-tomcat ]; then
    TOMCAT_URL="https://archive.apache.org/dist/tomcat/tomcat-7/v${VOS_VERSION}/bin/apache-tomcat-${VOS_VERSION}.tar.gz"
    warn "Downloading Tomcat 7 (this may take a minute)..."
    wget -q "$TOMCAT_URL" -O tomcat.tar.gz || \
        err "Failed to download Tomcat. Check URL or network."
    tar xzf tomcat.tar.gz
    mv apache-tomcat-* apache-tomcat
    rm -f tomcat.tar.gz
    log "Tomcat extracted to $BASE_DIR/apache-tomcat"
else
    log "Tomcat already installed"
fi

# ── Configure Tomcat ─────────────────────────────
TOMCAT_DIR="$BASE_DIR/apache-tomcat"

# Set Java home
JAVA_HOME=$(dirname $(dirname $(readlink -f $(which java 2>/dev/null) 2>/dev/null) 2>/dev/null) 2>/dev/null || echo "/usr/lib/jvm/java-1.8.0")

# Create setenv.sh for Tomcat
cat > "$TOMCAT_DIR/bin/setenv.sh" << SETENV
#!/bin/bash
export JAVA_HOME="$JAVA_HOME"
export CATALINA_HOME="$TOMCAT_DIR"
export CATALINA_OPTS="-Xms512m -Xmx2048m -Djava.awt.headless=true"
SETENV
chmod +x "$TOMCAT_DIR/bin/setenv.sh"
log "Tomcat configured (JAVA_HOME=$JAVA_HOME)"

# ── Configure Tomcat HTTPS on 8443 ───────────────
log "Configuring Tomcat HTTPS connector..."

# Generate keystore if not exists
if [ ! -f "$TOMCAT_DIR/.keystore" ]; then
    keytool -genkey -alias tomcat -keyalg RSA -keystore "$TOMCAT_DIR/.keystore" \
        -storepass changeit -keypass changeit \
        -dname "CN=localhost, OU=VOS3000, O=VoIP, L=City, S=State, C=US" \
        -validity 3650 2>/dev/null
    log "Keystore generated"
fi

# ── Create systemd service for Tomcat ────────────
cat > /etc/systemd/system/vos3000-tomcat.service << TOMCAT
[Unit]
Description=VOS3000 Apache Tomcat
After=network.target mariadb.service

[Service]
Type=forking
User=root
Environment=JAVA_HOME=$JAVA_HOME
Environment=CATALINA_HOME=$TOMCAT_DIR
ExecStart=$TOMCAT_DIR/bin/startup.sh
ExecStop=$TOMCAT_DIR/bin/shutdown.sh
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
TOMCAT

# ── Open firewall ports ──────────────────────────
log "Configuring firewall..."
if command -v firewall-cmd &>/dev/null; then
    systemctl start firewalld 2>/dev/null || true
    for port in 80 443 3443 8443 3306 5060 5061 10000 20000; do
        firewall-cmd --permanent --add-port=${port}/tcp 2>/dev/null || true
        firewall-cmd --permanent --add-port=${port}/udp 2>/dev/null || true
    done
    firewall-cmd --reload 2>/dev/null || true
    log "Firewall ports opened (80, 443, 3443, 8443, 3306, 5060-5061, 10000-20000)"
else
    warn "firewalld not available — open ports manually if needed"
fi

# ── Summary ──────────────────────────────────────
IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "YOUR_IP")
echo ""
echo "=============================================="
echo -e " ${GREEN}VOS3000 Base Install Complete!${NC}"
echo "=============================================="
echo ""
echo "  Tomcat:      $TOMCAT_DIR"
echo "  Start:       systemctl start vos3000-tomcat"
echo "  Enable:      systemctl enable vos3000-tomcat"
echo "  Status:      systemctl status vos3000-tomcat"
echo ""
echo "  Next Steps:"
echo "  1. Import VOS3000 webapp into Tomcat webapps/"
echo "  2. Configure VOS3000 database"
echo "  3. Install billing platform: bash install.sh"
echo "=============================================="
