# Personal Task App experiment

This is the first runnable slice of the independent, Chinese-primary personal
task app described in [DESIGN.md](./DESIGN.md). It uses browser-native HTML,
CSS, and ES modules. The browser's `localStorage` is the only canonical store;
there is no account, sync, Rossovia connection, scoring, or external dependency.

## Run locally

From this directory:

```bash
bun run dev
```

Open <http://127.0.0.1:4310>. The default port is `4310`. Override it with
either form:

```bash
bun run dev -- --port 4320
PERSONAL_TASK_APP_PORT=4320 bun run dev
```

The app stores data under `rossovia.personal-task-app.v1` in the current
browser profile. Reloading or restarting the browser preserves that state;
clearing site data removes it.

## Verify

```bash
bun test
bun run check
```

The tests cover canonical Task identity across Inbox/project/Today projections,
IME-safe Enter and global `N` shortcut classification, focus exclusivity,
pending close-out recovery and v1 migration, ordinary completion without a
synthetic focus record, Review notes, serialization validation, and storage
round-trips.

## First-slice browser walkthrough

1. Create projects `搬家` and `签证`.
2. Capture `整理签证材料` in Inbox with a Chinese IME.
3. Immediately type a second capture draft and leave it unsubmitted for at
   least three seconds. The success toast disappears, while the draft and input
   focus remain intact.
4. Assign `整理签证材料` to `签证`, then arrange it for Today from the project view.
5. Set it as 当前一件 and start focus. Reload: the same timer resumes.
6. Navigate away: another task cannot become current or start focus until the
   active session is stopped.
7. Stop and add `材料已复印，差照片`; reload before choosing an outcome. The
   same close-out and draft return, and another task cannot become current.
8. Complete the task. Review retains both the completion and focus note.
9. Capture `给妈妈回电话` and complete it directly from the task row. Review
   records the completion without creating a focus interval.

Keep the walkthrough as a browser acceptance check in addition to the
deterministic tests. A real Chinese IME candidate window and physical touch
reach still require on-device checks; event-classification tests and a resized
desktop browser do not establish those two observations.
