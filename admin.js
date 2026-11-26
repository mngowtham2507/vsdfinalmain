const loginPanel = document.querySelector('#login-panel');
const adminPanel = document.querySelector('#admin-panel');
const postsPanel = document.querySelector('#posts-panel');
const loginForm = document.querySelector('#login-form');
const postForm = document.querySelector('#post-form');
const loginStatus = document.querySelector('#login-status');
const editorStatus = document.querySelector('#editor-status');
const postsContainer = document.querySelector('#posts');
let editingSlug = null;
let posts = [];

async function request(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }
  });
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    if (response.status === 404) {
      throw new Error('Admin API is unavailable. Deploy this site with its serverless functions.');
    }
    throw new Error(`Admin API returned a non-JSON response (HTTP ${response.status}).`);
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('Admin API returned invalid JSON.');
  }
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function showAdmin() {
  loginPanel.hidden = true;
  adminPanel.hidden = false;
  postsPanel.hidden = false;
}

function showLogin() {
  loginPanel.hidden = false;
  adminPanel.hidden = true;
  postsPanel.hidden = true;
}

function resetEditor() {
  editingSlug = null;
  postForm.reset();
  document.querySelector('#editor-title').textContent = 'Add a blog post';
  document.querySelector('#save-post').textContent = 'Publish post';
  document.querySelector('#cancel-edit').hidden = true;
}

function renderPosts() {
  postsContainer.replaceChildren();
  if (!posts.length) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'No blog posts yet.';
    postsContainer.append(empty);
    return;
  }
  for (const post of posts) {
    const row = document.createElement('article');
    row.className = 'post';
    const details = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = post.title;
    const category = document.createElement('p');
    category.textContent = `${post.category} · ${new Date(post.created_at).toLocaleDateString()}`;
    details.append(title, category);
    const actions = document.createElement('div');
    actions.className = 'row';
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'secondary';
    edit.textContent = 'Edit';
    edit.addEventListener('click', () => {
      editingSlug = post.slug;
      for (const name of ['title', 'category', 'excerpt', 'image_url', 'body']) {
        postForm.elements[name].value = post[name] || '';
      }
      document.querySelector('#editor-title').textContent = 'Edit blog post';
      document.querySelector('#save-post').textContent = 'Save changes';
      document.querySelector('#cancel-edit').hidden = false;
      editorStatus.textContent = '';
      postForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'secondary';
    remove.textContent = 'Delete';
    remove.addEventListener('click', async () => {
      if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
      try {
        await request(`/api/blogs/${encodeURIComponent(post.slug)}`, { method: 'DELETE' });
        await loadPosts();
        editorStatus.textContent = 'Post deleted.';
      } catch (error) {
        editorStatus.textContent = error.message;
      }
    });
    actions.append(edit, remove);
    row.append(details, actions);
    postsContainer.append(row);
  }
}

async function loadPosts() {
  const data = await request('/api/blogs');
  posts = data.posts;
  renderPosts();
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginStatus.textContent = 'Signing in…';
  const form = new FormData(loginForm);
  try {
    await request('/api/auth', {
      method: 'POST',
      body: JSON.stringify({ email: form.get('email'), password: form.get('password') })
    });
    loginForm.reset();
    window.location.assign('./admin.html?panel=1');
  } catch (error) {
    loginStatus.textContent = error.message;
  }
});

postForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  editorStatus.textContent = 'Saving…';
  const form = new FormData(postForm);
  const body = Object.fromEntries(form.entries());
  try {
    await request(editingSlug ? `/api/blogs/${encodeURIComponent(editingSlug)}` : '/api/blogs', {
      method: editingSlug ? 'PATCH' : 'POST',
      body: JSON.stringify(body)
    });
    resetEditor();
    await loadPosts();
    editorStatus.textContent = 'Post saved and published.';
  } catch (error) {
    editorStatus.textContent = error.message;
  }
});

document.querySelector('#cancel-edit').addEventListener('click', resetEditor);
document.querySelector('#logout').addEventListener('click', async () => {
  try {
    await request('/api/auth', { method: 'DELETE' });
    showLogin();
    resetEditor();
    postsContainer.replaceChildren();
  } catch (error) {
    editorStatus.textContent = error.message;
  }
});

try {
  const session = await request('/api/auth');
  if (session.authenticated) {
    showAdmin();
    try {
      await loadPosts();
    } catch (error) {
      editorStatus.textContent = error.message;
    }
  }
} catch (error) {
  loginStatus.textContent = error.message;
}
