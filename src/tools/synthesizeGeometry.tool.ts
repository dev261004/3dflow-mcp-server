import { z } from "zod";
import { buildSynthesisContract } from "../lib/synthesisContract.js";
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

Use this tool when:
- generate_r3f_code returns status "SYNTHESIS_REQUIRED"
- You want to pre-generate geometry before calling generate_r3f_code
- You want to inspect the synthesis constraints for an object before generating

This tool does NOT generate geometry itself. It returns the full synthesis_contract
with all constraints and instructions. The LLM orchestrating this server generates
the actual JSX geometry and passes it to generate_r3f_code via synthesized_components.
`,
  parameters: z.object({
    object_name: z.string(),
    style: z.enum(THEME_VALUES),
    material_preset: z.enum(MATERIAL_PRESET_VALUES),
    base_color: z.string().default("#e8edf8"),
    accent_color: z.string().default("#00F5FF"),
    object_id: z.string().optional()
  }),

  async execute(input: any) {
    const objectId = input.object_id ?? generateId();
    const contract = buildSynthesisContract({
      objectId,
      objectName: input.object_name,
      style: input.style,
      materialPreset: input.material_preset,
      baseColor: input.base_color,
      accentColor: input.accent_color
    });

    return createToolResult({
      synthesis_contract: contract,
      ready_to_generate: true,
      next_step: `Generate JSX geometry following synthesis_contract.constraints exactly. Then call generate_r3f_code with synthesized_components: { "${objectId}": "<your JSX>" }`
    });
  }
};
