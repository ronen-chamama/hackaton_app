# CHAMAMA HACKATHON SYSTEM — PLAN.md

## PURPOSE

This document defines how to build the new Chamama Hackathon System using multiple coding agents in parallel.

The team structure is:

- **Claude Code** = lead architect + design authority + integration authority
- **Codex** = heavy implementation worker
- **Small models** = junior workers for small, isolated, low-risk code edits

This file is the execution plan.
`STATE.md` is the product/system source of truth.
If there is a conflict:
- product/behavior decisions come from `STATE.md`
- implementation orchestration comes from `PLAN.md`

---

# 1. TEAM ROLES

## 1.1 Claude Code — Lead Architect

Claude Code is responsible for:
- architecture
- folder structure
- database design
- design system
- theme system
- integration decisions
- reviewing outputs from other agents
- deciding what should **not** be delegated
- writing/refining prompts for Codex and junior models when needed

Claude Code should handle:
- first-pass project scaffolding decisions
- Supabase schema design
- auth architecture
- builder architecture
- renderer architecture
- theme architecture
- print architecture
- major refactors
- code review and merge decisions

Claude Code should **not** spend time on:
- repetitive boilerplate
- long repetitive component creation
- small field-mapping fixes
- mechanical renames
- repetitive UI plumbing

---

## 1.2 Codex — Heavy Lifter

Codex is responsible for:
- implementing large chunks of code
- repetitive but important work
- building pages/components from an approved architecture
- wiring large forms
- implementing DB-backed CRUD flows
- implementing builder/editor UIs once structure is decided
- implementing renderer components from exact specs

Codex should receive:
- one clear task at a time
- exact files to create/edit
- exact behavior to implement
- exact boundaries
- exact output format

Codex should **not** be trusted blindly.
All important work must be reviewed.

---

## 1.3 Small Models — Junior Workers

Small models are only for:
- tiny isolated fixes
- replacing or inserting exact code
- single-function edits
- field mapping changes
- tiny bug fixes
- one-file cleanup
- one-component patching

Small models must receive:
- exactly one task
- exact file path
- exact function/component name
- exact code to replace or insert
- exact place to insert it
- no broad freedom

Never ask a small model to:
- design architecture
- invent data structures
- interpret ambiguous requirements
- refactor multiple files
- “figure out the right approach”

Small models are code typists, not architects.

---

# 2. PROJECT EXECUTION PRINCIPLES

## 2.1 Rebuild From Scratch

This project is a rebuild.
Do not reuse old unstable architecture.
Do not try to “repair” the previous system.

Allowed reuse:
- only small isolated utility code if clearly correct
- only after review by Claude Code

Default assumption:
- old code is not trusted

---

## 2.2 Single Source of Truth

- `STATE.md` = product/system truth
- `PLAN.md` = execution truth

No agent may invent:
- extra product scope
- extra features
- alternate architecture
- hidden assumptions

---

## 2.3 No Hardcoded Hebrew In Code

All user-facing UI text must come from:
- `/locales/he.json`

This is mandatory for:
- frontend
- admin
- builder
- print
- errors shown to users
- buttons
- labels
- headings
- placeholders
- helper text

No exceptions.

---

## 2.4 UTF-8 Safety Rule

All agents must obey:

- Read all files as UTF-8
- Write all files as UTF-8
- Before finishing any task, scan changed files for:
  - `???`
  - `×`
  - `�`
  - visibly garbled Hebrew
- If found, stop and fix before returning
- Never claim success while broken Hebrew remains

This rule is mandatory in every code-editing prompt.

---

## 2.5 No Broad “Fix Everything” Prompts

Never send vague prompts like:
- “fix the backend”
- “make it work”
- “clean this up”
- “make it better”

Every prompt must specify:
- exact file(s)
- exact function/component/object
- exact change required
- exact things that must not change
- exact output format

---

# 3. BUILD ORDER

## Phase 0 — Foundation

Goal:
Set up a clean technical base before features.

Tasks:
1. Create clean Next.js app
2. Install Supabase client libs
3. Configure Tailwind
4. Create folder structure
5. Add locales system
6. Add RTL global layout
7. Add theme token base
8. Add Supabase env structure
9. Add GitHub + Vercel baseline

Owner:
- Claude Code decides structure
- Codex implements scaffold

Done when:
- app runs
- auth not yet complete
- locales system exists
- no hardcoded Hebrew in components

---

## Phase 1 — Database + Auth

Goal:
Create secure data model and login flow.

Tasks:
1. Supabase schema
2. RLS policies
3. Google auth
4. user role/group resolution
5. active hackathon resolution
6. student routing guards
7. admin routing guards

Owner:
- Claude Code designs schema and auth flow
- Codex implements
- small models only for tiny SQL/file patches

Done when:
- known user can log in
- unknown user is denied
- admin routes protected
- user sees only own group

---

## Phase 2 — Runtime Renderer

Goal:
Build the student-facing runtime app at `/`.

Tasks:
1. fixed frontend shell
2. header
3. group info area
4. stage navigation
5. dynamic stage renderer
6. footer navigation
7. realtime value loading
8. immediate saving
9. isolated group protocol state

Owner:
- Claude Code defines renderer contracts
- Codex builds renderer
- small models only for isolated component fixes

Done when:
- one hackathon definition can render fully from DB
- student can input values
- values save and reload
- navigation works

---

## Phase 3 — Element System

Goal:
Implement all supported elements.

### 3.1 Display Elements
- heading
- text
- image
- youtube video
- hero
- alert/callout
- list

### 3.2 Input Elements
- short text
- long text
- repeater list

### 3.3 Complex Elements
- card builder
- options builder
- research block
- position paper
- pitch block

Owner:
- Claude Code defines each element contract
- Codex implements element library
- small models patch isolated elements only

Done when:
- every element exists in renderer
- every element has config contract
- every element supports editing + runtime
- print blocks work

---

## Phase 4 — Admin Hackathon Manager

Goal:
Manage multiple hackathons.

Tasks:
1. list hackathons
2. create hackathon
3. edit metadata
4. delete hackathon
5. set active hackathon
6. duplicate from template
7. save hackathon as template

Owner:
- Claude Code defines data flow
- Codex implements CRUD pages

Done when:
- active hackathon controls what appears at `/`
- templates work

---

## Phase 5 — Builder / Editor

Goal:
Build the Elementor-like editor.

Tasks:
1. left canvas
2. right element library
3. stage creation
4. container creation
5. column configuration
6. element insertion
7. element reordering
8. element editing
9. stage reordering via arrows
10. autosave
11. preview mode
12. publish action

Owner:
- Claude Code owns architecture
- Codex implements
- small models only for exact one-function fixes

Done when:
- admin can fully build a hackathon without code
- no static text is required in source code

---

## Phase 6 — Group Management

Goal:
Manage students/staff/admins during a hackathon.

Tasks:
1. user list
2. group columns
3. default 8 groups
4. add/remove groups
5. drag users into groups
6. special admin group
7. role switching by drag
8. click group to inspect that group protocol
9. CSV import

Owner:
- Claude Code defines behavior
- Codex implements UI + DB wiring

Done when:
- moving a user between groups immediately changes what they see in runtime
- admin role behaves correctly

---

## Phase 7 — Themes + Design

Goal:
Apply the predefined theme system cleanly.

Themes:
- simple
- pleasant
- formal
- playful
- subversive
- print
- tech
- social

Owner:
- Claude Code owns theme direction and design decisions
- Codex implements theme plumbing and class/token wiring
- small models may patch isolated CSS/token issues only

Done when:
- themes are clearly distinct
- runtime respects selected hackathon theme
- builder/admin can remain on a stable default theme if desired

---

## Phase 8 — Print Flows

Goal:
Reliable print output for:
- research
- position paper
- pitch

Requirements:
- proper RTL
- print-specific layout
- no ugly browser-page dump
- prevent section break in wrong places where required

Owner:
- Claude Code defines print structure
- Codex implements print views/styles

Done when:
- printed docs look intentional and usable

---

# 4. TASK ASSIGNMENT RULES

## 4.1 What Goes To Claude Code

Send to Claude Code when task involves:
- architecture
- multiple subsystems
- DB schema
- renderer/editor split
- auth decisions
- theme logic
- print design logic
- large refactor
- code review
- unclear requirements

---

## 4.2 What Goes To Codex

Send to Codex when task is:
- already designed
- large but mechanically clear
- multi-file but bounded
- repetitive implementation
- CRUD pages
- renderer components
- editor components
- SQL implementation after schema is approved

---

## 4.3 What Goes To Small Models

Send to small models only when task is:
- one file
- one function/component/object
- exact insertion/replacement
- no architecture decisions needed
- low risk

Examples:
- “Replace this function with this exact version”
- “Change this field type from text to checkbox”
- “Insert this handler into this component”
- “Rename these keys in this one object”

---

# 5. PROMPT TEMPLATES

## 5.1 Claude Code Prompt Template

Use when architecture or major implementation is needed.

```text
You are the lead architect for the Chamama Hackathon System.

Read STATE.md and PLAN.md as binding documents.

Task:
[exact task]

Constraints:
- Do not contradict STATE.md
- Do not introduce alternative architecture unless explicitly justified
- Keep Hebrew out of code; use locales/he.json
- UTF-8 only
- Explain implementation decisions briefly
- List exact files to create/change
- Separate architecture decisions from implementation steps
```

---

## 5.2 Codex Prompt Template

Use for heavy implementation.

```text
Implement exactly this task for the Chamama Hackathon System.

Use STATE.md and PLAN.md as binding constraints.

Task:
[exact task]

Files to create/edit:
[list]

Do not:
- redesign architecture
- touch unrelated files
- hardcode Hebrew in code
- break UTF-8

Required output:
1. files changed
2. what was implemented
3. anything uncertain
```

---

## 5.3 Small Model Prompt Template

Use for junior isolated edits.

```text
Do exactly one isolated code change.

Task:
[one exact task]

File:
[exact file path]

Target:
[exact function/component/object]

Rules:
- UTF-8 only
- do not touch other files
- do not refactor
- do not change anything else
- do not explain

Return only the exact updated code for the changed block.
```

---

# 6. REVIEW RULES

## 6.1 Never Trust Completion Reports Alone

If an agent says:
- “confirmed”
- “wired”
- “fixed”
- “rescanned”

that is not enough.

Review must include at least one of:
- direct code inspection
- runtime visual check
- DB check
- file diff
- behavior verification

---

## 6.2 Required Validation For Any Completed Task

For every task, validate:
1. does the code exist?
2. is it in the right file?
3. is it connected to the real flow?
4. does runtime behavior actually change?
5. did Hebrew remain intact?
6. did unrelated things stay untouched?

---

# 7. IMPLEMENTATION STANDARDS

## 7.1 File and Module Boundaries

Prefer clear separation:

- `/components/runtime/*`
- `/components/builder/*`
- `/components/elements/*`
- `/lib/supabase/*`
- `/lib/i18n/*`
- `/lib/themes/*`

Avoid giant mixed files.

---

## 7.2 Types

Prefer explicit types for:
- hackathon definition
- stage/container/column/element
- element configs
- group values
- user role/group state

If using TypeScript, define shared types early.

---

## 7.3 Builder/Renderer Separation

Mandatory rule:
- builder must edit JSON definition
- renderer must consume JSON definition
- renderer must not depend on builder internals
- builder must not depend on runtime value rendering hacks

---

## 7.4 Autosave

Use debounced autosave for builder/admin metadata.
Use immediate save for student protocol input.
Realtime updates must merge safely.

---

# 8. RISKS TO AVOID

## 8.1 Old System Mistake: Mixed Registry/Renderer/Editor Logic

Avoid:
- giant mixed files
- duplicated field contracts
- one structure for preview and another for runtime and another for editor

Correct approach:
- one canonical element config shape
- one renderer contract
- one editor contract

---

## 8.2 Hardcoded Content In Components

Never hardcode hackathon content into JSX.
All content must come from DB definitions or locale files.

---

## 8.3 Hebrew Corruption

Always enforce:
- UTF-8
- locale-based strings
- scan changed files before completion

---

## 8.4 Over-delegating Ambiguous Work To Small Models

Small models should never be used when the task is still conceptually unclear.

---

# 9. FIRST PRACTICAL MILESTONES

## Milestone 1
Clean project scaffold exists.

Deliverables:
- Next app
- Tailwind
- Supabase client
- locale system
- RTL layout
- env template

---

## Milestone 2
Database + auth work.

Deliverables:
- SQL schema
- RLS
- Google auth
- protected routes
- user/group resolution

---

## Milestone 3
Runtime student shell works.

Deliverables:
- `/` page
- active hackathon fetch
- stage navigation
- dynamic renderer shell
- group values load/save

---

## Milestone 4
First 5 elements work end-to-end.

Recommended first set:
- heading
- text
- short_text
- long_text
- list

---

## Milestone 5
Hackathon admin CRUD works.

---

## Milestone 6
Builder MVP works.

---

## Milestone 7
Group manager works.

---

# 10. DEFINITION OF DONE

System is “done enough” when:

1. Admin can create a hackathon
2. Admin can build stages and elements visually
3. Admin can assign users to groups
4. Active hackathon appears at `/`
5. Student sees only own group protocol
6. Multiple users can collaborate in realtime
7. Inputs save immediately
8. Print flows work
9. Themes work
10. No hardcoded Hebrew exists in code

---

# 11. CURRENT STATUS

We are abandoning the previous unstable implementation and rebuilding cleanly.

Assume:
- old block registry / renderer / editor architecture is not trusted
- partial ideas may be reused only after review
- all future implementation must follow `STATE.md` and `PLAN.md`

This file is the operational execution guide for all coding agents.