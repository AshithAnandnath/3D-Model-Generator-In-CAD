export enum ShapeType {
  BOX = 'box',
  SPHERE = 'sphere',
  CYLINDER = 'cylinder',
  CONE = 'cone',
  TORUS = 'torus',
  ICOSAHEDRON = 'icosahedron'
}

export interface ModelPart {
  id: string;
  type: ShapeType;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number]; // Used for Box mainly
  args?: number[]; // [radius, height, etc] specific to shape
  color: string;
  description: string; // Describes what this part represents (e.g., "Left Leg")
}

export interface GeneratedModel {
  name: string;
  parts: ModelPart[];
}

export interface GenerationState {
  isGenerating: boolean;
  progress: number; // 0-100
  status: string; // "Analyzing...", "Drafting geometry...", "Finalizing..."
  error?: string;
}