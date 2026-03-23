import type { DesignTokens } from "./designTokens.js";

export type Vector3 = [number, number, number];
export type AnimationAxis = "x" | "y" | "z";
export type TextureResolution = "high" | "medium" | "low";
export type TransparencyMode = "physical" | "approximate" | "opaque";

export interface Material {
  type: "glass" | "metal" | "matte" | "standard";
  color: string;
  metalness?: number;
  roughness?: number;
  transmission?: number;
  emissive?: string;
  emissiveIntensity?: number;
  flatShading?: boolean;
  envMapIntensity?: number;
}

export interface RenderHints {
  segment_count?: number;
  particle_count?: number;
  texture_resolution?: TextureResolution;
  transparency_mode?: TransparencyMode;
  instancing_recommended?: boolean;
}

export interface SceneObject {
  id: string;
  type: "model" | "primitive";
  name?: string;
  shape?: "box" | "sphere" | "cylinder";
  asset?: string | null;
  asset_confirmed?: boolean;
  fallback_strategy?: "procedural";
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
  material: Material;
  render_hints?: RenderHints;
}

export interface Light {
  id: string;
  type: "ambient" | "spot" | "directional";
  intensity: number;
  color: string;
  position?: Vector3;
}

export interface Animation {
  id: string;
  target: string;
  target_id?: string;
  type: "float" | "rotate" | "pulse" | "bounce";
  config:
    | {
        amplitude: number;
        speed: number;
        axis: AnimationAxis;
      }
    | {
        speed: number;
        axis: AnimationAxis;
        range: number;
      }
    | {
        scale_range: [number, number];
        speed: number;
      };
  loop: boolean;
}

export interface SceneData {
  scene_id: string;
  notes?: string[];

  metadata: {
    title: string;
    use_case: string;
    style: string;
    design_tokens?: DesignTokens;
    created_at: string;
  };

  environment: {
    background: {
      type: "color";
      value: string;
    };
  };

  camera: {
    type: "perspective";
    position: Vector3;
    fov: number;
    target: Vector3;
  };

  lighting: Light[];
  objects: SceneObject[];
  animations: Animation[];
}
