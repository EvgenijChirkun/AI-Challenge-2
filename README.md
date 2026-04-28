# AI Challenge 2

This repository contains solutions for a multi-task AI Challenge.

## Overview

Each task is isolated in its own folder. Tasks may use completely different technology stacks — there is no single language, framework, or toolchain enforced across the repository.

## Repository Structure

```
AI-Challenge-2/
├── README.md
├── LICENSE
├── CONTRIBUTING.md
├── .gitignore
├── docs/
│   ├── challenge-notes.md
│   └── submission-checklist.md
├── task-1/
├── task-2/
├── task-3/
└── task-4/
```

## Tasks

| Folder   | Description              |
|----------|--------------------------|
| task-1/  | AI Challenge — Task 1    |
| task-2/  | AI Challenge — Task 2    |
| task-3/  | AI Challenge — Task 3    |
| task-4/  | AI Challenge — Task 4    |

## Task Folder Layout

Each task folder follows this structure:

```
task-N/
├── README.md       # Task description, tech stack, run instructions, results
├── src/            # Source code
├── data/           # Datasets or data references
├── docs/           # Task-specific documentation and notes
├── artifacts/      # Model outputs, experiment results, reports
└── deployment/     # Deployment configs, scripts, demo links
```

## Guidelines

- **Each task is self-contained.** All code, data references, documentation, and artifacts live inside the task folder.
- **Technology stack is flexible.** A task may use Python, JavaScript, Java, Go, Rust, notebooks, shell scripts, or anything else appropriate for the problem.
- **Dependencies are documented per task.** See the `README.md` inside each task folder for setup and run instructions.
- **No global dependency management.** Dependencies are not shared across tasks unless explicitly documented.

## Docs

- [`docs/challenge-notes.md`](docs/challenge-notes.md) — General notes about the challenge.
- [`docs/submission-checklist.md`](docs/submission-checklist.md) — Reusable checklist to verify each task submission.
