import { FastMCP } from "fastmcp";
import { refinePromptTool } from "./refinePrompt";
import { generateScenePlanTool } from "./generateScenePlan";

export function registerTools(server: FastMCP) {
  server.tool(refinePromptTool);
  server.tool(generateScenePlanTool);
}