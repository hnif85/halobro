# HaloBro CRM — Project Plan

> **Platform Name:** HaloBro CRM
> **Created:** 14 May 2026
> **Stack:** Next.js 16 (App Router) + Supabase + Damcorp WhatsApp Business API

---

## Overview

HaloBro CRM adalah platform CRM untuk kirim WA broadcast ke customer dari tabel `cms_customers`, tracking engagement (sent/delivered/read/replied), dan lihat sales history per customer dalam satu halaman yang terintegrasi dengan campaign.

---

## Tech Stack

- **Frontend:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4
- **Backend:** Next.js API Routes
- **Database:** Supabase (Postgres) — project: `udupiblnzlzjmaafvdtv`
- **WA Provider:** Damcorp WhatsApp Business API (`waba.damcorp.id`)
- **Auth:** JWT session cookie (`crm_session`) + `crm_users` table
- **Fonts:** Geist (Next.js built-in)
- **Animations:** Framer Motion + CSS custom easing
- **Icons:** Lucide React

### Dependencies

```
@supabase/ssr        # Supabase server-side client (cookie-based)
framer-motion        # Animation library
lucide-react        # Icon library
clsx               # Conditional className utility
```

---

## Design System — HaloBro

### Visual Language

Dark-first aesthetic. Bukan pitch black — warm-tinted darks. Gen-Z vibes: bold accents, glassmorphism subtle, micro-interactions that feel alive.

### Color Tokens (CSS Variables)

```css
--bg-base:       #0d0d0f   /* Halaman utama */
--bg-surface:    #141416   /* Card, panel */
--bg-elevated:   #1c1c1f   /* Elevated surface */
--bg-hover:      #222226   /* Hover state */
--border:        rgba(255,255,255,0.07)
--border-active: rgba(255,255,255,0.12)

--accent-violet: #7c3aed   /* Primary accent */
--accent-violet-dim: rgba(124,58,237,0.15)
--accent-lime:   #84cc16   /* Success / secondary pop */
--accent-red:    #ef4444   /* Error / failed */
--accent-amber:  #f59e0b   /* Warning / pending */

--text-primary:  #f4f4f5
--text-secondary:#a1a1aa
--text-muted:    #71717a

--ease-out:      cubic-bezier(0.23, 1, 0.32, 1)
--ease-in-out:   cubic-bezier(0.77, 0, 0.175, 1)
--ease-drawer:   cubic-bezier(0.32, 0.72, 0, 1)
```

### Typography

| Element | Style |
|--------|-------|
| Page title | `text-2xl font-semibold tracking-tight` |
| Card heading | `text-lg font-semibold` |
| Body | `text-sm text-zinc-300` |
| Muted | `text-xs text-zinc-500` |
| Large numbers | `text-4xl font-bold tabular-nums` |

### Animation Principles (Emil Kowalski)

1. **Never animate keyboard-initiated actions**
2. **UI animations < 300ms** — aim 150-250ms
3. **Use `ease-out` for entering elements**
4. **Buttons must have `:active` press feedback** (`scale(0.97)`, 160ms)
5. **No `scale(0)` entry** — start from `scale(0.95)` with opacity 0
6. **Stagger list items** 30-80ms delay between each
7. **Only animate `transform` and `opacity`** for GPU acceleration
8. **Sidebar expand/collapse**: 200ms `cubic-bezier(0.32, 0.72, 0, 1)`
9. **Skeletons**: shimmer gradient (not pulse opacity)
10. **Reduced motion**: respect `prefers-reduced-motion`

---

## Database Schema

### Existing Tables Used

#### `cms_customers` — Sumber kontak
```
guid             text (PK)
full_name        text
email            text
phone_number     text
city             text
country          text
status           text
is_active        varchar
is_email_verified   bool
is_phone_number_verified bool
created_at       timestamptz
gender           text
birth_date       date
subscribe_list   jsonb
```

#### `crm_campaigns` — Campaign blast
```
id               int8 (PK)
name             text
message_type     text        ('template' | 'text')
segment_id       int8        → crm_segments.id
template_name    text
template_lang    text
template_components_json jsonb
text_body        text
status           text        ('draft' | 'scheduled' | 'sending' | 'done' | 'failed')
created_at       timestamptz
updated_at       timestamptz
```

#### `crm_campaign_recipients` — Tracking per-penerima *(perlu 2 kolom baru)*
```
id               int8 (PK)
campaign_id      int8        → crm_campaigns.id
customer_guid    text        → cms_customers.guid
phone_number     text
wa_message_id    text        (Damcorp wamid, Nullable)
send_status      text        ('pending'|'sent'|'delivered'|'read'|'failed')
provider_response_json jsonb
error_message    text
sent_at          timestamptz
delivered_at     timestamptz
read_at          timestamptz
replied_at       timestamptz  ← BARU
reply_text       text         ← BARU
failed_at        timestamptz
created_at       timestamptz
```

#### `crm_segments` — Segmentasi customer
```
id               int8 (PK)
name             text
filters_json     jsonb
created_by       text
created_at       timestamptz
updated_at       timestamptz
```

#### `wa_templates` — Template WA tersimpan
```
id               uuid (PK)
name             varchar     (Damcorp template name, Unique)
display_name     varchar
segmen           varchar
content          text
variables        jsonb
damcorp_status   varchar
is_active        bool
created_by       uuid
created_at       timestamptz
updated_at       timestamptz
```

#### `wa_messages` — Pesan individual (agent/helpdesk)
```
id               uuid (PK)
pipeline_id      uuid        → crm_lead_pipeline.id
agent_id         uuid
direction       varchar     ('inbound' | 'outbound')
type             varchar
content          text
template_id      uuid
damcorp_message_id varchar   (Unique — untuk webhook matching)
status           varchar
status_updated_at timestamptz
sent_at          timestamptz
```

#### `transactions` — Sales history
```
guid             text (PK)
customer_guid    text        → cms_customers.guid
invoice_number   text
status           text        ('pending'|'paid'|'failed'|'refunded')
grand_total      numeric
payment_channel_name text
created_at       timestamptz
```

#### `transaction_details` — Detail item transaksi
```
guid             text (PK)
transaction_guid text        → transactions.guid
product_name     text
product_price    numeric
qty              int4
grand_total      numeric
```

#### `crm_users` — Auth users
```
id               int8 (PK)
email            text (Unique)
password_hash    text        (bcrypt $2b$10$...)
name             text
role             text        ('super_admin'|'crm'|'partnership')
is_active        bool
created_at       timestamptz
last_login       timestamptz
```

#### `crm_webhook_events` — Raw webhook log
```
id               int8 (PK)
provider         text
event_type       text
external_event_id text
payload_json     jsonb
process_status   text        ('received'|'processed'|'failed')
error_message   text
received_at      timestamptz
processed_at     timestamptz
```

### DB Migration Required

```sql
-- Tambah kolom untuk tracking balasan di crm_campaign_recipients
ALTER TABLE crm_campaign_recipients
  ADD COLUMN replied_at timestamptz,
  ADD COLUMN reply_text text;
```

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://udupiblnzlzjmaafvdtv.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_SUPABASE_SERVICE_KEY=eyJ...

DAMCORP_BASIC_AUTH=
DAMCORP_USERNAME=trial14_91333
DAMCORP_PASSWORD=DQA_/zg5?z;...
DAMCORP_TEST_PHONE=6281119591333
DAMCORP_WEBHOOK_VERIFY_TOKEN=trial14_helpdesk_webhook_token

JWT_SECRET=7f3k9mXpQ2vRwL8nYdA5sT1uE6hB0cJ4iG
```

---

## Application Routes

```
app/
  (auth)/
    login/
      page.tsx                      # Login page

  (dashboard)/
    layout.tsx                       # Sidebar + auth guard shell
    dashboard/
      page.tsx                      # Overview dashboard
    campaigns/
      page.tsx                      # List semua campaign
      new/
        page.tsx                    # Buat campaign + pilih recipients
      [id]/
        page.tsx                     # Campaign detail — sent/read/replied/balas

    customers/
      page.tsx                      # List cms_customers + filter
      [guid]/
        page.tsx                     # Profile + sales history + campaign history

  api/
    auth/
      login/route.ts                # POST — verify bcrypt, set JWT cookie
      logout/route.ts               # POST — clear session cookie
      me/route.ts                   # GET — get current user from session

    campaigns/
      route.ts                      # GET list, POST create
      [id]/route.ts                 # GET detail + recipients
      [id]/send/route.ts            # POST — blast WA via Damcorp API

    customers/
      route.ts                      # GET list dengan filter & pagination
      [guid]/route.ts               # GET profile + transactions + campaign history

    webhook/
      damcorp/route.ts              # POST — Damcorp webhook (public, verify token)
```

---

## File Structure

```
app/
  (auth)/
    login/page.tsx
  (dashboard)/
    layout.tsx                     # sidebar shell + auth check
    dashboard/page.tsx
    campaigns/
      page.tsx
      new/page.tsx
      [id]/page.tsx
    customers/
      page.tsx
      [guid]/page.tsx
  api/...

components/
  ui/
    sidebar.tsx                    # Collapsible nav sidebar
    stat-card.tsx                  # Animated stat card (glassmorphism)
    stat-card-skeleton.tsx
    campaign-row.tsx               # Campaign list item with progress bar
    customer-row.tsx
    badge.tsx                      # Status badge (pill + dot indicator)
    progress-bar.tsx               # Inline read-rate bar
    button.tsx                     # Styled button with press feedback
    input.tsx                      # Styled input
    skeleton.tsx                   # Shimmer skeleton
    table.tsx                      # Styled table wrapper
    card.tsx                       # Glassmorphism card
    toast.tsx                      # Sonner-compatible toast
    avatar.tsx                     # Initials avatar
    tabs.tsx                       # Tab switcher

lib/
  supabase.ts                      # createServerSupabaseClient + createBrowserSupabaseClient
  supabase-admin.ts               # Service-role client (for admin ops)
  auth.ts                         # JWT sign/verify, set/get session cookie
  waba.ts                         # Damcorp API wrapper

middleware.ts                      # Protect /dashboard/*, /campaigns/*, /customers/*, /api/* (except /api/webhook/damcorp)

tailwind.config.ts                # Extended with HaloBro design tokens
```

---

## API Endpoints Detail

### Auth

#### `POST /api/auth/login`
```json
// Request
{ "email": "crm@mwx.com", "password": "..." }

// Response 200
{ "user": { "id": 3, "email": "crm@mwx.com", "name": "CRM Agent", "role": "crm" } }

// Response 401
{ "error": "Invalid credentials" }
```

#### `POST /api/auth/logout`
```json
// Response 200
{ "success": true }
```

#### `GET /api/auth/me`
```json
// Response 200
{ "user": { "id": 3, "email": "...", "name": "...", "role": "..." } }

// Response 401
{ "error": "Unauthorized" }
```

### Campaigns

#### `GET /api/campaigns`
```json
// Query params: ?status=sending&limit=20&offset=0
// Response 200
{ "campaigns": [...], "total": 45 }
```

#### `POST /api/campaigns`
```json
// Request
{
  "name": "Promo Ramadan",
  "message_type": "template",
  "template_name": "promo_ramadan",
  "template_lang": "id",
  "template_components_json": { "body": [{ "text": "Hai {{1}}" }] },
  "text_body": "Hai ...",
  "segment_id": 1
}
// Response 201
{ "campaign": { "id": 5, "name": "Promo Ramadan", ... } }
```

#### `GET /api/campaigns/[id]`
```json
// Response 200
{
  "campaign": { ... },
  "stats": {
    "total": 150,
    "sent": 145,
    "delivered": 130,
    "read": 89,
    "replied": 23
  },
  "recipients": [
    {
      "id": 1,
      "customer_guid": "...",
      "full_name": "Budi Santoso",
      "phone_number": "62812...",
      "send_status": "replied",
      "sent_at": "...",
      "delivered_at": "...",
      "read_at": "...",
      "replied_at": "...",
      "reply_text": "Oo siap mbak!"
    }
  ]
}
```

#### `POST /api/campaigns/[id]/send`
```json
// Request
{ "recipient_guids": ["guid1", "guid2", ...] }
// Response 202
{ "status": "sending", "queued": 150 }
```

### Customers

#### `GET /api/customers`
```json
// Query params: ?search=budi&status=active&has_transaction=true&min_spend=100000&limit=20&offset=0
// Response 200
{ "customers": [...], "total": 1234 }
```

#### `GET /api/customers/[guid]`
```json
// Response 200
{
  "profile": { /* cms_customers row */ },
  "transactions": [ /* transactions + details */ ],
  "campaign_history": [
    {
      "campaign_id": 3,
      "campaign_name": "Promo Ramadan",
      "send_status": "read",
      "sent_at": "...",
      "reply_text": "..."
    }
  ]
}
```

### Webhook

#### `POST /api/webhook/damcorp`

Damcorp sends two types of payloads:

**1. Status update (sent/delivered/read):**
```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "<WABA_ID>",
    "changes": [{
      "value": {
        "statuses": [{
          "id": "<wamid>",
          "status": "delivered",
          "timestamp": "..."
        }]
      }
    }]
  }]
}
```

**2. Incoming message (reply):**
```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{
          "from": "62812...",
          "id": "<wamid>",
          "type": "text",
          "text": { "body": "Oo siap mbak!" }
        }]
      }
    }]
  }]
}
```

Processing logic:
1. Save raw to `crm_webhook_events`
2. If status update: find `wa_message_id` in `crm_campaign_recipients`, update `delivered_at` or `read_at`
3. If incoming: match `from` to `phone_number` in `crm_campaign_recipients` where `replied_at IS NULL`, update `replied_at` + `reply_text`

---

## Damcorp WABA API Reference

### Endpoints

| Method | URL | Purpose |
|--------|-----|---------|
| POST | `https://waba.damcorp.id/v2/users/login` | Get Bearer token |
| POST | `https://waba.damcorp.id/v2/messages` | Send template/non-template message |
| POST | `https://waba.damcorp.id/v2/media` | Upload media |
| GET | `https://waba.damcorp.id/v2/media/<id>` | Download media |

### Auth Flow

```typescript
// Login
const credentials = Base64(`${DAMCORP_USERNAME}:${DAMCORP_PASSWORD}`)
const res = await fetch('https://waba.damcorp.id/v2/users/login', {
  headers: { Authorization: `Basic ${credentials}` }
})
const { users: [{ token }] } = await res.json()
// Use token for all subsequent requests: Authorization: Bearer <token>
```

### Send Template Message

```json
POST https://waba.damcorp.id/v2/messages
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "628XXXXXXXXXX",
  "type": "template",
  "template": {
    "name": "template_name",
    "language": { "code": "id" },
    "components": [
      { "type": "body", "parameters": [{ "type": "text", "text": "Budi" }] }
    ]
  }
}
```

Response:
```json
{
  "messaging_product": "whatsapp",
  "contacts": [{ "input": "628...", "wa_id": "628..." }],
  "messages": [{ "id": "wamid.xxx" }]  // simpan sebagai wa_message_id
}
```

### Error Handling

Key error codes:
- `131047` — Re-engagement Needed (24h window expired) → use template
- `131026` — Message Undeliverable (number not on WA)
- `131048` — Spam Rate Limit
- `130429` — Rate Limit Hit (throughput cap)
- `131056` — Pair Rate Limit (too many to same number)

---

## Feature Details

### 1. Authentication

- Login via `crm_users.email` + `crm_users.password_hash` (bcrypt)
- JWT token signed with `JWT_SECRET`, stored in httpOnly cookie `crm_session`
- Middleware protects all dashboard routes
- Webhook endpoint is public — verified by `DAMCORP_WEBHOOK_VERIFY_TOKEN`
- Session expires: 7 days

### 2. Dashboard Overview

- Total customers (`cms_customers`)
- Campaign hari ini — total sent
- Read rate % — (read / delivered) * 100
- Replied rate % — (replied / delivered) * 100
- Recent campaigns (5 terbaru)
- Activity feed — 10 pesan terbaru (sent/delivered/read/replied)

### 3. Campaign List

- Filter by status: All / Draft / Sending / Done / Failed
- Kolom: Nama, Type, Recipients, Sent/Delivered/Read/Replied, Created, Status
- Quick stats inline (mini progress bar read rate)
- Klik row → ke Campaign Detail

### 4. New Campaign — 4 Step Flow

**Step 1 — Define Audience**
- Filter by `cms_customers.status`, `is_active`
- Filter by transaction: `has_bought`, `min_spend`, `last_purchase`
- Preview count: "147 customers match"
- Manual tick individual dari tabel

**Step 2 — Choose Template**
- Dropdown dari `wa_templates` (yang `is_active = true`)
- Preview template content + variable placeholders
- Kalau `message_type = text`, textarea untuk `text_body`

**Step 3 — Review**
- Summary: "147 recipients", "Template: promo_ramadan"
- List preview recipients (max 10)
- Tombol "Save as Draft" dan "Send Campaign"

**Step 4 — Send**
- Insert semua `crm_campaign_recipients` dengan status `pending`
- Loop kirim ke Damcorp API dengan rate limiting (2 req/detik)
- Update `send_status` + `wa_message_id` per row
- Update `crm_campaigns.status = 'sending'` → `'done'`

### 5. Campaign Detail — Single Page

**Tab: Overview**
- Header: Campaign name, created date, status badge
- Stats cards: Total / Sent / Delivered / Read / Replied

**Tab: Recipients**
- Tabel searchable + filterable
- Kolom: Name, Phone, Status, sent_at, delivered_at, read_at, replied_at, reply_text
- Filter chips: All / Sent / Delivered / Read / Replied / Failed
- Export CSV

**Tab: Performance**
- Read rate over time
- Top replied messages
- Failed recipients list

### 6. Customers Page

- Tabel `cms_customers`: Name, Phone, Email, City, Status, Transaction Count, Total Spend
- Search by name/phone
- Filter: Status, Active, Transaction
- Sort: Name A-Z, Total Spend, Recent
- Pagination
- Klik row → ke Customer Detail

### 7. Customer Detail — Single Page

**Section 1: Profile Card**
- Avatar (initials), Name, Phone (WA link), Email
- Status badge, Gender, Birth date, Created date

**Section 2: Campaign History**
- Tabel campaign yang pernah dikirim
- Kolom: Campaign name, Sent at, Status, Reply text

**Section 3: Sales History**
- Tabel `transactions` + `transaction_details`
- Kolom: Invoice, Date, Items, Grand Total, Payment Channel, Status
- Summary: Total spend, Total orders, Last purchase date

---

## Implementation Priority

### Phase 1 — Foundation
1. Install dependencies
2. Design system (globals.css, layout)
3. Supabase client + auth lib
4. Login page + auth API
5. Middleware route protection
6. Dashboard layout (sidebar)

### Phase 2 — Core CRM
7. Dashboard page (mock data dulu)
8. Customers list page + API
9. Customer detail page + API
10. Campaigns list page + API
11. New campaign page (create only)
12. Campaign detail page + API

### Phase 3 — WA Integration
13. DB migration (replied_at + reply_text)
14. Damcorp WABA lib (waba.ts)
15. Blast send API + rate limiting
16. Webhook endpoint + processing
17. Real-time update (campaign detail polling)

### Phase 4 — Polish
18. Animations (Framer Motion stagger, number counter)
19. Skeleton loading states
20. Error handling + toast notifications
21. Export CSV
22. Reduced motion support

---

## Open Questions

1. [x] Auth — pakai `crm_users` yang sudah ada
2. [x] Tracking balasan — `replied_at` + `reply_text` di `crm_campaign_recipients`
3. [x] Segmentasi customer — transaksi + status + manual select
4. [x] Campaign send timing — tombol Send terpisah
5. [x] Damcorp credentials — `DAMCORP_USERNAME` + `DAMCORP_PASSWORD`
6. [ ] Webhook verify token — `DAMCORP_WEBHOOK_VERIFY_TOKEN` sudah ada, tapi perlu dicek cara Damcorp mengirimnya
7. [ ] Rate limit Damcorp — berapa req/detik yang aman? (asumsi 2 req/detik)
8. [ ] Customer phone normalization — format di `cms_customers.phone_number` sudah konsisten `62...` atau perlu normalisasi?