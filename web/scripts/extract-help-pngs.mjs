import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = "c:/Users/Main/Desktop/how to CO/CollectionOps_How_to_Get_Your_CSVs_from_TCGplayer.html";
const outDir = path.join(__dirname, "../public/images/help");
const names = [
  "screenshot_1_orders_page.png",
  "screenshot_2_filter_panel.png",
  "screenshot_3_reports_page.png",
  "screenshot_4_sales_summary.png",
  "screenshot_5_collectionops_import.png",
];

const html = fs.readFileSync(htmlPath, "utf8");
const re = /<img[^>]+src="(data:image\/png;base64,[^"]+)"/gi;
let m;
let i = 0;
while ((m = re.exec(html)) !== null && i < names.length) {
  const raw = m[1];
  const b64 = raw.replace(/^data:image\/png;base64,/i, "");
  const dest = path.join(outDir, names[i]);
  fs.writeFileSync(dest, Buffer.from(b64, "base64"));
  console.log("wrote", names[i], fs.statSync(dest).size, "bytes");
  i += 1;
}
console.log("extracted", i, "images");
