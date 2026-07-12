from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

REQUIRED_DIRS = [
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
    "docs/release",
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
]

REQUIRED_MARKDOWN_SECTIONS = [
    "## Purpose",
    "## Responsibilities",
    "## Best Practices",
    "## Checklist",
    "## Examples",
    "## Common Mistakes",
    "## References",
]

GENERATED_MARKDOWN_ROOTS = [
    ".ai",
    ".cursor",
    "docs",
    "tests",
    "playwright",
    ".github",
]


def main() -> None:
    missing_dirs = [directory for directory in REQUIRED_DIRS if not (ROOT / directory).is_dir()]
    markdown_files = [
        path
        for root in GENERATED_MARKDOWN_ROOTS
        for path in (ROOT / root).rglob("*.md")
    ]
    missing_sections = {
        path.relative_to(ROOT).as_posix(): [
            section
            for section in REQUIRED_MARKDOWN_SECTIONS
            if section not in path.read_text(encoding="utf-8")
        ]
        for path in markdown_files
    }
    missing_sections = {
        path: sections
        for path, sections in missing_sections.items()
        if sections
    }

    if missing_dirs or missing_sections:
        if missing_dirs:
            print("Missing required directories:")
            for directory in missing_dirs:
                print(f"- {directory}")
        if missing_sections:
            print("Markdown files missing required sections:")
            for path, sections in missing_sections.items():
                print(f"- {path}: {', '.join(sections)}")
        raise SystemExit(1)

    print(f"Validated {len(markdown_files)} generated markdown files.")
    print("AI engineering framework validation passed.")


if __name__ == "__main__":
    main()
