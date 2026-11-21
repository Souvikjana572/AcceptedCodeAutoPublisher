# Accepted Solutions to GitHub

A Chrome extension that saves your accepted coding-problem submissions to GitHub. It supports GeeksforGeeks, LeetCode, and Codeforces, and creates a commit in the repository you configure for each platform.

The extension runs locally in your browser. It does not use a remote server or scheduler.

## What it does

- Detects accepted submissions on supported problem pages and Codeforces contest submission pages.
- Saves the submitted source code to the corresponding GitHub repository.
- Creates a numbered source file in a folder named for the problem.
- Avoids saving the same detected submission more than once.
- Shows the most recent save or sync error in the extension options.

| Platform | Repository setting | Example path |
| --- | --- | --- |
| GeeksforGeeks | GeeksforGeeks repository | `Problem Title/1.cpp` |
| LeetCode | LeetCode repository | `Problem Title/1.py` |
| Codeforces | Codeforces repository | `1234A - Problem Title/1.cpp` |

Subsequent accepted submissions for the same problem are saved as `2.cpp`, `3.cpp`, and so on. The file extension is selected from the detected programming language; unrecognized languages use `.txt`.

## Requirements

- Google Chrome 111 or later
- A GitHub account
- A GitHub fine-grained personal access token with access to the target repositories
- A signed-in session on the coding platforms you want to use

## Setup

### 1. Get the project files

Download or clone this repository, then keep the project folder in a location where you can find it. The folder you load into Chrome must contain `manifest.json`.

### 2. Create a GitHub token

1. Open [GitHub fine-grained personal access token settings](https://github.com/settings/personal-access-tokens/new).
2. Choose the account or organization that owns your target repositories.
3. Under **Repository access**, select **Only select repositories**, then choose the repositories you will use.
4. Under **Repository permissions**, set **Contents** to **Read and write**. Leave other permissions at their defaults unless you know the extension needs them.
5. Generate the token and copy it somewhere safe temporarily. GitHub only shows the full token when it is created.

Never put the token in this repository, a source file, a screenshot, or a chat. If you expose it, revoke it in GitHub and create a replacement.

### 3. Load the extension in Chrome

**Windows launcher (recommended for this project):**

1. Double-click `run_sync.bat` in the project folder.
2. The script opens Chrome with this extension and a separate browser profile. It also opens the supported coding sites.
3. Keep the project folder in the same location so the launcher can find the extension and profile.

**Manual installation:**

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select the project folder containing `manifest.json`.

The batch launcher is Windows-specific. Manual installation can be used on other operating systems that support Chrome extensions.

### 4. Configure the extension

1. In Chrome, open the extension's **Details** page and choose **Extension options**.
2. Paste your token into the token field.
3. Set each repository field to the exact GitHub repository in `owner/repository` format, for example `my-account/leetcode-solutions`.
4. Click **Save settings**. The extension checks that the token can access each repository and can write contents.
5. Sign in to the coding platforms in this same Chrome profile, then reload any already-open problem tabs.

The repository fields may initially contain the original author's repository names. Replace them with your own before syncing.

## Using the extension

Submit problems as usual in the Chrome profile where the extension is installed. A submission is uploaded only after the platform reports it as accepted. The extension sends the code to the repository configured for that platform.

With the Windows launcher, close its dedicated Chrome window to stop using that profile. Your regular Chrome profile is separate.

## Privacy and security

- The token is stored in Chrome extension storage in the browser profile where the extension is installed.
- The token and accepted source code are sent to GitHub's API to check repository access and save files.
- The extension reads submission information from the supported coding-platform pages. Do not use it in a browser profile you share with other people.
- The `chrome-profile` folder created beside `run_sync.bat` contains browser data such as sign-ins, extension settings, and the token. Keep it private; do not commit or share it.
- The `.gitignore` in this repository excludes the local profile, the duplicate extracted folder, the ZIP archive, and common local secret files.

## Troubleshooting

- **Settings cannot be saved:** Confirm the token is valid, each repository is spelled correctly as `owner/repository`, and the token has **Contents: Read and write** access to every configured repository.
- **Nothing is uploaded:** Confirm the extension is enabled, you are using the same Chrome profile where it is installed, and the submission was accepted. Reload the problem tab after saving settings.
- **An error is shown:** Open the extension options to see the last sync error. Correct the token or repository permissions, then reload the problem tab and try another submission.
- **The launcher cannot find Chrome:** Install Google Chrome or update the Chrome executable path in `run_sync.bat`.

Coding-platform page or API changes may temporarily prevent submission detection and require an extension update.

## Project files

- `manifest.json` - Chrome extension metadata, permissions, and scripts
- `page-hook.js` - observes submission activity on supported sites
- `content.js` - relays accepted submissions to the extension
- `background.js` - validates and saves submissions using the GitHub API
- `options.html` and `options.js` - token and repository settings
- `run_sync.bat` - opens Chrome with the extension and its dedicated profile on Windows
