import { FastMCP } from "fastmcp";
import { refinePromptTool } from "./refinePrompt.tool.js";
import { generateScenePlanTool } from "./generateScenePlan.tool.js";
import { generateSceneTool } from "./generateScene.tool.js";
import { previewTool } from "./preview.tool.js";
import { optimizeForWebTool } from "./optimizeForWeb.tool.js";
import { generateR3FTool } from "./generateR3F.tool.js";
import { applyAnimationTool } from "./applyAnimation.tool.js";
import { exportAssetTool } from "./export_asset.tool.js";
import { integrationHelpTool } from "./integrationHelp.tool.js";
import { editSceneTool } from "./editScene.tool.js";
import { synthesizeGeometryTool } from "./synthesizeGeometry.tool.js";

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
