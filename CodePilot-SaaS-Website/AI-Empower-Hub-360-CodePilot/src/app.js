const menuToggle = document.querySelector(".menu-toggle");
const navigation = document.querySelector("#site-nav");
const marketingHeader = document.querySelector(".site-header");
const marketingFooter = document.querySelector(".site-footer");
const landingPage = document.querySelector("#home");
const productDashboard = document.querySelector("#dashboard");
const aboutPage = document.querySelector("#about-page");
const useCasesPage = document.querySelector("#use-cases-page");
const signInPage = document.querySelector("#sign-in-page");
const copilotInput = document.querySelector("#copilot-input");
const conversation = document.querySelector("#conversation");
const chatEmptyState = document.querySelector("#chat-empty-state");
const modelStatus = document.querySelector("#cp-model-status");
const sendButton = document.querySelector(".copilot-send");
const conversationHistory = [];
const phaseStatus = document.querySelector("#project-phase-status");
const projectPhases = ["Requirements", "Planning", "Development", "Testing", "Deployment"];
const themeColor = document.querySelector('meta[name="theme-color"]');
const themeToggles = document.querySelectorAll(".theme-toggle");

function updateThemeControls(theme) {
  const isDark = theme !== "light";
  themeToggles.forEach((toggle) => {
    toggle.setAttribute("aria-checked", String(isDark));
    toggle.setAttribute("aria-label", "Dark mode");
    toggle.title = `Switch to ${isDark ? "light" : "dark"} theme`;
    toggle.querySelector(".theme-toggle-label").textContent = isDark ? "Dark" : "Light";
  });
  themeColor.content = isDark ? "#0B1120" : "#FFFFFF";
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  updateThemeControls(theme);
  try {
    localStorage.setItem("empowerhub-theme", theme);
  } catch (error) {
    console.warn("Unable to save the EmpowerHub theme preference.", error);
  }
}

updateThemeControls(document.documentElement.dataset.theme || "dark");
themeToggles.forEach((toggle) => {
  toggle.addEventListener("click", () => {
    const nextTheme = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
  });
});

menuToggle.addEventListener("click", () => {
  const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Open navigation" : "Close navigation");
  navigation.classList.toggle("is-open", !isOpen);
});

navigation.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
    navigation.classList.remove("is-open");
  });
});

document.querySelector("#year").textContent = new Date().getFullYear();

const pages = {
  home: landingPage,
  dashboard: productDashboard,
  about: aboutPage,
  "use-cases": useCasesPage,
  "sign-in": signInPage,
};

function showRoute(route) {
  const selectedPage = pages[route] ?? landingPage;
  const selectedRoute = selectedPage === landingPage ? "home" : route;
  Object.entries(pages).forEach(([name, page]) => {
    page.hidden = page !== selectedPage;
  });
  const inDashboard = selectedRoute === "dashboard";
  marketingHeader.hidden = inDashboard;
  marketingFooter.hidden = inDashboard;
  document.body.classList.toggle("workspace-open", inDashboard);
  document.querySelectorAll("[data-route]").forEach((link) => {
    if (link.closest(".site-header, .app-route-nav")) {
      link.classList.toggle("route-active", link.dataset.route === selectedRoute);
      if (link.dataset.route === selectedRoute) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }
  });
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Open navigation");
  navigation.classList.remove("is-open");
  document.documentElement.style.scrollBehavior = inDashboard ? "auto" : "";
  window.scrollTo(0, 0);
  if (inDashboard) copilotInput.focus({ preventScroll: true });
}

document.querySelectorAll("[data-route]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const route = link.dataset.route;
    history.pushState(null, "", `#${route}`);
    showRoute(route);
  });
});

window.addEventListener("popstate", () => {
  const route = window.location.hash.slice(1) || "home";
  if (pages[route]) showRoute(route);
});

window.addEventListener("hashchange", () => {
  const route = window.location.hash.slice(1) || "home";
  if (pages[route]) showRoute(route);
});

function setCurrentPhase(phaseName) {
  const phaseIndex = projectPhases.indexOf(phaseName);
  if (phaseIndex === -1) return;
  phaseStatus.textContent = `${phaseName} · Step ${phaseIndex + 1} of ${projectPhases.length}`;
}

function appendChatMessage(role, text) {
  if (chatEmptyState.isConnected) chatEmptyState.remove();
  const article = document.createElement("article");
  article.className = `chat-message ${role === "user" ? "user-message" : "assistant-message"}`;

  const avatar = document.createElement("span");
  avatar.className = `chat-avatar ${role === "user" ? "user-chat-avatar" : "copilot-avatar"}`;
  avatar.textContent = role === "user" ? "AM" : "✳";

  const body = document.createElement("div");
  body.className = "chat-message-body";

  const meta = document.createElement("div");
  meta.className = "message-meta";
  const sender = document.createElement("strong");
  sender.textContent = role === "user" ? "You" : (window.CODEPILOT_HOSTED_PREVIEW ? "CodePilot · Sample response" : "CodePilot · Local AI");
  const time = document.createElement("span");
  time.textContent = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date());
  meta.append(sender, time);

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  bubble.append(paragraph);
  body.append(meta, bubble);
  article.append(avatar, body);
  conversation.append(article);
  conversation.classList.remove("is-welcome");
  conversation.scrollTop = conversation.scrollHeight;
}

function getDemoReply(prompt) {
  const normalizedPrompt = prompt.toLowerCase();
  if (/\b(requirement|requirements|scope|user story|acceptance criteria|problem statement)\b/.test(normalizedPrompt)) {
    setCurrentPhase("Requirements");
    return "Let's define a clear first version. Who is the primary user, what problem do they need solved, and what are the must-have outcomes? We can turn your answers into user stories and acceptance criteria before planning implementation. This prototype doesn't send your message to an AI service.";
  }
  if (/\b(test|testing|qa|quality)\b/.test(normalizedPrompt)) {
    setCurrentPhase("Testing");
    return "A practical test plan starts with the critical user journeys: verify the happy path, invalid inputs, permissions, and responsive layouts. Add unit tests for isolated logic, integration tests for connected services, and an end-to-end check for the main workflow. These are planning suggestions only—this demo cannot run tests.";
  }
  if (/\b(deploy|deployment|release|hosting|production)\b/.test(normalizedPrompt)) {
    setCurrentPhase("Deployment");
    return "For a deployment plan, first choose your hosting target, define environment variables and secrets, run the production build and test suite in CI, then release to a staging environment before production. Add monitoring and a rollback path. No build, hosting account, or deployment is connected in this demo.";
  }
  if (/\b(plan|planning|milestone|timeline|steps)\b/.test(normalizedPrompt)) {
    setCurrentPhase("Planning");
    return "A useful first plan is: 1) confirm the user problem and scope, 2) agree on success criteria, 3) split the work into reviewable milestones, 4) implement and test each increment, and 5) prepare a staged release. Tell me your target users, must-have features, and deadline to tailor the plan. This reply is simulated.";
  }
  if (/\b(code|develop|development|implement|build|create|feature)\b/.test(normalizedPrompt)) {
    setCurrentPhase("Development");
    return "Before implementation, confirm the acceptance criteria, target users, and preferred technology. Then break the work into small changes, review each code diff, and run the relevant tests. I can help outline those steps here; this demo cannot generate or apply real code.";
  }
  setCurrentPhase("Requirements");
  return "Let's shape the requirements together. Who will use this product, what problem should it solve, and what are the three most important things it needs to do? Also share any platform, data, accessibility, or timeline constraints. This prototype doesn't send your message to an AI service.";
}

async function checkLocalAI() {
  if (window.CODEPILOT_HOSTED_PREVIEW) {modelStatus.textContent="Interactive demo · sample replies, not live AI";return;}
  try {
    const response = await fetch("/api/ai/status", { cache: "no-store" });
    if (!response.ok) throw new Error("Server unavailable");
    const data = await response.json();
    modelStatus.textContent = data.ready ? `Local AI connected · ${data.model}` : `Local AI offline · ${data.message}`;
    modelStatus.classList.toggle("connected", data.ready);
    modelStatus.classList.toggle("offline", !data.ready);
  } catch {
    modelStatus.textContent = "Local AI unavailable · Open through the Node.js server";
    modelStatus.classList.add("offline");
  }
}

checkLocalAI();
document.querySelector("#copilot-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const prompt = copilotInput.value.trim();
  if (!prompt || sendButton.disabled) return;
  appendChatMessage("user", prompt);
  conversationHistory.push({ role: "user", content: prompt });
  copilotInput.value = "";
  sendButton.disabled = true;
  modelStatus.textContent = "Local AI is thinking…";
  try {
    if (window.CODEPILOT_HOSTED_PREVIEW) {appendChatMessage("assistant", "Sample response · " + getDemoReply(prompt));return;}
    const response = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: conversationHistory.slice(-16) }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "AI request failed");
    const reply = result.message || "The model returned an empty response.";
    appendChatMessage("assistant", reply);
    conversationHistory.push({ role: "assistant", content: reply });
    const matchedPhase = projectPhases.find((phase) => prompt.toLowerCase().includes(phase.toLowerCase()));
    if (matchedPhase) setCurrentPhase(matchedPhase);
  } catch (error) {
    appendChatMessage("assistant", `Local AI error: ${error.message}. Make sure Ollama is running and the model is installed.`);
    conversationHistory.pop();
  } finally {
    sendButton.disabled = false;
    checkLocalAI();
    copilotInput.focus();
  }
});

document.querySelectorAll("[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => {
    copilotInput.value = button.dataset.prompt;
    copilotInput.focus({ preventScroll: true });
    document.querySelector("#copilot-form").scrollIntoView({ behavior: "smooth", block: "center" });
  });
});

copilotInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    document.querySelector("#copilot-form").requestSubmit();
  }
});

document.querySelector("#new-project").addEventListener("click", () => {
  conversation.replaceChildren();
  conversation.append(chatEmptyState);
  conversationHistory.length = 0;
  setCurrentPhase("Requirements");
  copilotInput.value = "";
  conversation.scrollTop = 0;
});

document.querySelector("#sign-in-form").addEventListener("submit", (event) => {
  event.preventDefault();
  history.pushState(null, "", "#dashboard");
  showRoute("dashboard");
});

document.querySelectorAll('#footer-pricing-link, #footer-faq-link').forEach((link) => {
  link.addEventListener('click', () => {
    if (landingPage.hidden) {
      showRoute('home');
      requestAnimationFrame(() => document.querySelector(link.getAttribute('href'))?.scrollIntoView());
    }
  });
});
showRoute(window.location.hash.slice(1) || "home");

// Marketing interactions.
document.querySelectorAll('[data-section]').forEach(link => link.addEventListener('click', event => {event.preventDefault();showRoute('home');history.pushState(null,'','#'+link.dataset.section);document.getElementById(link.dataset.section)?.scrollIntoView({behavior:'smooth'});}));
document.querySelectorAll('[data-billing]').forEach(button => button.addEventListener('click',()=>{const annual=button.dataset.billing==='annual';document.querySelectorAll('[data-billing]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));document.querySelector('[data-price="pro"]').textContent=annual?'15.20':'19';document.querySelector('[data-price="team"]').textContent=annual?'39.20':'49';document.querySelectorAll('[data-billing-note]').forEach(n=>n.textContent=annual?'Proposed price, billed annually':'Proposed monthly price');}));
const workflowExamples={plan:'## Customer portal\n\n01  Define user roles\n02  Plan authentication\n03  Build dashboard UI\n04  Review test cases\n05  Prepare deployment',code:'// Illustrative implementation sketch\n\nasync function loadProjects() {\n  const response = await fetch("/api/projects");\n  if (!response.ok) throw new Error("Load failed");\n  return response.json();\n}',review:'## Release checklist\n\n[ ] Verify authentication\n[ ] Check project access rules\n[ ] Test loading and error states\n[ ] Review keyboard navigation\n[ ] Confirm rollback plan'};
document.querySelectorAll('[data-example]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-example]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));document.getElementById('workflow-example').textContent=workflowExamples[button.dataset.example];}));
