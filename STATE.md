# CHAMAMA HACKATHON SYSTEM — STATE.md

## SYSTEM GOAL

Build a real-time multi-user hackathon protocol system with:
- Single fixed frontend URL
- Fully dynamic content (DB-driven)
- Group-based data isolation
- Real-time collaborative editing
- Visual builder (Elementor-like)
- Admin management system

---

## TECH STACK

- Next.js (App Router)
- Supabase (Auth, Postgres, Realtime, Storage)
- Tailwind CSS v4
- Vercel
- GitHub

---

## GLOBAL RULES

### RTL

- Entire app runs in RTL
- `<html dir="rtl">`

### TEXT HANDLING

- NO Hebrew strings in code
- All UI text must come from `/locales/he.json`

Example:

```json
{
  "groupName": "שם הקבוצה",
  "addRole": "הוספת תפקידים"
}
```

Usage:

```ts
t("groupName")
```

---

## AUTH SYSTEM

- Google login only
- Only emails listed in DB can access

Flow:
1. User logs in via Google
2. Check if email exists in `users` table
3. If not → deny access
4. Assign:
   - role (user/admin)
   - group_id

---

## CORE DATA MODEL

### Hackathon Definition

Stored as JSON:

```ts
hackathon_definition = {
  id: string,
  title: string,
  slogan: string,
  description: string,
  theme: object,
  is_active: boolean,
  stages: Stage[]
}

Stage = {
  id: string,
  title: string,
  containers: Container[]
}

Container = {
  id: string,
  columns: Column[]
}

Column = {
  id: string,
  elements: Element[]
}
```

---

### Element Structure

```ts
Element = {
  id: string,
  type: string,
  config: object
}
```

---

### Group Values (User Input)

```ts
group_values = {
  hackathon_id: string,
  group_id: string,
  element_id: string,
  value: any,
  updated_at: timestamp,
  updated_by: string
}
```

---

## DATABASE SCHEMA

### users

```sql
id uuid primary key
email text unique
name text
role text
group_id uuid
```

---

### groups

```sql
id uuid primary key
name text
hackathon_id uuid
```

---

### hackathons

```sql
id uuid primary key
title text
definition jsonb
is_active boolean
theme jsonb
```

---

### group_values

```sql
id uuid primary key
hackathon_id uuid
group_id uuid
element_id text
value jsonb
updated_at timestamp
updated_by uuid
```

---

## RLS RULES

- user:
  - can read/write only own `group_id`
- admin:
  - full access

---

## FRONTEND (STUDENT APP)

### URL

```
/
```

### Layout Structure

#### Header
- logo
- hackathon title
- slogan
- description

#### Group Info
- group name
- group members

#### Navigation
- stage navigation menu (fixed)

#### Stage Content
- render elements dynamically from DB

#### Footer Navigation
- previous / next stage

---

## REALTIME SYSTEM

- Use Supabase Realtime
- Channel per group + hackathon

```ts
channel(`group:${groupId}`)
```

### Behavior

- Subscribe to `group_values`
- On change:
  - update local state
  - optimistic UI updates

---

## ELEMENT TYPES

### DISPLAY

- heading
- text
- image (upload + convert to webp)
- video (YouTube embed)
- hero
- alert box (info/warning/success)
- list (bullets/numbered)

---

### INPUT

- short_text
- long_text
- repeater_list

---

### COMPLEX ELEMENTS

#### Card Builder

- title
- description
- input
- layout:
  - horizontal
  - vertical
  - grid

---

#### Options Builder

- numbered options
- each option:
  - sub elements
  - input fields

---

#### Research Block

Includes:
- research title input
- findings repeater
- sources repeater
- summary

Print mode:
- academic layout
- prevent breaking sections across pages

---

#### Position Paper

Fields:
- subject
- recipient
- background
- problem
- affected
- solution
- advantages
- objections
- action plan

Print mode:
- official letter format
- includes:
  - date
  - "לכבוד"
  - "הנדון"

---

#### Pitch

Fields:
- hook
- story
- message
- ask
- closing

Print mode:
- large cards
- max 2 cards per page

---

## BUILDER (ADMIN)

### Layout

- Right panel: elements
- Left panel: canvas

---

### Capabilities

#### Structure

- add stage
- add container
- define columns
- drag elements into columns

---

#### Editing

- inline editing
- no static content

---

#### Movement

- reorder elements
- move between columns
- move between containers
- reorder stages (buttons only)

---

### State

- autosave (debounced)
- persist to DB immediately

---

## ADMIN SYSTEM

### Hackathon Manager

- create hackathon
- edit hackathon
- delete hackathon
- set active hackathon

---

### Builder Controls

- preview mode
- publish
- save as template

---

### Group Management

#### UI

Right:
- all users list

Left:
- groups (default 1–8)
- admin group

---

#### Behavior

- drag user → group
- drag to admin group:
  → role = admin
- remove from admin:
  → role = user

---

### Permissions

| Role  | Access |
|------|--------|
| user | own group only |
| admin | full system |

---

## CSV IMPORT

Format:

```
name,group,email
```

Rules:

- group="צוות" → staff
- import into users table

---

## THEMES

System supports predefined themes:

- פשוט
- נעים
- רשמי
- שובב
- חתרני
- דפוס
- הייטק
- רשת חברתית

Theme structure:

```ts
Theme = {
  fonts,
  colors,
  spacing,
  components
}
```

---

## FILE STRUCTURE

```
/app
  /(student)
  /(admin)

/components
  /elements
  /builder

/lib
  supabase.ts
  realtime.ts

/locales
  he.json
```

---

## NON-NEGOTIABLE RULES

- No hardcoded UI text
- No static forms
- No per-group pages (single URL only)
- All content driven by DB
- All input saved immediately
- Full RTL support everywhere (including print)
- Builder must not depend on renderer
- Renderer must not depend on builder

---

## CURRENT STATUS

System is being rebuilt from scratch.

No legacy code should be reused.

This file is the single source of truth.