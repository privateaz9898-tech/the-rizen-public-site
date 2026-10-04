import {
  WORLDS, SETUP_ITEMS, ensureState, saveState, resetState, recordsOf, addRecord, updateRecord, removeRecord,
  sha256, createSalt, isOwner, setOwnerSession, isHttpUrl, supportedEmbed, spotifyEmbed, escapeHtml
} from './db.js?v=6';

let state;
let ownerSection = 'overview';
let editingId = '';
let searchTerm = '';
let watchFilter = { world: '', platform: '', format: '' };
let phoenixClockTimer;
let pocketTimerId;
let pocketTimerEndsAt = 0;
let torchStream;
let pocketOrientationActive = false;
let pocketLocation = null;
const app = document.querySelector('#app');

const icons = {
  home: '⌂', watch: '▶', music: '♫', pocket: '▣', projects: '⌁', shop: '◈', collection: '◇', live: '●', channels: '⌘', owner: '◉', more: '⋯'
};
const nav = [
  ['home', 'Home', icons.home], ['watch', 'Watch', icons.watch], ['live', 'Live', icons.live], ['music', 'Music', icons.music],
  ['pocket', 'Pocket Tools', icons.pocket], ['projects', 'Projects', icons.projects], ['shop', 'Shop', icons.shop], ['collection', 'Collection', icons.collection], ['channels', 'Channels', icons.channels]
];
const ownerSections = [
  ['overview', 'Studio Overview'], ['project', 'Projects & Tasks'], ['content', 'Watch & Content'], ['music', 'Music Links'],
  ['quicklink', 'Quick Links'], ['product', 'Shop Products'], ['collection', 'Collection'], ['channel', 'Channels'], ['schedule', 'Live Schedule'],
  ['idea', 'Content Ideas'], ['partnership', 'Partnership Tracker']
];

const recordLabels = { project: 'Project', content: 'Content Item', music: 'Music Link', quicklink: 'Quick Link', product: 'Product', collection: 'Collection Item', channel: 'Channel', schedule: 'Schedule Event', partnership: 'Partnership Prospect', idea: 'Content Idea' };
const publicVisibility = (record) => record.visibility === 'published' || record.visibility === 'public';
const contentPublished = (record) => publicVisibility(record) && record.status === 'published';
const all = (type) => recordsOf(state, type);
const pub = (type) => all(type).filter((record) => publicVisibility(record));
const publishedContent = () => all('content').filter(contentPublished);
const world = (id) => WORLDS.find((item) => item.id === id) || WORLDS[0];
const title = (value) => escapeHtml(value || 'Untitled');
const text = (value) => escapeHtml(value || '');
const routeName = () => {
  const requested = (location.hash || '#home').slice(1).split('?')[0] || 'home';
  return requested === 'owner' ? 'home' : requested;
};
const routeBase = () => routeName().split('/')[0];
const isRoute = (name) => routeBase() === name;
const go = (name) => { location.hash = name; };
const notice = (message, kind = 'success') => {
  let toast = document.querySelector('.toast');
  if (!toast) { toast = document.createElement('div'); toast.className = 'toast'; document.body.append(toast); }
  toast.textContent = message; toast.className = `toast ${kind === 'error' ? 'notice-red' : ''} show`;
  setTimeout(() => toast.classList.remove('show'), 3800);
};
const save = async () => { await saveState(state); };

function crown(size = 'brand-crown') { return `<img class="${size}" src="./assets/rizen-crown.svg" alt="THE RIZEN crown" />`; }
function badge(label, color = '') { return `<span class="badge ${color ? `badge-${color}` : ''}">${text(label)}</span>`; }
function safeLink(url, label = 'Open source') {
  return isHttpUrl(url) && url ? `<a class="button button-quiet" href="${escapeHtml(url)}" target="_blank" rel="noreferrer noopener">${text(label)} ↗</a>` : '';
}
function empty(titleText, detail, symbol = '◇') {
  return `<section class="empty-state"><div class="empty-symbol">${symbol}</div><h3>${text(titleText)}</h3><p>${text(detail)}</p></section>`;
}
function contentCard(record) {
  const tags = Array.isArray(record.tags) ? record.tags.slice(0, 3).map((tag) => badge(tag)).join('') : '';
  return `<article class="content-card">
    <div class="card-kicker">${badge(record.platform || 'Source')} ${badge(record.format || 'Content', 'red')} ${record.demo ? badge('Demo — private', 'gold') : ''}</div>
    <h3 class="card-title">${title(record.title)}</h3>
    <p class="card-text">${text(record.description || 'No description supplied yet.')}</p>
    <div class="card-meta"><span>${text(world(record.world).name)}</span><span>${tags}</span></div>
    <div class="card-actions">${safeLink(record.sourceUrl, 'Open on platform')}</div>
  </article>`;
}
function recordTag(record) { return record.demo ? badge('Demo', 'gold') : badge(record.visibility || 'private', record.visibility === 'private' ? 'red' : 'green'); }

function shell(page) {
  const current = routeBase();
  const freshMusic = pub('music').find((item) => item.defaultKey === 'fresh-rap-v1') || pub('music')[0];
  return `<div class="shell">
    <aside class="sidebar" aria-label="Main navigation">
      <a href="#home" class="brand-lockup" data-route="home">${crown()}<span><span class="brand-title">${text(state.brand.appName)}</span><span class="brand-sub">${text(state.brand.supportName)}</span></span></a>
      <p class="nav-label">Command center</p>
      <nav class="nav-list">${nav.map(([key, label, icon]) => `<a class="nav-link ${current === key ? 'is-active' : ''}" href="#${key}" data-route="${key}"><span class="nav-mark">${icon}</span>${label}</a>`).join('')}</nav>
      <p class="nav-label">Official public site</p>
      <div class="sidebar-foot"><span class="local-badge">PUBLIC CREATOR SITE</span><br>Owner Studio is kept private and is migrating to a secure database-backed dashboard.</div>
    </aside>
    <section class="main-wrap">
      <header class="topbar">
        <a class="mobile-brand" href="#home" data-route="home">${crown()}<b>THE RIZEN</b></a>
        <label class="search-box"><span class="sr-only">Search published content</span><input id="global-search" value="${text(searchTerm)}" placeholder="Search published content, worlds, projects…" autocomplete="off" /><span class="search-icon">⌕</span></label>
        <span class="topbar-spacer"></span>${freshMusic ? `<a class="music-chip" href="#music" data-route="music">${text(freshMusic.title)}</a>` : '<span class="music-chip">Music links are owner-set</span>'}
        <span class="owner-button" aria-label="Owner dashboard status">Owner dashboard — private</span>
      </header>
      <main id="main-content">${page}</main>
      <nav class="mobile-nav" aria-label="Mobile navigation">
        ${[['home','Home'],['watch','Watch'],['pocket','Pocket'],['projects','Projects'],['more','More']].map(([key,label]) => `<a href="#${key === 'more' ? 'channels' : key}" data-route="${key === 'more' ? 'channels' : key}" class="${current === key ? 'active' : ''}"><span class="m-icon">${icons[key] || icons.more}</span><span>${label}</span></a>`).join('')}
      </nav>
    </section>
  </div><div class="toast" role="status"></div>`;
}

function footer() {
  return `<footer class="footer"><div class="footer-row"><span><strong>THE RIZEN</strong> / ${text(state.brand.supportName)} / ${text(state.brand.gamingIdentity)}</span><span>FOLLOW • LIKE • SHARE</span><span>Official public creator site • Owner dashboard remains private</span></div></footer>`;
}

function freshMusicRecord() { return pub('music').find((item) => item.defaultKey === 'fresh-rap-v1') || pub('music')[0]; }
function nextPublishedSession() {
  const currentTime = Date.now();
  return pub('schedule').filter((item) => item.startAt && new Date(item.startAt).getTime() >= currentTime).sort((a, b) => new Date(a.startAt) - new Date(b.startAt))[0];
}
function weatherLabel(code) {
  if ([0].includes(code)) return 'Clear sky';
  if ([1, 2, 3].includes(code)) return 'Partly cloudy';
  if ([45, 48].includes(code)) return 'Foggy';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rain showers';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snow showers';
  if ([95, 96, 99].includes(code)) return 'Thunderstorm';
  return 'Conditions updating';
}
function renderPhoenixBriefing() {
  const freshMusic = freshMusicRecord();
  const upcoming = nextPublishedSession();
  const links = pub('quicklink').filter((item) => item.url && isHttpUrl(item.url));
  return `<section class="section phoenix-section"><div class="section-head"><div><p class="eyebrow">Phoenix now / live dashboard</p><h2>Your quick start</h2></div><p class="section-note">Time and date use America/Phoenix. Weather refreshes from Open-Meteo when available.</p></div>
    <div class="phoenix-grid">
      <article class="phoenix-card"><span class="dashboard-icon">◷</span><p class="card-kicker">Phoenix time</p><h3 data-phx-time>Loading local time…</h3><p class="card-text" data-phx-date>Loading local date…</p></article>
      <article class="phoenix-card"><span class="dashboard-icon">☼</span><p class="card-kicker">Current weather</p><h3 data-phx-weather>Checking Phoenix…</h3><p class="card-text" data-phx-weather-detail>Live conditions will appear here.</p></article>
      <article class="phoenix-card"><span class="dashboard-icon">!</span><p class="card-kicker">What matters</p><h3>${upcoming ? title(upcoming.title) : 'No creator alert set'}</h3><p class="card-text">${upcoming ? `${text(upcoming.platform || 'Live')} · ${new Date(upcoming.startAt).toLocaleString('en-US', { timeZone: 'America/Phoenix', dateStyle: 'medium', timeStyle: 'short' })} Phoenix time.` : 'No public upcoming session is on the calendar yet. Check back for confirmed broadcasts and events.'}</p></article>
      <article class="phoenix-card music-start-card"><span class="dashboard-icon">♫</span><p class="card-kicker">Fresh Start / Spotify</p><h3>${freshMusic ? title(freshMusic.title) : 'Add a real playlist'}</h3><p class="card-text">${freshMusic ? 'Official Spotify playback. Editorial contents change on Spotify; requested artist cues are Kodak Black, Lil Durk and Gucci Mane.' : 'More official playlists and links are being curated.'}</p>${freshMusic ? safeLink(freshMusic.url, 'Open in Spotify') : ''}</article>
    </div>
    <div class="quick-link-row">${links.length ? links.map((item) => `<a class="quick-link-card" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer noopener"><span class="quick-link-mark" aria-hidden="true">C</span><span><strong>${title(item.title)}</strong><small>${text(item.label || 'Official external link')}</small></span><span class="quick-link-arrow">↗</span></a>`).join('') : '<p class="micro">More official quick links will appear after verification.</p>'}</div>
  </section>`;
}

function renderHome() {
  const firstContent = publishedContent()[0];
  const firstProject = pub('project')[0];
  const firstProduct = pub('product')[0];
  return `<div class="page">
    <section class="hero">
      <div class="hero-content"><p class="eyebrow">Phoenix creator network / official public links</p><div class="hero-title-row">${crown('hero-crown')}<div><h1>${text(state.brand.appName)}</h1><p class="eyebrow">${text(state.brand.supportName)} · ${text(state.brand.gamingIdentity)}</p></div></div>
      <p class="hero-description">Gaming, builds, tech, desert field notes, collectibles and real creator work—organized in one creator hub with official links, live Phoenix conditions and music launchpads.</p>
      <div class="cta-row"><a class="button button-primary" href="#watch" data-route="watch">Watch releases</a><a class="button button-metal" href="#music" data-route="music">Listen</a><a class="button button-quiet" href="#projects" data-route="projects">Explore projects</a><a class="button button-quiet" href="#shop" data-route="shop">Shop</a></div></div>
    </section>
    <div class="notice"><strong>Official public site:</strong> private projects, drafts and Owner Studio records are intentionally not displayed here.</div>
    ${renderPhoenixBriefing()}
    <section class="section"><div class="section-head"><div><p class="eyebrow">Eight worlds</p><h2>Enter the archive</h2></div><p class="section-note">Every world has its own screen, filter and verified public content.</p></div>
      <div class="grid world-grid">${WORLDS.map((item) => `<a href="#world/${item.id}" data-route="world/${item.id}" class="world-card" style="--accent:${item.color}"><span class="world-number">VOLUME ${item.number}</span><span class="world-icon">${item.icon}</span><h3>${item.name}</h3><p>${item.summary}</p></a>`).join('')}</div>
    </section>
    <section class="section split-grid">
      <div><div class="section-head"><div><p class="eyebrow">Latest signal</p><h2>Watch feed</h2></div><a class="button button-quiet" href="#watch" data-route="watch">Open Watch</a></div>${firstContent ? contentCard(firstContent) : empty('No releases published yet', 'The Watch feed stays clear until official releases are added.', '▶')}</div>
      <div><div class="section-head"><div><p class="eyebrow">Workbench</p><h2>On the table</h2></div></div>${firstProject ? projectCard(firstProject) : empty('Private builds stay private', 'Public build notes and completed projects will appear here when they are ready to share.', '⌁')}</div>
    </section>
    <section class="section split-grid">
      <div><div class="section-head"><div><p class="eyebrow">Storefront</p><h2>Selected items</h2></div><a class="button button-quiet" href="#shop" data-route="shop">Visit shop</a></div>${firstProduct ? productCard(firstProduct) : empty('No shop items listed', 'Only real items you add and publish appear here. This framework never simulates checkout.', '◈')}</div>
      <div><div class="section-head"><div><p class="eyebrow">Live signal</p><h2>Status</h2></div></div><article class="status-hero">${badge('Status unconfigured', 'gold')}<h3>No live session declared</h3><p>Kick, Twitch and YouTube links stay in setup until you add and confirm a real destination or scheduled session.</p></article></div>
    </section>${footer()}
  </div>`;
}

function projectCard(record) {
  const tasks = Array.isArray(record.tasks) ? record.tasks : [];
  return `<article class="content-card"><div class="card-kicker">${badge(world(record.world).name)} ${badge(record.status || 'Idea', record.status === 'Published' ? 'green' : 'gold')}</div><h3 class="card-title">${title(record.title)}</h3><p class="card-text">${text(record.notes || 'No public project notes supplied.')}</p><div class="card-meta"><span>${tasks.filter((task) => task.complete).length}/${tasks.length} tasks done</span><span>${record.costEstimate ? `Estimate: ${text(record.costEstimate)}` : 'No cost estimate'}</span></div></article>`;
}
function productCard(record) {
  const canBuy = record.kind !== 'demo' && isHttpUrl(record.checkoutUrl) && !!record.checkoutUrl;
  return `<article class="content-card"><div class="card-kicker">${badge(record.kind || 'Owned inventory')} ${record.demo ? badge('Demo — no checkout', 'gold') : ''}</div><h3 class="card-title">${title(record.title)}</h3><p class="card-text">${text(record.description || 'No description supplied.')}</p><div class="card-meta"><span>${record.price ? `${text(record.currency || 'USD')} ${text(record.price)}` : 'Price not set'}</span><span>${record.stock || 'Stock not set'}</span></div>${record.affiliateDisclosure ? `<p class="micro">Affiliate disclosure: ${text(record.affiliateDisclosure)}</p>` : ''}<div class="card-actions">${canBuy ? safeLink(record.checkoutUrl, 'View purchase option') : '<button class="button button-quiet" disabled>Checkout unavailable</button>'}</div></article>`;
}

function renderWatch() {
  const platforms = [...new Set(publishedContent().map((item) => item.platform).filter(Boolean))];
  const formats = [...new Set(publishedContent().map((item) => item.format).filter(Boolean))];
  let items = publishedContent();
  if (watchFilter.world) items = items.filter((item) => item.world === watchFilter.world);
  if (watchFilter.platform) items = items.filter((item) => item.platform === watchFilter.platform);
  if (watchFilter.format) items = items.filter((item) => item.format === watchFilter.format);
  if (searchTerm) items = items.filter((item) => JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase()));
  return `<div class="page"><header class="page-head"><div><p class="eyebrow">Watch / public releases only</p><h1>WATCH THE RIZEN</h1><p>Official embeds and source links appear when new releases are ready to share.</p></div></header>
    <div class="filter-bar"><select data-watch-filter="world"><option value="">All worlds</option>${WORLDS.map((item) => `<option value="${item.id}" ${watchFilter.world === item.id ? 'selected' : ''}>${item.name}</option>`).join('')}</select><select data-watch-filter="platform"><option value="">All platforms</option>${platforms.map((value) => `<option ${watchFilter.platform === value ? 'selected' : ''}>${text(value)}</option>`).join('')}</select><select data-watch-filter="format"><option value="">All formats</option>${formats.map((value) => `<option ${watchFilter.format === value ? 'selected' : ''}>${text(value)}</option>`).join('')}</select><button class="button button-quiet" data-clear-watch>Clear filters</button></div>
    <div class="content-grid">${items.length ? items.map(contentCard).join('') : empty('No matching published releases', searchTerm ? `No published result matches “${searchTerm}.”` : 'No public releases are available yet.', '▶')}</div>${footer()}</div>`;
}

function renderWorld(id) {
  const item = world(id);
  const items = publishedContent().filter((record) => record.world === item.id);
  return `<div class="page"><header class="page-head"><div><p class="eyebrow">VOLUME ${item.number} / ${item.name}</p><h1>${item.name.toUpperCase()}</h1><p>${item.summary}</p></div><a class="button button-quiet" href="#watch" data-route="watch">All Watch filters</a></header>
  <section class="panel" style="border-color:${item.color}"><p class="eyebrow" style="color:${item.color}">World direction</p><p>${item.name === 'Real Life' ? 'Phoenix days, desert scouting, survival-skill field notes, comedy and the adventurous parts of real life—only when you choose to share them.' : item.summary}</p></section>
  <section class="section"><div class="section-head"><h2>Published inside this world</h2></div><div class="content-grid">${items.length ? items.map(contentCard).join('') : empty(`No ${item.name} releases published`, 'This world is ready for your real content. Drafts and private records stay out of this view.', item.icon)}</div></section>${footer()}</div>`;
}

function renderMusic() {
  const items = pub('music');
  return `<div class="page"><header class="page-head"><div><p class="eyebrow">Fresh Start / official Spotify support</p><h1>LISTEN IN YOUR LANE</h1><p>Start with the verified Spotify editorial launchpad, then return for more official playlists, albums, tracks and throwbacks.</p></div></header>
  <div class="notice">Spotify controls the current contents of editorial playlists and the available playback controls. This app uses official embeds and external Spotify links only; it does not create a personal playlist or claim every requested artist is included.</div>
  <div class="content-grid">${items.length ? items.map((item) => { const embed = spotifyEmbed(item.url); return `<article class="content-card"><div class="card-kicker">${badge(item.kind || 'Playlist', 'green')}</div><h3 class="card-title">${title(item.title)}</h3><p class="card-text">${text(item.description || 'Official link added by the owner.')}</p>${embed ? `<div class="embed-shell"><iframe title="Spotify: ${title(item.title)}" src="${embed}" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe><div class="embed-note">Official Spotify embed</div></div>` : ''}<div class="card-actions">${safeLink(item.url, 'Open in Spotify')}</div></article>`; }).join('') : empty('Music links are not set yet', 'No additional official music selections are available yet. Nothing has been guessed.', '♫')}</div>${footer()}</div>`;
}

function pocketNote() {
  try { return localStorage.getItem('rizen-pocket-note-v1') || ''; } catch { return ''; }
}

function pocketFavoriteList() {
  try { return localStorage.getItem('rizen-pocket-google-maps-list-v1') || ''; } catch { return ''; }
}

function isGoogleMapsUrl(value) {
  if (!isHttpUrl(value)) return false;
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host === 'maps.app.goo.gl' || host === 'maps.google.com' || host.endsWith('.google.com');
  } catch { return false; }
}

function openGoogleMaps(url) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

function updatePocketPlaceStatus() {
  const status = document.querySelector('[data-pocket-place-status]');
  const detail = document.querySelector('[data-pocket-place-detail]');
  if (!status || !detail) return;
  if (!pocketLocation) {
    status.textContent = 'Location not requested';
    detail.textContent = 'Allow location only when you want Google Maps to start nearby.';
    return;
  }
  status.textContent = 'Location ready for this session';
  detail.textContent = `${pocketLocation.latitude.toFixed(5)}, ${pocketLocation.longitude.toFixed(5)} · not sent to THE RIZEN.`;
}

function renderPocket() {
  return `<div class="page pocket-page"><header class="pocket-hero"><div><p class="eyebrow">Adam's Pocket / device-only utilities</p><h1>POCKET COMMAND</h1><p>Fast field tools for your Galaxy and laptop. Notes stay on this device. Camera, compass and screen controls ask for permission only when you press their tool.</p></div><div class="pocket-status"><span class="badge badge-green">Private on this device</span><span class="badge badge-gold">HTTPS tool set</span></div></header>
  <div class="notice notice-green"><strong>Privacy boundary:</strong> Pocket notes, sensor readings and calculator inputs are not sent to THE RIZEN, GitHub, a calendar, or any other service. Calendar opens through your own signed-in Google account.</div>
  <section class="section pocket-section"><div class="section-head"><div><p class="eyebrow">Everyday carry</p><h2>Quick tools</h2></div><p class="section-note">Real device tools work best after installing the live site on Android Chrome.</p></div>
    <div class="pocket-tool-grid">
      <article class="pocket-tool pocket-light-tool"><span class="pocket-icon">◉</span><h3>Screen light</h3><p>Use a white work light or red low-light screen. Tap anywhere on the light to close it.</p><div class="tool-actions"><button class="button button-primary" data-pocket-action="screen-white">White</button><button class="button button-quiet" data-pocket-action="screen-red">Red</button></div></article>
      <article class="pocket-tool"><span class="pocket-icon">⌁</span><h3>Flashlight</h3><p>Uses the rear camera torch when your device and browser permit it. No camera stream is stored.</p><div class="tool-actions"><button class="button button-primary" data-pocket-action="torch">Toggle flashlight</button></div></article>
      <article class="pocket-tool"><span class="pocket-icon">N</span><h3>Compass & level</h3><p>Move your phone in a figure-eight to calibrate. Keep it level for the most reliable reading.</p><div class="sensor-readout"><strong data-pocket-heading>—°</strong><span data-pocket-level>Level ready</span></div><div class="tool-actions"><button class="button button-primary" data-pocket-action="sensors">Start sensors</button></div></article>
      <article class="pocket-tool"><span class="pocket-icon">◷</span><h3>Timer</h3><p>Simple job, cleaning, cooking or break countdown. It stays on while this Pocket page is open.</p><div class="tool-inline"><label>Minutes <input data-pocket-minutes type="number" min="1" max="720" value="5" inputmode="numeric" /></label><strong data-pocket-timer>05:00</strong></div><div class="tool-actions"><button class="button button-primary" data-pocket-action="timer-start">Start</button><button class="button button-quiet" data-pocket-action="timer-pause">Pause</button><button class="button button-quiet" data-pocket-action="timer-reset">Reset</button></div></article>
    </div>
  </section>
  <section class="section pocket-section pocket-places"><div class="section-head"><div><p class="eyebrow">Personal map handoff</p><h2>Nearby & favorite spots</h2></div><p class="section-note">Location is requested only when you tap the button. Google Maps opens separately in your account.</p></div>
    <div class="places-stage">
      <article class="places-location"><span class="pocket-icon">⌖</span><div><h3>Use what is around you</h3><strong data-pocket-place-status>Location not requested</strong><p data-pocket-place-detail>Allow location only when you want Google Maps to start nearby.</p></div><div class="tool-actions"><button class="button button-primary" data-pocket-action="places-location">Use my location</button><a class="button button-quiet" href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer">Open Maps</a></div></article>
      <form class="places-search" data-pocket-places-form><label for="pocket-places-query">Search Google Maps near you</label><div class="places-search-row"><input id="pocket-places-query" type="search" placeholder="Coffee, comic shop, tacos, park…" autocomplete="off" /><button class="button button-primary" type="submit">Search Maps</button></div><p class="micro">Your words and approximate location stay in this browser until Google Maps opens in a separate tab.</p></form>
      <article class="places-favorites"><span class="pocket-icon">★</span><div><h3>My favorite spots</h3><p>Paste the share link for your own Google Maps saved list. It stays private on this device and opens only when you choose it.</p></div><label for="pocket-favorite-link">Google Maps saved-list link</label><div class="places-search-row"><input id="pocket-favorite-link" type="url" inputmode="url" placeholder="https://maps.app.goo.gl/..." value="${text(pocketFavoriteList())}" /><button class="button button-quiet" type="button" data-pocket-action="favorite-save">Save on this device</button><button class="button button-primary" type="button" data-pocket-action="favorite-open">Open my spots</button></div></article>
    </div>
  </section>
  <section class="section pocket-section"><div class="section-head"><div><p class="eyebrow">Work calculator kit</p><h2>Floor & dilution math</h2></div><p class="section-note">Enter the coverage rate printed on your actual product label.</p></div>
    <div class="pocket-calc-grid">
      <article class="pocket-tool"><span class="pocket-icon">▥</span><h3>Square footage & finish</h3><div class="calc-fields"><label>Length (ft)<input data-pocket-calc-input="floor-length" type="number" min="0" step="0.1" inputmode="decimal" /></label><label>Width (ft)<input data-pocket-calc-input="floor-width" type="number" min="0" step="0.1" inputmode="decimal" /></label><label>Coverage / gallon<input data-pocket-calc-input="floor-coverage" type="number" min="0" step="1" inputmode="decimal" placeholder="From label" /></label></div><p class="tool-output" data-pocket-floor-output>Enter length and width to calculate square feet.</p></article>
      <article class="pocket-tool"><span class="pocket-icon">◌</span><h3>Dilution calculator</h3><div class="calc-fields"><label>Concentrate oz / gal<input data-pocket-calc-input="dilution-oz" type="number" min="0" step="0.1" inputmode="decimal" /></label><label>Mixed gallons<input data-pocket-calc-input="dilution-gallons" type="number" min="0" step="0.1" inputmode="decimal" /></label></div><p class="tool-output" data-pocket-dilution-output>Enter the label ratio and number of gallons.</p></article>
      <article class="pocket-tool"><span class="pocket-icon">☼</span><h3>Phoenix heat check</h3><p>Live conditions are available on Home. Use the heat check before field work and bring water during high-heat conditions.</p><div class="tool-actions"><a class="button button-primary" href="#home" data-route="home">Open live weather</a></div></article>
    </div>
  </section>
  <section class="section pocket-section"><div class="section-head"><div><p class="eyebrow">Private organizer</p><h2>Notes & calendar</h2></div></div>
    <div class="pocket-calc-grid">
      <article class="pocket-tool"><span class="pocket-icon">✎</span><h3>Quick note</h3><textarea id="pocket-note" class="pocket-note" placeholder="Write a private note for this device…">${text(pocketNote())}</textarea><p class="micro">Saved only in this browser’s local storage. Clear browser data to remove it.</p><div class="tool-actions"><button class="button button-primary" data-pocket-action="note-save">Save note on this device</button></div></article>
      <article class="pocket-tool"><span class="pocket-icon">▦</span><h3>Private calendar</h3><p>Open Google Calendar in your own signed-in account. Your calendar ID and appointment details are never placed in this public site.</p><div class="tool-actions">${safeLink('https://calendar.google.com/calendar/u/0/r', 'Open Google Calendar')}${safeLink('https://calendar.google.com/calendar/r/eventedit', 'Add appointment')}</div></article>
      <article class="pocket-tool"><span class="pocket-icon">♫</span><h3>Music on the move</h3><p>Spotify stays the current official listening option. Locked-screen playback requires music you own or have rights to host; no tracks have been assumed.</p><div class="tool-actions"><a class="button button-primary" href="#music" data-route="music">Open music</a></div></article>
    </div>
  </section>${footer()}</div>`;
}

function renderProjects() {
  const items = pub('project');
  return `<div class="page"><header class="page-head"><div><p class="eyebrow">Build ledger / published projects</p><h1>THE WORKSHOP LOG</h1><p>Ideas progress through Planning, Building, Testing, Ready and Published. Private builds never appear on this page.</p></div></header>
  <div class="content-grid">${items.length ? items.map(projectCard).join('') : empty('The public build ledger is quiet', 'Public build records will appear here once they are ready to share.', '⌁')}</div>${footer()}</div>`;
}

function renderShop() {
  const items = pub('product');
  return `<div class="page"><header class="page-head"><div><p class="eyebrow">Shop / real items only</p><h1>THE RIZEN SHOP</h1><p>Owned inventory, authorized retail and clearly disclosed affiliate links stay separate. Checkout activates only with a real owner-supplied destination.</p></div></header>
  <div class="notice">No payment processor, store or checkout is connected. Demonstration products cannot accept payment.</div>
  <div class="content-grid">${items.length ? items.map(productCard).join('') : empty('No shop items listed', 'Only actual owner-added items with clear condition, price and destination belong here.', '◈')}</div>${footer()}</div>`;
}

function renderCollection() {
  const items = pub('collection');
  return `<div class="page"><header class="page-head"><div><p class="eyebrow">Collection / display archive</p><h1>COLLECTIBLES & COMICS</h1><p>Gallery records remain separate from shop inventory. An item is never marked for sale unless you explicitly choose it.</p></div></header>
  <div class="content-grid">${items.length ? items.map((item) => `<article class="content-card"><div class="card-kicker">${badge(item.franchise || 'Collection')} ${item.forSale ? badge('For sale', 'red') : badge('Display archive')}</div><h3 class="card-title">${title(item.title)}</h3><p class="card-text">${text(item.notes || 'No notes supplied.')}</p><div class="card-meta"><span>${text(item.maker || 'Maker not set')}</span><span>${text(item.condition || 'Condition not set')}</span></div></article>`).join('') : empty('The display archive is empty', 'Real comics, figures, art, statues and feature wish-list items will appear here when published.', '◇')}</div>${footer()}</div>`;
}

function renderChannels() {
  const channels = pub('channel');
  return `<div class="page"><header class="page-head"><div><p class="eyebrow">Channel registry / unverified by default</p><h1>FOLLOW THE SIGNAL</h1><p>Recorded identities are retained as editable setup fields. No channel is treated as connected until you confirm its exact destination.</p></div></header>
  <div class="content-grid">${channels.map((channel) => `<article class="content-card"><div class="card-kicker">${badge(channel.platform)} ${channel.state === 'connected' ? badge('Connected', 'green') : badge(channel.state || 'Setup pending', 'gold')}</div><h3 class="card-title">${title(channel.displayName)}</h3><p class="card-text">${channel.description ? text(channel.description) : 'Destination still needs owner confirmation.'}</p><div class="card-actions">${channel.url ? safeLink(channel.url, channel.state === 'connected' ? `Open ${channel.platform}` : 'Open setup destination') : '<button class="button button-quiet" disabled>URL setup required</button>'}</div>${channel.url && channel.state !== 'connected' ? '<p class="micro">Setup link only — verify the destination before marking it connected.</p>' : ''}</article>`).join('')}</div>${footer()}</div>`;
}

function renderLive() {
  const events = pub('schedule').sort((a, b) => String(a.startAt).localeCompare(String(b.startAt)));
  return `<div class="page"><header class="page-head"><div><p class="eyebrow">Live / source verified only</p><h1>LIVE COMMAND</h1><p>Kick, Twitch and YouTube are first-class destinations. Live status is never invented; scheduled sessions are clearly shown as scheduled.</p></div></header>
  <section class="status-hero">${badge('Live status unconfigured', 'gold')}<h3>No active broadcast signal</h3><p>Watch official channels for broadcasts and future schedule announcements. Source-platform chat remains the default.</p></section>
  <section class="section"><div class="section-head"><div><p class="eyebrow">America/Phoenix schedule</p><h2>Upcoming sessions</h2></div></div><div class="content-grid">${events.length ? events.map((event) => `<article class="content-card"><div class="card-kicker">${badge(event.platform || 'Live')} ${badge('Scheduled', 'blue')}</div><h3 class="card-title">${title(event.title)}</h3><p class="card-text">${event.startAt ? new Date(event.startAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Time not set'} — created in America/Phoenix.</p><div class="card-actions">${safeLink(event.url, `Open ${event.platform || 'platform'}`)}</div></article>`).join('') : empty('No sessions scheduled', 'Add a real upcoming session when it is confirmed. This app will not claim you are live without a valid signal or declared status.', '●')}</div></section>${footer()}</div>`;
}

function renderOwner() {
  if (!state.security.ownerConfigured) return `<div class="page"><section class="auth-card">${crown('auth-crown')}<p class="eyebrow">Temporary preview owner setup</p><h1>LOCK THE STUDIO</h1><p>Create a separate temporary preview passphrase. It is salted and hashed in this browser’s IndexedDB; it is not sent anywhere. Do not reuse your Windows Edge Owner Studio passphrase.</p><div class="notice">This temporary preview does not yet provide server accounts, shared device data, or production multi-user security. Its privacy boundary is this browser profile.</div><form id="owner-setup-form"><div class="field"><label for="setup-pin">Temporary preview passphrase</label><input id="setup-pin" name="pin" type="password" minlength="8" required autocomplete="new-password" placeholder="At least 8 characters" /><small>Use a distinct passphrase you can remember; it cannot be recovered by this temporary preview.</small></div><div class="field" style="margin-top:.75rem"><label for="setup-pin-confirm">Confirm passphrase</label><input id="setup-pin-confirm" name="confirm" type="password" minlength="8" required autocomplete="new-password" /></div><div class="form-actions"><button class="button button-primary" type="submit">Create temporary preview access</button></div></form></section>${footer()}</div>`;
  if (!isOwner()) return `<div class="page"><section class="auth-card">${crown('auth-crown')}<p class="eyebrow">Owner Studio</p><h1>OWNER ACCESS</h1><p>Enter your local owner passphrase to edit private projects, content, links, items and settings.</p><form id="owner-login-form"><div class="field"><label for="owner-pin">Owner PIN / passphrase</label><input id="owner-pin" name="pin" type="password" required autocomplete="current-password" /></div><div class="form-actions"><button class="button button-primary" type="submit">Unlock Owner Studio</button></div></form></section>${footer()}</div>`;
  const content = ownerSection === 'overview' ? ownerOverview() : ownerManager(ownerSection);
  return `<div class="page"><header class="page-head"><div><p class="eyebrow">Temporary browser-local owner workspace</p><h1>OWNER STUDIO</h1><p>Edit this preview without touching code. Changes stay in this browser profile; export a backup and do not treat this as the future shared database.</p></div><button class="button button-quiet" data-logout>Lock studio</button></header><div class="owner-layout"><nav class="owner-nav" aria-label="Owner Studio sections">${ownerSections.map(([id,label]) => `<button data-owner-section="${id}" class="${ownerSection === id ? 'active' : ''}">${label}</button>`).join('')}</nav><section class="owner-panel">${content}</section></div>${footer()}</div>`;
}

function ownerOverview() {
  const counts = { projects: all('project').length, drafts: all('content').filter((item) => item.status !== 'published').length, channels: all('channel').filter((item) => item.state !== 'connected').length, published: state.records.filter(publicVisibility).length };
  const completed = state.setup.filter((item) => item.complete).length;
  return `<div class="owner-toolbar"><div><h2>Studio overview</h2><p class="micro">Temporary preview saves happen immediately in this browser profile only.</p></div><span class="badge ${completed === state.setup.length ? 'badge-green' : 'badge-gold'}">${completed}/${state.setup.length} setup items</span></div>
  <section class="owner-live-command"><div><p class="eyebrow">Live owner preview</p><h2>Phoenix is live in the studio</h2><p>See the mural, local weather, Fresh Start music and channel registry without leaving your workspace.</p><div class="form-actions"><a class="button button-primary" href="#home" data-route="home">Open live Home</a><a class="button button-metal" href="#music" data-route="music">Test Spotify player</a><a class="button button-quiet" href="#channels" data-route="channels">Review channel links</a></div></div><div class="owner-live-stats"><div><span>PHOENIX TIME</span><strong data-phx-time>Loading…</strong><small data-phx-date>Loading local date…</small></div><div><span>WEATHER</span><strong data-phx-weather>Checking…</strong><small data-phx-weather-detail>Fetching live conditions…</small></div></div></section>
  <div class="stats-row"><div class="stat"><span class="stat-value">${counts.projects}</span><span class="stat-label">Project records</span></div><div class="stat"><span class="stat-value">${counts.drafts}</span><span class="stat-label">Content drafts</span></div><div class="stat"><span class="stat-value">${counts.channels}</span><span class="stat-label">Channels in setup</span></div><div class="stat"><span class="stat-value">${counts.published}</span><span class="stat-label">Public records</span></div></div>
  <section class="section"><div class="section-head"><div><p class="eyebrow">One setup checklist</p><h2>What still needs your real details</h2></div></div><div class="checklist">${state.setup.map((item) => `<label class="setup-item"><input type="checkbox" data-setup-id="${item.id}" ${item.complete ? 'checked' : ''}/><span><strong>${text(item.title)}</strong><p>${text(item.detail)}</p></span></label>`).join('')}</div></section>
  <section class="section"><div class="section-head"><div><p class="eyebrow">Brand controls</p><h2>Identity</h2></div></div><form id="brand-form" class="form-card"><div class="field-grid"><div class="field"><label>App name</label><input name="appName" required value="${text(state.brand.appName)}" /></div><div class="field"><label>Supporting identity</label><input name="supportName" required value="${text(state.brand.supportName)}" /></div><div class="field"><label>Gaming identity</label><input name="gamingIdentity" value="${text(state.brand.gamingIdentity)}" /></div><div class="field"><label>Home base</label><input name="home" value="${text(state.brand.home)}" /></div><div class="field full"><label>Slogan</label><input name="slogan" value="${text(state.brand.slogan)}" /></div></div><div class="form-actions"><button class="button button-primary" type="submit">Save brand settings</button></div></form></section>
  <section class="section"><div class="section-head"><div><p class="eyebrow">Backup & recovery</p><h2>Keep control of your records</h2></div></div><div class="form-card"><p class="micro">Export creates a JSON backup that includes private drafts and the locally hashed owner configuration. Import only a backup you created. Reset removes current local app data from this browser profile.</p><div class="form-actions"><button class="button button-metal" data-export>Export local backup</button><label class="button button-quiet" for="import-file">Import backup<input id="import-file" type="file" accept="application/json" hidden /></label><button class="button button-danger" data-reset>Reset local data</button></div></div></section>`;
}

function ownerManager(type) {
  const records = all(type).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  const editing = records.find((item) => item.id === editingId);
  return `<div class="owner-toolbar"><div><p class="eyebrow">${text(recordLabels[type] || type)}</p><h2>${type === 'project' ? 'Build the Workshop' : `${recordLabels[type] || type} manager`}</h2><p class="micro">Private is the default. “Published” changes what the public local preview can display.</p></div><button class="button button-primary" data-new-record="${type}">Add ${text(recordLabels[type] || type)}</button></div>
  ${recordForm(type, editing)}
  <section class="section"><div class="section-head"><h2>Saved records</h2><span class="badge">${records.length} total</span></div><div class="record-grid">${records.length ? records.map((record) => recordManagerCard(record)).join('') : empty(`No ${recordLabels[type] || type} records`, 'Create your first record using the form above.', '＋')}</div></section>`;
}

function recordManagerCard(record) {
  const primary = record.title || record.displayName || record.company || 'Untitled';
  const secondary = record.description || record.notes || record.url || record.contact || 'No notes yet.';
  return `<article class="record-card"><div class="card-kicker">${recordTag(record)} ${record.status ? badge(record.status, record.status === 'published' || record.status === 'Published' ? 'green' : '') : ''}</div><h3>${title(primary)}</h3><p>${text(String(secondary).slice(0, 160))}</p><div class="card-actions"><button class="button button-quiet" data-edit="${record.id}">Edit</button><button class="button button-danger" data-delete="${record.id}">Delete</button></div></article>`;
}

function optionList(values, selected) { return values.map((value) => `<option value="${escapeHtml(value)}" ${selected === value ? 'selected' : ''}>${escapeHtml(value)}</option>`).join(''); }
function input(name, label, value = '', hint = '', type = 'text', full = false) { return `<div class="field ${full ? 'full' : ''}"><label>${label}</label><input name="${name}" type="${type}" value="${text(value)}" />${hint ? `<small>${text(hint)}</small>` : ''}</div>`; }
function select(name, label, values, value = '', full = false) { return `<div class="field ${full ? 'full' : ''}"><label>${label}</label><select name="${name}">${optionList(values, value)}</select></div>`; }
function textarea(name, label, value = '', hint = '', full = true) { return `<div class="field ${full ? 'full' : ''}"><label>${label}</label><textarea name="${name}">${text(value)}</textarea>${hint ? `<small>${text(hint)}</small>` : ''}</div>`; }

function recordForm(type, record) {
  const r = record || defaultRecord(type);
  let fields = '';
  if (type === 'project') fields = `${input('title','Project title',r.title)}${select('world','World',WORLDS.map((item) => item.id),r.world)}${select('status','Status',['Idea','Planning','Building','Testing','Ready','Published'],r.status)}${select('visibility','Visibility',['private','published'],r.visibility)}${input('costEstimate','Cost estimate',r.costEstimate,'Optional; no currency assumed.')}${input('gamePlatform','Game / platform',r.gamePlatform)}${textarea('materials','Materials / tools',r.materials,'One line or a short list.')}${textarea('notes','Project notes',r.notes)}${textarea('tasksText','Checklist',Array.isArray(r.tasks) ? r.tasks.map((task) => task.label).join('\n') : '','One task per line. Check tasks in the saved record below after saving.')}`;
  else if (type === 'content') fields = `${input('title','Title',r.title)}${select('world','World',WORLDS.map((item) => item.id),r.world)}${select('platform','Platform',['YouTube','Kick','Twitch','Instagram','Facebook','TikTok','X','Other'],r.platform)}${select('format','Format',['Video','Short','Live highlight','Clip','Post'],r.format)}${select('status','Publishing state',['draft','published'],r.status)}${select('visibility','Visibility',['private','published'],r.visibility)}${input('sourceUrl','Official source URL',r.sourceUrl,'HTTPS/HTTP only. This opens externally unless an official embed is available.', 'url', true)}${input('tagsText','Tags',Array.isArray(r.tags) ? r.tags.join(', ') : '', 'Comma-separated tags.', 'text', true)}${textarea('description','Description',r.description)}${input('relatedProjectId','Related project ID',r.relatedProjectId,'Optional; copy from the project record only if you want a manual relationship.', 'text', true)}${input('relatedProductId','Related product ID',r.relatedProductId,'Optional; copy from the product record only if you want a manual relationship.', 'text', true)}`;
  else if (type === 'music') fields = `${input('title','Link title',r.title)}${select('kind','Link type',['Playlist','Album','Track','Episode','Show','Artist'],r.kind)}${select('visibility','Visibility',['private','published'],r.visibility)}${input('url','Official Spotify URL',r.url,'Use an open.spotify.com playlist, album, track, episode or show URL for an official embed.', 'url', true)}${textarea('description','Optional note',r.description)}`;
  else if (type === 'quicklink') fields = `${input('title','Link title',r.title)}${input('label','Short label',r.label,'Example: 21+ official location')}${select('visibility','Visibility',['private','published'],r.visibility)}${input('url','Official destination URL',r.url,'HTTPS/HTTP only. This opens externally.', 'url', true)}${textarea('description','Purpose / note',r.description)}`;
  else if (type === 'product') fields = `${input('title','Item title',r.title)}${select('kind','Item type',['Owned inventory','Authorized retail','Affiliate/referral','Demo'],r.kind)}${select('visibility','Visibility',['private','published'],r.visibility)}${input('price','Price',r.price,'Leave blank until real price is confirmed.')}${select('currency','Currency',['USD','CAD','EUR','GBP','Other'],r.currency || 'USD')}${input('stock','Stock / availability',r.stock,'Example: 1 available, made to order, or contact for availability.')}${input('checkoutUrl','Purchase destination',r.checkoutUrl,'No card entry or payment is collected here. Demo items never enable checkout.', 'url', true)}${input('affiliateDisclosure','Affiliate disclosure',r.affiliateDisclosure,'Required beside affiliate/referral links.', 'text', true)}${textarea('description','Description',r.description)}${textarea('shippingInfo','Shipping / pickup note',r.shippingInfo)}`;
  else if (type === 'collection') fields = `${input('title','Item title',r.title)}${select('visibility','Visibility',['private','published'],r.visibility)}${input('franchise','Franchise',r.franchise)}${input('maker','Maker / artist',r.maker)}${input('condition','Condition',r.condition)}${input('scale','Scale',r.scale)}${input('displayFootprint','Display footprint',r.displayFootprint)}<div class="field"><label>For sale?</label><select name="forSale"><option value="false" ${!r.forSale ? 'selected' : ''}>No — display archive only</option><option value="true" ${r.forSale ? 'selected' : ''}>Yes — owner explicitly chose for sale</option></select></div>${textarea('notes','Notes',r.notes)}`;
  else if (type === 'channel') fields = `${select('platform','Platform',['YouTube','Kick','Twitch','Instagram','Facebook','TikTok','X','Spotify','Other'],r.platform)}${input('displayName','Recorded identity / display name',r.displayName)}${select('state','Connection state',['setup','connecting','connected','expired','unavailable'],r.state)}${select('visibility','Visibility',['private','public'],r.visibility || 'public')}${input('url','Official destination URL',r.url,'Only mark “connected” after confirming the destination.', 'url', true)}${textarea('description','Description',r.description)}`;
  else if (type === 'schedule') fields = `${input('title','Session title',r.title)}${select('platform','Platform',['Kick','Twitch','YouTube','Other'],r.platform)}${input('startAt','Start date and time',r.startAt,'Record in America/Phoenix; browser display adapts to the viewer time zone.', 'datetime-local')}${select('visibility','Visibility',['private','published'],r.visibility)}${input('url','Source platform URL',r.url,'Use actual source destination.', 'url', true)}${textarea('notes','Notes',r.notes)}`;
  else if (type === 'partnership') fields = `${input('company','Company / prospect',r.company)}${select('status','Status',['Research','Drafting','Contacted','In conversation','Closed'],r.status)}${input('contact','Contact or source',r.contact,'Optional. No messages are sent by this app.', 'text', true)}${textarea('notes','Private notes',r.notes)}`;
  else if (type === 'idea') fields = `${input('title','Idea title',r.title)}${select('world','World',WORLDS.map((item) => item.id),r.world)}${select('stage','Stage',['Idea','Filmed','Edited','Published'],r.stage)}${textarea('notes','Notes',r.notes)}`;
  return `<form id="record-form" class="form-card" data-record-type="${type}"><h3>${record ? `Edit ${text(recordLabels[type])}` : `New ${text(recordLabels[type])}`}</h3><input type="hidden" name="id" value="${text(record?.id || '')}" /><div class="field-grid">${fields}</div><div class="form-actions"><button class="button button-primary" type="submit">${record ? 'Save changes' : `Create ${recordLabels[type]}`}</button>${record ? '<button class="button button-quiet" type="button" data-cancel-edit>Cancel edit</button>' : ''}</div></form>`;
}

function defaultRecord(type) {
  const base = { visibility: 'private', title: '', world: 'gaming', notes: '', description: '' };
  if (type === 'project') return { ...base, status: 'Idea', materials: '', costEstimate: '', gamePlatform: '', tasks: [] };
  if (type === 'content') return { ...base, platform: 'YouTube', format: 'Video', status: 'draft', sourceUrl: '', tags: [], relatedProjectId: '', relatedProductId: '' };
  if (type === 'music') return { ...base, kind: 'Playlist', url: '' };
  if (type === 'quicklink') return { ...base, label: '', url: '', visibility: 'private' };
  if (type === 'product') return { ...base, kind: 'Owned inventory', currency: 'USD', price: '', stock: '', checkoutUrl: '', affiliateDisclosure: '', shippingInfo: '' };
  if (type === 'collection') return { ...base, franchise: '', maker: '', condition: '', scale: '', displayFootprint: '', forSale: false };
  if (type === 'channel') return { platform: 'YouTube', displayName: '', state: 'setup', visibility: 'public', url: '', description: '' };
  if (type === 'schedule') return { ...base, platform: 'Kick', startAt: '', url: '' };
  if (type === 'partnership') return { company: '', status: 'Research', contact: '', notes: '', visibility: 'private' };
  if (type === 'idea') return { ...base, stage: 'Idea' };
  return base;
}

function pageForRoute() {
  const current = routeName();
  if (current.startsWith('world/')) return renderWorld(current.split('/')[1]);
  if (current === 'watch') return renderWatch();
  if (current === 'music') return renderMusic();
  if (current === 'pocket') return renderPocket();
  if (current === 'projects') return renderProjects();
  if (current === 'shop') return renderShop();
  if (current === 'collection') return renderCollection();
  if (current === 'live') return renderLive();
  if (current === 'channels' || current === 'more') return renderChannels();
  if (current === 'owner') return renderHome();
  return renderHome();
}

function updatePhoenixClock() {
  const time = document.querySelector('[data-phx-time]');
  const date = document.querySelector('[data-phx-date]');
  if (!time || !date) return;
  const now = new Date();
  time.textContent = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Phoenix', hour: 'numeric', minute: '2-digit', hour12: true }).format(now);
  date.textContent = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Phoenix', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(now);
}

async function hydratePhoenixBriefing() {
  const weather = document.querySelector('[data-phx-weather]');
  const detail = document.querySelector('[data-phx-weather-detail]');
  updatePhoenixClock();
  phoenixClockTimer = window.setInterval(updatePhoenixClock, 30000);
  if (!weather || !detail) return;
  try {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=33.4484&longitude=-112.0740&current=temperature_2m,apparent_temperature,weather_code,is_day&temperature_unit=fahrenheit&timezone=America%2FPhoenix';
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Weather request returned ${response.status}`);
    const payload = await response.json();
    const current = payload.current;
    if (!current || typeof current.temperature_2m !== 'number') throw new Error('Weather data was incomplete');
    weather.textContent = `${Math.round(current.temperature_2m)}°F · ${weatherLabel(current.weather_code)}`;
    detail.textContent = `Feels like ${Math.round(current.apparent_temperature)}°F · Updated ${current.time || 'recently'} Phoenix time.`;
  } catch {
    weather.textContent = 'Weather unavailable';
    detail.textContent = 'Refresh later to retry the public Phoenix weather feed.';
  }
}

function render() {
  if (phoenixClockTimer) { window.clearInterval(phoenixClockTimer); phoenixClockTimer = undefined; }
  if (routeName() !== 'pocket') { if (pocketTimerId) { window.clearInterval(pocketTimerId); pocketTimerId = undefined; } stopTorch(); }
  app.innerHTML = shell(pageForRoute());
  if (routeName() === 'home') hydratePhoenixBriefing();
  if (routeName() === 'pocket') { resetPocketTimer(); updatePocketCalculators(); updatePocketPlaceStatus(); }
}

async function handleRecordForm(form) {
  const type = form.dataset.recordType;
  const data = Object.fromEntries(new FormData(form).entries());
  const urlFields = ['sourceUrl', 'url', 'checkoutUrl'];
  if (urlFields.some((field) => data[field] && !isHttpUrl(data[field]))) return notice('Use a complete HTTP or HTTPS URL, or leave the field blank.', 'error');
  if (type === 'music' && data.url && !supportedEmbed(data.url)) return notice('Music links must use a supported official HTTP/HTTPS destination.', 'error');
  const changes = { ...data, demo: false };
  delete changes.id;
  if (type === 'project') { changes.tasks = (data.tasksText || '').split('\n').map((label) => label.trim()).filter(Boolean).map((label, index) => ({ id: `task_${Date.now()}_${index}`, label, complete: false })); delete changes.tasksText; }
  if (type === 'content') { changes.tags = (data.tagsText || '').split(',').map((tag) => tag.trim()).filter(Boolean); delete changes.tagsText; }
  if (type === 'collection') changes.forSale = data.forSale === 'true';
  if (type === 'product' && data.kind === 'Demo') { changes.demo = true; changes.checkoutUrl = ''; }
  if (data.id) { updateRecord(state, data.id, changes); notice(`${recordLabels[type]} saved locally.`); }
  else { addRecord(state, type, changes); notice(`${recordLabels[type]} created locally.`); }
  editingId = ''; await save(); render();
}

async function handleSubmit(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  if (form.id === 'owner-setup-form') {
    event.preventDefault(); const data = new FormData(form); const pin = String(data.get('pin') || ''); const confirm = String(data.get('confirm') || '');
    if (pin.length < 8) return notice('Use at least 8 characters for the local owner passphrase.', 'error');
    if (pin !== confirm) return notice('The passphrases do not match.', 'error');
    state.security.pinSalt = createSalt(); state.security.pinHash = await sha256(`${state.security.pinSalt}:${pin}`); state.security.ownerConfigured = true; setOwnerSession(true); await save(); notice('Owner access is ready on this browser.'); render(); return;
  }
  if (form.id === 'owner-login-form') {
    event.preventDefault(); const pin = String(new FormData(form).get('pin') || ''); const hash = await sha256(`${state.security.pinSalt}:${pin}`);
    if (hash !== state.security.pinHash) return notice('That owner passphrase does not match this browser profile.', 'error');
    setOwnerSession(true); notice('Owner Studio unlocked.'); render(); return;
  }
  if (form.matches('[data-pocket-places-form]')) { event.preventDefault(); searchPocketPlaces(); return; }
  if (form.id === 'record-form') { event.preventDefault(); await handleRecordForm(form); return; }
  if (form.id === 'brand-form') {
    event.preventDefault(); state.brand = { ...state.brand, ...Object.fromEntries(new FormData(form).entries()) }; await save(); notice('Brand settings saved locally.'); render();
  }
}

function setScreenLight(color) {
  document.querySelector('#pocket-screen-light')?.remove();
  if (!color) return;
  const overlay = document.createElement('button');
  overlay.id = 'pocket-screen-light'; overlay.className = `screen-light screen-light-${color}`;
  overlay.type = 'button'; overlay.title = 'Tap to close screen light'; overlay.setAttribute('aria-label', 'Tap to close screen light');
  overlay.addEventListener('click', () => overlay.remove()); document.body.append(overlay);
}

function stopTorch() {
  if (!torchStream) return;
  torchStream.getTracks().forEach((track) => track.stop()); torchStream = undefined;
}

async function toggleTorch() {
  if (torchStream) { stopTorch(); notice('Flashlight turned off.'); return; }
  if (!navigator.mediaDevices?.getUserMedia) return notice('This browser does not provide the rear-camera flashlight control.', 'error');
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    const track = stream.getVideoTracks()[0];
    if (!track?.getCapabilities?.().torch) { stream.getTracks().forEach((item) => item.stop()); return notice('This device camera does not report a flashlight control.', 'error'); }
    await track.applyConstraints({ advanced: [{ torch: true }] }); torchStream = stream; notice('Flashlight is on. Tap Toggle flashlight to turn it off.');
  } catch (error) { stopTorch(); notice(`Flashlight unavailable: ${error.message || 'camera permission was not granted'}.`, 'error'); }
}

function updatePocketSensors(event) {
  const heading = document.querySelector('[data-pocket-heading]'); const level = document.querySelector('[data-pocket-level]');
  const rawHeading = Number.isFinite(event.webkitCompassHeading) ? event.webkitCompassHeading : (360 - Number(event.alpha || 0)) % 360;
  if (heading && Number.isFinite(rawHeading)) heading.textContent = `${Math.round(rawHeading)}°`;
  if (level && Number.isFinite(event.beta) && Number.isFinite(event.gamma)) level.textContent = `Tilt ${Math.round(event.beta)}° / ${Math.round(event.gamma)}°`;
}

async function startPocketSensors() {
  try {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      const permission = await DeviceOrientationEvent.requestPermission();
      if (permission !== 'granted') return notice('Motion permission was not granted.', 'error');
    }
    if (!pocketOrientationActive) {
      window.addEventListener('deviceorientationabsolute', updatePocketSensors, true);
      window.addEventListener('deviceorientation', updatePocketSensors, true); pocketOrientationActive = true;
    }
    notice('Compass and level sensors are active. Move your phone in a figure-eight to calibrate.');
  } catch { notice('Compass sensors are unavailable in this browser.', 'error'); }
}

function formatPocketTimer(seconds) {
  const safe = Math.max(0, Math.ceil(seconds)); return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

function updatePocketTimer() {
  const output = document.querySelector('[data-pocket-timer]');
  const remaining = Math.max(0, (pocketTimerEndsAt - Date.now()) / 1000);
  if (output) output.textContent = formatPocketTimer(remaining);
  if (remaining <= 0 && pocketTimerId) { window.clearInterval(pocketTimerId); pocketTimerId = undefined; pocketTimerEndsAt = 0; if (output) notice('Pocket timer finished.'); }
}

function startPocketTimer() {
  const input = document.querySelector('[data-pocket-minutes]'); const minutes = Number(input?.value || 0);
  if (!Number.isFinite(minutes) || minutes <= 0) return notice('Enter a timer between 1 and 720 minutes.', 'error');
  if (pocketTimerId) window.clearInterval(pocketTimerId);
  pocketTimerEndsAt = Date.now() + Math.min(minutes, 720) * 60000; updatePocketTimer(); pocketTimerId = window.setInterval(updatePocketTimer, 1000); notice('Pocket timer started.');
}

function pausePocketTimer() {
  if (!pocketTimerId) return;
  const remaining = Math.max(0, (pocketTimerEndsAt - Date.now()) / 1000); window.clearInterval(pocketTimerId); pocketTimerId = undefined; pocketTimerEndsAt = Date.now() + remaining * 1000; notice('Pocket timer paused.');
}

function resetPocketTimer() {
  if (pocketTimerId) window.clearInterval(pocketTimerId); pocketTimerId = undefined; pocketTimerEndsAt = 0;
  const minutes = Number(document.querySelector('[data-pocket-minutes]')?.value || 5); const output = document.querySelector('[data-pocket-timer]'); if (output) output.textContent = formatPocketTimer(Math.max(1, minutes) * 60);
}

function updatePocketCalculators() {
  const value = (name) => Number(document.querySelector(`[data-pocket-calc-input="${name}"]`)?.value || 0);
  const length = value('floor-length'); const width = value('floor-width'); const coverage = value('floor-coverage'); const floorOutput = document.querySelector('[data-pocket-floor-output]');
  if (floorOutput) {
    const squareFeet = length > 0 && width > 0 ? length * width : 0;
    floorOutput.textContent = squareFeet ? `${squareFeet.toFixed(1)} sq ft${coverage > 0 ? ` · ${Math.ceil(squareFeet / coverage * 100) / 100} gallons at your entered coverage rate` : ' · enter coverage per gallon from the product label.'}` : 'Enter length and width to calculate square feet.';
  }
  const ounces = value('dilution-oz'); const gallons = value('dilution-gallons'); const dilutionOutput = document.querySelector('[data-pocket-dilution-output]');
  if (dilutionOutput) dilutionOutput.textContent = ounces > 0 && gallons > 0 ? `${(ounces * gallons).toFixed(1)} oz concentrate for ${gallons} mixed gallon${gallons === 1 ? '' : 's'}.` : 'Enter the label ratio and number of gallons.';
}

function requestPocketLocation() {
  if (!navigator.geolocation) return notice('This browser does not provide location access. You can still search Google Maps normally.', 'error');
  const status = document.querySelector('[data-pocket-place-status]');
  const detail = document.querySelector('[data-pocket-place-detail]');
  if (status) status.textContent = 'Waiting for your location choice…';
  if (detail) detail.textContent = 'Your browser will ask for permission. THE RIZEN does not receive or store the location.';
  navigator.geolocation.getCurrentPosition(
    (position) => {
      pocketLocation = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      updatePocketPlaceStatus();
      notice('Location is ready for Google Maps during this browser session only.');
    },
    (error) => {
      updatePocketPlaceStatus();
      notice(`Location was not shared: ${error.message || 'permission was not granted'}. You can still use normal Maps search.`, 'error');
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 }
  );
}

function searchPocketPlaces() {
  const query = document.querySelector('#pocket-places-query')?.value.trim();
  if (!query) return notice('Type what you want to find first, such as coffee, tacos, a park, or a comic shop.', 'error');
  const nearby = pocketLocation ? `${query} near ${pocketLocation.latitude.toFixed(5)},${pocketLocation.longitude.toFixed(5)}` : query;
  openGoogleMaps(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nearby)}`);
}

function savePocketFavoriteList() {
  const field = document.querySelector('#pocket-favorite-link');
  const url = field?.value.trim() || '';
  if (!url) {
    try { localStorage.removeItem('rizen-pocket-google-maps-list-v1'); notice('Saved favorite-spots link cleared from this device.'); } catch { notice('This browser did not allow local list storage.', 'error'); }
    return;
  }
  if (!isGoogleMapsUrl(url)) return notice('Paste a valid Google Maps or maps.app.goo.gl share link.', 'error');
  try { localStorage.setItem('rizen-pocket-google-maps-list-v1', url); notice('Your favorite-spots link is saved only on this device.'); } catch { notice('This browser did not allow local list storage.', 'error'); }
}

function openPocketFavoriteList() {
  const url = document.querySelector('#pocket-favorite-link')?.value.trim() || pocketFavoriteList();
  if (!url) return notice('Paste and save your Google Maps saved-list link first.', 'error');
  if (!isGoogleMapsUrl(url)) return notice('That is not a valid Google Maps share link.', 'error');
  openGoogleMaps(url);
}

async function handlePocketAction(action) {
  if (action === 'screen-white') return setScreenLight('white');
  if (action === 'screen-red') return setScreenLight('red');
  if (action === 'torch') return toggleTorch();
  if (action === 'sensors') return startPocketSensors();
  if (action === 'timer-start') return startPocketTimer();
  if (action === 'timer-pause') return pausePocketTimer();
  if (action === 'timer-reset') return resetPocketTimer();
  if (action === 'places-location') return requestPocketLocation();
  if (action === 'favorite-save') return savePocketFavoriteList();
  if (action === 'favorite-open') return openPocketFavoriteList();
  if (action === 'note-save') {
    try { localStorage.setItem('rizen-pocket-note-v1', document.querySelector('#pocket-note')?.value || ''); notice('Pocket note saved on this device.'); } catch { notice('This browser did not allow local note storage.', 'error'); }
  }
}

async function handleClick(event) {
  const target = event.target.closest('[data-route], [data-pocket-action], [data-owner-section], [data-edit], [data-delete], [data-new-record], [data-cancel-edit], [data-logout], [data-export], [data-reset], [data-clear-watch]');
  if (!target) return;
  if (target.dataset.route) { event.preventDefault(); go(target.dataset.route); return; }
  if (target.dataset.pocketAction) { await handlePocketAction(target.dataset.pocketAction); return; }
  if (target.dataset.ownerSection) { ownerSection = target.dataset.ownerSection; editingId = ''; render(); return; }
  if (target.dataset.edit) { editingId = target.dataset.edit; render(); return; }
  if (target.dataset.newRecord) { editingId = ''; ownerSection = target.dataset.newRecord; render(); return; }
  if (target.dataset.cancelEdit !== undefined) { editingId = ''; render(); return; }
  if (target.dataset.clearWatch !== undefined) { watchFilter = { world: '', platform: '', format: '' }; searchTerm = ''; render(); return; }
  if (target.dataset.logout !== undefined) { setOwnerSession(false); editingId = ''; notice('Owner Studio locked.'); render(); return; }
  if (target.dataset.delete) {
    const record = state.records.find((item) => item.id === target.dataset.delete); if (!record) return;
    if (!confirm(`Delete “${record.title || record.displayName || record.company || 'this record'}”? This only affects this local browser data.`)) return;
    removeRecord(state, record.id); editingId = ''; await save(); notice('Record deleted locally.'); render(); return;
  }
  if (target.dataset.export !== undefined) {
    const output = JSON.stringify({ exportedAt: new Date().toISOString(), app: 'THE RIZEN Local Framework', state }, null, 2);
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([output], { type: 'application/json' })); link.download = `the-rizen-local-backup-${new Date().toISOString().slice(0,10)}.json`; link.click(); URL.revokeObjectURL(link.href); notice('Local backup download started.'); return;
  }
  if (target.dataset.reset !== undefined) {
    if (!confirm('Reset all local THE RIZEN data in this browser? Export a backup first.')) return;
    state = await resetState(); ownerSection = 'overview'; editingId = ''; notice('Local data reset. Set a new owner passphrase to continue.'); render();
  }
}

async function handleChange(event) {
  const input = event.target;
  if (input.matches('[data-setup-id]')) { const item = state.setup.find((entry) => entry.id === input.dataset.setupId); if (item) { item.complete = input.checked; await save(); notice('Setup checklist updated.'); } return; }
  if (input.matches('[data-watch-filter]')) { watchFilter[input.dataset.watchFilter] = input.value; render(); return; }
  if (input.matches('[data-pocket-calc-input]')) { updatePocketCalculators(); return; }
  if (input.id === 'import-file') {
    const file = input.files?.[0]; if (!file) return;
    try { const imported = JSON.parse(await file.text()); if (!imported?.state?.records || !imported?.state?.brand) throw new Error('Unexpected backup format'); state = imported.state; await save(); setOwnerSession(false); ownerSection = 'overview'; editingId = ''; notice('Backup imported. Unlock Owner Studio with its original passphrase.'); render(); } catch { notice('Import failed. Choose a valid THE RIZEN local backup JSON file.', 'error'); }
  }
}

function handleInput(event) {
  if (event.target.id === 'global-search') searchTerm = event.target.value;
  if (event.target.matches('[data-pocket-calc-input]')) updatePocketCalculators();
}
function handleKeydown(event) {
  if (event.target.id === 'global-search' && event.key === 'Enter') { event.preventDefault(); go('watch'); }
}

async function boot() {
  state = await ensureState();
  render();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./service-worker.js?v=public5').catch(() => {});
}

document.addEventListener('submit', (event) => { handleSubmit(event).catch((error) => notice(`Save failed: ${error.message}`, 'error')); });
document.addEventListener('click', (event) => { handleClick(event).catch((error) => notice(`Action failed: ${error.message}`, 'error')); });
document.addEventListener('change', (event) => { handleChange(event).catch((error) => notice(`Update failed: ${error.message}`, 'error')); });
document.addEventListener('input', handleInput);
document.addEventListener('keydown', handleKeydown);
window.addEventListener('hashchange', () => { if (!location.hash) location.hash = 'home'; render(); });
window.addEventListener('beforeunload', stopTorch);
boot().catch((error) => { app.innerHTML = `<main class="page"><section class="auth-card"><h1>LOCAL STORAGE ERROR</h1><p>${escapeHtml(error.message)}</p><p>Try opening the preview in a modern browser with IndexedDB enabled.</p></section></main>`; });
