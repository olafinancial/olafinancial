// ============================================================
// Pul Planning — Blog list + post renderer (Markdown posts)
// Owner posts: see BLOG_GUIDE.md
// ============================================================
const WPBlog = (() => {
  const POSTS_INDEX = 'blog/posts.json';
  const POSTS_DIR = 'blog/posts/';

  function qs(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function formatDate(iso) {
    try {
      const d = new Date(iso + 'T12:00:00');
      return d.toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return iso;
    }
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Minimal Markdown → HTML (headings, lists, links, code, bold, paragraphs). */
  function mdToHtml(md) {
    if (typeof marked !== 'undefined' && marked.parse) {
      return marked.parse(md, { mangle: false, headerIds: true });
    }
    // Fallback if CDN blocked
    let html = escapeHtml(md);
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    html = html.replace(/^\- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`);
    html = html.split(/\n\n+/).map(block => {
      if (/^<(h[1-3]|ul|ol|pre|blockquote)/.test(block.trim())) return block;
      return `<p>${block.replace(/\n/g, '<br>')}</p>`;
    }).join('\n');
    return html;
  }

  async function loadIndex() {
    const res = await fetch(POSTS_INDEX + '?v=' + Date.now());
    if (!res.ok) throw new Error('Could not load blog index');
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('posts.json must be an array');
    return data.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }

  async function loadPostMarkdown(slug) {
    const res = await fetch(POSTS_DIR + encodeURIComponent(slug) + '.md?v=' + Date.now());
    if (!res.ok) throw new Error('Post not found: ' + slug);
    return res.text();
  }

  function renderList(posts, container) {
    if (!posts.length) {
      container.innerHTML = `<p class="lede">No posts yet. Check back soon.</p>`;
      return;
    }
    container.innerHTML = `
      <div class="mkt-post-list">
        ${posts.map(p => `
          <a class="mkt-post-card" href="blog.html?post=${encodeURIComponent(p.slug)}">
            <div class="mkt-post-meta">${escapeHtml(formatDate(p.date))} · ${escapeHtml(p.author || 'Pul Team')}</div>
            <h2>${escapeHtml(p.title)}</h2>
            <p>${escapeHtml(p.excerpt || '')}</p>
            ${(p.tags && p.tags.length) ? `<div class="mkt-tags">${p.tags.map(t => `<span class="mkt-tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
          </a>
        `).join('')}
      </div>`;
  }

  async function renderPost(slug, meta, container) {
    const md = await loadPostMarkdown(slug);
    // Strip leading H1 if present (title already in header)
    const bodyMd = md.replace(/^#\s+.+\n+/, '');
    container.innerHTML = `
      <p class="mkt-post-meta" style="margin-bottom:0.75rem">
        <a href="blog.html" style="color:var(--clr-accent)">← All posts</a>
        &nbsp;·&nbsp; ${escapeHtml(formatDate(meta.date))}
        ${meta.author ? ' · ' + escapeHtml(meta.author) : ''}
      </p>
      <h1 style="font-size:clamp(1.5rem,3.5vw,2.1rem);font-weight:800;margin:0 0 1.25rem;letter-spacing:-0.02em">${escapeHtml(meta.title)}</h1>
      <article class="mkt-prose blog-article">${mdToHtml(bodyMd)}</article>
      <div class="mkt-cta-row">
        <a class="mkt-btn mkt-btn-primary" href="index.html#/signup">Get your FIS free</a>
        <a class="mkt-btn mkt-btn-secondary" href="how-it-works.html">How it works</a>
      </div>`;
    document.title = `${meta.title} | Pul Planning Blog`;
  }

  async function boot() {
    const listEl = document.getElementById('blog-list');
    const postEl = document.getElementById('blog-post');
    const heroEl = document.getElementById('blog-hero');
    if (!listEl && !postEl) return;

    try {
      const posts = await loadIndex();
      const slug = qs('post');

      if (slug && postEl) {
        const meta = posts.find(p => p.slug === slug);
        if (!meta) {
          postEl.innerHTML = `<p class="lede">Post not found. <a href="blog.html">Back to blog</a></p>`;
          if (listEl) listEl.style.display = 'none';
          return;
        }
        if (heroEl) heroEl.style.display = 'none';
        if (listEl) listEl.style.display = 'none';
        postEl.style.display = '';
        await renderPost(slug, meta, postEl);
      } else if (listEl) {
        if (postEl) postEl.style.display = 'none';
        renderList(posts, listEl);
      }
    } catch (err) {
      console.error(err);
      const el = postEl || listEl;
      if (el) {
        el.innerHTML = `<div class="mkt-note">Could not load blog content. ${escapeHtml(err.message || '')}</div>`;
      }
    }
  }

  return { boot };
})();

document.addEventListener('DOMContentLoaded', () => WPBlog.boot());
