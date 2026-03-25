# 3dflow-mcp-server
MCP server for 3D scene generation for web and ads. it's built 3d scene using react-three-fiber(R3F).

## Development

Run the MCP server over stdio:

```bash
npm run dev
```

Run the MCP server over HTTP for browser-based tools:

```bash
npm run dev:http
```

The HTTP transport listens on `http://localhost:8080/mcp` by default.

## Preview Tool

Call `preview` after `generate_scene` and before `synthesize_geometry`. It gives the LLM a quick validation step before committing to geometry synthesis and R3F code generation.

The tool returns:

- An inline SVG wireframe showing object placement, lights, the camera frustum, and pending-synthesis markers.
- A structured text description with scene overview, object list, lighting summary, animation summary, and spatial validation results.

The `confidence_score` is a 0-10 summary of the six automated validation checks:

- Higher scores mean the scene is positioned and connected well enough to move forward.
- Scores below `7` should be treated as a stop signal to fix layout, lighting, or animation-target issues before calling `generate_r3f_code`.

How to read validation results:

- `PASS` means the check is healthy and does not need intervention.
- `WARN` means the scene is still previewable, but there is a spatial or pipeline issue worth fixing.
- `FAIL` means the preview found a broken reference or a blocking issue that should be corrected before proceeding.

Recommended pipeline:

```text
refine_prompt
  -> generate_scene_plan
    -> generate_scene
      -> preview
        -> if READY: synthesize_geometry -> generate_r3f_code
        -> if WARN/FAIL: edit_scene -> preview again
```
