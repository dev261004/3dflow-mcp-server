import type { SceneData } from "../types/scene.types.js";
import type { ExportFormat } from "../types/export-asset.types.js";

function stripKnownExtension(value: string): string {
  return value.replace(/\.(tsx|json)$/i, "");
}

function sanitizeExplicitFileStem(value: string): string {
  return stripKnownExtension(value)
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^A-Za-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function toKebabCase(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "scene";
}

export function resolveFileName(
  format: ExportFormat,
  filename?: string,
  scene_data?: SceneData
): string {
  const extension = format === "r3f" ? ".tsx" : ".json";
  const explicitStem = typeof filename === "string" ? sanitizeExplicitFileStem(filename) : "";

  if (explicitStem) {
    return `${explicitStem}${extension}`;
  }

  const title = typeof scene_data?.metadata?.title === "string" ? scene_data.metadata.title : "";

  if (title.trim()) {
    return `${toKebabCase(title)}${extension}`;
  }

  return `scene${extension}`;
}
