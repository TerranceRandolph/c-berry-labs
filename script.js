// Basic SPA router + data-driven sections + blog (Markdown -> HTML)

const routes = ["home", "projects", "research", "blog", "about", "contact"]; // removed demos

function $(sel, parent = document) { return parent.querySelector(sel); }
function $all(sel, parent = document) { return Array.from(parent.querySelectorAll(sel)); }

function navigate(hash) {
  const target = (hash || location.hash || "#home").replace("#", "");
  routes.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle("visible", id === target);
  });
  // nav active
  $all('.nav a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${target}`));
}

window.addEventListener('hashchange', () => navigate(location.hash));

document.addEventListener('DOMContentLoaded', () => {
  // Year
  $('#year').textContent = new Date().getFullYear();

  // Nav toggle
  const toggle = $('.nav-toggle');
  const list = $('.nav-list');
  toggle.addEventListener('click', () => {
    const open = !list.classList.contains('open');
    list.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  // Navigate initial
  navigate(location.hash);

  // Load data
  loadHighlights();
  loadProjects();
  loadResearch();
  initBlog();
  // initDemos removed
  initContact();
});

// Sample data (could be moved to separate JSON files later)
const sampleProjects = [
  { title: 'Visualizing Geopolitics', desc: 'A prompt‑to‑map VLM prototype that turns text summaries into cartographic layers, styles, and AOIs.', tags: ['VLM', 'Geopolitics', 'Maps'], link: 'visualizing-geopolitics.html' },
  { title: 'Lending with Care', desc: 'A family‑lending chat sandbox with budget guardrails, categories, and terms—designed for clear approvals and boundaries.', tags: ['LLM', 'Finance', 'Guardrails'], link: 'lending-with-care.html' },
  { title: 'Spatial Demand Forecasting', desc: 'Time‑series + spatial features to anticipate demand hot‑spots and guide resource placement.', tags: ['ML', 'Time Series'], link: '#projects' },
];

const sampleResearch = [
  { title: 'Advancements In Our Lives', desc: 'Curated notes on AI, Geospatial, and Space—how new capabilities translate into everyday impact, with distilled takeaways and links.', tags: ['AI', 'Geospatial', 'Space'] },
  { title: 'Fine-tuning VLMs for Cartographic Composition', desc: 'Strategies for constraining VLM outputs into map‑ready schemas (layers, styles, symbology).', tags: ['Research', 'VLM', 'Cartography'] },
  { title: 'Guardrails for Family Lending Chat Models', desc: 'Encoding policy: budgets, per‑request caps, repayment windows, and consent flows for safe interactions.', tags: ['LLM', 'Safety'] },
];

function renderCards(items, mountId) {
  const mount = document.getElementById(mountId);
  mount.innerHTML = items.map(card => `
    <article class="card">
      <h3>${card.title}</h3>
      <p>${card.desc}</p>
      <div class="tags">
        ${(card.tags||[]).map(t=>`<span class="tag">${t}</span>`).join('')}
      </div>
      ${card.link ? `<div style="margin-top:10px"><a class="btn" href="${card.link}">Open</a></div>` : ''}
    </article>
  `).join('');
}

function loadHighlights() {
  const mount = document.getElementById('highlights');
  mount.innerHTML = `
    <div class="cards grid">
      ${[...sampleProjects.slice(0,2), sampleResearch[0]].map(c => `
        <article class="card">
          <h3>${c.title}</h3>
          <p>${c.desc}</p>
          <div class="tags">${(c.tags||[]).map(t=>`<span class='tag'>${t}</span>`).join('')}</div>
        </article>`).join('')}
    </div>`;

  // Home blog teasers (latest 3)
  fetch(`${BLOG_DIR}/index.json`, { cache: 'no-store' })
    .then(r => r.ok ? r.json() : [])
    .then(index => Array.isArray(index) ? index : [])
    .then(index => {
      const sorted = index.slice().sort((a,b) => (b.date||'').localeCompare(a.date||''));
      const latest = sorted.slice(0,3);
      const mountTeasers = document.getElementById('home-blog-teasers');
      if (!mountTeasers) return;
      mountTeasers.innerHTML = latest.map(p => `
        <div class="post-item">
          <h4><a href="#blog/${p.slug}">${p.title}</a></h4>
          <div class="post-meta">${p.date} · ${(p.tags||[]).join(', ')}</div>
          <p>${p.summary || ''}</p>
        </div>
      `).join('');
    })
    .catch(()=>{});
}

function loadProjects() { renderCards(sampleProjects, 'projects-grid'); }
function loadResearch() { renderCards(sampleResearch, 'research-grid'); }

// Blog with Markdown loader
const BLOG_DIR = 'posts';
let blogIndex = [];

async function initBlog() {
  // Load index.json that lists posts
  try {
    const res = await fetch(`${BLOG_DIR}/index.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error('No blog index');
    blogIndex = await res.json();
  } catch (e) {
    console.warn('Blog index missing; creating default');
    blogIndex = [
      {
        slug: 'welcome',
        title: 'Welcome to C‑Berry Labs',
        date: new Date().toISOString().slice(0,10),
        tags: ['intro'],
        summary: 'A quick tour of projects, research, and demo placeholders.'
      }
    ];
  }
  populateTagFilter();
  renderBlogList();

  // if hash has #blog/slug
  const parts = (location.hash || '').split('/');
  if (parts[0] === '#blog' && parts[1]) {
    loadPost(parts[1]);
  }

  // Search & filter
  $('#blog-search').addEventListener('input', renderBlogList);
  $('#blog-tag-filter').addEventListener('change', renderBlogList);
}

function populateTagFilter() {
  const select = $('#blog-tag-filter');
  const tags = new Set();
  blogIndex.forEach(p => (p.tags||[]).forEach(t => tags.add(t)));
  for (const t of Array.from(tags).sort()) {
    const opt = document.createElement('option');
    opt.value = t; opt.textContent = t; select.appendChild(opt);
  }
}

function renderBlogList() {
  const q = $('#blog-search').value?.toLowerCase() || '';
  const tag = $('#blog-tag-filter').value || '';
  const list = $('#blog-list');
  const filtered = blogIndex.filter(p => {
    const matchesQ = [p.title, p.summary, (p.tags||[]).join(' ')].join(' ').toLowerCase().includes(q);
    const matchesTag = !tag || (p.tags||[]).includes(tag);
    return matchesQ && matchesTag;
  });
  list.innerHTML = filtered.map(p => `
    <div class="post-item">
      <h3><a href="#blog/${p.slug}">${p.title}</a></h3>
      <div class="post-meta">${p.date} · ${(p.tags||[]).join(', ')}</div>
      <p>${p.summary || ''}</p>
      <div class="post-actions">
        <a class="btn" href="#blog/${p.slug}">Read</a>
        <button class="btn" data-copy-linkedin="${p.slug}">Copy LinkedIn Summary</button>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('[data-copy-linkedin]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const slug = e.currentTarget.getAttribute('data-copy-linkedin');
      const post = blogIndex.find(p => p.slug === slug);
      if (!post) return;
      const text = `New post at C‑Berry Labs: ${post.title} — ${post.summary}\n\nRead more: ${location.origin}${location.pathname}#blog/${post.slug}`;
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = 'Copied!';
        setTimeout(()=> btn.textContent = 'Copy LinkedIn Summary', 1200);
      } catch {}
    });
  });
}

async function loadPost(slug) {
  const article = $('#blog-post');
  const list = $('#blog-list');

  let md = '';
  try {
    const res = await fetch(`${BLOG_DIR}/${slug}.md`, { cache: 'no-store' });
    if (!res.ok) throw new Error('not found');
    md = await res.text();
  } catch (e) {
    md = `# ${slug}\n\nPost not found.`;
  }

  const html = markdownToHtml(md);
  article.innerHTML = `
    <a class="back-link" href="#blog">← Back to Blog</a>
    <div class="content">${html}</div>
  `;
  article.classList.remove('hidden');
  // hide list
  list.style.display = 'none';
}

// Minimal Markdown to HTML (headings, bold/italic, code, links, lists)
function markdownToHtml(md) {
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // code blocks ```
  html = html.replace(/```([\s\S]*?)```/g, (m, code) => `<pre><code>${code}</code></pre>`);
  // inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  // headings
  html = html.replace(/^###### (.*)$/gm, '<h6>$1</h6>')
             .replace(/^##### (.*)$/gm, '<h5>$1</h5>')
             .replace(/^#### (.*)$/gm, '<h4>$1</h4>')
             .replace(/^### (.*)$/gm, '<h3>$1</h3>')
             .replace(/^## (.*)$/gm, '<h2>$1</h2>')
             .replace(/^# (.*)$/gm, '<h1>$1</h1>');
  // bold/italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
             .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  // links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  // unordered lists
  html = html.replace(/^(?:-|\*) (.*)$/gm, '<li>$1</li>')
             .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`);
  // paragraphs
  html = html.replace(/^(?!<h\d|<ul|<pre|<li|<p|<blockquote)(.+)$/gm, '<p>$1</p>');

  return html;
}

// Contact (no backend; pretend send)
function initContact() {
  $('#contact-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const status = $('#contact-status');
    status.textContent = 'Sending...';
    setTimeout(() => {
      status.textContent = 'Thanks! Your message has been sent (placeholder).';
      e.target.reset();
    }, 600);
  });
}
