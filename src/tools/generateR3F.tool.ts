import { z } from "zod";
import { handleGenerateR3FCode } from "../services/r3fGenerator.js";
import { SceneData } from "../types/scene.types.js";
import { createToolResult, unwrapToolPayload } from "../utils/toolPayload.js";

export const generateR3FTool = {
  name: "generate_r3f_code",
  description: `
Convert structured scene data into React Three Fiber code.

Returns a complete React component that renders the scene.

Material translation:
- glass / glass_frost → MeshTransmissionMaterial (drei)
- metal / metal_chrome → meshPhysicalMaterial with metalness:1
- neon / high emissive → meshStandardMaterial with emissive + companion pointLight
- matte / standard → meshStandardMaterial

Framework support:
- "nextjs" adds "use client" directive (required for App Router)
- "vite" / "plain" omit it
`,

  parameters: z.object({
    scene_data: z.any(),
    typing: z.enum(["none", "typescript", "prop-types"]).optional(),
    framework: z.enum(["nextjs", "vite", "plain"]).optional(),
    synthesized_components: z.record(z.string(), z.string()).optional()
  }),

  async execute({ scene_data, typing, framework, synthesized_components }: any) {
    const normalizedScene = unwrapToolPayload<SceneData>(scene_data, "scene_data");
    const result = handleGenerateR3FCode(normalizedScene, {
      typing: typing || "none",
      framework: framework || "plain",
      synthesized_components
    });

    return createToolResult(result);
  }
};
