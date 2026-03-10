# DietScan — Technical Architecture

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Browser    │  │  Camera API  │  │   localStorage       │  │
│  │   (React)    │  │  (ZXing-js)  │  │   (Guest State)      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│         │                  │                     │               │
│         └──────────────────┴─────────────────────┘               │
│                            │                                     │
└────────────────────────────┼─────────────────────────────────────┘
                             │
                             │ HTTPS
                             │
┌────────────────────────────┼─────────────────────────────────────┐
│                            ▼                                     │
│                   NEXT.JS SERVER                                 │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐     │
│  │              App Router (Pages)                        │     │
│  │  • /setup (Disease Selection)                          │     │
│  │  • /setup/diet-plan (Plan Review)                      │     │
│  │  • /scan (Camera Scanner)                              │     │
│  │  • /scan/result (Verdict Display)                      │     │
│  │  • /profile (User Profile)                             │     │
│  └────────────────────────────────────────────────────────┘     │
│                            │                                     │
│  ┌────────────────────────────────────────────────────────┐     │
│  │              API Routes (Serverless)                   │     │
│  │  • POST /api/disease/suggest                           │     │
│  │  • POST /api/diet-plan/generate                        │     │
│  │  • POST /api/scan/barcode                              │     │
│  │  • POST /api/scan/ingredients                          │     │
│  │  • POST /api/scan/verdict                              │     │
│  │  • GET/PUT /api/user/profile                           │     │
│  └────────────────────────────────────────────────────────┘     │
│                            │                                     │
│  ┌────────────────────────────────────────────────────────┐     │
│  │              Middleware Layer                          │     │
│  │  • NextAuth.js (Session Management)                    │     │
│  │  • Rate Limiter (API Protection)                       │     │
│  │  • Prisma Client (Database Access)                     │     │
│  └────────────────────────────────────────────────────────┘     │
└────────────────────────────┬───────────────┬─────────────────────┘
                             │               │
                    ┌────────┴────────┐     │
                    │                 │     │
                    ▼                 ▼     ▼
         ┌──────────────────┐  ┌──────────────┐  ┌──────────────┐
         │   OpenAI API     │  │    Neon      │  │ Open Food    │
         │                  │  │  PostgreSQL  │  │  Facts API   │
         │  • GPT-4o        │  │              │  │              │
         │  • GPT-4o-mini   │  │  (Serverless)│  │  (Free API)  │
         │  • Vision API    │  │              │  │              │
         └──────────────────┘  └──────────────┘  └──────────────┘
```

---

## Component Architecture

### Page Components (Server Components)

```
app/
├── layout.tsx                    # Root layout with providers
├── page.tsx                      # Landing/redirect logic
├── setup/
│   ├── page.tsx                  # Disease selection (client)
│   └── diet-plan/
│       └── page.tsx              # Diet plan review (client)
├── scan/
│   ├── page.tsx                  # Scanner (client)
│   └── result/
│       └── page.tsx              # Verdict display (client)
└── profile/
    └── page.tsx                  # User profile (client)
```

### Reusable Components

```
components/
├── ui/                           # Base components
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Chip.tsx
│   ├── Input.tsx
│   ├── LoadingSpinner.tsx
│   ├── AppHeader.tsx
│   └── MedicalDisclaimer.tsx
├── disease/
│   ├── DiseaseSearchInput.tsx    # Search with AI suggestions
│   └── SuggestionDropdown.tsx    # Dropdown list
├── diet-plan/
│   ├── DietPlanCard.tsx          # Full plan display
│   ├── FoodChipList.tsx          # Chip lists
│   └── NutrientTargetGrid.tsx    # Nutrient grid
├── scanner/
│   ├── BarcodeScanner.tsx        # ZXing scanner
│   ├── CameraViewfinder.tsx      # Camera UI
│   ├── IngredientCapture.tsx     # OCR capture
│   └── ScanModeToggle.tsx        # Mode switcher
├── verdict/
│   ├── VerdictBanner.tsx         # Verdict display
│   ├── ProductCard.tsx           # Product info
│   └── NutrientBreakdown.tsx     # Nutrient details
└── auth/
    └── AuthPromptModal.tsx       # Sign-in prompt
```

---

## Data Flow Diagrams

### Disease Selection Flow

```
User types "diabetes"
       │
       ▼
useDiseaseSearch hook
       │ (400ms debounce)
       ▼
POST /api/disease/suggest
       │
       ▼
OpenAI GPT-4o-mini
       │
       ▼
Returns 8 specific variants
       │
       ▼
SuggestionDropdown displays
       │
       ▼
User selects variant
       │
       ▼
Selected disease stored
```

### Diet Plan Generation Flow

```
User confirms disease
       │
       ▼
POST /api/diet-plan/generate
       │
       ▼
OpenAI GPT-4o
       │ (Prompt: Generate diet plan for [disease])
       ▼
Returns structured diet plan
       │
       ▼
DietPlanCard displays
       │
       ▼
User reviews/edits
       │
       ▼
POST /api/diet-plan/save
       │
       ▼
Saved to database (or localStorage)
```

### Barcode Scan Flow

```
Camera opens
       │
       ▼
ZXing-js decodes frames
       │
       ▼
Barcode detected
       │
       ▼
POST /api/scan/barcode
       │
       ▼
Open Food Facts API
       │
       ▼
Product data returned
       │
       ▼
POST /api/scan/verdict
       │
       ▼
OpenAI GPT-4o analyzes
       │
       ▼
Verdict displayed
```

### Ingredient OCR Flow

```
User captures image
       │
       ▼
Image → base64
       │
       ▼
POST /api/scan/ingredients
       │
       ▼
OpenAI Vision API
       │
       ▼
Ingredients extracted
       │
       ▼
POST /api/scan/verdict
       │
       ▼
OpenAI GPT-4o analyzes
       │
       ▼
Verdict displayed
```

---

## State Management

### Client State (React)
- Session state via NextAuth `useSession`
- Form state via `useState`
- Loading states per component
- Error boundaries for error handling

### Server State (Database)
- User profiles
- Diet plans
- Scan history
- Disease configurations

### Guest State (localStorage)
- `dietscan_disease`: Selected disease
- `dietscan_diet_plan`: Generated plan
- `dietscan_guest_scans`: Scan count
- `dietscan_recent_diseases`: Recent searches

### State Migration
On authentication:
1. Read localStorage data
2. Save to database via API
3. Clear localStorage
4. Redirect to scan page

---

## API Design Patterns

### Request/Response Format
All API routes use JSON:
```typescript
// Request
{ field: value }

// Success Response
{ data: result }

// Error Response
{ error: "Error message" }
```

### Error Handling
```typescript
try {
  // API logic
  return NextResponse.json({ data })
} catch (error) {
  console.error(error)
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
}
```

### Rate Limiting Pattern
```typescript
const limiter = new RateLimiter({
  windowMs: 60000,
  max: 30
})

const identifier = session?.user?.id || ip
const allowed = await limiter.check(identifier)

if (!allowed) {
  return NextResponse.json(
    { error: 'Rate limit exceeded' },
    { status: 429 }
  )
}
```

---

## Mobile Considerations

### Camera Access
- Requires HTTPS (even on localhost)
- iOS Safari 14.3+ required
- Android Chrome 90+ required
- Permission prompts handled gracefully

### Responsive Design
- Mobile-first Tailwind classes
- Touch-friendly button sizes (min 44x44px)
- Optimized for 375px width (iPhone SE)
- Tested up to 428px (iPhone Pro Max)

### Performance
- Lazy load camera components
- Optimize images for mobile
- Minimize JavaScript bundle
- Fast initial page load

### PWA Features
- manifest.json configured
- Add to home screen support
- Splash screen
- App icons (multiple sizes)

---

## Development Guidelines

### TypeScript Usage
- Strict mode enabled
- No `any` types
- Proper type definitions for all APIs
- Shared types in `src/types/`

### Component Patterns
- Server components by default
- Client components only when needed
- Props interfaces defined
- Proper error boundaries

### Styling Guidelines
- Tailwind utility classes
- No custom CSS files (except globals.css)
- Consistent color palette (emerald/teal theme)
- Responsive breakpoints: sm, md, lg

### Testing Requirements
- Unit tests for utilities
- Component tests for UI
- Integration tests for API routes
- Property-based tests for critical logic

---

*Architecture Version: 1.0*
*Last Updated: March 2026*
