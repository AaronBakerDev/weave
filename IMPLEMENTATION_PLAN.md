# Weave: Step-by-Step Implementation Plan

Complete end-to-end guide to build `/Users/aaronbaker/weave/apps` structure and get Weave running on Railway.

---

## Phase 1: Project Structure Setup (30 minutes)

### Step 1.1: Create Base Directory Structure

```bash
cd /Users/aaronbaker/weave

# Create the apps directory (monorepo root)
mkdir -p apps

# Next.js frontend
mkdir -p apps/next-app/{app,public,lib,.next}

# Python backend
mkdir -p apps/python-backend/app/{models,services,api,db,routers}

# Documentation
mkdir -p docs
```

### Step 1.2: Initialize Git (if not already done)

```bash
cd /Users/aaronbaker/weave

git init
git add .
git commit -m "Initial Weave commit with specs"
```

---

## Phase 2: Next.js Frontend Setup (1-2 hours)

### Step 2.1: Initialize Next.js Project

```bash
cd /Users/aaronbaker/weave/apps/next-app

# Create package.json
npm init -y

# Install Next.js + required dependencies
npm install next@latest react@latest react-dom@latest

# Install Apps SDK + utilities
npm install @openai/apps-sdk axios zustand

# Install dev dependencies
npm install --save-dev typescript @types/react @types/node
```

### Step 2.2: Create Next.js Config

**File:** `apps/next-app/next.config.ts`

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Asset prefix for ChatGPT sandbox
  assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX || '',

  experimental: {
    // React Server Components
    esmExternals: true,
  },

  // Environment variables
  env: {
    PYTHON_API_BASE: process.env.PYTHON_API_BASE,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
};

export default nextConfig;
```

### Step 2.3: Create TypeScript Config

**File:** `apps/next-app/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["app", "lib"]
}
```

### Step 2.4: Create App Layout (Browser Patches)

**File:** `apps/next-app/app/layout.tsx`

```typescript
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Weave - Living Memory',
  description: 'Explore and weave your memories',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Browser patches for ChatGPT sandbox */}
        <base href={process.env.NEXT_PUBLIC_ASSET_PREFIX || '/'} />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Intercept history to prevent URL leakage
              const originalPushState = history.pushState;
              const originalReplaceState = history.replaceState;

              history.pushState = function(...args) {
                if (typeof window !== 'undefined' && window.openai) {
                  // Inside ChatGPT - don't leak URLs
                  return;
                }
                return originalPushState.apply(this, args);
              };

              history.replaceState = function(...args) {
                if (typeof window !== 'undefined' && window.openai) {
                  return;
                }
                return originalReplaceState.apply(this, args);
              };

              // Patch fetch for same-origin requests
              const originalFetch = window.fetch;
              window.fetch = function(url, options) {
                if (typeof url === 'string' && url.startsWith('/')) {
                  const baseUrl = new URL(document.baseURI);
                  url = baseUrl.origin + url;
                }
                return originalFetch.apply(this, arguments);
              };
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### Step 2.5: Create Home Page (Testing)

**File:** `apps/next-app/app/page.tsx`

```typescript
'use client';

import { WeaverCard } from './lib/ui/canvas';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Weave</h1>
        <p className="text-gray-600 mb-8">A memory platform built inside ChatGPT</p>

        <WeaverCard />
      </div>
    </div>
  );
}
```

### Step 2.6: Create React Hooks Library

**File:** `apps/next-app/app/lib/hooks.ts`

```typescript
'use client';

import { useCallback } from 'react';

export function useSendMessage() {
  const sendMessage = useCallback(async (message: string) => {
    if (typeof window !== 'undefined' && (window as any).openai) {
      await (window as any).openai.sendFollowUpMessage(message);
    }
  }, []);

  return { sendMessage };
}

export function useDisplayMode() {
  if (typeof window !== 'undefined' && (window as any).openai) {
    return (window as any).openai.displayMode || 'fullscreen';
  }
  return 'fullscreen';
}

export function useWidgetProps<T = any>(): T {
  if (typeof window !== 'undefined' && (window as any).openai) {
    return (window as any).openai.toolOutput || {};
  }
  return {} as T;
}
```

### Step 2.7: Create Tailwind CSS Config (Optional but recommended)

**File:** `apps/next-app/tailwind.config.js`

```javascript
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        emotion: {
          joy: '#ffd700',
          sadness: '#4169e1',
          wonder: '#9370db',
          calm: '#3cb371',
          fear: '#ff6347',
          love: '#ff69b4',
          grief: '#696969',
          anger: '#dc143c',
        },
      },
    },
  },
  plugins: [],
};
```

### Step 2.8: Install Tailwind

```bash
cd /Users/aaronbaker/weave/apps/next-app
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

---

## Phase 3: Python FastAPI Backend Setup (1-2 hours)

### Step 3.1: Create Python Project Structure

```bash
cd /Users/aaronbaker/weave/apps/python-backend

# Create __init__.py files
touch app/__init__.py
touch app/models/__init__.py
touch app/services/__init__.py
touch app/api/__init__.py
touch app/db/__init__.py
```

### Step 3.2: Create Requirements.txt

**File:** `apps/python-backend/requirements.txt`

```
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
asyncpg==0.29.0
pydantic==2.5.0
pydantic-settings==2.1.0
python-dotenv==1.0.0
openai==1.3.0
requests==2.31.0
boto3==1.29.0
python-multipart==0.0.6
pytest==7.4.3
pytest-asyncio==0.21.1
```

### Step 3.3: Create Main FastAPI App

**File:** `apps/python-backend/app/main.py`

Use the scaffold from `/Users/aaronbaker/weave/python_fastapi_scaffold.py` but organized:

```bash
# Copy and adapt the scaffold
cp /Users/aaronbaker/weave/python_fastapi_scaffold.py apps/python-backend/app/main.py
```

### Step 3.4: Create Database Models

**File:** `apps/python-backend/app/db/models.py`

```python
from sqlalchemy import Column, String, DateTime, Integer, Float, ARRAY, JSON, Enum, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import uuid

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    handle = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    plan = Column(String, default="FREE")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Memory(Base):
    __tablename__ = "memories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    visibility = Column(String, default="PRIVATE")
    status = Column(String, default="DRAFT")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class MemoryCore(Base):
    __tablename__ = "memory_cores"

    memory_id = Column(UUID(as_uuid=True), ForeignKey("memories.id"), primary_key=True)
    title = Column(String, nullable=False)
    narrative = Column(String, nullable=False)
    when = Column(DateTime)
    where = Column(String)
    people = Column(ARRAY(String))
    anchors = Column(JSON)
    emotion = Column(String)
    locked_at = Column(DateTime, default=datetime.utcnow)
    version = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)

# Add more models as needed (MemoryLayer, Edge, Participant, etc.)
```

### Step 3.5: Create .env Template

**File:** `apps/python-backend/.env.example`

```
# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/weave

# OpenAI
OPENAI_API_KEY=sk-...

# S3 / Backblaze B2
S3_BUCKET=weave-memories
S3_REGION=us-east-1
S3_ACCESS_KEY=your_key
S3_SECRET_KEY=your_secret

# Environment
ENVIRONMENT=development
```

### Step 3.6: Create Docker Support

**File:** `apps/python-backend/Dockerfile`

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app
COPY app/ ./app/

# Run
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## Phase 4: MCP Shim Setup (30 minutes)

### Step 4.1: Create MCP Route

**File:** `apps/next-app/app/api/mcp/route.ts`

Use the scaffold from `/Users/aaronbaker/weave/node_mcp_shim_skeleton.ts`

```bash
# Create directory
mkdir -p apps/next-app/app/api/mcp

# Copy scaffold
cp /Users/aaronbaker/weave/node_mcp_shim_skeleton.ts apps/next-app/app/api/mcp/route.ts
```

### Step 4.2: Create .env for Next.js

**File:** `apps/next-app/.env.local`

```
PYTHON_API_BASE=http://localhost:8000
NEXT_PUBLIC_ASSET_PREFIX=
OPENAI_API_KEY=sk-...
```

---

## Phase 5: React Components Setup (1 hour)

### Step 5.1: Create UI Directory

```bash
mkdir -p apps/next-app/app/lib/ui
```

### Step 5.2: Copy Canvas Components

**File:** `apps/next-app/app/lib/ui/canvas.tsx`

```bash
cp /Users/aaronbaker/weave/nextjs_canvas_component_stub.tsx apps/next-app/app/lib/ui/canvas.tsx
```

### Step 5.3: Create Memory Canvas Page

**File:** `apps/next-app/app/memory/canvas.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Canvas2D } from '@/app/lib/ui/canvas';

interface Memory {
  id: string;
  title: string;
  emotion: string;
  place?: string;
  peopleCount: number;
  connectionCount: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function CanvasPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch memories from Python API
    // For now, mock data
    setMemories([
      {
        id: '1',
        title: 'New York 2024',
        emotion: 'joy',
        place: 'NYC',
        peopleCount: 3,
        connectionCount: 2,
        x: 100,
        y: 100,
        width: 150,
        height: 100,
      },
    ]);
    setLoading(false);
  }, []);

  const handleMemoryClick = (memoryId: string) => {
    console.log('Click memory:', memoryId);
  };

  const handleMemoryDrag = (memoryId: string, x: number, y: number) => {
    console.log('Drag memory:', memoryId, x, y);
  };

  if (loading) return <div className="p-8">Loading canvas...</div>;

  return (
    <Canvas2D
      memories={memories}
      connections={connections}
      onMemoryClick={handleMemoryClick}
      onMemoryDrag={handleMemoryDrag}
    />
  );
}
```

---

## Phase 6: Database Setup (30 minutes)

### Step 6.1: Initialize Postgres Locally (for testing)

```bash
# Using Docker (easiest)
docker run --name weave-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=weave \
  -p 5432:5432 \
  -d pgvector/pgvector:latest

# Wait a few seconds, then run schema:
psql -h localhost -U postgres -d weave -f /Users/aaronbaker/weave/schema.sql
```

### Step 6.2: Verify Database

```bash
psql -h localhost -U postgres -d weave -c "\dt"
```

You should see tables like `users`, `memories`, `memory_cores`, etc.

---

## Phase 7: Local Testing (30 minutes)

### Step 7.1: Start Python Backend

```bash
cd /Users/aaronbaker/weave/apps/python-backend

# Install dependencies
pip install -r requirements.txt

# Create .env
cp .env.example .env

# Run
python -m uvicorn app.main:app --reload --port 8000
```

### Step 7.2: Start Next.js Frontend

```bash
cd /Users/aaronbaker/weave/apps/next-app

# Install dependencies (if not done)
npm install

# Run
npm run dev
```

Visit: `http://localhost:3000`

### Step 7.3: Test MCP Handler

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "list_tools",
    "id": 1
  }'
```

Should return list of tools.

---

## Phase 8: Railway Deployment (1 hour)

### Step 8.1: Connect GitHub

```bash
# Make sure everything is committed
cd /Users/aaronbaker/weave
git add .
git commit -m "Weave MVP structure"
git push origin main  # Push to GitHub
```

### Step 8.2: Deploy Python Backend to Railway

1. Go to **railway.app**
2. Sign up / Log in
3. Click "New Project"
4. Select "Deploy from GitHub"
5. Select your GitHub repo
6. Select folder: `apps/python-backend`
7. Railway auto-detects Python
8. Add PostgreSQL service:
   - Click "+" button
   - Select "PostgreSQL"
   - Railway auto-creates DATABASE_URL
9. Add environment variables:
   - `OPENAI_API_KEY`
   - `S3_BUCKET`
   - `S3_ACCESS_KEY`
   - `S3_SECRET_KEY`
10. Click "Deploy"

### Step 8.3: Get Railway URL

Railway generates a URL like: `https://weave-api-prod.railway.app`

Copy this.

### Step 8.4: Deploy Next.js to Vercel

1. Go to **vercel.com**
2. Click "Add New..." → "Project"
3. Select your GitHub repo
4. Set "Root Directory" to `apps/next-app`
5. Add environment variables:
   - `PYTHON_API_BASE=https://weave-api-prod.railway.app` (from Railway)
   - `OPENAI_API_KEY`
6. Click "Deploy"

### Step 8.5: Verify Deployment

- Frontend: `https://your-vercel-url.vercel.app`
- Backend: `https://your-railway-url.railway.app/health`

---

## Phase 9: Git & Documentation (30 minutes)

### Step 9.1: Create Root .gitignore

**File:** `/Users/aaronbaker/weave/.gitignore`

```
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
.env

# Node
node_modules/
.next/
out/
dist/
.vercel

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
```

### Step 9.2: Create Root README

**File:** `/Users/aaronbaker/weave/README.md`

```markdown
# Weave: A ChatGPT-Native Memory Platform

Living memory built inside ChatGPT. Capture, explore, and weave your memories.

## Project Structure

```
weave/
├── apps/
│   ├── next-app/              # Frontend (Next.js, React)
│   │   ├── app/               # App routes + API handlers
│   │   ├── lib/               # React components, hooks
│   │   └── public/            # Static assets
│   │
│   └── python-backend/        # Backend (FastAPI, Python)
│       ├── app/
│       │   ├── main.py        # FastAPI entry point
│       │   ├── models/        # SQLAlchemy ORM
│       │   ├── services/      # Business logic
│       │   ├── api/           # Route handlers
│       │   └── db/            # Database utilities
│       ├── requirements.txt
│       └── Dockerfile
│
├── specs/                     # Documentation
│   ├── product-spec.md
│   └── technical-spec.md
│
└── schema.sql                 # Postgres DDL
```

## Quick Start

### Local Development

```bash
# Backend
cd apps/python-backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload

# Frontend (in new terminal)
cd apps/next-app
npm install
npm run dev
```

### Deployment

Frontend: Vercel
Backend: Railway
Database: Railway PostgreSQL
Storage: Backblaze B2

## Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Python 3.11+, FastAPI, SQLAlchemy, AsyncPG
- **Database**: PostgreSQL 14+ with pgvector
- **Storage**: S3-compatible (Backblaze B2)
- **Deployment**: Vercel (frontend), Railway (backend)

## Development

See `/IMPLEMENTATION_PLAN.md` for detailed setup instructions.
```

### Step 9.3: Create Development Guide

**File:** `/Users/aaronbaker/weave/DEVELOPMENT.md`

```markdown
# Development Guide

## Environment Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker (optional, for local Postgres)
- PostgreSQL 14+ with pgvector

### Local Postgres (Docker)
```bash
docker run --name weave-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=weave \
  -p 5432:5432 \
  -d pgvector/pgvector:latest

# Run schema
psql -h localhost -U postgres -d weave -f schema.sql
```

### Environment Variables

#### Backend (`apps/python-backend/.env`)
```
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/weave
OPENAI_API_KEY=sk-...
ENVIRONMENT=development
```

#### Frontend (`apps/next-app/.env.local`)
```
PYTHON_API_BASE=http://localhost:8000
OPENAI_API_KEY=sk-...
```

## Running Locally

```bash
# Terminal 1: Backend
cd apps/python-backend
python -m uvicorn app.main:app --reload

# Terminal 2: Frontend
cd apps/next-app
npm run dev
```

Visit: http://localhost:3000

## Testing

### Backend Tests
```bash
cd apps/python-backend
pytest
```

### Frontend Tests
```bash
cd apps/next-app
npm test
```

## Deployment

See `DEPLOYMENT.md`
```

---

## Summary Checklist

```
PHASE 1: Structure ✓
├─ Create directory tree
└─ Initialize git

PHASE 2: Next.js ✓
├─ npm init, install deps
├─ Create config files
├─ Create layout + browser patches
└─ Setup Tailwind

PHASE 3: Python ✓
├─ Create app structure
├─ Create requirements.txt
├─ Create main.py
├─ Create models
└─ Create Dockerfile

PHASE 4: MCP Shim ✓
└─ Copy route handler

PHASE 5: Components ✓
└─ Copy Canvas UI components

PHASE 6: Database ✓
└─ Run schema.sql locally

PHASE 7: Local Testing ✓
├─ Start Python
├─ Start Next.js
└─ Test MCP endpoint

PHASE 8: Railway ✓
├─ Deploy Python backend
├─ Deploy Next.js frontend
└─ Connect them

PHASE 9: Documentation ✓
├─ Create .gitignore
├─ Create README
└─ Create DEVELOPMENT.md
```

---

## Total Time: ~6-8 hours

This gets you to **Milestone A (Capture & Recall)** ready to deploy.

**Next after this:**
- Implement TODO sections in FastAPI (database queries, embeddings)
- Connect Canvas to real API calls
- Test end-to-end with ChatGPT

Good to go?
