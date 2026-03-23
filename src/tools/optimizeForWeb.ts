import { z } from "zod";
import { optimizeScene } from "../services/sceneOptimizer.js";
import { SceneData } from "../types/scene.js";
import { createToolResult, unwrapToolPayload } from "../utils/toolPayload.js";

export const optimizeForWebTool = {
  name: "optimize_for_web",
  description: `
Optimize a 3D scene for web performance.

Your job:
- Reduce rendering cost
- Ensure smooth performance on web and mobile
- Analyze scene cost before and after optimization
- Report every optimization decision

Rules:
- Do NOT change scene intent
- Do NOT remove main object
- Only simplify and optimize

Optimizations include:
- reducing object count
- simplifying materials
- adjusting lighting
- improving performance
- capping heavy geometry / particle settings for mobile
- returning a detailed optimization report
`,

  parameters: z.object({
    scene_data: z.any(),
    target: z.enum(["desktop", "mobile"]).optional()
  }),

  async execute({ scene_data, target }: any) {
    const normalizedScene = unwrapToolPayload<SceneData>(scene_data, "scene_data");
    const optimized = optimizeScene(normalizedScene, target || "desktop");

    return createToolResult({
      optimized_scene: optimized.optimized_scene,
      report: optimized.report
    });
  }
};
