(() => {
  "use strict";
  const SEND = "accepted-solutions-sync";
  const clean = value => String(value || "").replace(/\s+/g, " ").trim();
  const emit = item => window.postMessage({ source: SEND, type: "accepted", ...item }, location.origin);
  if (location.hostname === "leetcode.com") installLeetCode();
  if (location.hostname === "www.geeksforgeeks.org") installGfg();
  if (location.hostname === "codeforces.com") installCodeforces();

  function installLeetCode() {
    const originalFetch = window.fetch;
    window.fetch = async function(input, init) {
      const url = typeof input === "string" ? input : input?.url || "";
      const method = String(init?.method || input?.method || "GET").toUpperCase();
      let body = init?.body;
      if (body == null && input instanceof Request) body = await input.clone().text().catch(() => "");
      const result = await originalFetch.apply(this, arguments);
      if (method === "POST" && /\/problems\/[^/]+\/submit\//.test(url)) {
        Promise.resolve().then(async () => {
          try {
            const payload = typeof body === "string" ? JSON.parse(body) : Object.fromEntries(body || []);
            const code = payload.typed_code || payload.code;
            const slug = location.pathname.match(/\/problems\/([^/]+)/)?.[1];
            const response = await result.clone().json();
            const id = String(response.submission_id || response.submissionId || "");
            if (!code || !slug || !id) return;
            const final = await pollLeetCode(id);
            if (!final) return;
            const title = await leetCodeTitle(slug);
            emit({ platform: "leetcode", submissionId: id, title, code, language: payload.lang || "txt", url: `https://leetcode.com/problems/${slug}/`, timestamp: Math.floor(Date.now() / 1000) });
          } catch (_) {}
        });
      }
      return result;
    };

    async function pollLeetCode(id) {
      for (let i = 0; i < 45; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
          const r = await originalFetch(`/submissions/detail/${encodeURIComponent(id)}/check/`, { credentials: "include", cache: "no-store" });
          const j = await r.json();
          if (j.state === "SUCCESS") return j.status_code === 10 || j.status_msg === "Accepted";
          if (j.state === "FAILURE") return false;
        } catch (_) {}
      }
      return false;
    }

    async function leetCodeTitle(slug) {
      try {
        const r = await originalFetch("/graphql", {
          method: "POST", credentials: "include", headers: { "content-type": "application/json" },
          body: JSON.stringify({ query: "query($s: String!) { question(titleSlug: $s) { title } }", variables: { s: slug } })
        });
        const j = await r.json();
        return clean(j.data?.question?.title) || clean(document.querySelector("h1")?.textContent) || slug;
      } catch (_) { return clean(document.querySelector("h1")?.textContent) || slug; }
    }
  }

  function installGfg() {
    const originalFetch = window.fetch;
    let pending = null;
    let seq = 0;
    window.fetch = async function(input, init) {
      const url = typeof input === "string" ? input : input?.url || "";
      const method = String(init?.method || input?.method || "GET").toUpperCase();
      let body = init?.body;
      if (body == null && input instanceof Request) body = await input.clone().formData().catch(() => null);
      const result = await originalFetch.apply(this, arguments);
      if (method === "POST" && /\/api\/latest\/problems\/[^/]+\/submit\/compile\//.test(url) && body) {
        const form = body instanceof FormData ? body : new URLSearchParams(String(body));
        const requestType = form.get?.("request_type");
        const code = form.get?.("userCode");
        if (code && (!requestType || requestType === "solutionCheck")) {
          const slug = location.pathname.match(/\/problems\/([^/]+)/)?.[1];
          pending = { id: `gfg-${Date.now()}-${++seq}`, slug, code, language: form.get("language") || "txt", title: clean(document.querySelector("h1")?.textContent) || clean(document.title.replace(/\s*[-|].*$/, "")) || slug, url: location.href };
        }
      }
      if (method === "POST" && /\/api\/latest\/problems\/submission\/submit\/result\//.test(url) && pending) {
        const candidate = pending;
        Promise.resolve().then(async () => {
          try {
            const j = await result.clone().json();
            if (j.view_mode === "correct" || j.status === "SUCCESS" && j.view_mode === "correct") {
              emit({ platform: "gfg", submissionId: candidate.id, title: candidate.title, code: candidate.code, language: candidate.language, url: candidate.url, timestamp: Math.floor(Date.now() / 1000) });
              if (pending === candidate) pending = null;
            }
          } catch (_) {}
        });
      }
      return result;
    };
  }

  function installCodeforces() {
    let running = false;
    window.addEventListener("message", event => {
      if (event.source !== window || event.origin !== location.origin) return;
      if (event.data?.source === SEND && event.data.type === "resume-codeforces" && event.data.submission) {
        waitForAccepted(event.data.submission.code, event.data.submission.startedAt, event.data.submission)
          .catch(() => {})
          .finally(() => { running = false; });
      }
    });
    const observer = new MutationObserver(() => {
      const path = location.pathname;
      const supportedPage =
        /\/(?:contest|gym)\/\d+\/(?:problem\/[^/]+|submit)\/?$/.test(path) ||
        /\/problemset\/problem\/\d+\/[^/]+\/?$/.test(path);
      if (running || !supportedPage) return;
      const form = [...document.forms].find(f => f.querySelector('textarea[name="source"]'));
      if (!form) return;
      const button = form.querySelector('input[type="submit"],button[type="submit"]');
      if (!button || button.dataset.acceptedSyncBound) return;
      button.dataset.acceptedSyncBound = "1";
      form.addEventListener("submit", () => {
        const code = form.querySelector('textarea[name="source"]')?.value;
        if (!code) return;
        const start = Math.floor(Date.now() / 1000) - 1;
        const parts = location.pathname.match(/\/(contest|gym)\/(\d+)\/problem\/([^/]+)/);
        const problemset = location.pathname.match(/\/problemset\/problem\/(\d+)\/([^/]+)/);
        const contestPage = location.pathname.match(/\/(contest|gym)\/(\d+)\/submit\/?$/);
        const problemSelect = form.querySelector('select[name="submittedProblemIndex"]');
        const contestId = parts?.[2] || problemset?.[1];
        const index = parts?.[3] || problemset?.[2] || (contestPage ? problemSelect?.value : "");
        const resolvedContestId = contestId || contestPage?.[2];
        if (!resolvedContestId || !index) return;
        const selectedProblemName = problemSelect?.selectedOptions?.[0]?.textContent
          ?.replace(/^[A-Z0-9]+\s*[.)-]\s*/, "");
        const problemName = clean(document.querySelector(".problem-statement .header .title")?.textContent) || clean(document.querySelector(".problem-statement .title")?.textContent) || clean(selectedProblemName) || `${resolvedContestId}${index}`;
        const pending = { code, startedAt: start, contestId: resolvedContestId, index, problemName, url: location.href };
        emit({ type: "pending-codeforces", submission: pending });
        waitForAccepted(code, start, pending).catch(() => {}).finally(() => { running = false; });
      }, true);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    async function waitForAccepted(code, start, pending) {
      if (running) return;
      running = true;
      const contestId = pending.contestId;
      const index = pending.index;
      if (!contestId || !index) return;
      let handle = "";
      for (let i = 0; i < 20 && !handle; i++) {
        handle = clean(document.querySelector('.lang-chooser a[href^="/profile/"]')?.textContent);
        if (!handle) await new Promise(resolve => setTimeout(resolve, 500));
      }
      if (!handle) return;
      for (let i = 0; i < 60; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
          const response = await window.fetch(`/api/user.status?handle=${encodeURIComponent(handle)}&count=10`, { credentials: "include", cache: "no-store" });
          const payload = await response.json();
          const subs = (payload.result || []).filter(s => s.creationTimeSeconds >= start && s.problem?.contestId == contestId && s.problem?.index === index);
          const accepted = subs.find(s => s.verdict === "OK");
          if (accepted) {
            emit({ type: "accepted", platform: "codeforces", submissionId: String(accepted.id), title: `${contestId}${index} - ${pending.problemName}`, code, language: accepted.programmingLanguage || "txt", url: pending.url, timestamp: accepted.creationTimeSeconds });
            return;
          }
          if (subs.some(s => s.verdict && s.verdict !== "TESTING")) return;
        } catch (_) {}
      }
    }
  }
})();
