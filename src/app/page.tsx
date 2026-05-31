'use client';

import { useChat } from '@ai-sdk/react';
import { ChevronDown, RotateCcw, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useCallback, useEffect, useRef, useState } from 'react';
import { isLegalTopicQuestion, OFF_TOPIC_MESSAGE } from '@/lib/legal-topic-guard';
import { extractCitationBadges } from '@/lib/ppc-sources';
import { cn } from '@/lib/utils';
import type { PpcSource } from '@/types/ppc';

const FEATURE_CARDS = [
  {
    title: 'Retrieve Relevant PPC Sections',
    description:
      'Semantic search over the Pakistan Penal Code corpus to surface passages related to your query.',
  },
  {
    title: 'Verify Legal Citations',
    description:
      'Section numbers and page references are tied to retrieved text to reduce citation hallucinations.',
  },
  {
    title: 'Generate Grounded Responses',
    description:
      'The language model answers only from retrieved PPC context, with explicit source attribution.',
  },
];

const EXAMPLE_QUESTIONS = [
  'What is the punishment under Section 302 PPC?',
  'Explain theft under Section 378 PPC.',
  'What constitutes qatl-i-amd?',
];

export default function JustelligencePage() {
  const pendingSources = useRef<PpcSource[]>([]);
  const [sourcesByMessageId, setSourcesByMessageId] = useState<Record<string, PpcSource[]>>({});
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages = [], setMessages, status, sendMessage } = useChat({
    onData: (part) => {
      if (part.type === 'data-sources' && Array.isArray(part.data)) {
        pendingSources.current = part.data as PpcSource[];
      }
    },
    onFinish: ({ message }) => {
      if (message.role === 'assistant' && pendingSources.current.length > 0) {
        setSourcesByMessageId((prev) => ({
          ...prev,
          [message.id]: pendingSources.current,
        }));
        pendingSources.current = [];
      }
    },
  });

  const isLoading = status === 'submitted' || status === 'streaming';
  const hasChat = messages.length > 0;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  const submitQuery = useCallback(
    async (text: string) => {
      const query = text.trim();
      if (!query || isLoading) return;

      if (!isLegalTopicQuestion(query)) {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: 'user', parts: [{ type: 'text', text: query }] },
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            parts: [{ type: 'text', text: OFF_TOPIC_MESSAGE }],
          },
        ]);
        return;
      }

      await sendMessage({ text: query });
    },
    [isLoading, sendMessage, setMessages]
  );

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const query = input.trim();
    if (!query) return;
    setInput('');
    await submitQuery(query);
  };

  const clearSession = () => {
    setMessages([]);
    setSourcesByMessageId({});
    pendingSources.current = [];
  };

  const messageText = (m: (typeof messages)[0]) =>
    (m.parts || [])
      .filter((part) => part.type === 'text')
      .map((part) => ('text' in part ? part.text : ''))
      .join('') || '';

  return (
    <div className="flex h-dvh flex-col bg-[#F8FAFC] text-[#0B1220]">
      <header className="glass-bar shrink-0 border-b border-slate-200/80">
        <div className="relative mx-auto flex h-14 max-w-3xl items-center justify-center px-4 sm:px-6">
          <BrandWordmark />
          {hasChat && (
            <button
              type="button"
              onClick={clearSession}
              className="absolute right-4 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 sm:right-6"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              New session
            </button>
          )}
        </div>
      </header>

      <div ref={scrollRef} className="scroll-area flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
          {!hasChat ? (
            <div className="animate-fade-in py-10 sm:py-14">
              <section className="mx-auto max-w-2xl text-center">
                <p className="mb-5 inline-flex rounded-full border border-[#3B82F6]/25 bg-white px-3 py-1 text-[11px] font-medium tracking-wide text-[#3B82F6]">
                  Retrieval-Augmented Generation (RAG)
                </p>

                <h1 className="text-2xl font-semibold leading-snug tracking-tight text-[#0B1220] sm:text-[1.75rem] sm:leading-tight">
                  Citation-Grounded Legal AI for the Pakistan Penal Code
                </h1>

                <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-slate-600 sm:text-[15px]">
                  A research prototype designed to reduce citation hallucinations through
                  retrieval-based grounding and citation verification.
                </p>

                <form onSubmit={handleSubmit} className="mt-8">
                  <div className="research-input flex flex-col rounded-2xl border border-slate-200 bg-white p-2 transition-shadow sm:p-2.5">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmit();
                        }
                      }}
                      rows={2}
                      placeholder="Ask a question about the Pakistan Penal Code…"
                      className="min-h-[52px] resize-none bg-transparent px-3 py-2.5 text-sm text-[#0B1220] placeholder:text-slate-400 focus:outline-none sm:text-[15px]"
                    />
                    <div className="flex justify-end px-1 pb-1">
                      <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3B82F6] text-white transition-colors hover:bg-[#2563eb] disabled:opacity-40"
                        aria-label="Send"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </form>
              </section>

              <section className="mt-14 grid gap-4 sm:grid-cols-3">
                {FEATURE_CARDS.map((card) => (
                  <div key={card.title} className="research-card rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-[#0B1220]">{card.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-500">{card.description}</p>
                  </div>
                ))}
              </section>

              <section className="mt-12 border-t border-slate-200/80 pt-10">
                <p className="mb-4 text-center text-xs font-medium uppercase tracking-wider text-slate-400">
                  Example questions
                </p>
                <div className="flex flex-col gap-2">
                  {EXAMPLE_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => {
                        setInput(q);
                        void submitQuery(q);
                      }}
                      className="research-card rounded-xl px-4 py-3 text-left text-sm text-slate-600 transition-colors hover:border-[#3B82F6]/30 hover:text-[#0B1220]"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <ul className="space-y-8 py-6 sm:py-8">
              {messages.map((m) => (
                <li key={m.id} className="animate-fade-in">
                  {m.role === 'user' ? (
                    <div className="flex justify-end">
                      <div className="max-w-[90%] rounded-2xl rounded-tr-sm bg-[#0B1220] px-4 py-3 text-sm leading-relaxed text-white sm:max-w-[85%]">
                        {messageText(m)}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sourcesByMessageId[m.id]?.length > 0 && (
                        <RetrievedSourcesPanel sources={sourcesByMessageId[m.id]} />
                      )}

                      {(() => {
                        const text = messageText(m);
                        const badges = extractCitationBadges(text);
                        return badges.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {badges.map((b) => (
                              <span
                                key={`${m.id}-${b}`}
                                className="rounded-md border border-[#3B82F6]/20 bg-[#3B82F6]/8 px-2 py-0.5 text-[11px] font-medium text-[#3B82F6]"
                              >
                                {b}
                              </span>
                            ))}
                          </div>
                        ) : null;
                      })()}

                      <div className="research-card max-w-full rounded-2xl rounded-tl-sm px-4 py-4 sm:max-w-[95%]">
                        <div className="prose prose-sm max-w-none text-slate-700 prose-headings:text-[#0B1220] prose-strong:text-[#0B1220] prose-blockquote:border-[#3B82F6]/30">
                          <ReactMarkdown>{messageText(m)}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              ))}

              {isLoading && (
                <li className="animate-fade-in space-y-3">
                  <div className="research-card inline-flex items-center gap-2.5 rounded-2xl px-4 py-3">
                    <span className="flex gap-1">
                      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[#3B82F6]" />
                      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[#3B82F6]" />
                      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[#3B82F6]" />
                    </span>
                    <span className="text-sm text-slate-500">Retrieving PPC sections…</span>
                  </div>
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      {hasChat && (
        <footer className="glass-bar shrink-0 border-t border-slate-200/80 pb-[env(safe-area-inset-bottom)]">
          <form onSubmit={handleSubmit} className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
            <div className="research-input flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 transition-shadow">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                rows={1}
                placeholder="Ask about the Pakistan Penal Code…"
                className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2.5 text-sm focus:outline-none"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#3B82F6] text-white hover:bg-[#2563eb] disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2.5 text-center text-[11px] text-slate-400">
              Justelligence · RAG on the Pakistan Penal Code · citation-grounded responses
            </p>
          </form>
        </footer>
      )}
    </div>
  );
}

function RetrievedSourcesPanel({ sources }: { sources: PpcSource[] }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="research-card overflow-hidden rounded-xl">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-xs font-medium text-slate-600 hover:bg-slate-50/80"
      >
        <span>
          Retrieved PPC sections ({sources.length})
        </span>
        <ChevronDown
          className={cn('h-4 w-4 text-slate-400 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div className="space-y-2 border-t border-slate-100 px-3 pb-3 pt-1">
          {sources.map((s) => (
            <details
              key={s.id}
              className="group rounded-lg border border-slate-100 bg-[#F8FAFC] px-3 py-2"
            >
              <summary className="cursor-pointer list-none text-xs font-medium text-[#0B1220] [&::-webkit-details-marker]:hidden">
                <span className="inline-flex flex-wrap items-center gap-2">
                  {s.section && (
                    <span className="rounded bg-[#3B82F6]/10 px-1.5 py-0.5 text-[#3B82F6]">
                      {s.section}
                    </span>
                  )}
                  <span className="text-slate-500">Page ~{s.page}</span>
                  <ChevronDown className="inline h-3 w-3 text-slate-400 group-open:rotate-180" />
                </span>
              </summary>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">{s.excerpt}…</p>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

function BrandWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'bg-gradient-to-r from-[#0B1220] via-[#1d4ed8] to-[#3B82F6] bg-clip-text text-base font-bold uppercase tracking-[0.12em] text-transparent sm:text-lg',
        className
      )}
    >
      Justelligence
    </span>
  );
}
