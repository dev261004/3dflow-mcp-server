import { v4 as uuidv4 } from "uuid";
import { buildSynthesisContract } from "../lib/synthesisContract.js";
import { getMaterial } from "./materialService.js";
import { Material, PrimitiveShape, SceneObject, Vector3 } from "../types/scene.js";
import {
  CompositionPresetToken,
  LightingPresetToken,
  MaterialPresetToken,
  ThemeToken
} from "../types/designTokens.js";

const LAYOUT_POSITIONS: Record<CompositionPresetToken, Vector3[]> = {
  hero_centered: [
    [0, 0.08, 0.12],
    [-1.55, 0.42, -0.82],
    [1.42, -0.28, -0.58],
    [0.08, -0.98, -1.04]
  ],
  floating_showcase: [
    [0, 0.3, 0.16],
    [-1.48, 0.68, -0.94],
    [1.32, -0.24, -0.62],
    [0.16, -0.92, -1.12]
  ],
  product_closeup: [
    [0, 0.04, 0.22],
    [-1.02, 0.18, -0.64],
    [1.04, -0.16, -0.52],
    [0.04, -0.66, -0.9]
  ]
};

const DEFAULT_SEGMENT_COUNT: Record<"box" | "sphere" | "cylinder", number> = {
  box: 1,
  sphere: 64,
  cylinder: 48
};

const NATIVE_PRIMITIVES: Record<string, PrimitiveShape> = {
  box: "box",
  cube: "box",
  cuboid: "box",
  sphere: "sphere",
  orb: "sphere",
  globe: "sphere",
  cylinder: "cylinder"
};

function getPrimitiveShape(name: string): PrimitiveShape | null {
  const normalizedName = name.toLowerCase().trim();

  return NATIVE_PRIMITIVES[normalizedName] ?? null;
}

function roundVector(values: Vector3): Vector3 {
  return values.map((value) => Number(value.toFixed(2))) as Vector3;
}

function getObjectPosition(name: string, index: number, composition: CompositionPresetToken): Vector3 {
  const basePosition = getBasePosition(index, composition);
  const normalizedName = name.toLowerCase();
  const [x, y, z] = basePosition;

  if (normalizedName.includes("orb")) {
    return roundVector([x + (x < 0 ? -0.12 : 0.12), y + 0.12, z - 0.1]);
  }

  if (normalizedName.includes("card")) {
    return roundVector([x, y - 0.08, z - 0.08]);
  }

  if (normalizedName.includes("ring")) {
    return roundVector([x, y - 0.12, z - 0.16]);
  }

  return basePosition;
}

function getBasePosition(index: number, composition: CompositionPresetToken): Vector3 {
  return LAYOUT_POSITIONS[composition][index] ?? [0, 0, -0.35 * index];
}

function getObjectRotation(name: string, index: number, composition: CompositionPresetToken): Vector3 {
  const normalizedName = name.toLowerCase();

  if (index === 0) {
    return composition === "floating_showcase" ? [0.04, 0.2, -0.03] : [0.02, 0.12, 0];
  }

  if (normalizedName.includes("orb")) {
    return [0, 0, 0];
  }

  if (normalizedName.includes("card")) {
    return [-0.28, -0.4, 0.22];
  }

  if (normalizedName.includes("ring")) {
    return [0.74, 0.24, 0.34];
  }

  return [0, 0.08 * index, 0];
}

function getObjectScale(name: string, index: number, composition: CompositionPresetToken): Vector3 {
  const normalizedName = name.toLowerCase();

  if (normalizedName.includes("orb")) {
    return [0.48, 0.48, 0.48];
  }

  if (normalizedName.includes("card")) {
    return [0.84, 0.54, 0.08];
  }

  if (normalizedName.includes("ring")) {
    return [0.62, 0.62, 0.14];
  }

  if (index === 0 && composition === "product_closeup") {
    return [1.15, 1.15, 1.15];
  }

  if (index === 0 && composition === "floating_showcase") {
    return [1.08, 1.08, 1.08];
  }

  return [1, 1, 1];
}

export function createObject(
  name: string,
  theme: ThemeToken,
  materialPreset: MaterialPresetToken,
  lightingPreset: LightingPresetToken,
  composition: CompositionPresetToken,
  index: number,
  rawStyle?: string,
  accentColor = "#00F5FF"
): SceneObject {
  const shape = getPrimitiveShape(name);
  const material = getMaterial(theme, materialPreset, lightingPreset, name, index, rawStyle);
  const objectId = uuidv4();

  if (shape) {
    return {
      id: objectId,
      type: "primitive",
      name,
      shape,
      position: getObjectPosition(name, index, composition),
      rotation: getObjectRotation(name, index, composition),
      scale: getObjectScale(name, index, composition),
      material,
      render_hints: createRenderHints(shape, material)
    };
  }

  const contract = buildSynthesisContract({
    objectId,
    objectName: name,
    style: rawStyle || theme,
    materialPreset,
    baseColor: material.color,
    accentColor
  });

  return {
    id: objectId,
    type: "synthesis_contract",
    name,
    shape: "SYNTHESIS_REQUIRED",
    synthesis_contract: contract,
    position: getObjectPosition(name, index, composition),
    rotation: getObjectRotation(name, index, composition),
    scale: getObjectScale(name, index, composition),
    material,
    render_hints: {
      ...createRenderHints(undefined, material),
      bounding_box: contract.bounding_box,
      min_parts: contract.min_parts,
      complexity: contract.complexity_hint
    }
  };
}

function createRenderHints(
  shape: PrimitiveShape | undefined,
  material: Material
): SceneObject["render_hints"] {
  return {
    segment_count: shape ? DEFAULT_SEGMENT_COUNT[shape] : undefined,
    transparency_mode: typeof material.transmission === "number" && material.transmission > 0
      ? "physical"
      : "opaque"
  };
}
