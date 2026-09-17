import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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

function sh(cmd) {
  execSync(cmd, { cwd: root, stdio: "inherit", shell: true });
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

const masterExists = hasBranch(PUBLISH_BRANCH);

if (masterExists) {
  sh(`git switch ${PUBLISH_BRANCH}`);
  sh("git rm -rf --ignore-unmatch .");
} else {
  sh(`git switch --orphan ${PUBLISH_BRANCH}`);
  const sourceFiles = execSync("git ls-tree -r --name-only main", { cwd: root, encoding: "utf8" })
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
  for (const f of sourceFiles) {
    rmSync(join(root, f), { force: true, recursive: true });
  }
}

for (const entry of readdirSync(root)) {
  if (entry === ".git" || entry === "node_modules" || entry === "dist") continue;
  rmSync(join(root, entry), { force: true, recursive: true });
}

mkdirSync(root, { recursive: true });
cpSync(distClient, root, { recursive: true });
writeFileSync(join(root, ".gitignore"), "node_modules\n");

sh("git add -A");

const date = new Date().toISOString().slice(0, 10);
sh(`git commit -m "deploy: build estatico (SPA) ${date}"`);

sh(`git switch main`);

console.log("\n[deploy] Branch '" + PUBLISH_BRANCH + "' pronta. Basta dar push.");