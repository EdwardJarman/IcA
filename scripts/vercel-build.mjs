import { spawnSync } from "node:child_process";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  console.error(
    "Missing Clerk public configuration. In Vercel Project Settings → Environment Variables, add CLERK_PUBLISHABLE_KEY (or EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY) for the target environment, then redeploy.",
  );
  process.exit(1);
}

const result = spawnSync("pnpm", ["export:web"], {
  stdio: "inherit",
  env: {
    ...process.env,
    EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: publishableKey,
  },
});

process.exit(result.status ?? 1);
