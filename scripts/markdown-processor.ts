import fs from "fs";
import path from "path";
import markdownIt from "markdown-it";
import anchor from "markdown-it-anchor";
// @ts-ignore
const emojiToolkit = require("emoji-toolkit");

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "out");

// Get all markdown files
export function getMarkdownFiles() {
  // Make sure README.md exists before adding it
  const readmePath = path.join(ROOT, "README.md");
  const hasReadme = fs.existsSync(readmePath);
  
  // Get guide files
  const guideFiles = fs
    .readdirSync(path.join(ROOT, "guide"))
    .map((f) => path.join(ROOT, "guide", f))
    .filter((f) => f.endsWith(".md"));
  
  // Combine all files, with README first if it exists
  const allFiles = [
    ...(hasReadme ? [readmePath] : []),
    ...guideFiles,
  ];
  
  return allFiles.filter((f) => !f.endsWith("CONTRIBUTING.md"));
}

// Combine all markdown files into one
export function combineMarkdown(files: string[]): string {
  let combined = "";
  
  for (const file of files) {
    let content = fs.readFileSync(file, "utf8");
    
    if (file !== files[0]) {
      // Add section heading for all files except the first one (README)
      const section = path
        .basename(file, ".md")
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (s) => s.toUpperCase());
      combined += `\n\n<h1 id="${section
        .toLowerCase()
        .replace(/ /g, "-")}">${section}</h1>\n\n`;
    }
    
    combined += content + "\n\n";
  }
  
  return combined;
}


// Convert markdown to HTML
export function markdownToHtml(md: string, includeDebug = false): string {
  const mdIt = markdownIt({
    html: true,
    linkify: true,
    typographer: true,
  }).use(anchor, { permalink: anchor.permalink.headerLink() });

  // Convert emoji shortcodes to Unicode
  const withEmojis = emojiToolkit.shortnameToUnicode(md);

  // Fix double spaces after apostrophes that emoji-toolkit introduces
  const fixedEmojis = withEmojis.replace(/('\s+)/g, "'");

  // Process the markdown
  const body = mdIt.render(fixedEmojis);

  // Debug panel for development
  let debugPanel = "";
  if (includeDebug) {
    debugPanel = `
    <div id="debug" class="debug-info">
      <h3>Debug Information</h3>
      <p>Original Markdown Length: ${md.length} characters</p>
      <p>Processed HTML Length: ${body.length} characters</p>
      <p>Emoji-toolkit version: ${emojiToolkit.lib_version}</p>
      <h4>Sample apostrophe test:</h4>
      <p>Original: you'll can't don't</p>
      <p>After emoji processing: ${emojiToolkit.shortnameToUnicode(
        "you'll can't don't"
      )}</p>
    </div>
    <script>
      function toggleDebug() {
        const debug = document.getElementById('debug');
        debug.style.display = debug.style.display === 'none' ? 'block' : 'none';
      }
    </script>`;
  }

  // Split content by h1 tags to create multiple pages
  let pages = [];
  if (body.includes("<h1")) {
    // Split by h1 tags, but keep the h1 tag with its content
    const h1Regex = /(<h1[^>]*>.*?<\/h1>)/g;
    const parts = body.split(h1Regex);

    // First part (before any h1) goes on first page
    let currentPage = parts[0];

    // Process remaining parts
    for (let i = 1; i < parts.length; i++) {
      if (i % 2 === 1) {
        // This is an h1 tag
        // Start a new page with this h1
        if (currentPage.trim()) {
          pages.push(currentPage);
        }
        currentPage = parts[i];
      } else {
        // This is content after an h1
        currentPage += parts[i];
      }
    }

    // Add the last page
    if (currentPage.trim()) {
      pages.push(currentPage);
    }
  } else {
    // If no h1 tags, just one page
    pages = [body];
  }

  // Create HTML for all pages
  const pagesHtml = pages
    .map((page) => `<div class="page">${page}</div>`)
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>China Survival Guide</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  ${
    includeDebug
      ? '<div class="controls"><button onclick="location.reload()">Refresh</button><button onclick="toggleDebug()">Toggle Debug</button></div>'
      : ""
  }
  <div class="content-wrapper">
    ${pagesHtml}
  </div>
  ${debugPanel}
</body>
</html>`;
}

// Ensure output directory exists
export function ensureOutDir() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);
  return OUT_DIR;
}

// Generate HTML file
export function generateHtml(
  outputPath: string = path.join(OUT_DIR, "guide.html"),
  includeDebug = false
): string {
  ensureOutDir();
  const files = getMarkdownFiles();
  const combinedMd = combineMarkdown(files);
  const html = markdownToHtml(combinedMd, includeDebug);

  fs.writeFileSync(outputPath, html);
  return outputPath;
}

// Main function to be called when script is run directly
if (require.main === module) {
  const htmlPath = generateHtml();
  console.log(`HTML generated at ${htmlPath}`);
}
