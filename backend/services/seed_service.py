from datetime import datetime, timedelta
from bson import ObjectId

async def ensure_user_seeded(user_id: str, db):
    """
    Checks if the user has any data in playlists, notes, quizzes, or saved resources.
    If empty, populates rich starter curriculum, study notes, interactive quizzes,
    and saved resources so the platform is immediately active and testable.
    """
    now = datetime.utcnow()
    yesterday = now - timedelta(days=1)
    two_days_ago = now - timedelta(days=2)

    # 1. Seed Playlists / Courses if empty
    playlist_count = await db["playlists"].count_documents({"user_id": user_id})
    if playlist_count == 0:
        courses = [
            {
                "user_id": user_id,
                "youtube_url": "https://www.youtube.com/playlist?list=PL4cUxeGkcC9gU00vY_oTvdVzI2iB6I1V4",
                "title": "Modern Full-Stack Architecture (FastAPI & React 19)",
                "description": "Comprehensive curriculum covering asynchronous Python backends, high-throughput REST APIs, and reactive React 19 client components.",
                "created_at": two_days_ago,
                "last_accessed_at": now,
                "videos": [
                    {
                        "video_id": "7t2alSnE2-I",
                        "title": "1. FastAPI High-Performance Asynchronous Python Deep Dive",
                        "thumbnail_url": "https://img.youtube.com/vi/7t2alSnE2-I/hqdefault.jpg",
                        "duration": "18:24",
                        "completed": True
                    },
                    {
                        "video_id": "8pDqJVdNa44",
                        "title": "2. React 19 Server Components, Actions & Optimistic UI",
                        "thumbnail_url": "https://img.youtube.com/vi/8pDqJVdNa44/hqdefault.jpg",
                        "duration": "24:10",
                        "completed": False
                    },
                    {
                        "video_id": "i53Gi_K3o7I",
                        "title": "3. Real-time Vector Search & RAG Chat Architecture",
                        "thumbnail_url": "https://img.youtube.com/vi/i53Gi_K3o7I/hqdefault.jpg",
                        "duration": "21:45",
                        "completed": False
                    }
                ]
            },
            {
                "user_id": user_id,
                "youtube_url": "https://www.youtube.com/watch?v=zjkBMFhNj_g",
                "title": "Large Language Models & Neural Networks Mastery",
                "description": "Foundational curriculum on Transformer architectures, self-attention mechanisms, and tokenizer pipelines with Andrej Karpathy.",
                "created_at": two_days_ago,
                "last_accessed_at": yesterday,
                "videos": [
                    {
                        "video_id": "zjkBMFhNj_g",
                        "title": "1. Intro to Large Language Models (LLMs) - Mental Models",
                        "thumbnail_url": "https://img.youtube.com/vi/zjkBMFhNj_g/hqdefault.jpg",
                        "duration": "42:15",
                        "completed": True
                    },
                    {
                        "video_id": "kCc8FmEb1nY",
                        "title": "2. Attention Is All You Need: Transformer Intuition",
                        "thumbnail_url": "https://img.youtube.com/vi/kCc8FmEb1nY/hqdefault.jpg",
                        "duration": "35:50",
                        "completed": True
                    }
                ]
            },
            {
                "user_id": user_id,
                "youtube_url": "https://www.youtube.com/playlist?list=PLMC9HnGGQTGw2rW0iGg2QJc3_3Q88b",
                "title": "System Design & Distributed Scalability",
                "description": "Enterprise-grade system design patterns: caching hierarchies, database sharding, CAP theorem, and global rate limiters.",
                "created_at": now,
                "last_accessed_at": now,
                "videos": [
                    {
                        "video_id": "i53Gi_K3o7I",
                        "title": "1. Distributed Caching, Cache Invalidation & Redis Clusters",
                        "thumbnail_url": "https://img.youtube.com/vi/i53Gi_K3o7I/hqdefault.jpg",
                        "duration": "28:30",
                        "completed": False
                    },
                    {
                        "video_id": "bUHFg8CZFCA",
                        "title": "2. Database Sharding, Partitioning & Consistent Hashing",
                        "thumbnail_url": "https://img.youtube.com/vi/bUHFg8CZFCA/hqdefault.jpg",
                        "duration": "31:12",
                        "completed": False
                    }
                ]
            }
        ]

        for course in courses:
            result = await db["playlists"].insert_one(course)
            # Record progress tracking entries for completed lessons
            for v in course["videos"]:
                if v["completed"]:
                    await db["progress"].update_one(
                        {"user_id": user_id, "video_id": v["video_id"]},
                        {"$set": {
                            "user_id": user_id,
                            "video_id": v["video_id"],
                            "completed": True,
                            "last_watched_at": yesterday
                        }},
                        upsert=True
                    )

    # 2. Seed Notes if empty
    notes_count = await db["notes"].count_documents({"user_id": user_id})
    if notes_count == 0:
        sample_notes = [
            {
                "user_id": user_id,
                "title": "FastAPI Concurrency vs Node.js Event Loop",
                "content": """# FastAPI Concurrency & Async Architecture

### Key Takeaways:
1. **Asynchronous Non-Blocking I/O**:
   - Built on top of **Starlette** and **AnyIO**, FastAPI runs async route handlers (`async def`) directly inside the asyncio event loop.
   - Synchronous route handlers (`def`) are automatically dispatched to an internal thread pool to prevent blocking the event loop.

2. **Benchmark Comparison**:
   - Throughput for I/O-bound microservices matches Node.js and Go due to low Python asyncio overhead with Uvicorn / uvloop.
   - Memory footprint is significantly lower than JVM or heavy WSGI frameworks like Django/Flask with Gunicorn workers.

### Best Practice Code Pattern:
```python
@app.get("/api/v1/resource")
async def get_resource(client = Depends(get_http_client)):
    # Non-blocking async HTTP request
    response = await client.get("https://api.upstream.internal/data")
    return response.json()
```
""",
                "timestamp": 120,
                "video_id": "7t2alSnE2-I",
                "created_at": yesterday,
                "updated_at": now
            },
            {
                "user_id": user_id,
                "title": "Self-Attention Mechanism & Query-Key-Value Math",
                "content": """# Understanding Transformer Attention Mechanisms

### Intuition:
- **Query (Q)**: What the current token is looking for.
- **Key (K)**: What each token in the context advertises about itself.
- **Value (V)**: The actual semantic payload each token contributes.

### Scaled Dot-Product Formula:
$$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V$$

### Why divide by $\sqrt{d_k}$?
When dimension $d_k$ is large, the dot products grow large in magnitude, pushing the softmax function into regions with extremely small gradients. Dividing by $\sqrt{d_k}$ stabilizes backpropagation.
""",
                "timestamp": 240,
                "video_id": "zjkBMFhNj_g",
                "created_at": two_days_ago,
                "updated_at": yesterday
            },
            {
                "user_id": user_id,
                "title": "Distributed Caching & Cache Invalidation Checklist",
                "content": """# Distributed Caching Architecture

### Caching Strategies:
1. **Cache-Aside (Lazy Loading)**:
   - Application first checks cache. On miss, queries DB, populates cache, and returns.
   - Resilient against cache failure, but initial requests suffer latency penalty.
2. **Write-Through**:
   - Data written to cache and database concurrently. Ensures strong consistency at cost of higher write latency.
3. **Write-Behind (Write-Back)**:
   - Data written to cache first; async workers flush dirty records to database in batches.

### Invalidation Rules:
- Always set an absolute TTL even if explicit invalidation events exist.
- Use jittered TTLs (`base_ttl + random(1, 60)`) to eliminate cache stampedes!
""",
                "timestamp": 310,
                "video_id": "i53Gi_K3o7I",
                "created_at": now,
                "updated_at": now
            }
        ]
        await db["notes"].insert_many(sample_notes)

    # 3. Seed Saved Resources if empty
    saved_count = await db["saved_resources"].count_documents({"user_id": user_id})
    if saved_count == 0:
        sample_saved = [
            {
                "user_id": user_id,
                "title": "Andrej Karpathy: Intro to Large Language Models - Study Notes",
                "type": "summary",
                "video_id": "zjkBMFhNj_g",
                "metadata": {
                    "author": "Andrej Karpathy",
                    "thumbnail_url": "https://img.youtube.com/vi/zjkBMFhNj_g/hqdefault.jpg"
                },
                "content": """# Comprehensive Lecture Summary: Introduction to LLMs

### Core Mental Models:
- **LLMs are compression files of the Internet**: A ~70B parameter model represents a lossy, high-dimensional zip file of human knowledge.
- **Pre-training Phase**: Predict the next token given billions of tokens of web text. Takes months on thousands of GPUs.
- **Fine-Tuning (SFT / RLHF)**: Aligns the raw token completer into a helpful, honest, and harmless assistant.

### Key Takeaways:
1. System 1 (fast, reactive pattern completion) vs System 2 (reasoning, planning, scratchpad thinking).
2. The fundamental limitation of token-by-token autoregression is lack of backtracking without explicit chain-of-thought prompting.
""",
                "created_at": two_days_ago
            },
            {
                "user_id": user_id,
                "title": "React 19 & Next.js Architecture Practice",
                "type": "quiz",
                "video_id": "8pDqJVdNa44",
                "metadata": {
                    "questions_count": 5
                },
                "content": [
                    {
                        "id": 1,
                        "question": "What is the primary benefit of React Server Components (RSC)?",
                        "options": ["A) Faster CSS animation rendering", "B) Zero bundle size footprint for server dependencies", "C) Automatic Redux replacement", "D) Client-side localStorage synchronization"],
                        "answer": "B",
                        "explanation": "Server components run only on the server, meaning their package dependencies never get sent down to the client JavaScript bundle."
                    },
                    {
                        "id": 2,
                        "question": "How does the 'useActionState' hook improve form handling in React 19?",
                        "options": ["A) It caches all input keystrokes in IndexedDB", "B) It tracks pending status, optimistic updates, and action response data automatically", "C) It replaces all backend validation", "D) It turns forms into WebGL shaders"],
                        "answer": "B",
                        "explanation": "useActionState provides built-in state management for async form actions including pending flags and error handling."
                    }
                ],
                "created_at": yesterday
            },
            {
                "user_id": user_id,
                "title": "Distributed Caching & Redis Patterns",
                "type": "note",
                "video_id": "i53Gi_K3o7I",
                "metadata": {
                    "tags": ["System Design", "Redis", "Performance"]
                },
                "content": "Comprehensive notes covering LRU eviction policies, Redis Sentinel failover mechanisms, and Redis Cluster hash slots.",
                "created_at": now
            }
        ]
        await db["saved_resources"].insert_many(sample_saved)

    # 4. Seed Quizzes & Attempt History if empty
    quiz_count = await db["user_quizzes"].count_documents({"user_id": user_id})
    if quiz_count == 0:
        quiz_1_doc = {
            "user_id": user_id,
            "title": "Core Machine Learning & LLM Foundations Quiz",
            "video_id": "zjkBMFhNj_g",
            "created_at": two_days_ago,
            "questions": [
                {
                    "id": 1,
                    "question": "What is the primary role of the Softmax function in multi-class classification?",
                    "options": [
                        "A) Normalize activations into a valid probability distribution summing to 1",
                        "B) Reduce model parameter count via weight pruning",
                        "C) Accelerate gradient descent learning rate",
                        "D) Prevent overfitting via L2 regularization"
                    ],
                    "answer": "A",
                    "explanation": "Softmax exponents and normalizes raw logits into probabilities that sum to 1.0."
                },
                {
                    "id": 2,
                    "question": "In the self-attention mechanism, what prevents dot-product values from blowing up when dimensionality is high?",
                    "options": [
                        "A) Sigmoidal clipping",
                        "B) Division by the square root of key dimension sqrt(d_k)",
                        "C) Layer normalization applied before matrix multiplication",
                        "D) Dropout rate set to 0.5"
                    ],
                    "answer": "B",
                    "explanation": "Scaling by sqrt(d_k) prevents extremely large dot products that push Softmax into vanishing gradient saturation regions."
                },
                {
                    "id": 3,
                    "question": "What is the difference between Pre-training and Fine-tuning in LLMs?",
                    "options": [
                        "A) Pre-training learns next-token prediction on internet-scale text; Fine-tuning aligns the model for conversational instructions",
                        "B) Pre-training is supervised; Fine-tuning is unsupervised",
                        "C) Pre-training only runs on CPU; Fine-tuning requires GPUs",
                        "D) Pre-training is only for vision models"
                    ],
                    "answer": "A",
                    "explanation": "Pre-training acquires broad world knowledge through autoregressive token prediction, while fine-tuning (SFT/RLHF) teaches task adherence."
                },
                {
                    "id": 4,
                    "question": "What is catastrophic forgetting in neural network training?",
                    "options": [
                        "A) When the model runs out of GPU memory during backprop",
                        "B) When a model abruptly loses previously learned knowledge upon training on a new task distribution",
                        "C) When weights get set to NaN due to exploding gradients",
                        "D) When dropout removes more than 90% of connections"
                    ],
                    "answer": "B",
                    "explanation": "Catastrophic forgetting occurs when newly updated weights overwrite representations previously formed for earlier tasks."
                },
                {
                    "id": 5,
                    "question": "Why are Positional Encodings necessary in Transformer architectures?",
                    "options": [
                        "A) To compress embedding vector sizes",
                        "B) Because self-attention is permutation-invariant and has no inherent sense of word order",
                        "C) To prevent gradient explosion in the feedforward layers",
                        "D) To enforce vocabulary tokenization bounds"
                    ],
                    "answer": "B",
                    "explanation": "Without positional encodings, attention treats a sequence of words as an unordered set of tokens."
                }
            ]
        }
        res_1 = await db["user_quizzes"].insert_one(quiz_1_doc)
        quiz_1_id = str(res_1.inserted_id)

        # Seed attempt for quiz 1 so attempt stats and streak are populated
        attempt_doc = {
            "user_id": user_id,
            "quiz_id": quiz_1_id,
            "score": 4,
            "total_questions": 5,
            "percentage": 80,
            "completed_at": yesterday,
            "results": [
                {"question_id": 1, "question": "What is the primary role of the Softmax function?", "selected_answer": "A", "correct_answer": "A", "is_correct": True, "explanation": "Correct!"},
                {"question_id": 2, "question": "In the self-attention mechanism, what prevents dot-product values from blowing up?", "selected_answer": "B", "correct_answer": "B", "is_correct": True, "explanation": "Correct!"},
                {"question_id": 3, "question": "What is the difference between Pre-training and Fine-tuning?", "selected_answer": "A", "correct_answer": "A", "is_correct": True, "explanation": "Correct!"},
                {"question_id": 4, "question": "What is catastrophic forgetting?", "selected_answer": "B", "correct_answer": "B", "is_correct": True, "explanation": "Correct!"},
                {"question_id": 5, "question": "Why are Positional Encodings necessary?", "selected_answer": "C", "correct_answer": "B", "is_correct": False, "explanation": "Positional encodings provide token order."}
            ]
        }
        await db["quiz_attempts"].insert_one(attempt_doc)

        quiz_2_doc = {
            "user_id": user_id,
            "title": "System Design & Distributed Scalability Quiz",
            "video_id": "i53Gi_K3o7I",
            "created_at": now,
            "questions": [
                {
                    "id": 1,
                    "question": "According to the CAP theorem, which property must be sacrificed in a distributed system during network partition?",
                    "options": [
                        "A) Either Consistency or Availability",
                        "B) Performance and Latency",
                        "C) Compression and Encryption",
                        "D) Durability and Atomicity"
                    ],
                    "answer": "A",
                    "explanation": "In the presence of a network partition (P), a distributed system must choose between returning consistent data or remaining available."
                },
                {
                    "id": 2,
                    "question": "What is the primary advantage of Consistent Hashing over traditional modulo hashing?",
                    "options": [
                        "A) Faster string comparison",
                        "B) Minimizes remapped keys when adding or removing cache nodes to k/n",
                        "C) Eliminates the need for memory allocations",
                        "D) Automatically encrypts cached payloads"
                    ],
                    "answer": "B",
                    "explanation": "In consistent hashing, adding or removing a node only requires remapping k/n keys, preventing mass cache invalidation."
                }
            ]
        }
        await db["user_quizzes"].insert_one(quiz_2_doc)
