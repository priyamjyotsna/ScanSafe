<div align="center">

# DietScan (ScanSafe)

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.18942716.svg)](https://doi.org/10.5281/zenodo.18942716)
[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://scan-safe.vercel.app)

**A mobile-first Progressive Web App that helps people with medical conditions make safe food choices while grocery shopping.**

[Live Demo](https://scan-safe.vercel.app) · [Documentation](./DOCUMENTATION.md) · [Report Bug](https://github.com/priyamjyotsna/ScanSafe/issues) · [Request Feature](https://github.com/priyamjyotsna/ScanSafe/issues)

</div>

---

## 📋 Table of Contents

- [About The Project](#about-the-project)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Setup](#environment-setup)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Deployment](#deployment)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [Citation](#citation)
- [License](#license)
- [Contact](#contact)
- [Acknowledgments](#acknowledgments)

---

## 🎯 About The Project

**DietScan (ScanSafe)** bridges the gap between doctor's dietary advice and real grocery shopping decisions. Instead of manually reading labels and cross-referencing medical restrictions, users simply scan products to get instant, personalized safe/caution/avoid verdicts.

### The Problem

People with medical conditions face daily challenges:
- Complex dietary restrictions from doctors
- Overwhelming nutrition labels
- Uncertainty about food safety
- Time-consuming manual label reading
- Risk of consuming harmful foods

### The Solution

DietScan provides:
- **Instant Analysis**: Scan any barcode or ingredient label
- **AI-Powered Guidance**: Personalized verdicts based on your condition
- **Medical Accuracy**: GPT-4o analyzes products against your diet plan
- **Guest-Friendly**: Try 3 scans before signing in
- **Multi-Disease Support**: Manage multiple conditions seamlessly

### Built With

- [Next.js 14](https://nextjs.org/) - React framework with App Router
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Prisma](https://www.prisma.io/) - Database ORM
- [NextAuth.js](https://next-auth.js.org/) - Authentication
- [OpenAI GPT-4o](https://openai.com/) - AI analysis
- [ZXing-js](https://github.com/zxing-js/library) - Barcode scanning
- [Open Food Facts](https://world.openfoodfacts.org/) - Product database
- [Neon](https://neon.tech/) - Serverless PostgreSQL
- [Vercel](https://vercel.com/) - Deployment

---

## ✨ Key Features

### 🔍 AI-Powered Disease Search
- Intelligent auto-suggestions for specific disease variants
- 400ms debounced search for smooth UX
- Handles misspellings naturally
- 8 clinically specific suggestions per query

### 🎯 Personalized Diet Plans
- AI-generated plans tailored to your condition
- Editable: Add/remove items based on doctor's advice
- Structured format: Avoid / Prefer / Watch / Nutrients
- Saved to database or localStorage (guest mode)

### 📱 Barcode Scanner
- Client-side scanning with ZXing-js (no server needed)
- Supports EAN-13, UPC-A, Code 128, QR codes, and more
- Works on iOS 14.3+ and Android
- Instant product lookup from Open Food Facts (3M+ products)

### 📸 Ingredient OCR
- GPT-4o Vision extracts ingredients from photos
- Fallback when barcode isn't available
- Works with any language on the label
- Smart image quality guidance

### ✅ Smart Verdicts
- Three clear states: Safe / Caution / Avoid
- Disease-specific reasoning (2-3 sentences)
- Flagged nutrients highlighted
- Safe alternative suggestions

### 📊 Scan History
- Track all your scans (authenticated users)
- Review past decisions
- Export-ready for doctor visits

### 👥 Multi-Disease Support
- Manage multiple conditions
- Quick switching between diseases
- One active disease at a time for scanning

### 🚀 Guest Mode
- Try 3 scans without signing in
- Soft authentication prompts
- Seamless data migration on sign-in

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.2.35 | Full-stack React framework |
| React | 18 | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.4.1 | Utility-first styling |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js API Routes | 14.2.35 | RESTful API |
| Prisma ORM | 7.4.2 | Database access |
| Neon PostgreSQL | 16 | Serverless database |
| NextAuth.js | 5.0.0-beta.30 | Google OAuth |

### AI & External Services
| Service | Model/Version | Purpose |
|---------|---------------|---------|
| OpenAI GPT-4o | latest | Disease suggestions, diet plans |
| OpenAI GPT-4o-mini | latest | Verdict analysis |
| OpenAI GPT-4o Vision | latest | Ingredient OCR |
| Open Food Facts API | v2 | Product database |
| ZXing-js | 0.21.3 | Barcode scanning |

### Testing & Quality
| Technology | Version | Purpose |
|------------|---------|---------|
| Vitest | 4.0.18 | Unit testing |
| React Testing Library | 16.3.2 | Component testing |
| fast-check | 4.5.3 | Property-based testing |
| ESLint | 8.x | Code linting |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **npm** or **yarn**
- **PostgreSQL database** (Neon recommended)
- **OpenAI API key** ([Get one](https://platform.openai.com/api-keys))
- **Google OAuth credentials** ([Setup guide](https://next-auth.js.org/providers/google))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/priyamjyotsna/ScanSafe.git
   cd ScanSafe
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your credentials (see [Environment Setup](#environment-setup))

4. **Generate Prisma client**
   ```bash
   npx prisma generate --schema=prisma/schema.prisma
   ```

5. **Run database migrations**
   ```bash
   npx prisma migrate dev
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000)

### Environment Setup

Create a `.env` file in the root directory:

```bash
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:pass@host/dietscan?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://user:pass@host/dietscan?sslmode=require"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-generated-secret"  # Generate: openssl rand -base64 32

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# OpenAI
OPENAI_API_KEY="sk-..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Rate Limiting (requests per window per user/IP)
RATE_LIMIT_DISEASE_SUGGEST=10
RATE_LIMIT_DIET_PLAN_GENERATE=5
RATE_LIMIT_INGREDIENT_OCR=10
RATE_LIMIT_VERDICT=20
RATE_LIMIT_WINDOW_MS=60000
```

### Development with HTTPS (Required for Camera)

Mobile camera access requires HTTPS:

```bash
npm run dev:https
```

Access at `https://localhost:3000`

**Note**: You'll see a browser warning about self-signed certificate. Click "Advanced" → "Proceed to localhost".

---

## 💻 Usage

### For End Users

1. **Setup** (one-time):
   - Enter your medical condition
   - Review AI-generated diet plan
   - Edit if needed (add doctor's specific instructions)

2. **Daily Use**:
   - Open the app
   - Scan product barcode or ingredient label
   - Get instant verdict: Safe / Caution / Avoid
   - Read reasoning and flagged nutrients

3. **Multi-Disease**:
   - Add multiple conditions
   - Switch active disease anytime
   - Each has its own diet plan

### For Developers

```bash
# Development
npm run dev                    # Start dev server
npm run dev:https              # Start with HTTPS (for camera)
npm run build                  # Build for production
npm start                      # Start production server
npm run lint                   # Lint code

# Database
npx prisma generate            # Generate Prisma client
npx prisma migrate dev         # Run migrations (dev)
npx prisma migrate deploy      # Deploy migrations (prod)
npx prisma studio              # Open visual DB browser

# Testing
npm test                       # Run all tests
npm run test:watch             # Watch mode
npx vitest <file>              # Run specific test
```

---

## 📁 Project Structure

```
dietscan/
├── prisma/
│   ├── schema.prisma              # Database schema
│   └── migrations/                # Migration files
│
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── api/                   # API routes
│   │   │   ├── disease/suggest/   # AI disease suggestions
│   │   │   ├── diet-plan/         # Diet plan generation
│   │   │   ├── scan/              # Barcode, OCR, verdict
│   │   │   └── user/              # User profile
│   │   ├── setup/                 # Disease selection & diet plan
│   │   ├── scan/                  # Scanner & verdict
│   │   ├── profile/               # User profile
│   │   └── (auth)/signin/         # Sign-in page
│   │
│   ├── components/
│   │   ├── auth/                  # Auth components
│   │   ├── diet-plan/             # Diet plan display
│   │   ├── disease/               # Disease search
│   │   ├── scanner/               # Barcode & OCR
│   │   ├── verdict/               # Verdict display
│   │   └── ui/                    # Reusable UI components
│   │
│   ├── hooks/                     # Custom React hooks
│   ├── lib/                       # Core utilities
│   ├── types/                     # TypeScript types
│   ├── utils/                     # Helper functions
│   └── test/                      # Test setup
│
├── public/                        # Static assets
├── .env.example                   # Environment template
├── DOCUMENTATION.md               # Complete documentation
├── DietScan-TechSpec.md           # Technical specification
└── README.md                      # This file
```

---

## 🧪 Testing

### Test Coverage

- Components: ~80% coverage
- Hooks: ~90% coverage
- Utils: ~95% coverage
- API routes: ~70% coverage

### Running Tests

```bash
# Run all tests once
npm test

# Watch mode (re-run on file changes)
npm run test:watch

# Run specific test file
npx vitest src/components/Button.test.tsx

# Run with coverage report
npx vitest --coverage
```

### Test Structure

Tests are co-located with source files:
```
src/components/Button.tsx
src/components/Button.test.tsx
```

---

## 🚢 Deployment

### Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Import in Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import from GitHub
   - Select your repository

3. **Configure Environment Variables**
   
   In Vercel dashboard → Settings → Environment Variables, add all variables from `.env.example`

4. **Update Google OAuth**
   
   In Google Cloud Console → APIs & Services → Credentials:
   - Add `https://your-app.vercel.app/api/auth/callback/google` to authorized redirect URIs

5. **Deploy**
   
   Vercel automatically deploys on push to main

### Build Configuration

The build script in `package.json` includes Prisma client generation:

```json
{
  "scripts": {
    "build": "prisma generate --schema=prisma/schema.prisma && next build"
  }
}
```

---

## 📚 API Documentation

### Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/disease/suggest` | POST | Get AI disease suggestions |
| `/api/diet-plan/generate` | POST | Generate personalized diet plan |
| `/api/diet-plan/save` | POST | Save user's diet plan |
| `/api/scan/barcode` | POST | Lookup product by barcode |
| `/api/scan/ingredients` | POST | Extract ingredients via OCR |
| `/api/scan/verdict` | POST | Analyze product safety |
| `/api/scan/history` | POST | Save scan to history |
| `/api/user/profile` | GET | Get user profile |
| `/api/user/profile` | PUT | Update user profile |
| `/api/user/active-disease` | PATCH | Switch active disease |

### Example: Get Verdict

```bash
POST /api/scan/verdict
Content-Type: application/json

{
  "diseaseName": "Type 2 Diabetes",
  "dietPlan": {
    "avoid": ["High sugar foods"],
    "prefer": ["Whole grains"],
    "watch": ["Carbohydrate intake"],
    "nutrients": { "Sugar": "< 5g/serving" }
  },
  "product": {
    "name": "Chocolate Bar",
    "ingredients": ["Sugar", "Cocoa", "Milk"],
    "nutrients": { "sugar": 25, "carbohydrates": 30 }
  }
}
```

Response:
```json
{
  "verdict": "AVOID",
  "reason": "Very high sugar content (25g) exceeds your limit of 5g per serving. This could cause dangerous blood sugar spikes for Type 2 Diabetes.",
  "flaggedNutrients": ["sugar"],
  "safeAlternative": "Look for sugar-free dark chocolate with <5g sugar per serving."
}
```

See [DOCUMENTATION.md](./DOCUMENTATION.md#6-api-reference) for complete API documentation.

---

## 🤝 Contributing

Contributions are what make the open source community amazing! Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

---

## 📖 Citation

If you use this project in your research or work, please cite it:

```bibtex
@software{dietscan2026,
  author = {Priyamjyotsna},
  title = {DietScan (ScanSafe): AI-Powered Food Safety Scanner for Medical Conditions},
  year = {2026},
  publisher = {GitHub},
  url = {https://github.com/priyamjyotsna/ScanSafe},
  doi = {10.5281/zenodo.18942716}
}
```

**DOI**: https://doi.org/10.5281/zenodo.18942716

---

## 📄 License

This project is private and proprietary. All rights reserved.

---

## 📧 Contact

**Priyamjyotsna** - [@priyamjyotsna](https://github.com/priyamjyotsna)

**Project Link**: [https://github.com/priyamjyotsna/ScanSafe](https://github.com/priyamjyotsna/ScanSafe)

**Live Demo**: [https://scan-safe.vercel.app](https://scan-safe.vercel.app)

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React framework for production
- [OpenAI](https://openai.com/) - AI models for medical analysis
- [Open Food Facts](https://world.openfoodfacts.org/) - Open product database
- [Neon](https://neon.tech/) - Serverless PostgreSQL
- [Vercel](https://vercel.com/) - Deployment platform
- [ZXing](https://github.com/zxing/zxing) - Barcode scanning library
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Prisma](https://www.prisma.io/) - Next-generation ORM

---

<div align="center">

**Built with ❤️ for better health management**

[⬆ Back to Top](#dietscan-scansafe)

</div>
