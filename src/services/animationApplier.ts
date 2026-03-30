import type { SceneData } from "../types/scene.types.js";
import { buildApplyAnimationOutput } from "../tools/applyAnimation.tool.js";

export function applyAnimation(scene: SceneData, type: "rotate" | "float" | "pulse" | "bounce") {
  const result = buildApplyAnimationOutput({
    scene_data: scene,
    animation_type: type,
    merge: true
  });

  return result.status === "SUCCESS" ? result.scene_data : scene;
}
