# Damcorp WhatsApp Business API — Developer Reference

> **Base URLs**
> - Messaging: `https://waba.damcorp.id/v2`
> - Template Management: `https://graph.damcorp.id`
>
> **Provider:** PT Dam Korporindo Digital | **Doc Version:** 1.0 (29 July 2024)

---

## Table of Contents

1. [Authentication — Get Token](#1-authentication--get-token)
2. [Template Management](#2-template-management)
   - [Create Template](#21-create-template)
   - [Template Components](#22-template-components)
   - [Get Template](#23-get-template)
3. [Send Template Messages](#3-send-template-messages)
   - [Text-Based](#31-text-based-message-templates)
   - [Media-Based](#32-media-based-message-templates)
   - [Interactive (Buttons)](#33-interactive-message-templates)
   - [Authentication OTP](#34-authentication-templates)
   - [Catalog](#35-catalog-template-messages)
   - [Carousel](#36-carousel-templates)
   - [Limited-Time Offer](#37-limited-time-offer-templates)
   - [Flow Template](#38-flow-template)
4. [Send Non-Template Messages](#4-send-non-template-messages)
   - [Text](#41-text)
   - [Document](#42-document)
   - [Image](#43-image)
   - [Video](#44-video)
   - [Interactive CTA URL Button](#45-interactive-call-to-action-url-button)
   - [Flow Message](#46-flow-messages)
   - [Interactive List](#47-interactive-list-messages)
   - [Interactive Reply Buttons](#48-interactive-reply-buttons-messages)
   - [Location](#49-location-messages)
5. [Media](#5-media)
   - [Upload Media](#51-upload-media)
   - [Download Media](#52-download-media)
6. [Webhooks](#6-webhooks)
7. [Error Codes](#7-error-codes)

---

## 1. Authentication — Get Token

```
POST https://waba.damcorp.id/v2/users/login
Authorization: Basic <base64-credentials>
```

**cURL:**
```bash
curl --location --request POST 'https://waba.damcorp.id/v2/users/login' \
  --header 'Authorization: Basic ebbbbbQ=='
```

**Response 200:**
```json
{
  "users": [
    {
      "token": "eyJ0eXAiOiJKV1Q...",
      "expires_after": "2023-11-15T03:28:25.696Z"
    }
  ],
  "meta": {
    "version": "1.5.06"
  }
}
```

**Response 401:** Empty body — credentials invalid.

> Use the returned `token` as `Bearer <token>` in all subsequent requests.

---

## 2. Template Management

### 2.1 Create Template

```
POST https://graph.damcorp.id/message_templates
Authorization: Bearer <token>
Content-Type: application/json
```

**Limits:**
- Template name: max 512 characters
- Template content: max 1024 characters

**Request Body:**
```json
{
  "name": "order_confirmation",
  "category": "UTILITY",
  "language": "id",
  "components": [<COMPONENTS>]
}
```

| Field | Type | Required | Values |
|-------|------|----------|--------|
| `name` | String | ✅ | Lowercase, underscores, max 512 chars |
| `category` | Enum | ✅ | `MARKETING` \| `UTILITY` \| `AUTHENTICATION` |
| `language` | Enum | ✅ | `id`, `en_US`, etc. |
| `components` | Array | ✅ | See [Template Components](#22-template-components) |

**Response:**
```json
{
  "id": "572279198452421",
  "status": "PENDING",
  "category": "UTILITY"
}
```

| Status | Meaning |
|--------|---------|
| `PENDING` | Under review — category agreed |
| `REJECTED` | Category disagreement |
| `APPROVED` | Auto-approved (Authentication + OTP only) |

---

### 2.2 Template Components

Templates are built from component objects inside the `components` array.

#### HEADER (optional)

Max **1 header** per template. Supports text, image, video, or document.

**Text Header:**
```json
{
  "type": "HEADER",
  "format": "TEXT",
  "text": "Our {{1}} is on!",
  "example": {
    "header_text": ["Summer Sale"]
  }
}
```
- Max 60 characters. Supports **1 variable**.

**Media Header (IMAGE / VIDEO / DOCUMENT):**
```json
{
  "type": "HEADER",
  "format": "IMAGE",
  "example": {
    "header_handle": ["4::aW..."]
  }
}
```
- `format`: `IMAGE` | `VIDEO` | `DOCUMENT`
- `header_handle`: Upload via Resumable Upload API first.

---

#### BODY (required)

Max **1 body** per template. Text only.

```json
{
  "type": "BODY",
  "text": "Hi {{1}}, your order {{2}} is confirmed!",
  "example": {
    "body_text": [
      ["John", "ORD-9912"]
    ]
  }
}
```
- Max 1024 characters. Supports **multiple variables** `{{1}}`, `{{2}}`, etc.
- `example.body_text`: array of arrays — one set of values per variable.

---

#### FOOTER (optional)

Max **1 footer** per template. Text only, no variables.

```json
{
  "type": "FOOTER",
  "text": "Use the buttons below to manage your subscription"
}
```
- Max 60 characters.

---

#### BUTTONS (optional)

Up to **10 buttons** total per template. Mix of types allowed with grouping rules.

**Phone Number Button** (max 1):
```json
{
  "type": "PHONE_NUMBER",
  "text": "Call",
  "phone_number": "6281234567890"
}
```
- `text`: max 25 chars | `phone_number`: max 20 chars

**URL Button** (max 2):
```json
{
  "type": "URL",
  "text": "Shop Now",
  "url": "https://example.com/shop?promo={{1}}",
  "example": ["https://example.com/shop?promo=SUMMER23"]
}
```
- `url`: max 2000 chars, supports **1 variable** appended to end.
- `example` required if URL contains a variable.

**Quick Reply Button** (max 10):
```json
{
  "type": "QUICK_REPLY",
  "text": "Unsubscribe"
}
```
- `text`: max 25 chars.

> **Grouping Rule:** Quick Reply and non-Quick Reply buttons must not be interleaved.
> - ✅ `[QR, QR, URL, Phone]`
> - ✅ `[URL, Phone, QR, QR]`
> - ❌ `[QR, URL, QR]`

---

### 2.3 Get Template

```bash
curl --location \
  'https://graph.damcorp.id/message_templates?name=your_template_name' \
  --header 'Authorization: Bearer <token>'
```

---

## 3. Send Template Messages

All template messages share the same base endpoint and structure:

```
POST https://waba.damcorp.id/v2/messages
Authorization: Bearer <token>
Content-Type: application/json
```

**Standard Response (all types):**
```json
{
  "messaging_product": "whatsapp",
  "contacts": [{ "input": "628xxx", "wa_id": "628xxx" }],
  "messages": [{ "id": "wamid.xxx" }]
}
```

---

### 3.1 Text-Based Message Templates

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "628XXXXXXXXXX",
  "type": "template",
  "template": {
    "name": "your_template_name",
    "language": { "code": "id" },
    "components": [
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "Budi" },
          { "type": "currency", "currency": { "fallback_value": "Rp 150.000", "code": "IDR", "amount_1000": 150000000 } },
          { "type": "date_time", "date_time": { "fallback_value": "1 Agustus 2024" } }
        ]
      }
    ]
  }
}
```

---

### 3.2 Media-Based Message Templates

Includes a `header` component with media. Use uploaded `id` (recommended) or `link`.

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "628XXXXXXXXXX",
  "type": "template",
  "template": {
    "name": "promo_dengan_gambar",
    "language": { "code": "id" },
    "components": [
      {
        "type": "header",
        "parameters": [
          {
            "type": "image",
            "image": { "link": "https://example.com/banner.jpg" }
          }
        ]
      },
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "Diskon 50%" }
        ]
      }
    ]
  }
}
```

---

### 3.3 Interactive Message Templates

Adds button components (quick_reply or CTA).

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "628XXXXXXXXXX",
  "type": "template",
  "template": {
    "name": "order_confirm_with_buttons",
    "language": { "code": "id" },
    "components": [
      {
        "type": "header",
        "parameters": [{ "type": "image", "image": { "link": "https://example.com/img.jpg" } }]
      },
      {
        "type": "body",
        "parameters": [{ "type": "text", "text": "Pesanan Anda" }]
      },
      {
        "type": "button",
        "sub_type": "quick_reply",
        "index": "0",
        "parameters": [{ "type": "payload", "payload": "CONFIRM_YES" }]
      },
      {
        "type": "button",
        "sub_type": "quick_reply",
        "index": "1",
        "parameters": [{ "type": "payload", "payload": "CONFIRM_NO" }]
      }
    ]
  }
}
```

---

### 3.4 Authentication Templates

Used for OTP / verification codes. The OTP value must appear **twice** in the payload.

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "628XXXXXXXXXX",
  "type": "template",
  "template": {
    "name": "verification_code",
    "language": { "code": "id" },
    "components": [
      {
        "type": "body",
        "parameters": [{ "type": "text", "text": "847291" }]
      },
      {
        "type": "button",
        "sub_type": "url",
        "index": "0",
        "parameters": [{ "type": "text", "text": "847291" }]
      }
    ]
  }
}
```

| Field | Notes |
|-------|-------|
| OTP value | Max 15 characters, must appear twice |
| `sub_type` | Must be `url` for the copy-code button |

---

### 3.5 Catalog Template Messages

Sends a product catalog with a thumbnail.

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "628XXXXXXXXXX",
  "type": "template",
  "template": {
    "name": "intro_catalog_offer",
    "language": { "code": "id" },
    "components": [
      {
        "type": "body",
        "parameters": [{ "type": "text", "text": "100" }]
      },
      {
        "type": "button",
        "sub_type": "CATALOG",
        "index": 0,
        "parameters": [
          {
            "type": "action",
            "action": { "thumbnail_product_retailer_id": "2lc20305pt" }
          }
        ]
      }
    ]
  }
}
```

> Omit `thumbnail_product_retailer_id` to use the first item in your catalog as thumbnail.

---

### 3.6 Carousel Templates

Sends a scrollable card carousel. Each card can have a header (image/video), body, and buttons.

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "628XXXXXXXXXX",
  "type": "template",
  "template": {
    "name": "summer_carousel_promo",
    "language": { "code": "id" },
    "components": [
      {
        "type": "BODY",
        "parameters": [{ "type": "TEXT", "text": "20OFF" }]
      },
      {
        "type": "CAROUSEL",
        "cards": [
          {
            "card_index": 0,
            "components": [
              {
                "type": "HEADER",
                "parameters": [{ "type": "IMAGE", "image": { "id": "24230790383178626" } }]
              },
              {
                "type": "BODY",
                "parameters": [{ "type": "text", "text": "Produk A" }]
              },
              {
                "type": "BUTTON",
                "sub_type": "QUICK_REPLY",
                "index": "0",
                "parameters": [{ "type": "PAYLOAD", "payload": "CARD_0_YES" }]
              }
            ]
          }
          // tambahkan card berikutnya di sini
        ]
      }
    ]
  }
}
```

**Key properties:**

| Property | Type | Notes |
|----------|------|-------|
| `card_index` | Integer | 0-based index of card in carousel |
| `HEADER` type | `IMAGE` or `VIDEO` | Use uploaded media `id` |
| Card body limit | 160 chars | Variables allowed |
| Message bubble limit | 1024 chars | |

---

### 3.7 Limited-Time Offer Templates

Shows a countdown offer with optional copy-code button.

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "628XXXXXXXXXX",
  "type": "template",
  "template": {
    "name": "limited_time_offer_flash",
    "language": { "code": "id" },
    "components": [
      {
        "type": "header",
        "parameters": [{ "type": "image", "image": { "id": "1602186516975000" } }]
      },
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "Budi" },
          { "type": "text", "text": "FLASH50" }
        ]
      },
      {
        "type": "limited_time_offer",
        "parameters": [
          {
            "type": "limited_time_offer",
            "limited_time_offer": { "expiration_time_ms": 1698562800000 }
          }
        ]
      },
      {
        "type": "button",
        "sub_type": "copy_code",
        "index": 0,
        "parameters": [{ "type": "coupon_code", "coupon_code": "FLASH50" }]
      },
      {
        "type": "button",
        "sub_type": "url",
        "index": 1,
        "parameters": [{ "type": "text", "text": "n3mtql" }]
      }
    ]
  }
}
```

> `expiration_time_ms`: UNIX timestamp in **milliseconds**.
> `offer_code`: max 15 characters.
> If using copy_code button, URL button index must be `1`; otherwise `0`.

---

### 3.8 Flow Template

Triggers a WhatsApp Flow from a template message.

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "628XXXXXXXXXX",
  "type": "template",
  "template": {
    "name": "registration_flow",
    "language": { "code": "id" },
    "components": [
      {
        "type": "button",
        "sub_type": "flow",
        "index": "0",
        "parameters": [
          {
            "type": "action",
            "action": {
              "flow_token": "my-unique-token-123",
              "flow_action_data": {
                "prefill_name": "Budi"
              }
            }
          }
        ]
      }
    ]
  }
}
```

---

## 4. Send Non-Template Messages

> ⚠️ Non-template messages can only be sent within the **24-hour customer service window** (after a user messages you first).

```
POST https://waba.damcorp.id/v2/messages
Authorization: Bearer <token>
Content-Type: application/json
```

---

### 4.1 Text

Max **4096 characters**.

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "628XXXXXXXXXX",
  "type": "text",
  "text": {
    "preview_url": true,
    "body": "Halo! Ini link produk terbaru kami: https://mwxmarket.ai"
  }
}
```

| Parameter | Type | Required | Notes |
|-----------|------|----------|-------|
| `body` | String | ✅ | Max 4096 chars, supports URLs |
| `preview_url` | Boolean | ❌ | `true` to render URL preview card |

---

### 4.2 Document

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "628XXXXXXXXXX",
  "type": "document",
  "document": {
    "id": "430519053060512",
    "caption": "Invoice Bulan Ini",
    "filename": "invoice-juli-2024.pdf"
  }
}
```

| Parameter | Required | Notes |
|-----------|----------|-------|
| `id` | ✅ (or `link`) | Uploaded media ID (recommended) |
| `link` | ✅ (or `id`) | Public URL (not recommended) |
| `caption` | ❌ | Caption text |
| `filename` | ❌ | Shown in chat; determines file icon |

---

### 4.3 Image

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "628XXXXXXXXXX",
  "type": "image",
  "image": {
    "id": "1479537139650973",
    "caption": "Promo spesial hari ini!"
  }
}
```

| Parameter | Required | Notes |
|-----------|----------|-------|
| `id` | ✅ (or `link`) | Uploaded media ID |
| `link` | ✅ (or `id`) | Public image URL |
| `caption` | ❌ | Max 1024 chars |

---

### 4.4 Video

Displays thumbnail preview; user taps to play.

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "628XXXXXXXXXX",
  "type": "video",
  "video": {
    "id": "1166846181421424",
    "caption": "Tutorial penggunaan CreateWhiz"
  }
}
```

---

### 4.5 Interactive Call-to-Action URL Button

Sends a message with a single URL button (non-template).

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "628XXXXXXXXXX",
  "type": "interactive",
  "interactive": {
    "type": "cta_url",
    "header": { "type": "text", "text": "Cek Jadwal Kami" },
    "body": { "text": "Tap tombol di bawah untuk melihat jadwal tersedia." },
    "footer": { "text": "Jadwal bisa berubah sewaktu-waktu." },
    "action": {
      "name": "cta_url",
      "parameters": {
        "display_text": "Lihat Jadwal",
        "url": "https://mwxmarket.ai/schedule"
      }
    }
  }
}
```

| Parameter | Required | Notes |
|-----------|----------|-------|
| `header` | ❌ | Text header only |
| `body.text` | ✅ | Message body |
| `footer` | ❌ | Footer text |
| `display_text` | ✅ | Button label text |
| `url` | ✅ | Opens in device browser |

---

### 4.6 Flow Messages

Sends an interactive WhatsApp Flow.

```json
{
  "recipient_type": "individual",
  "messaging_product": "whatsapp",
  "to": "628XXXXXXXXXX",
  "type": "interactive",
  "interactive": {
    "type": "flow",
    "header": { "type": "text", "text": "Daftar Sekarang" },
    "body": { "text": "Isi formulir pendaftaran di bawah ini." },
    "footer": { "text": "Diproses dalam 1x24 jam" },
    "action": {
      "name": "flow",
      "parameters": {
        "flow_message_version": "3",
        "flow_token": "AQAAAAACS5FpgQ_cAAAAAD0QI3s.",
        "flow_id": "1234567890",
        "flow_cta": "Daftar",
        "flow_action": "navigate",
        "flow_action_payload": {
          "screen": "REGISTRATION_SCREEN",
          "data": {
            "product_name": "CreateWhiz Basic"
          }
        }
      }
    }
  }
}
```

**Flow parameters:**

| Parameter | Required | Notes |
|-----------|----------|-------|
| `flow_message_version` | ✅ | Must be `"3"` |
| `flow_id` | ✅ | WhatsApp Flow ID |
| `flow_token` | ✅ | Business-generated session identifier |
| `flow_cta` | ✅ | Button text, max 20 chars, no emoji |
| `flow_action` | ❌ | `navigate` (default) or `data_exchange` |
| `flow_action_payload.screen` | ✅ (if navigate) | ID of first screen |
| `flow_action_payload.data` | ❌ | Pre-fill data for first screen |
| `mode` | ❌ | `draft` or `published` (default) |

---

### 4.7 Interactive List Messages

Up to **10 sections**, **10 rows each**.

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "628XXXXXXXXXX",
  "type": "interactive",
  "interactive": {
    "type": "list",
    "header": { "type": "text", "text": "Pilih Paket" },
    "body": { "text": "Paket mana yang sesuai kebutuhan Anda?" },
    "footer": { "text": "Harga sudah termasuk PPN" },
    "action": {
      "button": "Lihat Paket",
      "sections": [
        {
          "title": "Paket Bisnis",
          "rows": [
            { "id": "basic", "title": "CreateWhiz Basic", "description": "Rp 99.000/bulan" },
            { "id": "pro", "title": "CreateWhiz Pro", "description": "Rp 199.000/bulan" }
          ]
        },
        {
          "title": "Paket Enterprise",
          "rows": [
            { "id": "enterprise", "title": "MWX Enterprise", "description": "Hubungi sales" }
          ]
        }
      ]
    }
  }
}
```

**Limits:**

| Element | Max chars | Max count |
|---------|-----------|-----------|
| `button` text | 20 | 1 |
| `body.text` | 4096 | — |
| `footer.text` | 60 | — |
| `header.text` | 60 | — |
| Section `title` | 24 | 10 sections |
| Row `title` | 24 | 10 rows/section |
| Row `description` | 72 | — |
| Row `id` | 200 | — |

**Webhook when user selects a row:**
```json
{
  "type": "interactive",
  "interactive": {
    "type": "list_reply",
    "list_reply": {
      "id": "basic",
      "title": "CreateWhiz Basic",
      "description": "Rp 99.000/bulan"
    }
  }
}
```

---

### 4.8 Interactive Reply Buttons Messages

Up to **3 quick-reply buttons**.

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "628XXXXXXXXXX",
  "type": "interactive",
  "interactive": {
    "type": "button",
    "header": { "type": "text", "text": "Konfirmasi Pesanan" },
    "body": { "text": "Pesanan #ORD-9912 siap dikirim. Konfirmasi alamat Anda?" },
    "footer": { "text": "MWX Market — AI untuk UMKM" },
    "action": {
      "buttons": [
        { "type": "reply", "reply": { "id": "confirm-yes", "title": "Ya, Benar" } },
        { "type": "reply", "reply": { "id": "confirm-change", "title": "Ubah Alamat" } },
        { "type": "reply", "reply": { "id": "confirm-cancel", "title": "Batalkan" } }
      ]
    }
  }
}
```

| Parameter | Max chars | Notes |
|-----------|-----------|-------|
| `body.text` | 1024 | Supports emoji, markdown, links |
| `footer.text` | 60 | Supports emoji, markdown |
| Button `title` | 20 | — |
| Button `id` | 256 | Returned in webhook |

**Header types supported:** `text`, `image`, `video`, `document`

**Webhook when user taps a button:**
```json
{
  "type": "interactive",
  "interactive": {
    "type": "button_reply",
    "button_reply": {
      "id": "confirm-yes",
      "title": "Ya, Benar"
    }
  }
}
```

---

### 4.9 Location Messages

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "628XXXXXXXXXX",
  "type": "location",
  "location": {
    "latitude": "-6.2088",
    "longitude": "106.8456",
    "name": "Kantor MWX Indonesia",
    "address": "Jl. Sudirman, Jakarta Selatan"
  }
}
```

| Parameter | Required | Notes |
|-----------|----------|-------|
| `latitude` | ✅ | Decimal degrees string |
| `longitude` | ✅ | Decimal degrees string |
| `name` | ❌ | Location display name |
| `address` | ❌ | Location address |

---

## 5. Media

### 5.1 Upload Media

```
POST https://waba.damcorp.id/v2/media
Authorization: Bearer <token>
Content-Type: <mime-type>
Body: binary file data
```

**Supported formats & limits:**

| Type | Formats | Max Size |
|------|---------|----------|
| Image | JPEG, PNG | 5 MB |
| Video | MP4, 3GP | 16 MB |
| Audio | AAC, AMR, MP3, MP4, OGG | 16 MB |
| Document | PDF, DOC, DOCX, XLSX, PPTX, TXT | 100 MB |
| Sticker (static) | WEBP | 100 KB |
| Sticker (animated) | WEBP | 500 KB |

**Example — Upload PNG:**
```bash
curl --location 'https://waba.damcorp.id/v2/media' \
  --header 'Content-Type: image/png' \
  --header 'Authorization: Bearer {{TOKEN}}' \
  --data '@/path/to/image.png'
```

**Content-Type per format:**

| Format | Content-Type |
|--------|-------------|
| JPEG | `image/jpeg` |
| PNG | `image/png` |
| MP4 video | `video/mp4` |
| 3GP | `video/3gpp` |
| PDF | `application/pdf` |
| DOCX | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| XLSX | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| PPTX | `application/vnd.openxmlformats-officedocument.presentationml.presentation` |
| DOC | `application/msword` |
| TXT | `text/plain` |
| MP3 | `audio/mpeg` |
| AAC | `audio/aac` |
| OGG | `audio/ogg` |
| WEBP | `image/webp` |

**Response:**
```json
{
  "media": [{ "id": "1016777836662184" }],
  "meta": { "version": "1.5.12" }
}
```

> Use the returned `id` in message payloads instead of URL links for better reliability.

---

### 5.2 Download Media

```bash
curl --location 'https://waba.damcorp.id/v2/media/<MEDIA_ID>' \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer {{TOKEN}}'
```

Returns the binary file with a `200 OK` response.

---

## 6. Webhooks

Webhooks are triggered by user interactions. Typical payload structure:

```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "<WABA_ID>",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "display_phone_number": "628xxx",
          "phone_number_id": "106540352242922"
        },
        "contacts": [{ "profile": { "name": "User Name" }, "wa_id": "628xxx" }],
        "messages": [{ /* message object */ }]
      },
      "field": "messages"
    }]
  }]
}
```

**Message types you may receive:**

| `type` | `interactive.type` | Trigger |
|--------|--------------------|---------|
| `text` | — | User sends a text |
| `interactive` | `list_reply` | User selects from list |
| `interactive` | `button_reply` | User taps reply button |
| `interactive` | `nfm_reply` | User submits a Flow |

---

## 7. Error Codes

**Error response structure:**
```json
{
  "error": {
    "message": "(#130429) Rate limit hit",
    "type": "OAuthException",
    "code": 130429,
    "error_data": {
      "messaging_product": "whatsapp",
      "details": "Cloud API message throughput has been reached"
    },
    "fbtrace_id": "Az8..."
  }
}
```

> Build error handling around `code`, not HTTP status or `error_subcode`.

### Authorization Errors

| Code | Name | HTTP | Solution |
|------|------|------|----------|
| 0 | AuthException | 401 | Access token expired/invalid — refresh token |
| 3 | API Method | 500 | Check app permissions |
| 10 | Permission Denied | 403 | Verify token permissions |
| 190 | Access Token Expired | 401 | Get a new access token |
| 200–299 | API Permission | 403 | Check app permissions |

### Throttling Errors

| Code | Name | HTTP | Solution |
|------|------|------|----------|
| 4 | API Too Many Calls | 400 | Reduce API call frequency |
| 80007 | Rate Limit Issues | 400 | Reduce message frequency |
| 130429 | Rate Limit Hit | 400 | Reduce send frequency (throughput cap) |
| 131048 | Spam Rate Limit | 400 | Check quality status in WA Manager |
| 131056 | Pair Rate Limit | 400 | Too many messages to same number — wait |
| 133016 | Register/Deregister Limit | 400 | Too many registration attempts — wait |

### Integrity Errors

| Code | Name | HTTP | Solution |
|------|------|------|----------|
| 368 | Policy Violation Block | 403 | Review Policy Enforcement docs |
| 131031 | Account Locked | 403 | Verify 2FA PIN; review policy violations |

### Common Message Errors

| Code | Name | Solution |
|------|------|----------|
| 100 | Invalid Parameter | Check parameter names and values |
| 131000 | Unknown Error | Retry; open support ticket if persists |
| 131008 | Missing Required Parameter | Check required fields in request |
| 131026 | Message Undeliverable | Recipient not on WA, old version, or ToS not accepted |
| 131047 | Re-engagement Needed | 24h window expired — send a template instead |
| 131051 | Unsupported Message Type | Use a supported message type |
| 132000 | Template Param Count Mismatch | Match variable count with template definition |
| 132001 | Template Does Not Exist | Verify template name, language, and approval status |
| 132015 | Template Paused | Improve template quality rating |
| 132016 | Template Disabled | Create a new template |

