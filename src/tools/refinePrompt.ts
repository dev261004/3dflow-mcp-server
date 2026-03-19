import { z } from "zod";

export const refinePromptTool = {
  name: "refine_prompt",
  description: "Refine user prompt and extract structured context",

  inputSchema: z.object({
    user_prompt: z.string()
  }),

  async execute({ user_prompt }: { user_prompt: string }) {
    // Basic logic (we improve later)

    let use_case = "unknown";

    if (user_prompt.toLowerCase().includes("ad")) {
      use_case = "advertisement";
    } else if (user_prompt.toLowerCase().includes("website")) {
      use_case = "website";
    }

    return {
      refined_prompt: user_prompt,
      context: {
        use_case,
        style: "default",
        animation: "basic"
      }
    };
  }
};