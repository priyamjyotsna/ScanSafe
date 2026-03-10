# DietScan (ScanSafe)

A mobile-first Progressive Web App that helps people with medical conditions make safe food choices while grocery shopping.

## Overview

DietScan provides instant, personalized dietary guidance by combining AI-powered diet plan generation with real-time product scanning. Users enter their health condition once, receive a customized diet plan, and then scan food products to get immediate safe/caution/avoid verdicts.

### Key Features

- 🔍 **AI-Powered Disease Search**: Intelligent suggestions for specific disease variants
- 🎯 **Personalized Diet Plans**: AI-generated plans tailored to your condition
- 📱 **Barcode Scanner**: Instant product analysis using your phone camera
- 📸 **Ingredient OCR**: Scan ingredient labels when barcodes aren't available
- ✅ **Smart Verdicts**: Clear safe/caution/avoid ratings with detailed reasoning
- 📊 **Scan History**: Track all your scans and decisions
- 👥 **Multi-Disease Support**: Manage multiple conditions with quick switching
- 🚀 **Guest Mode**: Try the app without signing in

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: Neon PostgreSQL (serverless)
- **Authentication**: NextAuth.js v5 (Google OAuth)
- **AI**: OpenAI GPT-4o, GPT-4o-mini, GPT-4o Vision
- **Barcode Scanning**: ZXing-js (client-side)
- **Product Data**: Open Food Facts API
- **Testing**: Vitest, React Testing Library, fast-check
- **Deployment**: Vercel

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database (Neon recommended)
- OpenAI API key
- Google OAuth credentials

### Installation

```bash
# Clone repository
git clone https://github.com/priyamjyotsna/ScanSafe.git
cd ScanSafe

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your credentials

# Generate Prisma client
npx prisma generate --schema=prisma/schema.prisma

# Run database migrations (if needed)
npx prisma migrate dev

# Start development server
npm run dev
```

### Development with HTTPS (Required for Camera)

Mobile camera access requires HTTPS:

```bash
npm run dev:https
```

Access at `https://localhost:3000`

### Build for Production

```bash
npm run build
npm start
```

## Environment Variables

See `.env.example` for all required variables:

- `DATABASE_URL`: Neon PostgreSQL connection string
- `NEXTAUTH_URL`: Application URL
- `NEXTAUTH_SECRET`: Generated secret for NextAuth
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth secret
- `OPENAI_API_KEY`: OpenAI API key
- Rate limiting configuration

## Documentation

- [Complete Documentation](./DOCUMENTATION.md) - Full project documentation
- [Architecture Guide](./ARCHITECTURE.md) - Technical architecture details
- [API Reference](./API.md) - API endpoint documentation
- [Tech Spec](./DietScan-TechSpec.md) - Original technical specification

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Run specific test
npx vitest src/components/Button.test.tsx
```

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on push to main

See [DOCUMENTATION.md](./DOCUMENTATION.md#deployment) for detailed deployment instructions.

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── setup/             # Disease selection & diet plan
│   ├── scan/              # Scanner & verdict
│   └── profile/           # User profile
├── components/            # React components
│   ├── auth/
│   ├── diet-plan/
│   ├── disease/
│   ├── scanner/
│   ├── ui/
│   └── verdict/
├── hooks/                 # Custom React hooks
├── lib/                   # Core utilities
├── types/                 # TypeScript types
└── utils/                 # Helper functions
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

This project is private and proprietary.

## Support

For issues and questions, please open a GitHub issue.

---

Built with ❤️ for better health management
