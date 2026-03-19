import { FastMCP } from "fastmcp";
import { registerTools } from "./tools";

const server = new FastMCP({
  name: "3d-scene-mcp",
  version: "1.0.0"
});

// Register all tools
registerTools(server);

// Start server
server.start();