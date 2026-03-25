import type { SceneData, Vector3 } from "./scene.types.js";

export type PreviewView = "top" | "front" | "side";
export type PreviewCheckStatus = "PASS" | "WARN" | "FAIL";

export interface PreviewLight {
  id: string;
  type: "ambient" | "spot" | "directional" | "point";
  intensity: number;
  color: string;
  position?: Vector3;
}

export type PreviewSceneObject = SceneData["objects"][number];

export interface PreviewSceneData extends Omit<SceneData, "lighting" | "objects"> {
  lighting: PreviewLight[];
  objects: PreviewSceneObject[];
}

export interface PreviewSpatialValidationCheck {
  id: string;
  label: string;
  status: PreviewCheckStatus;
  detail: string;
}

export interface PreviewSpatialValidation {
  checks: PreviewSpatialValidationCheck[];
  passed: number;
  total: number;
  confidence_score: number;
  recommendation: string;
}

export interface PreviewTextDescription {
  scene_overview: string;
  objects: string[];
  lighting_summary: string;
  animation_summary: string[];
  spatial_validation: PreviewSpatialValidation;
}

export interface PreviewResult {
  preview_id: string;
  scene_id: string;
  generated_at: string;
  svg_wireframe: string;
  text_description: PreviewTextDescription;
  scene_data: PreviewSceneData;
}

export interface PreviewGenerationOptions {
  previewId?: string;
  generatedAt?: string;
}
