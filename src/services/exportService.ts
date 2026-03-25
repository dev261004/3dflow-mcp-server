import {
  handleGenerateR3FCode,
  R3FFramework,
  R3FTypingMode
} from "./r3fGenerator.js";
import { SceneData } from "../types/scene.types.js";

interface ExportSceneOptions {
  typing?: R3FTypingMode;
  framework?: R3FFramework;
  synthesized_components?: Record<string, string>;
}

export function exportScene(scene: SceneData, format: string, options: ExportSceneOptions = {}) {
  if (format === "r3f") {
    return handleGenerateR3FCode(scene, {
      typing: options.typing ?? "none",
      framework: options.framework ?? "plain",
      synthesized_components: options.synthesized_components
    });
  }

  if (format === "json") {
    return {
      type: "json",
      content: JSON.stringify(scene, null, 2)
    };
  }

  if (format === "preview") {
    return {
      type: "preview",
      preview_url: `/preview/${scene.scene_id}`
    };
  }

  return {
    error: "Unsupported format"
  };
}
