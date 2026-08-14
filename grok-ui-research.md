# Minimalist Bot-First UI Research

## Official Grok Bot patterns reviewed

The official Grok Bot product page and launch note present an interface where the Bot roster is the navigation, each Bot is treated as a teammate, and the conversation is the main working surface. The product emphasizes a short status or outcome preview beneath each Bot, a compact unread/activity signal, and a contextual computer or routine side panel rather than a separate dashboard. Sources reviewed: https://x.ai/bot and https://x.ai/news/introducing-grok-bot (accessed 2026-08-14).

The core workflow concepts to preserve in Luma are: dedicated Bots with a role, one clear conversation per Bot, parallel work summarized as short status lines, task outcomes that return to the user, and approval requests that interrupt only when judgment is required. Luma must present these ideas through its own name, iconography, copy, color system, and layout.

## Supplied reference synthesis

The supplied reference images favor abundant white space, a calm white canvas, sparse chrome, soft dividers, rounded conversation bubbles, compact action icons, and a roster that puts colored Bot identities ahead of dashboard metrics. Mobile uses a short top bar, a horizontal row of key Bots, a chronological Bot list, and an always-available compose affordance. Desktop uses a three-part composition: narrow roster, broad conversation, and restrained contextual inspector.

## Luma design decisions

Luma will become light-first with ink text, quiet gray dividers, an original soft-mint action color, and restrained role markers. The primary mobile screen will foreground a simple Bot carousel, a readable working list, and a clean Bot conversation. Background execution will remain transparently scoped in the product copy rather than being represented by dense analytics. Desktop will use a Bot sidebar, a conversation canvas, and an optional context drawer only when a task has supporting details.

## Non-copying boundary

Luma will not reuse Grok Bot names, icon shapes, logo treatment, type styling, layouts, copy, screenshots, or proprietary assets. The goal is to apply general interaction principles—Bot-first navigation, conversational work management, clarity, space, and progressive disclosure—to a distinct Luma product.

## Clean-slate onboarding findings

The official Grok Bot documentation describes a low-friction first-use model: introduce the concepts briefly, let the user create a named Bot, give that Bot a primary job and working style, then move straight into the first real task. The documentation specifically emphasizes that no workflow builder or prior Bot setup should be necessary before a user can begin. It also frames an effective first task in terms of the outcome, relevant sources, constraints, deliverable, and review point. Sources reviewed: https://docs.x.ai/grok-bot/overview and https://docs.x.ai/grok-bot/get-started (accessed 2026-08-14).

For Luma, this becomes an original three-step first-run sequence: **Name the Bot**, **Describe its work**, and **Set the approval boundary**. It intentionally contains no pre-made Bot roster, suggested roles, task examples, templates, files, activity, or routines. The first Bot is created only from the user's wording. After creation, Luma opens an empty Bot conversation with a simple prompt to state the desired result; skills, routines, files, collaboration, and notifications become available only after the user creates or connects them.
