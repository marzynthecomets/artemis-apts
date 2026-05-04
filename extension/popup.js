// ============================================
// CONFIG - Replace with your Supabase credentials
// ============================================
const SUPABASE_URL = 'https://xwqnvkkqzjgvfkalljcx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_YdHGsGKjfxiERm7it8h1rA_Z1H--xQt';

// Initialize Supabase client (renamed to avoid collision with global `supabase` from supabase.js)
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================
// DOM ELEMENTS
// ============================================
const authScreen = document.getElementById('auth-screen');
const mainScreen = document.getElementById('main-screen');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const signInBtn = document.getElementById('sign-in-btn');
const signUpBtn = document.getElementById('sign-up-btn');
const signOutBtn = document.getElementById('sign-out-btn');
const authError = document.getElementById('auth-error');

// (tab elements are looked up dynamically; mode switching lives further down)

const urlField = document.getElementById('url');
const addressField = document.getElementById('address');
const priceField = document.getElementById('price');
const bedroomsField = document.getElementById('bedrooms');
const realtorNameField = document.getElementById('realtor-name');
const realtorContactField = document.getElementById('realtor-contact');
const statusField = document.getElementById('status');
const showingFields = document.getElementById('showing-fields');
const showingDateField = document.getElementById('showing-date');
const showingTimeField = document.getElementById('showing-time');
const notesField = document.getElementById('notes');
const saveBtn = document.getElementById('save-btn');
const saveStatus = document.getElementById('save-status');

const templateText = document.getElementById('template-text');
const copyTemplateBtn = document.getElementById('copy-template-btn');
const saveTemplateBtn = document.getElementById('save-template-btn');
const templateStatus = document.getElementById('template-status');

const groupTabsContainer = document.getElementById('group-tabs');
const modeIndicator = document.getElementById('mode-indicator');
const requirementsSection = document.getElementById('requirements-section');
const requirementsList = document.getElementById('requirements-list');

// Active mode state. Either:
//   { kind: 'personal' }
//   { kind: 'group', id: <uuid>, name: <string>, requirements: [...] }
//   { kind: 'message' }
let activeMode = { kind: 'personal' };
let userGroups = [];

// ============================================
// AUTH
// ============================================

// Check if user is already logged in when popup opens
async function checkAuth() {
  try {
    const { data: { session }, error } = await sb.auth.getSession();
    if (error) throw error;
    if (session) showMainScreen();
    else showAuthScreen();
  } catch (err) {
    // Stale refresh token (common after >24h) — clear it and prompt sign-in.
    console.warn('Session restore failed; clearing local session:', err?.message || err);
    try { await sb.auth.signOut({ scope: 'local' }); } catch {}
    showAuthScreen();
  }
}

// Auto-flip back to the auth screen if the SDK signs the user out
// (e.g. on a later token refresh failure while the panel is open).
sb.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') showAuthScreen();
});

function showAuthScreen() {
  authScreen.classList.remove('hidden');
  mainScreen.classList.add('hidden');
}

function showMainScreen() {
  authScreen.classList.add('hidden');
  mainScreen.classList.remove('hidden');
  grabCurrentTabUrl();
  loadTemplate();
  loadGroupsAndTabs();
}

// ============================================
// GROUPS & DYNAMIC TABS
// ============================================
async function loadGroupsAndTabs() {
  // Fetch active group memberships for the signed-in user.
  const { data: memberRows, error } = await sb
    .from('group_members')
    .select('status, role, group_id, groups(id, name)')
    .eq('status', 'active');
  if (error) {
    console.error('group fetch failed:', error);
    userGroups = [];
  } else {
    userGroups = (memberRows || []).filter((m) => m.groups).map((m) => ({ id: m.groups.id, name: m.groups.name }));
  }
  renderTabs();
  // Restore the last active mode if still valid; else default to personal.
  const saved = await new Promise((resolve) => {
    chrome.storage.local.get(['activeMode'], (r) => resolve(r.activeMode));
  });
  if (saved) {
    if (saved.kind === 'group' && userGroups.some((g) => g.id === saved.id)) {
      const g = userGroups.find((gg) => gg.id === saved.id);
      switchMode({ kind: 'group', id: g.id, name: g.name });
      return;
    }
    if (saved.kind === 'personal' || saved.kind === 'message') {
      switchMode({ kind: saved.kind });
      return;
    }
  }
  switchMode({ kind: 'personal' });
}

function renderTabs() {
  groupTabsContainer.innerHTML = '';
  userGroups.forEach((g) => {
    const btn = document.createElement('button');
    btn.className = 'tab';
    btn.dataset.mode = 'group';
    btn.dataset.groupId = g.id;
    btn.textContent = g.name;
    btn.addEventListener('click', () => switchMode({ kind: 'group', id: g.id, name: g.name }));
    groupTabsContainer.appendChild(btn);
  });
}

async function switchMode(mode) {
  activeMode = mode;
  // Persist for next open.
  if (mode.kind !== 'message') {
    chrome.storage.local.set({ activeMode: mode });
  }
  // Highlight the active tab.
  document.querySelectorAll('.tab-bar .tab').forEach((t) => t.classList.remove('active'));
  if (mode.kind === 'personal') {
    document.querySelector('.tab-bar .tab[data-mode="personal"]')?.classList.add('active');
  } else if (mode.kind === 'message') {
    document.querySelector('.tab-bar .tab[data-mode="message"]')?.classList.add('active');
  } else if (mode.kind === 'group') {
    document.querySelector(`.tab-bar .tab[data-group-id="${mode.id}"]`)?.classList.add('active');
  }
  // Show the appropriate panel.
  document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
  if (mode.kind === 'message') {
    document.getElementById('template-tab').classList.add('active');
  } else {
    document.getElementById('listing-tab').classList.add('active');
    updateListingPanelForMode();
  }
}

async function updateListingPanelForMode() {
  if (activeMode.kind === 'group') {
    modeIndicator.innerHTML = `Saving to: <strong>${escapeHtml(activeMode.name)}</strong>`;
    // Fetch this group's requirements.
    const { data: reqs } = await sb.from('requirements').select('*').eq('group_id', activeMode.id);
    activeMode.requirements = reqs || [];
    renderRequirementsCheckboxes(activeMode.requirements);
    requirementsSection.classList.remove('hidden');
  } else {
    modeIndicator.innerHTML = 'Saving to: <strong>Personal</strong>';
    requirementsSection.classList.add('hidden');
    requirementsList.innerHTML = '';
  }
}

function renderRequirementsCheckboxes(reqs) {
  requirementsList.innerHTML = '';
  if (reqs.length === 0) {
    requirementsList.innerHTML = '<p style="font-size: 12px; color: var(--text-secondary); margin: 0;">No requirements yet — add them in the web app under Settings.</p>';
    return;
  }
  reqs.forEach((r) => {
    const label = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.dataset.requirementId = r.id;
    label.appendChild(cb);
    const span = document.createElement('span');
    span.textContent = r.name;
    label.appendChild(span);
    requirementsList.appendChild(label);
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

signInBtn.addEventListener('click', async () => {
  authError.textContent = '';
  const email = authEmail.value.trim();
  const password = authPassword.value;

  if (!email || !password) {
    authError.textContent = 'Please enter email and password';
    return;
  }

  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    authError.textContent = error.message;
  } else {
    showMainScreen();
  }
});

signUpBtn.addEventListener('click', async () => {
  authError.textContent = '';
  const email = authEmail.value.trim();
  const password = authPassword.value;

  if (!email || !password) {
    authError.textContent = 'Please enter email and password';
    return;
  }

  if (password.length < 6) {
    authError.textContent = 'Password must be at least 6 characters';
    return;
  }

  const { error } = await sb.auth.signUp({ email, password });
  if (error) {
    authError.textContent = error.message;
  } else {
    authError.style.color = 'var(--success)';
    authError.textContent = 'Account created! Check your email to confirm, then sign in.';
  }
});

signOutBtn.addEventListener('click', async () => {
  await sb.auth.signOut();
  showAuthScreen();
});

// ============================================
// STATIC TABS (Personal / Message)
// Group tabs are wired up dynamically in renderTabs().
// ============================================

document.querySelector('.tab-bar .tab[data-mode="personal"]').addEventListener('click', () => {
  switchMode({ kind: 'personal' });
});
document.querySelector('.tab-bar .tab[data-mode="message"]').addEventListener('click', () => {
  switchMode({ kind: 'message' });
});

// ============================================
// URL CAPTURE
// ============================================

function grabCurrentTabUrl() {
  // chrome.tabs API to get the URL of the current tab
  if (typeof chrome !== 'undefined' && chrome.tabs) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url) {
        urlField.value = tabs[0].url;
      }
    });
  } else {
    // Fallback for testing outside of Chrome extension context
    urlField.value = window.location.href;
  }
}

// Side panel stays open across tab switches — keep the URL field in sync.
if (typeof chrome !== 'undefined' && chrome.tabs) {
  chrome.tabs.onActivated.addListener(grabCurrentTabUrl);
  chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
    if (changeInfo.url && tab.active) grabCurrentTabUrl();
  });
}

// ============================================
// STATUS → SHOWING FIELDS
// ============================================

statusField.addEventListener('change', () => {
  if (statusField.value === 'Scheduled') {
    showingFields.classList.remove('hidden');
  } else {
    showingFields.classList.add('hidden');
    showingDateField.value = '';
    showingTimeField.value = '';
  }
});

// ============================================
// SAVE LISTING
// ============================================

saveBtn.addEventListener('click', async () => {
  saveStatus.textContent = '';
  saveStatus.className = 'status-message';

  // Basic validation
  const url = urlField.value.trim();
  if (!url) {
    showSaveStatus('Please navigate to a listing page first', 'error');
    return;
  }

  // Build the listing object. group_id is set when saving from a group tab.
  const listing = {
    url: url,
    address: addressField.value.trim() || null,
    price: priceField.value ? parseInt(priceField.value) : null,
    bedrooms: bedroomsField.value !== '' ? parseInt(bedroomsField.value) : null,
    realtor_name: realtorNameField.value.trim() || null,
    realtor_contact: realtorContactField.value.trim() || null,
    status: statusField.value,
    notes: notesField.value.trim() || null,
    showing_date: statusField.value === 'Scheduled' ? (showingDateField.value || null) : null,
    showing_time: statusField.value === 'Scheduled' ? (showingTimeField.value || null) : null,
    group_id: activeMode.kind === 'group' ? activeMode.id : null,
  };

  // Disable button while saving
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  const { data: inserted, error } = await sb.from('listings').insert([listing]).select();

  if (error) {
    showSaveStatus('Error: ' + error.message, 'error');
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save listing';
    return;
  }

  // If saving to a group, write the requirement-met checkboxes too.
  if (activeMode.kind === 'group' && inserted?.[0]) {
    const newId = inserted[0].id;
    const checked = Array.from(requirementsList.querySelectorAll('input[type="checkbox"]:checked'));
    if (checked.length > 0) {
      const rows = checked.map((cb) => ({
        listing_id: newId,
        requirement_id: cb.dataset.requirementId,
        met: true,
      }));
      const { error: rErr } = await sb.from('listing_requirements').insert(rows);
      if (rErr) console.error('listing_requirements insert failed:', rErr);
    }
  }

  showSaveStatus('Listing saved!', 'success');
  setTimeout(clearForm, 1500);

  saveBtn.disabled = false;
  saveBtn.textContent = 'Save listing';
});

function showSaveStatus(message, type) {
  saveStatus.textContent = message;
  saveStatus.className = 'status-message ' + type;
}

function clearForm() {
  addressField.value = '';
  priceField.value = '';
  bedroomsField.value = '';
  realtorNameField.value = '';
  realtorContactField.value = '';
  statusField.value = 'Interested';
  showingFields.classList.add('hidden');
  showingDateField.value = '';
  showingTimeField.value = '';
  notesField.value = '';
  saveStatus.textContent = '';
  // Uncheck any requirements checkboxes (group mode).
  requirementsList.querySelectorAll('input[type="checkbox"]').forEach((cb) => { cb.checked = false; });
}

// ============================================
// MESSAGE TEMPLATE
// ============================================

// Save template to Chrome storage so it persists
function saveTemplate() {
  const text = templateText.value;
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.set({ messageTemplate: text });
  } else {
    localStorage.setItem('messageTemplate', text);
  }
}

// Load template from Chrome storage
function loadTemplate() {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.get(['messageTemplate'], (result) => {
      if (result.messageTemplate) {
        templateText.value = result.messageTemplate;
      }
    });
  } else {
    const saved = localStorage.getItem('messageTemplate');
    if (saved) {
      templateText.value = saved;
    }
  }
}

copyTemplateBtn.addEventListener('click', async () => {
  const text = templateText.value;
  if (!text) {
    showTemplateStatus('Write a template first!', 'error');
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    showTemplateStatus('Copied!', 'success');
  } catch (err) {
    // Fallback for older browsers
    templateText.select();
    document.execCommand('copy');
    showTemplateStatus('Copied!', 'success');
  }
});

saveTemplateBtn.addEventListener('click', () => {
  saveTemplate();
  showTemplateStatus('Template saved!', 'success');
});

function showTemplateStatus(message, type) {
  templateStatus.textContent = message;
  templateStatus.className = 'status-message ' + type;
  setTimeout(() => {
    templateStatus.textContent = '';
  }, 2000);
}

// ============================================
// INIT
// ============================================
checkAuth();
