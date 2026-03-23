import { normalizeDesignTokens } from "../types/designTokens.js";
import { extractObjectHints } from "./promptRefiner.js";

export const MAX_SCENE_PLAN_OBJECTS = 4;

const INVALID_OBJECTS = [
  "light",
  "lighting",
  "glow",
  "particles",
  "smoke",
  "sparkles",
  "shadow",
  "background",
  "website",
  "hero",
  "section"
];

function filterObjects(objects: string[]) {
  return objects.filter((obj) => !INVALID_OBJECTS.includes(obj.toLowerCase()));
}

function normalizeObjectHints(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function normalizeConfirmedObjects(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .flatMap((item) => extractObjectHints(item))
    .filter(Boolean);
}

export function createScenePlan(prompt: string, context: Record<string, unknown> = {}) {
  const designTokens = normalizeDesignTokens(context.design_tokens, {
    use_case: context.use_case,
    style: context.style,
    animation: context.animation
  });

  const confirmedObjects = normalizeConfirmedObjects(context.confirmed_objects);
  const objectHints = normalizeObjectHints(context.object_hints);
  const extractedObjects =
    confirmedObjects.length > 0
      ? confirmedObjects
      : objectHints.length > 0
        ? objectHints
        : extractObjectHints(prompt);
  const cleanedObjects = [...new Set(filterObjects(extractedObjects))];

  return {
    objects: cleanedObjects.length > 0 ? cleanedObjects : ["product"],
    style: designTokens.theme,
    use_case: designTokens.use_case,
    animation: designTokens.animation,
    design_tokens: designTokens
  };
}
