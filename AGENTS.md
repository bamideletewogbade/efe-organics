<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes. APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# System Architecture & Technical Communication Standards

Whenever discussing products, tech stack architecture, or engineering decisions:
1. **Database Choice & Rationale**: Evaluate 3–4 database options (e.g. Postgres vs Redis vs MongoDB vs DynamoDB) and explain why the specific database was selected.
2. **Scaling & AI Latency Analysis**: Detail prompt token budgets, context grounding overhead, model execution latencies (ms), edge caching, and concurrency.
3. **Architectural Visual Diagrams**: Use GitHub Flavored Markdown `mermaid` diagrams to visualize system flows, data topologies, and payment/AI sequences.
4. **Real-World Business Context**: Ground technical examples in real business scenarios (e.g. West Africa / Accra MoMo traffic surges, 250kg bulk soap order throughput).
5. **Persistent Memory**: Maintain and update this document to guide future agent interactions.

