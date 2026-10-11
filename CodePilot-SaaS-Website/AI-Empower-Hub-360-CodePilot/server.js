const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const ROOT = __dirname;
const PORT = Number.parseInt(process.env.PORT || "4173", 10);
const HOST = "127.0.0.1";
const TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error(`Invalid PORT value: ${process.env.PORT}`);
}

function sendText(response, statusCode, message, method) {
  response.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Length": Buffer.byteLength(message),
    "Cache-Control": "no-store",
  });
  response.end(method === "HEAD" ? undefined : message);
}

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5-coder:7b";
const SYSTEM_PROMPT = "You are CodePilot, a practical software development assistant. Help with requirements, planning, code, tests, and deployment guidance. Be accurate. You cannot access project files, execute code, run tests, or deploy apps; never claim that you did. Ask for relevant code or logs when needed.";
function sendJSON(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(body), "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  response.end(body);
}
async function readJSON(request) {
  let text = "";
  for await (const chunk of request) {
    text += chunk;
    if (text.length > 80000) throw new Error("Request too large");
  }
  return JSON.parse(text);
}
async function ollamaFetch(endpoint, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), endpoint === "/api/chat" ? 120000 : 5000);
  try { return await fetch(new URL(endpoint, OLLAMA_URL), { ...options, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}
const server = http.createServer(async (request, response) => {
  const route = new URL(request.url, `http://${HOST}`).pathname;
  if (route === "/api/ai/status" && request.method === "GET") {
    try {
      const result = await ollamaFetch("/api/tags");
      if (!result.ok) throw new Error("Ollama not responding");
      const data = await result.json();
      const ready = Array.isArray(data.models) && data.models.some((m) => m.name === OLLAMA_MODEL || m.model === OLLAMA_MODEL);
      sendJSON(response, 200, { ready, model: OLLAMA_MODEL, message: ready ? "Connected" : `Install ${OLLAMA_MODEL} in Ollama` });
    } catch { sendJSON(response, 200, { ready: false, model: OLLAMA_MODEL, message: "Start Ollama on this computer" }); }
    return;
  }
  if (route === "/api/ai/chat" && request.method === "POST") {
    try {
      if (request.headers["content-type"]?.split(";")[0] !== "application/json") { sendJSON(response, 415, { error: "JSON required" }); return; }
      const body = await readJSON(request);
      if (!Array.isArray(body.messages) || !body.messages.length || body.messages.length > 16 || body.messages.some((m) => !["user", "assistant"].includes(m.role) || typeof m.content !== "string" || m.content.length > 10000)) { sendJSON(response, 400, { error: "Invalid chat messages" }); return; }
      const upstream = await ollamaFetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: OLLAMA_MODEL, stream: false, messages: [{ role: "system", content: SYSTEM_PROMPT }, ...body.messages], options: { num_predict: 1024 } }) });
      if (!upstream.ok) { sendJSON(response, 502, { error: `Ollama returned HTTP ${upstream.status}. Check the installed model.` }); return; }
      const data = await upstream.json();
      sendJSON(response, 200, { message: data.message?.content || "", model: OLLAMA_MODEL });
    } catch (error) { sendJSON(response, error.message === "Request too large" ? 413 : 503, { error: error.message === "Request too large" ? error.message : "Ollama is unavailable or the request timed out" }); }
    return;
  }
  if (route.startsWith("/api/")) { sendJSON(response, 404, { error: "API route not found" }); return; }
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.setHeader("Allow", "GET, HEAD");
    sendText(response, 405, "Method not allowed", request.method);
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, `http://${HOST}`).pathname);
  } catch {
    sendText(response, 400, "Invalid URL", request.method);
    return;
  }

  const relativePath = pathname.replace(/^[/\\]+/, "").replace(/[\\/]+/g, path.sep);
  const filePath = path.resolve(ROOT, relativePath || "index.html");
  const relativeToRoot = path.relative(ROOT, filePath);
  if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    sendText(response, 403, "Forbidden", request.method);
    return;
  }

  let fileInfo;
  try {
    fileInfo = await fs.promises.stat(filePath);
    if (!fileInfo.isFile()) {
      sendText(response, 404, "Not found", request.method);
      return;
    }
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") {
      sendText(response, 404, "Not found", request.method);
      return;
    }
    console.error(`Unable to read ${pathname}:`, error);
    sendText(response, 500, "Internal server error", request.method);
    return;
  }

  response.writeHead(200, {
    "Content-Type": TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream",
    "Content-Length": fileInfo.size,
    "Cache-Control": "no-cache",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'",
  });

  if (request.method === "HEAD") {
    response.end();
    return;
  }

  const fileStream = fs.createReadStream(filePath);
  fileStream.on("error", (error) => {
    console.error(`Unable to stream ${pathname}:`, error);
    if (!response.headersSent) sendText(response, 500, "Internal server error", request.method);
    else response.destroy(error);
  });
  fileStream.pipe(response);
});

server.on("error", (error) => {
  console.error(`Local server failed: ${error.message}`);
  process.exitCode = 1;
});

server.listen(PORT, HOST, () => {
  console.log(`EmpowerHub Copilot is running at http://${HOST}:${PORT}`);
  console.log("Press Ctrl+C to stop the local server.");
});
