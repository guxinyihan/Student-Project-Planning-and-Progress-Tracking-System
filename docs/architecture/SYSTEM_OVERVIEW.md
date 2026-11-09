# System overview

The Student Project Planning and Progress Tracking System is designed to help university teams see who owns each task, how tasks depend on one another, and where progress might affect the schedule.

## Architecture and technology

| Area | Role |
| --- | --- |
| User interface | The frontend uses React and TypeScript. Its planned views cover projects, tasks, progress, and schedule information. |
| Application services | A Node.js and TypeScript backend uses Express. It connects application operations to domain logic and persistence. |
| Scheduling domain | TypeScript graph and critical-path calculations model how task dependencies and estimated durations affect the planned schedule. |
| Data and contracts | SQLite provides local persistence. Shared TypeScript contracts describe data exchanged between components. |

The verified baseline provides the foundation for this design. The revised modules remain separate deliveries. Connecting them and validating the user workflows across the full system are upcoming milestones.

See the [current project status](../project-status/PROJECT_STATUS_2026-11-09.md) and [development roadmap](../roadmap/DEVELOPMENT_ROADMAP.md).
