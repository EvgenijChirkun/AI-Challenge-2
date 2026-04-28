# Contributing

Thank you for contributing to this AI Challenge repository!

## Rules

1. **Keep each task self-contained.**
   All source code, data references, documentation, artifacts, and deployment configs must live inside the relevant task folder (`task-1/`, `task-2/`, etc.). Do not add shared cross-task code unless it is clearly documented and agreed upon.

2. **Document the tech stack and run instructions in the task README.**
   Every task folder must contain a `README.md` that describes the chosen technology stack, how to install dependencies, and how to run the solution locally.

3. **Avoid committing secrets, API keys, large unnecessary files, or private data.**
   - Never commit `.env` files, tokens, passwords, or API keys.
   - Do not commit large binary files, raw datasets, or model weights unless they are small and essential.
   - Use `.gitignore` or references (URLs, cloud storage links) for large or sensitive files.

4. **Place final submission files clearly inside the related task folder.**
   Submission artifacts, reports, and results should be placed in the `artifacts/` subdirectory of the relevant task folder.

5. **Use meaningful commit messages.**
   Describe what changed and why. Examples:
   - `task-1: add initial data preprocessing script`
   - `task-3: update README with run instructions`
   - `docs: update submission checklist`
