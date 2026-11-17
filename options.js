const token = document.querySelector("#token");
const status = document.querySelector("#status");
const repoFields = ["gfgRepo", "leetcodeRepo", "codeforcesRepo"];

chrome.storage.local.get(["githubToken", ...repoFields, "lastSaved", "lastError"]).then(saved => {
  token.placeholder = saved.githubToken ? "Token saved (leave blank to keep it)" : "Paste your token here";
  for (const key of repoFields) if (saved[key]) document.getElementById(key).value = saved[key];
  if (saved.lastError) status.textContent = `Last sync error: ${saved.lastError.text}`;
  else if (saved.lastSaved) status.textContent = `Last saved: ${saved.lastSaved.title} → ${saved.lastSaved.repo}/${saved.lastSaved.path}`;
});

document.querySelector("#save").addEventListener("click", async () => {
  status.textContent = "Checking token…";
  try {
    const saved = await chrome.storage.local.get("githubToken");
    const nextToken = token.value.trim() || saved.githubToken;
    if (!nextToken) throw new Error("Enter a GitHub token.");
    const repositories = Object.fromEntries(repoFields.map(key => [key, document.getElementById(key).value.trim()]));
    for (const [key, repo] of Object.entries(repositories)) {
      if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) throw new Error(`Check the repository name for ${key}.`);
    }
    const headers = { Authorization: `Bearer ${nextToken}`, Accept: "application/vnd.github+json" };
    const check = await fetch("https://api.github.com/user", { headers });
    if (!check.ok) throw new Error(`GitHub token check failed (${check.status}).`);
    for (const repo of Object.values(repositories)) {
      const response = await fetch(`https://api.github.com/repos/${repo}`, { headers });
      if (!response.ok) throw new Error(`Cannot access ${repo} (${response.status}).`);
      const data = await response.json();
      if (data.permissions?.push !== true) throw new Error(`Token needs Contents: Read and write permission for ${repo}.`);
    }
    await chrome.storage.local.set({ githubToken: nextToken, ...repositories });
    token.value = "";
    status.textContent = "Saved. Reload your coding-platform tabs to start syncing.";
  } catch (error) {
    status.textContent = error.message;
  }
});
