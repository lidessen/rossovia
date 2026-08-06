# Personal Task App — design candidate

**Status:** revisable design candidate for human review; its runnable local MVP
exists beside this document, but neither the product direction nor any
Rossovia integration is accepted merely because the slice runs.
**Object:** an independent, human-first, Chinese-primary personal
task/todo/project product. Responsive Web first; an optional Tauri desktop
shell may come later. The product owns its own domain truth and human loop;
no external system owns its state.
**Method basis:** the repository `visual-design` skill, `design` operation,
with presentation-model attention-path analysis. Principle expression:
P16 primary (the form must let the acting person act), supported by P09
(attention layering), P05 (case-specific analysis), and P07 (concrete →
abstract → concrete reconstruction).

---

## 1. Product thesis

Most task tools are built for teams and then trimmed for individuals, or
built around measuring productivity. Both shapes fail a person acting alone:
the first surrounds one user's day with assignees, sprints, and feeds; the
second turns attention into a scoreboard.

This product is organized around one person's day, in their own language.
Its core loop is:

```text
收集 → 安排 → 专注 → 收尾 → 回顾
capture → schedule → focus → close out → review
```

- **收集 (capture):** a thought becomes a task with a title and nothing
  else. Friction here destroys the habit, so capture never demands a
  project, a date, or a description.
- **安排 (schedule):** a person assigns a captured task to a project,
  Today, or both; the derived views update at their pace in a calm planning
  moment.
- **专注 (focus):** one chosen thing — the **当前一件 (current one thing)** —
  dominates the screen. A count-up timer accompanies the work without
  scoring it.
- **收尾 (close-out):** stopping a focus session invites a short note
  (收尾记录) about where things stand, so the next session resumes faster.
- **回顾 (review):** a chronological record of what was done and noted,
  for reflection — not for grading.

The product thesis in one sentence: **帮助一个人用中文安静地收好、排好、
做完一天里的事，并把"做到哪了"留给自己看。**

### What is borrowed, and what is not

From **Linear**, the candidate borrows interaction *qualities*, not
organization: fast capture, inline edit in place, quick search, visible
hierarchy (project → task → checklist), and keyboard efficiency on desktop.

From **One Thing** (focus-session tools), it borrows the session *shape*:
one dominant current thing, a count-up timer, a close-out note at stop, and
a chronological reflection trail.

From **Craft**, it borrows a narrower structural lesson, not the document
product. Craft keeps tasks visible through Inbox, task, calendar, and Daily
Note surfaces while retaining their context; its Calendar places scheduled
tasks, events, and the day's note under one date, and its current task update
also puts completed tasks on the date they were actually completed
([Tasks](https://support.craft.do/en/plan-and-do/tasks),
[Calendar](https://support.craft.do/en/plan-and-do/calendar),
[Daily Notes](https://support.craft.do/en/plan-and-do/daily-notes),
[Craft 3.5.0 update](https://www.craft.do/blog/craft-update-3-5-0)). The
transferable principle is: **keep the action object unique, and let date become
a shared coordinate for planning, acting, and looking back.** The present
canonical Task plus derived views already satisfies the first half. A minimal
date and daily-record experiment is defined in §5.5; it is not part of the
implemented first slice.

The following are **explicitly not imported**: teams, assignees,
cycles/sprints, velocity or any duration-as-productivity metric,
initiatives, issue IDs, notification feeds, deep dependency graphs,
Markdown-only canonical storage, and any implicit bulk AI/Rossovia
disclosure. The interface contains no field, badge, or surface whose
presence assumes one of these.

## 2. Non-goals

- Team or multi-user collaboration of any kind in this product's own model.
- Process machinery: statuses-as-workflow, sprints, estimates, velocity,
  burndown, issue numbering, dependency chains.
- Productivity scoring. Focus duration is recorded as fact (起止时间) and
  shown as history; it is never summed into a score, streak, or ranking.
- A notification center or activity feed. The product is quiet by default.
- A Rossovia client. Rossovia integration is a later, optional, narrow
  adapter (§8); the product is fully useful without it.
- A Markdown editor or Markdown-canonical store. Notes are plain text in
  the product's own store; the current manual backup format is validated JSON.
- A Craft-like document system behind daily work: no rich Daily Note editor,
  block model, templates, subpages, meeting notes, or calendar-event model.
- Choosing a full technology stack. No declared repository source owns one
  for this product (§11).

## 3. Domain model and state ownership

### Domain spine

```text
项目 Project ──< 任务 Task ──< 检查项 ChecklistItem (optional)
                    │
                    └──< 专注记录 FocusRecord (0..n per task)
```

| Entity | Required fields | Optional fields | Notes |
|---|---|---|---|
| 任务 Task | `id`, `标题 title`, `完成状态 completionState`, `今日安排 scheduledForToday` | 备注 note, `所属项目 projectId`, `完成时间 completedAt`, 排序 order | **Title-only creation is a hard constraint:** `completionState` defaults to the binary `open` state and `scheduledForToday` to false without prompting. `completedAt` is present exactly when the task is `completed`. Every other field is progressive. |
| 项目 Project | `id`, `名称 name` | 备注, 归档状态 | A flat list of personal projects; no nested portfolio hierarchy in MVP. |
| 检查项 ChecklistItem | `id`, `内容 text`, 完成状态 | — | Belongs to one task; an optional convenience after the first slice, not a subtask tree with its own scheduling. |
| 专注记录 FocusRecord | `id`, `taskId`, `startedAt`, nullable `endedAt` | 收尾记录 close-out note | `endedAt = null` means active. Once closed, records remain chronological history. Duration derives from persisted timestamps, never from a target or score. |

### State ownership and projections

- There is exactly **one canonical Task record** per task. Project membership
  (`projectId`) and Today membership (`scheduledForToday`) are orthogonal:
  one task may appear in both its project and Today without being copied.
- **Inbox is a projection**, not a container: open tasks with no `projectId`
  and `scheduledForToday = false`. A project list shows open tasks with that
  `projectId`; Today shows open tasks with `scheduledForToday = true`.
  Changing either field changes view membership on the same Task record.
- The **board is an optional projection** over the same canonical tasks,
  grouped by a display key (e.g., 未安排 / 今天 / 已完成 within a project).
  A board edit is a write to the canonical task; the board owns no state
  of its own and can be hidden or removed without data loss.
- **Today** is a view over open tasks whose `scheduledForToday` is true, plus the single
  designated **当前一件 (current one thing)** pointer. The one-thing
  pointer references at most one task; it is a property of the person's
  current attention, not of team assignment.
- **Review** is a read-only chronological projection of completed tasks
  and focus records with their close-out notes.
- At most one FocusRecord may be active across the product. Its elapsed time
  derives from persisted `startedAt`; refresh or browser restart reconstructs
  the running timer rather than starting a new record. While it is active, the
  current-one pointer remains bound to that record's task and cannot be changed.
  Completing that task closes its active FocusRecord at the completion time and
  clears the current-one pointer.
- The first Web slice uses one product-owned, single-device persistent store.
  Canonical records and the current pointer survive reload and browser restart.
  The concrete storage engine is not selected here; accounts, sync, backup,
  export, and cross-device behavior remain later choices.
- No Rossovia state, Tauri state, or any external system participates in
  the canonical store. (Seams in §8.)

## 4. Content, attention path, and information architecture

Primary IA (always reachable, recedes during focus):

```text
今天 Today · 收件箱 Inbox · 项目 Projects · 回顾 Review
```

Following the presentation model, the attention path per surface:

| Surface | Orient | Primary | Supporting | Context (quiet) | Recovery |
|---|---|---|---|---|---|
| 今天 Today | "今天" + date; the one thing if set | The current one thing, rendered dominant | Today's remaining tasks, one calm list | Capture entry; nav | Completed items leave the open list and remain recoverable in Review |
| 收件箱 Inbox | "收件箱" + count | Unsorted tasks; fast capture field at thumb/keyboard reach | Inline edit, move-to-Today/project | Nav; empty state guides capture | Undo on destructive actions |
| 项目 Projects | Project name | That project's task list | Optional checklist inside a task; optional board toggle | Project list sidebar/section | Archive is reversible |
| 回顾 Review | "回顾" + date range | Chronological entries (completion + focus notes) | Filter by project | Nav | Read-only; nothing to break |
| 专注 Focus | The one thing's title, alone | Count-up timer + 停止 button | Close-out note field appears at stop | Everything else hidden | Abandon-vs-finish is an explicit choice |

Attention allocation rules (P09, P16):

1. **One dominant element per surface.** On Today and Focus, the current
   one thing receives the largest type, the most space, and the only
   strong action affordance. All other Today tasks render as a quiet
   list — visible for calm access, never competing.
2. **Persistent chrome recedes.** During a focus session the navigation
   collapses to a minimal exit; nothing blinks, badges, or feeds.
3. **Secondary facts are discoverable, not urgent.** Counts, dates, and
   project tags are small and low-contrast until relevant.
4. **Warnings interrupt only at consequence.** Only destructive or
   irreversible-feeling moments (deleting a project, stopping a session
   without a note) get a confirmation — and stopping-without-note is
   allowed, so its prompt is gentle and skippable.

## 5. Key workflows and screens

### 5.1 Capture (收集)

```text
任意界面 → 捕获入口(底部按钮/快捷键) → 输入标题 → 完成
```

- Title-only. The capture field accepts a title and saves immediately on
  confirm. No project, date, or note is requested.
- Desktop: a global-ish shortcut (e.g., `N` or `Ctrl/Cmd+K`-style quick
  capture) plus an always-visible ＋ affordance. Mobile: a large ＋ button
  in bottom-thumb reach (see §6).
- New tasks land in **收件箱 Inbox** by default. Capture never forces
  triage.

### 5.2 Schedule (安排)

- From Inbox in the first slice: actions per task are 今天, 移到项目, and 完成.
  今天 sets `scheduledForToday = true`; 移到项目 sets `projectId`.
  Neither creates or moves a second Task record. Arbitrary dates remain later
  interaction work. 修改标题 updates the same canonical Task and is available
  as an explicit touch control; an empty corrected title is rejected.
- 完成 closes an ordinary task directly and creates only a completion entry;
  it does not manufacture a FocusRecord. The focused task, or a task with a
  pending close-out, must finish that truthful close-out path instead.
- Removing a task from Today sets `scheduledForToday = false`. The task remains
  in its project when `projectId` is present; otherwise the Inbox projection
  shows it. There is no hidden or remembered "prior context."
- 设为当前一件 ("make it the one thing") is one explicit action on any
  Today task. When no focus is active, setting a new one thing replaces the old
  one quietly; the old one stays in Today. While focus is active, 设为当前一件
  and 开始专注 are unavailable on every other task. The person may navigate
  away, but must stop and close out the active focus, or complete that same task,
  before selecting or focusing another task.

### 5.3 Focus (专注)

```text
今天 → 当前一件 → 开始专注 → 正计时运行 → 停止
                                        ├─ 写收尾记录(可选但受鼓励)
                                        └─ 标记完成 / 稍后继续
```

- The focus screen shows the one thing's title, a count-up timer
  (00:00 → up), and 停止. Nothing else competes.
- On stop, a 收尾记录 field invites a sentence such as
  "材料已复印，差照片，明天去照相馆". The note attaches to the focus
  record. Skipping is allowed; the session is still recorded.
- The person then marks the task 完成 or keeps it open. Either way the
  focus record persists chronologically.
- Refreshing or restarting the browser during focus resumes the same active
  record and reconstructs elapsed time from `startedAt`. After stop, the
  pending close-out identity and its current draft are canonical state too:
  reload returns to that close-out before another task can become current.

### 5.4 Close-out and Review (收尾 / 回顾)

- Review lists, newest first or by day: completed tasks, focus sessions
  with their close-out notes, in plain chronological order.
- **No duration scoring.** Entries show what happened and what was noted;
  durations may be shown factually per session but are never aggregated
  into streaks, totals-as-achievement, or comparisons.

### 5.5 Daily coordinate — next dogfood hypothesis

Daily Notes are not accepted here as a new module. The smallest useful
hypothesis is that a date can join planning and reflection without turning a
task into a document block:

- If real use needs planning beyond today, replace `scheduledForToday` with one
  optional `scheduledDate: LocalDate`; never keep the boolean and date as two
  canonical truths. Today then projects open tasks with
  `scheduledDate <= today`. Missing a planned day rolls the task forward
  quietly; it is not a red failure state.
- If reflection needs more than focus close-out notes, add at most one
  `DailyRecord { localDate, text }` per day. Today may expose a quiet
  **记一笔** field, and Review may compose that text with tasks completed and
  focus records ended on the same date.
- Do not add Daily Notes navigation, templates, rich blocks, subpages,
  deadlines, reminders, or calendar events as part of this experiment.

Run these as separate dogfood probes after the current loop is stable. Do not
add `DailyRecord` if focus close-out already captures what the person wants to
remember. Do not migrate to `scheduledDate` if real use does not schedule
future work.

### 5.6 Optional board projection

- Within a project, a 看板 toggle presents the same tasks grouped by
  未安排 / 今天 / 已完成 (grouping key is a display choice, not stored
  workflow state).
- Moving a card between columns writes the corresponding canonical field
  (`scheduledForToday` / 完成状态). The list view reflects it immediately because
  both read the same store.
- The board can be turned off per project; nothing is lost.

### 5.7 Text wireframes (orientation only, not accepted visuals)

Today, desktop:

```text
┌────────────────────────────────────────────────┐
│ 今天 · 6月12日 周四          [＋ 快速捕获]      │
│                                                │
│  ┌──────────────────────────────────────────┐  │
│  │ 当前一件                                  │  │
│  │ 整理签证材料                  [开始专注]  │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  今天其他                                      │
│   · 给妈妈订体检                       (今天)  │
│   · 回房东消息                                 │
│                                                │
│  今天 · 收件箱 · 项目 · 回顾                   │
└────────────────────────────────────────────────┘
```

Focus, mobile:

```text
┌──────────────────────┐
│              ‹ 退出  │
│                      │
│   整理签证材料        │
│                      │
│      24:36           │
│                      │
│   [ 停止并收尾 ]      │
│                      │
└──────────────────────┘
```

## 6. Responsive and mobile behavior

- **Mobile-first one-hand use.** Capture (＋) and the focus 停止 button sit
  in bottom-thumb reach. All primary actions are reachable without hover;
  hover is never the only way to reveal an action (no hover-only menus).
- **No desktop-only shortcuts for core actions.** Keyboard shortcuts are
  accelerators on desktop; every shortcut action has a visible touch
  equivalent. Capture, schedule-to-Today, set-one-thing, start/stop focus,
  and close-out are all fully operable by touch.
- **Layout shifts, attention order holds.** On narrow screens the Today
  surface stacks: one thing → today's other tasks → capture. On wide
  screens the one thing still dominates via scale and placement, not via
  added chrome. The board projection, when enabled, becomes horizontally
  scrollable columns or a single-column grouped list on mobile.
- **Inline edit on touch:** choose 修改标题 → edit field with 保存标题/取消;
  no double-click or keyboard-only patterns are required.
- Breakpoints, exact touch-target sizes, and small-screen board behavior
  are implementation-time decisions to be verified on real devices; this
  document fixes the attention order, not the pixel grid.

## 7. Chinese-primary content and IME composition safety

- The product language is **Chinese (Simplified)** for chrome, empty
  states, and defaults; user content may freely mix Chinese and Latin
  ("给客户回 email 并附 v2 报价").
- **IME composition safety is a named behavior, not an afterthought:**
  pressing Enter **during an active IME composition confirms the composed
  text and must not submit the field**. Submission happens only on an
  Enter that arrives outside composition (or on an explicit 完成 control).
  Implementation must guard `compositionstart`/`compositionend` (or
  `keydown.isComposing` / keyCode 229 equivalents) in capture and inline
  edit. This is a hard acceptance behavior (scenario S2).
- Esc cancels composition/inline edit without saving; focus stays where
  the person can recover.
- **Long Chinese titles:** list rows wrap to at most two lines then
  truncate with an accessible full-title view (tap/click to expand);
  the focus screen always shows the full title regardless of length.
  Exact line-clamp behavior is named here, verified at render time.
- **Mixed Chinese/Latin text:** line breaking must not split Latin words
  awkwardly or break CJK-Latin spacing; the chosen font stack must cover
  CJK with consistent metrics (font selection is an open implementation
  choice, §11).
- Empty states use guiding Chinese copy, e.g. Inbox empty:
  "收件箱是空的。想到什么，就先记下来——只要一个标题。"

## 8. Independent-first seams: Rossovia (later, optional) and Tauri (later, optional)

### Rossovia seam

- The product is **independent-first**: its canonical store, human loop,
  and acceptance live in the product itself. It does not read or write
  Rossovia runtime state, and it creates no Missions or Workbench tasks.
- A later Rossovia integration is an **optional adapter** offering narrow,
  explicit actions (for example: "把今天导成一份摘要交给 Rossovia" — a
  one-way, human-initiated handoff of a defined slice).
- Every such action is: human-initiated, **narrow in scope** (a named
  slice of data), and **explicitly disclosed in the UI at the moment of
  choice** — what will be sent, where, and that it is optional.
- **Declining degrades nothing.** Refusing or never enabling the adapter
  leaves every product capability intact, and refusal itself discloses
  nothing: no telemetry, no implicit sync, no background disclosure of
  tasks or notes (scenario S8).
- The adapter never writes back into the canonical store as an authority;
  any returned artifact arrives as a proposed note the person may keep or
  discard.

### Tauri seam

- Responsive Web is the first and complete product. A later Tauri shell
  may add a global capture hotkey and window presence. The domain model, IA,
  persistent-store contract, and interaction contracts in
  this document are shell-independent; Tauri must not become a state
  owner or a requirement for any scenario here.
- Any later Web↔Tauri data bridge or sync remains an **unresolved
  implementation choice** (§11); it may not replace the product as state
  owner.

## 9. MVP slice

The first human-reviewable slice is one durable vertical loop. It is complete
only when one person can perform these actions against the same product-owned
store:

1. Create projects `搬家` and `签证`; reload or restart the browser and see
   both projects again.
2. In Inbox, capture `整理签证材料` by title only with IME-safe confirm;
   reload and see the same Task record, with no project or Today choice forced
   during capture.
3. Choose 移到项目 → `签证`; see the task leave Inbox and appear in
   that project.
4. Choose 今天; see the same task remain in `签证` and also appear in Today,
   proving that project and Today membership are orthogonal projections.
5. Choose 设为当前一件 → 开始专注; see one dominant task and a
   count-up timer. Reload during focus and see the same active FocusRecord
   resume from persisted `startedAt`, with no duplicate session.
6. Stop, write `材料已复印，差照片`, and choose 完成; see the task
   leave the open Today list, the current-one pointer clear, and Review retain
   the completion time, focus interval, and note after another reload.
7. Capture a small ordinary task such as `给妈妈回电话` and complete it from
   its task row; Review records the completion without inventing a focus
   interval.

The slice uses Chinese-primary chrome and keeps these actions operable through
visible controls at its supported Web widths. IME safety, persistence, the
single-record identity, and the state transitions above are acceptance gates;
comprehensive responsive, visual, keyboard, and accessibility polish are not.

The daily-use readiness extension adds title correction, completion reopen,
confirmed permanent deletion, and manual JSON export/restore without changing
the canonical model. Explicitly after it: the bounded §5.5 dogfood probes,
checklist items, manual reorder, broad responsive and accessibility polish,
board projection, search, Tauri shell, Rossovia adapter, automatic backup, and
sync. The §5.5 probes do not authorize the rest of Craft's document, calendar,
reminder, or date model.

## 10. Acceptance scenarios

Each scenario is testable from this document against a build. S1–S6 accept the
first slice; S7–S10 preserve later design constraints without expanding that
slice.

- **S1 — Persistent project shell.** Create `搬家` and `签证`, reload, then
  restart the browser. Both projects remain in the single-device product
  store. No account or Rossovia setup is requested. *First-slice persistence
  test.*
- **S2 — Empty-Inbox title-only capture with IME-safe Enter.** With an empty
  Inbox, compose `整理签证材料` in a Chinese IME. Enter while the candidate
  window is open confirms composition and does **not** submit; a subsequent
  Enter saves one task without requesting another field. Reload shows the same
  record in Inbox. *First-slice interaction and persistence test.*
- **S3 — Orthogonal project and Today membership.** Assign the S2 task to
  `签证`; it leaves Inbox and appears in the project. Choose 今天; it remains
  in `签证` and also appears in Today with the same `id`. Removing it from
  Today clears only `scheduledForToday`; it remains in `签证`. *First-slice
  state-invariant test.*
- **S4 — Active focus binds the current one and survives restart.** Set the
  task as 当前一件 and start focus. Reload or restart while the timer runs.
  The same active FocusRecord remains and elapsed time derives from the original
  `startedAt`. Navigate to another task: its 设为当前一件 and 开始专注
  actions are unavailable, the pointer still names the active task, and no
  second active record can be created. Stopping and closing out the focus, or
  completing the active task, makes those actions available again. *First-slice
  transition and recovery test.*
- **S5 — Close-out, completion, and Review.** Stop S4, write
  `材料已复印，差照片`, reload before choosing an outcome, and see the same
  close-out and draft. Then complete the task. `completedAt` and
  `endedAt` are retained, the current-one pointer clears, and Review shows the
  completion and focus note after reload. An ordinary task may complete without
  a FocusRecord; a focused or pending-close-out task cannot bypass its close-out.
  Review shows no aggregate score. *First-slice end-to-end test.*
- **S6 — Personal product, not process machinery.** Across `搬家`, `签证`,
  Inbox, Today, Focus, and Review, no assignee, sprint, issue ID, dependency,
  Mission, Workbench acceptance, runner, or evidence control exists. The loop
  remains usable with Rossovia absent. *First-slice surface inventory.*
- **S7 — Board as projection (later).** Enabling 看板 on `搬家` shows the same
  tasks grouped by 未安排/今天/已完成; moving `找搬家公司报价` to 今天
  makes it appear in the Today list, because both read the canonical
  store. Disabling the board loses nothing. *Named behavior; after the first
  slice.*
- **S8 — Declining Rossovia degrades nothing (later).** When a
  Rossovia action is offered for a narrow slice, declining it leaves all
  product behavior identical, records the refusal locally at most, and
  discloses nothing anywhere. *Named behavior and a hard seam constraint;
  verified when the adapter exists.*
- **S9 — One-hand mobile capture/focus (later polish).** On a phone-width viewport, the
  person completes S2 and the S4–S5 focus/close-out flow using touch only,
  with all primary controls in thumb reach and no hover- or
  keyboard-only step. *Named behavior; target sizes and reach are later
  on-device verification.*
- **S10 — Robustness conditions (later polish and verification).**
  - Long Chinese title (e.g., `把去年全年的体检报告和保险单据扫描归档到同一个文件夹里`):
    list rows clamp to two lines; focus screen shows it fully. *Named;
    render verification later.*
  - Mixed text (`给客户回 email 并附 v2 报价`) wraps acceptably in list,
    capture, and focus. *Named; render verification later.*
  - Empty states (empty Inbox, empty Today, empty Review, project with no
    tasks) show guiding Chinese copy and a single obvious next action.
    *Named copy direction; wording accepted by the human reviewer.*
  - Keyboard focus: every interactive element is reachable and visibly
    focused in a sensible order, including capture, inline edit, and the
    focus screen. *Named requirement; accessibility check later.*
  - Reduced motion: timer updates and view transitions respect
    reduced-motion settings; no animation is required to understand
    state. *Named requirement; accessibility check later.*
  - Readable contrast: text and controls meet readable contrast in the
    default theme against their surfaces. *Named requirement; contrast
    audit later on real render.*

## 11. Implementation boundary and open choices

**This document decides:** product thesis and loop, IA, one canonical Task
record with orthogonal project/Today membership, app-owned single-device
persistence across reload/restart, one-thing and active-focus invariants,
focus/close-out/review behavior, IME and Chinese-content behaviors, seam
constraints (Rossovia, Tauri), the first vertical slice, and its acceptance
scenarios.

**Current implementation choice and unresolved boundaries:**

- The first slice uses browser-native HTML/CSS/ES modules, `localStorage`, and
  a dependency-free Bun development server. This is evidence for the slice,
  not a permanent framework or hosting commitment; any replacement must
  preserve the decided identity, persistence, and recovery behavior.
- Production hosting and any storage engine beyond the current single-browser
  profile remain unchosen.
- Exact breakpoints, touch-target metrics, and board mobile composition.
- Manual export/restore is a whole-state, validated JSON file chosen explicitly
  by the person; automatic backup, account, sync, broader schema-migration, and
  any Web↔Tauri data strategy remain unresolved.
- Whether dogfood warrants the `scheduledDate` and `DailyRecord` hypotheses in
  §5.5; neither is part of the current implementation.
- The concrete shape of the later Rossovia adapter's narrow actions.

**Artifact boundary:** this document owns product and state-model decisions,
not implementation or verification claims. The sibling README, tests, and
browser observations report what the current slice actually establishes. No
Rossovia runtime state, Mission, or Workbench task is part of the product
model, and no running slice by itself accepts a future integration or the
§5.5 hypotheses.

## 12. Authority map

| Artifact / decision | Owner | Authority |
|---|---|---|
| Frozen product brief | Human Principal (projected into this task) | accepted constraints for this candidate |
| This design candidate | this Work Cell | proposed, revisable design source |
| Product, aesthetic, integration, implementation, naming, and publication acceptance | Human Principal | durable acceptance — never claimed by this Cell |
| Canonical task/project/focus state | the product itself | product domain truth |
| Today, Inbox, Project, and Review views | projections over the canonical store | rebuildable, disposable |
| Later Rossovia adapter | optional adapter, human-initiated | narrow disclosed actions only; no state authority |
| Later Tauri shell | optional shell | desktop presence and shortcut capability; no state authority |

## 13. Reopening signals

Reconsider this candidate when: real use shows capture friction remains
(title-only is not enough, or triage is demanded too early); the one-thing
model fails people who legitimately parallel-track; the flat project list
collapses under real project volume; the board projection is wanted as
canonical (which would contradict the brief and needs the Principal); or a
Rossovia integration need appears that cannot stay narrow and
human-initiated. Any such change returns to the Human Principal, who
retains product, aesthetic, integration, implementation, naming, and
publication acceptance.
