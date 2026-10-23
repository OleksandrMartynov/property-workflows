// Запускає команду з env з .env.local проєкту, не друкуючи значень.
import { spawnSync } from "node:child_process";
process.loadEnvFile("D:/Agentic Course/property-workflows/.env.local");
const [cmd, ...args] = process.argv.slice(2);
const r = spawnSync(cmd, args, { stdio: "inherit", env: process.env, shell: true });
process.exit(r.status ?? 1);
