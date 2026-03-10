# Requirements Document

## Introduction

DietScan is a mobile-first Progressive Web App (PWA) that helps people with medical conditions make safe food choices while grocery shopping. A user enters their medical condition once, receives an AI-generated personalized diet plan, and then uses their phone camera daily to scan food barcodes or ingredient labels to get an instant safe/caution/avoid verdict. The app follows a guest-first approach where the first scan requires zero authentication, with progressive auth gating thereafter. Full technical specification is available at #[[file:DietScan-TechSpec.md]].

## Glossary

- **DietScan_App**: The Next.js 14 App Router-based mobile-first PWA that serves as the main application shell, handling routing, layout, and page rendering.
- **Disease_Suggest_Service**: The API route handler (`/api/disease/suggest`) that accepts partial disease name input and calls OpenAI GPT-4o to return clinically specific disease variant suggestions.
- **Diet_Plan_Generator**: The API route handler (`/api/diet-plan/generate`) that accepts a confirmed disease name and calls OpenAI GPT-4o to produce a structured diet plan containing avoid/prefer/watch lists and nutrient targets.
- **Diet_Plan_Editor**: The client-side component that allows users to view, customize, and confirm their AI-generated diet plan by adding or removing food items and nutrient targets.
- **Barcode_Scanner**: The client-side component using ZXing-js library that accesses the device camera via `getUserMedia` API and continuously decodes video frames to extract barcode values (EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39, QR Code, DataMatrix).
- **Product_Lookup_Service**: The API route handler (`/api/scan/barcode`) that accepts a barcode string and queries the Open Food Facts API to retrieve product name, brand, ingredients, and nutrient data.
- **Ingredient_OCR_Service**: The API route handler (`/api/scan/ingredients`) that accepts a base64-encoded image and calls OpenAI GPT-4o Vision to extract ingredient text from food packaging photos.
- **Verdict_Analyzer**: The API route handler (`/api/scan/verdict`) that accepts product data, the user's disease name, and diet plan, then calls OpenAI GPT-4o to produce a SAFE/CAUTION/AVOID verdict with reasoning.
- **Auth_Gate**: The client-side mechanism that tracks guest scan count in localStorage and enforces progressive authentication requirements (soft prompt after first scan, hard gate after second scan).
- **Guest_State_Manager**: The client-side hook (`useGuestState`) that manages disease selection, diet plan, and scan count data in browser localStorage for unauthenticated users.
- **Migration_Service**: The server-side logic that transfers guest localStorage data (disease name, diet plan) to the PostgreSQL database upon first Google OAuth sign-in.
- **Rate_Limiter**: The server-side middleware that enforces per-user usage caps on AI-powered endpoints (disease suggest, diet plan generation, barcode scanning, ingredient OCR, verdict analysis), configurable via environment variables by an administrator.
- **Medical_Disclaimer_Component**: The UI component that displays a prominent medical disclaimer informing users that DietScan does not provide medical advice and that users should consult healthcare professionals.
- **User_Profile_Service**: The API route handler (`/api/user/profile`) that manages reading and updating authenticated user profile data (disease name and diet plan) in the database.
- **Scan_History_Service**: The database-backed service that persists scan results (product name, brand, barcode, scan method, verdict, and verdict detail) for authenticated users.
- **Diet_Plan**: A JSON structure containing four fields: `avoid` (array of foods to avoid), `prefer` (array of recommended foods), `watch` (array of dietary guidelines), and `nutrients` (record of nutrient name to target limit string).
- **Verdict**: One of three possible outcomes from food analysis: SAFE (food is compatible with the user's condition), CAUTION (food is acceptable in moderation), or AVOID (food is not recommended for the user's condition).
- **Scan_Method**: The technique used to identify a food product, either BARCODE (camera-based barcode decoding via ZXing-js) or INGREDIENT_OCR (camera-based ingredient text extraction via GPT-4o Vision).

## Requirements

### Requirement 1: Disease Selection with AI Auto-Suggest

**User Story:** As a user with a medical condition, I want to type my disease name and receive clinically specific variant suggestions, so that I can select the most accurate description of my condition for personalized dietary guidance.

#### Acceptance Criteria

1. WHEN a user types at least 2 characters into the disease input field, THE Disease_Suggest_Service SHALL call OpenAI GPT-4o after a 400ms debounce period and return 6 to 8 clinically specific disease variant suggestions.
2. WHEN the Disease_Suggest_Service receives a misspelled disease name, THE Disease_Suggest_Service SHALL still return relevant disease variant suggestions by leveraging GPT-4o's natural language understanding.
3. WHEN a user selects a suggestion from the dropdown, THE DietScan_App SHALL populate the disease input field with the selected suggestion and visually indicate the selection as confirmed.
4. WHEN a user types a disease name that GPT-4o does not recognize as a medical condition, THE DietScan_App SHALL allow the user to proceed with the typed text as-is.
5. WHILE the Disease_Suggest_Service is processing a request, THE DietScan_App SHALL display a loading indicator in the suggestion dropdown area.
6. IF the Disease_Suggest_Service fails to return suggestions due to a network or API error, THEN THE DietScan_App SHALL display an error message and allow the user to retry or proceed with manually typed text.

### Requirement 2: AI-Generated Diet Plan

**User Story:** As a user who has selected a medical condition, I want to receive a personalized AI-generated diet plan, so that I know which foods to avoid, prefer, and which nutrients to monitor.

#### Acceptance Criteria

1. WHEN a user confirms a disease selection, THE Diet_Plan_Generator SHALL call OpenAI GPT-4o and return a structured Diet_Plan containing avoid, prefer, watch, and nutrients fields within 5 seconds.
2. WHILE the Diet_Plan_Generator is generating a diet plan, THE DietScan_App SHALL display a skeleton loading UI on the diet plan review screen.
3. WHEN a diet plan is generated, THE DietScan_App SHALL display foods to avoid as red chips, recommended foods as green chips, nutrients to watch as a text list, and nutrient targets as a grid.
4. IF the Diet_Plan_Generator fails to generate a diet plan due to an API error, THEN THE DietScan_App SHALL display an error message with a retry option.
5. THE Medical_Disclaimer_Component SHALL be visible on the diet plan review screen at all times.

### Requirement 3: Diet Plan Editing

**User Story:** As a user, I want to edit my AI-generated diet plan by adding or removing items, so that I can incorporate my doctor's specific instructions.

#### Acceptance Criteria

1. WHEN a user taps the Edit button on the diet plan screen, THE Diet_Plan_Editor SHALL make food chips removable and display Add buttons for each category (avoid, prefer, watch).
2. WHEN a user adds a custom food item, THE Diet_Plan_Editor SHALL append the item to the appropriate category in the Diet_Plan.
3. WHEN a user removes a food chip, THE Diet_Plan_Editor SHALL remove the item from the Diet_Plan.
4. WHEN a user confirms the edited diet plan, THE DietScan_App SHALL save the updated Diet_Plan and set the `isCustomized` flag to true.
5. WHEN an authenticated user saves a diet plan, THE User_Profile_Service SHALL persist the Diet_Plan to the database.
6. WHEN a guest user saves a diet plan, THE Guest_State_Manager SHALL persist the Diet_Plan to localStorage.

### Requirement 4: Barcode Scanning

**User Story:** As a user grocery shopping, I want to scan a food product's barcode with my phone camera, so that I can quickly identify the product and get a dietary verdict.

#### Acceptance Criteria

1. WHEN the scan screen mounts, THE Barcode_Scanner SHALL request camera permission via the browser `getUserMedia` API and begin continuous barcode decoding using ZXing-js.
2. WHEN the Barcode_Scanner successfully decodes a barcode from the camera feed, THE Barcode_Scanner SHALL stop the camera stream and pass the decoded barcode value to the Product_Lookup_Service.
3. THE Barcode_Scanner SHALL support decoding EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39, QR Code, and DataMatrix barcode formats.
4. IF the user denies camera permission, THEN THE DietScan_App SHALL display a message explaining that camera access is required for barcode scanning.
5. IF no camera is detected on the device, THEN THE DietScan_App SHALL display a message indicating that a camera is required for scanning.
6. WHEN the DietScan_App navigates away from the scan screen, THE Barcode_Scanner SHALL call `codeReader.reset()` to release the camera resource.

### Requirement 5: Product Lookup via Open Food Facts

**User Story:** As a user who has scanned a barcode, I want the app to retrieve the product's name, brand, ingredients, and nutritional data, so that the verdict can be calculated.

#### Acceptance Criteria

1. WHEN the Product_Lookup_Service receives a barcode, THE Product_Lookup_Service SHALL query the Open Food Facts API (`https://world.openfoodfacts.org/api/v2/product/{barcode}.json`) and return the product name, brand, ingredients list, and per-serving nutrient values.
2. WHEN the Open Food Facts API returns nutrient data per 100g, THE Product_Lookup_Service SHALL convert nutrient values to per-serving amounts using the product's serving size.
3. IF the barcode is not found in the Open Food Facts database, THEN THE DietScan_App SHALL offer the user a fallback option to scan the ingredient label using the Ingredient_OCR_Service.
4. IF the Open Food Facts API request fails due to a network error, THEN THE Product_Lookup_Service SHALL return an error response and THE DietScan_App SHALL display a retry option.

### Requirement 6: Ingredient OCR via GPT-4o Vision

**User Story:** As a user whose product barcode was not found, I want to photograph the ingredient label and have the app extract the ingredients, so that I can still get a dietary verdict.

#### Acceptance Criteria

1. WHEN a user captures an image of an ingredient label, THE Ingredient_OCR_Service SHALL send the base64-encoded JPEG image to OpenAI GPT-4o Vision and return a parsed list of ingredient strings and the raw extracted text.
2. WHEN the Ingredient_OCR_Service successfully extracts ingredients, THE DietScan_App SHALL pass the extracted ingredients to the Verdict_Analyzer for analysis.
3. IF the Ingredient_OCR_Service fails to extract readable text from the image, THEN THE DietScan_App SHALL display a message suggesting the user ensure the text is well-lit and in focus, and offer a manual text entry option.
4. THE DietScan_App SHALL display an in-app tip on the ingredient capture screen stating "Make sure the text is well-lit and in focus."

### Requirement 7: Food Verdict Analysis

**User Story:** As a user who has scanned a food product, I want to receive a clear S