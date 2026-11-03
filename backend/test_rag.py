import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

from services.rag_service import RAGService

def test_rag():
    print("=" * 60)
    print("TESTING RAG SERVICE (ChromaDB + SentenceTransformers)")
    print("=" * 60)
    
    sample_segments = [
        {"start": 0, "duration": 15, "text": "Welcome to this lesson on Python async programming and event loops."},
        {"start": 15, "duration": 20, "text": "The event loop manages cooperative multitasking using asynchronous coroutines."},
        {"start": 35, "duration": 25, "text": "When you execute await on a task, execution yields control back to the event loop."},
        {"start": 60, "duration": 30, "text": "Vector databases like ChromaDB store high-dimensional semantic embeddings for fast retrieval."}
    ]
    
    # 1. Test indexing
    print("\n[1] Indexing test video segments...")
    count = RAGService.index_video("test_rag_vid_1", "Full transcript text...", sample_segments)
    print(f"✅ Indexed {count} chunk(s) successfully.")
    assert count > 0, "Expected at least 1 chunk to be indexed"
    
    # 2. Test semantic query
    print("\n[2] Querying: 'What does await do in Python?'...")
    results = RAGService.query_video("test_rag_vid_1", "What does await do in Python?", top_k=2)
    print(f"✅ Retrieved {len(results)} relevant chunk(s):")
    for r in results:
        print(f"  - [{r['timestamp_formatted']}] (Score: {r['score']}) {r['snippet']}")
    assert len(results) > 0, "Expected at least 1 result"
    assert "yield" in results[0]["snippet"].lower() or "await" in results[0]["snippet"].lower()

    # 3. Test grounded answer generation
    print("\n[3] Generating Grounded Answer...")
    answer, citations = RAGService.generate_rag_answer(
        question="What does await do?",
        video_title="Python Async Mastery",
        retrieved_chunks=results
    )
    print(f"✅ Answer generated:\n{answer}\n")
    print(f"✅ Citations returned: {len(citations)}")
    for c in citations:
        print(f"  - [{c['timestamp_formatted']}] {c['snippet'][:60]}...")

    print("\n" + "=" * 60)
    print("🎉 ALL RAG CORE TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    test_rag()
