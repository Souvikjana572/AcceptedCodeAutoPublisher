(() => {
  const allowed = new Set(["www.geeksforgeeks.org", "leetcode.com", "codeforces.com"]);
  if (!allowed.has(location.hostname)) return;

  window.addEventListener("message", event => {
    if (event.source !== window || event.origin !== location.origin) return;
    const data = event.data;
    if (!data || data.source !== "accepted-solutions-sync") return;
    if (data.type === "pending-codeforces") {
      chrome.runtime.sendMessage({ type: "pending-codeforces", submission: data.submission }).catch(() => {});
      return;
    }
    if (data.type !== "accepted" || typeof data.code !== "string" || !data.code.trim() || !data.submissionId) return;
    if (!["gfg", "leetcode", "codeforces"].includes(data.platform)) return;
    chrome.runtime.sendMessage({ type: "accepted", submission: data }).catch(() => {});
  });

  if (location.hostname === "codeforces.com") {
    chrome.runtime.sendMessage({ type: "get-pending-codeforces" }).then(pending => {
      if (pending) window.postMessage({ source: "accepted-solutions-sync", type: "resume-codeforces", submission: pending }, location.origin);
    }).catch(() => {});
  }
})();
