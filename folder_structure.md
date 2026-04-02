# Folder Structure

This file shows the main repository layout and what each area is used for.

## Repository Overview

```text
3dflow-mcp-server/
├── README.md
├── quick_example.md
├── sample_prompt.md
├── tool_information.md
├── folder_structure.md
├── LICENSE
├── package.json
├── tsconfig.json
├── scripts/
│   ├── check-mcp-ready.mjs
│   └── run-health-tests.mjs
├── src/
│   ├── server.ts
│   ├── lib/
│   ├── services/
│   ├── tools/
│   ├── types/
│   ├── utils/
│   └── validators/
├── dist/
│   ├── server.js
│   ├── lib/
│   ├── services/
│   ├── tools/
│   ├── types/
│   ├── utils/
│   └── validators/
└── tests/
    ├── apply-animation.test.ts
    ├── complexity.test.ts
    ├── edit-scene.test.ts
    ├── export-asset.test.ts
    ├── generate-scene-plan.test.ts
    ├── generate-scene.test.ts
    ├── preview.test.ts
    ├── refine-prompt.test.ts
    ├── synthesis.test.ts
    └── validate-scene.test.ts
```

## Key Areas

### Root Files

- `README.md`: primary project documentation
- `quick_example.md`: worked end-to-end example
- `sample_prompt.md`: prompt examples for end users
- `tool_information.md`: detailed tool-by-tool reference
- `folder_structure.md`: repository structure reference
- `LICENSE`: project license text
- `package.json`: scripts, dependencies, and Node.js metadata

### `src/`

Main TypeScript source for the MCP server.

- `server.ts`: FastMCP server bootstrap and transport startup
- `lib/`: shared library logic such as design tokens, synthesis contracts, and cache helpers
- `services/`: business logic for generation, optimization, export, prompt refinement, and codegen
- `tools/`: MCP tool definitions and parameter schemas
- `types/`: TypeScript type definitions
- `utils/`: shared helpers for payloads, exports, ids, and animation utilities
- `validators/`: validation rules used by `validate_scene`

### `dist/`

Compiled JavaScript output generated from TypeScript.

- `dist/server.js`: runtime entrypoint used by local and remote execution
- the other subfolders mirror `src/`

### `scripts/`

Project health and readiness scripts.

- `check-mcp-ready.mjs`: verifies server wiring and tool registration
- `run-health-tests.mjs`: compiles a health-check build and runs selected tests

### `tests/`

Automated tests for the tool and service workflow.

- planning and scene generation tests
- animation behavior tests
- preview and validation tests
- synthesis and export tests

## Runtime Path Notes

- Local `stdio` startup uses `dist/server.js`
- Remote HTTP stream deployment also runs `dist/server.js`
- HTTP mode exposes the MCP endpoint at `/mcp`
