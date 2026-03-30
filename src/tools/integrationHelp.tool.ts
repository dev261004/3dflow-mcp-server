import { z } from "zod";
import { getIntegrationHelp } from "../services/integrationService.js";
import { createToolResult } from "../utils/toolPayload.js";

const integrationHelpSchema = z.object({
  platform: z.enum(["react", "nextjs", "html"]),
  format: z.enum(["r3f", "json"]).optional(),
  router: z.enum(["app_router", "pages_router"]).optional()
}).superRefine((value, ctx) => {
  if (value.platform === "nextjs" && !value.router) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["router"],
      message: "router is required when platform is nextjs.\nPass app_router or pages_router."
    });
  }
});

export const integrationHelpTool = {
  name: "integration_help",
  description: `
Provide guidance on how to integrate a generated 3D scene into an application.

Your job:
- Explain how to use exported assets
- Provide step-by-step instructions
- Include code examples when helpful

Supported platforms:
- react (React Three Fiber)
- nextjs
- html (basic usage)

Next.js router modes:
- app_router
- pages_router

router parameter:
- Required when platform is nextjs. Omitting this when platform is
  nextjs will cause a validation error. Default for non-nextjs
  platforms: not applicable.

Rules:
- Keep instructions simple and practical
- Focus on helping user run the scene quickly
`,

  parameters: integrationHelpSchema,

  async execute({ platform, format, router }: z.infer<typeof integrationHelpSchema>) {
    const help = getIntegrationHelp(platform, format || "r3f", router);

    return createToolResult({
      integration_guide: help
    });
  }
};
