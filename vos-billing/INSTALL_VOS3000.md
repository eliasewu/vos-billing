# VOS3000 VoIP Switch — Installation Guide

Complete step-by-step guide to install VOS3000 on CentOS 7.

---

## Prerequisites

- CentOS 7 (minimal install)
- Root access
- At least 4GB RAM, 20GB disk
- Public IP address
- `vos30002185(1).tar.gz` installer archive
- `dat_7.unknown` license key generator

---

## Step 1: Setup CentOS 7 Repositories

CentOS 7 reached end-of-life; use vault mirrors:

```bash
# Remove existing MySQL if present
yum remove mysql -y
yum remove mysql-libs -y

# Set CentOS vault repositories
cat <<EOF > /etc/yum.repos.d/CentOS-Base.repo
[base]
name=CentOS-7.9.2009 - Base
baseurl=http://vault.centos.org/7.9.2009/os/x86_64/
gpgcheck=1
gpgkey=http://vault.centos.org/7.9.2009/os/x86_64/RPM-GPG-KEY-CentOS-7
enabled=1

[updates]
name=CentOS-7.9.2009 - Updates
baseurl=http://vault.centos.org/7.9.2009/updates/x86_64/
gpgcheck=1
gpgkey=http://vault.centos.org/7.9.2009/updates/x86_64/RPM-GPG-KEY-CentOS-7
enabled=1
EOF

# Install basic utilities
yum install -y htop wget
yum install -y net-tools
```

---

## Step 2: Install VOS3000

```bash
# Upload vos30002185(1).tar.gz to /root/ (use SCP or SFTP)
# Then extract and install:

cd /root
tar -xvzf vos30002185\(1\).tar.gz
cd vos30002185/
chmod 777 install.sh
./install.sh
```

The installer will deploy:
- Java runtime (bundled)
- MySQL database (VOS3000 schema)
- Tomcat web server
- VOS3000 core services
- Web management interface

**Default paths after install:**
| Component | Path |
|-----------|------|
| VOS3000 root | `/home/kunshi/vos3000/` |
| Web apps | `/home/kunshi/vos3000/webapps/` or `/home/kunshi/base/apache-tomcat/webapps/` |
| Config | `/home/kunshi/vos3000/etc/server.conf` |
| Binaries | `/home/kunshi/vos3000/bin/` |

---

## Step 3: Generate License Key

### 3a. Upload key generator

```bash
# Upload dat_7.unknown to /root/
chmod 777 /root/dat_7.unknown
```

### 3b. Generate license request file

```bash
cd /root
./dat_7.unknown > 1.dat
```

### 3c. Sign the license request

```bash
# Replace x.x.x.x with your server's actual public IP
./85 1.dat x.x.x.x 0 0 0 en_us 564f53333030303231383058
```

This creates a signed `1.dat` file with your server IP and the VOS3000 product key `564f53333030303231383058`.

### 3d. Upload to Key Generator Portal

Go to: **http://136.244.103.214:6069/elias**

| Field | Value |
|-------|-------|
| Username | `elias` |
| Password | `eli@01234@#el` |

Upload the `1.dat` file. The portal returns a signed license file.

### 3e. Install the license

```bash
# Download the license file from the portal
# Place it at:
cp license.dat /home/kunshi/license.dat
# or
cp license.dat /home/kunshi/vos3000/license.dat
```

### 3f. Verify ACCESS_UUID

```bash
grep "ACCESS_UUID" /home/kunshi/vos3000/etc/server.conf
```

Example output: `ACCESS_UUID=55000fed-2b31-40f9-bce6-fd8bf6225c2d`

---

## Step 4: Verify Installation

```bash
# Check VOS3000 services are running
netstat -tulnp | grep -E "java|vos|tomcat|apache"

# Expected ports:
#   8080 — Tomcat HTTP
#   5206 — VOS3000 core service
#   8602 — VOS3000 management service

# Check web interface
curl http://localhost:8080/
```

---

## Step 5: Access the VOS3000 Web Interface

| Interface | URL | Purpose |
|-----------|-----|---------|
| Admin Panel | `http://YOUR_IP:8080/admin` | System administration |
| Customer Portal | `http://YOUR_IP:8080/customer` | End-customer self-service |
| Management | `http://YOUR_IP:8080/manage` | Operations management |

**Default credentials:** Check VOS3000 documentation or contact your vendor.

---

## Step 6: Deploy the Billing Platform

Once VOS3000 is running, deploy the billing web platform:

```bash
# One-line deploy from GitHub:
curl -sSL https://raw.githubusercontent.com/eliasewu/vos-billing/main/vos-billing/install.sh | bash
```

The billing platform provides:
- Modern HTTPS dashboard on port 3443
- Account management (General / PhoneCard / Clearing)
- Rate management with bulk wizard and prefix → area code auto-fill
- Quick-start wizard for client + supplier setup
- IP whitelist firewall with iptables integration
- Invoice generation with PDF download and email
- SMS gateway configuration
- Dashboard analytics with billing summaries

---

## Troubleshooting

### MySQL not starting
```bash
systemctl start mysqld
systemctl enable mysqld
```

### Tomcat not starting
```bash
cd /home/kunshi/base/apache-tomcat/bin/
./startup.sh
```

### Port conflicts
```bash
netstat -tulnp | grep -E "8080|5206|8602|3306"
kill -9 <PID>  # if needed
```

### License invalid
- Verify the server IP matches the license
- Check `ACCESS_UUID` in `/home/kunshi/vos3000/etc/server.conf`
- Re-generate the license with the correct IP

---

## Server: 51.161.47.101

| Component | Port | Status |
|-----------|------|--------|
| VOS3000 Core | 5206 | Running |
| VOS3000 Mgmt | 8602 | Running |
| VOS3000 Web | 8080 | Tomcat webapps |
| Billing Platform | 3443 (HTTPS) | Running |
| MySQL | 3306 | Running |
| ACCESS_UUID | `55000fed-2b31-40f9-bce6-fd8bf6225c2d` | Active |

---

## Support

- GitHub: https://github.com/eliasewu/vos-billing
- Email: elias.ewu@gmail.com
