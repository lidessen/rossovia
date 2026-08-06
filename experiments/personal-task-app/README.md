# Personal Task App — local MVP

This is the runnable local MVP of the independent, Chinese-primary personal
task app described in [DESIGN.md](./DESIGN.md). It uses browser-native HTML,
CSS, and ES modules. The browser's `localStorage` is the only canonical store;
there is no account, sync, Rossovia connection, scoring, third-party package,
or external service dependency. Bun runs the local server and checks.
The Review surface can export that complete store as a JSON backup and restore
a validated backup after an explicit replacement confirmation.

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

The server binds explicitly to `127.0.0.1`, not to the local network. The app
stores data under `rossovia.personal-task-app.v1` in the current browser
profile. Reloading or restarting the browser preserves that state; clearing
site data removes it unless you exported a backup first. `localStorage` belongs
to the full browser origin, so keep the same protocol, host, and port for one
task store; opening another port starts a separate local store.

## Verify

```bash
bun test
bun run check
```

The tests cover canonical Task identity across Inbox/project/Today projections,
IME-safe Enter and global `N` shortcut classification, focus exclusivity,
pending close-out recovery and v1 migration, ordinary completion without a
synthetic focus record, title correction, reopen after accidental completion,
confirmed-deletion domain safety, Review notes, export/restore validation,
storage round-trips, and the localhost bind configuration.

## MVP browser walkthrough

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
8. Correct the task title with 修改标题; press Enter while a Chinese IME
   candidate window is open and confirm that it does not save prematurely.
9. Complete the task. Review retains both the completion and focus note. Choose
   重新打开 and confirm the same task returns to Today and its project.
10. Capture `给妈妈回电话` and complete it directly from the task row. Review
    records the completion without creating a focus interval.
11. Create an unwanted task, choose 删除, cancel once, then confirm. The task
    remains after cancel and disappears after confirmation. An active or
    pending-close-out task cannot be deleted.
12. In Review, export a backup, make a visible change, then restore the file.
    Cancel the replacement confirmation once; confirm it the second time and
    verify the exported state returns after reload.

Keep the walkthrough as a browser acceptance check in addition to the
deterministic tests. A real Chinese IME candidate window, browser download/file
picker behavior, confirmation dialogs, and physical touch reach still require
browser or on-device checks; deterministic contracts and a resized desktop
browser do not establish those observations.
