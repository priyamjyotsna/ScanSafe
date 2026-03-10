# Implementation Plan: DietScan MVP

## Overview

Build a mobile-first PWA using Next.js 14 (App Router), TypeScript, Tailwind CSS, Prisma + Neon PostgreSQL, NextAuth.js v5, OpenAI GPT-4o, ZXing-js, and Open Food Facts API. The implementation follows the four-step user journey: disease selection → diet plan generation → food scanning → verdict display, with guest-first auth and localStorage-to-database migration.

## Tasks

- [ ] 1. Project setup, types, and core infrastructure
  - [x] 1.1 Initialize Next.js 14 project with TypeScript, Tailwind CSS, and install dependencies (`prisma`, `@prisma/client`, `next-auth@beta`, `openai`, `@zxing/library`, `fast-check`, `vitest`)
    - Create `.env.example` with all required environment variables (DATABASE_URL, DIRECT_URL, NEXTAUTH_URL, NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, OPENAI_API_KEY, NEXT_PUBLIC_APP_URL, rate limit env vars)
    - Configure `vitest.config.ts` with jsdom environment
    - _Requirements: Tech Stack (design overview)_

  - [x] 1.2 Define TypeScript types and interfaces
    - Create `src/types/diet.ts` with `DietPlan`, `VerdictType`, `FoodVerdict` types
    - Create `src/types/scan.ts` with `ProductData`, `NutrientMap`, `ScanMethodType`, `ScanResult` types
    - Create `src/types/api.ts` with all API request/response interfaces (`DiseaseSuggestRequest`, `DiseaseSuggestResponse`, `DietPlanGenerateRequest`, `DietPlanGenerateResponse`, `BarcodeLookupRequest`, `BarcodeLookupResponse`, `IngredientOCRRequest`, `IngredientOCRResponse`, `VerdictRequest`, `VerdictResponse`, `ApiErrorResponse`, etc.)
    - _Requirements: 1.1, 2.1, 5.1, 7.1_

  - [x] 1.3 Set up Prisma schema and database
    - Create `prisma/schema.prisma` with User, UserProfile, ScanHistory models and ScanMethod/Verdict enums
    - Configure Neon PostgreSQL datasource with `pgbouncer=true` connection pooling
    - Create `src/lib/prisma.ts` singleton client
    - _Requirements: 3.5, 7.4, 9.1_

  - [x] 1.4 Set up OpenAI client singleton and constants
    - Create `src/lib/openai.ts` with OpenAI client initialization
    - Create `src/lib/constants.ts` with app-wide constants (debounce timing, max tokens per endpoint, localStorage keys, rate limit defaults)
    - _Requirements: 1.1, 2.1_

- [ ] 2. Authentication and guest state management
  - [x] 2.1 Configure NextAuth.js v5 with Google OAuth
    - Create `src/lib/auth.ts` with Google provider, JWT session strategy
    - Implement `signIn`, `session`, `jwt` callbacks to attach user database ID to session
    - Create `src/app/api/auth/[...nextauth]/route.ts` handler
    - Create `src/app/(auth)/signin/page.tsx` custom sign-in page
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 2.2 Implement guest state management hooks
    - Create `src/hooks/useGuestState.ts` managing `dietscan_disease`, `dietscan_diet_plan`, `dietscan_guest_scans`, `dietscan_migration_pending` in localStorage
    - Create `src/hooks/useScanCount.ts` with `shouldShowSoftPrompt` (count == 1) and `shouldShowHardGate` (count >= 2) logic
    - _Requirements: 3.6, 8.1, 8.2, 8.3_

  - [ ]* 2.3 Write property test for auth gate behavior by scan count
    - **Property 15: Auth gate behavior by scan count**
    - For any guest scan count `n`: no prompt when n==0, soft prompt when n==1, hard gate when n>=2
    - **Validates: Requirements 8.1, 8.2, 8.3**

  - [x] 2.4 Implement AuthPromptModal component
    - Create `src/components/auth/AuthPromptModal.tsx` with soft (dismissible) and hard (blocking) modes
    - Soft mode shows "Maybe Later" button; hard mode requires sign-in
    - _Requirements: 8.1, 8.2, 8.3_

- [ ] 3. Rate limiter middleware
  - [x] 3.1 Implement rate limiter middleware
    - Create `src/lib/rate-limiter.ts` with in-memory Map store keyed by user ID or IP
    - Read limits from environment variables: `RATE_LIMIT_DISEASE_SUGGEST`, `RATE_LIMIT_DIET_PLAN_GENERATE`, `RATE_LIMIT_INGREDIENT_OCR`, `RATE_LIMIT_VERDICT`, `RATE_LIMIT_WINDOW_MS`
    - Implement sliding window algorithm; return 429 when limit exceeded
    - _Requirements: 10.1, 10.2_

  - [ ]* 3.2 Write property test for rate limiter enforcement
    - **Property 18: Rate limiter enforces configured limits**
    - For any configured limit N, the (N+1)th request within the window returns 429
    - **Validates: Requirements 10.1, 10.2**

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Disease selection feature
  - [x] 5.1 Implement disease suggest API route
    - Create `src/app/api/disease/suggest/route.ts` with POST handler
    - Validate query is >= 2 characters, call OpenAI GPT-4o with disease suggest prompt, parse JSON response
    - Apply rate limiter middleware; set `max_tokens: 500`
    - Return `{ suggestions: string[] }` with 6-8 items
    - _Requirements: 1.1, 1.2, 1.4, 1.6_

  - [ ]* 5.2 Write property test for disease suggest response shape
    - **Property 1: Disease suggest returns valid response shape**
    - For any query string >= 2 chars, response contains `suggestions` array with 6-8 string elements
    - **Validates: Requirements 1.1**

  - [x] 5.3 Implement disease search UI components
    - Create `src/hooks/useDiseaseSearch.ts` with 400ms debounced API calls to `/api/disease/suggest`
    - Create `src/components/disease/SuggestionDropdown.tsx` with loading state and suggestion list
    - Create `src/components/disease/DiseaseSearchInput.tsx` typeahead input with debounce, loading indicator, error handling, and fallback to manual text
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6_

  - [x] 5.4 Build disease selection page
    - Create `src/app/setup/page.tsx` with DiseaseSearchInput, confirm button, and navigation to diet plan page
    - Store selected disease in localStorage via useGuestState for guests
    - _Requirements: 1.3, 1.4, 3.6_

- [ ] 6. Diet plan generation and editing
  - [x] 6.1 Implement diet plan generate API route
    - Create `src/app/api/diet-plan/generate/route.ts` with POST handler
    - Call OpenAI GPT-4o with diet plan generation prompt; set `max_tokens: 1000`
    - Apply rate limiter; return structured `{ dietPlan: DietPlan }` response
    - _Requirements: 2.1, 2.4_

  - [ ]* 6.2 Write property test for diet plan response structure
    - **Property 4: Diet plan response structure validation**
    - For any response, `dietPlan` contains non-empty `avoid`, `prefer`, `watch` arrays and `nutrients` record
    - **Validates: Requirements 2.1**

  - [x] 6.3 Implement diet plan UI components
    - Create `src/components/ui/Chip.tsx`, `src/components/ui/Button.tsx`, `src/components/ui/Card.tsx`, `src/components/ui/Input.tsx`, `src/components/ui/LoadingSpinner.tsx` reusable primitives
    - Create `src/components/diet-plan/FoodChipList.tsx` with red/green chips, removable mode, and add button
    - Create `src/components/diet-plan/NutrientTargetGrid.tsx` for nutrient limits display
    - Create `src/components/diet-plan/DietPlanCard.tsx` combining all sections with edit/confirm toggle
    - _Requirements: 2.3, 3.1, 3.2, 3.3_

  - [x] 6.4 Implement diet plan editing logic
    - Add `addFoodItem` and `removeFoodItem` utility functions in `src/utils/dietPlan.ts`
    - Wire edit mode in DietPlanCard: chips become removable, Add buttons appear per category
    - Set `isCustomized = true` on any modification and confirm
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 6.5 Write property tests for diet plan editing
    - **Property 5: Adding a food item grows the category**
    - **Property 6: Removing a food item shrinks the category**
    - **Property 7: Editing sets isCustomized flag**
    - **Validates: Requirements 3.2, 3.3, 3.4**

  - [x] 6.6 Implement MedicalDisclaimer component
    - Create `src/components/ui/MedicalDisclaimer.tsx` with prominent disclaimer text
    - Include on diet plan review screen and other required screens
    - _Requirements: 2.5, 11.1_

  - [x] 6.7 Build diet plan review page
    - Create `src/app/setup/diet-plan/page.tsx` with skeleton loading UI, DietPlanCard, MedicalDisclaimer, and save/confirm flow
    - Save to localStorage for guests, navigate to scan screen on confirm
    - _Requirements: 2.2, 2.3, 2.5, 3.4, 3.6_

- [ ] 7. Diet plan persistence and user profile
  - [x] 7.1 Implement diet plan save API route
    - Create `src/app/api/diet-plan/save/route.ts` with POST handler
    - Accept `{ diseaseName, dietPlan, isCustomized }`, upsert UserProfile in database transaction
    - _Requirements: 3.5_

  - [x] 7.2 Implement user profile API route
    - Create `src/app/api/user/profile/route.ts` with GET and PUT handlers
    - GET returns authenticated user's disease name, diet plan, isCustomized
    - PUT updates diet plan and isCustomized flag
    - _Requirements: 3.5_

  - [ ]* 7.3 Write property test for diet plan persistence round-trip
    - **Property 8: Diet plan persistence round-trip**
    - For any valid DietPlan, saving and loading back produces a deeply equal DietPlan
    - **Validates: Requirements 3.5, 3.6**

- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Barcode scanning and product lookup
  - [x] 9.1 Implement Open Food Facts utility and barcode lookup API
    - Create `src/utils/openFoodFacts.ts` with `lookupBarcode` function querying Open Food Facts API
    - Implement nutrient per-100g to per-serving conversion using `convertNutrientPerServing(value, servingSize)` in `src/utils/openFoodFacts.ts`
    - Create `src/app/api/scan/barcode/route.ts` POST handler returning `{ found, product? }` with mapped ProductData
    - Handle missing fields, malformed data, and network errors
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 9.2 Write property test for nutrient conversion
    - **Property 9: Nutrient per-100g to per-serving conversion**
    - For any non-negative value `v` and positive serving size `s`, per-serving equals `v * s / 100`
    - **Validates: Requirements 5.2**

  - [x] 9.3 Implement BarcodeScanner component
    - Create `src/components/scanner/BarcodeScanner.tsx` using `@zxing/library` with dynamic import (`ssr: false`)
    - Request camera via `getUserMedia`, continuously decode video frames
    - On decode: stop camera, call `onDecode` callback with barcode string
    - Handle camera denied, no camera, and cleanup via `codeReader.reset()` on unmount
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 9.4 Implement scanner UI components
    - Create `src/components/scanner/CameraViewfinder.tsx` camera overlay UI
    - Create `src/components/scanner/ScanModeToggle.tsx` for barcode/ingredient mode switch
    - _Requirements: 4.1_

- [ ] 10. Ingredient OCR feature
  - [x] 10.1 Implement ingredient OCR API route
    - Create `src/app/api/scan/ingredients/route.ts` POST handler
    - Accept `{ imageBase64 }`, call OpenAI GPT-4o Vision to extract ingredients
    - Apply rate limiter; return `{ ingredients: string[], rawText: string }`
    - Handle OCR failure with appropriate error response
    - _Requirements: 6.1, 6.3_

  - [x] 10.2 Implement ingredient capture UI
    - Add image capture button to scan screen for ingredient label photography
    - Display in-app tip "Make sure the text is well-lit and in focus"
    - Offer manual text entry fallback on OCR failure
    - _Requirements: 6.3, 6.4_

- [ ] 11. Verdict analysis and display
  - [x] 11.1 Implement verdict API route
    - Create `src/app/api/scan/verdict/route.ts` POST handler
    - Accept `{ diseaseName, dietPlan, product }`, call OpenAI GPT-4o with clinical dietitian prompt
    - Apply rate limiter; set `max_tokens: 300`
    - Return `{ verdict, reason, flaggedNutrients, safeAlternative? }`
    - Save to ScanHistory for authenticated users
    - _Requirements: 7.1, 7.2, 7.4_

  - [ ]* 11.2 Write property test for verdict response shape
    - **Property 12: Verdict response contains required fields**
    - For any verdict response: contains verdict (SAFE/CAUTION/AVOID), non-empty reason, flaggedNutrients array; CAUTION/AVOID also have non-empty safeAlternative
    - **Validates: Requirements 7.1, 7.2**

  - [x] 11.3 Implement verdict display components
    - Create `src/components/verdict/VerdictBanner.tsx` with green (SAFE), amber (CAUTION), red (AVOID) banners
    - Create `src/components/verdict/ProductCard.tsx` showing product name and brand
    - Create `src/components/verdict/NutrientBreakdown.tsx` with flagged nutrients highlighted
    - _Requirements: 7.3_

  - [x] 11.4 Build scan and result pages
    - Create `src/app/scan/page.tsx` with BarcodeScanner, ScanModeToggle, CameraViewfinder, ingredient capture, loading states, and auth gate integration via useScanCount
    - Create `src/app/scan/result/page.tsx` with VerdictBanner, ProductCard, NutrientBreakdown, MedicalDisclaimer, "Scan Another" button, and "Save to History" for authenticated users
    - Wire barcode decode → product lookup → verdict → display flow
    - Wire ingredient capture → OCR → verdict → display flow
    - Offer ingredient OCR fallback when barcode not found
    - _Requirements: 4.1, 4.2, 5.3, 6.2, 7.3, 8.1, 8.2, 8.3_

- [ ] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. localStorage-to-database migration
  - [x] 13.1 Implement migration service
    - Create migration logic in client-side post-auth effect: read `dietscan_disease`, `dietscan_diet_plan` from localStorage
    - Send migration payload to `POST /api/diet-plan/save`
    - Server-side: check if user already has a profile — if yes, skip migration (don't overwrite); if no, create UserProfile in a Prisma transaction
    - On success: clear all `dietscan_*` localStorage keys
    - On failure: set `dietscan_migration_pending` flag, retry on next authenticated page load
    - Pre-validate localStorage data is parseable JSON before attempting migration
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ]* 13.2 Write property test for migration idempotence
    - **Property 17: Migration is idempotent for existing profiles**
    - For any user with existing UserProfile, triggering migration does not modify existing DB data
    - **Validates: Requirements 9.4**

  - [ ]* 13.3 Write property test for migration data transfer
    - **Property 16: Migration transfers data and clears localStorage**
    - For any guest with disease + diet plan in localStorage, after successful migration the DB contains matching UserProfile and localStorage keys are cleared
    - **Validates: Requirements 9.1, 9.2**

- [ ] 14. Landing page and routing
  - [x] 14.1 Implement root layout and landing page
    - Create `src/app/layout.tsx` with mobile-first viewport, fonts, session provider, Tailwind setup
    - Create `src/app/page.tsx` with redirect logic: authenticated + profile → `/scan`, otherwise → `/setup`
    - _Requirements: User flow (design overview)_

  - [x] 14.2 Set up PWA manifest
    - Create `public/manifest.json` with app name, icons, theme color, display: standalone
    - Add manifest link to root layout
    - _Requirements: PWA setup_

- [ ] 15. Error handling and shared utilities
  - [x] 15.1 Implement shared error handling utilities
    - Create `src/utils/fetchWithRetry.ts` with exponential backoff (max 3 attempts) for retryable errors
    - Create consistent `ApiErrorResponse` format across all API routes (`{ error, code, retryable }`)
    - _Requirements: 1.6, 2.4, 5.4, 6.3_

- [ ] 16. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All code uses TypeScript throughout, matching the design document
- The design uses an in-memory rate limiter (Map per Vercel instance) — acceptable for MVP
- Medical disclaimer must appear on diet plan review screen and verdict screen
