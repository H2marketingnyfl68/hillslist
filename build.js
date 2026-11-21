#!/usr/bin/env node
/* Hill's List SEO build. Run after editing index.html:  node build.js
   1. Writes the deal cards into index.html as plain HTML (between the PRERENDER markers),
      so search engines see every retailer without running the page's script.
   2. Writes one page per retailer at /<slug>/index.html (hillslist.com/ulta/ etc.).
   3. Stamps today's date (Eastern Time) on the page's dateModified and in sitemap.xml.
   Data comes from the DEALS / UPDATES script in index.html; nothing else is edited by hand here. */
const fs = require("fs"), path = require("path");
const ROOT = __dirname, SITE = "https://hillslist.com";
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

/* ---------- load the data and the card() template straight from index.html ---------- */
const a = html.indexOf("const AFFILIATE"), b = html.indexOf("const RANK");
if (a < 0 || b < 0) throw new Error("Could not find the data section in index.html");
const grab = re => { const m = html.match(re); if (!m) throw new Error("Missing " + re); return m[0]; };
const cardSrc = grab(/function card\(d\)\{[\s\S]*?\n\}\n(?=function render)/);
const ctx = new Function(html.slice(a, b) + "\n" + grab(/const esc = .*\n/) + cardSrc +
  "\nreturn {DEALS, LINKS, AFFILIATE, shopUrl, V, S, esc, card};")();
const { DEALS, shopUrl, V, S, esc, card } = ctx;

const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" }); // YYYY-MM-DD
const year = today.slice(0, 4);
const slug = n => n.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/&/g, " and ").replace(/['’.!]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const az = (x, y) => x.name.localeCompare(y.name, "en", { sensitivity: "base" });
const deals = DEALS.slice().sort(az);
const seen = {};
deals.forEach(d => { const s = slug(d.name); if (seen[s]) throw new Error("Duplicate slug " + s); seen[s] = 1; });

/* ---------- 1 + 3: index.html ---------- */
let out = html;
const START = "<!--PRERENDER:START-->", END = "<!--PRERENDER:END-->";
const pre = START + "\n" + deals.map(card).join("\n") + "\n" + END;
if (out.includes(START)) out = out.replace(new RegExp(START + "[\\s\\S]*?" + END), () => pre);
else out = out.replace('<div class="list" id="list"></div>', () => '<div class="list" id="list">' + pre + "</div>");
if (!out.includes(START)) throw new Error("Could not place the prerendered list");
out = out.replace(/"dateModified": "\d{4}-\d{2}-\d{2}"/, `"dateModified": "${today}"`);
fs.writeFileSync(path.join(ROOT, "index.html"), out);

/* ---------- 2: one page per retailer ---------- */
const skim = grab(/<script[^>]*skimresources[^>]*><\/script>/);
const css = `:root{--bg:#0f0e13;--card:#1d1b24;--line:#2c2935;--ink:#f5f2ea;--mute:#b4afc0;--dim:#9d98ae;--hit:#dcff5c;--hold:#ff5fb4;--split:#3ee6d3;--check:#9b8cff;--serif:"Instrument Serif",Georgia,serif;--display:"Archivo",system-ui,sans-serif;--sans:"Inter",system-ui,sans-serif}
*{box-sizing:border-box;margin:0;padding:0}body{background:var(--bg);color:var(--ink);font-family:var(--sans);font-size:17px;line-height:1.55;-webkit-font-smoothing:antialiased}a{color:inherit}
.wrap{max-width:760px;margin:0 auto;padding:0 clamp(16px,5vw,40px)}
header{border-bottom:1px solid var(--line)}.bar{display:flex;align-items:center;justify-content:space-between;min-height:62px;gap:12px}
.logo{font-family:var(--serif);font-style:italic;font-size:28px;text-decoration:none}.logo b{color:var(--hold);font-style:normal}
.back{font-size:15px;font-weight:600;color:var(--mute)}
main{padding:36px 0 48px}.crumbs{font-size:14px;color:var(--dim);margin-bottom:14px}
h1{font-family:var(--display);font-weight:900;font-size:clamp(32px,6vw,50px);letter-spacing:-.03em;line-height:1.02;margin-bottom:18px}
h1 em{font-family:var(--serif);font-weight:400;color:var(--hold)}
h2{font-family:var(--display);font-weight:800;font-size:22px;margin:28px 0 10px}
.tag{display:inline-flex;align-items:center;font-family:var(--display);font-weight:800;font-size:14px;letter-spacing:.06em;text-transform:uppercase;padding:6px 12px;border-radius:99px;color:#111}
.tag.hit{background:var(--hit)}.tag.hold{background:var(--hold)}.tag.split{background:var(--split)}
.call{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--c);border-radius:16px;padding:18px 20px;display:grid;gap:10px}
.call.hit{--c:var(--hit)}.call.hold{--c:var(--hold)}.call.split{--c:var(--split)}
.call p{font-size:18px}.mean{font-size:15px;color:var(--mute)}
.off{color:#d9d4e2}.sub{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:14px;color:var(--dim);margin-top:10px}
.status{font-weight:600}.status.confirmed{color:var(--hit)}.status.announced{color:#7fd4ff}.status.expected{color:#f2d98a}.status.review{color:var(--check)}
.shopbtn{display:inline-block;margin-top:20px;font-weight:700;text-decoration:none;color:#111;background:var(--ink);padding:12px 20px;border-radius:99px}.shopbtn:hover{background:var(--hit)}
.afflabel{margin-left:10px;font-size:13px;color:var(--dim)}
.more{list-style:none;display:flex;flex-wrap:wrap;gap:8px}.more a{display:inline-block;padding:8px 14px;border:1px solid var(--line);border-radius:99px;background:var(--card);text-decoration:none;font-size:15px}.more a:hover{border-color:var(--hit)}
.discl{margin-top:28px;font-size:14px;color:var(--mute);border-left:3px solid var(--hold);padding-left:10px}
footer{border-top:1px solid var(--line);padding:28px 0 48px;color:var(--dim);font-size:14px}
.skip{position:absolute;left:12px;top:-60px;background:var(--hit);color:#111;font-weight:700;padding:10px 16px;border-radius:10px;text-decoration:none}.skip:focus{top:12px}
:focus-visible{outline:3px solid var(--hit);outline-offset:3px;border-radius:6px}.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}`;
const MEAN = { hit: "Buy now. I don't expect it to get cheaper.", split: "Buy some now, wait on the rest.", hold: "Wait. A better deal is likely coming." };
const trim = (t, n) => t.length <= n ? t : t.slice(0, t.lastIndexOf(" ", n - 1)).replace(/[,.;:]$/, "") + "…";

function page(d) {
  const s = slug(d.name), url = `${SITE}/${s}/`, v = V[d.verdict];
  const title = `${d.name} Black Friday ${year} Sale: Hit, Split or Hold? | Hill's List`;
  const desc = d.offer ? trim(`${d.name} Black Friday ${year}: ${d.offer} My call: ${v}.`, 158)
                       : `Is the ${d.name} Black Friday ${year} sale worth it? My call: ${v}. Offer details are still being checked.`;
  const shop = shopUrl(d);
  const related = deals.filter(x => x.category === d.category && x.name !== d.name);
  const ld = { "@context": "https://schema.org", "@graph": [
    { "@type": "WebPage", "@id": url, url, name: `${d.name} Black Friday ${year} Sale: Hit, Split or Hold?`, description: desc, inLanguage: "en-US",
      dateModified: today, isPartOf: { "@id": SITE + "/#site" }, author: { "@id": SITE + "/#hillary" },
      about: { "@type": "Organization", name: d.name } },
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Hill's List", item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: d.name, item: url } ] } ] };
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
${d.offer ? `<meta name="robots" content="index, follow, max-image-preview:large">` : `<meta name="robots" content="noindex, follow">`}
<link rel="icon" href="/favicon.ico?v=3" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/icon-32.png?v=3">
<link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2">
<meta name="theme-color" content="#0f0e13">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Hill's List">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${SITE}/og.png?v=4">
<meta property="og:image:alt" content="Hill's List: Hit, Split or Hold? Black Friday ${year} Edit at hillslist.com">
<meta name="twitter:card" content="summary_large_image">
<meta name="author" content="Hillary Herskowitz">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@800;900&family=Instrument+Serif:ital@0;1&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>${css}</style>
</head>
<body>
<a class="skip" href="#content">Skip to content</a>
<header><div class="wrap bar">
  <a class="logo" href="/" aria-label="Hill's List, home">hill's list<b aria-hidden="true">.</b></a>
  <a class="back" href="/#floor">All Black Friday deals</a>
</div></header>
<main id="content" tabindex="-1"><div class="wrap">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Hill's List</a> / ${esc(d.category)} / ${esc(d.name)}</nav>
  <h1>${esc(d.name)} Black Friday ${year}: <em>${v}</em></h1>
  <div class="call ${d.verdict}">
    <div><span class="tag ${d.verdict}">${v}</span></div>
    ${d.note ? `<p>${esc(d.note)}</p>` : ""}
    <p class="mean">${v} means: ${MEAN[d.verdict]}</p>
  </div>
  <h2>The offer</h2>
  <p class="off">${d.offer ? esc(d.offer) : "I'm still checking this offer. Hold for now."}</p>
  <div class="sub"><span class="status ${d.status}">${S[d.status]}</span>${d.checked ? `<span>Checked ${esc(d.checked)}</span>` : ""}${d.source ? `<a href="${esc(d.source)}" target="_blank" rel="noopener">Source<span class="sr"> for the ${esc(d.name)} offer, opens in a new tab</span> <span aria-hidden="true">↗</span></a>` : ""}</div>
  ${shop ? `<a class="shopbtn" href="${esc(shop)}" target="_blank" rel="noopener${d.aff ? " sponsored" : ""}">Shop ${esc(d.name)}<span class="sr"> (opens in a new tab)</span> <span aria-hidden="true">↗</span></a>${d.aff ? `<span class="afflabel">Affiliate link</span>` : ""}` : ""}
  <p class="discl">Prices and terms change fast. Always confirm the final price, exclusions and return policy at checkout. Some links on Hill's List are affiliate links, so I may earn a commission if you buy. It never changes my Hit, Split or Hold.</p>
  ${related.length ? `<h2>More ${esc(d.category)} calls</h2>
  <ul class="more">${related.map(x => `<li><a href="/${slug(x.name)}/">${esc(x.name)} <span class="sr">(${V[x.verdict]})</span></a></li>`).join("")}</ul>` : ""}
  <h2>Every Black Friday sale I'm tracking</h2>
  <p><a href="/#floor">See all ${DEALS.length} retailers and my call on each one</a>.</p>
</div></main>
<footer><div class="wrap">hillslist.com · Hit, Split or Hold? · © Hill's List ${year} · <a href="/#disclaimer">Fine print</a> · <a href="/#a11y">Accessibility</a></div></footer>
${skim}
</body>
</html>
`;
}
const indexed = [];
for (const d of deals) {
  const dir = path.join(ROOT, slug(d.name));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), page(d));
  if (d.offer) indexed.push(slug(d.name));
}

/* ---------- 3: sitemap ---------- */
const urls = [`${SITE}/`].concat(indexed.map(s => `${SITE}/${s}/`));
fs.writeFileSync(path.join(ROOT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u}</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq></url>`).join("\n")}
</urlset>
`);
console.log(`Built ${deals.length} retailer pages (${indexed.length} in sitemap), prerendered ${deals.length} cards, dateModified ${today}.`);
