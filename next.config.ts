import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Project instructions live in CLAUDE.md (decision-log D-016); stop `next dev` generating AGENTS.md.
  agentRules: false,
  // Native SQLite driver must not be bundled (see decision-log D-007).
  serverExternalPackages: ["better-sqlite3"],
  // Cache Components / partial prefetching are intentionally off until the
  // caching strategy is decided in P4 (see decision-log D-009).
};

export default nextConfig;
