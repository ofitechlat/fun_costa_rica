// @ts-ignore
import * as THREE from 'three';
import type { AuthorInfo } from './types';

interface SignItem {
  iconType: 'avatar' | 'instagram' | 'linkedin' | 'website' | 'anon';
  label: string;
  sublabel?: string;
  color: string;
  bgColor: string;
  url?: string;
}

export class StreetSign3D {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private renderer: any = null;
  private scene: any = null;
  private camera: any = null;
  private poleGroup: any = null;
  private signMeshes: any[] = [];
  private signPivots: any[] = [];
  private baseAngles: number[] = [];
  private animationId: number | null = null;
  private clock: any = new (THREE as any).Clock();
  private resizeObserver: ResizeObserver | null = null;
  private isDestroyed = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.mountCanvas();
  }

  /** Garantiza UN solo canvas dentro del contenedor (evita señales duplicadas). */
  private mountCanvas() {
    this.container.querySelectorAll('canvas.street-signs-3d-canvas').forEach(c => c.remove());
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'street-signs-3d-canvas';
    this.container.appendChild(this.canvas);
  }

  /** Encuadra cámara según el aspecto: el poste + placas (x ≈ -0.7 … 1.95) siempre caben completos. */
  private frameCamera(width: number, height: number) {
    if (!this.camera) return;
    const aspect = width / height;
    const tan = Math.tan((this.camera.fov * Math.PI / 180) / 2);
    const neededH = 4.5;  // alto del poste + margen
    const neededW = 3.15; // ancho poste + placas + giro
    const dist = Math.max(neededH / (2 * tan), neededW / (aspect * 2 * tan));
    const cx = 0.62;      // centro horizontal del conjunto
    this.camera.aspect = aspect;
    this.camera.position.set(cx, 0.05, dist);
    this.camera.lookAt(cx, 0, 0);
    this.camera.updateProjectionMatrix();
  }

  public render(author: AuthorInfo) {
    this.destroy();
    this.mountCanvas();
    this.isDestroyed = false;

    const items: SignItem[] = [];

    if (author.isAnonymous) {
      items.push({
        iconType: 'anon',
        label: 'CONFESIÓN 100% ANÓNIMA',
        sublabel: 'VALIENTE DE LA NOCHE',
        color: '#ffbe0b',
        bgColor: '#b48608'
      });
      items.push({
        iconType: 'avatar',
        label: '#ShareTheFailure',
        sublabel: 'FUCKUP NIGHTS SJ',
        color: '#ffffff',
        bgColor: '#ff006e'
      });
    } else {
      items.push({
        iconType: 'avatar',
        label: (author.name || 'EMPRENDEDOR/A').toUpperCase(),
        sublabel: 'VALIENTE DE LA NOCHE',
        color: '#ffffff',
        bgColor: '#ff006e'
      });

      if (author.instagram) {
        const clean = author.instagram.startsWith('@') ? author.instagram : `@${author.instagram}`;
        items.push({
          iconType: 'instagram',
          label: clean,
          sublabel: 'INSTAGRAM',
          color: '#ffffff',
          bgColor: '#c13584',
          url: `https://instagram.com/${clean.replace('@', '')}`
        });
      }

      if (author.linkedin) {
        const clean = author.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/(in\/)?/, '');
        items.push({
          iconType: 'linkedin',
          label: `in/${clean.replace(/\/$/, '')}`,
          sublabel: 'LINKEDIN',
          color: '#ffffff',
          bgColor: '#0077b5',
          url: author.linkedin.startsWith('http') ? author.linkedin : `https://${author.linkedin}`
        });
      }

      if (author.website) {
        const clean = author.website.replace(/^https?:\/\//, '').replace(/\/$/, '');
        items.push({
          iconType: 'website',
          label: clean,
          sublabel: 'SITIO WEB',
          color: '#ffffff',
          bgColor: '#00b4d8',
          url: author.website.startsWith('http') ? author.website : `https://${author.website}`
        });
      }
    }

    // Always ensure at least 2 signs for a balanced street sign look
    if (items.length < 2) {
      items.push({
        iconType: 'avatar',
        label: '#ShareTheFailure',
        sublabel: 'SAN JOSÉ, CR',
        color: '#ffffff',
        bgColor: '#4cc9f0'
      });
    }

    const finalItems = items.slice(0, 4);
    this.initThree(finalItems);
  }

  private initThree(items: SignItem[]) {
    // Dynamic sizing matching container
    const width = this.container.clientWidth || 400;
    const height = this.container.clientHeight || 650;

    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    this.frameCamera(width, height);

    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance'
      });
      this.renderer.setSize(width, height, false);
      this.renderer.setPixelRatio(dpr);
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.35;
    } catch (e) {
      console.warn('WebGL not available for 3D street sign:', e);
      return;
    }

    // High quality lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    this.scene.add(ambientLight);

    // Warm Key Light from top-left
    const keyLight = new THREE.DirectionalLight(0xfff6ea, 2.4);
    keyLight.position.set(4, 7, 6);
    this.scene.add(keyLight);

    // Signature FuN Neon Magenta Rim Light
    const magentaRim = new THREE.PointLight(0xff006e, 4.0, 12);
    magentaRim.position.set(-3.5, 0.5, 3.0);
    this.scene.add(magentaRim);

    // Electric Cyan Accent Light
    const cyanRim = new THREE.PointLight(0x4cc9f0, 3.2, 10);
    cyanRim.position.set(3.5, -1.5, 2.5);
    this.scene.add(cyanRim);

    // Main Assembly Group
    this.poleGroup = new THREE.Group();
    // Position pole slightly to the left so protruding plates expand towards center
    this.poleGroup.position.set(-0.65, 0, 0);
    this.scene.add(this.poleGroup);

    // Metallic Street Pole
    const poleHeight = 3.7;
    const poleRadius = 0.052;
    const poleGeo = new THREE.CylinderGeometry(poleRadius, poleRadius, poleHeight, 32);
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x3a3d4a,
      metalness: 0.92,
      roughness: 0.18
    });
    const poleMesh = new THREE.Mesh(poleGeo, poleMat);
    poleMesh.position.set(0, 0, 0);
    this.poleGroup.add(poleMesh);

    // (Sin pedestal oscuro: se elimina el bloque negro de la base)

    // Decorative Glowing Finial Sphere at top of pole
    const finialGeo = new THREE.SphereGeometry(0.12, 32, 32);
    const finialMat = new THREE.MeshStandardMaterial({
      color: 0xff006e,
      metalness: 0.85,
      roughness: 0.15,
      emissive: 0x99003f
    });
    const finialMesh = new THREE.Mesh(finialGeo, finialMat);
    finialMesh.position.set(0, poleHeight / 2 + 0.06, 0);
    this.poleGroup.add(finialMesh);

    // Generate sign plates
    this.signMeshes = [];
    this.signPivots = [];
    this.baseAngles = [];

    const spacing = 0.52;
    const startY = (items.length - 1) * spacing * 0.5 + 0.2;

    items.forEach((item, index) => {
      const yPos = startY - index * spacing;
      // Alternate sign angles slightly for realistic intersection / street-corner depth
      const isEven = index % 2 === 0;
      const baseAngle = isEven ? 0.14 : -0.09;
      this.baseAngles.push(baseAngle);

      // Heavy mounting clamp collar on pole
      const clampGeo = new THREE.CylinderGeometry(0.078, 0.078, 0.08, 24);
      const clampMat = new THREE.MeshStandardMaterial({ color: 0x161720, metalness: 0.95, roughness: 0.15 });
      const clampMesh = new THREE.Mesh(clampGeo, clampMat);
      clampMesh.position.set(0, yPos, 0);
      this.poleGroup.add(clampMesh);

      // Horizontal bracket arm connecting clamp to plate
      const armGeo = new THREE.BoxGeometry(0.35, 0.04, 0.04);
      const armMat = new THREE.MeshStandardMaterial({ color: 0x22242e, metalness: 0.9, roughness: 0.2 });
      const armMesh = new THREE.Mesh(armGeo, armMat);
      armMesh.position.set(0.16, yPos, 0);
      this.poleGroup.add(armMesh);

      // Plate geometry (Wide road avenue sign plate)
      const plateWidth = 2.42;
      const plateHeight = 0.44;
      const plateDepth = 0.038;
      const plateGeo = new THREE.BoxGeometry(plateWidth, plateHeight, plateDepth);

      // 2K Ultra High-Resolution Canvas Texture
      const texture = this.createSignTexture(item);
      const frontMat = new THREE.MeshStandardMaterial({
        map: texture,
        metalness: 0.25,
        roughness: 0.35
      });
      const backMat = new THREE.MeshStandardMaterial({
        color: 0x12131c,
        metalness: 0.85,
        roughness: 0.25
      });
      const sideMat = new THREE.MeshStandardMaterial({
        color: 0x242635,
        metalness: 0.9,
        roughness: 0.2
      });

      // Box materials: +X, -X, +Y, -Y, +Z (front), -Z (back)
      const materials = [sideMat, sideMat, sideMat, sideMat, frontMat, backMat];
      const signMesh = new THREE.Mesh(plateGeo, materials);

      // Pivot sign from the pole
      const signPivot = new THREE.Group();
      signPivot.position.set(0, yPos, 0);
      signMesh.position.set(plateWidth / 2 + 0.08, 0, 0); // Offset to extend outward
      signPivot.rotation.y = baseAngle;
      signPivot.add(signMesh);

      this.poleGroup.add(signPivot);
      this.signPivots.push(signPivot);
      this.signMeshes.push(signMesh);
    });

    // Resize observer to keep canvas sharp and responsive
    this.setupResize();

    // Start 3D animation loop
    this.clock.start();
    this.animate();
  }

  private setupResize() {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        if (!this.container || !this.renderer || !this.camera) return;
        const w = this.container.clientWidth || 400;
        const h = this.container.clientHeight || 650;
        this.frameCamera(w, h);
        this.renderer.setSize(w, h, false);
      });
      this.resizeObserver.observe(this.container);
    }
  }

  /** Genera una textura de ultra alta resolución (2K) para la placa vial 3D */
  private createSignTexture(item: SignItem): any {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 380;
    const ctx = canvas.getContext('2d')!;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Fondo oscuro reflectivo con gradiente sutil
    const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGrad.addColorStop(0, '#151724');
    bgGrad.addColorStop(0.5, '#0e0f17');
    bgGrad.addColorStop(1, '#07080d');
    ctx.fillStyle = bgGrad;

    const r = 24;
    ctx.beginPath();
    ctx.roundRect(0, 0, canvas.width, canvas.height, r);
    ctx.fill();

    // Borde exterior reflectivo neón con el color del canal / red social
    ctx.strokeStyle = item.bgColor || '#ff006e';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.roundRect(10, 10, canvas.width - 20, canvas.height - 20, r - 4);
    ctx.stroke();

    // Línea interior blanca reflectiva (estilo señalización vial moderna)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(24, 24, canvas.width - 48, canvas.height - 48, r - 8);
    ctx.stroke();

    // Remaches metálicos en las 4 esquinas
    const drawRivet = (x: number, y: number) => {
      // Sombra
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath();
      ctx.arc(x + 2, y + 2, 13, 0, Math.PI * 2);
      ctx.fill();
      // Metal base
      ctx.fillStyle = '#b0b5c5';
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fill();
      // Brillo specular
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x - 3, y - 3, 5, 0, Math.PI * 2);
      ctx.fill();
      // Ranura de tornillo
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - 6, y - 6);
      ctx.lineTo(x + 6, y + 6);
      ctx.stroke();
    };

    drawRivet(54, 54);
    drawRivet(54, canvas.height - 54);
    drawRivet(canvas.width - 54, 54);
    drawRivet(canvas.width - 54, canvas.height - 54);

    // Placa / Badge lateral para el icono
    const badgeW = 220;
    const badgeX = 44;
    const badgeY = 40;
    const badgeH = canvas.height - 80;

    const badgeGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeW, badgeY + badgeH);
    if (item.iconType === 'instagram') {
      badgeGrad.addColorStop(0, '#833ab4');
      badgeGrad.addColorStop(0.5, '#fd1d1d');
      badgeGrad.addColorStop(1, '#fcb045');
    } else if (item.iconType === 'linkedin') {
      badgeGrad.addColorStop(0, '#0077b5');
      badgeGrad.addColorStop(1, '#005582');
    } else if (item.iconType === 'website') {
      badgeGrad.addColorStop(0, '#00b4d8');
      badgeGrad.addColorStop(1, '#0077b6');
    } else if (item.iconType === 'anon') {
      badgeGrad.addColorStop(0, '#ffbe0b');
      badgeGrad.addColorStop(1, '#d48b00');
    } else {
      badgeGrad.addColorStop(0, '#ff006e');
      badgeGrad.addColorStop(1, '#cc0058');
    }

    ctx.fillStyle = badgeGrad;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 18);
    ctx.fill();

    // Borde brillante en el badge de icono
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(badgeX + 2, badgeY + 2, badgeW - 4, badgeH - 4, 16);
    ctx.stroke();

    // Icono Emoji / Símbolo centrado en el badge
    ctx.font = 'bold 140px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let iconSymbol = '📍';
    if (item.iconType === 'instagram') iconSymbol = '📸';
    else if (item.iconType === 'linkedin') iconSymbol = '💼';
    else if (item.iconType === 'website') iconSymbol = '🌐';
    else if (item.iconType === 'avatar') iconSymbol = '🔥';
    else if (item.iconType === 'anon') iconSymbol = '🕵️';

    ctx.fillText(iconSymbol, badgeX + badgeW / 2, badgeY + badgeH / 2 + 6);

    // Textos informativos estilo callejero de Costa Rica
    const textStartX = badgeX + badgeW + 48;

    // Sublabel (Tipo / Avenida)
    if (item.sublabel) {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.font = '800 58px "Outfit", "Inter", sans-serif';
      ctx.fillStyle = item.color || '#ff006e';
      ctx.fillText(item.sublabel.toUpperCase(), textStartX, 112);
    }

    // Texto principal (Nombre, Handle, URL) - más grande, se ajusta al ancho disponible
    let displayText = item.label;
    if (displayText.length > 28) displayText = displayText.substring(0, 26) + '...';
    const maxTextW = canvas.width - 150 - textStartX - 60;
    let fontPx = 118;
    ctx.font = `900 ${fontPx}px "Outfit", "Inter", sans-serif`;
    while (ctx.measureText(displayText).width > maxTextW && fontPx > 56) {
      fontPx -= 4;
      ctx.font = `900 ${fontPx}px "Outfit", "Inter", sans-serif`;
    }
    ctx.fillStyle = '#ffffff';

    // Sombra de texto para máxima legibilidad
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 4;
    ctx.fillText(displayText, textStartX, 270);
    ctx.shadowColor = 'transparent';

    // Flecha / Chevron reflectivo de dirección a la derecha
    const arrowX = canvas.width - 120;
    const arrowY = canvas.height / 2;
    ctx.fillStyle = item.bgColor || '#ff006e';
    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY - 56);
    ctx.lineTo(arrowX + 48, arrowY);
    ctx.lineTo(arrowX, arrowY + 56);
    ctx.lineTo(arrowX - 22, arrowY + 36);
    ctx.lineTo(arrowX + 16, arrowY);
    ctx.lineTo(arrowX - 22, arrowY - 36);
    ctx.closePath();
    ctx.fill();

    // Crear textura Three.js con filtrado óptimo
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    if (this.renderer?.capabilities?.getMaxAnisotropy) {
      texture.anisotropy = Math.min(16, this.renderer.capabilities.getMaxAnisotropy());
    }

    return texture;
  }

  private animate = () => {
    if (this.isDestroyed || !this.renderer || !this.scene || !this.camera) return;

    this.animationId = requestAnimationFrame(this.animate);

    const elapsed = this.clock.getElapsedTime();

    // Rotación suave y cinematográfica del poste con la brisa nocturna
    if (this.poleGroup) {
      this.poleGroup.rotation.y = Math.sin(elapsed * 0.75) * 0.12 - 0.10;
      this.poleGroup.rotation.x = Math.sin(elapsed * 0.5) * 0.025 + 0.015;
      this.poleGroup.position.y = Math.sin(elapsed * 1.0) * 0.02;

      // Movimiento individual sutil para cada placa
      this.signPivots.forEach((pivot, i) => {
        const base = this.baseAngles[i] || 0;
        pivot.rotation.y = base + Math.sin(elapsed * 1.3 + i * 0.5) * 0.025;
      });
    }

    this.renderer.render(this.scene, this.camera);
  };

  public destroy() {
    this.isDestroyed = true;
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    this.scene = null;
    this.camera = null;
    this.poleGroup = null;
    this.signMeshes = [];
    this.signPivots = [];
    this.baseAngles = [];
  }
}
