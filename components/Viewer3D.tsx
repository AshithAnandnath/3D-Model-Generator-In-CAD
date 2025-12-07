import React, { Suspense, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, GizmoHelper, GizmoViewport, Center, Bounds } from '@react-three/drei';
import { GeneratedModel } from '../types';
import ShapeRenderer from './ShapeRenderer';
import { MousePointer2, Move3d, Search, Box, ArrowUp, ArrowRight } from 'lucide-react';
import * as THREE from 'three';

interface ViewState {
  mode: string;
  t: number; // Timestamp to force updates
}

interface Viewer3DProps {
  model: GeneratedModel | null;
  buildingSpeed?: number;
  viewState: ViewState;
  onViewChange: (viewMode: string) => void;
}

// Inner component to handle programmatic camera movement
const CameraController = ({ viewState }: { viewState: ViewState }) => {
   const { camera } = useThree();
   const controls = useThree(state => state.controls) as unknown as { target: THREE.Vector3, update: () => void, object: THREE.Camera };
   
   useEffect(() => {
      if(!controls) return;
      
      const distance = 15; // Standard viewing distance

      // We maintain the current target (center of model) but move the camera position
      switch(viewState.mode) {
         case 'TOP':
            camera.position.set(0, distance, 0);
            break;
         case 'BOTTOM':
            camera.position.set(0, -distance, 0);
            break;
         case 'FRONT':
            camera.position.set(0, 0, distance);
            break;
         case 'SIDE':
            camera.position.set(distance, 0, 0);
            break;
         case 'ISO':
         default:
            camera.position.set(10, 10, 10);
            break;
      }
      
      controls.target.set(0, 0, 0);
      controls.update();
      
   }, [viewState, camera, controls]); // Depend on the entire viewState object (including timestamp)
   
   return null;
}

interface ViewButtonProps {
  onClick: () => void;
  isActive: boolean;
  title: string;
  children: React.ReactNode;
}

const ViewButton: React.FC<ViewButtonProps> = ({ onClick, isActive, title, children }) => (
  <button 
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    title={title}
    className={`
       flex items-center justify-center w-10 h-10 rounded-lg border shadow-lg transition-all duration-200 z-50
       ${isActive 
          ? 'bg-cad-accent text-cad-900 border-cad-accent scale-105 ring-2 ring-cad-accent/30' 
          : 'bg-cad-800 text-cad-accent border-cad-600 hover:bg-cad-700 hover:border-cad-500 hover:text-white'
       }
    `}
  >
    {children}
  </button>
);

const Viewer3D: React.FC<Viewer3DProps> = ({ model, buildingSpeed = 100, viewState, onViewChange }) => {
  const [visiblePartsCount, setVisiblePartsCount] = useState(0);

  useEffect(() => {
    setVisiblePartsCount(0);
  }, [model]);

  useEffect(() => {
    if (!model) return;
    if (visiblePartsCount < model.parts.length) {
      const timer = setTimeout(() => {
        setVisiblePartsCount(prev => prev + 1);
      }, buildingSpeed);
      return () => clearTimeout(timer);
    }
  }, [visiblePartsCount, model, buildingSpeed]);

  return (
    <div className="w-full h-full relative bg-cad-900 overflow-hidden group">
      {/* Grid overlay lines for 'blueprint' feel */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-10" 
           style={{ backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      <Canvas shadows camera={{ position: [10, 10, 10], fov: 45 }}>
        <color attach="background" args={['#0f172a']} />
        
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]} />
        <directionalLight position={[-10, 5, -10]} intensity={0.5} color="#06b6d4" />
        <directionalLight position={[0, -10, 0]} intensity={0.3} color="#475569" />

        <Suspense fallback={null}>
          <Bounds fit clip observe margin={1.2}>
            <Center top>
               <group>
                  {model && model.parts.map((part, index) => (
                      <ShapeRenderer 
                          key={`${part.id}-${index}`} 
                          part={part} 
                          isVisible={index < visiblePartsCount} 
                      />
                  ))}
                  {/* Fallback invisible box to ensure Grid is centered even when empty */}
                  {!model && <mesh visible={false}><boxGeometry /></mesh>}
               </group>
            </Center>
          </Bounds>

          <Grid 
            position={[0, -0.01, 0]} 
            args={[60, 60]} 
            cellSize={1} 
            cellThickness={0.8} 
            cellColor="#1e293b" 
            sectionSize={5} 
            sectionThickness={1.5} 
            sectionColor="#334155" 
            fadeDistance={40} 
            infiniteGrid 
          />
          
          <Environment preset="city" />
        </Suspense>

        <OrbitControls makeDefault minDistance={1} maxDistance={200} dampingFactor={0.2} />
        <CameraController viewState={viewState} />

        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewport axisColors={['#ef4444', '#22c55e', '#3b82f6']} labelColor="white" />
        </GizmoHelper>
      </Canvas>

      {/* Target Reticle (The "Show model here" dashed box) - Fades out when model exists */}
      {!model && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-48 border-2 border-dashed border-cad-accent/30 rounded-lg flex items-center justify-center pointer-events-none">
           <div className="text-cad-accent/50 text-xs font-mono">MODEL BUILD AREA</div>
        </div>
      )}

      {/* Viewport Info Overlay */}
      <div className="absolute top-4 left-4 font-mono text-xs text-cad-accent pointer-events-none select-none z-10 leading-relaxed">
        <div className="flex gap-4">
            <span className="text-gray-500">VIEW:</span> <span className="font-bold">{viewState.mode}</span>
        </div>
        <div className="flex gap-4">
            <span className="text-gray-500">GRID:</span> <span>1 UNIT</span>
        </div>
        <div className="flex gap-4">
            <span className="text-gray-500">AXIS:</span> <span>Y-UP</span>
        </div>
        <div className="flex gap-4 mt-2 pt-2 border-t border-cad-600/50">
            <span className="text-gray-500">PARTS:</span> 
            <span className="text-white">
                {model ? `${visiblePartsCount} / ${model.parts.length}` : '- / -'}
            </span>
        </div>
      </div>

      {/* Quick View Toolbar */}
      <div className="absolute top-4 right-4 flex flex-col gap-3 z-50">
         <ViewButton 
            onClick={() => onViewChange('ISO')} 
            isActive={viewState.mode === 'ISO'} 
            title="Isometric View"
         >
            <Box className="w-5 h-5" strokeWidth={1.5} />
         </ViewButton>

         <ViewButton 
            onClick={() => onViewChange('TOP')} 
            isActive={viewState.mode === 'TOP'} 
            title="Top View"
         >
            <ArrowUp className="w-5 h-5" strokeWidth={1.5} />
         </ViewButton>

         <ViewButton 
            onClick={() => onViewChange('FRONT')} 
            isActive={viewState.mode === 'FRONT'} 
            title="Front View"
         >
             <span className="font-bold text-sm font-sans">F</span>
         </ViewButton>

         <ViewButton 
            onClick={() => onViewChange('SIDE')} 
            isActive={viewState.mode === 'SIDE'} 
            title="Side View"
         >
            <ArrowRight className="w-5 h-5" strokeWidth={1.5} />
         </ViewButton>
      </div>

      {/* Navigation Controls Legend */}
      <div className="absolute bottom-6 right-20 text-xs font-mono text-cad-accent border border-cad-600 bg-cad-900/90 p-3 rounded backdrop-blur-sm select-none z-10 shadow-xl opacity-80 hover:opacity-100 transition-opacity">
        <div className="font-bold mb-2 text-white border-b border-cad-600 pb-1 flex items-center gap-2">
            CONTROLS
        </div>
        <div className="grid grid-cols-[20px_1fr] gap-y-2 items-center">
            <MousePointer2 className="w-3 h-3 text-white" /> <span>L-CLICK + DRAG <span className="text-gray-500">ROTATE</span></span>
            <Move3d className="w-3 h-3 text-white" /> <span>R-CLICK + DRAG <span className="text-gray-500">PAN</span></span>
            <Search className="w-3 h-3 text-white" /> <span>SCROLL <span className="text-gray-500">ZOOM</span></span>
        </div>
      </div>
    </div>
  );
};

export default Viewer3D;