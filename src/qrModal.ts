import QRCode from 'qrcode';

export class QrModal {
  private modalEl: HTMLElement;

  constructor(modalEl: HTMLElement) {
    this.modalEl = modalEl;
    this.render();
  }

  private render() {
    this.modalEl.innerHTML = `
      <div class="modal-dialog qr-dialog">
        <div class="modal-header">
          <div class="modal-title-wrap">
            <span class="modal-tag">ESCANEA DESDE TU MÓVIL</span>
            <h2>CONFIESTA TU CAGADA EN VIVO</h2>
            <p>Apunta la cámara de tu celular a este código QR para enviar tu historia o video anónimo.</p>
          </div>
          <button class="btn-close-modal" id="btn-close-qr">&times;</button>
        </div>

        <div class="qr-body">
          <div class="qr-canvas-card">
            <canvas id="qr-code-canvas"></canvas>
            <div class="qr-url-hint">fuckupnights.com/sanjose/confesar</div>
          </div>
          <p class="qr-footer-desc">
            📱 Tu confesión se comprimirá automáticamente en tu teléfono y aparecerá nadando en la pantalla gigante del evento.
          </p>
        </div>
      </div>
    `;

    const closeBtn = this.modalEl.querySelector('#btn-close-qr');
    closeBtn?.addEventListener('click', () => this.close());

    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) this.close();
    });
  }

  public open() {
    this.modalEl.classList.add('active');
    const canvas = this.modalEl.querySelector('#qr-code-canvas') as HTMLCanvasElement;
    if (canvas) {
      // Current URL or submit hash
      const currentUrl = window.location.href.split('#')[0] + '#confesar';
      QRCode.toCanvas(canvas, currentUrl, {
        width: 260,
        margin: 2,
        color: {
          dark: '#070709',
          light: '#ffffff'
        }
      }).catch(err => console.error('Error generating QR:', err));
    }
  }

  public close() {
    this.modalEl.classList.remove('active');
  }
}
