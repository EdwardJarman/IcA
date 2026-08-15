# Clerk setup

Rook is linked to the Clerk development application **Icaru** (`app_3HxBP93ZNYgvl8P5uksqjO559t7`). The Clerk Native API was verified as enabled on 15 August 2026. The application currently has no registered iOS or Android production application records, so the Rook bundle identifiers must be added in the Clerk dashboard before producing store or production native builds.

The app uses `@clerk/expo` with secure native token storage, Clerk-hosted authentication for native platforms, and Clerk web components for browser sign-in and sign-up. Server-side protected procedures verify the active Clerk bearer token and map its namespaced Clerk subject to Rook’s existing user-scoped database records. Credential values are managed only through the project environment configuration and are never stored in this repository.
