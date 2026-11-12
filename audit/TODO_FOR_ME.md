# TODO For You Before Submitting to Devpost

Everything in the repository is tested, verified, and pushed to `master`. Only these manual steps (which require your GitHub account, personal email, or video upload) remain:

---

## 1. Fill `[FILL: ...]` Placeholder in Repo

- **`SECURITY.md` (line 13):** Replace `[FILL: security contact email]` with your preferred security contact email, then commit and push.

---

## 2. Make the GitHub Repository Public & Configure About Section

> Note: `gh` CLI is not installed on this machine, and repository visibility was left untouched for safety.

1. **Confirm history status:**
   - Full git history scan found **zero** API keys, `.env` files, PayPal secrets, or Gemini keys.
   - Older commits on `master` (before `submission-prep`) still contain historical `server/data/vyro.db` and `audit/pass3/video/*.webm` files in git object history, even though they are now untracked and ignored going forward.
   - *(Optional)* If you want to squash git history so old binary files are not in `git log` at all before making the repo public:
     ```bash
     git checkout --orphan clean-public
     git add -A
     git commit -m "Initial public release of VYRO"
     git branch -D master
     git branch -m master
     git push --force origin master
     ```
2. **Flip repository to Public:**
   - Open `https://github.com/Abdul-Hafiz-1/Vyro/settings`
   - Scroll to **Danger Zone** → **Change repository visibility** → **Change to public**.
3. **Update About section & verify License badge:**
   - Open `https://github.com/Abdul-Hafiz-1/Vyro`
   - Click the gear icon next to **About** on the right sidebar.
   - Copy the **Description** and **Topics** from `audit/REPO_ABOUT.md`.
   - Confirm **MIT license** is displayed in the **About** sidebar (GitHub detects `LICENSE` automatically).

---

## 3. Record & Upload the Demo Video (< 2:50)

1. Follow `DEMO_SCRIPT.md` (pre-recording checklist + 6-shot script).
2. Upload the video to YouTube (Unlisted or Public) or Vimeo.

---

## 4. Submit on Devpost

1. Paste the title, tagline, and project story from `SUBMISSION.md`.
2. Add the **GitHub Repository URL**: `https://github.com/Abdul-Hafiz-1/Vyro`
3. Add the **Demo Video URL** from step 3.
4. Select built-with tags: `PayPal`, `Google Gemini`, `TypeScript`, `React`, `Node.js`, `SQLite`.
