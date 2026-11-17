const PLATFORM_KEYS = {
  gfg: "gfgRepo",
  leetcode: "leetcodeRepo",
  codeforces: "codeforcesRepo"
};

chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (message?.type === "pending-codeforces" && message.submission) {
    chrome.storage.local.set({ pendingCodeforces: message.submission }).then(() => reply({ ok: true }));
    return true;
  }
  if (message?.type === "get-pending-codeforces") {
    chrome.storage.local.get("pendingCodeforces").then(async saved => {
      const pending = saved.pendingCodeforces;
      if (pending && Date.now() / 1000 - Number(pending.startedAt || 0) > 86400) {
        await chrome.storage.local.remove("pendingCodeforces");
        reply(null);
        return;
      }
      reply(pending || null);
    });
    return true;
  }
  if (message?.type !== "accepted" || !message.submission) return;
  const operation = queue.catch(() => {}).then(() => saveAccepted(message.submission));
  queue = operation;
  operation.then(result => reply({ ok: true, ...result }), async error => {
    const text = String(error?.message || error);
    await chrome.storage.local.set({ lastError: { text, platform: message.submission.platform, savedAt: Date.now() } });
    await chrome.action.setBadgeBackgroundColor({ color: "#b42318" });
    await chrome.action.setBadgeText({ text: "!" });
    reply({ ok: false, error: text });
  });
  return true;
});

let queue = Promise.resolve();

async function saveAccepted(submission) {
  const platform = submission.platform;
  const repoKey = PLATFORM_KEYS[platform];
  if (!repoKey) throw new Error("Unsupported coding platform.");
  const settings = await chrome.storage.local.get(["githubToken", repoKey, "savedSubmissionIds"]);
  const token = settings.githubToken;
  const repo = settings[repoKey];
  if (!token || !repo) throw new Error("Open the extension settings and enter your GitHub token and repository names.");
  const submissionId = String(submission.submissionId || "");
  const seen = settings.savedSubmissionIds || {};
  if (seen[`${platform}:${submissionId}`]) return { skipped: true, path: seen[`${platform}:${submissionId}`] };

  const folder = safeName(submission.title || submission.slug || submissionId);
  const extension = extensionFor(submission.language);
  const content = submission.code;
  let path = "";
  for (let attempt = 0; attempt < 3 && !path; attempt++) {
    const directory = await listDirectory(repo, folder, token);
    const nextNumber = directory.reduce((max, entry) => {
      const match = entry.type === "file" && entry.name.match(/^(\d+)\.[A-Za-z0-9]+$/);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0) + 1;
    const fileName = `${nextNumber}.${extension}`;
    const candidate = `${folder}/${fileName}`;
    try {
      await githubRequest(`https://api.github.com/repos/${repo}/contents/${encodePath(candidate)}`, token, {
        method: "PUT",
        body: JSON.stringify({
          message: `Accepted ${platform}: ${folder}/${fileName}`,
          content: toBase64(content)
        })
      });
      path = candidate;
    } catch (error) {
      if (!/GitHub (409|422):/.test(String(error?.message)) || attempt === 2) throw error;
    }
  }

  seen[`${platform}:${submissionId}`] = path;
  const entries = Object.entries(seen).slice(-2000);
  await chrome.storage.local.set({ savedSubmissionIds: Object.fromEntries(entries), lastSaved: { platform, repo, path, title: submission.title || folder, savedAt: Date.now() } });
  if (platform === "codeforces") await chrome.storage.local.remove("pendingCodeforces");
  await chrome.storage.local.remove("lastError");
  await chrome.action.setBadgeBackgroundColor({ color: "#16803c" });
  await chrome.action.setBadgeText({ text: "✓" });
  return { repo, path };
}

async function listDirectory(repo, path, token) {
  const url = `https://api.github.com/repos/${repo}/contents/${encodePath(path)}`;
  const response = await githubRequest(url, token, { method: "GET", allow404: true });
  if (!response) return [];
  if (!Array.isArray(response)) throw new Error(`GitHub path ${path} is not a directory.`);
  return response;
}

async function githubRequest(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  if (response.status === 404 && options.allow404) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`GitHub ${response.status}: ${data.message || response.statusText}`);
  return data;
}

function safeName(value) {
  const name = String(value).normalize("NFKC").replace(/[\\/:*?"<>|\x00-\x1f]/g, "-").replace(/\s+/g, " ").replace(/[. ]+$/g, "").trim();
  return (name || "Accepted solution").slice(0, 100);
}

function extensionFor(language) {
  const l = String(language || "").toLowerCase();
  if (/c\+\+|cpp|c_cpp/.test(l)) return "cpp";
  if (/c#|csharp/.test(l)) return "cs";
  if (/\bc\b|gnu c/.test(l)) return "c";
  if (/python|pypy/.test(l)) return "py";
  if (/javascript|node/.test(l)) return "js";
  if (/typescript/.test(l)) return "ts";
  if (/java/.test(l)) return "java";
  if (/kotlin/.test(l)) return "kt";
  if (/golang|\bgo\b/.test(l)) return "go";
  if (/rust/.test(l)) return "rs";
  if (/swift/.test(l)) return "swift";
  if (/ruby/.test(l)) return "rb";
  if (/php/.test(l)) return "php";
  if (/mysql|sql/.test(l)) return "sql";
  if (/haskell/.test(l)) return "hs";
  if (/scala/.test(l)) return "scala";
  if (/perl/.test(l)) return "pl";
  return "txt";
}

function encodePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function toBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
