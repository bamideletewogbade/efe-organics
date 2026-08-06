# Architectural & System Design Communication Standards

Whenever discussing products, system architecture, tech stacks, or engineering decisions, follow these core principles:

---

## 1. Database Choice & Rationale (With 3–4 Alternatives Evaluated)
Always explain database selection with a comparative analysis of 3 to 4 database options (e.g., PostgreSQL / Neon, Redis, MongoDB, DynamoDB) detailing:
- Why the chosen database is optimal for the specific business context.
- Schema flexibility, relational integrity, transaction guarantees (ACID), and query patterns.
- Trade-offs and why alternative choices were ruled out.

---

## 2. Scaling, Latency & Performance (Especially AI-Related Products)
Always analyze performance dynamics:
- **AI Latency**: Prompt token overhead, context grounding size, model execution times (ms), streaming vs non-streaming responses, and fallback chains.
- **Concurrency & Throughput**: Handling peak traffic surges, database connection pooling (e.g. serverless poolers like Neon / PgBouncer), and edge caching.
- **Geographic & Network Latency**: Real-world network constraints (e.g. West Africa / Accra latency to AWS US-East / EU regions).

---

## 3. Visual Architectural Diagrams (Mermaid.js)
Always include standard GitHub-flavored Markdown `mermaid` diagrams to simplify complex workflows, including:
- Data flow architecture.
- AI request & grounding sequences.
- Payment & webhook callback pipelines.
- Database entity-relationship or service topology.

---

## 4. Real-Life Contextual Examples
- Never talk in abstract hypothetical theory alone. Ground every technical example in real-world business scenarios (e.g., handling 1,000 simultaneous MTN MoMo checkout attempts during a cosmetic drop in Accra, or optimizing 1-second AI video prompt generation for salon stockists).

---

## 5. Continuous Knowledge & Memory Evolution
- Keep this memory reference updated as new patterns, capabilities, and system architectures evolve across the project lifecycle.
