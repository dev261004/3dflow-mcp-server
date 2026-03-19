import { z } from "zod";
import { createScenePlan } from "../services/scenePlanner";

export const generateScenePlanTool = {
  name: "generate_scene_plan",
  description: "Generate structured scene plan from prompt",

  inputSchema: z.object({
    refined_prompt: z.string(),
    context: z.any()
  }),

  async execute({ refined_prompt, context }: any) {
    const scenePlan = createScenePlan(refined_prompt, context);

    return {
      scene_plan: scenePlan
    };
  }
};