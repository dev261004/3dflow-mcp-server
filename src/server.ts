import "dotenv/config";
import { FastMCP } from "fastmcp";
import { registerTools } from "./tools/index.js";
import process from "node:process";

const server = new FastMCP({
  name: "3d-scene-mcp",
  version: "1.0.0"
});

// Register all tools
registerTools(server);

const transport = process.env.MCP_TRANSPORT ?? "stdio";

if (transport === "http") {
  const port = Number(process.env.PORT ?? "8080");

  server.start({
    transportType: "httpStream",
    httpStream: {
      port
    }
  });

  console.log(`Web3D MCP server running over HTTP on http://localhost:${port}/mcp`);
} else {
  server.start({
    transportType: "stdio"
  });
}
