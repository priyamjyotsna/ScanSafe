# DietScan — Complete Project Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [User Flow](#user-flow)
5. [Database Schema](#database-schema)
6. [API Routes](#api-routes)
7. [Key Features](#key-features)
8. [Environment Setup](#environment-setup)
9. [Deployment](#deployment)
10. [Testing](#testing)

---

## Project Overview

**DietScan** is a mobile-first Progressive Web App (PWA) that helps people with medical conditions make safe food choices while grocery shopping.

### Core Features
- Disease-specific diet plan generation using AI
- Barcode scanning for instant product analysis
- Ingredient OCR for products without barcodes
- Personalized safe/caution/avoid verdicts
- Scan history tracking
- Multi-disease profile management
- Guest mode with authentication gate

### Target Users
- Patients managing chronic conditions (diabetes, hypertension, kidney disease, liver conditions, etc.)
- Caregivers shopping for patients
- Anyone following medically prescribed diets

---

## Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 3.x
- **UI Components**: Custom components with Tailwind
- **State Management**: React hooks + localStorage for guest state
- **Testing**: Vitest + React Testing Library + fast-check (property-based testing)

### Backend
- **Runtime**: Node.js (Next.js API Routes)
- **Database**: PostgreSQL (Neon serverless)
- **ORM**: Prisma 7.x with pg adapter
- **Authentication**: NextAuth.js v5 (Google OAuth)
- **AI Services**: OpenAI GPT-4o and GPT-4o-mini

### Third-Party APIs
- **OpenAI GPT-4o**: Diet plan generation, verdict analysis
- **OpenAI GPT-4o-mini**: Disease suggestions (cost-optimized)
- **OpenAI GPT-4o Vision**: Ingredient OCR from images
- **Open Food Facts API**: Product database (3M+ products)
- **ZXing-js**: Client-side barcode scanning

### Deployment
- **Hosting**: Vercel
- **Database**: Neon PostgreSQL
- **CDN**: Vercel Edge Network
- **SSL**: Automatic HTTPS

---

## Architecture

### Application Structure

```
┌─────────────────────────────────────────────────────────┐
│                    Client (Browser)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Camera     │  │  localStorage│  │  React State │  │
│  │   (ZXing)    │  │  (Guest Mode)│  │   (Session)  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Next.js App Router (Server)                 │
│  ┌──────────────────────────────────────────────────┐   │
│  │  API Routes                                       │   │
│  │  • /api/disease/suggest                          │   │
│  │  • /api/diet-plan/generate                       │   │
│  │  • /api/scan/barcode                             │   │
│  │  • /api/scan/ingredients                         │   │
│  │  • /api/scan/verdict                             │   │
│  │  • /api/user/profile                             │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
           │                    │                │
           ▼                    ▼                ▼
    ┌──────────┐      ┌──────────┐      ┌──────────────┐
    │  OpenAI  │      │  Prisma  │      │ Open Food    │
    │  API     │      │  Client  │      │ Facts API    │
    └──────────┘      └──────────┘      └──────────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ Neon PostgreSQL │
                   └─────────────────┘
```

### Data Flow

#### Guest User Flow
1. User enters disease → stored in localStorage
2. AI generates diet plan → stored in localStorage
3. User scans product → verdict generated using localStorage data
4. After 3 scans → authentication required
5. On sign-in → localStorage data migrated to database

#### Authenticated User Flow
1. User profile loaded from database
2. User can manage multiple diseases
3. One disease marked as "active" at a time
4. All scans saved to scan history
5. Diet plans persisted across devices

---

## User Flow

### First-Time User Journey

```
1. Landing (/) 
   └─> Redirects to /setup

2. Disease Selection (/setup)
   ├─> Search input with AI suggestions
   ├─> Select disease from dropdown
   └─> Continue to diet plan

3. Diet Plan Review (/setup/diet-plan)
   ├─> AI generates personalized plan
   ├─> User reviews avoid/prefer lists
   ├─> Optional: Edit plan
   └─> Save and continue to scan

4. Scan Screen (/scan)
   ├─> Camera opens
   ├─> Toggle: Barcode or Ingredient mode
   ├─> Scan product
   └─> Navigate to result

5. Verdict Screen (/scan/result)
   ├─> Shows Safe/Caution/Avoid verdict
   ├─> Displays reasoning and nutrients
   └─> "Scan Another" returns to step 4

6. Authentication Gate (after 3 scans)
   ├─> Modal prompts Google sign-in
   ├─> On sign-in: data migrated to DB
   └─> Continue scanning with history saved
```

### Returning User Journey

```
1. Landing (/)
   └─> If authenticated + has profile → /scan
   └─> If not → /setup

2. Profile Page (/profile)
   ├─> View all saved diseases
   ├─> Switch active disease
   ├─> View scan history
   └─> Edit diet plans
```

---

## Database Schema

### Models

#### User
```typescript
{
  id: string (cuid)
  email: string (unique)
  name: string?
  image: string?
  googleId: string? (unique)
  createdAt: DateTime
  updatedAt: DateTime
  
  // Relations
  profile: UserProfile?
  diseases: UserDisease[]
  scanHistory: ScanHistory[]
}
```

#### UserProfile
```typescript
{
  id: string (cuid)
  userId: string (unique, FK to User)
  diseaseName: string
  dietPlan: Json
  isCustomized: boolean
  createdAt: DateTime
  updatedAt: DateTime
}
```

#### UserDisease
```typescript
{
  id: string (cuid)
  userId: string (FK to User)
  diseaseName: string
  dietPlan: Json
  isCustomized: boolean
  isActive: boolean
  createdAt: DateTime
  updatedAt: DateTime
  
  // Unique constraint on [userId, diseaseName]
}
```

#### ScanHistory
```typescript
{
  id: string (cuid)
  userId: string (FK to User)
  productName: string?
  brand: string?
  barcode: string?
  scanMethod: ScanMethod (BARCODE | INGREDIENT_OCR)
  verdict: Verdict (SAFE | CAUTION | AVOID)
  verdictDetail: Json?
  scannedAt: DateTime
}
```

### Diet Plan JSON Structure
```json
{
  "avoid": ["High-sodium foods", "Processed meats"],
  "prefer": ["Fresh vegetables", "Lean proteins"],
  "watch": ["Daily sodium < 1500mg", "Protein intake"],
  "nutrients": {
    "Sodium": "< 300mg/serving",
    "Sugar": "< 5g/serving"
  }
}
```

---

## API Routes

### Authentication

**GET/POST** `/api/auth/[...nextauth]`
- NextAuth.js handler for Google OAuth
- Handles sign-in, sign-out, session management
- Creates/updates user in database on sign-in

### Disease Management

**POST** `/api/disease/suggest`
- Accepts: `{ query: string }`
- Returns: `{ suggestions: string[] }`
- Uses: GPT-4o-mini for cost optimization
- Rate limit: 30 requests/minute per IP
- Debounce: 400ms on client side

### Diet Plan

**POST** `/api/diet-plan/generate`
- Accepts: `{ diseaseName: string }`
- Returns: `{ dietPlan: DietPlan }`
- Uses: GPT-4o for comprehensive analysis
- Rate limit: 5 requests/minute per user

**POST** `/api/diet-plan/save`
- Accepts: `{ diseaseName: string, dietPlan: DietPlan }`
- Saves diet plan to database
- Requires authentication

### Scanning

**POST** `/api/scan/barcode`
- Accepts: `{ barcode: string }`
- Returns: `{ found: boolean, product?: ProductData }`
- Fetches from Open Food Facts API
- Rate limit: 20 requests/minute per user

**POST** `/api/scan/ingredients`
- Accepts: `{ imageBase64: string }`
- Returns: `{ ingredients: string[], rawText: string }`
- Uses: GPT-4o Vision for OCR
- Rate limit: 10 requests/minute per user

**POST** `/api/scan/verdict`
- Accepts: `{ diseaseName: string, dietPlan: DietPlan, product: ProductData }`
- Returns: `{ verdict: Verdict, reason: string, flaggedNutrients: string[] }`
- Uses: GPT-4o for analysis
- Rate limit: 20 requests/minute per user

**POST** `/api/scan/history`
- Saves scan result to database
- Requires authentication

### User Profile

**GET** `/api/user/profile`
- Returns user profile with all diseases and diet plans
- Requires authentication

**PUT** `/api/user/profile`
- Updates user profile or diet plan
- Requires authentication

**PATCH** `/api/user/active-disease`
- Switches active disease
- Accepts: `{ diseaseName: string }`
- Requires authentication

---

## Key Features

### 1. Disease Auto-Suggest

**Component**: `DiseaseSearchInput`
**Location**: `src/components/disease/DiseaseSearchInput.tsx`

Features:
- Real-time AI-powered suggestions as user types
- 400ms debounce to reduce API calls
- Minimum 2 characters before triggering
- Dropdown with 6-8 clinically specific variants
- Handles misspellings naturally via GPT
- Keyboard navigation support

Technical Implementation:
- Uses `useDiseaseSearch` hook for debounced API calls
- `SuggestionDropdown` component for results
- Rate limited to 30 requests/minute

### 2. AI Diet Plan Generation

**Component**: `DietPlanCard`
**Location**: `src/components/diet-plan/DietPlanCard.tsx`

Features:
- Generates personalized plan based on disease
- Displays avoid/prefer food lists
- Shows nutrient targets and limits
- Editable mode for customization
- Medical disclaimer always visible

Diet Plan Structure:
- Foods to Avoid (red chips)
- Recommended Foods (green chips)
- Nutrients to Watch (text list)
- Specific Nutrient Limits (grid)

### 3. Barcode Scanner

**Component**: `BarcodeScanner`
**Location**: `src/components/scanner/BarcodeScanner.tsx`

Features:
- Uses ZXing-js for client-side scanning
- Supports EAN-13, UPC-A, QR codes, and more
- Real-time camera feed processing
- Automatic camera cleanup on unmount
- Works on iOS Safari 14.3+

Technical Details:
- Requests camera permission via getUserMedia
- Continuously decodes video frames
- Stops camera on successful scan
- Fallback to ingredient OCR if barcode not found

### 4. Ingredient OCR

**Component**: `IngredientCapture`
**Location**: `src/components/scanner/IngredientCapture.tsx`

Features:
- Captures photo of ingredient label
- Uses GPT-4o Vision for text extraction
- Handles poor lighting and focus
- Returns structured ingredient list

Flow:
1. User captures image
2. Image converted to base64
3. Sent to OpenAI Vision API
4. Extracted ingredients parsed
5. Passed to verdict analysis

### 5. Verdict System

**Component**: `VerdictBanner`
**Location**: `src/components/verdict/VerdictBanner.tsx`

Three Verdict Types:
- **SAFE** (Green): Product is safe for the condition
- **CAUTION** (Amber): Okay in moderation, watch portions
- **AVOID** (Red): Not recommended for the condition

Each verdict includes:
- Clear visual indicator
- Product name and brand
- Disease-specific reasoning (2-3 sentences)
- Flagged nutrients highlighted
- Safe alternative suggestions
- Detailed nutrient breakdown

### 6. Multi-Disease Management

**Feature**: Users can save multiple disease profiles
**Location**: `/profile` page

Features:
- Save multiple diseases with separate diet plans
- One disease marked as "active" at a time
- Quick switch between diseases
- Each disease has independent diet plan
- Scan history tagged with disease used

### 7. Guest Mode & Authentication Gate

**Strategy**: Guest-first approach for friction reduction

Guest Capabilities:
- Full disease selection and diet plan generation
- Up to 3 scans without authentication
- Data stored in localStorage

Authentication Triggers:
- Soft prompt after 1st scan (dismissible)
- Hard gate after 3rd scan (required)

Post-Authentication:
- localStorage data migrated to database
- Scan history starts saving
- Cross-device sync enabled

---

## Environment Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- PostgreSQL database (Neon recommended)
- OpenAI API key
- Google OAuth credentials

### Local Development Setup

1. **Clone and Install**
```bash
git clone https://github.com/priyamjyotsna/ScanSafe.git
cd ScanSafe
npm install
```

2. **Database Setup**
```bash
# Generate Prisma client
npx prisma generate --schema=prisma/schema.prisma

# Run migrations (if needed)
npx prisma migrate dev

# Open Prisma Studio to view data
npx prisma studio
```

3. **Environment Variables**

Create `.env` file (copy from `.env.example`):

```bash
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://user:pass@host/db?sslmode=require"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# OpenAI
OPENAI_API_KEY="sk-..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Rate Limiting
RATE_LIMIT_DISEASE_SUGGEST=30
RATE_LIMIT_DIET_PLAN_GENERATE=5
RATE_LIMIT_INGREDIENT_OCR=10
RATE_LIMIT_VERDICT=20
RATE_LIMIT_WINDOW_MS=60000
```

4. **Generate Auth Secret**
```bash
openssl rand -base64 32
```

5. **Google OAuth Setup**
- Go to [Google Cloud Console](https://console.cloud.google.com)
- Create OAuth 2.0 credentials
- Add authorized redirect URIs:
  - `http://localhost:3000/api/auth/callback/google`
  - `https://localhost:3000/api/auth/callback/google`
  - `https://your-app.vercel.app/api/auth/callback/google`

6. **Run Development Server**
```bash
# Standard HTTP
npm run dev

# HTTPS (required for mobile camera access)
npm run dev:https
```

Access at:
- HTTP: `http://localhost:3000`
- HTTPS: `https://localhost:3000`

---

## Deployment

### Vercel Deployment

1. **Connect Repository**
- Push code to GitHub
- Import project in Vercel dashboard
- Connect GitHub repository

2. **Configure Build Settings**

- Framework Preset: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

3. **Add Environment Variables**

In Vercel dashboard → Settings → Environment Variables:

```
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your-secret
AUTH_SECRET=your-secret (same as NEXTAUTH_SECRET)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
RATE_LIMIT_DISEASE_SUGGEST=30
RATE_LIMIT_DIET_PLAN_GENERATE=5
RATE_LIMIT_INGREDIENT_OCR=10
RATE_LIMIT_VERDICT=20
RATE_LIMIT_WINDOW_MS=60000
```

4. **Database Setup (Neon)**
- Create Neon project
- Copy connection strings
- Add to Vercel environment variables
- Neon automatically provides DATABASE_URL

5. **Deploy**
```bash
git push origin main
```

Vercel automatically deploys on push to main branch.

### Post-Deployment Checklist

- [ ] Update Google OAuth redirect URIs with production URL
- [ ] Test authentication flow
- [ ] Verify database connection
- [ ] Test camera permissions on mobile
- [ ] Check API rate limits
- [ ] Monitor OpenAI API usage
- [ ] Test barcode scanning
- [ ] Verify OCR functionality

---

## Testing

### Test Structure

```
src/
├── components/
│   ├── Component.tsx
│   └── Component.test.tsx
├── hooks/
│   ├── useHook.ts
│   └── useHook.test.ts
├── utils/
│   ├── util.ts
│   └── util.test.ts
└── app/api/
    ├── route.ts
    └── route.test.ts
```

### Running Tests

```bash
# Run all tests once
npm test

# Watch mode for development
npm run test:watch

# Run specific test file
npx vitest src/components/Button.test.tsx
```

### Test Coverage

- Unit tests for all utility functions
- Component tests for UI components
- Integration tests for API routes
- Property-based tests for critical logic

### Testing Tools

- **Vitest**: Test runner
- **React Testing Library**: Component testing
- **fast-check**: Property-based testing
- **jsdom**: DOM environment for tests

### Example Test

```typescript
import { render, screen } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })
})
```

---

## Project Structure

```
dietscan/
├── .kiro/                         # Kiro IDE specs
│   └── specs/
│       └── dietscan-mvp/
├── prisma/
│   ├── schema.prisma              # Database schema
│   └── migrations/                # Migration history
├── public/
│   └── manifest.json              # PWA manifest
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── (auth)/
│   │   │   └── signin/
│   │   ├── api/                   # API routes
│   │   │   ├── auth/
│   │   │   ├── disease/
│   │   │   ├── diet-plan/
│   │   │   ├── scan/
│   │   │   └── user/
│   │   ├── profile/
│   │   ├── scan/
│   │   │   └── result/
│   │   ├── setup/
│   │   │   └── diet-plan/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── providers.tsx
│   ├── components/
│   │   ├── auth/
│   │   ├── diet-plan/
│   │   ├── disease/
│   │   ├── scanner/
│   │   ├── ui/
│   │   └── verdict/
│   ├── hooks/
│   │   ├── useDiseaseSearch.ts
│   │   ├── useGuestState.ts
│   │   ├── useMigration.ts
│   │   └── useScanCount.ts
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── constants.ts
│   │   ├── openai.ts
│   │   ├── prisma.ts
│   │   └── rate-limiter.ts
│   ├── types/
│   │   ├── api.ts
│   │   ├── diet.ts
│   │   └── scan.ts
│   └── utils/
│       ├── dietPlan.ts
│       ├── fetchWithRetry.ts
│       └── openFoodFacts.ts
├── .env                           # Environment variables
├── .env.example                   # Environment template
├── .gitignore
├── DOCUMENTATION.md               # This file
├── DietScan-TechSpec.md          # Original spec
├── README.md
├── next.config.mjs
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── vitest.config.ts
```

---

## Key Technical Decisions

### 1. Why Next.js App Router?
- Server-side rendering for better SEO
- API routes co-located with frontend
- Built-in optimization (images, fonts)
- Vercel deployment integration

### 2. Why Prisma?
- Type-safe database queries
- Automatic migrations
- Great TypeScript support
- Works well with Neon serverless

### 3. Why OpenAI for Everything?
- Single API key to manage
- Consistent quality across features
- GPT-4o handles medical knowledge well
- Vision API for OCR eliminates separate service

### 4. Why ZXing-js?
- Client-side processing (no server cost)
- Works in browser without native app
- Supports all major barcode formats
- Good iOS Safari support

### 5. Why Guest-First?
- Reduces friction for first-time users
- Lets users experience value immediately
- Higher conversion to sign-up
- localStorage provides temporary persistence

### 6. Why Multi-Disease Support?
- Users often manage multiple conditions
- Caregivers shop for multiple family members
- Allows quick switching without re-setup
- Each disease has independent diet plan

---

## Performance Optimizations

### 1. Rate Limiting
- Prevents API abuse
- Protects OpenAI costs
- Per-IP and per-user limits
- Configurable via environment variables

### 2. Debouncing
- Disease search: 400ms debounce
- Reduces unnecessary API calls
- Improves user experience

### 3. Image Optimization
- Next.js automatic image optimization
- Lazy loading for images
- WebP format when supported

### 4. Code Splitting
- Automatic route-based splitting
- Dynamic imports for heavy components
- Smaller initial bundle size

### 5. Database Connection Pooling
- Prisma with pg adapter
- Neon connection pooling
- Prevents connection exhaustion

---

## Security Considerations

### 1. Authentication
- Google OAuth only (no password storage)
- JWT-based sessions
- Secure httpOnly cookies
- CSRF protection via NextAuth

### 2. API Security
- Rate limiting on all endpoints
- Authentication required for sensitive routes
- Input validation on all API routes
- SQL injection prevention via Prisma

### 3. Data Privacy
- User data encrypted at rest (Neon)
- HTTPS enforced in production
- No PII in logs
- GDPR-compliant data handling

### 4. Environment Variables
- Never committed to git
- Separate dev/prod values
- Validated at runtime
- Secure storage in Vercel

---

## Monitoring & Analytics

### Recommended Tools
- **Vercel Analytics**: Page views, performance
- **Sentry**: Error tracking
- **OpenAI Usage Dashboard**: API costs
- **Neon Dashboard**: Database metrics

### Key Metrics to Track
- Daily active users
- Scans per user
- Authentication conversion rate
- API response times
- OpenAI token usage
- Database query performance
- Error rates by route

---

## Future Enhancements

### Phase 1 (Current)
- ✅ Core scanning functionality
- ✅ Multi-disease support
- ✅ Guest mode with auth gate
- ✅ Scan history

### Phase 2 (Planned)
- [ ] PWA offline support
- [ ] Push notifications
- [ ] Weekly scan summaries
- [ ] Export scan history (PDF)
- [ ] Share verdicts as images

### Phase 3 (Future)
- [ ] Doctor prescription upload
- [ ] Family/caregiver profiles
- [ ] Regional food database improvements
- [ ] Meal planning suggestions
- [ ] Nutrition tracking dashboard

---

## Troubleshooting

### Common Issues

**Camera not working on mobile**
- Ensure HTTPS is enabled
- Check browser permissions
- iOS requires Safari 14.3+
- Android requires Chrome 90+

**Database connection errors**
- Verify DATABASE_URL format
- Check Neon dashboard for issues
- Ensure pgbouncer=true in URL
- Verify DIRECT_URL for migrations

**OpenAI API errors**
- Check API key validity
- Verify billing is active
- Monitor rate limits
- Check token usage

**Build failures**
- Run `npm run build` locally first
- Check TypeScript errors
- Verify all environment variables
- Clear `.next` cache

**Authentication issues**
- Verify Google OAuth credentials
- Check redirect URIs match exactly
- Ensure NEXTAUTH_SECRET is set
- Verify NEXTAUTH_URL is correct

---

## Contributing

### Development Workflow

1. Create feature branch
```bash
git checkout -b feature/your-feature
```

2. Make changes and test
```bash
npm run test
npm run build
```

3. Commit with descriptive message
```bash
git commit -m "feat: add feature description"
```

4. Push and create PR
```bash
git push origin feature/your-feature
```

### Code Style
- TypeScript strict mode
- ESLint for linting
- Prettier for formatting
- Tailwind for styling

### Commit Convention
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting
- `refactor:` Code restructuring
- `test:` Adding tests
- `chore:` Maintenance

---

## Support & Resources

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [NextAuth.js Docs](https://next-auth.js.org)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

### Community
- GitHub Issues: Bug reports and feature requests
- GitHub Discussions: Questions and community support

---

*Last Updated: March 2026*
*Version: 1.0*
