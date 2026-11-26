const list = document.querySelector('#blog-list');
const article = document.querySelector('#blog-post-content');
let posts = [];

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function renderList() {
  list.replaceChildren();
  if (!posts.length) {
    list.append(element('p', 'No new articles have been published yet.', 'muted'));
    return;
  }
  const cards = element('div', null, 'cards');
  for (const post of posts) {
    const card = element('article', null, 'card');
    const media = element('div', null, 'card-media');
    if (post.image_url) {
      const image = element('img');
      image.src = post.image_url;
      image.alt = '';
      image.loading = 'lazy';
      media.append(image);
    }
    media.append(element('span', `${post.read_minutes} MIN READ`, 'counter'));
    const body = element('div', null, 'card-body');
    body.append(
      element('span', post.category, 'eyebrow'),
      element('h3', post.title),
      element('p', post.excerpt)
    );
    const link = element('a', 'Read article ↗', 'btn');
    link.href = `#blog-post:${encodeURIComponent(post.slug)}`;
    body.append(link);
    card.append(media, body);
    cards.append(card);
  }
  list.append(cards);
}

function renderArticle() {
  const hash = decodeURIComponent(location.hash.slice(1));
  if (!hash.startsWith('blog-post:')) return;
  const slug = hash.slice('blog-post:'.length);
  const post = posts.find((item) => item.slug === slug);
  article.replaceChildren();
  if (!post) {
    article.append(element('p', 'This article could not be found.', 'muted'));
    return;
  }
  article.append(
    element('span', post.category, 'eyebrow'),
    element('h1', post.title),
    element('p', `${post.read_minutes} min read`, 'doc-meta')
  );
  if (post.image_url) {
    const imageWrap = element('div', null, 'article-img');
    const image = element('img');
    image.src = post.image_url;
    image.alt = post.title;
    imageWrap.append(image);
    article.append(imageWrap);
  }
  const content = element('div', post.body, 'blog-content');
  content.style.whiteSpace = 'pre-line';
  article.append(content);
  const contact = element('div', null, 'doc-cta');
  contact.append(element('p', 'Would you like to learn more? Speak with our team.'));
  const contactLink = element('a', 'Contact us ↗', 'btn');
  contactLink.href = '#contact';
  contact.append(contactLink);
  article.append(contact);
  document.title = `${post.title} | VS Developers`;
}

async function loadBlog() {
  try {
    const response = await fetch('/api/blogs');
    if (!response.ok) throw new Error(`Blog request failed (HTTP ${response.status}).`);
    const data = await response.json();
    if (!Array.isArray(data.posts)) throw new Error('Blog service returned invalid data.');
    posts = data.posts;
    renderList();
    renderArticle();
  } catch (error) {
    list.replaceChildren(element('p', 'Published articles are temporarily unavailable. Please try again later.', 'muted'));
    if (location.hash.startsWith('#blog-post:')) {
      article.replaceChildren(element('p', 'This article is temporarily unavailable.', 'muted'));
    }
    console.error('Could not load published blog posts:', error);
  }
}

addEventListener('hashchange', () => {
  renderArticle();
  if (location.hash === '#blog') loadBlog();
});
loadBlog();
