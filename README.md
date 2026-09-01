<<<<<<< HEAD
# CrimeGraph AI — AI-Powered Criminal Network Analysis System

CrimeGraph AI is an **educational and hackathon prototype** designed for structured entity extraction, relationship mapping, and link analysis across synthetic investigation data.

> ⚠️ **IMPORTANT NOTICE & DISCLAIMER**
> - CrimeGraph AI is an educational demonstration prototype.
> - This platform operates strictly on **synthetic and anonymized demo datasets**.
> - It **MUST NOT** be used with real criminal records, real police incident reports (FIRs), real call detail records (CDRs), real banking/financial records, or unauthorized personal data.

---

## 🌟 Key Features

- **Multi-Source Data Ingestion**: Parse synthetic CDR logs, financial transaction ledgers, FIR incident reports, and device dumps.
- **Entity Resolution Engine**: Extract and disambiguate suspects, phone numbers, bank accounts, device IMEIs, and locations.
- **Resilient AI Gateway**: Multi-provider LLM fallback chain supporting Google Gemini API, OpenRouter Gemma, and OpenRouter GLM with circuit breaker and cooldown handling.
- **Link & Graph Analytics**: In-memory and Neo4j graph database integration for network visualization and entity mapping.
- **Clean SaaS Interface**: Modern, minimalist, light-themed investigation dashboard built with Next.js 16 (Turbopack) and Tailwind CSS.

---

## 🏗 System Architecture

CrimeGraph AI consists of three core components:

1. **Frontend (`/frontend`)**: Next.js 16 App Router interface built with TypeScript, Tailwind CSS, and custom design tokens.
2. **Backend (`/backend`)**: Express.js REST API with Prisma ORM (supports PostgreSQL & in-memory mock mode), JWT authentication, RBAC, and rate limiting.
3. **AI Service (`/ai-service`)**: Structured extraction pipeline with multi-model fallback and strict schema validation.

---

## 🚀 Quick Start (Local Setup)

### 1. Prerequisites
- Node.js v18+ 
- npm / npx

### 2. Installation
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env` in the root and backend directory:
```bash
cp .env.example .env
```

### 4. Running the Development Servers
```bash
# Terminal 1: Start Backend API (Port 4000)
cd backend
npm run dev

# Terminal 2: Start Frontend UI (Port 3000)
cd frontend
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

## 🔐 Security & Governance

- Zero hardcoded API keys or secrets in source code.
- Strict `.gitignore` exclusions for `.env`, logs, build outputs, and local databases.
- Multi-layer security middleware (Helmet, CORS, rate limiters, input sanitization).

---

## 📄 License & Compliance

Educational & Prototype Use Only. All data included in demo files is entirely synthetic.
=======
# AI-Powered-Criminal-Network-Analysis-System
>>>>>>> 1b5944c77c3d9d31ca8dec00595192fd92b8ea6c
