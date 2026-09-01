'use client';

import React from 'react';

export default function AIAssistantPage() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto h-[calc(100vh-140px)] flex flex-col">
      <div className="shrink-0">
        <h1 className="text-3xl font-bold tracking-tight text-white">AI Assistant</h1>
        <p className="text-sm text-gray-400 mt-1">Prompt the CrimeGraph LLM to extract entities, summarize cases, or compile suspect profiles.</p>
      </div>

      <div className="flex-1 glass-panel border border-white/5 rounded-2xl flex flex-col overflow-hidden min-h-0">
        {/* Messages */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0 text-white font-bold text-xs">AI</div>
            <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl max-w-xl space-y-2 text-sm text-gray-300">
              <p>Welcome to CrimeGraph AI Assistant. How can I help you analyze the active data nodes today?</p>
              <p className="text-xs text-gray-500">Try asking: <span className="text-indigo-400 italic">"Summarize link matches for Rohan Sharma"</span></p>
            </div>
          </div>
        </div>

        {/* Input panel */}
        <div className="p-4 border-t border-[#1a1e27] bg-[#0b0d13]">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ask the intelligence model..."
              className="flex-1 px-4 py-3 bg-[#0d0f14] border border-[#1e2530] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
            />
            <button className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-all cursor-pointer">
              Query LLM
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
