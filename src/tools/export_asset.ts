import { z } from "zod";
import { exportScene } from "../services/exportService.js";
import { SceneData } from "../types/scene.js";
import { createToolResult, unwrapToolPayload } from "../utils/toolPayload.js";

export const exportAssetTool = {
  name: "export_asset",
  description: `
Export a 3D scene into usable formats.

Your job:
- Convert scene into a format that can be used outside the system

Supported formats:
- r3f → React Three Fiber component
- json → raw scene data
- preview → quick visual preview reference

Rules:
- Do NOT modify scene
- Only convert and package output
- For R3F exports, hooks must remain valid and assets need safe fallbacks
`,

  parameters: z.object({
    scene_data: z.any(),
    format: z.enum(["r3f", "json", "preview"]),
    typing: z.enum(["none", "typescript", "prop-types"]).optional(),
    framework: z.enum(["nextjs", "vite", "plain"]).optional(),
    synthesized_components: z.record(z.string(), z.string()).optional()
  }),

  async execute({ scene_data, format, typing, framework, synthesized_components }: any) {
    const normalizedScene = unwrapToolPayload<SceneData>(scene_data, "scene_data");
    const result = exportScene(normalizedScene, format, {
      typing: typing || "none",
      framework: framework || "plain",
      synthesized_components
    });

    return createToolResult(result);
  }
};
