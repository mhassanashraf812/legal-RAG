# 🌐 Using the PPC RAG API in Another Project

This project exposes a **public search API** that any other Next.js (or any) project can call.

---

## API Endpoint

```
POST http://localhost:3000/api/search
```

> When deployed, replace `localhost:3000` with your production URL.

---

## Request Format

```json
{
  "query": "What is the punishment for theft in Pakistan?"
}
```

**Headers:**
```
Content-Type: application/json
x-api-key: ppc-secret-key-2026
```

---

## How to Call from Another Next.js Project

### Option 1: Simple fetch (non-streaming)
```javascript
const response = await fetch('http://localhost:3000/api/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'ppc-secret-key-2026',
  },
  body: JSON.stringify({ query: 'What is Section 302?' }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();
let result = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  result += decoder.decode(value);
}

console.log(result);
```

### Option 2: Using Vercel AI SDK `useChat` hook (streaming)
```tsx
// In your OTHER project's page.tsx
import { useChat } from '@ai-sdk/react';

export default function MyPage() {
  const { messages, sendMessage } = useChat({
    api: 'http://localhost:3000/api/search',
    headers: { 'x-api-key': 'ppc-secret-key-2026' },
  });

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>{m.parts?.[0]?.text}</div>
      ))}
      <button onClick={() => sendMessage({ text: 'What is Section 302?' })}>
        Ask
      </button>
    </div>
  );
}
```

---

## Re-ingesting the PDF (if you update the book)

Run this command once whenever you get a new version of the PDF:
```bash
node scripts/ingest-pdf.cjs
```

This will regenerate `src/data/ppc-chunks.json` with fresh data.

---

## Summary of Files

| File | Purpose |
| :--- | :--- |
| `scripts/ingest-pdf.cjs` | One-time script to convert PDF → JSON chunks |
| `src/data/ppc-chunks.json` | The processed knowledge base (318 chunks) |
| `src/lib/ppc-search.ts` | Search utility using Fuse.js |
| `src/app/api/search/route.ts` | **Public API** for other projects |
| `src/app/api/chat/route.ts` | Internal chat API for this project's UI |
| `.env.local` | API keys (`GROQ_API_KEY`, `SEARCH_API_KEY`) |
