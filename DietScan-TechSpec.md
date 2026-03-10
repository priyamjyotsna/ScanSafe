# DietScan — Complete Technical Specification
### Version 1.0 | For Kiro IDE Development

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [User Flow & Experience](#2-user-flow--experience)
3. [Authentication Strategy](#3-authentication-strategy)
4. [Tech Stack](#4-tech-stack)
5. [Project Folder Structure](#5-project-folder-structure)
6. [Database Schema (Prisma)](#6-database-schema-prisma)
7. [API Routes](#7-api-routes)
8. [Key Feature Specifications](#8-key-feature-specifications)
9. [Environment Variables](#9-environment-variables)
10. [Third-Party Integrations](#10-third-party-integrations)
11. [Development Phases](#11-development-phases)
12. [Open Questions & Future Scope](#12-open-questions--future-scope)

---

## 1. Product Overview

**DietScan** is a mobile-first web application that helps people with medical conditions make safe food choices while grocery shopping. A user enters their disease once, receives an AI-generated diet plan, and then uses their phone camera daily to scan food barcodes or ingredient labels to get an instant safe/caution/avoid verdict.

### Core Value Proposition
- Bridges the gap between a doctor's dietary advice and real grocery shopping decisions
- Works for any disease — AI handles the medical knowledge, no hardcoded database needed
- Instant verdict at the point of purchase — no reading labels manually

### Target Users
- Patients managing chronic conditions (diabetes, kidney disease, heart disease, liver conditions, cancer, etc.)
- Caregivers and family members shopping for patients
- Anyone following a medically prescribed diet

---

## 2. User Flow & Experience

### First-Time User Journey (Guest → Authenticated)

```
Launch App
    │
    ▼
[STEP 1] Disease Selection (one-time setup)
    │  - Single text input: "What condition are you managing?"
    │  - User types disease name
    │  - AI auto-suggests specific variants after 400ms debounce
    │  - User selects from suggestions or confirms custom input
    │
    ▼
[STEP 2] Diet Plan Review (one-time setup)
    │  - AI generates personalized diet plan for selected disease
    │  - Shows: Foods to Avoid / Recommended Foods / Nutrients to Watch
    │  - User can edit the plan (add/remove items)
    │  - Confirms and saves
    │
    ▼
[STEP 3] Scan Screen (daily use)
    │  - Camera viewfinder opens
    │  - User scans barcode OR points at ingredient list text
    │  - Processing spinner shown
    │
    ▼
[STEP 4] Verdict Screen
    │  - Large clear verdict: ✓ Safe / ⚠ Caution / ✗ Avoid
    │  - Product name, brand
    │  - Reason specific to user's disease
    │  - Nutrient breakdown
    │  - Tap "Scan Another" to return to Step 3
    │
    ▼ (First scan completed as guest)
    │
[GATE] Google Authentication Prompt
    │  - "Save your diet plan and scan history — sign in with Google"
    │  - Soft prompt, not a hard block wall
    │  - If user signs in: profile saved, scan history starts
    │  - If user skips: they can scan again but prompt reappears
```

### Returning User Journey

```
Launch App
    │
    ▼
Already authenticated + profile exists?
    │
    ├── YES → Go directly to Scan Screen (Step 3)
    │
    └── NO  → Go to Step 1 (Disease Selection)
```

---

## 3. Authentication Strategy

### Guest-First Approach

**The first scan requires zero authentication.** This is a deliberate friction-reduction strategy — let the user experience the core value before asking anything of them.

| Event | Auth Required | Action |
|-------|--------------|--------|
| App launch | No | Load app freely |
| Disease selection (Step 1) | No | Stored in browser localStorage temporarily |
| Diet plan review (Step 2) | No | Stored in browser localStorage temporarily |
| First scan + verdict | No | Full experience, no gate |
| Second scan attempt | Soft prompt | Show Google sign-in prompt with option to dismiss once |
| Third scan attempt | Hard gate | Must authenticate to continue |

### Post-Authentication Behavior
- Guest localStorage data (disease + diet plan) is **migrated to the database** upon first sign-in
- User never loses their setup work
- All future scans are saved to scan history

### NextAuth.js v5 Configuration
- Provider: Google OAuth 2.0
- Session strategy: JWT (stateless, works on Vercel edge)
- Callbacks: `signIn`, `session`, `jwt` to attach user database ID to session

---

## 4. Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Framework | Next.js | 14 (App Router) | Full-stack React framework |
| Language | TypeScript | 5.x | Type safety throughout |
| Styling | Tailwind CSS | 3.x | Mobile-first utility styling |
| Hosting | Vercel | — | Zero-config deployment |
| Database | Neon | PostgreSQL 16 | Serverless Postgres |
| ORM | Prisma | 5.x | Type-safe database access |
| Auth | NextAuth.js | v5 (beta) | Google OAuth |
| AI — Disease Suggest | OpenAI GPT-4o | latest | Real-time disease variant suggestions |
| AI — Diet Plan | OpenAI GPT-4o | latest | Personalized diet plan generation |
| AI — Ingredient OCR | OpenAI GPT-4o Vision | latest | Read ingredient text from camera image |
| Barcode Scanner | ZXing-js | 0.21.x | In-browser barcode/QR decoding |
| Food Database | Open Food Facts API | v2 | Product data from barcode lookup |
| HTTP Client | Native fetch | — | API calls (built into Next.js) |

### Why This Stack Works Together
- **Vercel + Next.js + Neon** — officially documented trio, near-zero DevOps
- **OpenAI handles three jobs** — disease suggestions, diet plan generation, ingredient OCR — no extra vendors or API keys
- **ZXing-js runs entirely in the browser** — no server round-trip for barcode decoding, instant results
- **Open Food Facts** — free, 3M+ products, strong Indian brand coverage, no rate limits
- **Prisma + Neon** — Prisma generates type-safe client from schema, Neon provides connection pooling for serverless

---

## 5. Project Folder Structure

```
dietscan/
├── prisma/
│   ├── schema.prisma              # Database schema
│   └── migrations/                # Auto-generated migration files
│
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── layout.tsx             # Root layout (fonts, providers)
│   │   ├── page.tsx               # Landing / redirect logic
│   │   │
│   │   ├── setup/                 # One-time setup flow (Steps 1 & 2)
│   │   │   ├── page.tsx           # Step 1: Disease selection
│   │   │   └── diet-plan/
│   │   │       └── page.tsx       # Step 2: Diet plan review & edit
│   │   │
│   │   ├── scan/                  # Daily use flow (Steps 3 & 4)
│   │   │   ├── page.tsx           # Step 3: Camera scan screen
│   │   │   └── result/
│   │   │       └── page.tsx       # Step 4: Verdict screen
│   │   │
│   │   ├── api/                   # API Route Handlers
│   │   │   ├── auth/
│   │   │   │   └── [...nextauth]/
│   │   │   │       └── route.ts   # NextAuth handler
│   │   │   │
│   │   │   ├── disease/
│   │   │   │   └── suggest/
│   │   │   │       └── route.ts   # POST: AI disease suggestions
│   │   │   │
│   │   │   ├── diet-plan/
│   │   │   │   ├── generate/
│   │   │   │   │   └── route.ts   # POST: Generate diet plan from disease
│   │   │   │   └── save/
│   │   │   │       └── route.ts   # POST: Save user's diet plan to DB
│   │   │   │
│   │   │   ├── scan/
│   │   │   │   ├── barcode/
│   │   │   │   │   └── route.ts   # POST: Lookup barcode → food data
│   │   │   │   ├── ingredients/
│   │   │   │   │   └── route.ts   # POST: OCR image → extract ingredients
│   │   │   │   └── verdict/
│   │   │   │       └── route.ts   # POST: Analyze food against diet plan
│   │   │   │
│   │   │   └── user/
│   │   │       └── profile/
│   │   │           └── route.ts   # GET/PUT: User profile management
│   │   │
│   │   └── (auth)/
│   │       └── signin/
│   │           └── page.tsx       # Custom sign-in page
│   │
│   ├── components/
│   │   ├── ui/                    # Reusable primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Chip.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   │
│   │   ├── disease/
│   │   │   ├── DiseaseSearchInput.tsx    # Typeahead with AI suggestions
│   │   │   └── SuggestionDropdown.tsx   # Suggestion list component
│   │   │
│   │   ├── diet-plan/
│   │   │   ├── DietPlanCard.tsx          # Full plan display
│   │   │   ├── FoodChipList.tsx          # Avoid/prefer chip lists
│   │   │   └── NutrientTargetGrid.tsx   # Nutrient limits grid
│   │   │
│   │   ├── scanner/
│   │   │   ├── BarcodeScanner.tsx        # ZXing-js camera component
│   │   │   ├── CameraViewfinder.tsx      # Camera UI overlay
│   │   │   └── ScanModeToggle.tsx        # Switch barcode ↔ ingredient mode
│   │   │
│   │   ├── verdict/
│   │   │   ├── VerdictBanner.tsx         # Safe/Caution/Avoid banner
│   │   │   ├── ProductCard.tsx           # Product info display
│   │   │   └── NutrientBreakdown.tsx     # Per-nutrient analysis
│   │   │
│   │   └── auth/
│   │       └── AuthPromptModal.tsx       # Soft/hard sign-in prompt
│   │
│   ├── lib/
│   │   ├── prisma.ts              # Prisma client singleton
│   │   ├── openai.ts              # OpenAI client singleton
│   │   ├── auth.ts                # NextAuth config
│   │   └── constants.ts           # App-wide constants
│   │
│   ├── hooks/
│   │   ├── useGuestState.ts       # localStorage guest data management
│   │   ├── useDiseaseSearch.ts    # Debounced disease search hook
│   │   └── useScanCount.ts        # Track guest scan count
│   │
│   ├── types/
│   │   ├── diet.ts                # DietPlan, FoodVerdict types
│   │   ├── scan.ts                # ScanResult, ProductData types
│   │   └── api.ts                 # API request/response types
│   │
│   └── utils/
│       ├── verdict.ts             # Verdict calculation logic
│       └── openFoodFacts.ts       # Open Food Facts API helpers
│
├── public/
│   ├── manifest.json              # PWA manifest
│   ├── icons/                     # App icons for home screen
│   └── sw.js                      # Service worker (optional, for offline)
│
├── .env.local                     # Local environment variables
├── .env.example                   # Template for env vars
├── next.config.ts                 # Next.js configuration
├── tailwind.config.ts             # Tailwind configuration
├── tsconfig.json                  # TypeScript configuration
└── package.json
```

---

## 6. Database Schema (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")  // Required for Neon + Prisma migrations
}

// ─── USER ────────────────────────────────────────────────────────────────────
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  image         String?
  googleId      String?   @unique
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  profile       UserProfile?
  scanHistory   ScanHistory[]

  @@map("users")
}

// ─── USER PROFILE ─────────────────────────────────────────────────────────────
// Stores the one-time setup: disease selection + diet plan
model UserProfile {
  id            String    @id @default(cuid())
  userId        String    @unique
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Disease (plain text string from AI suggestion)
  // Example: "Decompensated Liver Cirrhosis with Ascites"
  diseaseName   String

  // Diet plan stored as JSON — flexible for AI-generated structure
  // Structure: { avoid: string[], prefer: string[], watch: string[], nutrients: Record<string, string> }
  dietPlan      Json

  // Whether user has customized the AI-generated plan
  isCustomized  Boolean   @default(false)

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@map("user_profiles")
}

// ─── SCAN HISTORY ─────────────────────────────────────────────────────────────
// Optional but useful — saves every scan for history/analytics
model ScanHistory {
  id            String      @id @default(cuid())
  userId        String
  user          User        @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Product info
  productName   String?
  brand         String?
  barcode       String?

  // How was it scanned?
  scanMethod    ScanMethod  // BARCODE or INGREDIENT_OCR

  // The verdict
  verdict       Verdict     // SAFE, CAUTION, AVOID

  // Full reasoning stored as JSON
  // Structure: { reason: string, flaggedNutrients: string[], ingredients: string[] }
  verdictDetail Json?

  scannedAt     DateTime    @default(now())

  @@index([userId])
  @@index([scannedAt])
  @@map("scan_history")
}

// ─── ENUMS ────────────────────────────────────────────────────────────────────
enum ScanMethod {
  BARCODE
  INGREDIENT_OCR
}

enum Verdict {
  SAFE
  CAUTION
  AVOID
}
```

### Key Design Decisions

- **`diseaseName` is plain text** — not a foreign key. Stores the exact AI-confirmed string (e.g., "Type 2 Diabetes on Insulin Therapy"). This string is reused verbatim in every AI call.
- **`dietPlan` is JSON** — the AI-generated structure is flexible. Storing as JSON avoids a rigid relational schema for dynamic medical data.
- **`ScanHistory` is lightweight** — only verdict + product name + reason. Full nutrition data is not stored (fetched fresh on each scan from Open Food Facts).
- **No disease table** — we do not maintain a diseases database. All disease intelligence lives in the AI layer.

---

## 7. API Routes

### `POST /api/disease/suggest`
Accepts partial disease name, returns AI-generated specific variants.

**Request:**
```json
{ "query": "cirrhosis" }
```

**Response:**
```json
{
  "suggestions": [
    "Compensated Liver Cirrhosis",
    "Decompensated Liver Cirrhosis",
    "Decompensated Cirrhosis with Ascites",
    "Decompensated Cirrhosis with Hepatic Encephalopathy",
    "Alcoholic Liver Cirrhosis",
    "Primary Biliary Cirrhosis (PBC)",
    "NASH-related Liver Cirrhosis",
    "Wilson's Disease (Cirrhosis Stage)"
  ]
}
```

**OpenAI Prompt:**
> "The user is typing a medical condition: '[query]'. Return exactly 8 clinically specific disease variants or subtypes that are meaningful for dietary management. Each variant should be specific enough that a dietitian would give different nutritional advice for each. Consider stage, severity, complications, and etiology. Return only a JSON array of strings, no explanation."

---

### `POST /api/diet-plan/generate`
Accepts confirmed disease name, returns structured diet plan.

**Request:**
```json
{ "diseaseName": "Decompensated Liver Cirrhosis with Ascites" }
```

**Response:**
```json
{
  "dietPlan": {
    "avoid": ["High-sodium foods (>300mg/serving)", "Raw shellfish", "Alcohol (absolutely)"],
    "prefer": ["Soft-cooked vegetables", "Small frequent meals", "BCAA-rich foods"],
    "watch": ["Daily sodium < 1500mg total", "Fluid restriction if prescribed", "Protein quality over quantity"],
    "nutrients": {
      "Sodium": "< 300mg/serving",
      "Protein": "1.0–1.5g per kg body weight/day",
      "Fluid": "Per doctor's prescription"
    }
  }
}
```

---

### `POST /api/scan/barcode`
Accepts barcode string, returns product data from Open Food Facts.

**Request:**
```json
{ "barcode": "8901058852429" }
```

**Response:**
```json
{
  "found": true,
  "product": {
    "name": "Maggi 2-Minute Noodles",
    "brand": "Nestlé",
    "ingredients": ["Wheat flour", "Palm oil", "Salt", "Spice mix"],
    "nutrients": {
      "sodium": 870,
      "sugar": 2,
      "carbohydrates": 45,
      "fat": 7,
      "protein": 8,
      "fiber": 1,
      "saturatedFat": 3,
      "transFat": 0
    },
    "servingSize": "75g"
  }
}
```

---

### `POST /api/scan/ingredients`
Accepts base64 image, uses GPT-4o Vision to extract ingredients.

**Request:**
```json
{ "imageBase64": "data:image/jpeg;base64,..." }
```

**Response:**
```json
{
  "ingredients": ["Wheat flour", "Refined palm oil", "Salt", "Sugar", "Yeast extract"],
  "rawText": "Ingredients: Wheat flour, Refined palm oil..."
}
```

---

### `POST /api/scan/verdict`
Accepts product data + user's disease + diet plan, returns verdict.

**Request:**
```json
{
  "diseaseName": "Decompensated Liver Cirrhosis with Ascites",
  "dietPlan": { ... },
  "product": {
    "name": "Maggi 2-Minute Noodles",
    "ingredients": [...],
    "nutrients": { "sodium": 870, ... }
  }
}
```

**Response:**
```json
{
  "verdict": "AVOID",
  "reason": "Very high sodium (870mg per serving) is dangerous for cirrhosis with ascites. Sodium restriction is critical to manage fluid retention. This single serving would use 58% of your daily sodium limit.",
  "flaggedNutrients": ["sodium"],
  "safeAlternative": "Look for low-sodium rice noodles or plain rice instead."
}
```

**OpenAI Prompt Strategy:**
> "You are a clinical dietitian. A patient has [diseaseName]. Their diet rules are: [dietPlan]. Analyze this food product: [product data]. Return a JSON object with: verdict (SAFE/CAUTION/AVOID), reason (2-3 sentences specific to their condition and this product), flaggedNutrients (array of nutrient names that are problematic), safeAlternative (one practical suggestion if verdict is CAUTION or AVOID)."

---

### `GET /api/user/profile`
Returns authenticated user's disease and diet plan.

### `PUT /api/user/profile`
Updates user's diet plan after editing.

---

## 8. Key Feature Specifications

### 8.1 Disease Auto-Suggest

- **Trigger:** User types in the disease input field
- **Debounce:** 400ms after last keystroke before API call
- **Minimum characters:** 2
- **Results shown:** 6–8 suggestions in a dropdown
- **Handling misspellings:** GPT-4o handles naturally (e.g., "diabeties" still suggests diabetes variants)
- **Fallback:** If user types something not recognized medically, still allow them to proceed with their typed text
- **UI behavior:** Selecting a suggestion fills the input and highlights it as confirmed; user can still edit

### 8.2 Diet Plan Generation & Editing

- **Generated immediately** after disease confirmation (single API call, ~2–3 seconds)
- **Loading state:** Show skeleton UI while generating
- **Structure displayed:**
  - Foods to Avoid (red chips)
  - Recommended Foods (green chips)
  - Nutrients to Watch (text list)
  - Nutrient Targets (grid of key limits)
- **Edit mode:** Tap Edit button → chips become removable, Add buttons appear
- **Custom additions:** User can add their own items (doctor's specific instructions)
- **Save:** Confirmed plan saved to database (or localStorage for guests)
- **Medical disclaimer:** Always shown below plan

### 8.3 Barcode Scanner (ZXing-js)

- **Library:** `@zxing/library` (browser-based, no server needed)
- **Formats supported:** EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39, QR Code, DataMatrix
- **Camera access:** Uses browser `getUserMedia` API
- **iOS note:** Works on iOS 14.3+ in Safari — request camera permission cleanly
- **Flow:**
  1. Component mounts → request camera permission
  2. ZXing continuously decodes video frames
  3. On successful decode → stop camera → call `/api/scan/barcode`
  4. If barcode not found in Open Food Facts → offer "Scan Ingredient Label" fallback
- **Error states:** Camera denied, no camera found, barcode not in database

### 8.4 Ingredient OCR (GPT-4o Vision)

- **Trigger:** User taps "Scan Ingredient List" (either as primary mode or fallback)
- **Flow:**
  1. User taps capture button on camera
  2. Image captured as base64 JPEG
  3. Sent to `/api/scan/ingredients` with GPT-4o Vision
  4. Extracted ingredients list returned
  5. Ingredients immediately passed to `/api/scan/verdict`
- **Image quality guidance:** Show in-app tip "Make sure the text is well-lit and in focus"
- **Fallback:** If OCR fails, show manual text entry option

### 8.5 Verdict Display

- **Three states:**
  - ✓ **SAFE** — Green banner. "Good to eat."
  - ⚠ **CAUTION** — Amber banner. "Okay in moderation."
  - ✗ **AVOID** — Red banner. "Not recommended for your condition."
- **Each verdict includes:**
  - Product name and brand
  - 2–3 sentence reasoning specific to their disease
  - Flagged nutrients (highlighted in the nutrition breakdown)
  - Safe alternative suggestion (for Caution/Avoid)
- **Actions after verdict:**
  - "Scan Another" → returns to camera
  - "Save to History" → saves scan (requires auth)
  - Share button → copy verdict text

### 8.6 Authentication Gate

- **First scan:** No gate. Full experience.
- **After first scan (guest):** Show modal — "Sign in to save your diet plan across devices and track your scan history" — with Google sign-in button and "Maybe Later" option.
- **"Maybe Later" behavior:** Dismiss modal, allow one more scan.
- **After second scan (guest):** Hard gate — must sign in to scan again.
- **Guest scan count:** Tracked in localStorage key `dietscan_guest_scans`.
- **On sign-in:** Migrate localStorage data to database, delete localStorage keys.

---

## 9. Environment Variables

```bash
# .env.local

# Database (Neon)
DATABASE_URL="postgresql://user:pass@host/dietscan?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://user:pass@host/dietscan?sslmode=require"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-generated-secret"  # openssl rand -base64 32

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# OpenAI
OPENAI_API_KEY="sk-..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## 10. Third-Party Integrations

### OpenAI GPT-4o
- **Usage 1:** Disease auto-suggest (called on every keystroke debounce)
- **Usage 2:** Diet plan generation (called once per user setup)
- **Usage 3:** Ingredient OCR via Vision (called on each ingredient scan)
- **Usage 4:** Verdict analysis (called on each scan)
- **Cost control:** Set `max_tokens: 500` for suggestions, `max_tokens: 1000` for diet plan, `max_tokens: 300` for verdicts
- **Rate limiting:** Implement basic rate limiting on `/api/disease/suggest` — max 10 requests/minute per IP

### Open Food Facts API
- **Base URL:** `https://world.openfoodfacts.org/api/v2`
- **Barcode lookup:** `GET /product/{barcode}.json`
- **Fields requested:** `product_name`, `brands`, `ingredients_text`, `nutriments`
- **No API key required**
- **Response handling:** Map `nutriments.sodium_100g` to per-serving value using `serving_size`
- **Indian products:** Use `https://in.openfoodfacts.org` endpoint for better Indian product coverage

### ZXing-js
- **Package:** `@zxing/library`
- **Usage:** Client-side only (import with `dynamic` and `ssr: false` in Next.js)
- **Component:** Wrap in a React component that manages camera lifecycle
- **Cleanup:** Always call `codeReader.reset()` on component unmount to release camera

### Neon + Prisma
- **Connection:** Use `pgbouncer=true` in `DATABASE_URL` for connection pooling in serverless
- **Migrations:** Run `npx prisma migrate dev` locally, `npx prisma migrate deploy` in CI
- **Client:** Use singleton pattern in `src/lib/prisma.ts` to avoid connection exhaustion in development

---

## 11. Development Phases

### Phase 1 — Core MVP
- [ ] Project setup (Next.js, TypeScript, Tailwind, Prisma, Neon)
- [ ] Google Auth (NextAuth.js)
- [ ] Disease search input with AI auto-suggest
- [ ] Diet plan generation and display
- [ ] Barcode scanner (ZXing-js) + Open Food Facts lookup
- [ ] Verdict screen
- [ ] Guest mode (localStorage) with scan count gate

### Phase 2 — Polish & PWA
- [ ] PWA manifest + service worker
- [ ] "Add to Home Screen" prompt
- [ ] Ingredient OCR flow (GPT-4o Vision)
- [ ] Scan history page
- [ ] Loading skeletons and error states
- [ ] Diet plan editing (add/remove items)

### Phase 3 — Growth Features
- [ ] Safe alternative suggestions
- [ ] Weekly scan summary ("You avoided 8 risky foods this week")
- [ ] Share verdict as image
- [ ] Doctor prescription upload (PDF/image → AI extracts diet rules)
- [ ] Family/caregiver profiles (multiple users under one account)
- [ ] Regional food database improvements (Indian brands focus)

---

## 12. Open Questions & Future Scope

**Decided:**
- ✅ Single disease per user (not multi-disease)
- ✅ Mobile-first PWA (not native app)
- ✅ Guest gets one free scan before auth gate
- ✅ Open Food Facts for product database
- ✅ GPT-4o Vision for ingredient OCR

**For future discussion:**
- Should we add a "Doctor Mode" where doctors can push verified diet plans directly to patient accounts?
- Do we want to support offline scanning? (Would require caching diet plan in service worker)
- Should scan history be exportable (PDF report for doctor visits)?
- Monetization: Free tier (limited scans/month) vs. subscription for unlimited?
- Should we add a manual food name search for users who don't have a barcode?

---

## Quick Reference: Key Commands

```bash
# Setup
npx create-next-app@latest dietscan --typescript --tailwind --app
cd dietscan
npm install prisma @prisma/client
npm install next-auth@beta
npm install openai
npm install @zxing/library
npx prisma init

# Database
npx prisma migrate dev --name init
npx prisma generate
npx prisma studio   # Visual DB browser

# Development
npm run dev

# Deploy
vercel --prod
npx prisma migrate deploy   # Run in Vercel build command
```

---

*Document Version: 1.0 | Last Updated: March 2026*
*Built for Kiro IDE — DietScan Project*
