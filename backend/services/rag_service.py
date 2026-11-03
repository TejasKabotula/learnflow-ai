import os
import re
import logging
from typing import List, Dict, Any, Optional, Tuple
from core.config import settings
from services.ai_service import AIService

logger = logging.getLogger("learnflow.rag")

# Lazy-loaded globals to optimize memory and startup time
_chroma_client = None
_embedding_model = None

def get_chroma_client():
    global _chroma_client
    if _chroma_client is None:
        import chromadb
        os.makedirs(settings.CHROMA_PERSIST_DIR, exist_ok=True)
        _chroma_client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIR)
        logger.info(f"[RAG] ChromaDB initialized at {settings.CHROMA_PERSIST_DIR}")
    return _chroma_client

def get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        from sentence_transformers import SentenceTransformer
        logger.info(f"[RAG] Loading SentenceTransformer model '{settings.EMBEDDING_MODEL}'...")
        _embedding_model = SentenceTransformer(settings.EMBEDDING_MODEL)
        logger.info("[RAG] SentenceTransformer model loaded successfully")
    return _embedding_model

def format_seconds(seconds: int) -> str:
    """Converts seconds into MM:SS format, or HH:MM:SS if >= 1 hour."""
    seconds = int(max(0, seconds))
    m, s = divmod(seconds, 60)
    h, m = divmod(m, 60)
    if h > 0:
        return f"{h:02d}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"

def sanitize_collection_name(video_id: str) -> str:
    """Ensures valid ChromaDB collection name (3-63 chars, alphanumeric with - or _)."""
    clean = re.sub(r'[^a-zA-Z0-9_-]', '_', video_id)
    name = f"video_{clean}"
    if len(name) < 3:
        name = f"video_{name.ljust(3, '0')}"
    return name[:63]

class RAGService:
    @staticmethod
    def chunk_transcript(
        video_id: str,
        segments: List[Dict[str, Any]],
        full_text: Optional[str] = None,
        target_chunk_chars: int = 400
    ) -> List[Dict[str, Any]]:
        """
        Groups raw subtitle segments into timestamped semantic chunks.
        Each chunk tracks:
        - text: combined text of the chunk
        - start: start time in seconds of the first segment in the chunk
        - end: end time in seconds of the last segment in the chunk
        - start_formatted: e.g. '02:15'
        - chunk_id: unique identifier
        """
        chunks: List[Dict[str, Any]] = []

        if segments and len(segments) > 0:
            current_chunk_text = []
            current_start = None
            current_end = None
            current_length = 0

            for seg in segments:
                s_text = seg.get("text", "").strip()
                if not s_text:
                    continue

                s_start = int(seg.get("start", 0))
                s_dur = int(seg.get("duration", 0))
                s_end = s_start + max(1, s_dur)

                if current_start is None:
                    current_start = s_start

                current_chunk_text.append(s_text)
                current_length += len(s_text)
                current_end = s_end

                # When chunk reaches target size, finalize it
                if current_length >= target_chunk_chars:
                    combined_text = " ".join(current_chunk_text).strip()
                    if combined_text:
                        chunks.append({
                            "chunk_id": f"{video_id}_{len(chunks)}",
                            "video_id": video_id,
                            "text": combined_text,
                            "start": current_start,
                            "end": current_end,
                            "start_formatted": format_seconds(current_start)
                        })
                    current_chunk_text = []
                    current_start = None
                    current_length = 0

            # Remaining segments
            if current_chunk_text and current_start is not None:
                combined_text = " ".join(current_chunk_text).strip()
                if combined_text:
                    chunks.append({
                        "chunk_id": f"{video_id}_{len(chunks)}",
                        "video_id": video_id,
                        "text": combined_text,
                        "start": current_start,
                        "end": current_end or current_start,
                        "start_formatted": format_seconds(current_start)
                    })

        elif full_text:
            # Fallback if no granular segments: character chunking with estimated timestamps (150 words/min)
            words = full_text.split()
            chunk_word_size = 75
            for idx in range(0, len(words), chunk_word_size):
                chunk_words = words[idx : idx + chunk_word_size]
                combined_text = " ".join(chunk_words).strip()
                # Estimate start time: idx words / (150 words / 60 sec) = idx * 0.4 seconds
                est_start = int(idx * 0.4)
                est_end = int((idx + len(chunk_words)) * 0.4)
                chunks.append({
                    "chunk_id": f"{video_id}_{len(chunks)}",
                    "video_id": video_id,
                    "text": combined_text,
                    "start": est_start,
                    "end": est_end,
                    "start_formatted": format_seconds(est_start)
                })

        return chunks

    @staticmethod
    def index_video(video_id: str, transcript: str, segments: List[Dict[str, Any]]) -> int:
        """
        Embeds and indexes video transcript chunks into ChromaDB.
        Returns the number of indexed chunks.
        """
        clean_id = video_id.strip()
        client = get_chroma_client()
        col_name = sanitize_collection_name(clean_id)

        try:
            collection = client.get_collection(col_name)
            count = collection.count()
            if count > 0:
                logger.info(f"[RAG] Video '{clean_id}' already indexed ({count} chunks)")
                return count
        except Exception:
            # Collection does not exist yet, create it
            collection = client.create_collection(
                name=col_name,
                metadata={"video_id": clean_id, "hnsw:space": "cosine"}
            )

        chunks = RAGService.chunk_transcript(clean_id, segments, transcript)
        if not chunks:
            logger.warning(f"[RAG] No chunks generated for video '{clean_id}'")
            return 0

        model = get_embedding_model()
        texts = [c["text"] for c in chunks]
        embeddings = model.encode(texts, show_progress_bar=False, normalize_embeddings=True).tolist()

        ids = [c["chunk_id"] for c in chunks]
        metadatas = [{
            "video_id": c["video_id"],
            "start": int(c["start"]),
            "end": int(c["end"]),
            "start_formatted": c["start_formatted"]
        } for c in chunks]

        # Batch insert into ChromaDB
        collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=texts,
            metadatas=metadatas
        )

        logger.info(f"[RAG] Successfully indexed {len(chunks)} chunks for video '{clean_id}'")
        return len(chunks)

    @staticmethod
    def query_video(video_id: str, question: str, top_k: int = 4) -> List[Dict[str, Any]]:
        """
        Searches ChromaDB for the most relevant transcript segments for a given question.
        Returns list of chunks with text, start timestamp, and similarity distance.
        """
        clean_id = video_id.strip()
        client = get_chroma_client()
        col_name = sanitize_collection_name(clean_id)

        try:
            collection = client.get_collection(col_name)
        except Exception:
            logger.warning(f"[RAG] Collection '{col_name}' not found")
            return []

        if collection.count() == 0:
            return []

        model = get_embedding_model()
        query_embedding = model.encode([question], normalize_embeddings=True).tolist()

        results = collection.query(
            query_embeddings=query_embedding,
            n_results=min(top_k, collection.count())
        )

        matched_chunks = []
        if results and results.get("documents") and len(results["documents"]) > 0:
            docs = results["documents"][0]
            metas = results["metadatas"][0] if results.get("metadatas") else []
            distances = results["distances"][0] if results.get("distances") else []

            for i, doc in enumerate(docs):
                meta = metas[i] if i < len(metas) else {}
                dist = distances[i] if i < len(distances) else None
                matched_chunks.append({
                    "snippet": doc,
                    "timestamp": meta.get("start", 0),
                    "timestamp_formatted": meta.get("start_formatted", format_seconds(meta.get("start", 0))),
                    "score": round(1.0 - (dist if dist is not None else 0.5), 3)
                })

        # Sort chronologically by video timestamp for coherent study context
        matched_chunks.sort(key=lambda x: x["timestamp"])
        return matched_chunks

    @staticmethod
    def generate_rag_answer(
        question: str,
        video_title: str,
        retrieved_chunks: List[Dict[str, Any]],
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Generates a grounded, factual answer using retrieved transcript context with citations.
        """
        # Construct citation context
        context_parts = []
        for i, chunk in enumerate(retrieved_chunks, 1):
            ts = chunk.get("timestamp_formatted", "00:00")
            context_parts.append(f"[{ts}] {chunk.get('snippet')}")

        context_block = "\n\n".join(context_parts) if context_parts else "No direct transcript excerpt found."

        system_prompt = (
            "You are Learn Flow AI, a brilliant personal academic tutor and study assistant. "
            "Your goal is to help the student master the lesson presented in this YouTube video. "
            "Follow these strict pedagogical rules:\n"
            "1. Ground your answer in the provided video excerpts.\n"
            "2. When explaining where a concept or step is discussed, cite the timestamp using `[MM:SS]`.\n"
            "3. Format your answer with clean Markdown: bullet points, bold key terms, and code blocks if applicable.\n"
            "4. If the video does not mention the answer, clearly state that it wasn't covered in this lesson, but give a helpful brief explanation.\n"
            "5. Keep the tone encouraging, clear, and focused on active understanding."
        )

        history_context = ""
        if conversation_history:
            # Include last 3 exchanges for context continuity
            recent = conversation_history[-6:]
            history_lines = []
            for msg in recent:
                role = "Student" if msg.get("role") == "user" else "Tutor"
                history_lines.append(f"{role}: {msg.get('content')}")
            if history_lines:
                history_context = "Previous Conversation:\n" + "\n".join(history_lines) + "\n\n"

        user_prompt = f"""Video Title: {video_title}

{history_context}Relevant Video Excerpts (with Timestamps):
\"\"\"
{context_block}
\"\"\"

Student's Question: {question}

Provide a comprehensive, clear, and well-structured answer:"""

        response = AIService._call_groq(system_prompt, user_prompt, temperature=0.3)
        if not response:
            # Deterministic fallback answer if Groq is unavailable
            first_ts = retrieved_chunks[0].get("timestamp_formatted", "00:00") if retrieved_chunks else "00:00"
            snippet = retrieved_chunks[0].get("snippet", "") if retrieved_chunks else ""
            response = (
                f"Based on the lesson '{video_title}', this topic is discussed starting around `[{first_ts}]`:\n\n"
                f"> *\"{snippet[:250]}...\"*\n\n"
                f"To explore this further, click the timestamp chip above to jump directly to that point in the lecture."
            )

        return response.strip(), retrieved_chunks
