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

const tabs = document.querySelectorAll('.tab[data-tab]');
const listingTab = document.getElementById('listing-tab');
const templateTab = document.getElementById('template-tab');

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

// ============================================
// AUTH
// ============================================

// Check if user is already logged in when popup opens
async function checkAuth() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    showMainScreen();
  } else {
    showAuthScreen();
  }
}

function showAuthScreen() {
  authScreen.classList.remove('hidden');
  mainScreen.classList.add('hidden');
}

function showMainScreen() {
  authScreen.classList.add('hidden');
  mainScreen.classList.remove('hidden');
  grabCurrentTabUrl();
  loadTemplate();
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
// TABS
// ============================================

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    // Deactivate all tabs
    tabs.forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    // Activate clicked tab
    tab.classList.add('active');
    const tabName = tab.getAttribute('data-tab');
    document.getElementById(tabName + '-tab').classList.add('active');
  });
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

  // Build the listing object
  const listing = {
    url: url,
    address: addressField.value.trim() || null,
    price: priceField.value ? parseInt(priceField.value) : null,
    bedrooms: bedroomsField.value ? parseInt(bedroomsField.value) : null,
    realtor_name: realtorNameField.value.trim() || null,
    realtor_contact: realtorContactField.value.trim() || null,
    status: statusField.value,
    notes: notesField.value.trim() || null,
    showing_date: statusField.value === 'Scheduled' ? (showingDateField.value || null) : null,
    showing_time: statusField.value === 'Scheduled' ? (showingTimeField.value || null) : null,
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

  showSaveStatus('Listing saved! Computing commutes…', 'success');

  // Fan out: compute commutes for this new listing across all destinations.
  const newListing = inserted?.[0];
  if (newListing && newListing.address) {
    const { data: dests } = await sb.from('destinations').select('*');
    if (Array.isArray(dests) && dests.length > 0) {
      const inserts = [];
      for (const d of dests) {
        if (!d.address) continue;
        const minutes = await fetchCommuteMinutes(newListing.address, d.address);
        if (minutes != null) {
          inserts.push({ listing_id: newListing.id, destination_id: d.id, duration_minutes: minutes });
        }
      }
      if (inserts.length > 0) {
        await sb.from('commutes').insert(inserts);
      }
    }
  }

  showSaveStatus('Listing saved!', 'success');
  setTimeout(clearForm, 1500);

  saveBtn.disabled = false;
  saveBtn.textContent = 'Save listing';
});

// Call the deployed Vercel function to fetch transit time. Returns null on any failure.
async function fetchCommuteMinutes(origin, destination) {
  if (!origin || !destination) return null;
  try {
    const r = await fetch('https://artemis-apts.vercel.app/api/commute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin, destination }),
    });
    if (!r.ok) return null;
    const { duration_minutes } = await r.json();
    return typeof duration_minutes === 'number' ? duration_minutes : null;
  } catch {
    return null;
  }
}

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
