import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { ModelPart, ShapeType } from '../types';
import * as THREE from 'three';
import { Edges } from '@react-three/drei';

interface ShapeRendererProps {
  part: ModelPart;
  isVisible: boolean;
}

const ShapeRenderer: React.FC<ShapeRendererProps> = ({ part, isVisible }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Physics state for spring animation
  const springState = useRef({
    position: 0,   // Current scale value (0 to 1)
    velocity: 0,   // Current velocity
    target: 0      // Target value
  });

  // Track if we should be rendering at all to save resources
  const [hasRenderedOnce, setHasRenderedOnce] = useState(false);

  useEffect(() => {
    if (isVisible) {
      springState.current.target = 1;
      setHasRenderedOnce(true);
    } else {
      springState.current.target = 0;
    }
  }, [isVisible]);

  useFrame((state, delta) => {
    // Skip calculation if we are settled at 0 and haven't started yet
    if (springState.current.position < 0.001 && springState.current.target === 0 && !hasRenderedOnce) return;

    // Spring physics constants
    // Tension (Stiffness) and Friction (Damping)
    // Values tuned for a "mechanical organic" feel (snappy but with a slight bounce)
    const tension = 120; 
    const friction = 12; 

    const { position, velocity, target } = springState.current;
    
    // Spring Force: F = -kx - cv
    const displacement = position - target;
    const force = -tension * displacement - friction * velocity;
    
    // Euler integration (Mass = 1)
    // Clamp delta to prevent physics explosion on lag spikes
    const dt = Math.min(delta, 0.1);
    
    springState.current.velocity += force * dt;
    springState.current.position += springState.current.velocity * dt;

    // Apply scale to mesh
    if (meshRef.current) {
        // Prevent negative scale artifacts
        const s = Math.max(0, springState.current.position);
        
        const sx = part.scale?.[0] ?? 1;
        const sy = part.scale?.[1] ?? 1;
        const sz = part.scale?.[2] ?? 1;

        meshRef.current.scale.set(sx * s, sy * s, sz * s);
    }
  });

  const position = new THREE.Vector3(...part.position);
  const rotation = new THREE.Euler(...part.rotation);
  const color = part.color || "#cccccc";

  // Memoize geometry to avoid overhead
  const Geometry = useMemo(() => {
    const args = part.args || [];
    switch (part.type) {
        case ShapeType.BOX: return <boxGeometry args={[1, 1, 1]} />;
        case ShapeType.SPHERE: return <sphereGeometry args={[args[0] || 1, 32, 32]} />;
        case ShapeType.CYLINDER: return <cylinderGeometry args={[args[0] || 1, args[1] || 1, args[2] || 1, 32]} />;
        case ShapeType.CONE: return <coneGeometry args={[args[0] || 1, args[1] || 1, 32]} />;
        case ShapeType.TORUS: return <torusGeometry args={[args[0] || 1, args[1] || 0.4, 32, 100]} />;
        case ShapeType.ICOSAHEDRON: return <icosahedronGeometry args={[args[0] || 1, 0]} />;
        default: return <boxGeometry />;
    }
  }, [part.type, part.args]);

  // Determine final scale for ghost mesh (static)
  const finalScale = new THREE.Vector3(
     part.scale?.[0] ?? 1,
     part.scale?.[1] ?? 1,
     part.scale?.[2] ?? 1
  );

  return (
    <group position={position} rotation={rotation}>
      {/* 
         GHOST MESH:
         Invisible to the eye but visible to the <Bounds> system.
         It ensures the camera frames the FINAL size of the object immediately,
         preventing the "infinite zoom" bug when the animated parts start at scale 0.
      */}
      <mesh visible={true} scale={finalScale}>
        {Geometry}
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Actual Rendered Part with Physics Animation */}
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        // Hide until first triggered to prevent any 0-scale artifacts
        visible={hasRenderedOnce} 
      >
        {Geometry}
        <meshStandardMaterial
          color={color}
          roughness={0.4}
          metalness={0.6}
          // Polygon Offset ensures the wireframe Edges render cleanly on top without Z-fighting
          polygonOffset
          polygonOffsetFactor={1}
        />
        
        {/* Technical Wireframe Overlay - Grows with the object */}
        <Edges 
          threshold={15} 
          color="#ffffff"
          scale={1}
        />
      </mesh>
    </group>
  );
};

export default ShapeRenderer;