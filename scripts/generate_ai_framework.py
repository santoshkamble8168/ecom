from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def title(slug: str) -> str:
    return slug.replace("-", " ").replace("_", " ").title()


def bullets(items: list[str]) -> str:
    return "\n".join(f"- {item}" for item in items)


def checks(items: list[str]) -> str:
    return "\n".join(f"- [ ] {item}" for item in items)


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content.strip() + "\n", encoding="utf-8")


def doc(
    path: str,
    heading: str,
    purpose: str,
    responsibilities: list[str],
    best_practices: list[str],
    checklist: list[str],
    examples: list[str],
    common_mistakes: list[str],
    references: list[str],
    extra: str = "",
) -> None:
    body = f"""# {heading}

## Purpose
{purpose}

## Responsibilities
{bullets(responsibilities)}

## Best Practices
{bullets(best_practices)}

## Checklist
{checks(checklist)}

## Examples
{bullets(examples)}

## Common Mistakes
{bullets(common_mistakes)}
"""
    if extra.strip():
        body += f"\n{extra.strip()}\n"
    body += f"""
## References
{bullets(references)}
"""
    write(path, body)


def ensure_dirs() -> None:
    for directory in [
        ".cursor/rules",
        ".cursor/agents",
        ".cursor/skills",
        ".cursor/workflows",
        ".cursor/prompts",
        ".ai/agents",
        ".ai/prompts",
        ".ai/workflows",
        ".ai/checklists",
        ".ai/templates",
        ".ai/context",
        ".ai/memory",
        ".ai/skills",
        "docs/architecture",
        "docs/api",
        "docs/database",
        "docs/deployment",
        "docs/sprint",
        "docs/sprints",
        "docs/release",
        "docs/release-notes",
        "docs/decisions",
        "docs/troubleshooting",
        "tests/unit",
        "tests/integration",
        "tests/e2e",
        "tests/performance",
        "tests/security",
        "tests/accessibility",
        "playwright/pages",
        "playwright/fixtures",
        "playwright/tests",
        "playwright/utils",
        ".github/workflows",
        ".github/ISSUE_TEMPLATE",
    ]:
        (ROOT / directory).mkdir(parents=True, exist_ok=True)


def generate_rules() -> None:
    slugs = [
        "global",
        "coding",
        "architecture",
        "clean-code",
        "solid",
        "dry",
        "kiss",
        "yagni",
        "design-patterns",
        "api",
        "database",
        "frontend",
        "backend",
        "react",
        "nextjs",
        "nodejs",
        "typescript",
        "security",
        "performance",
        "accessibility",
        "error-handling",
        "logging",
        "monitoring",
        "testing",
        "documentation",
        "git-workflow",
        "pull-request",
        "code-review",
        "deployment",
    ]
    extra = """## AI Instructions
- Read project documentation, `.ai/context/*`, `.ai/memory/project-memory.md`, and relevant rules before changing code.
- Create a plan before broad implementation and keep changes scoped to the requested outcome.
- Prefer existing patterns, reusable contracts, typed interfaces, tests, and documentation updates.
- Self-review for security, performance, accessibility, maintainability, and operations before completion.
- Never introduce placeholder code, fake integrations, generated secrets, or untested critical paths."""
    for slug in slugs:
        name = f"{title(slug)} Rules"
        doc(
            f".cursor/rules/{slug}.md",
            name,
            f"Defines durable engineering expectations for {name.lower()} across web, mobile, SaaS, API, microservice, enterprise, AI, e-commerce, and internal-tool projects.",
            [
                "Guide AI-assisted work in Cursor.",
                "Create consistent engineering decisions across teams.",
                "Protect production quality, maintainability, security, and delivery speed.",
                "Provide reviewable criteria for planning, implementation, and release.",
            ],
            [
                "Read requirements and existing documentation before implementation.",
                "Use simple, typed, testable designs with clear ownership boundaries.",
                "Prefer composition, reusable contracts, and small cohesive modules.",
                "Document architectural trade-offs and operational assumptions.",
                "Validate behavior with tests, observability, and review gates.",
            ],
            [
                "Requirement and acceptance criteria are understood.",
                "Design follows Clean Architecture, SOLID, DRY, KISS, and YAGNI.",
                "Security, accessibility, performance, and failure modes are considered.",
                "Tests and documentation are updated with the change.",
                "Code is self-reviewed before handoff.",
            ],
            [
                "Good: create a typed service boundary, add unit and integration tests, and document the API contract.",
                "Good: reuse an existing validation schema instead of duplicating business rules.",
                "Good: capture a significant database or architecture decision as an ADR.",
            ],
            [
                "Starting code before reading requirements.",
                "Adding abstractions without a repeated pattern or clear ownership problem.",
                "Skipping tests for edge cases, authorization, errors, or migrations.",
                "Hiding errors with broad catch blocks or silent fallbacks.",
                "Committing secrets, local-only assumptions, or undocumented behavior.",
            ],
            [
                ".ai/context/project-conventions.md",
                ".ai/memory/project-memory.md",
                "docs/architecture/README.md",
                "docs/development-workflow.md",
                "docs/testing-strategy.md",
                "OWASP ASVS",
                "WCAG 2.2",
                "Twelve-Factor App",
            ],
            extra,
        )


def generate_agents() -> None:
    agents = [
        "product-manager",
        "business-analyst",
        "scrum-master",
        "architect",
        "planner",
        "ui-designer",
        "ux-expert",
        "frontend-engineer",
        "backend-engineer",
        "full-stack-engineer",
        "database-engineer",
        "devops-engineer",
        "cloud-engineer",
        "security-engineer",
        "performance-engineer",
        "reviewer",
        "refactoring-expert",
        "qa-engineer",
        "test-engineer",
        "playwright-engineer",
        "documentation-engineer",
        "api-engineer",
        "accessibility-expert",
        "release-manager",
    ]
    for slug in agents:
        name = title(slug)
        extra = f"""## Role
{name} operates as a specialist AI collaborator for planning, building, reviewing, and shipping production software.

## Expertise
- Requirements analysis, technical design, risk discovery, and delivery planning.
- Domain-driven design, Clean Architecture, API contracts, data modeling, testing, DevOps, and documentation as appropriate to the task.
- Cross-functional collaboration with product, engineering, QA, security, operations, and support.

## Inputs
- Product goals, user stories, acceptance criteria, project context, architecture docs, tickets, code, telemetry, incidents, and stakeholder constraints.

## Outputs
- Plans, designs, implementation guidance, review findings, test strategy, documentation, release notes, runbooks, or operational recommendations.

## Rules
- Ask only blocking questions; otherwise make conservative assumptions and document them.
- Prefer measurable acceptance criteria and traceable decisions.
- Escalate security, compliance, data-loss, availability, and customer-impact risks.

## Constraints
- Do not invent unsupported requirements, fake test results, or production credentials.
- Keep deliverables actionable, reviewable, and aligned with project conventions.

## Deliverables
- Clear recommendation or artifact, open risks, next actions, and quality gates."""
        doc(
            f".ai/agents/{slug}.md",
            f"{name} Agent",
            f"Defines how the {name} agent contributes to an AI-assisted engineering workflow.",
            [
                "Own the specialist perspective for the requested work.",
                "Convert ambiguity into explicit assumptions, risks, and acceptance criteria.",
                "Collaborate with other roles through documented handoffs.",
                "Keep outputs production-oriented and evidence-based.",
            ],
            [
                "Start from project memory and relevant docs.",
                "Use checklists and templates to standardize output.",
                "Prefer concise, testable, secure, and observable recommendations.",
                "Separate must-have requirements from options and future enhancements.",
            ],
            [
                "Inputs are reviewed.",
                "Assumptions and risks are listed.",
                "Deliverables are complete and actionable.",
                "Quality gates are identified.",
                "Handoff notes are ready for the next role.",
            ],
            [
                "Architect provides ADR and system boundaries before backend implementation.",
                "QA Engineer derives test cases from acceptance criteria and risk areas.",
            ],
            [
                "Producing generic advice without reading context.",
                "Skipping operational, security, or testing implications.",
                "Mixing decisions with unresolved assumptions.",
                "Creating deliverables that cannot be reviewed or tested.",
            ],
            [
                ".ai/workflows/new-feature.md",
                ".ai/checklists/code-review.md",
                ".ai/templates/technical-design.md",
                "docs/development-workflow.md",
            ],
            extra,
        )
    for slug in ["orchestrator", "architect", "planner", "developer", "reviewer", "tester", "documentation", "devops"]:
        doc(
            f".cursor/agents/{slug}.md",
            f"{title(slug)} Cursor Agent",
            f"Cursor-facing operating guide for the {slug} role in this repository.",
            ["Route tasks to the right specialist perspective.", "Read relevant rules, context, and workflows first.", "Produce clear artifacts and review notes."],
            ["Use repository conventions.", "Keep work small and reviewable.", "Record decisions and test evidence."],
            ["Context read.", "Plan created.", "Implementation or review complete.", "Docs and tests updated."],
            [f"Use this agent when the user asks for {slug}-oriented work."],
            ["Skipping context.", "Over-expanding scope.", "Leaving unclear handoffs."],
            [".cursor/rules/global.md", ".ai/context/project-conventions.md"],
        )


def generate_skills() -> None:
    skills = [
        "react",
        "nextjs",
        "nodejs",
        "express",
        "nestjs",
        "typescript",
        "postgresql",
        "mongodb",
        "prisma",
        "redis",
        "docker",
        "kubernetes",
        "ci-cd",
        "rest-api",
        "graphql",
        "authentication",
        "authorization",
        "performance-optimization",
        "caching",
        "security",
        "testing",
        "playwright",
        "accessibility",
        "clean-architecture",
        "microservices",
        "event-driven-architecture",
        "logging",
        "monitoring",
    ]
    for slug in skills:
        name = title(slug)
        extra = f"""## When To Use
Use this skill when planning, implementing, reviewing, testing, or documenting work involving {name}.

## Anti-Patterns
- Copying framework examples without adapting them to project architecture.
- Mixing infrastructure, domain logic, presentation, and persistence concerns in one module.
- Ignoring lifecycle, failure modes, observability, and security boundaries.

## Implementation Notes
- Define contracts first, then implementation details.
- Prefer typed schemas, automated checks, repeatable setup, and documented trade-offs.
- Keep examples minimal but production-shaped, including validation and error handling."""
        doc(
            f".ai/skills/{slug}.md",
            f"{name} Skill",
            f"Reusable guidance for applying {name} consistently across projects.",
            ["Identify when the technology or practice is appropriate.", "Guide implementation choices and review criteria.", "Highlight risks, trade-offs, and quality gates."],
            ["Align with architecture and project conventions.", "Use secure defaults and least privilege.", "Automate tests and operational checks.", "Document setup, usage, and limitations.", "Measure performance and reliability where relevant."],
            ["Use case is valid.", "Interfaces and contracts are typed.", "Security and error handling are covered.", "Tests validate normal, edge, and failure cases.", "Documentation explains operation and maintenance."],
            ["Add a small typed adapter around a third-party SDK.", "Document required environment variables and health checks.", "Validate input at the boundary and enforce authorization in the application layer."],
            ["Choosing tools because they are popular, not because they fit.", "Skipping migration, rollback, or observability planning.", "Leaking vendor details through domain models.", "Creating shared utilities that hide business rules."],
            [".ai/context/tech-stack.md", ".cursor/rules/coding.md", ".cursor/rules/security.md", "docs/architecture/README.md"],
            extra,
        )
    for slug in ["coding", "api", "database", "security", "testing", "documentation"]:
        doc(
            f".cursor/skills/{slug}.md",
            f"{title(slug)} Skill",
            f"Compact Cursor skill guidance for {slug} work.",
            ["Apply the related repository rules.", "Use reusable patterns.", "Create reviewable artifacts."],
            ["Read context first.", "Favor typed contracts.", "Include tests and docs."],
            ["Context checked.", "Implementation planned.", "Quality gates met."],
            [f"Use for {slug} tasks."],
            ["Skipping standards.", "Duplicating logic.", "Leaving undocumented behavior."],
            [".cursor/rules/global.md", ".ai/skills"],
        )


def generate_prompts_workflows_checklists_templates() -> None:
    prompts = [
        "build-feature",
        "bug-fix",
        "refactor",
        "generate-tests",
        "generate-documentation",
        "create-api",
        "create-database-schema",
        "review-code",
        "review-pr",
        "optimize-performance",
        "improve-security",
        "accessibility-audit",
        "create-docker-setup",
        "create-ci-cd",
        "generate-release-notes",
        "generate-sprint",
        "generate-architecture",
        "generate-user-stories",
        "generate-technical-design",
        "generate-sequence-diagram",
        "generate-er-diagram",
    ]
    for slug in prompts:
        name = title(slug)
        extra = f"""## Production-Ready Prompt
Act as the appropriate specialist agents for **{name}**. Read `.ai/memory/project-memory.md`, `.ai/context/*`, relevant `.cursor/rules/*`, and existing docs before producing output.

Return:
- Context summary and assumptions.
- Step-by-step plan.
- Proposed files or artifacts to change.
- Acceptance criteria and quality gates.
- Tests, security checks, performance checks, and documentation updates.
- Self-review notes and residual risks.

Constraints:
- Do not generate placeholder code.
- Do not skip tests for critical paths.
- Prefer existing project patterns and small, reviewable changes."""
        doc(
            f".ai/prompts/{slug}.md",
            f"{name} Prompt",
            f"Reusable prompt for {name} work in an AI-assisted engineering workflow.",
            ["Guide AI from context gathering to final review.", "Standardize expected inputs and outputs.", "Ensure planning, testing, security, and documentation are included."],
            ["Paste specific requirements and acceptance criteria.", "Reference relevant files, tickets, designs, incidents, or APIs.", "Ask for assumptions, risks, and verification evidence.", "Require output to match project conventions."],
            ["Context is included.", "Scope and constraints are clear.", "Acceptance criteria are explicit.", "Quality gates are requested.", "Review and documentation are requested."],
            ["Build a feature from user story, update API docs, add tests, and provide self-review.", "Review PR for regressions, security issues, missing tests, and operational risk."],
            ["Requesting code without requirements.", "Omitting test expectations.", "Asking for broad rewrites without constraints.", "Accepting generated output without review."],
            [".ai/agents", ".ai/workflows", ".ai/checklists", ".cursor/rules/global.md"],
            extra,
        )
    for slug in ["build-feature", "review", "testing", "documentation"]:
        doc(
            f".cursor/prompts/{slug}.md",
            f"{title(slug)} Cursor Prompt",
            f"Quick Cursor prompt for {slug} tasks.",
            ["Start from context.", "Create plan.", "Deliver testable output."],
            ["Be specific.", "Use rules.", "Include verification."],
            ["Docs read.", "Plan made.", "Quality gates listed."],
            [f"Use when asking Cursor to perform {slug} work."],
            ["Vague scope.", "No tests.", "No review."],
            [".ai/prompts"],
        )

    workflows = [
        "new-feature",
        "sprint",
        "bug-fix",
        "hot-fix",
        "refactoring",
        "code-review",
        "pull-request",
        "testing",
        "deployment",
        "release",
        "documentation",
        "production-issue",
        "incident-response",
    ]
    workflow_extra = """## Entry Criteria
- Business goal, owner, priority, and expected outcome are known.
- Required context, designs, APIs, data, environments, and dependencies are available or explicitly marked as assumptions.

## Step-By-Step Process
1. Read project memory, context, rules, and related documentation.
2. Define scope, non-goals, risks, acceptance criteria, and impacted systems.
3. Create or update the plan, design, test strategy, and documentation outline.
4. Implement in small reviewable increments with typed contracts and clear ownership boundaries.
5. Run unit, integration, E2E, security, accessibility, and performance checks appropriate to risk.
6. Self-review, document decisions, update release or operational notes, and prepare handoff.

## Exit Criteria
- Acceptance criteria are met and verified.
- Tests and documentation are updated.
- Security, performance, accessibility, and operational risks are resolved or documented.
- Handoff includes release notes, rollback notes, and known limitations when relevant.

## Deliverables
- Plan, implementation notes, test evidence, updated documentation, review findings, and release or runbook notes.

## Quality Gates
- Code review, automated tests, dependency checks, observability readiness, rollback plan, and stakeholder acceptance for user-facing changes."""
    for slug in workflows:
        doc(
            f".ai/workflows/{slug}.md",
            f"{title(slug)} Workflow",
            f"Defines the repeatable workflow for {title(slug)} activities.",
            ["Coordinate roles, artifacts, quality gates, and handoffs.", "Prevent skipped planning, testing, documentation, or operational work.", "Make work repeatable across projects and teams."],
            ["Use the smallest workflow that satisfies risk and scope.", "Record assumptions and decisions as durable docs.", "Keep quality gates visible from start to finish.", "Do not merge or release without verification evidence."],
            ["Entry criteria satisfied.", "Plan and acceptance criteria documented.", "Implementation or review complete.", "Required tests pass or exceptions are approved.", "Exit criteria satisfied."],
            ["New Feature moves from user story to technical design, implementation, tests, docs, review, and release notes."],
            ["Treating workflows as paperwork after implementation.", "Skipping rollback and monitoring for releases.", "Proceeding with unclear ownership.", "Accepting unverified manual claims."],
            [".ai/checklists", ".ai/templates", ".cursor/rules/testing.md", "docs/development-workflow.md"],
            workflow_extra,
        )
    for slug in ["sprint", "feature", "bugfix", "review", "release"]:
        doc(
            f".cursor/workflows/{slug}.md",
            f"{title(slug)} Cursor Workflow",
            f"Cursor workflow for {slug} execution.",
            ["Guide task flow.", "Apply quality gates.", "Prepare handoff."],
            ["Read docs.", "Plan first.", "Verify before completion."],
            ["Entry criteria met.", "Checks complete.", "Docs updated."],
            [f"Use for {slug} work."],
            ["Skipping planning.", "No evidence.", "Unclear owner."],
            [".ai/workflows"],
        )

    for slug in [
        "feature-development",
        "architecture-review",
        "code-review",
        "security-review",
        "performance-review",
        "accessibility-review",
        "api-review",
        "database-review",
        "testing",
        "deployment",
        "release",
        "documentation",
    ]:
        doc(
            f".ai/checklists/{slug}.md",
            f"{title(slug)} Checklist",
            f"Checklist for validating {title(slug)} work before handoff.",
            ["Provide repeatable review criteria.", "Expose missing requirements, tests, or docs.", "Support consistent AI and human review."],
            ["Use before review and again before completion.", "Adapt depth to risk and blast radius.", "Record unresolved items as explicit risks."],
            ["Requirements and acceptance criteria are covered.", "Architecture and ownership are clear.", "Security and privacy are reviewed.", "Performance and accessibility are reviewed where applicable.", "Tests and documentation are complete.", "Rollback or recovery is documented when relevant."],
            ["Use this checklist as a PR description section or release gate."],
            ["Checking boxes without evidence.", "Ignoring edge cases and failure modes.", "Skipping docs because implementation seems obvious."],
            [".cursor/rules", ".ai/workflows", "docs/testing-strategy.md"],
        )

    template_extra = """## Template
### Summary
Describe the outcome, audience, and scope.

### Context
Link requirements, designs, code, tickets, incidents, data models, APIs, and decisions.

### Requirements
- Functional requirements.
- Non-functional requirements.
- Constraints and non-goals.

### Design Or Plan
Describe the proposed structure, contracts, data flow, dependencies, and alternatives considered.

### Validation
List tests, review gates, acceptance criteria, monitoring, and rollback considerations.

### Open Questions
Track unresolved decisions with owner and due date."""
    for slug in [
        "sprint",
        "feature",
        "epic",
        "user-story",
        "architecture-decision-record",
        "api-documentation",
        "database-design",
        "readme",
        "pull-request",
        "issue",
        "bug-report",
        "release-notes",
        "changelog",
        "technical-design",
        "sequence-diagram",
        "er-diagram",
    ]:
        doc(
            f".ai/templates/{slug}.md",
            f"{title(slug)} Template",
            f"Reusable template for creating a {title(slug)} artifact.",
            ["Standardize project documentation.", "Capture decisions and evidence.", "Make AI-generated artifacts reviewable."],
            ["Fill every required section or mark it not applicable with a reason.", "Link to source requirements and related decisions.", "Keep examples realistic and implementation-ready."],
            ["Summary is clear.", "Requirements are testable.", "Risks and assumptions are explicit.", "Validation plan is complete.", "Owners and dates are included where needed."],
            ["Copy sections into a sprint plan, ADR, PR, API doc, or release note and complete with project-specific details."],
            ["Leaving template headings empty.", "Using vague acceptance criteria.", "Omitting rollback, security, or testing sections."],
            [".ai/workflows", ".ai/checklists", "docs/decisions/decision-log.md"],
            template_extra,
        )


def generate_docs_context_tests_playwright() -> None:
    docs = {
        "docs/README.md": "Engineering Documentation Index",
        "docs/project-overview.md": "Project Overview",
        "docs/folder-structure.md": "Folder Structure",
        "docs/coding-standards.md": "Coding Standards",
        "docs/technology-stack.md": "Technology Stack",
        "docs/development-workflow.md": "Development Workflow",
        "docs/testing-strategy.md": "Testing Strategy",
        "docs/deployment-guide.md": "Deployment Guide",
        "docs/contributing-guide.md": "Contributing Guide",
        "docs/release-process.md": "Release Process",
        "docs/architecture/README.md": "Architecture Guide",
        "docs/api/README.md": "API Documentation Guide",
        "docs/database/README.md": "Database Documentation Guide",
        "docs/deployment/README.md": "Deployment Documentation Guide",
        "docs/sprint/README.md": "Sprint Documentation Guide",
        "docs/sprints/README.md": "Sprints Documentation Guide",
        "docs/release/README.md": "Release Documentation Guide",
        "docs/release-notes/README.md": "Release Notes Guide",
        "docs/decisions/decision-log.md": "Decision Log",
        "docs/troubleshooting/troubleshooting-guide.md": "Troubleshooting Guide",
    }
    for path, name in docs.items():
        doc(
            path,
            name,
            f"Starter documentation for {name.lower()} in a reusable AI engineering workspace.",
            ["Provide a durable source of truth.", "Support onboarding and AI context retrieval.", "Capture architecture, workflow, operational, and delivery decisions."],
            ["Keep docs versioned with code.", "Update docs in the same change as behavior changes.", "Prefer diagrams and examples when they clarify decisions.", "Link ADRs, APIs, runbooks, tests, and releases."],
            ["Purpose and audience are clear.", "Current project state is accurate.", "Operational and testing guidance is present.", "Related docs are linked.", "Stale assumptions are removed."],
            ["Document how to run tests, deploy, rollback, and troubleshoot a feature.", "Record why a technology was chosen and when to revisit it."],
            ["Treating docs as a one-time deliverable.", "Duplicating conflicting instructions.", "Leaving setup, secrets, or environment assumptions implicit."],
            [".ai/context", ".ai/memory/project-memory.md", ".cursor/rules/documentation.md"],
        )
    for slug in ["tech-stack", "architecture", "coding-style", "glossary", "project-conventions", "business-rules"]:
        doc(
            f".ai/context/{slug}.md",
            f"{title(slug)} Context",
            f"Persistent AI context for {title(slug)} decisions and project conventions.",
            ["Give AI agents stable project knowledge.", "Reduce repeated explanations.", "Keep generated work aligned with current standards."],
            ["Update when decisions change.", "Prefer specific conventions over generic preferences.", "Separate confirmed facts from assumptions.", "Link to source documentation."],
            ["Current facts are captured.", "Assumptions are labeled.", "Terminology is defined.", "Related docs are linked.", "AI instructions are actionable."],
            ["Use strict TypeScript, Clean Architecture, documented APIs, and test-first delivery for production changes."],
            ["Allowing context to drift from implementation.", "Mixing aspirational goals with confirmed architecture.", "Omitting business rules that affect validation."],
            ["docs/architecture/README.md", "documents/sprint-planning/README.md", ".cursor/rules/global.md"],
        )
    doc(
        ".ai/memory/project-memory.md",
        "Project Memory",
        "Reusable memory file that gives AI agents durable project orientation before planning or coding.",
        ["Capture project name, goals, stack, architecture, conventions, decisions, API style, database strategy, testing strategy, deployment strategy, and security rules.", "Act as the first file AI should read before implementation.", "Preserve decisions that should survive across sessions."],
        ["Keep memory concise but specific.", "Update memory when major decisions change.", "Link to detailed docs instead of duplicating everything.", "Mark unknowns explicitly."],
        ["Project name recorded.", "Goals and non-goals recorded.", "Folder structure and coding standards recorded.", "Design decisions and API/database strategy recorded.", "Testing, deployment, and security rules recorded."],
        ["Project: ecom; Goal: production-grade commerce platform and reusable AI engineering workspace; Principle: Clean Architecture, strict TypeScript, security-first delivery, complete documentation."],
        ["Letting memory become stale.", "Recording secrets or environment-specific credentials.", "Using vague rules that do not guide implementation."],
        ["docs/README.md", ".ai/context", ".cursor/rules/global.md"],
        """## Project Snapshot
- Project Name: ecom
- Primary Goal: production-grade commerce application planning baseline plus reusable AI engineering workspace.
- Current Context: sprint planning documents exist under `documents/sprint-planning` and requirements under `requirement-documents`.
- Default Engineering Strategy: Clean Architecture, DDD where useful, strict typing, reusable validation, documented APIs, automated testing, observability, and secure delivery.""",
    )
    for directory in ["tests/unit", "tests/integration", "tests/e2e", "tests/performance", "tests/security", "tests/accessibility"]:
        kind = title(directory.split("/")[-1])
        doc(
            f"{directory}/README.md",
            f"{kind} Testing",
            f"Guidance for maintaining reusable {kind.lower()} test assets.",
            ["Define test scope and ownership.", "Keep fixtures deterministic.", "Document how tests are run locally and in CI."],
            ["Name tests by behavior.", "Avoid real external services unless explicitly configured.", "Use factories and fixtures.", "Assert user-visible and contract-level behavior."],
            ["Happy path covered.", "Edge cases covered.", "Failure path covered.", "Fixtures documented.", "Coverage expectations met."],
            ["Unit: validate pure domain rules; Integration: validate API and persistence contracts; E2E: validate user journeys."],
            ["Brittle timing assumptions.", "Shared mutable fixture state.", "Testing implementation details instead of behavior."],
            ["docs/testing-strategy.md", ".ai/checklists/testing.md"],
        )
    for directory in ["playwright", "playwright/pages", "playwright/fixtures", "playwright/tests", "playwright/utils"]:
        kind = "Root" if directory == "playwright" else title(directory.split("/")[-1])
        doc(
            f"{directory}/README.md",
            f"{kind} Playwright Guide",
            "Reusable Playwright guidance for Page Object Model, fixtures, selectors, retries, screenshots, videos, traces, parallel execution, and accessibility checks.",
            ["Keep E2E tests readable and resilient.", "Centralize page objects, fixtures, and utilities.", "Support debugging through screenshots, videos, traces, and clear failure messages."],
            ["Use role-based selectors and accessible names.", "Model pages by user behavior, not DOM structure.", "Keep tests independent and parallel-safe.", "Capture traces on retry and artifacts on failure.", "Include accessibility checks for critical journeys."],
            ["Page objects hide selector details.", "Fixtures create deterministic test state.", "Tests can run in parallel.", "Retries are configured only for flake diagnosis.", "Screenshots, videos, and traces are documented.", "Accessibility assertions cover critical flows."],
            ["CheckoutPage.addItemToCart() uses getByRole selectors and waits for user-visible state.", "Test fixtures create isolated users and clean data after execution."],
            ["Using CSS selectors tied to layout.", "Sharing state between tests.", "Using fixed sleeps instead of web-first assertions.", "Ignoring trace output during failures."],
            ["Playwright documentation", "WCAG 2.2", "docs/testing-strategy.md"],
        )


def generate_project_files() -> None:
    write(
        ".github/PULL_REQUEST_TEMPLATE.md",
        """# Pull Request

## Purpose
Describe why this change is needed and what user or system outcome it enables.

## Responsibilities
- Keep the change small, reviewable, tested, documented, and secure.
- Link issues, ADRs, API docs, and release notes when relevant.

## Best Practices
- Explain the approach and trade-offs.
- Include screenshots or recordings for UI changes.
- Call out migrations, feature flags, and rollback steps.

## Checklist
- [ ] Requirements and acceptance criteria are met.
- [ ] Tests were added or updated.
- [ ] Security, performance, and accessibility were considered.
- [ ] Documentation and release notes were updated where needed.
- [ ] Rollback or migration notes are included for risky changes.

## Examples
- Closes: #123
- Test evidence: unit, integration, E2E, accessibility, performance, or manual verification.

## Common Mistakes
- Submitting broad unrelated changes.
- Omitting test evidence.
- Hiding known risks or follow-up work.

## References
- `.ai/checklists/code-review.md`
- `.ai/checklists/release.md`
- `.cursor/rules/pull-request.md`""",
    )
    write(
        ".github/ISSUE_TEMPLATE/bug_report.md",
        """# Bug Report

## Purpose
Capture reproducible production-quality bug reports.

## Responsibilities
- Describe impact, environment, expected behavior, actual behavior, and reproduction steps.

## Best Practices
- Include logs, screenshots, trace IDs, browser/device info, and affected version.

## Checklist
- [ ] Impact and severity are clear.
- [ ] Reproduction steps are complete.
- [ ] Expected and actual behavior are documented.
- [ ] Workaround and rollback options are noted if known.

## Examples
- User cannot complete checkout when applying a valid coupon.

## Common Mistakes
- Missing environment details.
- Reporting symptoms without reproduction steps.

## References
- `.ai/workflows/bug-fix.md`
- `.ai/workflows/production-issue.md`""",
    )
    write(
        ".github/ISSUE_TEMPLATE/feature_request.md",
        """# Feature Request

## Purpose
Capture feature proposals with clear value, constraints, and acceptance criteria.

## Responsibilities
- Define user, problem, outcome, constraints, and validation method.

## Best Practices
- Separate must-have scope from future enhancements.
- Include metrics and non-functional requirements.

## Checklist
- [ ] User and problem are clear.
- [ ] Acceptance criteria are testable.
- [ ] Dependencies and risks are listed.
- [ ] Documentation and analytics needs are identified.

## Examples
- As a shopper, I want saved addresses so checkout is faster.

## Common Mistakes
- Describing a solution without the underlying problem.
- Omitting success metrics.

## References
- `.ai/templates/user-story.md`
- `.ai/workflows/new-feature.md`""",
    )
    write(
        ".github/workflows/ci.yml",
        """name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Install dependencies
        run: npm install
      - name: Lint
        run: npm run lint --if-present
      - name: Type check
        run: npm run typecheck --if-present
      - name: Test
        run: npm test --if-present""",
    )
    write(
        ".cursor/settings.json",
        json.dumps(
            {
                "aiEngineeringFramework.enabled": True,
                "aiEngineeringFramework.contextFiles": [
                    ".ai/memory/project-memory.md",
                    ".ai/context/project-conventions.md",
                    "docs/README.md",
                ],
            },
            indent=2,
        ),
    )
    write(
        "package.json",
        json.dumps(
            {
                "name": "ecom-ai-engineering-workspace",
                "version": "0.1.0",
                "private": True,
                "description": "Reusable AI-powered engineering workspace for production software projects.",
                "scripts": {
                    "lint": "echo \"Configure project linter\"",
                    "typecheck": "echo \"Configure project type checker\"",
                    "test": "echo \"Configure project test runner\"",
                    "test:e2e": "echo \"Configure Playwright tests\"",
                },
                "keywords": ["ai-engineering", "cursor", "architecture", "testing", "playwright"],
                "license": "UNLICENSED",
            },
            indent=2,
        ),
    )
    write(
        "README.md",
        """# ecom

## Purpose
Production-grade commerce project workspace with a reusable AI Engineering Framework for planning, implementation, testing, review, deployment, and release.

## Responsibilities
- Keep `.ai/` as reusable AI operating knowledge: agents, prompts, workflows, checklists, templates, context, memory, and skills.
- Keep `.cursor/` as Cursor-specific rules, prompts, skills, agents, and workflows.
- Keep `docs/` as the durable engineering source of truth.
- Keep `tests/` and `playwright/` ready for automated quality gates.

## Best Practices
- Read `.ai/memory/project-memory.md` and relevant docs before coding.
- Plan before implementation and document architectural decisions.
- Follow Clean Architecture, SOLID, DRY, KISS, YAGNI, secure defaults, accessibility, performance, and test-first delivery.
- Update docs and tests in the same change as behavior updates.

## Checklist
- [ ] Requirements are understood.
- [ ] Plan and acceptance criteria are documented.
- [ ] Code follows project rules.
- [ ] Tests and docs are updated.
- [ ] Security, performance, accessibility, and operations are reviewed.

## Examples
- Start a feature from `.ai/prompts/build-feature.md`.
- Review a PR with `.ai/checklists/code-review.md` and `.github/PULL_REQUEST_TEMPLATE.md`.
- Plan a release with `.ai/workflows/release.md` and `.ai/checklists/release.md`.

## Common Mistakes
- Generating code before reading requirements and context.
- Skipping tests, docs, security, or rollback planning.
- Duplicating business rules instead of centralizing contracts and validation.

## References
- `.ai/memory/project-memory.md`
- `.cursor/rules/global.md`
- `docs/README.md`
- `documents/sprint-planning/README.md`""",
    )


def main() -> None:
    ensure_dirs()
    generate_rules()
    generate_agents()
    generate_skills()
    generate_prompts_workflows_checklists_templates()
    generate_docs_context_tests_playwright()
    generate_project_files()
    print("AI engineering framework generated successfully.")


if __name__ == "__main__":
    main()
