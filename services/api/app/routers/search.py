from fastapi import APIRouter, Depends, HTTPException
from uuid import UUID
import os

from sqlalchemy import text
from sqlalchemy.orm import Session

from ..models import SearchResp, SearchRespItem, MemoryRef
from ..deps import get_user_id, db_session

router = APIRouter(prefix="/v1/search", tags=["search"])


def _embed(text_in: str) -> list[float]:
    dim = int(os.getenv("EMBEDDING_DIM", "1536"))
    model = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return [0.0] * dim
    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key)
        resp = client.embeddings.create(model=model, input=text_in)
        vec = resp.data[0].embedding
        if len(vec) != dim:
            if len(vec) < dim:
                vec = vec + [0.0] * (dim - len(vec))
            else:
                vec = vec[:dim]
        return vec
    except Exception:
        return [0.0] * dim


def _vec_literal(v: list[float]) -> str:
    # pgvector literal: [x1, x2, ...]
    return "[" + ",".join(f"{x:.6f}" for x in v) + "]"


def _build_reasons(query: str, title: str, vec_sim: float, text_rank: float) -> list[str]:
    """Build human-readable reasons for why a memory matched the search query.

    Args:
        query: The search query string
        title: The memory title
        vec_sim: Vector similarity score (0-1)
        text_rank: Text search rank score

    Returns:
        List of reason strings explaining the match
    """
    reasons = []

    # Check for exact or partial term matches in title
    query_lower = query.lower()
    title_lower = title.lower() if title else ""
    query_terms = set(query_lower.split())
    title_terms = set(title_lower.split())

    # Exact match
    if query_lower in title_lower:
        reasons.append(f"exact match: '{query}'")
    else:
        # Partial term matches
        matching_terms = query_terms & title_terms
        if matching_terms:
            for term in sorted(matching_terms)[:3]:  # Show up to 3 matching terms
                reasons.append(f"term match: '{term}'")

    # Vector similarity (semantic similarity)
    if vec_sim > 0.7:
        reasons.append("strong semantic similarity")
    elif vec_sim > 0.5:
        reasons.append("semantic similarity")

    # Text rank (full-text search quality)
    if text_rank > 0.1:
        reasons.append("text relevance")

    # If no specific reasons but has score, add generic
    if not reasons:
        if vec_sim > 0.3:
            reasons.append("related content")
        else:
            reasons.append("potential match")

    return reasons


@router.get("/associative", response_model=SearchResp)
async def search_associative(
    q: str,
    limit: int = 20,
    user_id: UUID = Depends(get_user_id),
    db: Session = Depends(db_session),
):
    limit = max(1, min(limit, 50))
    emb = _embed(q)
    veclit = _vec_literal(emb)
    rows = db.execute(
        text(
            """
            with q as (
              select websearch_to_tsquery('english', :q) as qtsv,
                     (:qemb)::vector(1536) as qemb
            )
            select m.id, m.title, m.visibility, m.created_at,
                   (
                     0.55 * (1 - coalesce(m.embedding <=> q.qemb, 1)) +
                     0.35 * coalesce(ts_rank_cd(m.tsv, q.qtsv), 0) +
                     0.10 * 0
                   ) as score,
                   (1 - coalesce(m.embedding <=> q.qemb, 1)) as vec_sim,
                   coalesce(ts_rank_cd(m.tsv, q.qtsv), 0) as text_rank,
                   ts_headline('english', coalesce(m.title, ''), q.qtsv, 'MaxWords=10') as title_hl
            from memory m
            cross join q
            where coalesce(m.status, 'ACTIVE') <> 'DELETED'
            order by score desc
            limit :limit
            """
        ),
        {"q": q, "qemb": veclit, "limit": limit},
    ).all()

    results = []
    for r in rows:
        reasons = _build_reasons(q, r[1] or "", float(r[5]), float(r[6]))
        results.append(
            SearchRespItem(
                memory=MemoryRef(id=r[0], title=r[1], visibility=r[2], created_at=r[3]),
                score=float(r[4]),
                reasons=reasons,
            )
        )
    return SearchResp(query=q, results=results)
