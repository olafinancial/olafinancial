# How to add a blog post (no coding required)

**For:** product owners and non-technical team members  
**Blog live at:** https://pul.llc/blog.html  

You only use the **GitHub website** in your browser. You do **not** need to install software or use the terminal.

---

## What you’re doing (in plain English)

Each blog post is **two pieces**:

1. **The article** — the words people read (like a Word doc, but a simple text file).  
2. **A list entry** — so the website knows the post exists and can show it on the blog page.

When you save both on GitHub, the website updates automatically within a few minutes.

---

## Before you start

1. You need access to the GitHub repository:  
   **https://github.com/olafinancial/olafinancial**
2. Sign in to GitHub.
3. Decide:
   - **Title** (e.g. “5 tips for your emergency fund”)
   - **Short summary** (1–2 sentences for the blog list)
   - **Your name** as author
   - **Today’s date** (e.g. 24 July 2026)

---

## Step 1 — Create the article file

1. Open this folder on GitHub:  
   **https://github.com/olafinancial/olafinancial/tree/main/blog/posts**
2. Click the green **Add file** button → **Create new file**.
3. At the top, where it says *Name your file…*, type a short filename:
   - Use **only** lowercase letters, numbers, and hyphens  
   - End with **`.md`**  
   - Examples that work:
     - `emergency-fund-tips.md`
     - `what-is-fis.md`
   - Examples that **do not** work:
     - `My Blog Post.md` (spaces and capitals)
     - `post.docx` (wrong type)
4. In the big empty box, paste this template and replace the text with your article:

```text
# Your post title here

Write your first paragraph here. Keep it clear and friendly.

## First section heading

- You can use bullet points
- Like this

## Second section

More paragraphs here.

You can add a link like this: [How FIS works](https://pul.llc/how-it-works.html)

*Educational only — not personalised financial advice.*
```

5. Scroll down to **Commit changes**.
6. In the short message box, type something like: `Add blog post emergency fund tips`
7. Leave **Commit directly to the main branch** selected.
8. Click the green **Commit changes** button.

**You’re halfway done.** The article is saved; next you add it to the list.

---

## Step 2 — Add the post to the website list

1. Open this file on GitHub:  
   **https://github.com/olafinancial/olafinancial/blob/main/blog/posts.json**
2. Click the pencil icon (**Edit this file**) near the top right.
3. You will see a list that starts with `[` and has blocks that look like this:

```text
{
  "slug": "welcome-to-pul",
  "title": "Welcome to Pul Planning",
  ...
},
```

4. **Right after the first `[`**, paste a **new** block for your post.  
   Example (change the values to match **your** post):

```text
  {
    "slug": "emergency-fund-tips",
    "title": "5 tips for your emergency fund",
    "date": "2026-07-24",
    "author": "Your Name",
    "excerpt": "Simple steps to start and grow an emergency fund in Nigeria.",
    "tags": ["savings", "tips"]
  },
```

### Important rules (read carefully)

| Field | What to put |
|--------|-------------|
| **slug** | **Exactly** the filename you created, **without** `.md`. If the file was `emergency-fund-tips.md`, the slug is `emergency-fund-tips`. |
| **title** | The title people see. |
| **date** | Year-month-day with dashes, e.g. `2026-07-24` (not 24/07/2026). |
| **author** | Your name. |
| **excerpt** | One short sentence for the blog card. |
| **tags** | Optional short labels in quotes, e.g. `"FIS"`, `"budget"`. |

**Formatting (easy to break — check twice):**

- Keep the **comma** after your block if another post follows (usually yes).  
- Every `"field": "value"` uses **straight double quotes** `"`.  
- Do **not** delete the other posts.  
- Do **not** remove the `[` at the start or `]` at the end of the whole file.

5. Scroll down → **Commit changes**.  
6. Message e.g. `List emergency fund tips on blog`.  
7. Commit to **main** → green **Commit changes**.

---

## Step 3 — Check that it’s live

1. Wait **2–5 minutes** (GitHub is publishing the site).
2. Open: **https://pul.llc/blog.html**
3. You should see your post on the list.
4. Click it, or open:  
   `https://pul.llc/blog.html?post=emergency-fund-tips`  
   (use **your** slug at the end).
5. If you still see the old page: hard refresh  
   - Windows: **Ctrl + Shift + R**  
   - Mac: **Cmd + Shift + R**

---

## How to edit a post later

| I want to… | Do this |
|------------|---------|
| Change the **words** in the article | Open `blog/posts/your-slug.md` → pencil → edit → Commit |
| Change **title / date / summary** | Open `blog/posts.json` → pencil → edit that post’s block → Commit |
| **Hide** a post without deleting the text | Open `posts.json` → delete **only that post’s `{ ... },` block** → Commit |
| **Delete** completely | Delete the `.md` file **and** remove its block from `posts.json` |

---

## If something goes wrong

| Problem | Likely fix |
|---------|------------|
| Post not on the list | The **slug** in `posts.json` does not match the filename (must match exactly, no `.md`). |
| “Post not found” when you click | Same slug/filename mismatch, or the `.md` file was never committed. |
| GitHub shows a red error when saving `posts.json` | Broken punctuation — usually a missing comma or an extra comma. Compare with a post above yours. |
| Still not live after 10 minutes | Check **Actions** on GitHub for a green “Deploy” run, or ask a technical teammate. |

If you’re unsure about editing `posts.json`, ask a technical teammate to do **Step 2** only — you can still write the article file yourself (**Step 1**).

---

## Writing tips (brand)

- Keep tone helpful and clear.  
- Do **not** promise investment returns or say “buy this stock.”  
- Good links to include:  
  - https://pul.llc/how-it-works.html  
  - https://pul.llc/about.html  
  - https://pul.llc (sign up)  
- End with: *Educational only — not personalised financial advice.*  
- Questions: **hello@pul.llc**

---

## Quick checklist

- [ ] Created `blog/posts/my-slug.md` and committed  
- [ ] Added matching entry at the **top** of `blog/posts.json` and committed  
- [ ] Waited a few minutes  
- [ ] Checked https://pul.llc/blog.html  
- [ ] Opened the post and read it once  

That’s it — two saves on GitHub, then the blog updates itself.
