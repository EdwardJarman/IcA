# Luma Workroom — Mobile Interface Design

## Design intent

Luma Workroom is a dark-first, calm AI workroom for managing specialized Bots. The design targets a 9:16 mobile portrait canvas and one-handed use, following standard iOS conventions for safe areas, readable hierarchy, large touch targets, sheets for secondary actions, and clear system feedback. The app should feel like a refined conversation product rather than an automation dashboard.

## Brand and color choices

The brand uses an original **Luma** signal motif: a warm electric mint accent against deep ink surfaces. The dark palette is built around **Ink #0B0D11**, **Graphite #151922**, **Elevated #1C2330**, **Cloud #F4F6F8**, **Mist #9AA4B2**, **Mint #77F3C4**, **Amber #F6C65B**, and **Coral #FF7B7B**. The light palette uses an off-white canvas with ink text and a slightly deeper mint accent. These colors provide clear state contrast without a busy or neon aesthetic.

## Screen list

| Screen | Primary content and functionality |
| --- | --- |
| Welcome | Original value proposition, privacy/capability disclosure, and entry into the demo workroom. |
| Workroom | Conversation-first home with Bot switcher, timeline, task activity, result cards, and composer. |
| Bots | Searchable Bot roster, role cards, status summaries, creation, editing, duplication, pause, archive, and deletion controls. |
| Bot profile | Role, instructions, memory summary, enabled skills, routines, permissions, files, and activity. |
| Task detail | Plan, live step/status trail, interruption controls, result summary, evidence, and pending decisions. |
| Group workroom | Shared objective, active owner, Bot handoffs, task timeline, threaded replies, and reassign/stop actions. |
| Skills | Reusable processes with inputs, decision rules, output, validation, approval boundaries, version, test, and enablement status. |
| Routines | Schedule or event description, owner, time zone, next run, approval rules, pause/resume, run-now, and history. |
| Approvals | Pending, approved, rejected, expired, and cancelled decisions with risk context and audited actions. |
| Files | Project folders, Bot-private/shared labels, file search, previews, downloads, and message attachment links. |
| Notifications | Completion, blockers, approvals, routines, and handoff updates that deep-link to their context. |
| Search | Global search across Bots, messages, files, skills, routines, links, approvals, and settings. |
| Settings | Theme, model/capability status, storage disclosure, privacy controls, exports, resets, and connection management. |

## Key user flows

### Create a Bot and complete a task

The user opens the Bot switcher, taps **New Bot**, selects a role template or starts from scratch, provides a name and goal, and confirms approval boundaries. The user then sends a natural-language task. Luma displays a short plan, starts the task, shows visible activity, and returns a result card with evidence, a generated artifact where applicable, and next steps.

### Review and approve a sensitive action

When a task reaches a higher-risk step, the conversation displays an approval card with the proposed action, rationale, impact, and alternatives. The user can approve, decline, or edit the instruction. The decision is appended to the task timeline and is accessible in Approvals.

### Save a process and automate it

From a completed task, the user chooses **Save as skill**, reviews the draft instructions, adds boundaries and validation, and tests the skill. From the skill detail, the user chooses **Create routine**, reviews timing, owner, inputs, risk rules, and next run, then activates or keeps it paused.

### Collaborate across Bots

The user starts a group workroom, selects a lead and specialists, describes the outcome, and assigns the first owner. Handoffs appear in a compact timeline. The user can intervene from any message to redirect, reassign, pause, or stop.

## Layout rules

The Workroom screen uses a fixed, safe-area-aware top bar with the current Bot and connection state. The conversation occupies the middle scroll region. The composer sits above the home indicator, with a clear attach action and a primary send action. Bot switching, task details, skill references, and profile settings open in sheets or full-screen modals so the conversation remains the primary surface.

The tab bar includes **Workroom**, **Bots**, **Library**, and **Activity**. Secondary sections such as files, routines, and approvals are surfaced within Library and Activity, avoiding an overcrowded mobile navigation model. On wide screens, these areas can expand into a side navigation without changing the information architecture.

## Accessibility requirements

All controls use semantic labels, accessible status text, strong contrast, minimum 44pt touch targets, and visible focus states. Motion is restrained and respects user preference. Important task changes are expressed with both color and words. Every action must be reachable without relying on hover or precision input.
