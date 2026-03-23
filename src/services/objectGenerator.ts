import { v4 as uuidv4 } from "uuid";
import { resolveAssetForObject } from "./assetService.js";
import { getMaterial } from "./materialService.js";
import { Material, SceneObject, Vector3 } from "../types/scene.js";
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

function getPrimitiveShape(name: string): "box" | "sphere" | "cylinder" {
  const normalizedName = name.toLowerCase();

  if (normalizedName.includes("can") || normalizedName.includes("bottle")) {
    return "cylinder";
  }

  if (normalizedName.includes("orb") || normalizedName.includes("sphere") || normalizedName.includes("globe")) {
    return "sphere";
  }

  if (normalizedName.includes("ice")) {
    return "box";
  }

  return "box";
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
  rawStyle?: string
): SceneObject {
  const { asset, confirmed } = resolveAssetForObject(name);
  const shape = getPrimitiveShape(name);
  const material = getMaterial(theme, materialPreset, lightingPreset, name, index, rawStyle);

  return {
    id: uuidv4(),
    type: asset ? "model" : "primitive",
    name,
    shape: asset && confirmed ? undefined : shape,
    asset: asset || null,
    asset_confirmed: asset ? confirmed : undefined,
    fallback_strategy: asset && !confirmed ? "procedural" : undefined,
    position: getObjectPosition(name, index, composition),
    rotation: getObjectRotation(name, index, composition),
    scale: getObjectScale(name, index, composition),
    material,
    render_hints: createRenderHints(asset && confirmed ? undefined : shape, asset, material)
  };
}

function createRenderHints(
  shape: SceneObject["shape"],
  asset: string | null,
  material: Material
): SceneObject["render_hints"] {
  return {
    segment_count: shape ? DEFAULT_SEGMENT_COUNT[shape] : undefined,
    texture_resolution: asset ? "high" : undefined,
    transparency_mode: typeof material.transmission === "number" && material.transmission > 0
      ? "physical"
      : "opaque"
  };
}
