'use client';

import { useChat } from '@ai-sdk/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Scale, Shield, BookOpen, MessageSquare, Plus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useState, useRef, useEffect } from 'react';
import { isLegalTopicQuestion, OFF_TOPIC_MESSAGE } from '@/lib/legal-topic-guard';
import { cn } from '@/lib/utils';

const SIDEBAR_WIDTH_PX = 260;

export default function LegalRAG() {
  const { messages = [], setMessages, status, sendMessage } = useChat();
  const [input, setInput] = useState('');

  const isLoading = status === 'submitted' || status === 'streaming';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const appendOffTopicReply = (userText: string) => {
    const userId = crypto.randomUUID();
    const assistantId = crypto.randomUUID();
    setMessages([
      ...messages,
      { id: userId, role: 'user', parts: [{ type: 'text', text: userText }] },
      { id: assistantId, role: 'assistant', parts: [{ type: 'text', text: OFF_TOPIC_MESSAGE }] },
    ]);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const currentInput = input.trim();
    setInput('');

    if (!isLegalTopicQuestion(currentInput)) {
      appendOffTopicReply(currentInput);
      return;
    }

    try {
      await sendMessage({ text: currentInput });
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const clearChat = () => setMessages([]);

  return (
    <div className="flex h-screen bg-[#020617] text-slate-200 overflow-hidden font-sans">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -SIDEBAR_WIDTH_PX }}
        animate={{ x: isSidebarOpen ? 0 : -SIDEBAR_WIDTH_PX }}
        className={cn(
          "fixed md:relative z-20 shrink-0 h-full bg-[#0f172a] border-r border-slate-800 flex flex-col transition-all duration-300",
          isSidebarOpen ? "w-[260px]" : "w-[260px] md:w-0 md:overflow-hidden md:border-r-0"
        )}
      >
        <div className="px-4 py-5 border-b border-slate-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/justelligence-logo.png?v=2"
            alt="Justelligence"
            className="h-10 w-full object-contain object-left"
          />
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-2 pl-0.5">
            Legal AI RAG
          </p>
        </div>

        <div className="flex-1 px-3 py-4 flex flex-col gap-2 overflow-y-auto">
          <button
            onClick={clearChat}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white transition-all group"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
            <span className="font-medium text-sm">New Consultation</span>
          </button>

          <div className="mt-8">
            <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">Knowledge Base</p>
            <div className="flex flex-col gap-1">
              <KnowledgeItem icon={<BookOpen className="w-4 h-4" />} title="Case Law Archive" active />
              <KnowledgeItem icon={<Shield className="w-4 h-4" />} title="Statutory Provisions" />
              <KnowledgeItem icon={<MessageSquare className="w-4 h-4" />} title="Legal Precedents" />
            </div>
          </div>
        </div>

        <div className="px-3 py-4 border-t border-slate-800">
          <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-900/50 border border-slate-800">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
              <img src="https://ui-avatars.com/api/?name=Law+Expert&background=1e293b&color=fff" alt="User" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold text-white truncate">Advocate Pro</p>
              <p className="text-[10px] text-slate-500 truncate">Premium Member</p>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#020617] to-[#020617]">
        {/* Header */}
        <header className="h-20 border-b border-slate-800/50 flex items-center justify-between px-8 backdrop-blur-md bg-slate-900/10 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400"
            >
              <Plus className={cn("w-5 h-5 transition-transform", isSidebarOpen ? "rotate-45" : "rotate-0")} />
            </button>
            <div className="h-4 w-[1px] bg-slate-800" />
            <h2 className="text-sm font-semibold text-slate-400 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-500" />
              Pakistan Legal Intelligence
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-400 uppercase tracking-widest animate-pulse">
              System Live
            </div>
          </div>
        </header>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 md:p-12 space-y-8 scroll-smooth"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-3xl mx-auto">
              <div className="w-full max-w-2xl mb-10 px-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/justelligence-logo.png?v=2"
                  alt="Justelligence — Pakistan Legal Intelligence"
                  className="w-full h-auto object-contain"
                />
              </div>
              <h3 className="text-3xl font-bold text-white mb-4 tracking-tight">How can I assist your legal research?</h3>
              <p className="text-slate-400 leading-relaxed text-lg mb-4">
                Access a specialized RAG-powered intelligence system trained on Pakistani case law, civil servant regulations, and supreme court judgments.
              </p>
              <p className="text-slate-500 text-sm mb-10 max-w-xl">
                I answer <span className="text-blue-400 font-medium">law, court, and legal</span> questions only. Off-topic questions are not processed.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                <SuggestionCard
                  title="Service Law Inquiry"
                  desc="What are the criteria for induction into the Secretariat Group?"
                  onClick={() => setInput('What are the criteria for induction into the Secretariat Group?')}
                />
                <SuggestionCard
                  title="Jurisdictional Check"
                  desc="Does the High Court have jurisdiction over service matters under Article 212?"
                  onClick={() => setInput('Does the High Court have jurisdiction over service matters under Article 212?')}
                />
              </div>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((m, i) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex w-full",
                    m.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  <div className={cn(
                    "relative group max-w-[85%] md:max-w-[70%]",
                    m.role === 'user' ? "flex flex-col items-end" : "flex gap-4"
                  )}>
                    {m.role !== 'user' && (
                      <div className="w-8 h-8 rounded-lg bg-blue-600 flex-shrink-0 flex items-center justify-center mt-1">
                        <Scale className="w-4 h-4 text-white" />
                      </div>
                    )}

                    <div className={cn(
                      "px-6 py-4 rounded-3xl text-sm leading-relaxed",
                      m.role === 'user'
                        ? "bg-blue-600 text-white shadow-xl shadow-blue-600/20"
                        : "bg-slate-800/50 border border-slate-700/50 text-slate-200 backdrop-blur-sm"
                    )}>
                      <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-800">
                        <ReactMarkdown>
                          {(m.parts || [])
                            .filter(part => part.type === 'text')
                            .map(part => (part as any).text)
                            .join('') || (m as any).content || ''}
                        </ReactMarkdown>
                      </div>

                      {m.role === 'user' && (
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2 mr-2">You</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex-shrink-0 flex items-center justify-center mt-1 animate-pulse">
                    <Scale className="w-4 h-4 text-white" />
                  </div>
                  <div className="px-6 py-4 rounded-3xl bg-slate-800/50 border border-slate-700/50 text-slate-400 flex items-center gap-2">
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce"></span>
                    </span>
                    <span className="text-xs font-medium italic">Analyzing knowledge base...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Input Area */}
        <div className="p-6 md:p-10 bg-gradient-to-t from-[#020617] via-[#020617] to-transparent">
          <form
            onSubmit={handleSubmit}
            className="max-w-4xl mx-auto relative group"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2rem] blur opacity-25 group-focus-within:opacity-50 transition duration-1000 group-focus-within:duration-200"></div>
            <div className="relative flex items-center bg-slate-900 border border-slate-800 rounded-[1.8rem] p-2 pr-4 shadow-2xl">
              <input
                value={input}
                onChange={handleInputChange}
                placeholder="Ask about Pakistani law, cases, or service regulations..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-white px-6 py-3 placeholder:text-slate-500 text-sm"
              />
              <button
                type="submit"
                disabled={isLoading || !input || !input.trim()}
                className="w-12 h-12 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 flex items-center justify-center transition-all shadow-lg shadow-blue-600/20 group/btn"
              >
                <Send className="w-5 h-5 text-white group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
              </button>
            </div>
            <p className="text-[10px] text-center mt-4 text-slate-600 font-medium uppercase tracking-widest">
              Powered by Llama 3.3 & RAG
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}

function KnowledgeItem({ icon, title, active = false }: { icon: React.ReactNode, title: string, active?: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all cursor-pointer group",
      active ? "bg-blue-600/10 text-blue-400" : "text-slate-500 hover:bg-slate-800/50 hover:text-slate-300"
    )}>
      <div className={cn(
        "p-1.5 rounded-lg transition-colors",
        active ? "bg-blue-600/20 text-blue-400" : "bg-slate-800 text-slate-500 group-hover:bg-slate-700"
      )}>
        {icon}
      </div>
      <span className="text-xs font-semibold">{title}</span>
    </div>
  );
}

function SuggestionCard({ title, desc, onClick }: { title: string, desc: string, onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="p-6 rounded-[2rem] bg-slate-900/50 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800/80 transition-all cursor-pointer text-left group"
    >
      <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
        <Scale className="w-3.5 h-3.5 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        {title}
      </h4>
      <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
    </div>
  );
}
