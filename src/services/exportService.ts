import type { SceneData } from "../types/scene.types.js";
import type {
  ExportJSONOptions,
  ExportR3FOptions,
  ExportedFile
} from "../types/export-asset.types.js";
import { resolveFileName } from "../utils/export.utils.js";

const FALLBACK_EXPORTED_AT = "1970-01-01T00:00:00.000Z";

function resolveExportedAt(options: { exported_at?: string; scene_data?: SceneData }): string {
  if (typeof options.exported_at === "string" && options.exported_at.trim()) {
    return options.exported_at;
  }

  if (typeof options.scene_data?.metadata?.created_at === "string" && options.scene_data.metadata.created_at.trim()) {
    return options.scene_data.metadata.created_at;
  }

  return FALLBACK_EXPORTED_AT;
}

export function exportR3F(r3f_code: string, options: ExportR3FOptions): ExportedFile {
  const file_name = resolveFileName("r3f", options.filename, options.scene_data);

  return {
    status: "SUCCESS",
    file_name,
    mime_type: "text/plain",
    content: r3f_code,
    format: "r3f",
    byte_size: r3f_code.length,
    download_ready: true,
    metadata: {
      exported_at: resolveExportedAt(options),
      framework: options.framework ?? "plain",
      typing: options.typing ?? "none",
      scene_id: options.scene_data?.scene_id,
      line_count: r3f_code.split("\n").length
    }
  };
}

export function exportJSON(scene_data: SceneData, options: ExportJSONOptions): ExportedFile {
  const content = JSON.stringify(scene_data, null, 2);

  return {
    status: "SUCCESS",
    file_name: resolveFileName("json", options.filename, scene_data),
    mime_type: "application/json",
    content,
    format: "json",
    byte_size: content.length,
    download_ready: true,
    metadata: {
      exported_at: resolveExportedAt({
        exported_at: options.exported_at,
        scene_data
      }),
      scene_id: scene_data.scene_id
    }
  };
}
