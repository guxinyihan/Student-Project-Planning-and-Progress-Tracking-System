# Group 9 next actions · 2026-11-11

1. Review the F2-03 release result and its published source hashes. Retain the 291-case shared baseline and the existing operation restrictions as the starting point for subsequent changes.
2. Review the separate Sprint 11 integration scope. Confirm the F1/F2 role facade's target files, trusted dispatcher composition, output and error mapping, and required service-level tests.
3. Integrate INT-06 through F2-03 once that scope is approved. Verify same-role behavior, authorized promotion and demotion, last-Leader protection, stale Revision precedence, project isolation and rollback through the shared role path.
4. Integrate the verified INT-07 memory-adapter patch with explicit test-only ownership. Recheck returned ProjectView, TaskSnapshot, nested object and array isolation, clone-failure atomicity, failure injection and later valid operations.
5. Integrate the complete F5/F6 source and preview closure carrying INT-10. Preserve same-snapshot warning composition and the distinction between partial unknown, all unknown, known empty and confirmed overdue with an unknown remainder.
6. Run the shared and module-specific suites with actual counts, build and TypeScript checks. Record fixture-based UI acceptance and production authorized-data acceptance separately.
7. Continue the other integration items under their own scoped decisions. Plan G1-B and G2 acceptance independently.

The next stage is prepared for review in the [Sprint 11 integration plan](../roadmap/SPRINT11_INTEGRATION_PLAN_2026-11-11.md). The [current backlog](GROUP9_IMPLEMENTATION_BACKLOG_2026-11-11.csv) records the remaining issue states and responsible roles.
