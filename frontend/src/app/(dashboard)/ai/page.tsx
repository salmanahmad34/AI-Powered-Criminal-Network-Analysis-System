'use client';

import React, { useState, useEffect, useRef } from 'react';
import CrimeGraphLogo from '@/components/CrimeGraphLogo';
import CrimeGraphLoader from '@/components/CrimeGraphLoader';

interface CaseItem {
  id: string;
  caseNumber: string;
  title: string;
}

interface SourceReference {
  type: string;
  id: string;
  label: string;
}

interface Message {
  id: string;
  sender: 'USER' | 'AI';
  text: string;
  time: string;
  sources?: SourceReference[];
  confidence?: number;
  provider?: string;
  error?: boolean;
}

export default function AIAssistantPage() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [loadingCases, setLoadingCases] = useState<boolean>(true);
  const [inputQuery, setInputQuery] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'AI',
      text: 'Welcome to CrimeGraph AI Assistant. Select an active investigation case envelope above to query evidence-grounded intelligence.',
      time: 'Just now',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchCases() {
      try {
        const res = await fetch('/api/cases');
        if (res.ok) {
          const data = await res.json();
          const fetchedCases: CaseItem[] = data.cases || [];
          setCases(fetchedCases);
          if (fetchedCases.length > 0) {
            setSelectedCaseId(fetchedCases[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch cases for AI Assistant context', err);
      } finally {
        setLoadingCases(false);
      }
    }
    fetchCases();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loadingChat]);

  const handleSend = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const queryText = customQuery || inputQuery;
    if (!queryText.trim() || loadingChat) return;

    if (!selectedCaseId) {
      alert('Please select an active case envelope before submitting your query.');
      return;
    }

    const userMsgId = `usr-${Date.now()}`;
    const newMsg: Message = {
      id: userMsgId,
      sender: 'USER',
      text: queryText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMsg]);
    if (!customQuery) setInputQuery('');
    setLoadingChat(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: queryText.trim(), caseId: selectedCaseId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate AI chat response.');
      }

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'AI',
        text: data.answer || 'No response generated.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: data.sources || [],
        confidence: data.confidence,
        provider: data.provider,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        sender: 'AI',
        text: `Error processing query: ${(err as Error).message}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoadingChat(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'AI',
        text: 'Welcome to CrimeGraph AI Assistant. Select an active investigation case envelope above to query evidence-grounded intelligence.',
        time: 'Just now',
      },
    ]);
  };

  const handleRetryLast = () => {
    const lastUserMsg = [...messages].reverse().find((m) => m.sender === 'USER');
    if (lastUserMsg) {
      handleSend(undefined, lastUserMsg.text);
    }
  };

  const selectedCase = cases.find((c) => c.id === selectedCaseId);

  return (
    <div className="space-y-6 max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col pb-6">
      {/* Header & Case Selector */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
            AI Intelligence Assistant
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Query evidence-grounded intelligence across cases, documents, entities, and network links.
          </p>
        </div>

        {/* Case Selector Dropdown */}
        <div className="flex items-center gap-2">
          {loadingCases ? (
            <div className="text-xs text-zinc-400 animate-pulse">Loading cases…</div>
          ) : cases.length === 0 ? (
            <span className="text-xs text-zinc-500 font-medium">No cases accessible</span>
          ) : (
            <div className="flex items-center gap-2">
              <label htmlFor="ai-case-selector" className="text-xs font-semibold text-zinc-700 whitespace-nowrap">
                Context Envelope:
              </label>
              <select
                id="ai-case-selector"
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="form-input text-xs py-1.5 px-3 font-mono font-medium max-w-[240px]"
              >
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.caseNumber} — {c.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={handleClear}
            className="btn-secondary text-[11px] py-1.5 px-2.5 whitespace-nowrap"
            title="Clear conversation log"
          >
            Clear Chat
          </button>
        </div>
      </div>

      {/* Main Chat Interface Container */}
      <div className="flex-1 card flex flex-col overflow-hidden min-h-0">
        {/* Active Context Banner */}
        {selectedCase && (
          <div className="px-4 py-2 bg-zinc-50 border-b border-[var(--border)] flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-2 text-zinc-600">
              <CrimeGraphLogo size={14} showText={false} />
              <span>Grounded Evidence Scope:</span>
              <span className="font-mono font-semibold text-black">{selectedCase.caseNumber}</span>
              <span className="text-zinc-400">({selectedCase.title})</span>
            </div>
            <span className="badge badge-success text-[10px]">REAL-TIME RAG ACTIVE</span>
          </div>
        )}

        {/* Messages Feed */}
        <div className="flex-1 p-5 space-y-4 overflow-y-auto">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.sender === 'USER' ? 'justify-end' : 'justify-start'}`}>
              {msg.sender === 'AI' && (
                <div className="w-7 h-7 rounded bg-black flex items-center justify-center shrink-0 text-white font-mono text-[10px]">
                  AI
                </div>
              )}

              <div
                className={`p-4 rounded-lg max-w-[90%] sm:max-w-xl text-xs leading-relaxed ${
                  msg.sender === 'USER'
                    ? 'bg-black text-white'
                    : msg.error
                    ? 'bg-red-50 border border-red-200 text-red-800'
                    : 'bg-zinc-50 border border-zinc-200 text-black'
                }`}
              >
                {/* Formatted Text Content */}
                <div className="whitespace-pre-wrap break-words">{msg.text}</div>

                {/* Evidence Sources Badges */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-zinc-200 space-y-1.5">
                    <span className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                      Grounding Evidence & Provenance:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.sources.map((src, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-200 text-zinc-800 border border-zinc-300"
                        >
                          <span className="font-bold text-zinc-500">[{src.type}]</span>
                          {src.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer Metadata */}
                <div className="mt-2.5 flex items-center justify-between text-[9px] font-mono text-zinc-400 pt-1">
                  <span>{msg.time}</span>
                  {msg.provider && (
                    <span className="capitalize">
                      Provider: <strong className="text-zinc-600">{msg.provider}</strong>
                    </span>
                  )}
                  {msg.confidence !== undefined && (
                    <span className="text-emerald-600 font-semibold">
                      {(msg.confidence * 100).toFixed(0)}% Grounded
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {loadingChat && (
            <div className="flex gap-3 justify-start items-center p-3">
              <div className="w-7 h-7 rounded bg-black flex items-center justify-center shrink-0 text-white font-mono text-[10px]">
                AI
              </div>
              <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-lg flex items-center gap-2">
                <CrimeGraphLoader size={20} text="Retrieving case evidence & querying AI model…" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Form Panel */}
        <form onSubmit={handleSend} className="p-3 border-t border-zinc-100 bg-zinc-50 shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              id="ai-chat-input"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder={selectedCase ? `Ask about ${selectedCase.caseNumber} evidence, suspects, or links…` : 'Select a case to query AI model…'}
              disabled={loadingChat || !selectedCaseId}
              className="form-input text-xs flex-1 min-w-0 disabled:opacity-50"
            />

            {messages.some((m) => m.error) && (
              <button
                type="button"
                onClick={handleRetryLast}
                disabled={loadingChat}
                className="btn-secondary text-xs px-3 py-2 shrink-0 text-red-600 border-red-200 hover:bg-red-50"
              >
                Retry
              </button>
            )}

            <button
              type="submit"
              disabled={loadingChat || !inputQuery.trim() || !selectedCaseId}
              className="btn-primary text-xs px-4 py-2 shrink-0 disabled:opacity-50 flex items-center gap-2"
            >
              {loadingChat ? (
                <>
                  <CrimeGraphLogo size={12} showText={false} className="animate-crimegraph-pulse" />
                  <span>Querying…</span>
                </>
              ) : (
                <span>Query LLM</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
