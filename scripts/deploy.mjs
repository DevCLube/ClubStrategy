import { execSync } from "node:child_process";
import { cpSync, existsSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const distClient = join(root, "dist", "client");
const PUBLISH_BRANCH = "master";

const HTACCESS = [
  "RewriteEngine On",
  "RewriteCond %{REQUEST_FILENAME} !-f",
  "RewriteCond %{REQUEST_FILENAME} !-d",
  "RewriteRule ^ index.html [L]",
  "",
].join("\n");

function sh(cmd, cwd = root) {
  execSync(cmd, { cwd, stdio: "inherit", shell: true });
}

function hasBranch(name) {
  try {
    execSync(`git rev-parse --verify -q ${name}`, { cwd: root, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

sh("bun run build");

if (!existsSync(distClient)) {
  throw new Error("dist/client nao foi gerado pelo build");
}

writeFileSync(join(distClient, ".htaccess"), HTACCESS);

sh("git worktree prune");
let publishDir = null;
let firstRun = false;

if (!hasBranch(PUBLISH_BRANCH)) {
  firstRun = true;
  sh(`git switch --orphan ${PUBLISH_BRANCH}`);
  const sourceFiles = execSync("git ls-tree -r --name-only main", {
    cwd: root,
    encoding: "utf8",
  })
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
  for (const f of sourceFiles) {
    rmSync(join(root, f), { force: true, recursive: true });
  }
  publishDir = root;
} else {
  publishDir = join(tmpdir(), "clubstrategy-publish-" + randomUUID().slice(0, 8));
  sh(`git worktree add ${publishDir} ${PUBLISH_BRANCH}`);
  sh("git rm -rf --ignore-unmatch .", publishDir);
}

for (const entry of readdirSync(publishDir)) {
  if (entry === ".git" || entry === "node_modules" || entry === "dist") continue;
  rmSync(join(publishDir, entry), { force: true, recursive: true });
}

cpSync(distClient, publishDir, { recursive: true });
rmSync(join(publishDir, "dist"), { force: true, recursive: true });
writeFileSync(join(publishDir, ".gitignore"), "node_modules\n");

sh("git add -A", publishDir);

const date = new Date().toISOString().slice(0, 10);
sh(`git commit -m "deploy: build estatico (SPA) ${date}"`, publishDir);

if (!firstRun) {
  sh(`git worktree remove ${publishDir} --force`);
} else {
  sh(`git switch main`);
}

console.log("\n[deploy] Branch '" + PUBLISH_BRANCH + "' com o site pronto. Basta dar push.");
