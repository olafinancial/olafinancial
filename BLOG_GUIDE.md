# How to update the Pul Planning blog

**Audience:** product owners / non-developers who want to post without a CMS.  
**Live URLs:** [pul.llc/blog.html](https://pul.llc/blog.html) · [About](https://pul.llc/about.html) · [How it works](https://pul.llc/how-it-works.html)

Posts are plain **Markdown files** plus one small **JSON index**. After you push to GitHub `main`, GitHub Pages updates the site (usually within a few minutes).

---

## Easy posting (3 steps)

### 1. Create a Markdown file

Add a new file:

```text
blog/posts/your-post-slug.md
```

Rules for the **slug** (filename without `.md`):

- lowercase  
- hyphens only (no spaces)  
- example: `emergency-fund-basics.md` → slug `emergency-fund-basics`

**Template** (copy-paste):

```markdown
# Your post title (shown as the page H1)

First paragraph goes here. Keep a friendly, clear tone.

## Section heading

- Bullet points work
- **Bold** works
- [Links](https://pul.llc/how-it-works.html) work

## Another section

More text…

*Educational only — not personalised financial advice.*
```

Tips:

- Start with a single `# Title` line (the blog page also shows the title from the index).  
- Use `##` for sections.  
- Link to product pages: `how-it-works.html`, `about.html`, `index.html#/signup`.  
- Avoid promising investment returns or naming “buy this stock.”

### 2. Register the post in the index

Open **`blog/posts.json`** and add an object at the **top** of the array (newest first):

```json
{
  "slug": "your-post-slug",
  "title": "Your post title",
  "date": "2026-07-24",
  "author": "Your Name",
  "excerpt": "One or two sentences for the blog list card.",
  "tags": ["FIS", "tips"]
}
```

| Field | Required | Notes |
|-------|----------|--------|
| `slug` | Yes | Must match the filename without `.md` |
| `title` | Yes | List + browser title |
| `date` | Yes | `YYYY-MM-DD` (sorts newest first) |
| `author` | No | Defaults display as “Pul Team” if empty in UI |
| `excerpt` | Yes | Shown on the blog list |
| `tags` | No | Short labels, e.g. `["FIS","budget"]` |

**Valid JSON checklist**

- Commas between posts  
- No trailing comma after the last post  
- Double quotes only  

### 3. Publish

```bash
git add blog/posts/your-post-slug.md blog/posts.json
git commit -m "blog: add your-post-slug"
git push origin main
```

Or use GitHub’s web UI: **Add file → Upload / Create new file** in those paths, then commit to `main`.

Wait for the **Deploy** action to finish, then open:

```text
https://pul.llc/blog.html
https://pul.llc/blog.html?post=your-post-slug
```

Hard-refresh (Ctrl+Shift+R) if you still see the old list.

---

## Edit or delete a post

| Action | How |
|--------|-----|
| **Edit text** | Change `blog/posts/slug.md` and push |
| **Edit title/date/excerpt** | Change the matching object in `blog/posts.json` |
| **Unpublish** | Remove the object from `posts.json` (you can leave the `.md` file) |
| **Delete forever** | Remove both the `.md` file and the JSON entry |

---

## Examples already in the repo

| Slug | File |
|------|------|
| `welcome-to-pul` | `blog/posts/welcome-to-pul.md` |
| `what-is-fis` | `blog/posts/what-is-fis.md` |

---

## About & How it works pages

These are **static HTML** (not Markdown):

| Page | File | When to edit |
|------|------|----------------|
| About | `about.html` | Company story, contact, product list |
| How it works (FIS) | `how-it-works.html` | FIS formula, path, brand messaging |

Edit carefully (keep layout classes). Prefer asking engineering for large redesigns.

Shared header/footer: `js/marketing-shell.js`  
Shared styles: `css/marketing.css`

---

## Optional: GitHub web-only workflow (no laptop)

1. Go to the repo on GitHub → `blog/posts/`  
2. **Add file → Create new file** → name it `my-slug.md` → paste Markdown → Commit to `main`  
3. Open `blog/posts.json` → **Edit** → paste a new post object at the top → Commit  

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Post missing from list | Slug in JSON ≠ filename; or JSON syntax error |
| “Post not found” | File must be `blog/posts/{slug}.md` |
| Old content after push | Wait for Pages deploy; hard-refresh |
| Formatting looks plain | `marked` CDN blocked — basic fallback still works; check network |

---

## Content guidelines (brand + compliance)

- Educational tone; no guaranteed returns  
- Prefer “estimate”, “example”, “illustrative”  
- Point people to **FIS** and [How it works](https://pul.llc/how-it-works.html)  
- Link support: `hello@pul.llc` · privacy: `privacy@pul.llc`  
- When in doubt, add: *Educational only — not personalised financial advice.*

---

*Questions about the pipeline: engineering / repo maintainers.*
