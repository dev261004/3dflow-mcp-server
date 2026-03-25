import { FastMCP } from "fastmcp";
import { refinePromptTool } from "./refinePrompt.js";
import { generateScenePlanTool } from "./generateScenePlan.js";
import { generateSceneTool } from "./generateScene.js";
import { previewTool } from "./preview.tool.js";
import { optimizeForWebTool } from "./optimizeForWeb.js";
import { generateR3FTool } from "./generateR3F.js";
import { applyAnimationTool } from "./applyAnimation.js";
import { exportAssetTool } from "./export_asset.js";
import { integrationHelpTool } from "./integrationHelp.js";
import { editSceneTool } from "./editScene.js";
import { synthesizeGeometryTool } from "./synthesizeGeometry.js";

export function registerTools(server: FastMCP) {
  server.addTool(refinePromptTool);
  server.addTool(generateScenePlanTool);
  server.addTool(generateSceneTool);
  server.addTool(previewTool);
  server.addTool(editSceneTool);
  server.addTool(applyAnimationTool);
  server.addTool(optimizeForWebTool);
  server.addTool(generateR3FTool);
  server.addTool(exportAssetTool);
  server.addTool(synthesizeGeometryTool);
  server.addTool(integrationHelpTool);
}
