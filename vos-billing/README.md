# VOS3000 Billing Platform

A modern HTTPS web dashboard for managing the VOS3000 VoIP switch — account management, rate management, IP whitelist firewall, invoices, and more. Built with Next.js 16, React 19, and Tailwind CSS 4.

## Quick Deploy

```bash
curl -sSL https://raw.githubusercontent.com/eliasewu/vos-billing/main/vos-billing/install.sh | bash
```

## Quick Uninstall

```bash
curl -sSL https://raw.githubusercontent.com/eliasewu/vos-billing/main/vos-billing/uninstall.sh | bash
```

## Install VOS3000 Base

```bash
curl -sSL https://raw.githubusercontent.com/eliasewu/vos-billing/main/vos-billing/vos-install.sh | bash
```

---

## Features

### Dashboard
- Total revenue, pending billing, net profit — daily / monthly / yearly
- Top customers by billing with real customer names
- DB health check with warning banner
- Real-time connection status

### Account Management
- **General accounts** — standard VoIP customers with drag-and-drop type selection
- **PhoneCard accounts** — prepaid calling card accounts with suite tracking
- **Clearing accounts** — settlement/clearing accounts with billing cycles
- **Agent accounts** — agent management
- Gateway mapping, routing, rate group assignment
- Private rate group (feerategroupprivate_id) support

### Rate Management
- Rate groups with expand/collapse
- Bulk rate wizard with country → operator → prefix → area code flow
- Prefix → area code auto-fill from e_areacode (136K+ entries)
- Area code tooltips showing country and area name
- Quick-start wizard for client + supplier setup
- Bulk CSV import/export

### IP Whitelist Firewall
- IP + company name whitelist management
- Custom iptables chain (VOS_SIP_INPUT)
- Rate limiting per IP (calls-per-second, bandwidth)
- iptables availability detection with warning banner
- Only whitelisted IPs can send traffic

### Invoices
- Generate invoices with area code/prefix summaries
- PDF download with proper invoice format
- Email invoices to clients
- Auto-generation every Monday at 11:00 AM
- Usage summaries sent daily at 4:00 AM

### System Configuration
- Prefix database (e_areacode) — 127K+ entries with country + area names
- Bulk CSV import/export with drag-drop and 5-row preview
- CSV template download
- Pagination for large datasets
- Used-in-rates column
- SMTP configuration
- User management with VOS3000 auth

### Security
- JWT-based authentication
- Server-side middleware on all dashboard routes
- Login rate limiting (10 rapid attempts → 429, 5 failures → lockout)
- bcrypt password hashing
- CSP headers (script-src, style-src)
- Cache clearing on every logout

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (Turbopack) |
| UI | React 19 + Tailwind CSS 4 |
| Database | PostgreSQL (app data) + MySQL (VOS3000) |
| ORM | Drizzle ORM |
| Auth | JWT + bcrypt |
| Email | Nodemailer |
| PDF | jspdf |
| Spreadsheet | xlsx (SheetJS) |
| Charts | Recharts |
| Testing | Vitest + @vitest/coverage-v8 |
| Linting | ESLint 9 + typescript-eslint |

---

## Project Structure

```
vos-billing/
├── src/
│   ├── app/
│   │   ├── api/           # API routes (auth, VOS3000 proxy, stats, etc.)
│   │   ├── dashboard/     # All dashboard pages
│   │   └── login/         # Login page
│   ├── components/        # Reusable UI components
│   │   └── cdr/           # CDR analysis components
│   ├── db/                # Drizzle schema & connection
│   ├── lib/               # Shared utilities (auth, email, VOS DB, etc.)
│   └── scripts/           # CLI scripts (import, seed, etc.)
├── server.js              # Custom HTTPS server
├── install.sh             # One-line deploy script
├── uninstall.sh           # One-line uninstall script
├── vos-install.sh         # VOS3000 base installer
├── INSTALL_VOS3000.md     # Full VOS3000 installation guide
├── next.config.ts         # Next.js configuration
├── vitest.config.ts       # Test configuration
└── package.json           # Dependencies and scripts
```

---

## Development

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build
npm run build

# Run tests
npm run test            # vitest run
npm run test:watch      # vitest (watch mode)
npm run test:coverage   # vitest run --coverage

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/vos_billing
VOS_DB_HOST=127.0.0.1
VOS_DB_PORT=3306
VOS_DB_USER=root
VOS_DB_PASSWORD=
VOS_DB_NAME=vos3000
JWT_SECRET=<random-hex>
NODE_ENV=production
```

---

## Systemd Service

```bash
# Start
systemctl start vos-billing

# Stop
systemctl stop vos-billing

# Restart
systemctl restart vos-billing

# Status
systemctl status vos-billing

# Logs
journalctl -u vos-billing -f
```

---

## Server Info

| Attribute | Value |
|-----------|-------|
| IP | 51.161.47.101 |
| Dashboard | https://51.161.47.101:3443/dashboard |
| Login | admin / admin123 |
| VOS3000 UUID | 55000fed-2b31-40f9-bce6-fd8bf6225c2d |
| MySQL | VOS3000 database |
| Domain | net2app.com (pending) |

---

## License

Proprietary — All rights reserved.

## Author

**Elias Ewu**
- GitHub: [eliasewu](https://github.com/eliasewu)
- Email: elias.ewu@gmail.com
