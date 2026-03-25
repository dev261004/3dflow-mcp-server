import { z } from "zod";
import { buildSynthesisContract } from "../lib/synthesisContract.js";
import {
  COMPLEXITY_TIER_VALUES,
  SYNTHESIS_TARGET_VALUES,
  resolveDefaultComplexity
} from "../lib/complexity.profiles.js";
import {
  MATERIAL_PRESET_VALUES,
  THEME_VALUES
} from "../lib/designTokens.js";
import { createToolResult } from "../utils/toolPayload.js";
import { generateId } from "../utils/idGenerator.js";

export const synthesizeGeometryTool = {
  name: "synthesize_geometry",
  description: `
Explicitly request a synthesis contract for a named 3D object.

Use this tool when generate_r3f_code returns status SYNTHESIS_REQUIRED,
or to pre-generate geometry constraints before calling generate_r3f_code.

Complexity tiers:
  low    — 4 to 7 parts. Only Box, Sphere, Cylinder geometries.
           Best for: mobile banners, thumbnails, low-end devices.
  medium — 10 to 20 parts. Adds Capsule and Torus geometries.
           Best for: website sections, embedded widgets, tablets.
  high   — 28+ parts. All geometries. Full emissive detail.
           Best for: hero sections, desktop showcase, ad campaigns.

If target is set to "mobile" and complexity is not explicitly provided,
complexity defaults to "low" automatically.

This tool does NOT generate geometry. It returns the synthesis_contract
with constraints calibrated to the requested complexity tier. The LLM
generates the actual JSX and passes it to generate_r3f_code via 
synthesized_components.
`,
  parameters: z.object({
    object_name: z.string(),
    style: z.enum(THEME_VALUES),
    material_preset: z.enum(MATERIAL_PRESET_VALUES),
    base_color: z.string().default("#e8edf8"),
    accent_color: z.string().default("#00F5FF"),
    object_id: z.string().optional(),
    complexity: z
      .enum(COMPLEXITY_TIER_VALUES)
      .optional()
      .describe(`Controls mesh part count and geometry detail.
low    = 4-7 parts, mobile banners, thumbnails.
medium = 10-20 parts, website sections, widgets.
high   = 28+ parts, hero sections, showcase scenes.`),
    target: z
      .enum(SYNTHESIS_TARGET_VALUES)
      .optional()
      .describe(`Optional. When "mobile" is set and complexity is not explicitly provided, complexity defaults to "low" automatically.`)
  }),

  async execute(input: any) {
    const objectId = input.object_id ?? generateId();
    const resolvedComplexity =
      input.complexity ??
      (input.target === "mobile" ? resolveDefaultComplexity(undefined, undefined, input.target) : "high");
    const contract = buildSynthesisContract({
      objectId,
      objectName: input.object_name,
      style: input.style,
      materialPreset: input.material_preset,
      baseColor: input.base_color,
      accentColor: input.accent_color,
      complexity: resolvedComplexity,
      target: input.target
    });

    return createToolResult({
      synthesis_contract: contract,
      ready_to_generate: true,
      next_step: `Generate JSX geometry following synthesis_contract.constraints exactly. Then call generate_r3f_code with synthesized_components: { "${objectId}": "<your JSX>" }`
    });
  }
};
