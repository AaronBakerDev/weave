# Backend Platform Research Archive

This directory contains comprehensive research on alternative backend platforms evaluated for Weave.

## Research Documents (2025-10-24)

### 1. Xano Research
**File:** `xano-research-analysis.md`
**Status:** ❌ NOT RECOMMENDED
**Key Finding:** Architectural incompatibility due to lack of RLS, custom code, and event sourcing support. Vendor lock-in concerns.

### 2. Supabase Research
**File:** `supabase-research-analysis.md`
**Status:** ⚠️ POTENTIALLY VIABLE
**Key Finding:** Architecturally compatible with native RLS and pgvector support, but requires 6-10 week TypeScript rewrite.

### 3. Cloudflare Research
**File:** `cloudflare-research-analysis.md`
**Status:** ⚠️ PARTIALLY VIABLE
**Key Finding:** Excellent AI/Agent capabilities and cost efficiency, but no PostgreSQL support and requires 6-8 week TypeScript rewrite.

## Decision Summary

**DECISION:** Keep current FastAPI + Railway + PostgreSQL stack

**Rationale:**
- Already battle-tested and production-ready
- No architectural misalignments
- Team expertise in Python/PostgreSQL
- Minimal risk, maximum velocity
- Cost-effective ($75/month)

## Stack Confirmation

### Frontend
- Next.js 14 on Vercel ✅

### Backend
- FastAPI (Python) on Railway ✅
- PostgreSQL 14+ with pgvector on Railway ✅
- Row-Level Security (RLS) for multi-tenancy ✅

### Storage
- Backblaze B2 for media artifacts ✅

### Background Processing
- Python indexing worker ✅
- pg_cron + database triggers ✅

## Future Considerations

### Short-term (3-6 months)
- Ship Milestone D features
- Improve search quality (edge boost)
- Enhanced AI integration

### Medium-term (6-12 months)
- Monitor performance and costs
- Consider hybrid Cloudflare approach if needed (Workers for specific features)

### Long-term (12-18 months)
- Revisit platform evaluation if scaling or cost issues emerge
- PostgreSQL ecosystem continues to mature

## Access to Research

These comprehensive research documents provide detailed analysis including:
- Architecture comparisons with implementation examples
- Database feature matrices
- Migration effort estimates
- Pricing analysis
- Feature compatibility assessments
- Code examples and implementation patterns

Refer to individual documents for technical depth on each platform.

---

**Archive Date:** 2025-10-24
**Review Date:** 2026-04-24 (6-month checkpoint)
