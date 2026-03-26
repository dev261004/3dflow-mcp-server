import type { SceneData } from "./scene.types.js";

export type ExportFormat = "r3f" | "json";
export type ExportFramework = "nextjs" | "vite" | "plain";
export type ExportTyping = "none" | "typescript" | "prop-types";

interface ExportMetadataOptions {
  exported_at?: string;
  scene_data?: SceneData;
}

export interface ExportR3FOptions extends ExportMetadataOptions {
  filename?: string;
  framework?: ExportFramework;
  typing?: ExportTyping;
}

export interface ExportJSONOptions extends ExportMetadataOptions {
  filename?: string;
}

export interface ExportedFile {
  status: "SUCCESS";
  file_name: string;
  mime_type: string;
  content: string;
  format: ExportFormat;
  byte_size: number;
  download_ready: true;
  metadata: {
    exported_at: string;
    framework?: ExportFramework;
    typing?: ExportTyping;
    scene_id?: string;
    line_count?: number;
  };
}

export interface ExportError {
  status: "ERROR";
  error: string;
  hint: string;
}

export type ExportResult = ExportedFile | ExportError;
