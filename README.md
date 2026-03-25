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

## validate_scene

### When to call it

Call `validate_scene` after `generate_scene` and before `synthesize_geometry`. It acts as a defensive gate that catches malformed scene data, broken animation targets, out-of-bounds objects, and unresolved synthesis contracts before code generation.

### What it checks

| Rule ID | Category | Severity | Description |
| --- | --- | --- | --- |
| S1 | Structure | error | `scene_id` exists and is non-empty |
| S2 | Structure | error | `objects` array exists and contains at least one object |
| S3 | Structure | error | camera position is a valid `[x, y, z]` number array |
| S4 | Structure | warn | camera Z is not too close to the scene |
| O1 | Objects | error | every object has a usable string `id` |
| O2 | Objects | error | every object has a valid finite position vector |
| O3 | Objects | warn | objects stay within recommended camera-frustum bounds |
| O4 | Objects | warn | objects do not overlap at nearly identical XZ positions |
| O5 | Objects | warn | no unresolved `SYNTHESIS_REQUIRED` contracts remain |
| L1 | Lighting | warn | at least one non-ambient light is present |
| L2 | Lighting | warn | light intensity values stay in a sane range |
| A1 | Animation | error | every `target_id` resolves to a real object id |
| A2 | Animation | warn | animation configs include the required fields per type |

### Reading the output

- `is_valid` is `false` when any error-level rule fails.
- `summary` shows how many rules passed, warned, or failed as errors.
- `errors_detail` is the required-fix list for blocked scenes.
- `next_step` tells the orchestrator whether to stop, review warnings, or continue into synthesis/codegen.

### Strict mode

Use `strict: true` when you want warning-level issues to block progress too. This is useful for CI checks, production exports, or workflows where even layout/lighting warnings should be fixed before generating code.

### Fix → Re-validate loop

```text
generate_scene
  -> validate_scene
    -> if BLOCKED: edit_scene
      -> validate_scene
        -> synthesize_geometry
          -> generate_r3f_code
```
