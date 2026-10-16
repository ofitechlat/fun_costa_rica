import type { Story, MediaType } from './types';
import { storage } from './storage';
import { MediaCompressor, type CompressionProgress } from './mediaCompressor';
import { MemePickerModal } from './memePickerModal';
import confetti from 'canvas-confetti';

export class SubmissionFormModal {
  private modalEl: HTMLElement;
  private onStorySubmitted?: (story: Story) => void;
  private memePickerModal?: MemePickerModal;

  private isAnonymous = true;
  private selectedMediaType: MediaType = 'text';
  private compressedPhotoUrl: string | null = null;
  private compressedVideoUrl: string | null = null;
  private isCompressing = false;
  private mediaRecorder: MediaRecorder | null = null;
  private webcamStream: MediaStream | null = null;
  private recordedVideoChunks: Blob[] = [];

  constructor(modalEl: HTMLElement, onStorySubmitted?: (story: Story) => void, memePickerModal?: MemePickerModal) {
    this.modalEl = modalEl;
    this.onStorySubmitted = onStorySubmitted;
    this.memePickerModal = memePickerModal;
    this.init();
  }

  private init() {
    this.renderForm();
    this.attachEvents();
  }

  public open() {
    this.resetState();
    this.modalEl.classList.add('active');
    document.body.classList.add('modal-open');
  }

  public close() {
    this.stopWebcam();
    this.modalEl.classList.remove('active');
    document.body.classList.remove('modal-open');
  }

  private resetState() {
    this.isAnonymous = true;
    this.selectedMediaType = 'text';
    this.compressedPhotoUrl = null;
    this.compressedVideoUrl = null;
    this.isCompressing = false;
    this.stopWebcam();
    this.renderForm();
  }

  private stopWebcam() {
    if (this.webcamStream) {
      this.webcamStream.getTracks().forEach(track => track.stop());
      this.webcamStream = null;
    }
  }

  private renderForm() {
    this.modalEl.innerHTML = `
      <div class="modal-dialog submission-dialog">
        <div class="modal-header">
          <div class="modal-title-wrap">
            <span class="modal-tag">#ShareTheFailure</span>
            <h2>CONFIESTA TU CAGADA</h2>
            <p>Todos la hemos cagado. Compártelo con la comunidad y celebremos el aprendizaje.</p>
          </div>
          <button class="btn-close-modal" id="btn-close-submission">&times;</button>
        </div>

        <form id="submission-form" class="submission-form">
          <!-- Step 1: Identidad -->
          <div class="form-section">
            <label class="section-label">1. ¿CÓMO DESEAS PARTICIPAR?</label>
            <div class="anon-toggle-grid">
              <label class="toggle-option ${this.isAnonymous ? 'selected' : ''}" id="opt-anon">
                <input type="radio" name="anon-choice" value="anon" ${this.isAnonymous ? 'checked' : ''} />
                <div class="toggle-box">
                  <span class="toggle-icon">🕵️</span>
                  <div class="toggle-text">
                    <strong>100% Anónimo</strong>
                    <small>Nadie sabrá quién fuiste. Confesión totalmente privada.</small>
                  </div>
                </div>
              </label>

              <label class="toggle-option ${!this.isAnonymous ? 'selected' : ''}" id="opt-public">
                <input type="radio" name="anon-choice" value="public" ${!this.isAnonymous ? 'checked' : ''} />
                <div class="toggle-box">
                  <span class="toggle-icon">🔥</span>
                  <div class="toggle-text">
                    <strong>Con Mi Nombre y Redes</strong>
                    <small>Muestra tu perfil en la pantalla del evento.</small>
                  </div>
                </div>
              </label>
            </div>

            <!-- Author profile fields (hidden if anonymous) -->
            <div id="author-fields" class="author-fields ${this.isAnonymous ? 'hidden' : ''}">
              <div class="input-row">
                <div class="form-group flex-1">
                  <label>Tu Nombre o Apodo *</label>
                  <input type="text" id="input-author-name" placeholder="Ej. Carlos Brenes / El Emprendedor" />
                </div>
              </div>

              <div class="input-row socials-row">
                <div class="form-group">
                  <label><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg> LinkedIn (opcional)</label>
                  <input type="text" id="input-author-linkedin" placeholder="linkedin.com/in/tu-perfil" />
                </div>

                <div class="form-group">
                  <label><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg> Instagram (opcional)</label>
                  <input type="text" id="input-author-instagram" placeholder="@tu_usuario" />
                </div>

                <div class="form-group">
                  <label>🌐 Página Web (opcional)</label>
                  <input type="text" id="input-author-website" placeholder="tuempresa.com" />
                </div>
              </div>
            </div>
          </div>

          <!-- Step 2: La Historia -->
          <div class="form-section">
            <label class="section-label">2. ¿EN QUÉ LA CAGASTE?</label>

            <div class="form-group">
              <label>Título o Frase Resumen *</label>
              <input type="text" id="input-story-title" placeholder="Ej. Mandé a imprimir 500 camisetas con el año equivocado..." required />
            </div>

            <div class="form-group">
              <label>Categoría</label>
              <select id="input-story-category">
                <option value="Emprendimiento">Emprendimiento</option>
                <option value="Tecnología">Tecnología & Código</option>
                <option value="Marketing">Marketing & Publicidad</option>
                <option value="Finanzas">Finanzas & Dinero</option>
                <option value="Ventas B2B">Ventas B2B</option>
                <option value="Eventos & Operaciones">Eventos & Operaciones</option>
                <option value="Legal & Contratos">Legal & Contratos</option>
                <option value="Amor & Negocios">Amor & Negocios</option>
                <option value="General">General / Otro</option>
              </select>
            </div>

            <!-- Media Type Selector -->
            <div class="media-type-tabs">
              <button type="button" class="tab-btn ${this.selectedMediaType === 'text' ? 'active' : ''}" data-type="text">
                📝 Explicar en Texto
              </button>
              <button type="button" class="tab-btn ${this.selectedMediaType === 'video' ? 'active' : ''}" data-type="video">
                🎥 Video Confesión
              </button>
              <button type="button" class="tab-btn ${this.selectedMediaType === 'photo' ? 'active' : ''}" data-type="photo">
                📸 Con Foto / Meme
              </button>
            </div>

            <!-- Content for TEXT -->
            <div id="media-content-text" class="media-pane ${this.selectedMediaType === 'text' ? 'active' : ''}">
              <div class="form-group">
                <label>Explica tu cagada con detalles *</label>
                <textarea id="input-story-content" rows="4" placeholder="Cuéntanos exactamente qué pasó, cómo te diste cuenta del desastre y la reacción..."></textarea>
              </div>

              <div class="form-group">
                <label>💡 ¿Qué aprendiste de esta experiencia? (Opcional pero recomendado)</label>
                <input type="text" id="input-story-learnings" placeholder="Ej. Ahora siempre pido confirmación escrita antes de transferir..." />
              </div>

              <div class="form-group">
                <label class="optional-photo-label">📷 ¿Tienes una foto opcional que quieras adjuntar?</label>
                <input type="file" id="input-optional-photo" accept="image/*" />
                <div id="photo-preview-optional" class="preview-mini-box"></div>
              </div>
            </div>

            <!-- Content for VIDEO -->
            <div id="media-content-video" class="media-pane ${this.selectedMediaType === 'video' ? 'active' : ''}">
              <p class="video-info-hint">
                ⚡ El video se comprimirá automáticamente en tu navegador para que cargue velozmente en la pantalla gigante.
              </p>

              <div class="video-input-options">
                <label class="video-upload-dropzone" for="input-video-file">
                  <div class="dropzone-content">
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <strong>Subir archivo de video</strong>
                    <span>MP4, WebM, MOV de tu teléfono o laptop</span>
                  </div>
                  <input type="file" id="input-video-file" accept="video/*" class="file-hidden" />
                </label>

                <div class="or-separator">o</div>

                <button type="button" class="btn-webcam-record" id="btn-toggle-webcam">
                  📹 Grabar con mi cámara en vivo
                </button>
              </div>

              <!-- Webcam live recording interface -->
              <div id="webcam-box" class="webcam-box hidden">
                <video id="webcam-preview" autoplay playsinline muted></video>
                <div class="webcam-controls">
                  <button type="button" class="btn-rec-start" id="btn-rec-start">🔴 Iniciar Grabación</button>
                  <button type="button" class="btn-rec-stop hidden" id="btn-rec-stop">⏹ Detener y Comprimir</button>
                  <span id="rec-timer" class="rec-timer hidden">00:00</span>
                </div>
              </div>

              <!-- Compression Progress Bar -->
              <div id="compression-bar-wrap" class="compression-bar-wrap hidden">
                <div class="compression-status-text">
                  <span id="compression-stage">Comprimiendo video...</span>
                  <span id="compression-percent">0%</span>
                </div>
                <div class="progress-track">
                  <div class="progress-fill" id="compression-fill" style="width: 0%;"></div>
                </div>
                <div class="compression-size-stats" id="compression-stats"></div>
              </div>

              <!-- Video Result Preview -->
              <div id="video-preview-box" class="video-preview-box hidden">
                <label>Vista previa del video comprimido:</label>
                <video id="video-compressed-preview" controls playsinline></video>
                <button type="button" class="btn-remove-media" id="btn-remove-video">✕ Cambiar video</button>
              </div>

              <div class="form-group" style="margin-top: 15px;">
                <label>Descripción corta de lo que dices en el video *</label>
                <textarea id="input-video-desc" rows="2" placeholder="Resumen breve para quienes lo lean en la tarjeta flotante..."></textarea>
              </div>
            </div>

            <!-- Content for PHOTO -->
            <div id="media-content-photo" class="media-pane ${this.selectedMediaType === 'photo' ? 'active' : ''}">
              <div class="form-group">
                <label>Selecciona una imagen o meme *</label>
                <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-top: 6px;">
                  <label class="btn-tool-secondary" for="input-photo-file" style="cursor: pointer;">⬆️ Subir de mi dispositivo</label>
                  <input type="file" id="input-photo-file" accept="image/*" class="file-hidden" />
                  <button type="button" class="btn-tool-secondary" id="btn-submission-pick-meme">😂 Elegir Meme del Catálogo (328)</button>
                </div>
              </div>

              <div id="photo-main-preview" class="photo-main-preview hidden">
                <img id="photo-preview-img" src="" alt="Preview" />
              </div>

              <div class="form-group" style="margin-top: 15px;">
                <label>Cuenta la historia de esta foto *</label>
                <textarea id="input-photo-desc" rows="3" placeholder="Explica qué estamos viendo y cuál fue la cagada..."></textarea>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-secondary" id="btn-cancel-submission">Cancelar</button>
            <button type="submit" class="btn-primary btn-submit-story" id="btn-submit-story">
              🚀 CONFESAR MI CAGADA AHORA
            </button>
          </div>
        </form>
      </div>
    `;
  }

  private attachEvents() {
    const closeBtn = this.modalEl.querySelector('#btn-close-submission');
    const cancelBtn = this.modalEl.querySelector('#btn-cancel-submission');
    closeBtn?.addEventListener('click', () => this.close());
    cancelBtn?.addEventListener('click', () => this.close());

    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) this.close();
    });

    // Anonymous toggle options
    const optAnon = this.modalEl.querySelector('#opt-anon');
    const optPublic = this.modalEl.querySelector('#opt-public');
    const authorFields = this.modalEl.querySelector('#author-fields');

    optAnon?.addEventListener('click', () => {
      this.isAnonymous = true;
      optAnon.classList.add('selected');
      optPublic?.classList.remove('selected');
      authorFields?.classList.add('hidden');
    });

    optPublic?.addEventListener('click', () => {
      this.isAnonymous = false;
      optPublic.classList.add('selected');
      optAnon?.classList.remove('selected');
      authorFields?.classList.remove('hidden');
    });

    // Media type tabs
    const tabs = this.modalEl.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const type = tab.getAttribute('data-type') as MediaType;
        this.selectedMediaType = type;

        this.modalEl.querySelectorAll('.media-pane').forEach(p => p.classList.remove('active'));
        const activePane = this.modalEl.querySelector(`#media-content-${type}`);
        activePane?.classList.add('active');
      });
    });

    // Optional photo in text tab
    const inputOptionalPhoto = this.modalEl.querySelector('#input-optional-photo') as HTMLInputElement;
    inputOptionalPhoto?.addEventListener('change', async () => {
      const file = inputOptionalPhoto.files?.[0];
      if (file) {
        try {
          const res = await MediaCompressor.compressImage(file);
          this.compressedPhotoUrl = res.dataUrl;
          const previewBox = this.modalEl.querySelector('#photo-preview-optional')!;
          previewBox.innerHTML = `
            <img src="${res.dataUrl}" style="max-height: 90px; border-radius: 6px; border: 1px solid #444;" />
            <small style="color: #4cc9f0;">Imagen comprimida (${Math.round(res.sizeBytes / 1024)} KB)</small>
          `;
        } catch (err) {
          alert('Error procesando imagen: ' + (err as Error).message);
        }
      }
    });

    // Main photo tab
    const inputPhotoFile = this.modalEl.querySelector('#input-photo-file') as HTMLInputElement;
    inputPhotoFile?.addEventListener('change', async () => {
      const file = inputPhotoFile.files?.[0];
      if (file) {
        try {
          const res = await MediaCompressor.compressImage(file);
          this.compressedPhotoUrl = res.dataUrl;
          const previewWrap = this.modalEl.querySelector('#photo-main-preview')!;
          const previewImg = this.modalEl.querySelector('#photo-preview-img') as HTMLImageElement;
          previewImg.src = res.dataUrl;
          previewWrap.classList.remove('hidden');
        } catch (err) {
          alert('Error procesando foto: ' + (err as Error).message);
        }
      }
    });

    // Meme picker from catalog button
    const btnPickMeme = this.modalEl.querySelector('#btn-submission-pick-meme');
    btnPickMeme?.addEventListener('click', () => {
      this.memePickerModal?.open((meme) => {
        this.compressedPhotoUrl = `/memes/${meme.file}`;
        const previewWrap = this.modalEl.querySelector('#photo-main-preview')!;
        const previewImg = this.modalEl.querySelector('#photo-preview-img') as HTMLImageElement;
        previewImg.src = `/memes/${meme.file}`;
        previewWrap.classList.remove('hidden');

        const titleInput = this.modalEl.querySelector('#input-story-title') as HTMLInputElement;
        if (titleInput && !titleInput.value) {
          titleInput.value = meme.name;
        }
      });
    });

    // Video File Upload & Compression
    const inputVideoFile = this.modalEl.querySelector('#input-video-file') as HTMLInputElement;
    inputVideoFile?.addEventListener('change', async () => {
      const file = inputVideoFile.files?.[0];
      if (file) {
        await this.processVideoFile(file);
      }
    });

    // Webcam Recorder
    const btnToggleWebcam = this.modalEl.querySelector('#btn-toggle-webcam');
    btnToggleWebcam?.addEventListener('click', () => this.toggleWebcamRecorder());

    // Remove video preview
    const btnRemoveVideo = this.modalEl.querySelector('#btn-remove-video');
    btnRemoveVideo?.addEventListener('click', () => {
      this.compressedVideoUrl = null;
      this.modalEl.querySelector('#video-preview-box')?.classList.add('hidden');
    });

    // Form Submit
    const form = this.modalEl.querySelector('#submission-form') as HTMLFormElement;
    form?.addEventListener('submit', (e) => this.handleFormSubmit(e));
  }

  private async processVideoFile(file: File) {
    const compWrap = this.modalEl.querySelector('#compression-bar-wrap')!;
    const compFill = this.modalEl.querySelector('#compression-fill') as HTMLElement;
    const compStage = this.modalEl.querySelector('#compression-stage')!;
    const compPct = this.modalEl.querySelector('#compression-percent')!;
    const compStats = this.modalEl.querySelector('#compression-stats')!;
    const submitBtn = this.modalEl.querySelector('#btn-submit-story') as HTMLButtonElement;

    compWrap.classList.remove('hidden');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Comprimiendo video...';

    try {
      this.isCompressing = true;
      const res = await MediaCompressor.compressVideo(file, (p: CompressionProgress) => {
        compFill.style.width = `${p.percent}%`;
        compPct.textContent = `${p.percent}%`;
        compStage.textContent = p.stage;
      });

      this.compressedVideoUrl = res.dataUrl;
      compStats.innerHTML = `
        <span style="color: #4cc9f0;">Original: ${res.originalSizeMB} MB</span> ➔ 
        <span style="color: #ff006e; font-weight: bold;">Comprimido para Web: ${res.compressedSizeMB} MB</span>
      `;

      // Show video preview
      const previewBox = this.modalEl.querySelector('#video-preview-box')!;
      const previewVideo = this.modalEl.querySelector('#video-compressed-preview') as HTMLVideoElement;
      previewVideo.src = res.dataUrl;
      previewBox.classList.remove('hidden');

    } catch (err) {
      console.error(err);
      alert('Hubo un error al comprimir el video: ' + (err as Error).message);
    } finally {
      this.isCompressing = false;
      submitBtn.disabled = false;
      submitBtn.textContent = '🚀 CONFESAR MI CAGADA AHORA';
    }
  }

  private async toggleWebcamRecorder() {
    const webcamBox = this.modalEl.querySelector('#webcam-box')!;
    const videoPreview = this.modalEl.querySelector('#webcam-preview') as HTMLVideoElement;
    const btnStart = this.modalEl.querySelector('#btn-rec-start') as HTMLButtonElement;
    const btnStop = this.modalEl.querySelector('#btn-rec-stop') as HTMLButtonElement;
    const timerSpan = this.modalEl.querySelector('#rec-timer') as HTMLElement;

    if (this.webcamStream) {
      this.stopWebcam();
      webcamBox.classList.add('hidden');
      return;
    }

    try {
      this.webcamStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      videoPreview.srcObject = this.webcamStream;
      webcamBox.classList.remove('hidden');

      let timerInterval: any = null;
      let seconds = 0;

      btnStart.onclick = () => {
        this.recordedVideoChunks = [];
        this.mediaRecorder = new MediaRecorder(this.webcamStream!);

        this.mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) this.recordedVideoChunks.push(e.data);
        };

        this.mediaRecorder.onstop = async () => {
          clearInterval(timerInterval);
          const recordedBlob = new Blob(this.recordedVideoChunks, { type: 'video/webm' });
          const file = new File([recordedBlob], 'webcam-recording.webm', { type: 'video/webm' });
          this.stopWebcam();
          webcamBox.classList.add('hidden');
          await this.processVideoFile(file);
        };

        this.mediaRecorder.start();
        btnStart.classList.add('hidden');
        btnStop.classList.remove('hidden');
        timerSpan.classList.remove('hidden');

        seconds = 0;
        timerInterval = setInterval(() => {
          seconds++;
          const m = String(Math.floor(seconds / 60)).padStart(2, '0');
          const s = String(seconds % 60).padStart(2, '0');
          timerSpan.textContent = `🔴 Grabando: ${m}:${s}`;
        }, 1000);
      };

      btnStop.onclick = () => {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
          this.mediaRecorder.stop();
        }
      };

    } catch (err) {
      alert('No se pudo acceder a la cámara o micrófono: ' + (err as Error).message);
    }
  }

  private async handleFormSubmit(e: Event) {
    e.preventDefault();

    if (this.isCompressing) {
      alert('Por favor espera a que termine la compresión del video.');
      return;
    }

    const titleInput = this.modalEl.querySelector('#input-story-title') as HTMLInputElement;
    const categorySelect = this.modalEl.querySelector('#input-story-category') as HTMLSelectElement;

    const title = titleInput.value.trim();
    if (!title) {
      alert('Por favor escribe un título o frase para tu cagada.');
      titleInput.focus();
      return;
    }

    // Author info
    let authorName = '';
    let authorLinkedin = '';
    let authorInstagram = '';
    let authorWebsite = '';

    if (!this.isAnonymous) {
      const nameInput = this.modalEl.querySelector('#input-author-name') as HTMLInputElement;
      authorName = nameInput.value.trim() || 'Emprendedor Anónimo';
      authorLinkedin = (this.modalEl.querySelector('#input-author-linkedin') as HTMLInputElement)?.value.trim();
      authorInstagram = (this.modalEl.querySelector('#input-author-instagram') as HTMLInputElement)?.value.trim();
      authorWebsite = (this.modalEl.querySelector('#input-author-website') as HTMLInputElement)?.value.trim();
    }

    // Story content based on type
    let content = '';
    let learnings = '';

    if (this.selectedMediaType === 'text') {
      content = (this.modalEl.querySelector('#input-story-content') as HTMLTextAreaElement)?.value.trim();
      learnings = (this.modalEl.querySelector('#input-story-learnings') as HTMLInputElement)?.value.trim();
      if (!content) {
        alert('Por favor escribe la explicación de tu cagada.');
        return;
      }
    } else if (this.selectedMediaType === 'video') {
      content = (this.modalEl.querySelector('#input-video-desc') as HTMLTextAreaElement)?.value.trim() || 'Confesión en Video';
      if (!this.compressedVideoUrl) {
        alert('Por favor sube o graba un video antes de enviar.');
        return;
      }
    } else if (this.selectedMediaType === 'photo') {
      content = (this.modalEl.querySelector('#input-photo-desc') as HTMLTextAreaElement)?.value.trim();
      if (!this.compressedPhotoUrl) {
        alert('Por favor sube una imagen.');
        return;
      }
      if (!content) {
        alert('Por favor describe la historia detrás de tu foto.');
        return;
      }
    }

    const config = storage.getConfig();
    const newStory: Story = {
      id: 'story-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      createdAt: Date.now(),
      title,
      category: categorySelect.value || 'General',
      author: {
        isAnonymous: this.isAnonymous,
        name: this.isAnonymous ? undefined : authorName,
        linkedin: this.isAnonymous ? undefined : authorLinkedin,
        instagram: this.isAnonymous ? undefined : authorInstagram,
        website: this.isAnonymous ? undefined : authorWebsite
      },
      mediaType: this.selectedMediaType,
      content,
      learnings: learnings || undefined,
      photoUrl: this.compressedPhotoUrl || undefined,
      videoUrl: this.compressedVideoUrl || undefined,
      status: config.autoApprove ? 'approved' : 'pending',
      likes: 1
    };

    const submitBtn = this.modalEl.querySelector('#btn-submit-story') as HTMLButtonElement;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';

    try {
      await storage.saveStory(newStory);

      // Trigger party confetti!
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ff006e', '#4cc9f0', '#ffffff', '#ffbe0b']
      });

      this.close();

      if (this.onStorySubmitted) {
        this.onStorySubmitted(newStory);
      }

      alert(config.autoApprove
        ? '🎉 ¡Tu cagada ha sido recibida con éxito y ya está nadando en la pizarra del evento!'
        : '🎉 ¡Tu cagada ha sido recibida con éxito! Estará visible en cuanto el moderador la apruebe.'
      );

    } catch (err) {
      alert('Error guardando la historia: ' + (err as Error).message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '🚀 CONFESAR MI CAGADA AHORA';
    }
  }
}
