/**
 * Post-processes unDraw SVGs in public/illustrations for CollectionOps brand greens.
 * Run from web/: node scripts/recolor-undraw-svgs.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "..", "public", "illustrations");

const files = fs.readdirSync(dir).filter((f) => f.endsWith(".svg"));

for (const f of files) {
  const fp = path.join(dir, f);
  let s = fs.readFileSync(fp, "utf8");

  s = s.replace(/<svg\b([^>]*)>/i, (_, attrs) => {
    if (/\bstyle\s*=/.test(attrs)) {
      if (/color\s*:\s*#2E7D32/.test(attrs)) return `<svg${attrs}>`;
      return `<svg${attrs.slice(0, -1)} style="color:#2E7D32">`.replace(">>", ">");
    }
    return `<svg${attrs} style="color:#2E7D32">`;
  });

  s = s.replace(/fill="#3f3d56"/gi, 'fill="#1B5E20"');
  s = s.replace(/fill="#3f3d58"/gi, 'fill="#1B5E20"');
  s = s.replace(/#6c63ff/gi, "#2E7D32");
  s = s.replace(/#514ea1/gi, "#1B5E20");
  s = s.replace(/#5a57b0/gi, "#1B5E20");

  fs.writeFileSync(fp, s);
  console.log("updated", f);
}
