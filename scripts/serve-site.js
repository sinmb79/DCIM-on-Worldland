const fs = require("fs");
const http = require("http");
const path = require("path");

const ROOT = path.join(__dirname, "..", "site");
const PORT = Number(process.env.SITE_PORT || 8080);

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8"
};

function resolvePath(urlPath) {
  const pathname = urlPath === "/" ? "/index.html" : urlPath;
  const absolutePath = path.join(ROOT, pathname);

  if (!absolutePath.startsWith(ROOT)) {
    return null;
  }

  return absolutePath;
}

const server = http.createServer((req, res) => {
  const targetPath = resolvePath(req.url || "/");

  if (!targetPath) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bad request");
    return;
  }

  fs.readFile(targetPath, (error, content) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    const ext = path.extname(targetPath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream"
    });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`Serving DCIP site at http://127.0.0.1:${PORT}`);
});
