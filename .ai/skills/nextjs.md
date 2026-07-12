# Nextjs Skill

## Purpose
Reusable guidance for applying Nextjs consistently across projects.

## Responsibilities
- Identify when the technology or practice is appropriate.
- Guide implementation choices and review criteria.
- Highlight risks, trade-offs, and quality gates.

## Best Practices
- Align with architecture and project conventions.
- Use secure defaults and least privilege.
- Automate tests and operational checks.
- Document setup, usage, and limitations.
- Measure performance and reliability where relevant.

## Checklist
- [ ] Use case is valid.
- [ ] Interfaces and contracts are typed.
- [ ] Security and error handling are covered.
- [ ] Tests validate normal, edge, and failure cases.
- [ ] Documentation explains operation and maintenance.

## Examples
- Add a small typed adapter around a third-party SDK.
- Document required environment variables and health checks.
- Validate input at the boundary and enforce authorization in the application layer.

## Common Mistakes
- Choosing tools because they are popular, not because they fit.
- Skipping migration, rollback, or observability planning.
- Leaking vendor details through domain models.
- Creating shared utilities that hide business rules.

## When To Use
Use this skill when planning, implementing, reviewing, testing, or documenting work involving Nextjs.

## Anti-Patterns
- Copying framework examples without adapting them to project architecture.
- Mixing infrastructure, domain logic, presentation, and persistence concerns in one module.
- Ignoring lifecycle, failure modes, observability, and security boundaries.

## Implementation Notes
- Define contracts first, then implementation details.
- Prefer typed schemas, automated checks, repeatable setup, and documented trade-offs.
- Keep examples minimal but production-shaped, including validation and error handling.

## References
- .ai/context/tech-stack.md
- .cursor/rules/coding.md
- .cursor/rules/security.md
- docs/architecture/README.md
