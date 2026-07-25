# Blog self-publish setup (Kalu / content owners)

## Goal
Content owners can **publish blog posts themselves** without being able to permanently change the app.

## What we set up

| Item | Status |
|------|--------|
| Invite **`kaluaja`** as collaborator with **Write** | Sent — **must accept email invite** |
| Path guard GitHub Action | Reverts non-blog files on `main` if a non-admin changes them |
| Allowed paths for self-publish | `blog/**`, `BLOG_OWNER_GUIDE.md`, `BLOG_GUIDE.md` |

> GitHub does **not** offer a “Write only to one folder” role on this account type.  
> Write + automatic revert is the practical self-publish setup.

## For Kalu — first time

1. Accept the GitHub invitation email (or open https://github.com/olafinancial/olafinancial/invitations while logged in as **kaluaja**).
2. Confirm you can open: https://github.com/olafinancial/olafinancial  
3. Follow the non-tech guide: **[BLOG_OWNER_GUIDE.md](../BLOG_OWNER_GUIDE.md)**  
   or the slides: **[Pul_Blog_Posting_Guide.pptx](../Pul_Blog_Posting_Guide.pptx)**

## What he should edit

| Allowed | Not allowed (auto-reverted) |
|---------|------------------------------|
| `blog/posts/your-post.md` | `js/`, `server/`, `css/` |
| `blog/posts.json` | `index.html`, app config |
| Blog guide markdown (optional) | About / privacy / app code |

After he commits **only** blog files to `main`, GitHub Pages deploys → live at https://pul.llc/blog.html

If he accidentally changes app files, the **Blog path guard** workflow restores them within a minute or two.

## For you (admin)

- You still have full access; the guard **skips** user `olafinancial`.
- To revoke: Repo → Settings → Collaborators → remove **kaluaja**.
- Pending invite list: https://github.com/olafinancial/olafinancial/settings/access  

## If the invite expires

Re-invite from Settings → Collaborators → Add people → `kaluaja` → **Write**.
