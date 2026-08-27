# Tooling Routing

This repository is a mobile-first React/Vite prototype. Use the smallest relevant layer for each task and keep optional global tooling out of the project configuration.

## Precedence

1. `AGENTS.md` is the repository contract. Read it before implementation or substantial visual work.
2. Relay Rider repository skills provide product-specific workflows and terminology.
3. Workspace skills provide generic engineering, GitHub, research, productivity, and design workflows.
4. User-level Firecrawl and NotebookLM skills apply only when the task needs web research, scraping, or source-based artifacts.
5. Custom and reusable agents provide execution style; they do not override repository instructions.

## Agent Routing

| Task                                                              | Agent                           |
| ----------------------------------------------------------------- | ------------------------------- |
| Implement, debug, review, or test code                            | `MIT Software Engineer`         |
| Search the repository or answer a codebase question without edits | `Explore`                       |
| Discord, Telegram, Slack, or chat automation                      | `bot-developer`                 |
| Career story, portfolio, or professional narrative                | `career-biographer`             |
| Competitive positioning or differentiation                        | `competitive-cartographer`      |
| Resume or CV generation                                           | `cv-creator`                    |
| Indie product pricing or monetization                             | `indie-monetization-strategist` |

For ordinary Relay Rider implementation work, use `MIT Software Engineer` and then load the narrowest Relay Rider skill.

## Relay Rider Skill Routing

| Task                                                 | Skill                           |
| ---------------------------------------------------- | ------------------------------- |
| Most implementation and debugging work               | `relay-rider-gstack-style`      |
| Prototype or UI changes                              | `relay-rider-prototype-builder` |
| Screenshot and interaction verification              | `relay-rider-visual-qa`         |
| Contrast and accessibility checks                    | `relay-rider-contrast-audit`    |
| Tests and coverage gaps                              | `relay-rider-test-coverage`     |
| Product copy, terminology, or claims                 | `relay-rider-safety-language`   |
| Pilot gates, privacy, safety, and operations         | `relay-rider-pilot-readiness`   |
| Feature triage and launch gaps                       | `relay-rider-launch-readiness`  |
| Corridor, transit, parking, or Access Point evidence | `relay-rider-corridor-research` |
| Modeled impact metrics and assumptions               | `relay-rider-impact-metrics`    |
| Conflicts, lost commits, or multiple checkouts       | `relay-rider-git-recovery`      |

## Extensions

The project baseline is declared in `.vscode/extensions.json`. The baseline covers formatting, linting, diagnostics, React/Tailwind editing, Playwright, maps, WebSockets, API testing, environment files, Git, and Docker.

Keep these as user-level optional tools unless the repository gains the matching stack:

- React Native, Flutter, and Expo tools
- Prisma or Drizzle ORM tools
- PostgreSQL, MongoDB, or Firebase database clients
- Additional AI assistants and overlapping runtime inspectors

Do not uninstall global extensions as part of repository work. Resolve overlap only when it creates a concrete conflict or maintenance cost.

## Validation

Use the repository checks after implementation:

```text
npm run check:runtime
npm run build
npm run test:sites
```

For focused rule-engine changes, run the nearest test directly before the full validation sequence.
