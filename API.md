# DietScan — API Documentation

## Base URL
- **Development**: `http://localhost:3000`
- **Production**: `https://your-app.vercel.app`

---

## Authentication

All authenticated endpoints require a valid session cookie from NextAuth.js.

### Headers
```
Cookie: next-auth.session-token=...
Content-Type: application/json
```

---

## Endpoints

### Disease Management

#### POST `/api/disease/suggest`

Get AI-powered disease suggestions based on user input.

**Authentication**: Not required

**Rate Limit**: 30 requests/minute per IP

**Request Body**:
```json
{
  "query": "diabetes"
}
```

**Response** (200 OK):
```json
{
  "suggestions": [
    "Type 1 Diabetes",
    "Type 2 Diabetes",
    "Type 2 Diabetes on Insulin Therapy",
    "Gestational Diabetes",
    "Prediabetes (Impaired Glucose Tolerance)",
    "Diabetes with Diabetic Nephropathy",
    "Diabetes with Diabetic Retinopathy",
    "Diabetes with Cardiovascular Disease"
  ]
}
```

**Error Responses**:
- `400`: Missing query parameter
- `429`: Rate limit exceeded
- `500`: Internal server error

**Example**:
```typescript
const response = await fetch('/api/disease/suggest', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: 'diabetes' })
})
const data = await response.json()
```

---

### Diet Plan Management

#### POST `/api/diet-plan/generate`

Generate personalized diet plan for a disease.

**Authentication**: Not required (works for guests)

**Rate Limit**: 5 requests/minute per user/IP

**Request Body**:
```json
{
  "diseaseName": "Type 2 Diabetes on Insulin Therapy"
}
```

**Response** (200 OK):
```json
{
  "dietPlan": {
    "avoid": [
      "High-sugar foods and beverages",
      "Refined carbohydrates (white bread, white rice)",
      "Fried and processed foods"
    ],
    "prefer": [
      "Whole grains (brown rice, quinoa)",
      "Lean proteins (chicken, fish, tofu)",
      "Non-starchy vegetables",
      "Healthy fats (nuts, avocado, olive oil)"
    ],
    "watch": [
      "Carbohydrate counting for insulin dosing",
      "Consistent meal timing",
      "Monitor blood glucose before and after meals"
    ],
    "nutrients": {
      "Carbohydrates": "45-60g per meal",
      "Sugar": "< 5g per serving",
      "Fiber": "> 5g per serving",
      "Sodium": "< 300mg per serving"
    }
  }
}
```

**Error Responses**:
- `400`: Missing diseaseName
- `429`: Rate limit exceeded
- `500`: OpenAI API error

---

#### POST `/api/diet-plan/save`

Save diet plan to user profile.

**Authentication**: Required

**Request Body**:
```json
{
  "diseaseName": "Type 2 Diabetes",
  "dietPlan": { /* DietPlan object */ }
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "profile": {
    "id": "clx...",
    "diseaseName": "Type 2 Diabetes",
    "dietPlan": { /* saved plan */ }
  }
}
```

**Error Responses**:
- `401`: Not authenticated
- `400`: Invalid request body
- `500`: Database error

---

### Scanning

#### POST `/api/scan/barcode`

Lookup product by barcode from Open Food Facts.

**Authentication**: Not required

**Rate Limit**: 20 requests/minute per user/IP

**Request Body**:
```json
{
  "barcode": "8901058852429"
}
```

**Response** (200 OK):
```json
{
  "found": true,
  "product": {
    "name": "Maggi 2-Minute Noodles",
    "brand": "Nestlé",
    "ingredients": [
      "Wheat flour",
      "Palm oil",
      "Salt",
      "Spice mix"
    ],
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

**Response** (200 OK - Not Found):
```json
{
  "found": false
}
```

**Error Responses**:
- `400`: Missing barcode
- `429`: Rate limit exceeded
- `500`: API error

---

#### POST `/api/scan/ingredients`

Extract ingredients from image using OCR.

**Authentication**: Not required

**Rate Limit**: 10 requests/minute per user/IP

**Request Body**:
```json
{
  "imageBase64": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

**Response** (200 OK):
```json
{
  "ingredients": [
    "Wheat flour",
    "Refined palm oil",
    "Salt",
    "Sugar",
    "Yeast extract",
    "Spices"
  ],
  "rawText": "Ingredients: Wheat flour, Refined palm oil, Salt, Sugar, Yeast extract, Spices"
}
```

**Error Responses**:
- `400`: Missing or invalid image
- `429`: Rate limit exceeded
- `500`: OpenAI Vision API error

---

#### POST `/api/scan/verdict`

Analyze product against user's diet plan.

**Authentication**: Not required (uses provided diet plan)

**Rate Limit**: 20 requests/minute per user/IP

**Request Body**:
```json
{
  "diseaseName": "Type 2 Diabetes",
  "dietPlan": {
    "avoid": ["High-sugar foods"],
    "prefer": ["Whole grains"],
    "watch": ["Carbohydrate counting"],
    "nutrients": {
      "Sugar": "< 5g per serving"
    }
  },
  "product": {
    "name": "Maggi Noodles",
    "brand": "Nestlé",
    "ingredients": ["Wheat flour", "Palm oil", "Salt"],
    "nutrients": {
      "sodium": 870,
      "sugar": 2,
      "carbohydrates": 45
    }
  }
}
```

**Response** (200 OK):
```json
{
  "verdict": "CAUTION",
  "reason": "High sodium content (870mg per serving) and refined carbohydrates. While sugar is acceptable, the sodium level is concerning for diabetes management, especially if you have hypertension. The refined wheat flour will cause rapid blood sugar spikes.",
  "flaggedNutrients": ["sodium", "carbohydrates"],
  "safeAlternative": "Look for whole grain noodles with < 300mg sodium per serving, or choose brown rice instead."
}
```

**Verdict Values**:
- `SAFE`: Product is safe for the condition
- `CAUTION`: Okay in moderation, watch portions
- `AVOID`: Not recommended for the condition

**Error Responses**:
- `400`: Missing required fields
- `429`: Rate limit exceeded
- `500`: OpenAI API error

---

#### POST `/api/scan/history`

Save scan to user's history.

**Authentication**: Required

**Request Body**:
```json
{
  "productName": "Maggi Noodles",
  "brand": "Nestlé",
  "barcode": "8901058852429",
  "scanMethod": "BARCODE",
  "verdict": "CAUTION",
  "verdictDetail": {
    "reason": "High sodium...",
    "flaggedNutrients": ["sodium"]
  }
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "scanId": "clx..."
}
```

---

### User Management

#### GET `/api/user/profile`

Get user profile with all diseases and diet plans.

**Authentication**: Required

**Response** (200 OK):
```json
{
  "user": {
    "id": "clx...",
    "email": "user@example.com",
    "name": "John Doe",
    "image": "https://..."
  },
  "profile": {
    "id": "clx...",
    "diseaseName": "Type 2 Diabetes",
    "dietPlan": { /* plan */ },
    "isCustomized": false
  },
  "diseases": [
    {
      "id": "clx...",
      "diseaseName": "Type 2 Diabetes",
      "dietPlan": { /* plan */ },
      "isActive": true,
      "isCustomized": false
    },
    {
      "id": "clx...",
      "diseaseName": "Hypertension",
      "dietPlan": { /* plan */ },
      "isActive": false,
      "isCustomized": false
    }
  ],
  "scanHistory": [
    {
      "id": "clx...",
      "productName": "Maggi Noodles",
      "verdict": "CAUTION",
      "scannedAt": "2026-03-10T12:00:00Z"
    }
  ]
}
```

**Error Responses**:
- `401`: Not authenticated
- `404`: Profile not found
- `500`: Database error

---

#### PUT `/api/user/profile`

Update user profile or diet plan.

**Authentication**: Required

**Request Body**:
```json
{
  "diseaseName": "Type 2 Diabetes",
  "dietPlan": { /* updated plan */ }
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "profile": { /* updated profile */ }
}
```

---

#### PATCH `/api/user/active-disease`

Switch active disease for scanning.

**Authentication**: Required

**Request Body**:
```json
{
  "diseaseName": "Hypertension"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "activeDisease": "Hypertension"
}
```

---

## Rate Limiting

### Configuration

Rate limits are configurable via environment variables:

```bash
RATE_LIMIT_DISEASE_SUGGEST=30      # per minute
RATE_LIMIT_DIET_PLAN_GENERATE=5    # per minute
RATE_LIMIT_INGREDIENT_OCR=10       # per minute
RATE_LIMIT_VERDICT=20              # per minute
RATE_LIMIT_WINDOW_MS=60000         # 1 minute window
```

### Implementation

Rate limiting uses in-memory store with sliding window:
- Tracks requests per identifier (user ID or IP)
- Resets after window expires
- Returns 429 status when exceeded

### Identifier Logic
```typescript
const identifier = session?.user?.id || req.ip || 'anonymous'
```

---

## Error Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 400 | Bad Request | Missing required fields, invalid format |
| 401 | Unauthorized | Not authenticated, invalid session |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Database error, API error, unexpected exception |

---

## OpenAI Integration

### Models Used

| Endpoint | Model | Purpose | Cost |
|----------|-------|---------|------|
| /api/disease/suggest | gpt-4o-mini | Fast, cheap suggestions | Low |
| /api/diet-plan/generate | gpt-4o | Comprehensive medical analysis | Medium |
| /api/scan/ingredients | gpt-4o-vision | Image OCR | Medium |
| /api/scan/verdict | gpt-4o | Detailed verdict reasoning | Medium |

### Prompt Engineering

**Disease Suggestions**:
```
User is typing: "[query]"
Return 8 clinically specific disease variants meaningful for dietary management.
Consider stage, severity, complications, etiology.
Return JSON array of strings only.
```

**Diet Plan Generation**:
```
Generate a comprehensive diet plan for: [diseaseName]
Return JSON with: avoid[], prefer[], watch[], nutrients{}
Be specific with serving sizes and daily limits.
```

**Verdict Analysis**:
```
Patient has: [diseaseName]
Diet rules: [dietPlan]
Analyze product: [product data]
Return JSON: verdict, reason, flaggedNutrients[], safeAlternative
```

---

## Open Food Facts Integration

### API Endpoint
```
GET https://world.openfoodfacts.org/api/v2/product/{barcode}.json
```

### Response Mapping

```typescript
// Open Food Facts → Our Format
{
  name: product.product_name,
  brand: product.brands,
  ingredients: product.ingredients_text.split(','),
  nutrients: {
    sodium: product.nutriments.sodium_100g * servingSize / 100,
    sugar: product.nutriments.sugars_100g * servingSize / 100,
    // ... other nutrients
  }
}
```

### Fallback Strategy
1. Try world.openfoodfacts.org
2. If not found, try in.openfoodfacts.org (Indian products)
3. If still not found, return `{ found: false }`

---

## WebSocket/Real-time (Future)

Currently not implemented. All communication is REST-based.

Potential future use cases:
- Real-time scan collaboration
- Live diet plan updates from doctors
- Push notifications for new features

---

*API Version: 1.0*
*Last Updated: March 2026*
