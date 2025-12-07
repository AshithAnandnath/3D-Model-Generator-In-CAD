import { ShapeType } from "./types";

export const DEFAULT_CAMERA_POSITION: [number, number, number] = [10, 10, 10];

export const SHAPE_LABELS: Record<ShapeType, string> = {
  [ShapeType.BOX]: "Box",
  [ShapeType.SPHERE]: "Sphere",
  [ShapeType.CYLINDER]: "Cylinder",
  [ShapeType.CONE]: "Cone",
  [ShapeType.TORUS]: "Torus",
  [ShapeType.ICOSAHEDRON]: "Icosahedron",
};

export const INITIAL_PROMPT_EXAMPLES = [
  "A futuristic sci-fi chair with neon accents",
  "A simple low-poly tree",
  "A red robot with square head and wheels",
  "A cozy log cabin",
  "A space rocket ready for launch"
];