'use client';

import React, { useState } from 'react';

interface Message {
  sender: string;
  text: string;
  suggestion?: string;
  time: string;
}

export default function AIAssistantPage() {
  const [inputQuery, setInputQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'AI',
      text: 'Welcome to CrimeGraph AI Assistant. How can I help you analyze the active data nodes today?',
      suggestion: 'Summarize link matches for Rohan Sharma',
      time: 'Just now',
    },
  ]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim()) return;

    const newMsg = {
      sender: 'USER',
      text: inputQuery,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [
      ...prev,
      newMsg,
      {
        sender: 'AI',
        text: `Analysis query received: "${inputQuery}". Processing against synthetic intelligence graph...`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    setInputQuery('');
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto h-[calc(100vh-120px)] sm:h-[calc(100vh-140px)] flex flex-col">
      <div className="shrink-0">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">AI Assistant</h1>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">Prompt the CrimeGraph LLM to extract entities, summarize cases, or compile suspect profiles.</p>
      </div>

      <div className="flex-1 bg-white border border-[var(--card-border)] rounded-xl flex flex-col overflow-hidden min-h-0 shadow-sm">
        {/* Messages Feed */}
        <div className="flex-1 p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto touch-scroll">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 sm:gap-4 ${msg.sender === 'USER' ? 'justify-end' : 'justify-start'}`}>
              {msg.sender === 'AI' && (
                <div className="w-8 h-8 rounded-lg bg-[var(--accent-color)] flex items-center justify-center shrink-0 text-white font-bold text-xs shadow-xs">
                  AI
                </div>
              )}

              <div
                className={`p-3.5 sm:p-4 rounded-2xl max-w-[85%] sm:max-w-xl space-y-1.5 text-xs sm:text-sm leading-relaxed ${
                  msg.sender === 'USER'
                    ? 'bg-[var(--accent-color)] text-white'
                    : 'bg-[var(--surface-muted)] border border-[var(--border-subtle)] text-[var(--text-primary)]'
                }`}
              >
                <p className="break-words">{msg.text}</p>
                {msg.suggestion && (
                  <p className="text-[11px] text-[var(--text-tertiary)] pt-1">
                    Try asking: <button onClick={() => setInputQuery(msg.suggestion || '')} className="text-[var(--teal-accent)] italic hover:underline cursor-pointer">"{msg.suggestion}"</button>
                  </p>
                )}
                <span className={`block text-[9px] text-right ${msg.sender === 'USER' ? 'text-stone-300' : 'text-[var(--text-tertiary)]'}`}>{msg.time}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Input Form Panel */}
        <form onSubmit={handleSend} className="p-3 sm:p-4 border-t border-[var(--border)] bg-[var(--surface-muted)]">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask the intelligence model…"
              className="form-input text-xs sm:text-sm flex-1 min-w-0"
            />
            <button
              type="submit"
              className="btn-primary text-xs px-4 sm:px-5 py-2.5 rounded-lg shrink-0 justify-center"
            >
              Query LLM
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
