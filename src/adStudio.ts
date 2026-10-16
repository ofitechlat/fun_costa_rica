// @ts-ignore
import domtoimage from 'dom-to-image-more';

export class AdStudio {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public render() {
    this.container.innerHTML = `
      <div class="ad-studio-wrapper">
        <aside class="editor-sidebar">
          <div class="sidebar-header">
            <img src="/logo.svg" alt="FuN Logo" class="sidebar-logo" />
            <h1>AD STUDIO</h1>
          </div>

          <div class="control-group">
            <label>Color Principal</label>
            <input type="color" id="input-color-primary" value="#ff006e">
          </div>

          <div class="control-group">
            <label>Badge de Encabezado</label>
            <input type="text" id="input-badge" value="ESTAMOS BUSCANDO">
          </div>

          <div class="control-group">
            <label>Título (Línea 1)</label>
            <input type="text" id="input-title-1" value="GESTOR/A DE">
          </div>

          <div class="control-group">
            <label>Título Resaltado</label>
            <input type="text" id="input-title-highlight" value="PATROCINIOS">
          </div>

          <div class="control-group">
            <label>Título (Línea 2)</label>
            <input type="text" id="input-title-2" value="& ALIANZAS">
          </div>

          <div class="control-group">
            <label>Manifiesto</label>
            <textarea id="input-manifesto">"No buscamos a alguien que venda logos; buscamos a alguien que conecte marcas con una conversación incómodamente necesaria."</textarea>
          </div>

          <div class="control-group">
            <label>Roles / Puntos Clave (separados por coma)</label>
            <input type="text" id="input-roles" value="Patrocinios Económicos, Alianzas Estratégicas, Gestión de Sedes">
          </div>

          <div class="control-group">
            <label>Ubicación</label>
            <input type="text" id="input-location" value="SAN JOSÉ, CR">
          </div>

          <div class="control-group">
            <label>Hashtag</label>
            <input type="text" id="input-hashtag" value="#ShareTheFailure">
          </div>

          <div class="control-group">
            <label>Sitio Web</label>
            <input type="text" id="input-website" value="fuckupnights.com/city/san_jose">
          </div>

          <div class="control-group">
            <label>Texto CTA</label>
            <input type="text" id="input-cta" value="¿Te atreves a celebrar el fracaso?">
          </div>

          <div class="control-group">
            <label>Info de Contacto</label>
            <input type="text" id="input-contact" value="Envía tu propuesta o contáctanos">
          </div>

          <div class="control-group">
            <label>Imagen Personalizada (Opcional)</label>
            <input type="file" id="input-image" accept="image/*">
          </div>

          <div class="sidebar-footer">
            <button id="btn-download" class="btn-primary">DESCARGAR PNG</button>
            <p>La descarga generará una imagen de alta resolución (1080x1350).</p>
          </div>
        </aside>

        <!-- Preview Area -->
        <section class="preview-area">
          <div class="ad-viewport">
            <div class="ad-container" id="ad-capture-area">
              <!-- Background Elements -->
              <div class="bg-blur bg-blur-1"></div>
              <div class="bg-blur bg-blur-2"></div>

              <header class="ad-header">
                <img src="/logo.svg" alt="Fuckup Nights Logo" class="logo" />
                <div class="location-tag" id="display-location">SAN JOSÉ, CR</div>
              </header>

              <div class="ad-image-container" id="ad-image-wrapper" style="display: none;">
                <img id="display-image" src="" alt="Custom Image">
              </div>

              <main class="ad-main">
                <div class="hiring-badge" id="display-badge">ESTAMOS BUSCANDO</div>

                <h1 class="title">
                  <span id="display-title-1">GESTOR/A DE</span> <br />
                  <span class="highlight" id="display-title-highlight">PATROCINIOS</span> <br />
                  <span id="display-title-2">& ALIANZAS</span>
                </h1>

                <div class="manifesto" id="display-manifesto">
                  "No buscamos a alguien que venda logos; buscamos a alguien que conecte marcas con una <span class="white">conversación incómodamente necesaria.</span>"
                </div>

                <div class="roles" id="display-roles">
                  <!-- Roles injected here -->
                </div>
              </main>

              <footer class="ad-footer">
                <div class="cta-section">
                  <div class="cta-text" id="display-cta">¿Te atreves a celebrar el fracaso?</div>
                  <div class="contact-info" id="display-contact">Envía tu propuesta o contáctanos</div>
                </div>
                <div class="footer-bottom">
                  <span class="hashtag" id="display-hashtag">#ShareTheFailure</span>
                  <span class="web" id="display-website">fuckupnights.com/city/san_jose</span>
                </div>
              </footer>
            </div>
          </div>
        </section>
      </div>
    `;

    this.initLogic();
  }

  private initLogic() {
    const inputColorPrimary = this.container.querySelector('#input-color-primary') as HTMLInputElement;
    const inputBadge = this.container.querySelector('#input-badge') as HTMLInputElement;
    const inputTitle1 = this.container.querySelector('#input-title-1') as HTMLInputElement;
    const inputTitleHighlight = this.container.querySelector('#input-title-highlight') as HTMLInputElement;
    const inputTitle2 = this.container.querySelector('#input-title-2') as HTMLInputElement;
    const inputManifesto = this.container.querySelector('#input-manifesto') as HTMLTextAreaElement;
    const inputRoles = this.container.querySelector('#input-roles') as HTMLInputElement;
    const inputLocation = this.container.querySelector('#input-location') as HTMLInputElement;
    const inputHashtag = this.container.querySelector('#input-hashtag') as HTMLInputElement;
    const inputWebsite = this.container.querySelector('#input-website') as HTMLInputElement;
    const inputCta = this.container.querySelector('#input-cta') as HTMLInputElement;
    const inputContact = this.container.querySelector('#input-contact') as HTMLInputElement;
    const inputImage = this.container.querySelector('#input-image') as HTMLInputElement;

    const displayBadge = this.container.querySelector('#display-badge');
    const displayTitle1 = this.container.querySelector('#display-title-1');
    const displayTitleHighlight = this.container.querySelector('#display-title-highlight');
    const displayTitle2 = this.container.querySelector('#display-title-2');
    const displayManifesto = this.container.querySelector('#display-manifesto');
    const displayRoles = this.container.querySelector('#display-roles');
    const displayHashtag = this.container.querySelector('#display-hashtag');
    const displayWebsite = this.container.querySelector('#display-website');
    const displayLocation = this.container.querySelector('#display-location');
    const displayCta = this.container.querySelector('#display-cta');
    const displayContact = this.container.querySelector('#display-contact');
    const displayImage = this.container.querySelector('#display-image') as HTMLImageElement;
    const adImageWrapper = this.container.querySelector('#ad-image-wrapper') as HTMLElement;

    const btnDownload = this.container.querySelector('#btn-download') as HTMLButtonElement;
    const adCaptureArea = this.container.querySelector('#ad-capture-area') as HTMLElement;

    const updateContent = () => {
      if (displayBadge) displayBadge.textContent = inputBadge.value;
      if (displayTitle1) displayTitle1.textContent = inputTitle1.value;
      if (displayTitleHighlight) displayTitleHighlight.textContent = inputTitleHighlight.value;
      if (displayTitle2) displayTitle2.textContent = inputTitle2.value;
      if (displayManifesto) displayManifesto.textContent = inputManifesto.value;
      if (displayLocation) displayLocation.textContent = inputLocation.value;
      if (displayHashtag) displayHashtag.textContent = inputHashtag.value;
      if (displayWebsite) displayWebsite.textContent = inputWebsite.value;
      if (displayCta) displayCta.textContent = inputCta.value;
      if (displayContact) displayContact.textContent = inputContact.value;

      if (displayRoles) {
        const roles = inputRoles.value.split(',').map(r => r.trim()).filter(r => r !== '');
        displayRoles.innerHTML = roles.map(role => `
          <div class="role-item">
            <span class="dot"></span>
            ${role}
          </div>
        `).join('');
      }
    };

    const updateColors = () => {
      document.documentElement.style.setProperty('--primary', inputColorPrimary.value);
    };

    const downloadImage = async () => {
      if (!adCaptureArea) return;
      btnDownload.textContent = 'GENERANDO...';
      btnDownload.disabled = true;

      try {
        await document.fonts.ready;
        await new Promise(resolve => setTimeout(resolve, 500));

        const scale = 2;
        const dataUrl = await domtoimage.toPng(adCaptureArea, {
          width: adCaptureArea.offsetWidth * scale,
          height: adCaptureArea.offsetHeight * scale,
          style: {
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            width: `${adCaptureArea.offsetWidth}px`,
            height: `${adCaptureArea.offsetHeight}px`,
          },
          copyStyles: true
        });

        const link = document.createElement('a');
        link.download = `fun-ad-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      } catch (error) {
        console.error('Error generating image:', error);
        alert('Hubo un error al generar la imagen.');
      } finally {
        btnDownload.textContent = 'DESCARGAR PNG';
        btnDownload.disabled = false;
      }
    };

    [inputBadge, inputTitle1, inputTitleHighlight, inputTitle2, inputManifesto, inputRoles, inputLocation, inputHashtag, inputWebsite, inputCta, inputContact].forEach(input => {
      input?.addEventListener('input', updateContent);
    });

    inputColorPrimary?.addEventListener('input', updateColors);
    btnDownload?.addEventListener('click', downloadImage);

    inputImage?.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && displayImage && adImageWrapper) {
        const reader = new FileReader();
        reader.onload = (event) => {
          displayImage.src = event.target?.result as string;
          adImageWrapper.style.display = 'block';
        };
        reader.readAsDataURL(file);
      }
    });

    updateContent();
  }
}
