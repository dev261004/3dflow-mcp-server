# Write: README.md for 3dflow-mcp-server

Write a complete, production-quality `README.md` for an MCP server called
**3dflow-mcp-server**. Follow the structure, tone, and conventions used by
well-maintained MCP servers (e.g. `@modelcontextprotocol/server-filesystem`,
`mcp-server-brave-search`). The file must be immediately usable — no
placeholders, no "TODO" sections, no generic filler text.

---

## Server identity

**Name:** `3dflow-mcp-server`
**Tagline:** Generate production-ready 3D scenes and React Three Fiber
components from natural language — directly inside your AI assistant.
**Purpose:** A pipeline of 11 tools that takes a plain-English prompt and
produces a fully animated, framework-ready `.tsx` / `.jsx` React Three Fiber
scene component. Covers everything from scene planning through geometry
synthesis, animation stacking, validation, code generation, and integration
guidance.

---

## Architecture — CRITICAL, must be prominently documented

This server is **hybrid**: it runs in two modes and the README must clearly
document both.

### Mode 1 — Local (stdio transport)
Runs as a child process on the developer's machine. Claude Desktop and other
MCP clients connect via `stdio`. Best for local development and personal use.

### Mode 2 — Remote (HTTP / SSE transport)
The server can be deployed to any Node.js host (Railway, Render, Fly.io,
a VPS, etc.) and accessed over the network via HTTP + Server-Sent Events.
Remote clients connect with a URL instead of a local command. Best for
shared team usage, production deployments, and browser-based MCP clients.

The README must include a dedicated **"Deployment"** section that covers:
- How to build and run the server on a remote host
- What environment variables are needed
- How a remote MCP client connects (the URL format)
- A note that the owner will be deploying this themselves (no hosted URL
  is provided by default — users must self-host or use the local mode)

---

## The 11 tools — document every one

Each tool must get its own subsection in a **"Tools"** section. Use this
exact information for each tool. Do not invent capabilities.

---

### 1. `generate_scene_plan`
**Purpose:** Parses a natural-language prompt into a structured scene plan.
Extracts physical objects (1–4 max), visual style, animation intent, and
use case. Applies a noise-word blocklist so adjectives, effects, and
scaffolding words ("secondary", "prop", "animations") are never treated
as objects.

**Key inputs:**
- `refined_prompt` — plain-language description of the scene
- `context` — optional object with `use_case` and `style` hints

**Key outputs:**
- `objects` — array of 1–4 physical object names (e.g. `["watch", "wallet"]`)
- `style` — one of: `premium`, `minimal`, `futuristic`, `playful`, `dark`
- `animation` — one of: `rotate`, `float`, `bounce`, `pulse`, `none`
- `use_case` — one of: `advertisement`, `website`, `showcase`, `general`
- `design_tokens` — propagated downstream to all other tools

**Rules enforced:**
- Max 4 objects
- Objects must be real physical nouns — lighting, effects, environment words
  are blocked
- Style is always a single token

---

### 2. `generate_scene`
**Purpose:** Converts a scene plan into fully structured `scene_data` — the
core data object consumed by every downstream tool. Sets up camera, lighting,
background, object positions, materials, and initial animations. Propagates
`design_tokens` through to `scene_data.metadata`.

**Key inputs:**
- `scene_plan` — output of `generate_scene_plan`

**Key outputs:**
- `scene_data` — complete scene object with `scene_id`, `objects`,
  `lighting`, `camera`, `environment`, `animations`, `metadata`
- Objects are returned as `synthesis_contract` types with bounding boxes,
  complexity tiers, and assembly hints calibrated to the object category
  (container, footwear, accessory, device, etc.)

**Category-aware bounding boxes (examples):**
- `watch` → `accessory` → `[0.05, 0.01, 0.05]`
- `wallet` → `container` → `[0.2, 0.01, 0.12]`
- `shoe` / `sneaker` → `footwear` → `[0.3, 0.12, 0.1]`
- `bottle` → `container` (tall) → `[0.12, 0.35, 0.12]`
- `phone` → `device` → `[0.075, 0.16, 0.008]`

---

### 3. `preview`
**Purpose:** Returns a spatial overview of the scene before any code is
generated. Used to catch positioning errors, overlapping objects, and
animation misconfigurations early.

**Key inputs:**
- `scene_data` — from `generate_scene` or `edit_scene`
- `view` — `"top"` | `"front"` | `"side"` (default: `"top"`)

**Key outputs:**
- `svg_wireframe` — 2D orthographic SVG showing objects, lights, camera
  frustum. Pending synthesis_contract objects render as category-correct
  dashed shapes (rect for containers, rounded rect for footwear/accessory,
  flat bar for surfaces) — never generic circles.
- `text_description` — scene overview, object list, lighting summary,
  animation summary
- `spatial_validation` — 6 automated checks (bounds, overlap, camera,
  lighting, synthesis status, animation targets) with a `confidence_score`
  (0–10) and a `recommendation` string

**Rule:** If `confidence_score < 7`, fix the issues with `edit_scene` before
proceeding.

---

### 4. `validate_scene`
**Purpose:** Runs 13 structural checks across 4 categories before code
generation is attempted.

**Check categories:**
- **S — Structure (4 rules):** `scene_id` present, objects array non-empty,
  camera position valid, camera not clipping
- **O — Objects (5 rules):** valid IDs, valid positions, within frustum
  bounds, no overlapping XZ positions, no unresolved synthesis contracts
- **L — Lighting (2 rules):** at least one non-ambient light, intensities
  in reasonable range
- **A — Animation (2 rules):** all `target_id` values resolve to real
  object IDs, animation configs have required fields

**Key inputs:**
- `scene_data`
- `strict` — boolean (default `false`). When `true`, warnings are promoted
  to errors. Useful for CI/CD pipelines.

**Key outputs:**
- `is_valid` — boolean
- `strict_mode` — echoed back in response
- `summary` — `{ passed, warnings, errors, promoted_to_error }`
- `errors_detail` — array of `{ rule_id, message, fix_hint }` for each failure
- `next_step` — exact plain-English instruction for what to do next.
  Prefixed with `[STRICT MODE]` when strict is true.

**Rule:** `is_valid: false` with `severity: "error"` blocks `generate_r3f_code`.
Must resolve via `edit_scene` and re-run `validate_scene`.

---

### 5. `edit_scene`
**Purpose:** Applies targeted natural-language edits to an existing
`scene_data` object. Used to fix validation errors and apply user
style changes without regenerating the whole scene.

**What it can modify:**
- Background colour (supports named colours: `"deep navy"`, `"warmer dark"`,
  `"charcoal"`, `"midnight"` and explicit hex values)
- Material for all objects or a named object
- Animation — add, replace, or remove animations on a named or primary object
- Position — move a named object
- Lighting — intensity adjustments (`"make it darker"`, `"increase ambient"`)

**Named-object targeting:** When the `edit_prompt` mentions a specific object
by name (e.g. `"add rotate to the watch"`), the animation targets that object.
Falls back to the primary object (`objects[0]`) when no object name is found.

**What it cannot do:**
- Add new objects (use `generate_scene` for this)
- Remove objects
- Change camera position or FOV

**Key outputs:**
- `scene_data` — updated scene
- `edit_summary.applied` — list of changes applied, including the target
  object name (e.g. `"animation → added bounce to watch"`)
- `edit_summary.skipped` — list of recognised intents that could not be
  applied, with a human-readable reason. No silent failures — every
  recognised edit intent appears in either `applied` or `skipped`.
- `edit_summary.warnings` — non-blocking notes

---

### 6. `apply_animation`
**Purpose:** Applies one or more animations to objects in a scene. Supports
stacking multiple animation types on the same object without axis conflicts.

**Animation types:** `rotate`, `float`, `bounce`, `pulse`

**Key inputs:**
- `scene_data`
- `animations` — array of animation entries, each with `type`, `target_id`,
  and optional `config` (`speed`, `amplitude`, `axis`, `range`,
  `scale_range`)
- `merge` — boolean (default `true`). When `true`, new animations are added
  alongside existing ones. When `false`, same-type animations on the same
  target are replaced.

**Conflict detection:** If two animations target the same axis on the same
object (e.g. `float` + `bounce` both on `position.y`), the conflict is
detected, reported in `channel_conflicts`, and the generated `useFrame` hook
merges both contributions into a single hook using additive offsets:
```js
position.y = baseY + floatY + bounceY;  // never uses +=
```

**Pulse config transparency:** The `pulse` animation accepts `amplitude`
as input. The output `config_after` preserves `amplitude` and also exposes
the derived `scale` and `scale_range` in a `_derived` sub-object so the
translation is fully visible.

**Key outputs:**
- `applied` — array of applied animations with `config_after`
- `channel_conflicts` — any same-axis conflicts detected
- `summary` — `{ total_applied, added, merged, replaced, had_conflicts }`
- `scene_data` — updated scene with all animations appended

---

### 7. `synthesize_geometry`
**Purpose:** Returns a detailed synthesis contract for a named 3D object.
The contract specifies geometry constraints, material instructions, assembly
hints, and bounding box — calibrated to the requested complexity tier. The
LLM uses these constraints to generate procedural JSX geometry, which is then
passed to `generate_r3f_code` via `synthesized_components`.

**Complexity tiers:**
| Tier | Parts | Best for |
|---|---|---|
| `low` | 4–7 | Mobile banners, thumbnails |
| `medium` | 10–20 | Website sections, widgets |
| `high` | 28+ | Hero sections, ad campaigns |

When `target: "mobile"` and `complexity` is not set, defaults to `"low"`
automatically.

**Key inputs:**
- `object_name` — e.g. `"watch"`, `"sneaker"`, `"bottle"`
- `style` — `premium` | `minimal` | `futuristic` | `playful` | `dark`
- `material_preset` — `matte_soft` | `glass_frost` | `glass_clear` |
  `metal_brushed` | `metal_chrome` | `plastic_gloss`
- `object_id` — optional, used to match object in downstream `scene_data`
- `complexity` — `low` | `medium` | `high`
- `target` — `mobile` | `desktop`
- `base_color`, `accent_color` — hex strings

**Key outputs:**
- `synthesis_contract` — includes `category`, `bounding_box`,
  `complexity_tier`, `min_parts`, `constraints` (geometry rules, material
  instructions, assembly hint, no-external-assets rule), `inject_into_tool`,
  `parameter_format`
- `warnings` — non-empty if category could not be determined
- `next_step` — includes the full `generate_r3f_code` parameter list so no
  separate `tool_search` call is needed

**Geometry constraints (all tiers):**
- Only standard Three.js geometries: `BoxGeometry`, `SphereGeometry`,
  `CylinderGeometry`, `CapsuleGeometry`, `TorusGeometry`, `ConeGeometry`,
  `PlaneGeometry`, `RingGeometry`
- No `useGLTF`, no external URLs, no custom buffer geometries
- Root `<group>` must use `React.forwardRef`
- Only `meshStandardMaterial` and `meshPhysicalMaterial` — no `ShaderMaterial`

---

### 8. `generate_r3f_code`
**Purpose:** The final generation step. Takes `scene_data` and the
`synthesized_components` map (object ID → JSX string) and produces a
complete, ready-to-use React Three Fiber component file.

**Key inputs:**
- `scene_data` — from `generate_scene` or `edit_scene`
- `synthesized_components` — `Record<string, string>` mapping each object
  ID to its JSX forwardRef component string
- `framework` — `"nextjs"` | `"vite"` | `"plain"`
  - `"nextjs"` adds `"use client"` directive for App Router
- `typing` — `"none"` | `"typescript"` | `"prop-types"`

**Material translation:**
| Input material | Generated JSX |
|---|---|
| `glass` / `glass_frost` | `MeshTransmissionMaterial` (drei) |
| `metal` / `metal_chrome` | `meshPhysicalMaterial` with `metalness: 1` |
| High emissive | `meshStandardMaterial` + companion `pointLight` |
| Matte / standard | `meshStandardMaterial` |

**Animation code generation:**
- Same-axis animations (e.g. `float` + `bounce` on `position.y`) are
  merged into a single `useFrame` hook with additive contributions
- `bounce` always uses absolute assignment: `position.y = base + bounceY`
  — never `+=`
- `rotate` with `range >= Math.PI` generates continuous spin:
  `rotation.y = t * speed`

**Graceful degradation:** If a `synthesized_components` entry fails
verification (malformed JSX, missing `React.forwardRef`):
- A red wireframe placeholder mesh is rendered in its place
- The failure is recorded in `warnings[]`
- `status` returns `"PARTIAL_SUCCESS"` (not `"SUCCESS"`)
- `placeholder_object_count` reflects the actual count

**Key outputs:**
- `status` — `"SUCCESS"` | `"PARTIAL_SUCCESS"` | `"SYNTHESIS_REQUIRED"` |
  `"ERROR"`
- `r3f_code` — complete JSX/TSX component string
- `placeholder_object_count` — number of objects that fell back to
  red wireframe
- `synthesized_object_count` — total objects processed
- `warnings` — array of failure descriptions
- `language` — `"jsx"` or `"tsx"`

---

### 9. `export_asset`
**Purpose:** Packages generated output into a named downloadable file.

**Formats:**
- `r3f` — wraps `r3f_code` string into a `.tsx` file
- `json` — wraps `scene_data` into a `.json` file

**Call order:**
```
generate_r3f_code → export_asset({ r3f_code, format: "r3f" })
generate_scene    → export_asset({ scene_data, format: "json" })
```

Do NOT pass `synthesized_components` to `export_asset`. Pass them to
`generate_r3f_code` first, then pass the resulting `r3f_code` here.

---

### 10. `integration_help`
**Purpose:** Returns step-by-step instructions and code examples for
integrating the generated scene into a real application.

**Supported platforms:** `react`, `nextjs`, `html`

**Next.js specifics:**
- When `platform: "nextjs"`, the `router` parameter is required
- `router: "app_router"` — returns `"use client"` component with dynamic
  import + `ssr: false`
- `router: "pages_router"` — returns standard dynamic import pattern

**Returns:**
- `install_command` — npm install string
- Component file, page file, CSS height fix, `next.config.js` snippet
  (for Next.js)
- `performance_tips` — `<Preload all />`, `<PerformanceMonitor />`

---

### 11. `refine_prompt` *(utility)*
**Purpose:** Extracts structured design intent from a free-form user prompt.
Returns `design_tokens`, `object_hints`, and `color_hints` for use in
`generate_scene_plan`.

---

## The recommended pipeline

Document this pipeline clearly with a diagram or numbered steps:

```
1. generate_scene_plan   — parse prompt → scene plan
2. generate_scene        — scene plan → scene_data
3. preview               — scene_data → SVG wireframe + spatial validation
4. validate_scene        — scene_data → 13-check validation report
   └─ edit_scene         — fix validation errors if is_valid: false
5. apply_animation       — stack and merge animations (optional)
6. synthesize_geometry   — get constraints for each object
   └─ (LLM generates JSX geometry from the contract)
7. generate_r3f_code     — scene_data + JSX → complete React component
8. export_asset          — package as .tsx or .json file
9. integration_help      — get framework-specific setup instructions
```

`edit_scene` can be called at any point between steps 2–7 to apply style
changes, fix errors, or update animations.

---

## Installation

### Prerequisites
- Node.js 18+
- npm or pnpm

### Local setup (stdio transport)

```bash
git clone https://github.com/<owner>/3dflow-mcp-server.git
cd 3dflow-mcp-server
npm install
npm run build
```

#### Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "3dflow": {
      "command": "node",
      "args": ["/absolute/path/to/3dflow-mcp-server/dist/index.js"]
    }
  }
}
```

#### Cursor / other stdio clients
Use the same `command` + `args` pattern in your client's MCP server config.

---

## Deployment (remote / HTTP transport)

The server supports remote deployment over HTTP + SSE. The owner deploys
and manages their own instance — no hosted URL is provided by default.

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | HTTP port (default: `3000`) |
| `NODE_ENV` | No | Set to `production` for remote deployments |

### Run the server

```bash
npm run build
node dist/index.js
```

The server listens on `http://0.0.0.0:${PORT}`.

### Deploying to Railway / Render / Fly.io

1. Push the repo to GitHub.
2. Create a new project on your chosen platform and connect the repo.
3. Set `PORT` via the platform's environment variable UI if needed.
4. The platform runs `npm run build && node dist/index.js` (or configure
   the build and start commands manually).
5. Note the public URL assigned by the platform (e.g.
   `https://3dflow.up.railway.app`).

### Connecting a remote MCP client

Once deployed, configure your MCP client with the server URL:

```json
{
  "mcpServers": {
    "3dflow": {
      "url": "https://your-deployment-url.example.com/sse"
    }
  }
}
```

The SSE endpoint is `/sse`. The HTTP POST endpoint for tool calls is `/message`.

---

## Quick start example

Include a complete worked example showing all major tools in sequence.
Use a **premium watch advertisement** as the example scene. Show:

1. The `generate_scene_plan` call and its output
2. The `generate_scene` call and key fields in `scene_data`
3. The `validate_scene` call and `is_valid: true` result
4. The `apply_animation` call stacking `float` + `bounce` on `position.y`
   (showing the merged `useFrame` pattern)
5. The `generate_r3f_code` call with a minimal valid `synthesized_components`
   entry, and the `status: "SUCCESS"` response
6. The final generated component (first 20 lines only — don't reproduce
   the full file)

---

## Framework support matrix

| Framework | `framework` param | Notes |
|---|---|---|
| Plain React | `"plain"` | No directives added |
| Vite | `"vite"` | No directives added |
| Next.js App Router | `"nextjs"` | Adds `"use client"` directive |
| Next.js Pages Router | `"nextjs"` | Use `dynamic()` with `ssr: false` |

---

## TypeScript support

| `typing` param | Output |
|---|---|
| `"none"` (default) | Plain `.jsx` |
| `"typescript"` | `.tsx` with `Group \| Mesh` ref types |
| `"prop-types"` | `.jsx` with PropTypes block |

---

## Style presets

| Style | Visual feel | Typical materials |
|---|---|---|
| `premium` | Smooth, chrome, refined | `metal_chrome`, `plastic_gloss` |
| `minimal` | Clean, simple, open | `matte_soft` |
| `futuristic` | Sharp angles, neon accents | `metal_chrome` + emissive |
| `playful` | Rounded, bright, colourful | `plastic_gloss` |
| `dark` | Deep, moody, high contrast | `matte_soft` + low ambient |

---

## Animation reference

| Type | Property modified | Merge behaviour |
|---|---|---|
| `float` | `position.y` (or x/z) | Merged with `bounce` on same axis |
| `bounce` | `position.y` (or x/z) | Merged with `float` on same axis |
| `rotate` | `rotation.y` (or x/z) | Independent hook |
| `pulse` | `scale` (all axes) | Independent hook |

When `float` and `bounce` both target `position.y`, the generated code is:
```js
const floatY = Math.sin(t * speed) * amplitude;
const bounceY = Math.abs(Math.sin(t * speed)) * amplitude;
ref.current.position.y = baseY + floatY + bounceY;
```

---

## README formatting requirements

- Use `#` for the title, `##` for top-level sections, `###` for subsections
- Include a badge row near the top:
  `MCP` badge, `Node.js 18+` badge, `License: MIT` badge (use
  `https://img.shields.io` URL format)
- Use fenced code blocks with language tags (`json`, `bash`, `tsx`, `js`)
- Use tables for reference data (style presets, animation types, tool params)
- Keep all prose concise — prefer bullet points over long paragraphs
- Do not use placeholder text like `[YOUR URL HERE]` — use realistic
  example values like `https://your-deployment.up.railway.app`
- The README should be immediately copy-pasteable — no setup steps should
  require guessing