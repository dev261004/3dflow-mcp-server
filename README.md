# web3d-mcp-server

![MCP](https://img.shields.io/badge/MCP-Compatible-1f6feb) ![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933) ![License](https://img.shields.io/badge/License-MIT-yellow)
![TypeScript](https://img.shields.io/badge/TypeScript-Server%20Code-3178C6?logo=typescript&logoColor=white) ![FastMCP](https://img.shields.io/badge/FastMCP-MCP%20Runtime-111827) ![Zod](https://img.shields.io/badge/Zod-Validation-3E67B1)

MCP server for 3D scene generation for web and ads. it's built 3d scene using react-three-fiber(R3F).

`web3d-mcp-server` turns a plain-English prompt into a structured scene plan, validated `scene_data`, geometry synthesis contracts, framework-ready `.jsx` or `.tsx` React Three Fiber code, exportable assets, and integration guidance.

## Quick Navigation

| Start Here | Reference | Extra Docs |
| --- | --- | --- |
| [What It Does](#what-it-does) | [Recommended Pipeline](#recommended-pipeline) | [Quick Example](./quick_example.md) |
| [Who It Helps](#who-it-helps) | [Tools](#tools) | [Tool Information](./tool_information.md) |
| [Technologies](#technologies) | [Installation](#installation) | [Folder Structure](./folder_structure.md) |
| [Architecture](#architecture) | [Deployment](#deployment) | [Sample Prompts](./sample_prompt.md) |
| [Examples](#examples) | [Operational Notes](#operational-notes) | [License](#license) |

## What It Does

- Converts natural-language scene requests into a structured 3D workflow.
- Produces `scene_data` with camera, lighting, objects, materials, background, animations, and design tokens.
- Supports preview, validation, targeted editing, animation stacking, optimization, geometry synthesis, code generation, export, and integration help.
- Generates React Three Fiber scene components for plain React, Vite, and Next.js.
- Helps AI assistants follow a predictable, tool-based pipeline instead of generating raw 3D code from scratch.

## Who It Helps

- Frontend engineers building hero sections, landing pages, and product showcases.
- Design engineers prototyping interactive web visuals and ad concepts.
- AI application builders who want an MCP-based 3D scene workflow.
- Agencies and product teams that need faster concept-to-code iteration for 3D scenes.

## Technologies

### Core Stack

| Area | Technologies |
| --- | --- |
| Language | TypeScript |
| MCP runtime | FastMCP |
| Validation | Zod |
| Runtime | Node.js |
| Environment config | dotenv |
| Testing | Jest |
| Development workflow | nodemon, TypeScript compiler |

### Output Ecosystem

The server generates assets and guidance for:

- React Three Fiber
- Three.js
- `@react-three/drei`
- Next.js
- Vite
- plain React

## Architecture

This server is hybrid and supports two runtime modes.

### Local Mode: `stdio`

- Best for Claude Desktop, Cursor, and other local MCP clients.
- Runs as a child process on the developer machine.
- Ideal for local development and personal workflows.

### Remote Mode: HTTP Stream

- Best for shared teams, browser clients, and self-hosted deployments.
- Exposes the MCP endpoint at `/mcp`.
- Intended for self-hosting on Railway, Render, Fly.io, or any Node.js-capable server.

Implementation note:

- This repository uses FastMCP HTTP stream transport.
- Remote clients should connect to `https://your-deployment.example.com/mcp`.

## Recommended Pipeline

```text
optional: refine_prompt
  -> generate_scene_plan
  -> generate_scene
  -> preview
  -> validate_scene
     -> if blocked: edit_scene -> preview -> validate_scene
  -> optional: apply_animation
  -> optional: optimize_for_web
  -> synthesize_geometry
     -> LLM generates JSX that follows the contract
  -> generate_r3f_code
  -> export_asset
  -> integration_help
```

Notes:

- `edit_scene` can be used any time after `generate_scene` and before `generate_r3f_code`.
- `optimize_for_web` is optional but useful for mobile or performance-sensitive targets.
- `generate_r3f_code` can return `SYNTHESIS_REQUIRED`, `SUCCESS`, `PARTIAL_SUCCESS`, or `ERROR`.
- `PARTIAL_SUCCESS` means one or more objects fell back to a red wireframe placeholder.

## Tools

The server currently registers 12 tools.

| # | Tool | Primary role |
| --- | --- | --- |
| 1 | `refine_prompt` | Structure free-form creative intent |
| 2 | `generate_scene_plan` | Convert prompt into a scene plan |
| 3 | `generate_scene` | Build full `scene_data` |
| 4 | `preview` | Visualize layout and spatial quality |
| 5 | `validate_scene` | Run structural validation |
| 6 | `edit_scene` | Make targeted scene revisions |
| 7 | `apply_animation` | Add or merge animations |
| 8 | `optimize_for_web` | Reduce performance cost |
| 9 | `synthesize_geometry` | Create geometry contracts |
| 10 | `generate_r3f_code` | Produce final React Three Fiber code |
| 11 | `export_asset` | Package outputs as files |
| 12 | `integration_help` | Explain app integration steps |

Detailed tool reference:

- [tool_information.md](./tool_information.md)

## Examples

Worked example:

- [quick_example.md](./quick_example.md)

Prompt examples for users:

- [sample_prompt.md](./sample_prompt.md)

## Folder Structure

Repository structure reference:

- [folder_structure.md](./folder_structure.md)

## Installation

### Prerequisites

- Node.js 18+
- npm

### Commands

Install dependencies:

```bash
npm install
```

Build the server:

```bash
npm run build
```

Start the local `stdio` server:

```bash
npm run start
```

Run development mode with file watching:

```bash
npm run dev
```

Run development mode over HTTP stream:

```bash
npm run dev:http
```

Run the project health checks:

```bash
npm run health
```

### Claude Desktop Configuration

Point Claude Desktop at the built `dist/server.js` file.

`~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "web3d": {
      "command": "node",
      "args": [
        "/Users/alex/dev/web3d-mcp-server/dist/server.js"
      ]
    }
  }
}
```

### Cursor and Other `stdio` Clients

Use the same `command` and `args` pattern:

```json
{
  "mcpServers": {
    "web3d": {
      "command": "node",
      "args": [
        "/Users/alex/dev/web3d-mcp-server/dist/server.js"
      ]
    }
  }
}
```

## Deployment

This project is self-hosted. No public hosted URL is bundled with the repository.

### Environment Variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `MCP_TRANSPORT` | Yes for remote mode | `stdio` | Set to `http` to enable HTTP stream transport |
| `PORT` | No | `8080` | Port used when `MCP_TRANSPORT=http` |
| `NODE_ENV` | No | unset | Set to `production` for hosted deployments |

### Remote Commands

Install and build:

```bash
npm install
npm run build
```

Start the HTTP deployment:

```bash
MCP_TRANSPORT=http PORT=8080 node dist/server.js
```

MCP endpoint:

```text
http://localhost:8080/mcp
```

### Remote Client Configuration

```json
{
  "mcpServers": {
    "web3d-remote": {
      "url": "https://your-deployment.up.railway.app/mcp"
    }
  }
}
```

## Framework Support

| Framework | `framework` param | Notes |
| --- | --- | --- |
| Plain React | `"plain"` | No directive added |
| Vite | `"vite"` | No directive added |
| Next.js App Router | `"nextjs"` | Adds `"use client"` |
| Next.js Pages Router | `"nextjs"` | Pair with `integration_help` and `dynamic(..., { ssr: false })` |

## TypeScript Support

| `typing` param | Output |
| --- | --- |
| `"none"` | Plain `.jsx` |
| `"typescript"` | `.tsx` with `Group \| Mesh` ref types |
| `"prop-types"` | `.jsx` with a PropTypes block |

## Operational Notes

### Geometry Cache

- Synthesized JSX can be cached locally under `.synthesis_cache/geometry_cache.json`.
- The cache is created on demand.
- Repeated object and style combinations can reuse earlier geometry.

### Status Values

| Status | Meaning |
| --- | --- |
| `SUCCESS` | Scene code generated with no placeholder fallbacks |
| `PARTIAL_SUCCESS` | Scene code generated, but one or more objects fell back to placeholders |
| `SYNTHESIS_REQUIRED` | More geometry synthesis work is required before final code generation |
| `ERROR` | Generation failed and did not produce a usable component |

## Author

Dev Agrawal

## License

See [LICENSE](./LICENSE).
