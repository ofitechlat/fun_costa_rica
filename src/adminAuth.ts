import { storage } from './storage';

export class AdminAuth {
  static isAuthenticated(): boolean {
    return storage.isAdminLoggedIn();
  }

  static login(user: string, pass: string): Promise<boolean> {
    return storage.adminLogin(user, pass);
  }

  static logout(): void {
    storage.adminLogout();
  }

  static renderLoginModal(modalEl: HTMLElement, onSuccess: () => void) {
    modalEl.innerHTML = `
      <div class="modal-dialog auth-dialog">
        <div class="modal-header">
          <div class="modal-title-wrap">
            <span class="modal-tag">ACCESO EXCLUSIVO</span>
            <h2>PANEL DE CONTROL FuN</h2>
            <p>Acceso administrativo para moderación y configuración de la pizarra.</p>
          </div>
          <button class="btn-close-modal" id="btn-close-auth">&times;</button>
        </div>

        <form id="form-admin-login" class="auth-form">
          <div class="form-group">
            <label>Usuario</label>
            <input type="text" id="auth-username" placeholder="Usuario" required autofocus autocomplete="username" />
          </div>

          <div class="form-group">
            <label>Contraseña</label>
            <input type="password" id="auth-password" placeholder="Contraseña" required autocomplete="current-password" />
          </div>

          <div id="auth-error-msg" class="auth-error-msg hidden">
            ⚠️ Usuario o contraseña incorrectos.
          </div>

          <div class="modal-footer" style="padding: 0; margin-top: 20px;">
            <button type="submit" class="btn-primary" style="width: 100%;">
              INGRESAR AL DASHBOARD
            </button>
          </div>
        </form>
      </div>
    `;

    const closeBtn = modalEl.querySelector('#btn-close-auth');
    closeBtn?.addEventListener('click', () => modalEl.classList.remove('active'));

    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) modalEl.classList.remove('active');
    });

    const form = modalEl.querySelector('#form-admin-login') as HTMLFormElement;
    const errorMsg = modalEl.querySelector('#auth-error-msg') as HTMLElement;

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = (modalEl.querySelector('#auth-username') as HTMLInputElement).value;
      const pass = (modalEl.querySelector('#auth-password') as HTMLInputElement).value;

      if (await this.login(user, pass)) {
        modalEl.classList.remove('active');
        onSuccess();
      } else {
        errorMsg.classList.remove('hidden');
        (modalEl.querySelector('#auth-password') as HTMLInputElement).value = '';
        (modalEl.querySelector('#auth-password') as HTMLInputElement).focus();
      }
    });
  }
}
