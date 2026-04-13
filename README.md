# mdtask

> Terminal task manager using Markdown files with YAML frontmatter — the filesystem is your database.

**Live demo:** `npx mdtask init` in any project directory (or `npm install -g mdtask`)
**Stack:** Node.js · TypeScript · `gray-matter` for YAML · Ink for TUI · Vitest
**Status:** Active

## What's interesting technically

Tasks are plain Markdown files in `.tasks/`, not a database. `grep`, `git blame`, and hand-edit all work on them — the CLI is a convenient accelerator around filesystem operations, not a gatekeeper. The filesystem is the primary interface; the CLI is ergonomics on top. Side effect: `.tasks/` is gittable, which turns task history into first-class version-controlled documentation of what a project actually did. Trade-off: no complex queries (joins, aggregates) — if you need those, this pattern isn't for you.

mdtask stores tasks as plain Markdown files in a `.tasks/` directory inside your project. Each task has structured metadata (status, priority, tags) in YAML frontmatter and a freeform description body. No database, no cloud service -- just files you can read, grep, and version control.

![CI](https://github.com/RogerSquare/mdtask/actions/workflows/ci.yml/badge.svg)
![npm](https://img.shields.io/npm/v/mdtask?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

---

## Install

```bash
npm install -g mdtask
```

Or run directly with npx:

```bash
npx mdtask --help
```

---

## Quick Start

```bash
# Initialize a task directory in your project
mdtask init

# Add some tasks
mdtask add "Build login page" --priority high --tags react,auth --type frontend
mdtask add "Setup database migrations" --type backend
mdtask add "Write integration tests" --priority low

# View your board
mdtask board

# Start working on a task
mdtask start build-login-page-001

# Mark it for review
mdtask review build-login-page-001

# List tasks filtered by status
mdtask list --status in_progress
```

---

## Commands

| Command | Description |
|---------|-------------|
| `mdtask init` | Create a `.tasks/` directory in the current project |
| `mdtask add <title>` | Create a new task |
| `mdtask list` | List all tasks in a formatted table |
| `mdtask view <id>` | Show full details for a task |
| `mdtask start <id>` | Move a task to `in_progress` |
| `mdtask review <id>` | Move a task to `review` |
| `mdtask done <id>` | Move a task to `done` |
| `mdtask board` | Display a mini kanban board in the terminal |
| `mdtask edit <id>` | Update task fields (title, priority, status, tags, type) |

### Options for `add`

```
--priority <level>   Set priority: high, medium, low (default: medium)
--tags <tags>        Comma-separated tags (e.g., react,auth)
--type <type>        Task type: frontend, backend, fullstack, devops
```

### Options for `list`

```
--status <status>    Filter by status: todo, in_progress, review, done
--priority <level>   Filter by priority
--all                Include done tasks (hidden by default)
```

---

## Task Format

Tasks are stored as `.md` files with YAML frontmatter:

```markdown
---
id: build-login-page-001
title: Build login page
status: todo
priority: high
type: frontend
tags:
  - react
  - auth
created_at: '2026-04-11T15:30:00.000Z'
started_at: null
reviewed_at: null
done_at: null
---

Add description here.
```

This format is human-readable, git-friendly, and compatible with any tool that understands YAML frontmatter (Obsidian, Jekyll, gray-matter, etc.).

---

## Board View

The `board` command renders a four-column kanban directly in your terminal:

```
┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│TODO            │ │IN PROGRESS     │ │REVIEW          │ │DONE            │
├────────────────┤ ├────────────────┤ ├────────────────┤ ├────────────────┤
│build-login-p...│ │setup-db-001    │ │                │ │                │
│Build login page│ │Setup database  │ │                │ │                │
│                │ │                │ │                │ │                │
│write-tests-001 │ │                │ │                │ │                │
│Write tests     │ │                │ │                │ │                │
└────────────────┘ └────────────────┘ └────────────────┘ └────────────────┘
```

---

## Tech Stack

![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-3-6E9F18?style=flat-square&logo=vitest&logoColor=white)

- **TypeScript** with strict mode
- **Commander** for CLI argument parsing
- **gray-matter** for YAML frontmatter parsing
- **chalk** for terminal colors
- **Vitest** for testing

---

## Development

```bash
git clone https://github.com/RogerSquare/mdtask.git
cd mdtask
npm install

# Run in development mode
npm run dev -- add "Test task"

# Run tests
npm test

# Type check
npm run lint

# Build
npm run build
```

---

## License

MIT
