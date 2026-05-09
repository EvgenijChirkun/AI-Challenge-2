# Contributing

Thank you for contributing to this AI Challenge repository.

## Rules

1. **Keep each task self-contained.**  
   All source code, documentation, artifacts, and deployment notes for a task must live inside the relevant task folder (`task-1/`, `task-2/`, etc.). Do not add shared cross-task code unless it is clearly documented.

2. **Document each task in its own README.**  
   Every task folder should contain a `README.md` with the task-specific overview, technology stack, setup notes, usage guide, demo links, and submission details.

3. **Place required submission files inside the related task folder.**  
   Required files such as `README.md`, `report.md`, sample outputs, CSV files, screenshots, or other artifacts should be placed clearly inside the relevant task folder. Use an `artifacts/` subdirectory for additional generated outputs when appropriate.

4. **Avoid committing secrets, private data, or unnecessary large files.**
   - Never commit `.env` files, service role keys, tokens, passwords, private keys, or API secrets.
   - Use `.env.example` to document required environment variables.
   - Do not commit real corporate data, personal data, private photos, or internal-only content.
   - Do not commit large binary files, raw datasets, model weights, or build outputs unless they are explicitly required for submission.

5. **Use synthetic or demo-safe data.**  
   Challenge submissions should use mock, synthetic, anonymized, or demo-safe data unless the task explicitly allows otherwise.

6. **Keep commits focused and meaningful.**  
   Describe what changed and why. Examples:
   - `task-1: add leaderboard replica`
   - `task-2: add event hosting platform`
   - `docs: update root README`
   - `task-2: add sample CSV artifact`

7. **Avoid unrelated changes in task branches.**  
   A branch for `task-2` should not modify `task-1` files unless the change is intentional and documented.
