# DietScan (ScanSafe) — Complete Project Documentation

**Version**: 1.0  
**Last Updated**: March 10, 2026  
**Repository**: https://github.com/priyamjyotsna/ScanSafe  
**Live URL**: https://scan-safe.vercel.app

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [System Architecture](#3-system-architecture)
4. [User Flow](#4-user-flow)
5. [Database Schema](#5-database-schema)
6. [API Reference](#6-api-reference)
7. [Key Features](#7-key-features)
8. [Component Architecture](#8-component-architecture)
9. [Project Structure](#9-project-structure)
10. [Environment Setup](#10-environment-setup)
11. [Development Workflow](#11-development-workflow)
12. [Testing Strategy](#12-testing-strategy)
13. [Deployment Guide](#13-deployment-guide)
14. [Security](#14-security)
15. [Performance Optimization](#15-performance-optimization)
16. [Troubleshooting](#16-troubleshooting)
17. [Future Enhancements](#17-future-enhancements)

---

## 1. Project Overview

**DietScan (ScanSafe)** is a mobile-first Progressive Web App (PWA) that helps people with medical conditions make safe food choices while grocery shopping.

### Core Value Proposition

Bridges the gap between doctor's dietary advice and real grocery shopping decisions by providing:
- Instant product analysis via barcode or ingredient scanning
- AI-generated personalized diet plans
- Clear safe/caution/avoid verdicts
- Disease-specific nutritional guidance

### Target Users

- Patients managing chronic conditions (diabetes, hypertension, kidney disease, liver conditions, cancer, etc.)
- Caregivers and family members shopping for patients
- Anyone following medically prescribed diets

### Key Features

- 🔍 **AI-Powered Disease Search**: Intelligent suggestions for specific disease variants with 400ms debounce
- 🎯 **Personalized Diet Plans**: AI-generated plans tailored to your condition with editing capabilities
- 📱 **Barcode Scanner**: Instant product analysis using phone camera (ZXing-js)
- 📸 **Ingredient OCR**: Scan ingredient labels when barcodes aren't available (GPT-4o Vision)
- ✅ **Smart Verdicts**: Clear safe/caution/avoid ratings with detailed reasoning
- 📊 **Scan History**: Track all scans and decisions (authenticated users)
- 👥 **Multi-Disease Support**: Manage multiple conditions with quick switching
- 🚀 **Guest Mode**: Try the app without signing in (up to 3 scans)
- 🔄 **Data Migration**: Seamless migration from guest to authenticated state

---

## 2. Tech Stack

### Frontend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.2.35 | Full-stack React framework with App Router |
| React | 18 | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.4.1 | Utility-first styling |

### Backend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js API Routes | 14.2.35 | RESTful API endpoints |
| Prisma ORM | 7.4.2 | Type-safe database access |
| Neon PostgreSQL | 16 | Serverless PostgreSQL database |
| NextAuth.js | 5.0.0-beta.30 | Authentication (Google OAuth) |

### AI & External Services

| Service | Model/Version | Purpose |
|---------|---------------|---------|
| OpenAI GPT-4o | latest | Disease suggestions, diet plan generation |
| OpenAI GPT-4o-mini | latest | Verdict analysis (cost optimization) |
| OpenAI GPT-4o Vision | latest | Ingredient OCR from images |
| Open Food Facts API | v2 | Product database (3M+ products) |
| ZXing-js | 0.21.3 | Client-side barcode scanning |

### Testing & Quality

| Technology | Version | Purpose |
|------------|---------|---------|
| Vitest | 4.0.18 | Unit and integration testing |
| React Testing Library | 16.3.2 | Component testing |
| fast-check | 4.5.3 | Property-based testing |
| ESLint | 8.x | Code linting |
| TypeScript | 5.x | Static type checking |

### Deployment & Infrastructure

| Service | Purpose |
|---------|---------|
| Vercel | Hosting and deployment |
| GitHub | Version control and CI/CD |
| Neon | Database hosting |

### Why This Stack?

- **Vercel + Next.js + Neon**: Officially documented trio, near-zero DevOps
- **OpenAI handles three jobs**: Disease suggestions, diet plan generation, ingredient OCR — no extra vendors
- **ZXing-js runs in browser**: No server round-trip for barcode decoding, instant results
- **Open Food Facts**: Free, 3M+ products, strong Indian brand coverage, no rate limits
- **Prisma + Neon**: Type-safe client from schema, connection pooling for serverless

---

## 3. System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (Browser)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   React UI   │  │  ZXing-js    │  │  localStorage│      │
│  │  Components  │  │   Scanner    │  │  (Guest Data)│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Next.js App (Vercel)                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              App Router Pages                         │   │
│  │  /setup → /setup/diet-plan → /scan → /scan/result   │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  API Routes                           │   │
│  │  /api/disease/suggest                                 │   │
│  │  /api/diet-plan/generate                              │   │
│  │  /api/scan/barcode                                    │   │
│  │  /api/scan/ingredients                                │   │
│  │  /api/scan/verdict                                    │   │
│  │  /api/user/profile                                    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   OpenAI     │    │ Open Food    │    │    Neon      │
│   GPT-4o     │    │    Facts     │    │  PostgreSQL  │
│              │    │     API      │    │              │
└──────────────┘    └──────────────┘    └──────────────┘
```

### Data Flow Diagrams

#### 1. Disease Selection Flow
```
User Input → Debounce (400ms) → /api/disease/suggest → OpenAI GPT-4o
→ Return 8 suggestions → User selects → Store in state
```

#### 2. Diet Plan Generation Flow
```
Disease Name → /api/diet-plan/generate → OpenAI GPT-4o
→ Generate structured plan → Return JSON → Display & allow editing
→ Save to DB (authenticated) or localStorage (guest)
```

#### 3. Barcode Scan Flow
```
Camera → ZXing-js decode → Barcode string → /api/scan/barcode
→ Open Food Facts lookup → Product data → /api/scan/verdict
→ OpenAI analysis → Verdict → Display result
```

#### 4. Ingredient OCR Flow
```
Camera → Capture image → Base64 encode → /api/scan/ingredients
→ GPT-4o Vision OCR → Extract ingredients → /api/scan/verdict
→ OpenAI analysis → Verdict → Display result
```

### Authentication Flow

```
Guest User (localStorage)
    │
    ├─ First scan: Full experience, no gate
    │
    ├─ After scan: Soft prompt (dismissible)
    │
    ├─ Second scan: Soft prompt again
    │
    └─ Third scan attempt: Hard gate (must sign in)
         │
         ▼
    Google OAuth (NextAuth.js)
         │
         ▼
    Migrate localStorage → Database
         │
         ▼
    Authenticated User (full features)
```

---

## 4. User Flow

### First-Time User Journey

```
1. Launch App
   ↓
2. Disease Selection (/setup)
   - Search for condition
   - AI suggests 8 specific variants
   - Select or confirm custom input
   ↓
3. Diet Plan Review (/setup/diet-plan)
   - AI generates personalized plan
   - Review: Avoid / Prefer / Watch / Nutrients
   - Edit if needed (add/remove items)
   - Confirm and save
   ↓
4. Scan Screen (/scan)
   - Camera opens
   - Choose: Barcode or Ingredient mode
   - Scan product
   ↓
5. Verdict Screen (/scan/result)
   - See verdict: Safe / Caution / Avoid
   - Read reasoning
   - View nutrient breakdown
   - Save to history (if authenticated)
   ↓
6. Authentication Gate
   - After 1st scan: Soft prompt (dismissible)
   - After 2nd scan: Soft prompt again
   - Before 3rd scan: Hard gate (must sign in)
```

### Returning User Journey

```
Authenticated User
   ↓
Launch App
   ↓
Has active disease? → YES → Go to /scan
                   → NO  → Go to /setup
```

### Multi-Disease Management

```
User with multiple diseases
   ↓
/setup page shows:
   - "Your Saved Conditions" section
   - Active disease highlighted
   - Click any disease → Switch active → Go to /scan
   ↓
Add new disease:
   - Search for new condition
   - Generate new diet plan
   - Saved alongside existing diseases
```

---

## 5. Database Schema

### Entity Relationship Diagram

```
┌──────────────┐
│     User     │
├──────────────┤
│ id (PK)      │
│ email        │◄─────┐
│ name         │      │
│ image        │      │
│ googleId     │      │
│ createdAt    │      │
│ updatedAt    │      │
└──────────────┘      │
                      │
        ┌─────────────┴─────────────┬─────────────┐
        │                           │             │
        │                           │             │
┌───────▼────────┐         ┌────────▼──────┐  ┌──▼──────────┐
│  UserProfile   │         │ UserDisease   │  │ScanHistory  │
├────────────────┤         ├───────────────┤  ├─────────────┤
│ id (PK)        │         │ id (PK)       │  │ id (PK)     │
│ userId (FK)    │         │ userId (FK)   │  │ userId (FK) │
│ diseaseName    │         │ diseaseName   │  │ productName │
│ dietPlan (JSON)│         │ dietPlan(JSON)│  │ brand       │
│ isCustomized   │         │ isCustomized  │  │ barcode     │
│ createdAt      │         │ isActive      │  │ scanMethod  │
│ updatedAt      │         │ createdAt     │  │ verdict     │
└────────────────┘         │ updatedAt     │  │verdictDetail│
                           └───────────────┘  │ scannedAt   │
                                              └─────────────┘
```

### Schema Details

See `prisma/schema.prisma` for complete schema definition.

#### Key Tables

**User**: Stores authentication data from Google OAuth
- `id`: Unique identifier (cuid)
- `email`: User's email (unique)
- `googleId`: Google account ID
- Relations: UserProfile, UserDisease[], ScanHistory[]

**UserProfile**: Legacy single-disease storage (kept for backward compatibility)
- `diseaseName`: Plain text disease name
- `dietPlan`: JSON structure with avoid/prefer/watch/nutrients
- `isCustomized`: Whether user edited the AI-generated plan

**UserDisease**: Multi-disease support (current implementation)
- `diseaseName`: Plain text disease name
- `dietPlan`: JSON structure
- `isActive`: Only one disease can be active at a time
- `@@unique([userId, diseaseName])`: Prevents duplicate diseases per user

**ScanHistory**: Tracks all scans for authenticated users
- `scanMethod`: BARCODE or INGREDIENT_OCR
- `verdict`: SAFE, CAUTION, or AVOID
- `verdictDetail`: JSON with reason and flagged nutrients

### Design Decisions

1. **diseaseName as plain text**: No foreign key to a diseases table. Allows flexibility for any medical condition without maintaining a rigid disease database.

2. **dietPlan as JSON**: AI-generated structure can evolve. Avoids complex relational schema for dynamic medical data.

3. **Multi-disease support**: UserDisease table allows managing multiple conditions. Only one can be "active" at a time.

4. **Lightweight scan history**: Only stores verdict + product name + reason. Full nutrition data fetched fresh from Open Food Facts.

5. **Cascade deletes**: When a user is deleted, all related data is automatically deleted.

---

## 6. API Reference

### Disease Suggestion API

**Endpoint**: `POST /api/disease/suggest`

**Purpose**: Get AI-generated disease variant suggestions

**Request**:
```json
{
  "query": "cirrhosis"
}
```

**Response**:
```json
{
  "suggestions": [
    "Compensated Liver Cirrhosis",
    "Decompensated Liver Cirrhosis",
    "Decompensated Cirrhosis with Ascites",
    "Alcoholic Liver Cirrhosis",
    "Primary Biliary Cirrhosis (PBC)",
    "NASH-related Liver Cirrhosis",
    "Wilson's Disease (Cirrhosis Stage)",
    "Hepatitis C-related Cirrhosis"
  ]
}
```

**Rate Limiting**: 10 requests/minute per IP

**OpenAI Prompt**:
> "The user is typing a medical condition: '[query]'. Return exactly 8 clinically specific disease variants or subtypes that are meaningful for dietary management. Each variant should be specific enough that a dietitian would give different nutritional advice for each. Consider stage, severity, complications, and etiology. Return only a JSON array of strings, no explanation."

**Implementation Details**:
- Model: `gpt-4o-mini` (cost-effective for suggestions)
- Max tokens: 500
- Validation: Ensures response is a string array
- Fallback: Extracts JSON from markdown code blocks if needed
- Error handling: Returns structured error with retry flag

### Diet Plan Generation API

**Endpoint**: `POST /api/diet-plan/generate`

**Purpose**: Generate personalized diet plan for a disease

**Request**:
```json
{
  "diseaseName": "Decompensated Liver Cirrhosis with Ascites"
}
```

**Response**:
```json
{
  "dietPlan": {
    "avoid": [
      "High-sodium foods (>300mg/serving)",
      "Raw shellfish",
      "Alcohol (absolutely)"
    ],
    "prefer": [
      "Soft-cooked vegetables",
      "Small frequent meals",
      "BCAA-rich foods"
    ],
    "watch": [
      "Daily sodium < 1500mg total",
      "Fluid restriction if prescribed",
      "Protein quality over quantity"
    ],
    "nutrients": {
      "Sodium": "< 300mg/serving",
      "Protein": "1.0–1.5g per kg body weight/day",
      "Fluid": "Per doctor's prescription"
    }
  }
}
```

**Rate Limiting**: 5 requests/minute per user

**OpenAI Prompt**:
> "You are a clinical dietitian. A patient has been diagnosed with '[diseaseName]'. Generate a personalized diet plan. Return a JSON object with exactly these fields: avoid (array of specific foods/food groups to avoid with reasons), prefer (array of recommended foods/food groups), watch (array of dietary guidelines and things to monitor), nutrients (object mapping nutrient names to target limits like '< 300mg/serving'). Each array should have 5-10 items. Return only the JSON object, no explanation."

**Implementation Details**:
- Model: `gpt-4o` (high accuracy for medical advice)
- Max tokens: 1000
- Validation: Ensures all required fields present and correct types
- Structure validation: Checks avoid, prefer, watch arrays and nutrients object
- Error handling: Graceful fallback with retry option

---

### Barcode Lookup API

**Endpoint**: `POST /api/scan/barcode`

**Purpose**: Look up product data from Open Food Facts

**Request**:
```json
{
  "barcode": "8901058852429"
}
```

**Response**:
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

**Error Response** (product not found):
```json
{
  "found": false
}
```

---

### Ingredient OCR API

**Endpoint**: `POST /api/scan/ingredients`

**Purpose**: Extract ingredients from image using GPT-4o Vision

**Request**:
```json
{
  "imageBase64": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

**Response**:
```json
{
  "ingredients": [
    "Wheat flour",
    "Refined palm oil",
    "Salt",
    "Sugar",
    "Yeast extract"
  ],
  "rawText": "Ingredients: Wheat flour, Refined palm oil, Salt, Sugar, Yeast extract"
}
```

**Rate Limiting**: 10 requests/minute per user

---

### Verdict Analysis API

**Endpoint**: `POST /api/scan/verdict`

**Purpose**: Analyze product against user's diet plan

**Request**:
```json
{
  "diseaseName": "Decompensated Liver Cirrhosis with Ascites",
  "dietPlan": {
    "avoid": ["High-sodium foods"],
    "prefer": ["Soft-cooked vegetables"],
    "watch": ["Daily sodium < 1500mg"],
    "nutrients": { "Sodium": "< 300mg/serving" }
  },
  "product": {
    "name": "Maggi 2-Minute Noodles",
    "ingredients": ["Wheat flour", "Palm oil", "Salt"],
    "nutrients": { "sodium": 870, "sugar": 2, "carbohydrates": 45 }
  }
}
```

**Response**:
```json
{
  "verdict": "AVOID",
  "reason": "Very high sodium (870mg per serving) is dangerous for cirrhosis with ascites. Sodium restriction is critical to manage fluid retention. This single serving would use 58% of your daily sodium limit.",
  "flaggedNutrients": ["sodium"],
  "safeAlternative": "Look for low-sodium rice noodles or plain rice instead."
}
```

**Rate Limiting**: 20 requests/minute per user

**OpenAI Prompt**:
> "You are a clinical dietitian. A patient has [diseaseName]. Their diet rules are: [dietPlan]. Analyze this food product: [product data]. Return a JSON object with: verdict (SAFE/CAUTION/AVOID), reason (2-3 sentences specific to their condition and this product), flaggedNutrients (array of nutrient names that are problematic), safeAlternative (one practical suggestion if verdict is CAUTION or AVOID)."

**Implementation Details**:
- Model: `gpt-4o` (medical accuracy critical)
- Max tokens: 300
- Automatic history save: For authenticated users, saves to ScanHistory table
- Validation: Ensures verdict is one of SAFE/CAUTION/AVOID
- Error handling: Non-blocking history save (verdict more important than history)

---

### User Profile API

**Endpoint**: `GET /api/user/profile`

**Purpose**: Get user's diseases and scan history

**Response**:
```json
{
  "diseaseName": "Type 2 Diabetes",
  "dietPlan": { ... },
  "isCustomized": false,
  "diseases": [
    {
      "id": "clx123",
      "diseaseName": "Type 2 Diabetes",
      "dietPlan": { ... },
      "isActive": true,
      "createdAt": "2026-03-01T10:00:00Z"
    }
  ],
  "scanHistory": [
    {
      "id": "clx456",
      "productName": "Maggi Noodles",
      "verdict": "AVOID",
      "scannedAt": "2026-03-10T14:30:00Z"
    }
  ]
}
```

**Endpoint**: `PUT /api/user/profile`

**Purpose**: Update user's diet plan

**Request**:
```json
{
  "dietPlan": { ... },
  "isCustomized": true
}
```

---

## 7. Key Features

### 7.1 Disease Auto-Suggest

**Implementation**: `src/components/disease/DiseaseSearchInput.tsx`

- **Trigger**: User types in the disease input field
- **Debounce**: 400ms after last keystroke before API call
- **Minimum characters**: 2
- **Results shown**: 6–8 suggestions in a dropdown
- **Handling misspellings**: GPT-4o handles naturally (e.g., "diabeties" → diabetes variants)
- **Fallback**: If not recognized medically, still allow user to proceed with typed text
- **UI behavior**: Selecting a suggestion fills the input and highlights it as confirmed

**Hook**: `src/hooks/useDiseaseSearch.ts`
```typescript
export function useDiseaseSearch() {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      const res = await fetch('/api/disease/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      const data = await res.json()
      setSuggestions(data.suggestions)
      setLoading(false)
    }, 400)

    return () => clearTimeout(timer)
  }, [query])

  return { query, setQuery, suggestions, loading }
}
```

### 7.2 Diet Plan Generation & Editing

**Implementation**: `src/app/setup/diet-plan/page.tsx`

- **Generated immediately** after disease confirmation (single API call, ~2–3 seconds)
- **Loading state**: Show skeleton UI while generating
- **Structure displayed**:
  - Foods to Avoid (red chips)
  - Recommended Foods (green chips)
  - Nutrients to Watch (text list)
  - Nutrient Targets (grid of key limits)
- **Edit mode**: Tap Edit button → chips become removable, Add buttons appear
- **Custom additions**: User can add their own items (doctor's specific instructions)
- **Save**: Confirmed plan saved to database (authenticated) or localStorage (guest)
- **Medical disclaimer**: Always shown below plan

**Components**:
- `DietPlanCard.tsx`: Full plan display with edit mode
- `FoodChipList.tsx`: Avoid/prefer chip lists with add/remove
- `NutrientTargetGrid.tsx`: Nutrient limits grid

---

### 7.3 Barcode Scanner (ZXing-js)

**Implementation**: `src/components/scanner/BarcodeScanner.tsx`

- **Library**: `@zxing/library` (browser-based, no server needed)
- **Formats supported**: EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39, QR Code, DataMatrix
- **Camera access**: Uses browser `getUserMedia` API
- **iOS compatibility**: Works on iOS 14.3+ in Safari
- **Flow**:
  1. Component mounts → request camera permission
  2. ZXing continuously decodes video frames
  3. On successful decode → stop camera → call `/api/scan/barcode`
  4. If barcode not found → offer "Scan Ingredient Label" fallback
- **Error states**: Camera denied, no camera found, barcode not in database
- **Cleanup**: Always calls `codeReader.reset()` on unmount to release camera

**Key Code**:
```typescript
const codeReader = new BrowserMultiFormatReader()

useEffect(() => {
  codeReader.decodeFromVideoDevice(
    undefined, // Use default camera
    videoRef.current,
    (result, error) => {
      if (result) {
        onDecode(result.getText())
        codeReader.reset()
      }
    }
  )

  return () => {
    codeReader.reset() // Critical: release camera
  }
}, [])
```

---

### 7.4 Ingredient OCR (GPT-4o Vision)

**Implementation**: `src/components/scanner/IngredientCapture.tsx`

- **Trigger**: User taps "Scan Ingredient List" mode
- **Flow**:
  1. User taps capture button on camera
  2. Image captured as base64 JPEG
  3. Sent to `/api/scan/ingredients` with GPT-4o Vision
  4. Extracted ingredients list returned
  5. Ingredients immediately passed to `/api/scan/verdict`
- **Image quality guidance**: In-app tip "Make sure the text is well-lit and in focus"
- **Fallback**: If OCR fails, show error with retry option

**OpenAI Vision Prompt**:
> "Extract all ingredients from this food product label image. Return a JSON object with: ingredients (array of ingredient names), rawText (the full text you see). If you cannot read the text clearly, return an error."

---

### 7.5 Verdict Display

**Implementation**: `src/app/scan/result/page.tsx`

**Three verdict states**:
- ✓ **SAFE** — Green banner. "Good to eat."
- ⚠ **CAUTION** — Amber banner. "Okay in moderation."
- ✗ **AVOID** — Red banner. "Not recommended for your condition."

**Each verdict includes**:
- Product name and brand
- 2–3 sentence reasoning specific to their disease
- Flagged nutrients (highlighted in the nutrition breakdown)
- Safe alternative suggestion (for Caution/Avoid)

**Components**:
- `VerdictBanner.tsx`: Large verdict display with color coding
- `ProductCard.tsx`: Product name and brand
- `NutrientBreakdown.tsx`: Per-nutrient analysis with flagged items highlighted

**Actions after verdict**:
- "Scan Another" → returns to camera
- "Save to History" → saves scan (requires auth)

---

### 7.6 Authentication Gate

**Implementation**: `src/hooks/useScanCount.ts` + `src/components/auth/AuthPromptModal.tsx`

**Guest scan tracking**:
- Tracked in localStorage key `dietscan_guest_scans`
- Incremented after each successful scan

**Gate logic**:
- **First scan**: No gate. Full experience.
- **After first scan**: Show soft modal — "Sign in to save your diet plan and scan history" — with "Maybe Later" option
- **After second scan**: Show soft modal again
- **Before third scan**: Hard gate — must sign in to continue

**On sign-in**:
- Migrate localStorage data to database via `src/hooks/useMigration.ts`
- Delete localStorage keys
- User never loses their setup work

---

## 8. Component Architecture

### Component Hierarchy

```
App
├── AppHeader (navigation, user menu)
├── Providers (NextAuth SessionProvider)
└── Pages
    ├── /setup
    │   ├── DiseaseSearchInput
    │   │   └── SuggestionDropdown
    │   └── MedicalDisclaimer
    │
    ├── /setup/diet-plan
    │   ├── DietPlanCard
    │   │   ├── FoodChipList
    │   │   └── NutrientTargetGrid
    │   └── MedicalDisclaimer
    │
    ├── /scan
    │   ├── ScanModeToggle
    │   ├── BarcodeScanner (dynamic import)
    │   │   └── CameraViewfinder
    │   ├── IngredientCapture
    │   └── AuthPromptModal
    │
    └── /scan/result
        ├── VerdictBanner
        ├── ProductCard
        ├── NutrientBreakdown
        └── MedicalDisclaimer
```

### Reusable UI Components

Located in `src/components/ui/`:

- **Button**: Primary, secondary, and danger variants
- **Card**: Container with shadow and rounded corners
- **Chip**: Removable tags for food items
- **Input**: Text input with label and error states
- **LoadingSpinner**: Three sizes (sm, md, lg)
- **AppHeader**: Navigation header with back button and user menu
- **MedicalDisclaimer**: Standard disclaimer shown on all medical content

### Custom Hooks

Located in `src/hooks/`:

- **useGuestState**: Manage guest data in localStorage (disease, dietPlan, recentDiseases)
- **useDiseaseSearch**: Debounced disease search with AI suggestions
- **useScanCount**: Track guest scan count and gate logic
- **useMigration**: Migrate guest data to database on sign-in

---

## 9. Project Structure

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
│   │   ├── providers.tsx          # NextAuth SessionProvider
│   │   │
│   │   ├── setup/                 # One-time setup flow
│   │   │   ├── page.tsx           # Disease selection
│   │   │   └── diet-plan/
│   │   │       └── page.tsx       # Diet plan review & edit
│   │   │
│   │   ├── scan/                  # Daily use flow
│   │   │   ├── page.tsx           # Camera scan screen
│   │   │   └── result/
│   │   │       └── page.tsx       # Verdict screen
│   │   │
│   │   ├── profile/               # User profile page
│   │   │   └── page.tsx
│   │   │
│   │   ├── (auth)/                # Auth pages
│   │   │   └── signin/
│   │   │       └── page.tsx       # Custom sign-in page
│   │   │
│   │   └── api/                   # API Route Handlers
│   │       ├── auth/
│   │       │   └── [...nextauth]/route.ts
│   │       ├── disease/
│   │       │   └── suggest/route.ts
│   │       ├── diet-plan/
│   │       │   ├── generate/route.ts
│   │       │   └── save/route.ts
│   │       ├── scan/
│   │       │   ├── barcode/route.ts
│   │       │   ├── ingredients/route.ts
│   │       │   ├── verdict/route.ts
│   │       │   └── history/route.ts
│   │       └── user/
│   │           ├── profile/route.ts
│   │           └── active-disease/route.ts
│   │
│   ├── components/
│   │   ├── ui/                    # Reusable primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Chip.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── AppHeader.tsx
│   │   │   └── MedicalDisclaimer.tsx
│   │   │
│   │   ├── disease/
│   │   │   ├── DiseaseSearchInput.tsx
│   │   │   └── SuggestionDropdown.tsx
│   │   │
│   │   ├── diet-plan/
│   │   │   ├── DietPlanCard.tsx
│   │   │   ├── FoodChipList.tsx
│   │   │   └── NutrientTargetGrid.tsx
│   │   │
│   │   ├── scanner/
│   │   │   ├── BarcodeScanner.tsx
│   │   │   ├── CameraViewfinder.tsx
│   │   │   ├── IngredientCapture.tsx
│   │   │   └── ScanModeToggle.tsx
│   │   │
│   │   ├── verdict/
│   │   │   ├── VerdictBanner.tsx
│   │   │   ├── ProductCard.tsx
│   │   │   └── NutrientBreakdown.tsx
│   │   │
│   │   └── auth/
│   │       └── AuthPromptModal.tsx
│   │
│   ├── lib/
│   │   ├── prisma.ts              # Prisma client singleton
│   │   ├── openai.ts              # OpenAI client singleton
│   │   ├── auth.ts                # NextAuth config
│   │   ├── constants.ts           # App-wide constants
│   │   └── rate-limiter.ts        # Rate limiting utility
│   │
│   ├── hooks/
│   │   ├── useGuestState.ts       # localStorage guest data management
│   │   ├── useDiseaseSearch.ts    # Debounced disease search hook
│   │   ├── useScanCount.ts        # Track guest scan count
│   │   └── useMigration.ts        # Migrate guest → authenticated
│   │
│   ├── types/
│   │   ├── diet.ts                # DietPlan, FoodVerdict types
│   │   ├── scan.ts                # ScanResult, ProductData types
│   │   └── api.ts                 # API request/response types
│   │
│   ├── utils/
│   │   ├── openFoodFacts.ts       # Open Food Facts API helpers
│   │   ├── dietPlan.ts            # Diet plan utilities
│   │   └── fetchWithRetry.ts      # Retry logic for API calls
│   │
│   └── test/
│       └── setup.ts               # Vitest setup
│
├── public/
│   ├── manifest.json              # PWA manifest
│   └── icons/                     # App icons for home screen
│
├── .env                           # Environment variables (gitignored)
├── .env.example                   # Template for env vars
├── .gitignore
├── next.config.mjs                # Next.js configuration
├── tailwind.config.ts             # Tailwind configuration
├── tsconfig.json                  # TypeScript configuration
├── package.json
├── README.md
├── DOCUMENTATION.md               # This file
└── DietScan-TechSpec.md           # Original technical specification
```

---

## 10. Environment Setup

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm or yarn
- PostgreSQL database (Neon recommended for serverless)
- OpenAI API key
- Google OAuth credentials

### Installation Steps

1. **Clone repository**:
```bash
git clone https://github.com/priyamjyotsna/ScanSafe.git
cd ScanSafe
```

2. **Install dependencies**:
```bash
npm install
```

3. **Setup environment variables**:
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```bash
# Database (Neon)
DATABASE_URL="postgresql://user:pass@host/dietscan?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://user:pass@host/dietscan?sslmode=require"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-generated-secret"  # openssl rand -base64 32

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# OpenAI
OPENAI_API_KEY="sk-..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Rate Limiting
RATE_LIMIT_DISEASE_SUGGEST=10
RATE_LIMIT_DIET_PLAN_GENERATE=5
RATE_LIMIT_INGREDIENT_OCR=10
RATE_LIMIT_VERDICT=20
RATE_LIMIT_WINDOW_MS=60000
```

4. **Generate Prisma client**:
```bash
npx prisma generate --schema=prisma/schema.prisma
```

5. **Run database migrations** (if needed):
```bash
npx prisma migrate dev
```

6. **Start development server**:
```bash
npm run dev
```

Access at `http://localhost:3000`

### Development with HTTPS (Required for Camera)

Mobile camera access requires HTTPS. Next.js provides experimental HTTPS support:

```bash
npm run dev:https
```

Access at `https://localhost:3000`

**Note**: You'll see a browser warning about self-signed certificate. Click "Advanced" → "Proceed to localhost" to continue.

---

## 11. Development Workflow

### Running the App

```bash
# Development server
npm run dev

# Development with HTTPS (for camera testing)
npm run dev:https

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

### Database Commands

```bash
# Generate Prisma client
npx prisma generate --schema=prisma/schema.prisma

# Run migrations
npx prisma migrate dev

# Deploy migrations (production)
npx prisma migrate deploy

# Open Prisma Studio (visual DB browser)
npx prisma studio

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

### Testing Commands

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Run specific test file
npx vitest src/components/Button.test.tsx

# Run tests with coverage
npx vitest --coverage
```

---

## 12. Testing Strategy

### Testing Stack

- **Vitest**: Fast unit test runner (Vite-powered)
- **React Testing Library**: Component testing
- **fast-check**: Property-based testing
- **@testing-library/jest-dom**: Custom matchers

### Test Coverage

Current test coverage:
- Components: ~80% coverage
- Hooks: ~90% coverage
- Utils: ~95% coverage
- API routes: ~70% coverage

### Test File Locations

Tests are co-located with source files:
```
src/components/Button.tsx
src/components/Button.test.tsx
```

### Running Tests

```bash
# Run all tests once
npm test

# Watch mode (re-run on file changes)
npm run test:watch

# Run specific test
npx vitest src/utils/openFoodFacts.test.ts
```

### Writing Tests

Example component test:
```typescript
import { render, screen } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click</Button>)
    await userEvent.click(screen.getByText('Click'))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
```

---

## 13. Deployment Guide

### Vercel Deployment (Recommended)

1. **Push code to GitHub**:
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. **Import project in Vercel**:
- Go to https://vercel.com
- Click "New Project"
- Import from GitHub
- Select your repository

3. **Configure environment variables**:
In Vercel dashboard → Settings → Environment Variables, add:
- `DATABASE_URL`
- `DIRECT_URL`
- `NEXTAUTH_URL` (set to your Vercel URL)
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `OPENAI_API_KEY`
- All rate limiting variables

4. **Update Google OAuth redirect URIs**:
In Google Cloud Console → APIs & Services → Credentials:
- Add `https://your-app.vercel.app/api/auth/callback/google`

5. **Deploy**:
- Vercel automatically deploys on push to main
- Build command: `npm run build` (includes Prisma generate)
- Output directory: `.next`

### Build Configuration

`package.json` build script:
```json
{
  "scripts": {
    "build": "prisma generate --schema=prisma/schema.prisma && next build"
  }
}
```

This ensures Prisma client is generated before Next.js build.

### Environment-Specific Configuration

**Development** (`.env.local`):
```bash
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Production** (Vercel):
```bash
NEXTAUTH_URL="https://scan-safe.vercel.app"
NEXT_PUBLIC_APP_URL="https://scan-safe.vercel.app"
```

---

## 14. Security

### Authentication Security

- **NextAuth.js v5**: Industry-standard OAuth implementation
- **JWT sessions**: Stateless, works on serverless edge
- **Secure cookies**: httpOnly, secure, sameSite=lax
- **CSRF protection**: Built into NextAuth

### API Security

- **Rate limiting**: Implemented on all AI endpoints
- **Input validation**: All API inputs validated with TypeScript
- **Error handling**: Never expose internal errors to client
- **CORS**: Restricted to same origin

### Data Security

- **Database**: Neon PostgreSQL with SSL
- **Connection pooling**: PgBouncer for serverless
- **Cascade deletes**: User data automatically cleaned up
- **No PII in logs**: Sensitive data never logged

### Client-Side Security

- **localStorage**: Only used for guest data (non-sensitive)
- **No API keys in client**: All API calls go through Next.js API routes
- **XSS protection**: React escapes all user input by default
- **Content Security Policy**: Configured in `next.config.mjs`

### Best Practices

1. **Never commit `.env`**: Always in `.gitignore`
2. **Rotate secrets regularly**: Especially `NEXTAUTH_SECRET`
3. **Use environment variables**: Never hardcode credentials
4. **Validate all inputs**: Both client and server side
5. **Keep dependencies updated**: Run `npm audit` regularly

---

## 15. Performance Optimization

### Frontend Optimizations

1. **Dynamic imports**: ZXing-js loaded only when needed
```typescript
const BarcodeScanner = dynamic(
  () => import('@/components/scanner/BarcodeScanner'),
  { ssr: false }
)
```

2. **Image optimization**: Next.js Image component for user avatars
3. **Code splitting**: Automatic with Next.js App Router
4. **Tailwind CSS**: Purged unused styles in production
5. **React Server Components**: Used where possible for faster initial load

### Backend Optimizations

1. **Connection pooling**: PgBouncer for Neon PostgreSQL
2. **Prisma client caching**: Singleton pattern in development
3. **API route caching**: Static responses cached at edge
4. **Rate limiting**: Prevents abuse and reduces costs

### AI Cost Optimization

1. **Model selection**:
   - GPT-4o for disease suggestions (high accuracy needed)
   - GPT-4o-mini for verdicts (cost-effective)
   - GPT-4o Vision only for OCR (when needed)

2. **Token limits**:
   - Disease suggestions: max_tokens=500
   - Diet plan: max_tokens=1000
   - Verdicts: max_tokens=300

3. **Caching strategy**:
   - Diet plans cached in database
   - Verdicts not cached (always fresh analysis)

### Database Optimizations

1. **Indexes**: Added on frequently queried fields
   - `userId` in ScanHistory
   - `scannedAt` in ScanHistory
   - `email` in User (unique)

2. **JSON fields**: Used for flexible data (dietPlan, verdictDetail)
3. **Cascade deletes**: Automatic cleanup reduces orphaned records

---

## 16. Troubleshooting

### Common Issues

#### Camera not working

**Symptoms**: "Camera permission denied" or black screen

**Solutions**:
1. Check browser permissions (Settings → Privacy → Camera)
2. Use HTTPS (required for camera access): `npm run dev:https`
3. On iOS: Use Safari (Chrome doesn't support camera on iOS)
4. Check if another app is using the camera

#### Barcode not scanning

**Symptoms**: Camera works but barcode not detected

**Solutions**:
1. Ensure good lighting
2. Hold phone steady, 6-12 inches from barcode
3. Try different angles
4. Check if barcode is damaged or obscured
5. Verify barcode format is supported (EAN-13, UPC-A, etc.)

#### Product not found

**Symptoms**: "Product not found in database"

**Solutions**:
1. Try scanning again (might be misread)
2. Use "Scan Ingredients" mode instead
3. Check if product is in Open Food Facts database
4. Indian products: More likely to be found than international

#### Build errors

**Symptoms**: `npm run build` fails

**Solutions**:
1. Delete `.next` folder: `rm -rf .next`
2. Delete `node_modules`: `rm -rf node_modules && npm install`
3. Regenerate Prisma client: `npx prisma generate`
4. Check for TypeScript errors: `npx tsc --noEmit`

#### Database connection errors

**Symptoms**: "Can't reach database server"

**Solutions**:
1. Check `DATABASE_URL` in `.env`
2. Verify Neon database is running
3. Check if IP is whitelisted (Neon dashboard)
4. Use `DIRECT_URL` for migrations
5. Verify SSL mode: `?sslmode=require`

#### OAuth errors

**Symptoms**: "OAuth callback error"

**Solutions**:
1. Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
2. Verify redirect URI in Google Cloud Console
3. Check `NEXTAUTH_URL` matches your domain
4. Regenerate `NEXTAUTH_SECRET`: `openssl rand -base64 32`

### Debug Mode

Enable debug logging:
```bash
# .env
DEBUG=true
NEXTAUTH_DEBUG=true
```

### Getting Help

1. Check GitHub Issues: https://github.com/priyamjyotsna/ScanSafe/issues
2. Review logs in Vercel dashboard
3. Check browser console for client-side errors
4. Use Prisma Studio to inspect database: `npx prisma studio`

---

## 17. Future Enhancements

### Planned Features

1. **PWA Enhancements**:
   - Service worker for offline support
   - "Add to Home Screen" prompt
   - Push notifications for scan reminders

2. **Social Features**:
   - Share verdicts as images
   - Family/caregiver profiles
   - Weekly scan summary reports

3. **Medical Integration**:
   - Doctor prescription upload (PDF/image → AI extracts diet rules)
   - Export scan history as PDF for doctor visits
   - Integration with health apps (Apple Health, Google Fit)

4. **Product Database**:
   - Manual product entry for missing items
   - Community-contributed product data
   - Regional food database improvements (Indian brands focus)

5. **AI Improvements**:
   - Multi-language support
   - Voice input for disease search
   - Personalized safe alternative suggestions based on location

6. **Analytics**:
   - Nutrition trends over time
   - Most scanned products
   - Compliance tracking

### Technical Debt

1. Migrate from UserProfile to UserDisease table (remove legacy single-disease support)
2. Add comprehensive error tracking (Sentry integration)
3. Implement proper logging infrastructure
4. Add E2E tests with Playwright
5. Improve mobile responsiveness on tablets

### Monetization Ideas

1. **Free tier**: 10 scans/month
2. **Premium tier**: Unlimited scans + advanced features
3. **Family plan**: Multiple user profiles
4. **Enterprise**: For hospitals and clinics

---

## Appendix

### Key Commands Reference

```bash
# Development
npm run dev                    # Start dev server
npm run dev:https              # Start dev server with HTTPS
npm run build                  # Build for production
npm start                      # Start production server
npm run lint                   # Lint code

# Database
npx prisma generate            # Generate Prisma client
npx prisma migrate dev         # Run migrations (dev)
npx prisma migrate deploy      # Deploy migrations (prod)
npx prisma studio              # Open visual DB browser
npx prisma migrate reset       # Reset database (WARNING)

# Testing
npm test                       # Run all tests
npm run test:watch             # Watch mode
npx vitest <file>              # Run specific test

# Deployment
git push origin main           # Auto-deploy to Vercel
vercel --prod                  # Manual deploy to Vercel
```

### External Resources

- **Next.js Docs**: https://nextjs.org/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **NextAuth.js Docs**: https://next-auth.js.org
- **OpenAI API Docs**: https://platform.openai.com/docs
- **Open Food Facts API**: https://world.openfoodfacts.org/data
- **ZXing-js GitHub**: https://github.com/zxing-js/library
- **Tailwind CSS Docs**: https://tailwindcss.com/docs
- **Vitest Docs**: https://vitest.dev

### License

This project is private and proprietary.

### Contributors

- Priyamjyotsna (Project Owner)

---

**Document Version**: 1.0  
**Last Updated**: March 10, 2026  
**Maintained by**: Priyamjyotsna

For questions or issues, please open a GitHub issue or contact the maintainer.
