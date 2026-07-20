const { createServer } = require("https");
const { createServer: createHttpServer } = require("http");
const { parse } = require("url");
const next = require("next");
const fs = require("fs");

const dev = process.env.NODE_ENV !== "production";
const httpsPort = 3443;
const httpPort = 3444;

// SSL Certificate
let httpsOptions;
try {
  httpsOptions = {
    key: fs.readFileSync("/etc/pki/tls/private/vos-billing.key"),
    cert: fs.readFileSync("/etc/pki/tls/certs/vos-billing.crt"),
  };
} catch (err) {
  console.error("Failed to load SSL certificates:", err.message);
  process.exit(1);
}

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // HTTPS server (primary)
  createServer(httpsOptions, (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(httpsPort, (err) => {
    if (err) throw err;
    console.log(`> HTTPS server ready on https://0.0.0.0:${httpsPort}`);
  });

  // HTTP server — redirects all traffic to HTTPS
  createHttpServer((req, res) => {
    const host = req.headers.host?.replace(`:${httpPort}`, `:${httpsPort}`) || `51.161.47.101:${httpsPort}`;
    res.writeHead(301, { Location: `https://${host}${req.url}` });
    res.end();
  }).listen(httpPort, (err) => {
    if (err) throw err;
    console.log(`> HTTP server ready on http://0.0.0.0:${httpPort}`);
  });
});
