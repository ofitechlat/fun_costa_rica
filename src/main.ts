import './style.css';
import { storage } from './storage';
import { BoardEngine } from './boardEngine';
import { SubmissionFormModal } from './submissionForm';
import { QrModal } from './qrModal';
import { AdminAuth } from './adminAuth';
import { AdminDashboard } from './adminDashboard';
import { AdStudio } from './adStudio';
import { CardStudio } from './cardStudio';
import { MemeFinder } from './memeFinder';
import { MemePickerModal } from './memePickerModal';
import './tools.css';
import type { Story, BoardConfig } from './types';

// DOM Elements
const viewBoard = document.getElementById('view-board') as HTMLElement;
const viewAdmin = document.getElementById('view-admin') as HTMLElement;
const viewAdStudio = document.getElementById('view-adstudio') as HTMLElement;
const viewCards = document.getElementById('view-cards') as HTMLElement;
const viewMemes = document.getElementById('view-memes') as HTMLElement;

const btnViewBoard = document.getElementById('btn-view-board') as HTMLButtonElement;
const btnViewAdStudio = document.getElementById('btn-view-adstudio') as HTMLButtonElement;
const btnViewCards = document.getElementById('btn-view-cards') as HTMLButtonElement;
const btnViewMemes = document.getElementById('btn-view-memes') as HTMLButtonElement;

const btnOpenQr = document.getElementById('btn-open-qr') as HTMLButtonElement;
const btnOpenSubmission = document.getElementById('btn-open-submission') as HTMLButtonElement;
const btnOpenAdmin = document.getElementById('btn-open-admin') as HTMLButtonElement;
const btnToggleFullscreen = document.getElementById('btn-toggle-fullscreen') as HTMLButtonElement;

const liveStoriesCount = document.getElementById('live-stories-count') as HTMLElement;
const spotlightModalEl = document.getElementById('spotlight-modal') as HTMLElement;
const submissionModalEl = document.getElementById('modal-submission') as HTMLElement;
const authModalEl = document.getElementById('modal-auth') as HTMLElement;
const qrModalEl = document.getElementById('modal-qr') as HTMLElement;
const memePickerModalEl = document.getElementById('modal-meme-picker') as HTMLElement;

const swimmingContainer = document.getElementById('swimming-container') as HTMLElement;
const particleCanvas = document.getElementById('particle-canvas') as HTMLCanvasElement;
const adminDashboardContainer = document.getElementById('admin-dashboard-container') as HTMLElement;
const adStudioContainer = document.getElementById('ad-studio-container') as HTMLElement;
const cardStudioContainer = document.getElementById('card-studio-container') as HTMLElement;
const memeFinderContainer = document.getElementById('meme-finder-container') as HTMLElement;

// Bottom Toolbar Elements
const btnToggleSpotlightCycle = document.getElementById('btn-toggle-spotlight-cycle') as HTMLButtonElement;
const spotlightCycleIcon = document.getElementById('spotlight-cycle-icon') as HTMLElement;
const spotlightCycleText = document.getElementById('spotlight-cycle-text') as HTMLElement;
const btnBoardSpeedToggle = document.getElementById('btn-board-speed-toggle') as HTMLButtonElement;
const boardSpeedLabel = document.getElementById('board-speed-label') as HTMLElement;

// Initialize Components
const boardEngine = new BoardEngine(swimmingContainer, particleCanvas, spotlightModalEl);
const qrModal = new QrModal(qrModalEl);
const memePickerModal = new MemePickerModal(memePickerModalEl);
const adStudio = new AdStudio(adStudioContainer);
const cardStudio = new CardStudio(cardStudioContainer, () => { refreshBoard(); }, memePickerModal);
const memeFinder = new MemeFinder(memeFinderContainer, (meme) => {
  cardStudio.useMeme(meme);
  switchView('cards');
});
let adminDashboard: AdminDashboard | null = null;

// Submission Modal
const submissionModal = new SubmissionFormModal(submissionModalEl, async () => {
  await refreshBoard();
}, memePickerModal);

// Update live count indicator
async function updateLiveCount() {
  const approved = await storage.getApprovedStories();
  if (liveStoriesCount) {
    liveStoriesCount.textContent = `🟢 En Vivo: ${approved.length} cagadas nadando`;
  }
}

// Refresh stories on the board
async function refreshBoard() {
  await boardEngine.loadStories(true);
  await updateLiveCount();
}

// Switch View Function
function switchView(viewName: 'board' | 'admin' | 'adstudio' | 'cards' | 'memes') {
  viewBoard.style.display = 'none';
  viewAdmin.style.display = 'none';
  viewAdStudio.style.display = 'none';
  viewCards.style.display = 'none';
  viewMemes.style.display = 'none';

  [btnViewBoard, btnViewAdStudio, btnViewCards, btnViewMemes].forEach(b => b.classList.remove('active'));

  if (viewName === 'board') {
    viewBoard.style.display = 'flex';
    btnViewBoard.classList.add('active');
  } else if (viewName === 'admin') {
    viewAdmin.style.display = 'flex';
    if (adminDashboard) adminDashboard.render();
  } else if (viewName === 'adstudio') {
    viewAdStudio.style.display = 'flex';
    btnViewAdStudio.classList.add('active');
  } else if (viewName === 'cards') {
    viewCards.style.display = 'flex';
    btnViewCards.classList.add('active');
  } else if (viewName === 'memes') {
    viewMemes.style.display = 'flex';
    btnViewMemes.classList.add('active');
  }
}

// Admin Dashboard Setup
adminDashboard = new AdminDashboard(adminDashboardContainer, {
  onConfigChanged: (config: BoardConfig) => {
    boardEngine.updateConfig(config);
    updateToolbarState(config);
  },
  onStoriesChanged: async () => {
    await refreshBoard();
  },
  onTriggerSpotlight: (story: Story) => {
    // Switch to board and trigger immediate spotlight
    switchView('board');
    setTimeout(() => {
      boardEngine.openSpotlight(story);
    }, 200);
  },
  onEditStory: (story: Story) => {
    switchView('cards');
    cardStudio.editStory(story);
  },
  onCreateStory: () => {
    switchView('cards');
    cardStudio.startNew();
  },
  onCloseDashboard: () => {
    switchView('board');
  }
});

function updateToolbarState(config: BoardConfig) {
  if (spotlightCycleIcon && spotlightCycleText) {
    if (config.spotlightEnabled) {
      spotlightCycleIcon.textContent = '⏸️';
      spotlightCycleText.textContent = 'Spotlight Auto: Activo';
    } else {
      spotlightCycleIcon.textContent = '▶️';
      spotlightCycleText.textContent = 'Spotlight Auto: En Pausa';
    }
  }

  if (boardSpeedLabel) {
    const labels = { slow: 'Lenta (Zen)', normal: 'Normal', fast: 'Rápida' };
    boardSpeedLabel.textContent = labels[config.swimSpeed] || 'Normal';
  }
}

// Event Listeners
btnViewBoard.addEventListener('click', () => switchView('board'));
btnViewAdStudio.addEventListener('click', () => {
  adStudio.render();
  switchView('adstudio');
});
btnViewCards.addEventListener('click', () => {
  cardStudio.render();
  switchView('cards');
});
btnViewMemes.addEventListener('click', () => {
  memeFinder.render();
  switchView('memes');
});

btnOpenQr.addEventListener('click', () => {
  qrModal.open();
});

btnOpenSubmission.addEventListener('click', () => {
  submissionModal.open();
});

btnOpenAdmin.addEventListener('click', () => {
  if (AdminAuth.isAuthenticated()) {
    switchView('admin');
  } else {
    authModalEl.classList.add('active');
    AdminAuth.renderLoginModal(authModalEl, () => {
      switchView('admin');
    });
  }
});

btnToggleFullscreen.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
});

// Bottom Toolbar Toggles
btnToggleSpotlightCycle.addEventListener('click', () => {
  const cfg = storage.getConfig();
  cfg.spotlightEnabled = !cfg.spotlightEnabled;
  storage.saveConfig(cfg);
  boardEngine.updateConfig(cfg);
  updateToolbarState(cfg);
});

btnBoardSpeedToggle.addEventListener('click', () => {
  const cfg = storage.getConfig();
  const nextSpeed: Record<string, 'slow' | 'normal' | 'fast'> = {
    slow: 'normal',
    normal: 'fast',
    fast: 'slow'
  };
  cfg.swimSpeed = nextSpeed[cfg.swimSpeed] || 'normal';
  storage.saveConfig(cfg);
  boardEngine.updateConfig(cfg);
  updateToolbarState(cfg);
});

// Brand title click returns to board
document.getElementById('nav-brand-link')?.addEventListener('click', (e) => {
  e.preventDefault();
  switchView('board');
});

// Support QR code URL direct submission hash (#confesar)
window.addEventListener('load', () => {
  if (window.location.hash === '#confesar') {
    submissionModal.open();
  }
});

// Lateral Zoom Dock Controller
function setupZoomController() {
  const btnZoomIn = document.getElementById('btn-zoom-in');
  const btnZoomOut = document.getElementById('btn-zoom-out');
  const btnZoomReset = document.getElementById('btn-zoom-reset');
  const zoomLabel = document.getElementById('zoom-value-label');

  const STORAGE_KEY = 'fun_zoom_percent';
  const MIN_ZOOM = 55;
  const MAX_ZOOM = 130;
  const STEP = 5;

  // En pantallas móviles / pequeñas, el zoom inicial se reduce a 85% para evitar "mucho zoom"
  const isMobile = window.innerWidth <= 768;
  const defaultZoom = isMobile ? 85 : 100;

  const saved = localStorage.getItem(STORAGE_KEY);
  let currentZoom = saved !== null ? Number(saved) : defaultZoom;
  if (!Number.isFinite(currentZoom) || currentZoom < MIN_ZOOM || currentZoom > MAX_ZOOM) {
    currentZoom = defaultZoom;
  }

  function applyZoom(val: number) {
    currentZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(val)));
    localStorage.setItem(STORAGE_KEY, currentZoom.toString());

    const scale = currentZoom / 100;
    (document.body.style as any).zoom = scale.toString();
    document.documentElement.style.setProperty('--app-zoom', scale.toString());

    if (zoomLabel) {
      zoomLabel.textContent = `${currentZoom}%`;
    }

    // Notifica cambio de dimensiones para que la pizarra y canvas reajusten sus límites
    window.dispatchEvent(new Event('resize'));
  }

  btnZoomIn?.addEventListener('click', (e) => {
    e.stopPropagation();
    applyZoom(currentZoom + STEP);
  });

  btnZoomOut?.addEventListener('click', (e) => {
    e.stopPropagation();
    applyZoom(currentZoom - STEP);
  });

  btnZoomReset?.addEventListener('click', (e) => {
    e.stopPropagation();
    // Alterna entre 85% y 100% al tocar el indicador
    const target = currentZoom === 100 ? 85 : 100;
    applyZoom(target);
  });

  applyZoom(currentZoom);
}

// App Startup
async function initApp() {
  // Detecta servidor (API + SQLite) o modo local y sincroniza la configuración.
  await storage.init();
  const initialConfig = storage.getConfig();
  boardEngine.updateConfig(initialConfig);
  updateToolbarState(initialConfig);
  setupZoomController();
  await refreshBoard();
  console.log('Fuckup Nights San José Interactive Board Loaded');
}

initApp();
