import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const cargoBin = join(process.env.USERPROFILE ?? "", ".cargo", "bin");
const keyPath = join(root, "src-tauri", "keys", "slifer.key");

const env = {
  ...process.env,
  PATH: `${cargoBin};${process.env.PATH ?? ""}`,
};

if (existsSync(keyPath)) {
  env.TAURI_SIGNING_PRIVATE_KEY = keyPath;
  env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD =
    process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD ?? "slifer";
}

const build = spawnSync(
  "npx",
  ["tauri", "build", "--target", "x86_64-pc-windows-msvc", "--bundles", "nsis"],
  { cwd: root, env, stdio: "inherit", shell: true },
);

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const finalize = spawnSync("node", ["scripts/finalize-setup.mjs"], {
  cwd: root,
  env,
  stdio: "inherit",
  shell: true,
});
process.exit(finalize.status ?? 1);
