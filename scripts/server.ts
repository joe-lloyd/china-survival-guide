import fs from "fs";
import path from "path";
import http from "http";
import { generateHtml } from "./markdown-processor";

const ROOT = path.resolve(__dirname, "..");
const PORT = 3000;

// Create a simple HTTP server
const server = http.createServer((req, res) => {
  console.log(`Request received: ${req.url}`);
  
  // Serve CSS file
  if (req.url === "/styles.css") {
    const cssPath = path.join(ROOT, "styles.css");
    if (fs.existsSync(cssPath)) {
      const cssContent = fs.readFileSync(cssPath, "utf8");
      res.writeHead(200, { "Content-Type": "text/css" });
      res.end(cssContent);
      return;
    }
  }
  
  // Handle image requests
  if (req.url && req.url.startsWith("/images/")) {
    const imagePath = path.join(ROOT, req.url);
    if (fs.existsSync(imagePath)) {
      const ext = path.extname(imagePath).toLowerCase();
      let contentType = "application/octet-stream";
      
      if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
      else if (ext === ".png") contentType = "image/png";
      else if (ext === ".gif") contentType = "image/gif";
      else if (ext === ".webp") contentType = "image/webp";
      
      const imageData = fs.readFileSync(imagePath);
      res.writeHead(200, { "Content-Type": contentType });
      res.end(imageData);
      return;
    }
  }
  
  // For all other requests, generate and serve the HTML preview
  try {
    // Generate HTML with debug panel included
    const htmlPath = path.join(ROOT, "out", "guide.html");
    generateHtml(htmlPath, true);
    
    if (fs.existsSync(htmlPath)) {
      const htmlContent = fs.readFileSync(htmlPath, "utf8");
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(htmlContent);
    } else {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Error generating HTML file");
    }
  } catch (error: unknown) {
    console.error("Error serving content:", error);
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end(`Server error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

// Start the server
server.listen(PORT, () => {
  console.log(`Preview server running at http://localhost:${PORT}`);
  console.log(`Press Ctrl+C to stop the server`);
});
