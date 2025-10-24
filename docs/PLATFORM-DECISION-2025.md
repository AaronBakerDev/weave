# Platform Decision Document (2025-10-24)

## Executive Summary

After comprehensive research of three major backend platforms (Xano, Supabase, Cloudflare), we have **confirmed the decision to keep the current FastAPI + Railway + PostgreSQL stack**.

This decision prioritizes:
- **Architectural alignment** ✅
- **Team expertise** ✅
- **Minimal risk** ✅
- **Maximum velocity** ✅
- **Cost efficiency** ✅

---

## Decision Timeline

| Date | Action |
|------|--------|
| 2025-10-24 | Completed comprehensive research on 3 platforms |
| 2025-10-24 | Made final platform decision |
| 2025-10-24 | Archived research documents |
| 2025-10-24 | Updated project documentation |

---

## Platforms Evaluated

### 1. Xano ❌ NOT RECOMMENDED
**Status:** Not viable for Weave's architecture

**Key Findings:**
- No Row-Level Security (RLS) → breaks multi-tenant architecture
- No custom Python code → can't implement event sourcing
- Vendor lock-in (visual workflows hard to migrate)
- Higher costs at scale ($224+/month)

**Reference:** `docs/research-archive/xano-research-analysis.md`

### 2. Supabase ⚠️ POTENTIALLY VIABLE
**Status:** Architecturally compatible but requires major rewrite

**Advantages:**
- ✅ Native PostgreSQL with pgvector
- ✅ Full Row-Level Security (RLS) support
- ✅ Open-source (low vendor lock-in)
- ✅ Competitive pricing ($25-50/month)

**Disadvantages:**
- ❌ Requires TypeScript rewrite (current: Python)
- ⚠️ 6-10 week migration effort
- ⚠️ Edge Functions (Deno) vs Workers (no Python)
- ⚠️ Feature freeze during migration

**Reference:** `docs/research-archive/supabase-research-analysis.md`

### 3. Cloudflare ⚠️ PARTIALLY VIABLE
**Status:** Excellent AI features but architectural misalignments

**Advantages:**
- ✅ Excellent AI/Agent capabilities (Agent SDK, Workers AI)
- ✅ Competitive pricing ($60-120/month potentially)
- ✅ Full-stack platform (frontend + backend + DB)
- ✅ Global edge distribution

**Disadvantages:**
- ❌ No PostgreSQL (D1 is SQLite-based)
- ❌ No pgvector (Vectorize is separate, requires different patterns)
- ❌ No Row-Level Security (database-per-tenant pattern instead)
- ❌ Requires TypeScript/JavaScript rewrite
- ⚠️ 6-8 week migration effort
- ⚠️ Unpredictable Durable Objects pricing

**Reference:** `docs/research-archive/cloudflare-research-analysis.md`

---

## Final Stack Confirmation

### Frontend
**Technology:** Next.js 14 on Vercel
- ✅ Working perfectly
- ✅ Server Components, App Router
- ✅ Clerk authentication integrated
- ✅ No changes needed

### Backend
**Technology:** FastAPI (Python) on Railway
- ✅ 8 API routers fully implemented
- ✅ JWT + RLS session management
- ✅ Idempotency patterns working
- ✅ MCP integration complete
- ✅ No architectural debt

### Database
**Technology:** PostgreSQL 14+ with pgvector on Railway
- ✅ Event sourcing (immutable cores + append-only layers)
- ✅ Row-Level Security (multi-tenant safe at DB level)
- ✅ Hybrid search (55% vector + 35% BM25 + 10% edge boost)
- ✅ Indexing worker (Python background task)
- ✅ Full-text search (WebSearch TSV)
- ✅ Extensions: pgvector, pg_trgm, JSON
- ✅ 30-day Point-in-Time Recovery (Time Travel)

### Storage
**Technology:** Backblaze B2 (S3-compatible)
- ✅ Cost-effective ($5-15/month)
- ✅ No egress fees
- ✅ Drop-in S3 replacement
- ✅ Media artifacts working

### Background Processing
**Technology:** Python indexing worker + pg_cron + database triggers
- ✅ Embedding generation via OpenAI API
- ✅ TSV indexing for full-text search
- ✅ Vectorize upserts for semantic search
- ✅ Scheduled jobs via pg_cron

---

## Cost Analysis

### Monthly Recurring Costs

| Component | Cost | Notes |
|-----------|------|-------|
| **PostgreSQL (Railway)** | $25 | Starter tier with pgvector |
| **FastAPI Server (Railway)** | $20 | ~2 web dynos |
| **Next.js (Vercel)** | $20 | Pro tier with preview deploys |
| **Storage (Backblaze B2)** | $5-15 | Media artifacts + operations |
| **TOTAL** | **$70-80** | Stable, predictable costs |

**vs. Alternatives:**
- Xano: $224-404/month (6-8x more expensive)
- Supabase: $25-50/month DB + ongoing support costs
- Cloudflare: $60-120/month (unpredictable Durable Objects)

**Verdict:** Current stack is most cost-efficient long-term.

---

## Risk Assessment

### Keep Current Stack: LOW RISK ✅

**Strengths:**
- No rewrite needed
- Team expertise maximized
- No new architectural patterns to learn
- Architecture proven in production
- PostgreSQL mature, stable
- Can ship features immediately

**Risks:**
- None identified
- Architecture is sound

### Supabase Migration: HIGH RISK ⚠️

**Risks:**
- 6-10 week development freeze
- TypeScript learning curve (team expertise: Python)
- Edge Functions vs Workers (runtime differences)
- Integration testing across Supabase services
- Potential for new bugs in rewritten code

### Cloudflare Migration: VERY HIGH RISK 🔴

**Risks:**
- 6-8 week development freeze
- Fundamental architecture mismatch (no RLS)
- Database-per-tenant redesign (complex)
- D1 SQLite limitations (10 GB max per DB)
- Durable Objects pricing unpredictable
- Loss of PostgreSQL ecosystem features

---

## Strategic Next Steps

### Immediate (Next 2-4 weeks)
1. ✅ Ship Milestone D features
2. ✅ Improve search quality (edge boost implementation)
3. ✅ Enhance indexing worker (non-text layer support)
4. ✅ Continue feature development without friction

### Short-term (1-3 months)
1. Monitor performance metrics
2. Track actual monthly costs
3. Evaluate user feedback on search/canvas
4. Plan Milestone E features

### Medium-term (3-6 months)
1. Upgrade Node.js version if needed (≥18.17)
2. Implement edge boost in search scoring
3. Expand test coverage (RLS policies, canvas)
4. Consider minor optimizations to FastAPI/PostgreSQL

### Long-term (6-18 months)
1. **Re-evaluate at 6-month checkpoint** (April 2026)
2. Assess if scaling needs emerge
3. Consider hybrid Cloudflare approach if needed (Workers for MCP server, Pages for frontend)
4. Keep PostgreSQL as source of truth

---

## Appendix: Research Documents

All detailed research has been archived for future reference:

```
docs/research-archive/
├── README.md                              # Archive index
├── xano-research-analysis.md              # 710 lines
├── supabase-research-analysis.md          # 1,077 lines
└── cloudflare-research-analysis.md        # 868 lines
```

**Total research:** 2,735 lines across 3 comprehensive analyses

Each document includes:
- Executive summaries with verdicts
- Feature compatibility matrices
- Migration effort estimates (weeks/difficulty)
- Code examples and implementation patterns
- Pricing analysis with real cost scenarios
- Risk assessments
- Architecture diagrams and comparisons

---

## Decision Record

**Decision:** Continue with FastAPI + Railway + PostgreSQL stack

**Made by:** Development team

**Date:** 2025-10-24

**Rationale:** Architectural alignment, team expertise, minimal risk, maximum velocity

**Review date:** 2026-04-24 (6-month checkpoint)

**Approval:** ✅ Confirmed

---

## References

- **Main documentation:** `CLAUDE.md` (updated)
- **Build guide:** `doc.md`
- **Product spec:** `specs/product-spec.md`
- **Technical spec:** `specs/technical-spec.md`
- **API documentation:** `docs/API.md`
- **Deployment guide:** `docs/DEPLOY-RAILWAY.md`
- **ChatGPT integration:** `docs/CHATGPT-INTEGRATION.md`

---

**Document Status:** Final decision locked
**Last Updated:** 2025-10-24
**Next Review:** 2026-04-24
