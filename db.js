const DB_NAME = 'the-rizen-local';
const DB_VERSION = 1;
const STORE = 'app';
const STATE_KEY = 'state';

const now = () => new Date().toISOString();
const uid = (prefix = 'rizen') => `${prefix}_${crypto.randomUUID()}`;

export const WORLDS = [
  { id: 'gaming', number: '01', name: 'Gaming', color: '#ed2438', icon: '✦', summary: 'Gameplay, campaigns, classic runs, reactions and clips.' },
  { id: 'workshop', number: '02', name: 'Build the Workshop', color: '#d7a53d', icon: '⌁', summary: 'Workbench builds, tools, soldering, printing and finishing.' },
  { id: 'tech', number: '03', name: 'Tech & Repair', color: '#63b8ff', icon: '◈', summary: 'Diagnostics, upgrades, repair notes and tutorials.' },
  { id: 'meshtastic', number: '04', name: 'Meshtastic & Electronics', color: '#61d889', icon: '⌁', summary: 'LoRa, mesh experiments, antennas and field electronics.' },
  { id: 'collectibles', number: '05', name: 'Collectibles & Comics', color: '#e66bd5', icon: '◇', summary: 'Comics, figures, statues, unboxings and display stories.' },
  { id: 'real-life', number: '06', name: 'Real Life', color: '#ff9b45', icon: '◒', summary: 'Phoenix days, desert recon, food, comedy and adventure.' },
  { id: 'live', number: '07', name: 'Live', color: '#a879ff', icon: '●', summary: 'Broadcasts, verified live signals and session schedules.' },
  { id: 'shorts', number: '08', name: 'Shorts', color: '#ff5e75', icon: '▸', summary: 'Fast cuts, reels, clips and highlights.' }
];

export const SETUP_ITEMS = [
  ['Primary YouTube channel', 'Confirm the canonical channel URL or ID for Adan UNFILTERED — @thisisphx82.'],
  ['Kick destination', 'Add the exact ADAN UNFILTERED Kick URL or handle.'],
  ['Other channel URLs', 'Confirm Twitch, Instagram, Facebook, TikTok, X and the optional second YouTube destination.'],
  ['Spotify links & favorites', 'Add official playlist, album or track URLs and only the favorites you want shown.'],
  ['Brand assets', 'Upload or replace the crown, banners, portraits and optional Chomperz photos.'],
  ['Content & projects', 'Add real titles, media links, build notes, photos and clear publishing choices.'],
  ['Collection & shop items', 'Add actual photos, condition, inventory, prices and only authorized sales destinations.'],
  ['Store & payments', 'Add shipping, returns, seller details and a real hosted checkout only when ready.'],
  ['Live schedule', 'Add real broadcast sessions in America/Phoenix and source platform links.']
];

function seedRecord(type, fields) {
  return { id: uid(type), type, createdAt: now(), updatedAt: now(), order: 0, ...fields };
}

const RAP_CAVIAR_URL = 'https://open.spotify.com/playlist/37i9dQZF1DX0XUsuxWHRQd';
const CURALEAF_PAVILIONS_URL = 'https://curaleaf.com/dispensary/arizona/curaleaf-dispensary-pavilions';
const CHANNEL_CANDIDATES = [
  ['YouTube', 'Adan UNFILTERED — @thisisphx82', 'https://www.youtube.com/@thisisphx82'],
  ['Twitch', '@thisisphoenix82', 'https://www.twitch.tv/thisisphoenix82'],
  ['Instagram', '@thisisphoenix82', 'https://www.instagram.com/thisisphoenix82/'],
  ['Facebook', 'Adan Unfiltered / ElGuapoII', 'https://www.facebook.com/ElGuapoII'],
  ['TikTok', '@thisisphoenix82', 'https://www.tiktok.com/@thisisphoenix82'],
  ['X', '@AdanAfherna2', 'https://x.com/AdanAfherna2']
];
const VERIFIED_OWNER_CHANNELS = [
  ['YouTube', 'SkySnake300 — owner-supplied link', 'https://www.youtube.com/@SkySnake300', 'Verified owner-supplied YouTube channel: Adam Risen / THE RIZEN.'],
  ['Facebook', 'Adan Unfiltered / ElGuapoII', 'https://www.facebook.com/ElGuapoII', 'Verified owner-supplied Facebook Page: Adam (Adan) / ADAN UNFILTERED.']
];

function candidateChannelNote() { return 'Candidate URL from the recorded handle. Open and verify the destination before changing the state to Connected.'; }
function skySnakeChannel() {
  return seedRecord('channel', {
    defaultKey: 'skysnake300-youtube-v1', platform: 'YouTube', displayName: 'SkySnake300 — owner-supplied link',
    url: 'https://www.youtube.com/@SkySnake300', description: 'Verified owner-supplied YouTube channel: Adam Risen / THE RIZEN.',
    state: 'connected', verifiedEmbed: false, visibility: 'public'
  });
}

function freshRapRecord() {
  return seedRecord('music', {
    defaultKey: 'fresh-rap-v1', title: 'Fresh Start — RapCaviar', kind: 'Playlist', visibility: 'published',
    url: RAP_CAVIAR_URL,
    description: 'Spotify editorial rap playlist. Its current contents are controlled by Spotify; use the official player for playback and shuffle. Requested artist cues: Kodak Black, Lil Durk and Gucci Mane.'
  });
}

function curaleafQuickLink() {
  return seedRecord('quicklink', {
    defaultKey: 'curaleaf-pavilions-v1', title: 'Curaleaf Pavilions', label: '21+ official location', visibility: 'published',
    url: CURALEAF_PAVILIONS_URL,
    description: '2175 N 83rd Ave, Phoenix, AZ 85035. Opens the official location page; ordering and purchases stay external.'
  });
}

export function createSeedState() {
  const channels = [
    ['YouTube', 'Adan UNFILTERED — @thisisphx82'],
    ['YouTube', 'SonoDesertLife / Desert Life with Adam & Friends'],
    ['Kick', 'ADAN UNFILTERED'],
    ['Twitch', '@thisisphoenix82'],
    ['Instagram', '@thisisphoenix82'],
    ['Facebook', 'Adan Unfiltered / ElGuapoII'],
    ['TikTok', '@thisisphoenix82'],
    ['X', '@AdanAfherna2'],
    ['Spotify', 'Account and favorite playlists']
  ].map(([platform, displayName], index) => {
    const candidate = CHANNEL_CANDIDATES.find(([candidatePlatform, candidateName]) => candidatePlatform === platform && candidateName === displayName);
    const verified = VERIFIED_OWNER_CHANNELS.find(([verifiedPlatform, verifiedName]) => verifiedPlatform === platform && verifiedName === displayName);
    return seedRecord('channel', {
      platform, displayName, url: verified ? verified[2] : (candidate ? candidate[2] : ''), description: verified ? verified[3] : (candidate ? candidateChannelNote() : ''), state: verified ? 'connected' : 'setup', verifiedEmbed: false, visibility: 'public', order: index
    });
  });

  return {
    version: 5,
    createdAt: now(),
    updatedAt: now(),
    security: { ownerConfigured: false, pinSalt: '', pinHash: '' },
    brand: {
      appName: 'THE RIZEN', supportName: 'ADAN UNFILTERED', gamingIdentity: 'PHOENIX82',
      slogan: 'Give me 1% of your trust. I will work to earn the other 99%.',
      home: 'Phoenix, Arizona', accent: '#ED2438'
    },
    setup: SETUP_ITEMS.map(([title, detail], index) => ({ id: `setup_${index + 1}`, title, detail, complete: false })),
    appliedDefaults: { 'fresh-rap-v1': true, 'curaleaf-pavilions-v1': true, 'channel-candidates-v1': true, 'skysnake300-youtube-v1': true, 'verified-owner-channels-v1': true },
    records: [
      ...channels,
      skySnakeChannel(),
      freshRapRecord(),
      curaleafQuickLink(),
      seedRecord('project', {
        title: 'DEMONSTRATION — First Workshop Build', world: 'workshop', status: 'Idea', visibility: 'private',
        notes: 'Private demonstration record. Replace with your first real project before publishing.',
        materials: '', costEstimate: '', gamePlatform: '', relatedVideoIds: [], relatedProductIds: [],
        tasks: [{ id: uid('task'), label: 'Replace this demonstration checklist with a real first task.', complete: false }], demo: true
      }),
      seedRecord('content', {
        title: 'DEMONSTRATION — Add Your First Release', world: 'gaming', platform: 'YouTube', format: 'Video', status: 'draft', visibility: 'private',
        sourceUrl: '', description: 'Private demonstration record. No video is connected or published.', tags: ['demo'], relatedProjectId: '', relatedProductId: '', demo: true
      }),
      seedRecord('idea', {
        title: 'Desert Recon / Field Notes', world: 'real-life', stage: 'Idea', visibility: 'private',
        notes: 'Optional adventure, survival-skill, scouting or ranger-style field-notes series. This is an idea only, not a completed project.', demo: true
      }),
      seedRecord('partnership', {
        company: 'Add a prospect when ready', status: 'Research', contact: '', notes: 'Private tracker only. No messages or outreach are sent by this framework.', visibility: 'private', demo: true
      })
    ]
  };
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'key' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getState() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const request = tx.objectStore(STORE).get(STATE_KEY);
    request.onsuccess = () => resolve(request.result?.value || null);
    request.onerror = () => reject(request.error);
  });
}

export async function saveState(state) {
  state.updatedAt = now();
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ key: STATE_KEY, value: state });
    tx.oncomplete = () => resolve(state);
    tx.onerror = () => reject(tx.error);
  });
}

function applyFrameworkUpdates(state) {
  let changed = false;
  if (!Array.isArray(state.records)) { state.records = []; changed = true; }
  if (!state.appliedDefaults || typeof state.appliedDefaults !== 'object') { state.appliedDefaults = {}; changed = true; }
  if (!state.appliedDefaults['fresh-rap-v1']) {
    state.records.unshift(freshRapRecord());
    state.appliedDefaults['fresh-rap-v1'] = true;
    changed = true;
  }
  if (!state.appliedDefaults['curaleaf-pavilions-v1']) {
    state.records.unshift(curaleafQuickLink());
    state.appliedDefaults['curaleaf-pavilions-v1'] = true;
    changed = true;
  }
  if (!state.appliedDefaults['channel-candidates-v1']) {
    for (const [platform, displayName, url] of CHANNEL_CANDIDATES) {
      const channel = state.records.find((item) => item.type === 'channel' && item.platform === platform && item.displayName === displayName);
      if (channel && !channel.url) { channel.url = url; channel.description = candidateChannelNote(); channel.updatedAt = now(); changed = true; }
    }
    state.appliedDefaults['channel-candidates-v1'] = true;
    changed = true;
  }
  if (!state.appliedDefaults['skysnake300-youtube-v1']) {
    if (!state.records.some((item) => item.defaultKey === 'skysnake300-youtube-v1')) { state.records.unshift(skySnakeChannel()); changed = true; }
    state.appliedDefaults['skysnake300-youtube-v1'] = true;
    changed = true;
  }
  if (!state.appliedDefaults['verified-owner-channels-v1']) {
    for (const [platform, displayName, url, description] of VERIFIED_OWNER_CHANNELS) {
      const channel = state.records.find((item) => item.type === 'channel' && item.platform === platform && item.displayName === displayName);
      if (channel) { Object.assign(channel, { url, description, state: 'connected', updatedAt: now() }); changed = true; }
    }
    state.appliedDefaults['verified-owner-channels-v1'] = true;
    changed = true;
  }
  if ((state.version || 1) < 5) { state.version = 5; changed = true; }
  return changed;
}

export async function ensureState() {
  let state = await getState();
  if (!state) { state = createSeedState(); await saveState(state); return state; }
  if (applyFrameworkUpdates(state)) await saveState(state);
  return state;
}

export async function resetState() {
  const state = createSeedState();
  await saveState(state);
  sessionStorage.removeItem('rizen-owner-session');
  return state;
}

export function addRecord(state, type, fields = {}) {
  const record = seedRecord(type, fields);
  state.records.unshift(record);
  return record;
}

export function updateRecord(state, id, changes) {
  const record = state.records.find((item) => item.id === id);
  if (!record) return null;
  Object.assign(record, changes, { updatedAt: now() });
  return record;
}

export function removeRecord(state, id) {
  state.records = state.records.filter((item) => item.id !== id);
}

export function recordsOf(state, type) { return state.records.filter((item) => item.type === type); }

export async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function createSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function isOwner() { return sessionStorage.getItem('rizen-owner-session') === 'active'; }
export function setOwnerSession(active) { active ? sessionStorage.setItem('rizen-owner-session', 'active') : sessionStorage.removeItem('rizen-owner-session'); }

export function isHttpUrl(value) {
  if (!value) return true;
  try { const url = new URL(value); return url.protocol === 'https:' || url.protocol === 'http:'; } catch { return false; }
}

export function supportedEmbed(url) {
  if (!url || !isHttpUrl(url)) return null;
  const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  const allowed = ['youtube.com', 'youtu.be', 'open.spotify.com', 'twitch.tv', 'kick.com', 'instagram.com'];
  return allowed.some((domain) => host === domain || host.endsWith(`.${domain}`)) ? host : null;
}

export function spotifyEmbed(url) {
  if (!url || !isHttpUrl(url)) return '';
  try {
    const parsed = new URL(url);
    if (parsed.hostname.replace(/^www\./, '') !== 'open.spotify.com') return '';
    const allowed = /\/(playlist|album|track|episode|show)\/[A-Za-z0-9]+/.exec(parsed.pathname);
    return allowed ? `https://open.spotify.com/embed${allowed[0]}` : '';
  } catch { return ''; }
}

export function escapeHtml(value = '') {
  return String(value).replace(/[&<>'\"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}
