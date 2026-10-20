import type { Story, BoardConfig } from './types';
import { storage } from './storage';
import { StreetSign3D } from './streetSign3D';

interface SwimmingCard {
  story: Story;
  element: HTMLElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  vAngle: number;
  width: number;
  height: number;
  isDragging: boolean;
  isHovered: boolean;
  dragStartX: number;
  dragStartY: number;
  cardStartX: number;
  cardStartY: number;
}

export class BoardEngine {
  private container: HTMLElement;
  private particleCanvas: HTMLCanvasElement;
  private particleCtx: CanvasRenderingContext2D | null = null;
  private cards: SwimmingCard[] = [];
  private stories: Story[] = [];
  private config: BoardConfig;
  private animationFrameId: number | null = null;
  private particleFrameId: number | null = null;
  private spotlightTimer: any = null;
  private currentSpotlightStory: Story | null = null;
  private isSpotlightActive = false;
  private spotlightModal: HTMLElement;
  private streetSign3D: StreetSign3D | null = null;
  private particles: Array<{ x: number; y: number; size: number; speedY: number; speedX: number; color: string; alpha: number }> = [];

  constructor(container: HTMLElement, particleCanvas: HTMLCanvasElement, spotlightModal: HTMLElement) {
    this.container = container;
    this.particleCanvas = particleCanvas;
    this.spotlightModal = spotlightModal;
    this.config = storage.getConfig();
    this.particleCtx = this.particleCanvas.getContext('2d');

    this.initParticles();
    this.setupWindowEvents();
    this.setupSpotlightModal();
  }

  updateConfig(newConfig: BoardConfig) {
    this.config = newConfig;
    this.resetSpotlightTimer();
  }

  async loadStories(approvedOnly = true) {
    this.stories = approvedOnly ? await storage.getApprovedStories() : await storage.getAllStories();
    this.renderCards();
    this.startSwimming();
    this.resetSpotlightTimer();
  }

  private setupWindowEvents() {
    window.addEventListener('resize', () => {
      this.resizeParticleCanvas();
      this.keepCardsInBounds();
    });
    this.resizeParticleCanvas();
  }

  private resizeParticleCanvas() {
    this.particleCanvas.width = window.innerWidth;
    this.particleCanvas.height = window.innerHeight;
  }

  private initParticles() {
    this.particles = [];
    const colors = ['#ff006e', '#4cc9f0', '#ffffff', '#ffbe0b'];
    for (let i = 0; i < 45; i++) {
      this.particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 2.5 + 0.8,
        speedX: (Math.random() - 0.5) * 0.4,
        speedY: -Math.random() * 0.6 - 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.5 + 0.2
      });
    }
    this.animateParticles();
  }

  private animateParticles() {
    if (!this.particleCtx) return;
    const ctx = this.particleCtx;
    const w = this.particleCanvas.width;
    const h = this.particleCanvas.height;

    ctx.clearRect(0, 0, w, h);

    if (this.config.ambientParticles) {
      for (const p of this.particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fill();

        p.x += p.speedX;
        p.y += p.speedY;

        if (p.y < -10) {
          p.y = h + 10;
          p.x = Math.random() * w;
        }
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
      }
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    this.particleFrameId = requestAnimationFrame(() => this.animateParticles());
  }

  private renderCards() {
    // Clean old card elements
    this.container.innerHTML = '';
    this.cards = [];

    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const cardW = 320;
    const cardH = 260;

    this.stories.forEach((story, index) => {
      const cardEl = document.createElement('div');
      cardEl.className = `swimming-card media-${story.mediaType}`;
      cardEl.setAttribute('data-id', story.id);

      // Media Badge
      let mediaBadge = '';
      if (story.mediaType === 'video') {
        mediaBadge = `<span class="badge-media video-badge"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> VIDEO</span>`;
      } else if (story.mediaType === 'photo') {
        mediaBadge = `<span class="badge-media photo-badge"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> FOTO</span>`;
      } else {
        mediaBadge = `<span class="badge-media text-badge"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> TEXTO</span>`;
      }

      // Author Badge
      const authorBadge = story.author.isAnonymous
        ? `<span class="badge-author anon"><span class="anon-icon">🕵️</span> 100% Anónimo</span>`
        : `<span class="badge-author known"><span class="author-avatar">${story.author.name?.charAt(0).toUpperCase() || 'F'}</span> ${story.author.name}</span>`;

      // Social Links
      let socials = '';
      if (!story.author.isAnonymous) {
        if (story.author.linkedin) {
          socials += `<span class="social-chip linkedin" title="LinkedIn">in</span>`;
        }
        if (story.author.instagram) {
          socials += `<span class="social-chip instagram" title="Instagram">IG</span>`;
        }
        if (story.author.website) {
          socials += `<span class="social-chip web" title="Sitio Web">🌐</span>`;
        }
      }

      // Preview Media Snippet
      let previewMedia = '';
      if (story.mediaType === 'photo' && story.photoUrl) {
        previewMedia = `<div class="card-thumb" style="background-image: url('${story.photoUrl}')"></div>`;
      } else if (story.mediaType === 'video' && story.videoUrl) {
        previewMedia = `
          <div class="card-video-thumb">
            <video src="${story.videoUrl}" muted preload="metadata"></video>
            <div class="play-overlay"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><polygon points="6 4 18 12 6 20 6 4"/></svg></div>
          </div>
        `;
      }

      cardEl.innerHTML = `
        <div class="card-inner">
          <div class="card-header">
            <span class="category-tag">${story.category || 'Fuckup'}</span>
            ${mediaBadge}
          </div>
          ${previewMedia}
          <h3 class="card-title">${story.title}</h3>
          <p class="card-excerpt">${story.content.substring(0, 110)}${story.content.length > 110 ? '...' : ''}</p>
          <div class="card-footer">
            ${authorBadge}
            <div class="card-socials">${socials}</div>
          </div>
        </div>
      `;

      this.container.appendChild(cardEl);

      // Initial distributed coordinates
      const margin = 80;
      const cols = Math.max(2, Math.floor((viewportW - margin * 2) / (cardW + 40)));
      const rows = Math.max(2, Math.ceil(this.stories.length / cols));
      const col = index % cols;
      const row = Math.floor(index / cols);

      const cellW = (viewportW - margin * 2) / cols;
      const cellH = (viewportH - margin * 2 - 80) / Math.max(1, rows);

      const initialX = margin + col * cellW + Math.random() * (cellW - cardW);
      const initialY = 90 + row * cellH + Math.random() * Math.max(20, cellH - cardH);

      // Speed scale
      let speedMult = 0.8;
      if (this.config.swimSpeed === 'slow') speedMult = 0.4;
      if (this.config.swimSpeed === 'fast') speedMult = 1.4;

      const swimmingCard: SwimmingCard = {
        story,
        element: cardEl,
        x: Math.max(20, Math.min(viewportW - cardW - 20, initialX)),
        y: Math.max(80, Math.min(viewportH - cardH - 20, initialY)),
        vx: (Math.random() > 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.5) * speedMult,
        vy: (Math.random() > 0.5 ? 1 : -1) * (0.2 + Math.random() * 0.4) * speedMult,
        angle: (Math.random() - 0.5) * 5,
        vAngle: (Math.random() - 0.5) * 0.05,
        width: cardW,
        height: cardH,
        isDragging: false,
        isHovered: false,
        dragStartX: 0,
        dragStartY: 0,
        cardStartX: 0,
        cardStartY: 0
      };

      this.attachCardInteractions(swimmingCard);
      this.cards.push(swimmingCard);
    });
  }

  private attachCardInteractions(sc: SwimmingCard) {
    const el = sc.element;

    el.addEventListener('mouseenter', () => {
      sc.isHovered = true;
      el.style.zIndex = '80';
    });

    el.addEventListener('mouseleave', () => {
      sc.isHovered = false;
      el.style.zIndex = '10';
    });

    // Drag support
    let hasMovedMuch = false;

    const onPointerDown = (e: PointerEvent) => {
      if (this.isSpotlightActive) return;
      sc.isDragging = true;
      hasMovedMuch = false;
      sc.dragStartX = e.clientX;
      sc.dragStartY = e.clientY;
      sc.cardStartX = sc.x;
      sc.cardStartY = sc.y;
      el.setPointerCapture(e.pointerId);
      el.classList.add('is-dragging');
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!sc.isDragging) return;
      const dx = e.clientX - sc.dragStartX;
      const dy = e.clientY - sc.dragStartY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        hasMovedMuch = true;
      }
      sc.x = sc.cardStartX + dx;
      sc.y = sc.cardStartY + dy;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!sc.isDragging) return;
      sc.isDragging = false;
      el.classList.remove('is-dragging');
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {}

      // If user merely clicked without dragging much, spotlight immediately!
      if (!hasMovedMuch) {
        this.openSpotlight(sc.story);
      }
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);
  }

  private startSwimming() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);

    const updateLoop = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const topBoundary = 80;
      const bottomBoundary = h - 20;

      for (const card of this.cards) {
        if (!card.isDragging) {
          // If hovered, slow down smoothly
          const factor = card.isHovered ? 0.2 : 1;

          // Organic gentle steering
          card.vx += (Math.random() - 0.5) * 0.04 * factor;
          card.vy += (Math.random() - 0.5) * 0.04 * factor;

          // Max speed clamp
          const maxSpeed = (this.config.swimSpeed === 'fast' ? 1.6 : this.config.swimSpeed === 'slow' ? 0.5 : 0.9) * factor;
          card.vx = Math.max(-maxSpeed, Math.min(maxSpeed, card.vx));
          card.vy = Math.max(-maxSpeed, Math.min(maxSpeed, card.vy));

          // Soft boundary deflection
          const padding = 20;
          if (card.x < padding) {
            card.vx = Math.abs(card.vx) * 0.9;
            card.x = padding;
          } else if (card.x + card.width > w - padding) {
            card.vx = -Math.abs(card.vx) * 0.9;
            card.x = w - padding - card.width;
          }

          if (card.y < topBoundary) {
            card.vy = Math.abs(card.vy) * 0.9;
            card.y = topBoundary;
          } else if (card.y + card.height > bottomBoundary) {
            card.vy = -Math.abs(card.vy) * 0.9;
            card.y = bottomBoundary - card.height;
          }

          card.x += card.vx;
          card.y += card.vy;

          card.angle += card.vAngle;
          if (card.angle > 4) card.vAngle = -Math.abs(card.vAngle);
          if (card.angle < -4) card.vAngle = Math.abs(card.vAngle);
        }

        // Apply hardware-accelerated transform
        const rot = card.isHovered ? 0 : card.angle;
        const scale = card.isHovered ? 1.05 : 1;
        card.element.style.transform = `translate3d(${card.x}px, ${card.y}px, 0) rotate(${rot}deg) scale(${scale})`;
      }

      this.animationFrameId = requestAnimationFrame(updateLoop);
    };

    this.animationFrameId = requestAnimationFrame(updateLoop);
  }

  private keepCardsInBounds() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (const card of this.cards) {
      if (card.x + card.width > w) card.x = Math.max(10, w - card.width - 20);
      if (card.y + card.height > h) card.y = Math.max(90, h - card.height - 20);
    }
  }

  // SPOTLIGHT SYSTEM
  private resetSpotlightTimer() {
    if (this.spotlightTimer) {
      clearTimeout(this.spotlightTimer);
      this.spotlightTimer = null;
    }

    if (!this.config.spotlightEnabled || this.stories.length === 0) return;

    // Pick random time between minInterval and maxInterval
    const minMs = Math.max(5, this.config.minIntervalSeconds) * 1000;
    const maxMs = Math.max(minMs, this.config.maxIntervalSeconds * 1000);
    const interval = Math.floor(minMs + Math.random() * (maxMs - minMs));

    this.spotlightTimer = setTimeout(() => {
      this.triggerRandomSpotlight();
    }, interval);
  }

  private triggerRandomSpotlight() {
    if (this.isSpotlightActive || this.stories.length === 0) {
      this.resetSpotlightTimer();
      return;
    }

    // Pick a story that is not the same as the previous one if possible
    let candidate = this.stories[Math.floor(Math.random() * this.stories.length)];
    if (this.stories.length > 1 && this.currentSpotlightStory && candidate.id === this.currentSpotlightStory.id) {
      const others = this.stories.filter(s => s.id !== this.currentSpotlightStory?.id);
      candidate = others[Math.floor(Math.random() * others.length)];
    }

    this.openSpotlight(candidate);
  }

  public openSpotlight(story: Story) {
    this.isSpotlightActive = true;
    this.currentSpotlightStory = story;
    if (this.spotlightTimer) clearTimeout(this.spotlightTimer);

    // Dim swimming cards
    this.container.classList.add('dimmed');

    // Populate modal content
    this.renderSpotlightContent(story);

    this.spotlightModal.classList.add('active');
  }

  public closeSpotlight() {
    if (!this.isSpotlightActive) return;

    // Stop any playing video
    const video = this.spotlightModal.querySelector('video') as HTMLVideoElement;
    if (video) {
      video.pause();
      video.src = '';
    }

    this.spotlightModal.classList.remove('active');
    this.container.classList.remove('dimmed');
    this.isSpotlightActive = false;

    if (this.streetSign3D) {
      this.streetSign3D.destroy();
      this.streetSign3D = null;
    }

    // Schedule next spotlight cycle
    this.resetSpotlightTimer();
  }

  private setupSpotlightModal() {
    // Backdrop click closes modal
    this.spotlightModal.addEventListener('click', (e) => {
      if (e.target === this.spotlightModal) {
        this.closeSpotlight();
      }
    });

    const closeBtn = this.spotlightModal.querySelector('.btn-close-spotlight');
    closeBtn?.addEventListener('click', () => {
      this.closeSpotlight();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isSpotlightActive) {
        this.closeSpotlight();
      }
    });
  }

  private renderSpotlightContent(story: Story) {
    const modalBody = this.spotlightModal.querySelector('.spotlight-body');
    const timerBar = this.spotlightModal.querySelector('.spotlight-progress-fill') as HTMLElement;
    if (!modalBody) return;

    // Media display
    const isVideo = story.mediaType === 'video' && !!story.videoUrl;
    const isPhoto = story.mediaType === 'photo' && !!story.photoUrl;

    // Foto / Meme como fondo de pantalla de la tarjeta (se ve igual que las de texto puro, pero con el meme de wallpaper)
    let backdropHtml = '';
    if (isPhoto && story.photoUrl) {
      backdropHtml = `
        <div class="spotlight-card-backdrop" style="background-image: url('${story.photoUrl}');">
          <div class="spotlight-backdrop-overlay"></div>
        </div>
      `;
    }

    let mediaSection = '';
    if (isVideo && story.videoUrl) {
      mediaSection = `
        <div class="spotlight-media-frame">
          <video id="spotlight-active-video" src="${story.videoUrl}" playsinline ${this.config.videoMuted ? 'muted' : ''} controls></video>
          <div class="video-sound-toggle-btn" id="btn-video-sound">
            ${this.config.videoMuted ? '🔇 Activar Sonido' : '🔊 Con Audio'}
          </div>
        </div>
      `;
    }

    // Learnings box
    let learningsHtml = '';
    if (story.learnings) {
      learningsHtml = `
        <div class="spotlight-learnings-box">
          <div class="learnings-header">💡 LO QUE APRENDÍ DE ESTA CAGADA:</div>
          <p class="learnings-text">${story.learnings}</p>
        </div>
      `;
    }

    modalBody.innerHTML = `
      ${backdropHtml}
      <div class="spotlight-tv-layout ${isVideo ? 'has-media' : 'text-only'}${isPhoto ? ' has-backdrop-photo' : ''}">
        ${isVideo ? `
          <div class="spotlight-media-column">
            ${mediaSection}
          </div>
        ` : ''}

        <div class="spotlight-info-column">
          <div class="spotlight-top-meta">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="spotlight-cat-tag">${story.category || 'Fuckup Night'}</span>
              ${isPhoto ? '<span class="spotlight-cat-tag photo-pill">🖼️ Meme de Fondo</span>' : ''}
            </div>
            <span class="spotlight-hashtag">#ShareTheFailure</span>
          </div>

          <h1 class="spotlight-main-title">${story.title}</h1>

          <div class="spotlight-story-content">
            <p class="story-full-text">${story.content}</p>
          </div>

          ${learningsHtml}

          <div class="spotlight-author-compact">
            <span class="author-label-chip">
              ${story.author.isAnonymous ? '🕵️ Confesión 100% Anónima' : '🔥 ' + (story.author.name || 'Valiente de la noche')}
            </span>
          </div>
        </div>
      </div>
    `;

    // Render Three.js 3D Street Corner Sign Post en el espacio lateral derecho (fuera del contenedor)
    const streetSignAnchor = (this.spotlightModal.querySelector('#spotlight-street-signs-anchor') || modalBody.querySelector('#spotlight-street-signs-anchor')) as HTMLElement;
    if (streetSignAnchor) {
      if (this.streetSign3D) this.streetSign3D.destroy();
      this.streetSign3D = new StreetSign3D(streetSignAnchor);
      this.streetSign3D.render(story.author);
    }

    // Handle Video Autoplay & Duration
    if (story.mediaType === 'video') {
      const videoEl = modalBody.querySelector('#spotlight-active-video') as HTMLVideoElement;
      const soundBtn = modalBody.querySelector('#btn-video-sound');

      if (soundBtn && videoEl) {
        soundBtn.addEventListener('click', () => {
          videoEl.muted = !videoEl.muted;
          soundBtn.textContent = videoEl.muted ? '🔇 Activar Sonido' : '🔊 Con Audio';
        });
      }

      if (videoEl) {
        if (this.config.videoAutoplay) {
          videoEl.play().catch(() => {
            // Autoplay with sound may be blocked by browser policy without user gesture
            videoEl.muted = true;
            if (soundBtn) soundBtn.textContent = '🔇 Haz clic para activar audio';
            videoEl.play();
          });
        }

        // When video ends, close spotlight and resume swimming
        videoEl.onended = () => {
          setTimeout(() => this.closeSpotlight(), 1200);
        };

        // Progress bar tracks video time
        videoEl.ontimeupdate = () => {
          if (videoEl.duration && timerBar) {
            const pct = (videoEl.currentTime / videoEl.duration) * 100;
            timerBar.style.width = `${pct}%`;
          }
        };
      }
    } else {
      // Text or Photo card: stay for config.readingTimeSeconds
      const totalSeconds = Math.max(4, this.config.readingTimeSeconds);
      if (timerBar) {
        timerBar.style.transition = 'none';
        timerBar.style.width = '0%';
        setTimeout(() => {
          timerBar.style.transition = `width ${totalSeconds}s linear`;
          timerBar.style.width = '100%';
        }, 50);
      }

      setTimeout(() => {
        if (this.isSpotlightActive && this.currentSpotlightStory?.id === story.id) {
          this.closeSpotlight();
        }
      }, totalSeconds * 1000);
    }
  }

  destroy() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    if (this.particleFrameId) cancelAnimationFrame(this.particleFrameId);
    if (this.spotlightTimer) clearTimeout(this.spotlightTimer);
  }
}
