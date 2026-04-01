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

const synthesizeGeometrySchema = z.preprocess((value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  const rawInput = value as Record<string, unknown>;

  return {
    ...rawInput,
    __complexity_explicit: Object.prototype.hasOwnProperty.call(rawInput, "complexity")
  };
}, z.object({
  object_name: z.string(),
  style: z.enum(THEME_VALUES),
  material_preset: z.enum(MATERIAL_PRESET_VALUES),
  base_color: z.string().default("#e8edf8"),
  accent_color: z.string().default("#00F5FF"),
  object_id: z.string().optional(),
  complexity: z
    .enum(COMPLEXITY_TIER_VALUES)
    .default("medium")
    .describe(`Controls mesh part count and geometry detail.
low    = 4-7 parts, mobile banners, thumbnails.
medium = 10-20 parts, website sections, widgets.
high   = 28+ parts, hero sections, showcase scenes.
Defaults to medium if not provided. Automatically overrides to low
when target is mobile and complexity is not explicitly set.`),
  target: z
    .enum(SYNTHESIS_TARGET_VALUES)
    .optional()
    .describe(`Optional. When "mobile" is set and complexity is not explicitly provided, complexity defaults to "low" automatically.`)
}).passthrough());

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
  parameters: synthesizeGeometrySchema,

  async execute(input: z.infer<typeof synthesizeGeometrySchema> & { __complexity_explicit?: boolean }) {
    const objectId = input.object_id ?? generateId();
    const resolvedComplexity =
      input.target === "mobile" && input.__complexity_explicit !== true
        ? resolveDefaultComplexity(undefined, undefined, input.target)
        : input.complexity;
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
    const warnings = contract.category === "unknown"
      ? [
          `Category could not be determined for object '${input.object_name}'. Using generic fallback bounding box and assembly hint. Consider using a more specific object name.`
        ]
      : [];

    return createToolResult({
      synthesis_contract: contract,
      ready_to_generate: true,
      warnings,
      next_step: `Generate JSX geometry following synthesis_contract.constraints exactly. Then call generate_r3f_code with parameters: scene_data (object), synthesized_components (object mapping object_id -> JSX string, for example { "${objectId}": "<your JSX>" }), framework (string: nextjs|vite|plain), typing (string: none|typescript|prop-types).`
    });
  }
};
