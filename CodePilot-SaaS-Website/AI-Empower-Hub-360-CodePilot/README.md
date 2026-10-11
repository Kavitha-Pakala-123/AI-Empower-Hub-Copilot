# AI Empower Hub 360 CodePilot — local development preview

## Start on Windows

1. Open this project folder in VS Code.
2. Ensure Ollama is installed and running and that `qwen2.5-coder:7b` is downloaded.
3. In the VS Code terminal, run `npm.cmd start`.
4. Open http://127.0.0.1:4173/ and select **Open workspace**.

The backend proxies chat requests to Ollama at http://127.0.0.1:11434 using `qwen2.5-coder:7b`. Override with environment variables `OLLAMA_URL` and `OLLAMA_MODEL` if necessary. Node.js 18+ required. No external npm packages required.

## Current implementation

- Responsive marketing homepage with product showcase, use cases, future pricing concepts, FAQ, and CTA.
- Existing dashboard, About, Use Cases, and demo sign-in preserved.
- Real local AI text chat through the Node.js server when Ollama is running.
- Local chat history is kept in browser memory for the active conversation; New project resets it.
- Clear local AI connection state and error messages.

## Not implemented / not safe for public hosting

- Sign-in is **demo only**; it does not authenticate users. Do not enter real passwords.
- Subscription pricing is conceptual; **no billing is active**.
- No customer data isolation, database, or account administration.
- No project file access, editor integration, automated code changes, test execution, or deployment.
- No rate limiting, production-grade security, or multi-tenant backend. **Do not expose this local server publicly.**

## Recommended next stages

1. Choose a hosted deployment and identity provider; implement real auth and per-user storage.
2. Add persistent projects, editor and file explorer with sandboxed, permissioned file access.
3. Add reviewed code diffs and sandboxed test runner.
4. Add account settings, quotas, usage metering, and admin controls.
5. Add subscription billing only after approval and end-to-end security tests.


## SaaS website update
Premium responsive marketing design, product navigation, interactive workflow examples, proposed monthly/annual pricing, and a transparent roadmap. Proposed prices are placeholders, not active subscriptions. The hosted website is a static product preview; local Ollama chat works only through the supplied Node.js server. Customer authentication, billing, hosted AI, and multi-tenant storage require implementation before commercial launch.
