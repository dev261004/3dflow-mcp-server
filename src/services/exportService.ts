import { generateR3FCode, R3FTypingMode } from "./r3fGenerator.js";
import { SceneData } from "../types/scene.js";

interface ExportSceneOptions {
  typing?: R3FTypingMode;
}

export function exportScene(scene: SceneData, format: string, options: ExportSceneOptions = {}) {
  // 🟢 R3F EXPORT
  if (format === "r3f") {
    const code = generateR3FCode(scene, {
      typing: options.typing ?? "none"
    });

    return {
      type: "r3f",
      language: options.typing === "typescript" ? "tsx" : "jsx",
      content: code
    };
  }

  // 🔵 JSON EXPORT
  if (format === "json") {
    return {
      type: "json",
      content: JSON.stringify(scene, null, 2)
    };
  }

  // 🟡 PREVIEW EXPORT (MVP FAKE)
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
