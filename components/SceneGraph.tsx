import React from 'react';
import { GeneratedModel } from '../types';
import { Box, Layers, Eye, Circle } from 'lucide-react';

interface SceneGraphProps {
  model: GeneratedModel | null;
}

const SceneGraph: React.FC<SceneGraphProps> = ({ model }) => {
  return (
    <div className="h-full flex flex-col bg-cad-900 border-l border-cad-600 text-gray-300 font-mono text-xs w-72 flex-shrink-0 select-none">
      {/* Header */}
      <div className="h-10 border-b border-cad-600 font-bold flex items-center gap-2 px-3 bg-cad-800 text-white tracking-wide">
        <Layers className="w-4 h-4" />
        <span>SCENE HIERARCHY</span>
      </div>
      
      <div className="flex-1 overflow-y-auto bg-cad-900">
        {!model ? (
          <div className="text-gray-600 italic text-center mt-10 opacity-50">Empty Scene</div>
        ) : (
          <div className="flex flex-col">
             {/* Model Root Node - Matches the screenshot's blue bar */}
             <div className="flex items-center gap-2 px-3 py-2 bg-cyan-900/40 border-b border-cyan-800/30 text-cyan-400">
                <Box className="w-4 h-4" />
                <span className="font-bold truncate">{model.name}</span>
             </div>
             
             {/* Parts List */}
             <div className="py-1">
                {model.parts.map((part, idx) => (
                    <div key={idx} className="flex items-center gap-3 px-4 py-1.5 hover:bg-cad-800 cursor-pointer group transition-colors">
                        <Eye className="w-3 h-3 text-gray-500 group-hover:text-white" />
                        <span className="text-gray-500 w-4 text-right">{idx + 1}</span>
                        <span className="truncate flex-1 text-gray-300 group-hover:text-white transition-colors" title={part.description}>
                            {part.description || `${part.type}_${part.id}`}
                        </span>
                        <div 
                            className="w-2 h-2 rounded-full shadow-[0_0_4px_rgba(0,0,0,0.5)] ring-1 ring-white/10" 
                            style={{ backgroundColor: part.color }}
                        ></div>
                    </div>
                ))}
             </div>
          </div>
        )}
      </div>
      
      {/* Footer Stats */}
      <div className="p-3 border-t border-cad-600 bg-cad-900 text-[10px] text-gray-500 space-y-1">
         <div className="flex justify-between">
           <span>PARTS:</span>
           <span className="text-gray-400 font-bold">{model ? model.parts.length : 0}</span>
         </div>
         <div className="flex justify-between">
           <span>VERTICES:</span>
           <span className="text-gray-400 font-bold">{model ? model.parts.length * 64 : 0} approx</span>
         </div>
      </div>
    </div>
  );
};

export default SceneGraph;