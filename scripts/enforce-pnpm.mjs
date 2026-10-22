// Fail install when the package manager is not pnpm (yarn, bun, ...).
// npm is rejected earlier via package.json devEngines (before dependency resolution).
const userAgent = process.env.npm_config_user_agent ?? '';

if (!userAgent.startsWith('pnpm/')) {
  console.error(
    '\nThis repo uses pnpm only. Use:\n\n  pnpm install\n\nhttps://pnpm.io/installation\n',
  );
  process.exit(1);
}
