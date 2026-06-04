# Plum OPD Claim Adjudication Tool

> AI-powered OPD insurance claim adjudication system that processes medical documents, extracts data using Claude AI, validates against policy terms, and makes intelligent approval/rejection decisions.

![Status](https://img.shields.io/badge/status-active-brightgreen)
![Frontend](https://img.shields.io/badge/frontend-Next.js%2016-blue)
![Backend](https://img.shields.io/badge/backend-FastAPI-green)
![AI](https://img.shields.io/badge/AI-Claude%20API-purple)

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    NEXT.JS FRONTEND                        │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐     │
│  │ Submit   │  │ Claims       │  │ Test Runner       │     │
│  │ Claim    │  │ History      │  │ Dashboard         │     │
│  └────┬─────┘  └──────┬───────┘  └────────┬─────────┘     │
│       │               │                   │               │
└───────┼───────────────┼───────────────────┼───────────────┘
        │               │                   │
        ▼               ▼                   ▼
┌────────────────────────────────────────────────────────────┐
│                  FASTAPI BACKEND (REST API)                │
│                                                            │
│  /api/claims/submit     POST   Submit + adjudicate claim   │
│  /api/claims/           GET    List all claims             │
│  /api/claims/{id}       GET    Get single claim            │
│  /api/claims/member/{m} GET    Claims by member            │
│  /api/members/seed      POST   Seed test members           │
│  /api/members/{id}      GET    Member lookup               │
│  /api/test/run-all      POST   Run all test cases          │
│  /api/test/run/{id}     POST   Run single test case        │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              ADJUDICATION ENGINE                      │  │
│  │                                                       │  │
│  │  Step 1: Eligibility Check (policy, waiting period)   │  │
│  │  Step 2: Document Validation (OCR, doctor reg, dates) │  │
│  │  Step 3: Coverage Verification (exclusions, pre-auth) │  │
│  │  Step 4: Limit Validation (annual, per-claim, copay)  │  │
│  │  Step 5: Medical Necessity (LLM) + Fraud Detection    │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                │
│                    ┌──────┴──────┐                         │
│                    │ Claude API  │                         │
│                    │ (Sonnet 4)  │                         │
│                    └─────────────┘                         │
│                                                            │
│  ┌──────────────┐  ┌────────────┐  ┌──────────────────┐   │
│  │  SQLite DB   │  │  Policy    │  │  Document        │   │
│  │  (SQLAlchemy)│  │  Loader    │  │  Processor (OCR) │   │
│  └──────────────┘  └────────────┘  └──────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
plum-opd-adjudication/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app + auto-seed
│   │   ├── database.py              # SQLAlchemy async setup
│   │   ├── models/
│   │   │   └── claim.py             # Member, Claim, Document, Decision models
│   │   ├── routers/
│   │   │   ├── claims.py            # Claim submission + adjudication
│   │   │   ├── members.py           # Member lookup + seed
│   │   │   └── test_runner.py       # Test case runner
│   │   └── services/
│   │       ├── adjudication_engine.py  # 5-step decision engine
│   │       ├── document_processor.py   # Claude Vision OCR + parsing
│   │       └── policy_loader.py        # Policy terms loader
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── app/
│   │   ├── layout.tsx               # Root layout with sidebar
│   │   ├── page.tsx                 # Claim submission page
│   │   ├── globals.css              # Design system
│   │   ├── components/
│   │   │   └── Sidebar.tsx          # Navigation sidebar
│   │   ├── claims/
│   │   │   └── page.tsx             # Claims history page
│   │   └── test/
│   │       └── page.tsx             # Test runner dashboard
│   └── package.json
├── data/
│   ├── policy_terms.json
│   ├── test_cases.json
│   └── adjudication_rules.md
├── policy_terms.json                # Policy configuration
├── test_cases.json                  # 10 test cases
├── adjudication_rules.md            # Business logic rules
└── sample_documents_guide.md        # Document format guide
```

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+** with pip
- **Node.js 18+** with npm
- **Anthropic API Key** (for Claude AI)

### 1. Clone & Setup Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Set your API key
# Edit .env file:
# ANTHROPIC_API_KEY=sk-ant-your-key-here

# Start the backend
python -m uvicorn app.main:app --reload --port 8000
```

The backend will:
- Create the SQLite database automatically
- Seed 10 test members from test_cases.json
- Be available at `http://localhost:8000`
- API docs at `http://localhost:8000/docs`

### 2. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Frontend will be available at `http://localhost:3000`

### 3. Environment Variables

**Backend (`backend/.env`):**
```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
DATABASE_URL=sqlite+aiosqlite:///./claims.db
ENVIRONMENT=development
```

## 🔧 How It Works

### Adjudication Pipeline

When a claim is submitted, it goes through a **5-step adjudication pipeline**:

```
┌─────────────────┐
│ 1. ELIGIBILITY  │ → Policy active? Waiting period satisfied? Member verified?
├─────────────────┤
│ 2. DOCUMENTS    │ → OCR extraction → Doctor reg valid? Dates match? Patient match?
├─────────────────┤
│ 3. COVERAGE     │ → Service covered? Exclusions? Pre-auth needed?
├─────────────────┤
│ 4. LIMITS       │ → Annual limit? Per-claim limit? Sub-limits? Co-pay calculation
├─────────────────┤
│ 5. MEDICAL      │ → LLM review: diagnosis justifies treatment? Fraud detection
└─────────────────┘
                    ↓
          ┌─────────────────┐
          │ FINAL DECISION  │
          │ APPROVED        │ ← All checks pass
          │ REJECTED        │ ← Hard rejection rule triggered
          │ PARTIAL         │ ← Some items excluded
          │ MANUAL_REVIEW   │ ← Fraud flags / low confidence / high value
          └─────────────────┘
```

### Decision Output Format

```json
{
  "claim_id": "CLM_XXXXX",
  "decision": "APPROVED",
  "approved_amount": 1350,
  "rejection_reasons": [],
  "confidence_score": 0.95,
  "notes": "Deductions: consultation_copay: ₹150.",
  "next_steps": "Your claim has been approved. Payment will be processed within 3-5 business days.",
  "flags": []
}
```

## 📊 Test Cases

The system includes 10 test cases covering all decision types:

| ID | Scenario | Expected Decision |
|----|----------|-------------------|
| TC001 | Simple consultation (fever) | ✅ APPROVED |
| TC002 | Dental with cosmetic whitening | ⚠️ PARTIAL |
| TC003 | Amount exceeds per-claim limit | ❌ REJECTED |
| TC004 | Missing prescription | ❌ REJECTED |
| TC005 | Diabetes within waiting period | ❌ REJECTED |
| TC006 | Ayurvedic treatment | ✅ APPROVED |
| TC007 | MRI without pre-authorization | ❌ REJECTED |
| TC008 | Multiple claims same day (fraud) | 🔍 MANUAL_REVIEW |
| TC009 | Weight loss treatment (excluded) | ❌ REJECTED |
| TC010 | Network hospital cashless | ✅ APPROVED |

Run tests via the Test Runner page or API:
```bash
# Run all test cases
curl -X POST http://localhost:8000/api/test/run-all

# Run a single test case
curl -X POST http://localhost:8000/api/test/run/TC001
```

## 🗄️ API Documentation

### Claims

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/claims/submit` | Submit a new claim with documents |
| `GET` | `/api/claims/` | List all claims with decisions |
| `GET` | `/api/claims/{claim_id}` | Get a specific claim |
| `GET` | `/api/claims/member/{member_id}` | Get claims for a member |

### Members

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/members/seed` | Seed test members |
| `GET` | `/api/members/{member_id}` | Look up a member |

### Test Runner

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/test/run-all` | Run all 10 test cases |
| `POST` | `/api/test/run/{case_id}` | Run a single test case |

## 📋 Assumptions

1. **Member data**: All 10 test members are pre-seeded with `policy_status: "active"` and `annual_limit: 50000`
2. **Document processing**: Uses Claude Vision API for OCR; works best with clear, well-lit document images
3. **Co-pay**: 10% consultation co-pay is applied to all claims (as per policy_terms.json)
4. **Network discount**: 20% discount applied when hospital matches network list
5. **Waiting period**: Initial 30-day waiting for all, plus condition-specific periods (diabetes: 90 days, etc.)
6. **Per-claim limit**: Hard limit of ₹5,000 per claim — exceeding this results in rejection (not partial approval), matching test case TC003's expected behavior
7. **Pre-authorization**: Required for MRI/CT scans when claim exceeds ₹10,000
8. **Fraud detection**: Flags are raised for ≥2 claims on same day, ≥5 claims in 30 days, or duplicate amounts
9. **LLM fallback**: If Claude API fails, medical review passes with low confidence (0.60) → triggers MANUAL_REVIEW

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS v4
- **Backend**: Python, FastAPI, SQLAlchemy (async), SQLite
- **AI/LLM**: Anthropic Claude API (Sonnet 4) for document OCR + medical review
- **Document Processing**: Claude Vision API (no external OCR needed)
- **Styling**: Custom design system with Inter font, animations, glassmorphism
