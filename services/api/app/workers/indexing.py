"""Indexing worker: consumes memory_event and refreshes memory.tsv + memory.embedding.
Uses OpenAI embeddings if OPENAI_API_KEY is set; falls back to zeros.
"""

import os
import time
import psycopg
import logging
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

EMBEDDING_DIM = int(os.getenv("EMBEDDING_DIM", "1536"))
MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")


def get_conn():
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        raise RuntimeError("DATABASE_URL not set")
    return psycopg.connect(dsn)


def embed(text: str) -> list[float]:
    """Generate embedding vector for text using OpenAI API.

    Args:
        text: Text to embed

    Returns:
        List of floats representing the embedding vector (dimension: EMBEDDING_DIM)
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        logger.warning("OPENAI_API_KEY not set, using zero vector for embedding")
        return [0.0] * EMBEDDING_DIM
    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key)
        resp = client.embeddings.create(model=MODEL, input=text)
        vec = resp.data[0].embedding
        # Ensure dimension matches
        if len(vec) != EMBEDDING_DIM:
            logger.warning(f"Embedding dimension mismatch: got {len(vec)}, expected {EMBEDDING_DIM}")
            # Pad/trim as needed (shouldn't happen if model dims match)
            if len(vec) < EMBEDDING_DIM:
                vec = vec + [0.0] * (EMBEDDING_DIM - len(vec))
            else:
                vec = vec[:EMBEDDING_DIM]
        return vec
    except Exception as e:
        logger.error(f"Error generating embedding: {e}")
        return [0.0] * EMBEDDING_DIM


def build_document(cur, memory_id: str) -> str:
    # Compose doc from title + locked core + last 5 text/reflection layers + any captions
    cur.execute(
        """
        with core as (
            select m.title,
                   mc.narrative
            from memory m
            left join memory_core_version mc
              on mc.memory_id = m.id and mc.locked = true and mc.version = m.current_core_version
            where m.id = %s
        ),
        layers as (
            select coalesce(text_content,'') as t,
                   coalesce(meta->>'caption','') as c
            from memory_layer ml
            where ml.memory_id = %s and ml.kind in ('TEXT','REFLECTION')
            order by ml.created_at desc
            limit 5
        )
        select coalesce((select title from core),'') || ' ' ||
               coalesce((select narrative from core),'') || ' ' ||
               coalesce(string_agg(t || ' ' || c, ' '), '') as text
        from layers
        """,
        (memory_id, memory_id),
    )
    row = cur.fetchone()
    return row[0] if row and row[0] else ""


def process_one(cur) -> bool:
    """Process a single indexing event from the queue.

    Args:
        cur: Database cursor

    Returns:
        True if an event was processed, False if queue was empty
    """
    # Fetch one event (oldest)
    cur.execute("select id, memory_id from memory_event order by id asc limit 1 for update skip locked")
    evt = cur.fetchone()
    if not evt:
        return False
    eid, mid = evt
    logger.info(f"Processing indexing event {eid} for memory {mid}")

    doc = build_document(cur, mid)
    logger.debug(f"Built document for memory {mid}, length: {len(doc)} chars")

    vec = embed(doc)
    logger.debug(f"Generated embedding for memory {mid}, dimension: {len(vec)}")

    cur.execute(
        "update memory set tsv = to_tsvector('english', %s), embedding = %s where id = %s",
        (doc, vec, mid),
    )
    cur.execute("delete from memory_event where id = %s", (eid,))
    logger.info(f"Completed indexing for memory {mid}")
    return True


def main():
    """Main worker loop - processes indexing events from the queue."""
    logger.info("=== Indexing worker started ===")
    logger.info(f"Configuration: MODEL={MODEL}, EMBEDDING_DIM={EMBEDDING_DIM}")

    api_key = os.getenv("OPENAI_API_KEY")
    if api_key:
        logger.info("OpenAI API key configured - using real embeddings")
    else:
        logger.warning("OpenAI API key NOT configured - using zero vectors for embeddings")

    with get_conn() as conn:
        logger.info("Database connection established")
        with conn.cursor() as cur:
            event_count = 0
            while True:
                processed = False
                try:
                    conn.execute("begin")
                    processed = process_one(cur)
                    conn.commit()
                    if processed:
                        event_count += 1
                        logger.info(f"Total events processed in this session: {event_count}")
                except Exception as e:
                    logger.error(f"Error processing event: {e}", exc_info=True)
                    conn.rollback()
                if not processed:
                    time.sleep(2)


if __name__ == "__main__":
    main()
