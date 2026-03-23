import { buildAnimations } from "./animationEngine.js";

export function applyAnimation(scene: any, type: string) {
  const updated = JSON.parse(JSON.stringify(scene));

  const mainObject = updated.objects[0];

  if (!mainObject) return updated;
  updated.animations = buildAnimations(updated.objects, type);

  return updated;
}
