import { v4 as uuidv4 } from "uuid";
import { resolveAssetForObject } from "./assetService.js";
import { getMaterial } from "./materialService.js";
import { Material, SceneObject, Vector3 } from "../types/scene.js";
import {
  CompositionPresetToken,
  MaterialPresetToken,
  ThemeToken
} from "../types/designTokens.js";

const LAYOUT_POSITIONS: Record<CompositionPresetToken, Vector3[]> = {
  hero_centered: [
    [0, 0, 0],
    [-1.5, -0.15, 0.2],
    [1.5, 0.15, 0.2]
  ],
  floating_showcase: [
    [0, 0.35, 0],
    [-1.2, -0.3, -0.2],
    [1.2, 0.4, -0.3]
  ],
  product_closeup: [
    [0, 0, 0],
    [-1.1, -0.25, -0.35],
    [1.1, 0.2, -0.35]
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

function getObjectPosition(index: number, composition: CompositionPresetToken): Vector3 {
  return LAYOUT_POSITIONS[composition][index] ?? [0, 0, index];
}

function getObjectScale(index: number, composition: CompositionPresetToken): Vector3 {
  if (index === 0 && composition === "product_closeup") {
    return [1.15, 1.15, 1.15];
  }

  if (index === 0 && composition === "floating_showcase") {
    return [1.05, 1.05, 1.05];
  }

  return [1, 1, 1];
}

export function createObject(
  name: string,
  theme: ThemeToken,
  materialPreset: MaterialPresetToken,
  composition: CompositionPresetToken,
  index: number,
  rawStyle?: string
): SceneObject {
  const { asset, confirmed } = resolveAssetForObject(name);
  const shape = getPrimitiveShape(name);
  const material = getMaterial(theme, materialPreset, name, index, rawStyle);

  return {
    id: uuidv4(),
    type: asset ? "model" : "primitive",
    name,
    shape: asset && confirmed ? undefined : shape,
    asset: asset || null,
    asset_confirmed: asset ? confirmed : undefined,
    position: getObjectPosition(index, composition),
    rotation: [0, 0, 0],
    scale: getObjectScale(index, composition),
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
