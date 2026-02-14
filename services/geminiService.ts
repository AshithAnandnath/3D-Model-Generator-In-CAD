import { GoogleGenAI, Type, Schema } from "@google/genai";
import { GeneratedModel, ModelPart, ShapeType } from "../types";

// Define the response schema strictly to ensure valid JSON output for 3D construction
const modelSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: {
      type: Type.STRING,
      description: "A short, technical name for the generated model",
    },
    parts: {
      type: Type.ARRAY,
      description: "List of geometric parts. Order from base/center outwards.",
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "Unique ID (e.g., 'part_01')" },
          type: {
            type: Type.STRING,
            enum: [
              "box",
              "sphere",
              "cylinder",
              "cone",
              "torus",
              "icosahedron"
            ],
            description: "Geometric primitive type",
          },
          position: {
            type: Type.ARRAY,
            items: { type: Type.NUMBER },
            description: "[x, y, z] coordinates. Y is UP.",
          },
          rotation: {
            type: Type.ARRAY,
            items: { type: Type.NUMBER },
            description: "Euler rotation [x, y, z] in radians",
          },
          scale: {
            type: Type.ARRAY,
            items: { type: Type.NUMBER },
            description: "Scale [x, y, z]. Default is [1,1,1].",
          },
          args: {
            type: Type.ARRAY,
            items: { type: Type.NUMBER },
            description: "Geometry arguments. Box:[], Sphere:[rad], Cyl:[top,bot,h,seg], Cone:[rad,h,seg], Torus:[rad,tube,radSeg,tubSeg].",
          },
          color: {
            type: Type.STRING,
            description: "Hex color code (e.g., #FF0000)",
          },
          description: {
            type: Type.STRING,
            description: "Technical description (e.g., 'Chassis_Main')",
          },
        },
        required: ["id", "type", "position", "rotation", "scale", "color", "description"],
      },
    },
  },
  required: ["name", "parts"],
};

/**
 * Normalizes the model scale so it fits within a reasonable viewbox (e.g., 10 units).
 * This handles cases where the model outputs "150mm" (150 units) or "0.5m" (0.5 units).
 */
const normalizeModelData = (model: GeneratedModel): GeneratedModel => {
  if (!model.parts || model.parts.length === 0) return model;

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  // 1. Calculate bounding box of the raw data
  model.parts.forEach(part => {
    const [x, y, z] = part.position;
    // Estimate size based on type to get rough bounds
    let sizeX = 0, sizeY = 0, sizeZ = 0;

    // Fallback defaults
    const sx = part.scale?.[0] || 1;
    const sy = part.scale?.[1] || 1;
    const sz = part.scale?.[2] || 1;

    switch (part.type) {
      case ShapeType.BOX:
        sizeX = sx / 2; sizeY = sy / 2; sizeZ = sz / 2;
        break;
      case ShapeType.CYLINDER:
      case ShapeType.CONE:
        // args: [radTop, radBot, height]
        const h = part.args?.[2] || 1;
        const r = Math.max(part.args?.[0] || 1, part.args?.[1] || 1);
        sizeX = r; sizeZ = r; sizeY = h / 2;
        break;
      case ShapeType.SPHERE:
      case ShapeType.ICOSAHEDRON:
        const rad = part.args?.[0] || 1;
        sizeX = sizeY = sizeZ = rad;
        break;
      default:
        sizeX = sx; sizeY = sy; sizeZ = sz;
    }

    minX = Math.min(minX, x - sizeX);
    maxX = Math.max(maxX, x + sizeX);
    minY = Math.min(minY, y - sizeY);
    maxY = Math.max(maxY, y + sizeY);
    minZ = Math.min(minZ, z - sizeZ);
    maxZ = Math.max(maxZ, z + sizeZ);
  });

  const sizeX = maxX - minX || 1;
  const sizeY = maxY - minY || 1;
  const sizeZ = maxZ - minZ || 1;
  const maxDim = Math.max(sizeX, sizeY, sizeZ);

  // Avoid divide by zero if something goes wrong
  if (maxDim === 0) return model;

  // Target size is roughly 8 units to fit nicely in 10 unit view
  const scaleFactor = 8 / maxDim;

  // 2. Apply normalization
  const normalizedParts = model.parts.map(part => {
    // Scale position
    const newPos: [number, number, number] = [
      part.position[0] * scaleFactor,
      part.position[1] * scaleFactor,
      part.position[2] * scaleFactor
    ];

    // Scale geometry args
    const newArgs = [...(part.args || [])];
    const newScale = [...(part.scale || [1, 1, 1])] as [number, number, number];

    switch (part.type) {
      case ShapeType.BOX:
        // For box, scale acts as dimensions if geometry is 1x1x1
        newScale[0] *= scaleFactor;
        newScale[1] *= scaleFactor;
        newScale[2] *= scaleFactor;
        break;
      case ShapeType.CYLINDER:
      case ShapeType.CONE:
        // args: [radTop, radBot, height, seg]
        if (newArgs[0] !== undefined) newArgs[0] *= scaleFactor;
        if (newArgs[1] !== undefined) newArgs[1] *= scaleFactor;
        if (newArgs[2] !== undefined) newArgs[2] *= scaleFactor;
        break;
      case ShapeType.SPHERE:
      case ShapeType.ICOSAHEDRON:
        // args: [rad]
        if (newArgs[0] !== undefined) newArgs[0] *= scaleFactor;
        break;
      case ShapeType.TORUS:
        // args: [rad, tube, ...]
        if (newArgs[0] !== undefined) newArgs[0] *= scaleFactor;
        if (newArgs[1] !== undefined) newArgs[1] *= scaleFactor;
        break;
    }

    return {
      ...part,
      position: newPos,
      args: newArgs,
      scale: newScale
    };
  });

  return { ...model, parts: normalizedParts };
};

/**
 * Robustly attempts to extract JSON from a potentially messy string.
 */
const cleanAndParseJSON = (text: string): GeneratedModel => {
  let cleanText = text;

  // 1. Try to extract from Markdown code blocks first
  const codeBlockRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/i;
  const match = text.match(codeBlockRegex);
  if (match) {
    cleanText = match[1];
  } else {
    // 2. If no code block, try to find the outermost JSON object
    const firstOpen = text.indexOf('{');
    const lastClose = text.lastIndexOf('}');
    if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
      cleanText = text.substring(firstOpen, lastClose + 1);
    }
  }

  // 3. Cleanup common issues
  // Remove trailing commas which are invalid in JSON but common in LLM output
  cleanText = cleanText.replace(/,(\s*[}\]])/g, '$1');

  try {
    return JSON.parse(cleanText) as GeneratedModel;
  } catch (e) {
    console.error("JSON Parse Error. Raw Text:", text);
    console.error("Cleaned Text:", cleanText);
    throw new Error("Could not interpret the model data. The design was too abstract.");
  }
};

export const generate3DModel = async (description: string): Promise<GeneratedModel> => {
  try {
    // Safe access to environment variables (Vite uses import.meta.env, but we also support process.env if defined)
    // @ts-ignore
    const apiKey = import.meta.env?.VITE_API_KEY || process?.env?.API_KEY || process?.env?.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("API Key is missing. Please set VITE_API_KEY in .env file.");
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `
    You are a CAD (Computer-Aided Design) generative engine. 
    Convert the user's description into a structural list of 3D geometric primitives.
    
    Principles:
    1. **Decomposition**: Break complex shapes into multiple simple primitives. 
       - Example: A "shaft" is not just one cylinder. It is a main cylinder + two smaller cylinders for bearings + a keyway box + chamfered ends.
       - Example: A "table" is 4 leg cylinders + 1 top box + support beams.
    2. **Details**: Add visual interest. Use multiple parts even for simple objects.
    3. **Orientation**: Y-axis is vertical UP.
    4. **Output**: STRICT JSON ONLY. Do not include markdown formatting or conversational text in the response.
    
    Arg Guidelines:
    - Cylinder/Cone: [radiusTop, radiusBottom, height, segments]. Segments ~32.
    - Sphere: [radius].
    - Box: Use 'scale' to set dimensions [width, height, depth]. args can be empty.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: description,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: modelSchema,
        temperature: 0.3,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from Gemini.");
    }

    const data = cleanAndParseJSON(text);

    // Normalize the data before returning to ensure it fits the viewer
    const normalizedData = normalizeModelData(data);

    return normalizedData;

  } catch (error) {
    console.error("Error generating 3D model:", error);
    throw error;
  }
};