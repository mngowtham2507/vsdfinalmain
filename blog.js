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
    list.append(element('p', 'No articles are available yet.', 'muted'));
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
    const counter = element('span', `${post.read_minutes} MIN READ`, 'counter');
    media.append(counter);
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
  const category = element('span', post.category, 'eyebrow');
  const title = element('h1', post.title);
  const meta = element('p', `${post.read_minutes} min read`, 'doc-meta');
  document.title = `${post.title} | VS Developers`;
  if (post.image_url) {
    const imageWrap = element('div', null, 'article-img');
    const image = element('img');
    image.src = post.image_url;
    image.alt = post.title;
    imageWrap.append(image);
    article.append(category, title, meta, imageWrap);
  } else {
    article.append(category, title, meta);
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
}

async function loadBlog() {
  try {
    const response = await fetch('/api/blogs');
    if (!response.ok) throw new Error('Could not load articles.');
    const data = await response.json();
    posts = data.posts;
    renderList();
    renderArticle();
  } catch {
    list.replaceChildren(element('p', 'Articles are temporarily unavailable. Please try again later.', 'muted'));
    renderArticle();
  }
}

addEventListener('hashchange', renderArticle);
loadBlog();
