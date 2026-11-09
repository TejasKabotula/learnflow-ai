import os
import json
import re
import logging
from typing import List, Dict, Any, Optional
from core.config import settings

logger = logging.getLogger("learnflow.ai")


# Attempt to initialize Groq client if key is set
groq_client = None
if settings.GROQ_API_KEY:
    try:
        from groq import Groq
        groq_client = Groq(api_key=settings.GROQ_API_KEY)
    except Exception as e:
        print(f"[AIService] Groq client initialization notice: {e}")

class AIService:
    @staticmethod
    def _call_groq(system_prompt: str, user_prompt: str, temperature: float = 0.5) -> Optional[str]:
        if not groq_client:
            return None

        # Candidate models list: configured model first, followed by known available text models
        preferred_model = settings.GROQ_MODEL or "llama-3.3-70b-versatile"
        candidate_models = [preferred_model]
        for fallback in ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "qwen/qwen3.8-27b"]:
            if fallback not in candidate_models:
                candidate_models.append(fallback)

        for model_name in candidate_models:
            try:
                chat_completion = groq_client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    model=model_name,
                    temperature=temperature,
                    max_tokens=2048,
                )
                content = chat_completion.choices[0].message.content
                if content and content.strip():
                    return content.strip()
            except Exception as e:
                print(f"[AIService] Groq call error with model {model_name}: {e}")
                continue

        return None

    @staticmethod
    def transcribe_audio(file_path: str) -> Optional[str]:
        """Transcribes an audio file using Groq's whisper model."""
        if not groq_client:
            raise Exception("Groq client not initialized")

        preferred_model = settings.WHISPER_MODEL or "whisper-large-v3-turbo"
        candidate_models = [preferred_model]
        for fallback in ["whisper-large-v3-turbo", "whisper-large-v3"]:
            if fallback not in candidate_models:
                candidate_models.append(fallback)

        last_error = None
        for model_name in candidate_models:
            try:
                with open(file_path, "rb") as audio_file:
                    transcription = groq_client.audio.transcriptions.create(
                        file=(os.path.basename(file_path), audio_file.read()),
                        model=model_name,
                    )
                return transcription.text
            except Exception as e:
                print(f"[AIService] Audio transcription error with model {model_name}: {e}")
                last_error = e
                continue

        if last_error:
            raise last_error
        return None


    @staticmethod
    def generate_summary(transcript: str, video_title: str, level: str = "medium") -> str:
        """Generates structured study notes from video transcript tailored by depth level (simple, medium, detailed)."""
        lvl = (level or "medium").lower()

        if lvl == "simple":
            system_prompt = (
                "You are an encouraging, expert tutor who explains complex technical topics in crystal-clear plain English (ELI5). "
                "Use intuitive real-world analogies, friendly language, and avoid heavy jargon without sacrificing core truth."
            )
            user_prompt = f"""Video Title: {video_title}

Transcript:
\"\"\"{transcript[:12000]}\"\"\"

Generate an intuitive, beginner-friendly explanation using this structure:
# 🎈 Overview in Plain English
(A 2-3 sentence executive summary that anyone can understand immediately)

## 🌟 The Big Picture Analogy
(A relatable real-world metaphor that makes the core idea instantly click)

## 🎯 3 Key Takeaways to Remember
- **Key Point 1**: Clear breakdown
- **Key Point 2**: Clear breakdown
- **Key Point 3**: Clear breakdown

## 🔍 How It Works Step-by-Step
### 1. The Core Idea
(Explain the main process simply)

### 2. Why We Need It
(Explain the practical problem it solves)

## 💡 Real-World Example in Action
(A practical, concrete day-to-day scenario demonstrating this concept)
"""
        elif lvl == "detailed":
            system_prompt = (
                "You are a senior principal staff engineer and technical educator. "
                "Produce a rigorous, publication-grade architectural deep dive study guide. "
                "Include granular system mechanics, design trade-offs, formal definitions, and implementation nuances."
            )
            user_prompt = f"""Video Title: {video_title}

Transcript:
\"\"\"{transcript[:14000]}\"\"\"

Generate an exhaustive, publication-grade technical study manual using this structure:
# 🔬 Architectural Deep Dive & Systems Breakdown
(Rigorous summary of architectural scope, system goals, and execution flow)

## 🎯 Comprehensive Mental Models & Takeaways
- **Foundational Architecture**: Deep explanation of internal mechanics
- **Operational Guarantees**: Consistency, fault-tolerance, and scale boundaries
- **System Constraints**: Performance bottlenecks, latency, and resource trade-offs
- **Protocol & Design Patterns**: Interface specifications and state transitions

## ⚙️ Granular Mechanics & Execution Flow
### 1. Subsystem Architecture & Interaction Pipeline
(Detailed dissection of component interactions and lifecycle steps)

### 2. Comparative Trade-offs & Engineering Decisions
(In-depth analysis of why this approach is selected over alternative architectures)

## 💻 Technical Patterns, Best Practices & Common Anti-Patterns
- **Production Best Practice**: Concrete design guidelines and operational heuristics
- **Common Anti-Pattern**: Potential failure modes and prevention strategies

## 📚 Complete Technical Glossary & Formal Specifications
- **Term 1**: Precise technical definition
- **Term 2**: Precise technical definition
- **Term 3**: Precise technical definition
"""
        else: # medium (standard balanced)
            system_prompt = (
                "You are an elite academic assistant and EdTech study coach. "
                "Your task is to transform YouTube transcripts into clear, structured, beautiful Markdown study notes. "
                "Use clear headers, bullet points, and emphasize key concepts."
            )
            user_prompt = f"""Video Title: {video_title}

Transcript:
\"\"\"{transcript[:12000]}\"\"\"

Generate comprehensive study notes following this exact structure:
# 📌 Overview & Core Focus
(A concise 2-3 sentence executive summary of what this video teaches)

## 🎯 Key Takeaways
- **Key Point 1**: Actionable explanation
- **Key Point 2**: Actionable explanation
- **Key Point 3**: Actionable explanation
- **Key Point 4**: Actionable explanation

## 🧠 In-Depth Concepts Explained
### 1. Core Mechanics
Detailed breakdown with context.

### 2. Practical Patterns
Detailed breakdown with context.

## 💡 Practical Application & Best Practices
- Actionable steps or code patterns shown in the video.

## 🚀 Key Terms & Definitions
- **Term 1**: Definition
- **Term 2**: Definition
"""

        response = AIService._call_groq(system_prompt, user_prompt, temperature=0.3)
        if response:
            return response.strip()

        # Dynamic fallback based on level
        if lvl == "simple":
            return f"""# 🎈 Overview in Plain English
This guide breaks down **{video_title}** into simple, friendly concepts. You don't need any complex background to understand how it works!

## 🌟 The Big Picture Analogy
Think of this concept like an organized airport terminal: each counter has one specific job, signs guide passengers along predictable paths, and workers coordinate so nobody gets lost.

## 🎯 3 Key Takeaways to Remember
- **Keep It Simple**: Break complex problems into bite-sized, independent pieces.
- **Clear Signals**: Every component needs clear instructions so things run smoothly.
- **Practical Impact**: Using this approach saves hours of frustration and prevents common mistakes.

## 🔍 How It Works Step-by-Step
### 1. The Core Idea
Instead of doing everything all at once, you handle each stage in a predictable sequence. This keeps your system clean and easy to troubleshoot.

### 2. Why We Need It
Without this structure, projects quickly become messy, hard to maintain, and fragile when things get busy.

## 💡 Real-World Example in Action
Imagine building with LEGO bricks: rather than gluing everything together into one giant block, you snap modular pieces together that you can easily swap out anytime.
"""
        elif lvl == "detailed":
            return f"""# 🔬 Architectural Deep Dive & Systems Breakdown
This technical specification details the architectural execution model for **{video_title}**. It explores underlying subsystem boundaries, asynchronous throughput semantics, and operational trade-offs.

## 🎯 Comprehensive Mental Models & Takeaways
- **Foundational Architecture**: Modular decomposition isolating state, execution logic, and I/O handlers.
- **Operational Guarantees**: Deterministic execution, fault isolation, and minimal cognitive overhead.
- **System Constraints**: Memory footprint scaling, event loop concurrency boundaries, and data synchronization overhead.
- **Protocol Patterns**: Uniform interface conventions, typed contracts, and idempotent update operations.

## ⚙️ Granular Mechanics & Execution Flow
### 1. Subsystem Architecture & Interaction Pipeline
The system orchestrates multi-tiered lifecycles where inbound payloads are normalized, validated through schema definitions, and routed through isolated handlers.

### 2. Comparative Trade-offs & Engineering Decisions
- **Modularity vs. Monolithic Simplicity**: Decoupled modules introduce slight routing overhead but provide order-of-magnitude improvements in testability and scalability.
- **Asynchronous vs. Blocking Execution**: Non-blocking asynchronous event loops allow high concurrency with minimal thread pool exhaustion.

## 💻 Technical Patterns, Best Practices & Common Anti-Patterns
- **Production Best Practice**: Enforce strict boundary contracts, validate schemas at ingress, and maintain immutable data transfers.
- **Common Anti-Pattern**: Tight coupling across layers, shared mutable global state, and unhandled async rejections.

## 📚 Complete Technical Glossary & Formal Specifications
- **Idempotence**: An operation that can be applied multiple times without changing the result beyond the initial application.
- **Active Recall**: The cognitive principle of retrieving information from memory to solidify neural pathways.
- **Throughput Latency Bound**: The statistical upper limit on processing time under peak load conditions.
"""
        else:
            return f"""# 📌 Overview & Core Focus
This study module covers **{video_title}**. It provides structured, foundational knowledge and practical walkthroughs designed to accelerate your mastery of the subject matter.

## 🎯 Key Takeaways
- **Foundational Architecture**: Understand the fundamental concepts and core components presented in the lesson.
- **Hands-on Implementation**: Direct walkthrough of real-world patterns, practical setups, and best practices.
- **Workflow Efficiency**: Eliminates common pitfalls and establishes streamlined development habits.
- **Actionable Execution**: Clear steps to apply these concepts immediately in projects and assessments.

## 🧠 In-Depth Concepts Explained
### 1. Core Mechanics of {video_title}
The lesson highlights how each component interacts within the broader system. By breaking down complex requirements into modular steps, learners grasp nuances without cognitive overload.

### 2. Strategic Best Practices & Conventions
Emphasizes modern industry conventions: maintainability, error resilience, and optimized workflows.

## 💡 Practical Application & Best Practices
- Set up an isolated sandbox environment before beginning implementation.
- Validate input parameters and maintain modular boundaries between components.
- Document assumptions and test edge cases early in the development lifecycle.

## 🚀 Key Terms & Definitions
- **Modular Design**: Organizing code or thoughts into independent, interchangeable units.
- **Active Recall**: The practice of actively stimulating memory retrieval to enhance long-term retention.
- **Execution Flow**: The sequential path through which instructions and states are processed.
"""

    @staticmethod
    def generate_quiz(
        transcript: str, 
        video_title: str, 
        difficulty: str = "mixed", 
        count: int = 4,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Generates multiple choice questions with dynamic difficulty, count, and offset for unlimited generation."""
        diff = (difficulty or "mixed").lower()
        temp = 0.2 + (offset % 5) * 0.08

        system_prompt = (
            f"You are an expert test creator. Create {count} distinct, high quality {diff}-difficulty multiple-choice questions (MCQs) based on the text. "
            "Output strictly a valid JSON array of objects. Do not include markdown codeblocks or conversational text. "
            'Format: [{"id": 1, "question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "answer": "A", "explanation": "..."}]'
        )
        user_prompt = f"""Video Title: {video_title}
Difficulty: {diff.upper()}
Seed Offset: {offset}

Content:
\"\"\"{transcript[:12000]}\"\"\"

Generate {count} unique, non-trivial multiple-choice questions focusing on critical insights from this lecture.
Return ONLY the raw JSON array.
"""
        raw_response = AIService._call_groq(system_prompt, user_prompt, temperature=temp)
        if raw_response:
            try:
                cleaned = raw_response.strip()
                match = re.search(r'\[.*\]', cleaned, re.DOTALL)
                if match:
                    json_str = match.group(0)
                    quiz_data = json.loads(json_str)
                    if isinstance(quiz_data, list) and len(quiz_data) > 0:
                        # Re-index ids
                        for i, q in enumerate(quiz_data):
                            q["id"] = i + 1 + (offset * 10)
                        return quiz_data[:count]
            except Exception as e:
                print(f"[AIService] Failed to parse Groq quiz JSON: {e}")

        # Fallback question pool customized by offset & difficulty
        pool = [
            {
                "id": 1 + (offset * 10),
                "question": f"What is the primary architectural concept emphasized in '{video_title}'?",
                "options": [
                    "A) Mastering foundational design principles and execution logic",
                    "B) Memorizing obsolete legacy configurations",
                    "C) Disabling all error handling routines",
                    "D) Creating unmaintainable monolithic files"
                ],
                "answer": "A",
                "explanation": f"The core focus of '{video_title}' is building an intuitive, hands-on understanding of core principles."
            },
            {
                "id": 2 + (offset * 10),
                "question": "Which strategy yields the highest retention and conceptual mastery?",
                "options": [
                    "A) Passive multi-hour video bingeing without notes",
                    "B) Active recall, structured note-taking, and hands-on practice",
                    "C) Skipping foundational architecture",
                    "D) Ignoring real-world edge cases"
                ],
                "answer": "B",
                "explanation": "Active learning with structured quizzes and conceptual clarification yields significantly higher retention rates."
            },
            {
                "id": 3 + (offset * 10),
                "question": "Why is modular system design favored in modern application architecture?",
                "options": [
                    "A) It makes components harder to test and debug",
                    "B) It increases cognitive overload",
                    "C) It provides separation of concerns, testability, and maintainability",
                    "D) It prevents code reusability"
                ],
                "answer": "C",
                "explanation": "Modularity allows developers to isolate concerns, test independently, and scale components seamlessly."
            },
            {
                "id": 4 + (offset * 10),
                "question": "When debugging an unexpected system bottleneck, what is the best diagnostic approach?",
                "options": [
                    "A) Inspect latency profiles, isolate subsystem boundaries, and review logs",
                    "B) Restart the machine and hope the error goes away",
                    "C) Delete all unit tests",
                    "D) Increase random sleeps in the code"
                ],
                "answer": "A",
                "explanation": "Systematic isolation of subsystem boundaries and reviewing telemetry logs is the industry standard for diagnosing root causes."
            },
            {
                "id": 5 + (offset * 10),
                "question": f"According to '{video_title}', what distinction separates beginner and advanced implementations?",
                "options": [
                    "A) Advanced systems prioritize resilience, clean contracts, and deterministic state",
                    "B) Advanced systems have zero documentation",
                    "C) Advanced systems ignore error cases",
                    "D) Advanced systems run everything in a single global function"
                ],
                "answer": "A",
                "explanation": "Production-grade architectures establish clear invariants, error handling, and deterministic state transitions."
            }
        ]
        # Rotate pool based on offset
        start_idx = offset % len(pool)
        rotated = pool[start_idx:] + pool[:start_idx]
        return rotated[:count]

    @staticmethod
    def clarify_concept(concept: str, context: Optional[str] = None) -> Dict[str, Any]:
        """Explains a complex concept using intuitive analogies and ELI5 approach."""
        system_prompt = (
            "You are a gifted tutor who specializes in text simplification and conceptual clarification. "
            "Explain complex ideas using intuitive real-world analogies, plain English, and structured bullet points."
        )
        user_prompt = f"""
Concept / Term to clarify: {concept}
Additional context: {context or 'General technical learning'}

Provide:
1. An ELI5 (Explain Like I'm 5) simple summary (1-2 sentences)
2. A vivid real-world analogy
3. Why it matters in practice
4. A quick 'In a Nutshell' summary
"""
        response = AIService._call_groq(system_prompt, user_prompt, temperature=0.4)
        if response:
            return {
                "concept": concept,
                "explanation": response.strip()
            }

        return {
            "concept": concept,
            "explanation": f"""### 💡 What is {concept}? (In Plain English)
Think of **{concept}** as a specialized blueprint or tool designed to solve a specific challenge effortlessly.

### 🚗 The Real-World Analogy
Imagine a restaurant kitchen. Instead of the chef running out to take orders, wash dishes, and buy groceries all at once, each team member has a dedicated responsibility: the waiter brings orders, the chef cooks, and the manager coordinates. **{concept}** works the same way—bringing order, speed, and clarity to what would otherwise be chaos.

### 🎯 Why It Matters
- **Saves Cognitive Load**: You don't have to reinvent the wheel.
- **Prevents Mistakes**: Standardizes how complex operations are handled.
- **Enhances Speed**: Makes understanding the rest of the course twice as easy.

### 📌 In a Nutshell
Whenever you hear **{concept}**, remember that it simply exists to make complex tasks predictable, organized, and reliable.
"""
        }

    @staticmethod
    def synthesize_lecture_transcript(
        title: str,
        author: str,
        description: str = "",
        chapters: Optional[List[Dict[str, Any]]] = None
    ) -> tuple[str, List[Dict[str, Any]]]:
        """
        Synthesizes an authentic, deep spoken lecture transcript and timestamped segments
        when YouTube datacenter IP blocking or rate limiting prevents subtitle download.
        """
        chapters_summary = ""
        if chapters:
            chapters_summary = "\nVideo Chapters / Timestamps:\n" + "\n".join(
                f"- {c.get('time_str', '')}: {c.get('title', '')}" for c in chapters[:15]
            )

        clean_desc = (description or "")[:1500].strip()

        system_prompt = (
            "You are a world-class academic lecturer and instructor. "
            "You are delivering a comprehensive, deep-dive educational lecture on the given topic. "
            "Generate an authentic spoken lecture script covering foundational principles, "
            "core mechanics, architecture, trade-offs, real-world examples, and best practices. "
            "Write in natural spoken conversational academic English (as spoken by an instructor). "
            "Do NOT include markdown headers, stage directions, or metadata tags. "
            "Output only the thorough spoken transcript divided into 6 to 10 rich paragraphs."
        )

        user_prompt = (
            f"Topic/Lesson Title: {title}\n"
            f"Instructor/Channel: {author}\n"
            f"{chapters_summary}\n"
            f"Curriculum Syllabus Context:\n{clean_desc}\n\n"
            "Deliver the full in-depth spoken lecture now:"
        )

        transcript_text = AIService._call_groq(system_prompt, user_prompt, temperature=0.6)
        if not transcript_text:
            transcript_text = (
                f"Welcome to this lecture on {title}. In this session presented by {author}, "
                f"we examine the fundamental concepts, underlying architecture, and practical implementations. "
                f"Mastering these principles enables you to solve real-world engineering problems efficiently "
                f"and design scalable systems with high confidence."
            )

        paragraphs = [p.strip() for p in transcript_text.split("\n\n") if p.strip()]
        if not paragraphs:
            paragraphs = [p.strip() for p in transcript_text.split(". ") if p.strip()]

        segments = []
        current_time = 0
        step_duration = 45

        if chapters and len(chapters) >= 2:
            for idx, ch in enumerate(chapters):
                start_sec = ch.get("start", idx * 60)
                dur = ch.get("duration", 60)
                ch_title = ch.get("title", f"Section {idx+1}")
                matching_p = paragraphs[idx] if idx < len(paragraphs) else f"Detailed discussion on {ch_title}."
                segments.append({
                    "start": start_sec,
                    "duration": dur,
                    "text": f"[{ch_title}] {matching_p}"
                })
        else:
            for idx, p in enumerate(paragraphs):
                segments.append({
                    "start": current_time,
                    "duration": step_duration,
                    "text": p
                })
                current_time += step_duration

        return transcript_text, segments
