import * as THREE from 'three';
import { GeneratedModel, ShapeType } from '../types';

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const saveAsPart = (model: GeneratedModel) => {
  const jsonStr = JSON.stringify(model, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  // Replace spaces with underscores for safe filename
  const safeName = (model.name || 'untitled_model').replace(/\s+/g, '_');
  downloadBlob(blob, `${safeName}.part`);
};

export const saveAsSTL = (model: GeneratedModel) => {
  let stlString = 'solid exported\n';

  model.parts.forEach(part => {
    let geometry: THREE.BufferGeometry;

    // 1. Recreate geometry to match ShapeRenderer logic
    const args = part.args || [];
    switch (part.type) {
      case ShapeType.BOX: 
        geometry = new THREE.BoxGeometry(1, 1, 1); 
        break;
      case ShapeType.SPHERE: 
        geometry = new THREE.SphereGeometry(args[0] || 1, 32, 16); 
        break;
      case ShapeType.CYLINDER: 
        geometry = new THREE.CylinderGeometry(args[0] || 1, args[1] || 1, args[2] || 1, 32); 
        break;
      case ShapeType.CONE: 
        geometry = new THREE.ConeGeometry(args[0] || 1, args[1] || 1, 32); 
        break;
      case ShapeType.TORUS: 
        geometry = new THREE.TorusGeometry(args[0] || 1, args[1] || 0.4, 32, 24); 
        break;
      case ShapeType.ICOSAHEDRON: 
        geometry = new THREE.IcosahedronGeometry(args[0] || 1, 0); 
        break;
      default: 
        geometry = new THREE.BoxGeometry(1, 1, 1);
    }

    // 2. Apply Scale
    // ShapeRenderer applies scale prop to mesh.scale
    const sx = part.scale?.[0] ?? 1;
    const sy = part.scale?.[1] ?? 1;
    const sz = part.scale?.[2] ?? 1;
    geometry.scale(sx, sy, sz);

    // 3. Apply Rotation & Position
    geometry.rotateX(part.rotation[0]);
    geometry.rotateY(part.rotation[1]);
    geometry.rotateZ(part.rotation[2]);
    geometry.translate(part.position[0], part.position[1], part.position[2]);

    // 4. Extract Triangles for STL
    const posAttribute = geometry.attributes.position;
    const index = geometry.index;
    
    const getPoint = (i: number) => new THREE.Vector3().fromBufferAttribute(posAttribute, i);

    // Function to append a single triangle to STL string
    const addTriangle = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => {
       const u = new THREE.Vector3().subVectors(b, a);
       const v = new THREE.Vector3().subVectors(c, a);
       // Calculate normal using cross product
       const normal = new THREE.Vector3().crossVectors(u, v).normalize();

       // Check for degenerate triangles
       if (isNaN(normal.x) || isNaN(normal.y) || isNaN(normal.z)) return;

       stlString += `facet normal ${normal.x.toExponential()} ${normal.y.toExponential()} ${normal.z.toExponential()}\n`;
       stlString += `outer loop\n`;
       stlString += `vertex ${a.x.toExponential()} ${a.y.toExponential()} ${a.z.toExponential()}\n`;
       stlString += `vertex ${b.x.toExponential()} ${b.y.toExponential()} ${b.z.toExponential()}\n`;
       stlString += `vertex ${c.x.toExponential()} ${c.y.toExponential()} ${c.z.toExponential()}\n`;
       stlString += `endloop\n`;
       stlString += `endfacet\n`;
    };

    if (index) {
        // Indexed Geometry
        for (let i = 0; i < index.count; i += 3) {
            addTriangle(
                getPoint(index.getX(i)),
                getPoint(index.getX(i+1)),
                getPoint(index.getX(i+2))
            );
        }
    } else {
        // Non-indexed Geometry
        for (let i = 0; i < posAttribute.count; i += 3) {
            addTriangle(getPoint(i), getPoint(i+1), getPoint(i+2));
        }
    }
  });

  stlString += 'endsolid exported\n';
  
  const safeName = (model.name || 'untitled_model').replace(/\s+/g, '_');
  const blob = new Blob([stlString], { type: 'text/plain' });
  downloadBlob(blob, `${safeName}.stl`);
};
