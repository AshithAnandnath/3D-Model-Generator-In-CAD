import React, { useState } from 'react';
import { GenerationState } from '../types';
import { Terminal, Send, Loader2, Command } from 'lucide-react';

interface InputPanelProps {
  onGenerate: (prompt: string) => void;
  generationState: GenerationState;
}

const InputPanel: React.FC<InputPanelProps> = ({ onGenerate, generationState }) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !generationState.isGenerating) {
      onGenerate(prompt);
      setPrompt('');
    }
  };

  return (
    <div className="w-full bg-cad-800 border-t border-cad-600 p-2 flex flex-col gap-2">
      
      {/* Status / History Line */}
      <div className="flex items-center gap-2 px-2 text-xs font-mono text-cad-accent">
        <Terminal className="w-3 h-3" />
        <span className="opacity-70">SYSTEM STATUS:</span>
        <span className={generationState.isGenerating ? "animate-pulse text-white" : "text-gray-400"}>
          {generationState.status || "READY"}
        </span>
        {generationState.isGenerating && (
          <span className="ml-auto text-white">{generationState.progress}%</span>
        )}
      </div>

      {/* Command Input Area */}
      <form onSubmit={handleSubmit} className="flex gap-0 items-stretch bg-cad-900 border border-cad-600 rounded shadow-inner overflow-hidden">
        <div className="px-3 py-3 bg-cad-700 text-gray-400 flex items-center border-r border-cad-600">
           <Command className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter object description command..."
          disabled={generationState.isGenerating}
          className="flex-1 bg-transparent px-4 py-3 text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:bg-cad-900/50"
          autoFocus
        />
        <button
          type="submit"
          disabled={!prompt.trim() || generationState.isGenerating}
          className="px-6 py-2 bg-cad-700 hover:bg-cad-600 text-white font-mono text-xs uppercase tracking-wider transition-colors disabled:opacity-50 border-l border-cad-600"
        >
          {generationState.isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <span className="flex items-center gap-2">
              Build <Send className="w-3 h-3" />
            </span>
          )}
        </button>
      </form>
    </div>
  );
};

export default InputPanel;