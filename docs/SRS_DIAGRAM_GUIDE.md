# SRS Diagram Guide

**Basis for class and use-case diagrams · November 15, 2026**

Use [SRS.pdf](SRS.pdf) for what the system should do. Use [DEVELOPMENT_HANDOFF.pdf](DEVELOPMENT_HANDOFF.pdf) for what currently exists. Label your diagrams clearly: **planned system** or **current implementation**.

## 1. Use-case diagram: who does what?

**Staff** means caregivers, occupational therapists and SPED teachers. They have the same planned permissions. **Child** uses a view opened by Staff and does not need a separate login.

Use the existing SRS use cases:

| ID | Actor | Action |
| --- | --- | --- |
| UC-01 | Staff | Register an account |
| UC-02 | Staff | Log in / log out |
| UC-03 | Staff | Manage child profiles |
| UC-04 | Staff | Create a visual schedule |
| UC-05 | Staff | Review and edit tasks |
| UC-06 | Child | Follow the schedule and complete a task |
| UC-07 | Child | Communicate using picture cards |
| UC-08 | Staff | Manage communication cards |
| UC-09 | Staff | View progress |
| UC-10 | Staff | Adjust accessibility settings |

Also account for Staff editing their profile and opening/leaving the Child view. These actions have requirements but no separate UC IDs; agree on any additions with the team. Do not add administrator or researcher roles—the SRS does not require them.

The planned daily flow is: **Staff selects a child → builds a schedule → opens the Child view → child follows tasks and uses picture cards → Staff reviews progress.** Read SRS section 5.2 for the detailed steps and alternative situations.

## 2. Class diagram: what information belongs together?

These seven items are a starting point for a diagram of the system's main concepts. They come from the actual database definition. The fields below are a shortened selection; use the full definition if your diagram needs every field.

| Class candidate | Main fields |
| --- | --- |
| User | ID, name, email, password hash, role |
| Child | ID, owner, name, age, delay domain, notes, avatar |
| Activity | ID, name, icon, category |
| Schedule | ID, child, date |
| Task | ID, schedule, activity if selected, name, icon, time, duration, position, status, completion time |
| PictureCard | ID, child if custom, category, label, icon |
| Settings | User, font size, contrast, sound on/off |

See [schema.sql](../apps/api/schema.sql) for exact field names. These are **design concepts**, not seven finished classes in the code. Much of the current code uses separate functions and data definitions. Check the implementation report before listing any operation as an existing class method.

## 3. Connect the classes

| Connection | Number of related records |
| --- | --- |
| User → Child | A user may own many children; each child has one owner. |
| User → Settings | A user may have no settings record or one; each record belongs to one user. |
| Child → Schedule | A child may have many schedules, with at most one per date. Each schedule belongs to one child. |
| Schedule → Task | A schedule may have many tasks; each task belongs to one schedule. |
| Activity → Task | An activity may be used by many tasks. A custom task may have no activity reference. |
| Child → PictureCard | A child may have many custom cards. Shared default cards have no child owner. |

“May have many” includes zero. A task's activity reference, when present, points to one activity. A custom card belongs to one child. Task status is **pending** or **done**. Caregiver, OT and SPED teacher are user roles; they do not need separate classes based on the current design.

## 4. Before submitting

- Keep planned features labeled. The current browser has no Staff or Child screens; only some schedule/task operations work behind the scenes, and changes disappear on restart.
- Do not claim real login or picture-card speech already works. Those features are pending.
- Check the existing UC IDs, class fields and connections against the SRS and database definition.
- Use [DEVELOPMENT_TEAM_REPORT.pdf](DEVELOPMENT_TEAM_REPORT.pdf) for detailed requirement checks and source locations. Ask a developer to review your draft diagrams.

The SRS team owns the final diagrams and any changes to requirements. This guide provides a starting basis, not finished diagrams.
