import { spawnSync } from "node:child_process";

// Clerk publishable keys are designed to be embedded in client bundles. Keep a
// checked-in fallback so a Vercel redeploy cannot lose Rook's public auth
// configuration when only server secrets are edited in Project Settings.
const ROOK_CLERK_PUBLISHABLE_KEY =
  "pk_test_aW5zcGlyZWQtaG9uZXliZWUtNDMuY2xlcmsuYWNjb3VudHMuZGV2JA";
const publishableKey =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  process.env.CLERK_PUBLISHABLE_KEY ||
  ROOK_CLERK_PUBLISHABLE_KEY;

const result = spawnSync(
  "pnpm",
  ["exec", "expo", "export", "--platform", "web", "--output-dir", "dist", "--clear"],
  {
  stdio: "inherit",
  env: {
    ...process.env,
    EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: publishableKey,
  },
  },
);

process.exit(result.status ?? 1);
