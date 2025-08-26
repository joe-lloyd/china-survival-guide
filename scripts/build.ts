import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";
import { generateHtml } from "./markdown-processor";
import http from "http";
import { AddressInfo } from "net";
import mime from "mime-types";

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "out");

// Create a simple file server to serve local files including images
async function createLocalServer(): Promise<{ server: http.Server; url: string }> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      // Remove the leading slash and decode URI components
      let filePath = decodeURIComponent(req.url?.slice(1) || '');
      
      // Map root requests to the HTML file
      if (filePath === '') {
        filePath = 'out/guide.html';
      }
      
      // Construct absolute file path
      const absolutePath = path.join(ROOT, filePath);
      
      // Ensure the path is within our project directory (security check)
      if (!absolutePath.startsWith(ROOT)) {
        res.statusCode = 403;
        res.end('Forbidden');
        return;
      }
      
      // Check if file exists
      if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile()) {
        // Determine content type
        const contentType = mime.lookup(absolutePath) || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);
        
        // Stream the file
        const fileStream = fs.createReadStream(absolutePath);
        fileStream.pipe(res);
      } else {
        res.statusCode = 404;
        res.end('Not Found');
      }
    });
    
    server.listen(0, '127.0.0.1', () => {
      const address = server.address() as AddressInfo;
      const url = `http://127.0.0.1:${address.port}`;
      resolve({ server, url });
    });
  });
}

async function htmlToPdf(htmlPath: string, outPath: string) {
  // Start local server to serve images and other assets
  const { server, url } = await createLocalServer();
  
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // Load HTML from file instead of passing content directly
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // Add CSS directly to the HTML content to ensure it's included in the PDF
    const cssPath = path.join(ROOT, 'styles.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    
    // Replace the CSS link with inline CSS
    let htmlWithInlineCSS = htmlContent.replace('<link rel="stylesheet" href="/styles.css">', `<style>${cssContent}</style>`);
    
    // Remove any debug panels or controls that might be in the HTML
    htmlWithInlineCSS = htmlWithInlineCSS
      .replace(/<div class="controls">.*?<\/div>/s, '')
      .replace(/<div id="debug".*?<\/div>\s*<script>[\s\S]*?<\/script>/s, '');
    
    // Update image and audio paths to use the local server URL
    htmlWithInlineCSS = htmlWithInlineCSS
      .replace(/src=\"(\/images\/[^"]+)\"/g, `src="${url}$1"`) // Fix image paths
      .replace(/src=\"(\/audio\/[^"]+)\"/g, `src="${url}$1"`); // Fix audio paths
    
    // Navigate to the local server URL
    await page.goto(`${url}/out/guide.html`, { waitUntil: "networkidle0" });
    
    // Set the HTML content with updated paths
    await page.setContent(htmlWithInlineCSS, { waitUntil: "networkidle0" });
    
    // Wait for images to load
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        const images = document.querySelectorAll('img');
        if (images.length === 0) resolve();
        
        let loaded = 0;
        const onLoad = () => {
          loaded++;
          if (loaded === images.length) resolve();
        };
        
        images.forEach(img => {
          if (img.complete) onLoad();
          else img.addEventListener('load', onLoad);
        });
      });
    });
    
    // Generate PDF
    await page.pdf({
      path: outPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '32mm',
        bottom: '32mm',
        left: '20mm',
        right: '20mm'
      },
      displayHeaderFooter: false
    });
    
    await browser.close();
  } finally {
    // Always close the server
    server.close();
  }
}

async function main() {
  // First, generate the HTML file
  const htmlPath = generateHtml(path.join(OUT_DIR, "guide.html"), false);
  
  // Then convert it to PDF
  const outPdf = path.join(OUT_DIR, "Guide.pdf");
  await htmlToPdf(htmlPath, outPdf);
  console.log(`PDF generated at ${outPdf}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
