import { z } from "zod";
import { exportJSON, exportR3F } from "../services/exportService.js";
import type { ExportError } from "../types/export-asset.types.js";
import type { SceneData } from "../types/scene.types.js";
import { createToolResult, unwrapToolPayload } from "../utils/toolPayload.js";

const EXPORT_ASSET_DESCRIPTION = `Package generated 3D scene output into downloadable files.

Formats:
  r3f  -> Packages R3F code into a named .tsx file.
          Requires r3f_code string from generate_r3f_code.
          Does NOT regenerate code - it packages what you give it.

  json -> Packages scene_data into a named .json file.
          Requires scene_data object from generate_scene.

Call order:
  For .tsx file:
    generate_r3f_code(scene_data) -> export_asset({ r3f_code, format: "r3f" })

  For .json file:
    generate_scene(scene_plan)    -> export_asset({ scene_data, format: "json" })

For visual preview of the scene layout, use the preview tool instead.
preview tool returns SVG wireframe + spatial validation.
export_asset does not generate previews.

Do NOT pass synthesized_components to export_asset.
Pass them to generate_r3f_code, then pass the resulting r3f_code here.
`;

const exportAssetSchema = z
  .object({
    format: z.enum(["r3f", "json"]),
    r3f_code: z.string().optional(),
    scene_data: z.any().optional(),
    filename: z.string().optional(),
    framework: z.enum(["nextjs", "vite", "plain"]).default("plain"),
    typing: z.enum(["none", "typescript", "prop-types"]).default("none")
  })
  .passthrough();

function buildError(error: string, hint: string): ExportError {
  return {
    status: "ERROR",
    error,
    hint
  };
}

function tryNormalizeSceneData(scene_data: unknown): SceneData | undefined {
  try {
    const unwrapped = unwrapToolPayload<SceneData>(scene_data, "scene_data");

    if (!unwrapped || typeof unwrapped !== "object" || Array.isArray(unwrapped)) {
      return undefined;
    }

    return unwrapped;
  } catch {
    return undefined;
  }
}

export const exportAssetTool = {
  name: "export_asset",
  description: EXPORT_ASSET_DESCRIPTION,
  parameters: exportAssetSchema,

  async execute(input: unknown) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return createToolResult(
        buildError("Invalid export_asset input.", "Provide an object with format and payload fields.")
      );
    }

    const rawInput = input as Record<string, unknown>;

    if ("synthesized_components" in rawInput) {
      return createToolResult(
        buildError(
          "synthesized_components is no longer accepted by export_asset. Pass them to generate_r3f_code instead, then pass the resulting r3f_code string to export_asset.",
          "generate_r3f_code({ scene_data, synthesized_components }) -> export_asset({ r3f_code: result.r3f_code, format: 'r3f' })"
        )
      );
    }

    const parsed = exportAssetSchema.safeParse(rawInput);

    if (!parsed.success) {
      return createToolResult(
        buildError(
          "Invalid export_asset input.",
          parsed.error.issues[0]?.message ?? "Check the export_asset schema and required fields."
        )
      );
    }

    const { format, r3f_code, scene_data, filename, framework, typing } = parsed.data;
    const exported_at = new Date().toISOString();

    if (format === "r3f") {
      if (typeof r3f_code !== "string" || !r3f_code.trim()) {
        return createToolResult(
          buildError(
            "r3f format requires r3f_code string input. Call generate_r3f_code first, then pass its output as r3f_code to export_asset.",
            "Pipeline: generate_r3f_code(scene_data) -> export_asset({ r3f_code, format: 'r3f' })"
          )
        );
      }

      if (r3f_code.trim().length < 50) {
        return createToolResult(
          buildError(
            "r3f_code appears to be empty or too short to be valid TSX.",
            "Ensure generate_r3f_code returned status SUCCESS before passing its output to export_asset."
          )
        );
      }

      return createToolResult(
        exportR3F(r3f_code, {
          filename,
          framework,
          typing,
          exported_at,
          scene_data: tryNormalizeSceneData(scene_data)
        })
      );
    }

    if (scene_data == null) {
      return createToolResult(
        buildError(
          "json format requires scene_data object input.",
          "Pipeline: generate_scene(scene_plan) -> export_asset({ scene_data, format: 'json' })"
        )
      );
    }

    const normalizedScene = tryNormalizeSceneData(scene_data);

    if (!normalizedScene) {
      return createToolResult(
        buildError(
          "json format requires scene_data object input.",
          "Pipeline: generate_scene(scene_plan) -> export_asset({ scene_data, format: 'json' })"
        )
      );
    }

    return createToolResult(
      exportJSON(normalizedScene, {
        filename,
        exported_at
      })
    );
  }
};
