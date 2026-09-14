import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

const CANDIDATE_DIRS = [
  join("src-tauri", "target", "x86_64-pc-windows-msvc", "release", "bundle", "nsis"),
  join("src-tauri", "target", "release", "bundle", "nsis"),
];

const setupName = "SliferLauncher_Setup.exe";
const outDir = "dist-installer";

const nsisDir = CANDIDATE_DIRS.find((dir) => existsSync(dir));
if (!nsisDir) {
  throw new Error("NSIS bundle folder not found. Run the Tauri NSIS build first.");
}

const setup = readdirSync(nsisDir).find((name) => name.toLowerCase().endsWith("-setup.exe"));
if (!setup) {
  throw new Error(`No *-setup.exe in ${nsisDir}`);
}

mkdirSync(outDir, { recursive: true });
const source = join(nsisDir, setup);
const named = join(nsisDir, setupName);
const shipped = join(outDir, setupName);
copyFileSync(source, named);
copyFileSync(source, shipped);
console.log(`Wrote ${named}`);
console.log(`Wrote ${shipped}`);
