# VOS3000 Billing Platform — Final Summary

**Date:** July 23, 2026  
**Server:** 51.161.47.101 (net2app.com)  
**GitHub:** https://github.com/eliasewu/vos-billing

---

## Server Status

| Service | Port | Auto-start | Status |
|---------|------|-----------|--------|
| `vos-billing` | 3443 (HTTPS) | ✅ systemd | Active |
| `vos3000d` | 5206, 8602 | ✅ init.d | Active |
| `mbx3000d` | — | ✅ init.d + rc.local | Active |
| `mysqld` | 3306 | ✅ init.d | Active |
| `postgresql` | 5432 | ✅ systemd | Active |
| `tomcat` | 8080 | ✅ init.d | Active |

All 6 services auto-start after reboot.

---

## One-Line Commands

```bash
# Deploy billing on any server:
curl -sSL https://raw.githubusercontent.com/eliasewu/vos-billing/main/vos-billing/install.sh | bash

# Deploy for net2app.com:
curl -sSL https://raw.githubusercontent.com/eliasewu/vos-billing/main/vos-billing/net2app-install.sh | bash

# Uninstall from any server:
curl -sSL https://raw.githubusercontent.com/eliasewu/vos-billing/main/vos-billing/uninstall.sh | bash

# Generate VOS3000 license key:
curl -sSL https://raw.githubusercontent.com/eliasewu/vos-billing/main/vos-billing/gen-license.sh | bash
```

---

## Key Fixes Applied

### React Error #31 (Dashboard Crashes)
**Root cause:** MySQL `mysql2` driver returns `{type:"Buffer", data:[...]}` objects that React can't render.  
**Fix:** Added Buffer detection to `sanitizeRow()` in `vos-db.ts` (protects all API routes), `deepSanitize()` in `utils.ts`, and error boundary at `dashboard/error.tsx`.  
**Status:** ✅ Verified — zero Buffer objects in API responses.

### Area Code Display (Prefix Database)
**Issue:** Area codes showing only country codes.  
**Fix:** Updated e_areacode with 136,829 entries in `"Country - AreaName"` format. Rate wizard auto-fills area codes from prefix lookup.  
**Status:** ✅ 136,829 area codes live.

### Prefix → Area Code Auto-Fill
**Added to:**
- Rate Wizard (`/dashboard/rates/wizard`)
- Main Rates Management page (`/dashboard/rates`)
- Area code tooltips showing country + area name

### IP Whitelist Firewall
- Custom iptables chain (`VOS_SIP_INPUT`)
- IP + company name management
- iptables availability detection

### Invoice System
- PDF generation with proper invoice format
- Area code/prefix summaries
- Email delivery
- Auto-generation: Mondays 11:00 AM
- Daily usage summaries: 4:00 AM

---

## Scripts Created

| Script | Purpose |
|--------|---------|
| `install.sh` | Full billing platform deploy (Node.js, Next.js, SSL, systemd) |
| `net2app-install.sh` | net2app.com focused deploy |
| `uninstall.sh` | Complete removal from any server |
| `vos-install.sh` | VOS3000 base installer |
| `gen-license.sh` | Automated license key generation (dat_7.unknown + ./85 + portal upload) |
| `deploy-from-server.sh` | Deploy pulling from 51.161.47.101 (no GitHub needed) |

---

## Documentation

| File | Content |
|------|---------|
| `README.md` | Full project overview, features, tech stack, dev setup |
| `INSTALL_VOS3000.md` | Step-by-step VOS3000 install + license generation guide |
| `docs/vos3000-configs/` | 10 reference config files (webserver.conf, server.xml, web.xml, etc.) |
| `docs/vos3000-configs/README.md` | Config reference guide with key parameters |

---

## Git Info

| Setting | Value |
|---------|-------|
| Username | `eliasewu` |
| Email | `elias.ewu@gmail.com` |
| Repo | `github.com/eliasewu/vos-billing` |
| Branch | `master` |

---

## VOS3000 Credentials

| Detail | Value |
|--------|-------|
| ACCESS_UUID | `55000fed-2b31-40f9-bce6-fd8bf6225c2d` |
| License | `/home/kunshi/license.dat` |
| Key Gen Portal | `http://136.244.103.214:6069/elias` |
| Key Gen User | `elias` |
| Product Key | `564f53333030303231383058` |
| Domain | `net2app.com` (DNS pending) |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (Turbopack) |
| UI | React 19 + Tailwind CSS 4 |
| App DB | PostgreSQL + Drizzle ORM |
| VOS3000 DB | MySQL (mysql2 driver) |
| Auth | JWT + bcrypt + rate limiting |
| Email | Nodemailer |
| PDF | jspdf |
| Charts | Recharts |
| SSL | Self-signed (Let's Encrypt pending for net2app.com) |

---

## Pending Tasks

- [ ] Point net2app.com DNS to 51.161.47.101
- [ ] Set up Let's Encrypt SSL for net2app.com
- [ ] Apply `deepSanitize` to remaining VOS3000 API routes
- [ ] Run full vitest test suite
