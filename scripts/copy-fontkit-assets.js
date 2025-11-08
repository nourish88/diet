const fs = require("fs");
const path = require("path");

const FONTKIT_PACKAGE = "@foliojs-fork/fontkit";
const SOURCE_DIR = path.resolve(
  process.cwd(),
  "node_modules",
  FONTKIT_PACKAGE
);
const TARGET_ROOTS = [
  path.resolve(process.cwd(), ".next", "standalone", "node_modules", FONTKIT_PACKAGE),
  path.resolve(process.cwd(), ".next", "server", "node_modules", FONTKIT_PACKAGE),
];
const FILES = ["data.trie", "indic.trie", "use.trie"];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyAssets() {
  if (!fs.existsSync(SOURCE_DIR)) {
    console.warn(
      `[copy-fontkit-assets] Source directory not found: ${SOURCE_DIR}. Skipping copy.`
    );
    return;
  }

  for (const target of TARGET_ROOTS) {
    ensureDir(target);
    for (const file of FILES) {
      const src = path.join(SOURCE_DIR, file);
      const dest = path.join(target, file);

      if (!fs.existsSync(src)) {
        console.warn(`[copy-fontkit-assets] Missing source file: ${src}`);
        continue;
      }

      fs.copyFileSync(src, dest);
      console.log(`[copy-fontkit-assets] Copied ${file} -> ${target}`);
    }
  }
}

copyAssets();


