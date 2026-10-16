/**
 * Media compression utilities for Web Browser
 * - Client-side video transcoding & compression using HTML5 Canvas & MediaRecorder
 * - Client-side image compression & optimization using Canvas & WebP/JPEG
 */

export interface CompressionProgress {
  percent: number;
  stage: string;
  originalSizeMB: number;
  compressedSizeMB?: number;
}

export class MediaCompressor {
  /**
   * Compresses an image file using an offscreen canvas.
   * Max dimension 1280px, quality 0.82, output as Data URL (WebP/JPEG).
   */
  static async compressImage(file: File, maxWidth = 1280, maxHeight = 1280, quality = 0.82): Promise<{ dataUrl: string; sizeBytes: number; originalSize: number }> {
    return new Promise((resolve, reject) => {
      const originalSize = file.size;
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Canvas 2D context unavailable'));

          ctx.drawImage(img, 0, 0, width, height);

          // Test WebP support, fallback to JPEG
          let format = 'image/webp';
          let dataUrl = canvas.toDataURL(format, quality);
          if (dataUrl.indexOf('data:image/webp') !== 0) {
            format = 'image/jpeg';
            dataUrl = canvas.toDataURL(format, quality);
          }

          // Approximate size from base64 length
          const sizeBytes = Math.round((dataUrl.length * 3) / 4);
          resolve({ dataUrl, sizeBytes, originalSize });
        };
        img.onerror = () => reject(new Error('Error al cargar la imagen para compresión'));
        img.src = e.target?.result as string;
      };

      reader.onerror = () => reject(new Error('Error al leer el archivo de imagen'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Compresses a video file in the browser using HTML5 Canvas & MediaRecorder
   */
  static async compressVideo(
    file: File,
    onProgress?: (p: CompressionProgress) => void,
    targetMaxDim = 720,
    videoBitrate = 900000 // 900 kbps
  ): Promise<{ dataUrl: string; blob: Blob; originalSizeMB: number; compressedSizeMB: number; duration: number }> {
    return new Promise(async (resolve, reject) => {
      const originalSizeMB = +(file.size / (1024 * 1024)).toFixed(2);
      onProgress?.({
        percent: 5,
        stage: 'Analizando archivo de video...',
        originalSizeMB
      });

      const videoUrl = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.muted = false; // We want to capture audio if available
      video.playsInline = true;
      video.src = videoUrl;

      // Handle abort / cleanup
      const cleanup = () => {
        URL.revokeObjectURL(videoUrl);
        video.pause();
        video.remove();
      };

      video.onloadedmetadata = async () => {
        try {
          const duration = video.duration || 10;
          let width = video.videoWidth || 720;
          let height = video.videoHeight || 480;

          // Scale down dimensions while keeping aspect ratio
          if (width > targetMaxDim || height > targetMaxDim) {
            const scale = Math.min(targetMaxDim / width, targetMaxDim / height);
            width = Math.floor((width * scale) / 2) * 2; // Even numbers for codecs
            height = Math.floor((height * scale) / 2) * 2;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('No se pudo inicializar canvas 2D');

          // Check MediaRecorder support
          let mimeType = 'video/webm;codecs=vp8,opus';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'video/webm';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
              mimeType = 'video/mp4';
              if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = '';
              }
            }
          }

          // Capture stream from canvas
          // @ts-ignore
          const canvasStream: MediaStream = canvas.captureStream ? canvas.captureStream(25) : null;
          if (!canvasStream) {
            // Fallback for browsers without captureStream: read raw file
            const reader = new FileReader();
            reader.onload = () => {
              cleanup();
              resolve({
                dataUrl: reader.result as string,
                blob: file,
                originalSizeMB,
                compressedSizeMB: originalSizeMB,
                duration
              });
            };
            reader.readAsDataURL(file);
            return;
          }

          // Try to capture audio from video
          try {
            // @ts-ignore
            const videoStream = video.captureStream ? video.captureStream() : (video.mozCaptureStream ? video.mozCaptureStream() : null);
            if (videoStream) {
              const audioTracks = videoStream.getAudioTracks();
              if (audioTracks && audioTracks.length > 0) {
                audioTracks.forEach((t: MediaStreamTrack) => canvasStream.addTrack(t));
              }
            }
          } catch (e) {
            console.warn('Audio capture note:', e);
          }

          const options: MediaRecorderOptions = {
            videoBitsPerSecond: videoBitrate
          };
          if (mimeType) options.mimeType = mimeType;

          const recorder = new MediaRecorder(canvasStream, options);
          const chunks: Blob[] = [];

          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              chunks.push(e.data);
            }
          };

          recorder.onstop = () => {
            const compressedBlob = new Blob(chunks, { type: mimeType || 'video/webm' });
            const compressedSizeMB = +(compressedBlob.size / (1024 * 1024)).toFixed(2);

            const fileReader = new FileReader();
            fileReader.onload = () => {
              cleanup();
              onProgress?.({
                percent: 100,
                stage: '¡Compresión completada!',
                originalSizeMB,
                compressedSizeMB
              });
              resolve({
                dataUrl: fileReader.result as string,
                blob: compressedBlob,
                originalSizeMB,
                compressedSizeMB,
                duration
              });
            };
            fileReader.readAsDataURL(compressedBlob);
          };

          recorder.start(100);

          // Start drawing frames onto canvas
          video.currentTime = 0;
          await video.play().catch(() => {
            // If autoplay policy blocks with audio, mute and play
            video.muted = true;
            return video.play();
          });

          const renderFrame = () => {
            if (video.paused || video.ended) return;
            ctx.drawImage(video, 0, 0, width, height);

            const current = video.currentTime;
            const pct = Math.min(95, Math.round(10 + (current / duration) * 85));
            onProgress?.({
              percent: pct,
              stage: `Comprimiendo video (${pct}%)...`,
              originalSizeMB
            });

            requestAnimationFrame(renderFrame);
          };

          renderFrame();

          video.onended = () => {
            setTimeout(() => {
              if (recorder.state !== 'inactive') {
                recorder.stop();
              }
            }, 300);
          };

          // Failsafe timeout in case onended doesn't trigger
          setTimeout(() => {
            if (recorder.state !== 'inactive') {
              recorder.stop();
            }
          }, (duration + 2) * 1000);

        } catch (err) {
          cleanup();
          reject(err);
        }
      };

      video.onerror = () => {
        cleanup();
        reject(new Error('No se pudo decodificar el video seleccionado.'));
      };
    });
  }

  /**
   * Generates a sample compressed Fuckup Nights animated video clip for testing
   */
  static async generateSampleFuckupVideo(): Promise<string> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext('2d')!;

      // @ts-ignore
      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp8') ? 'video/webm;codecs=vp8' : 'video/webm'
      });
      const chunks: Blob[] = [];

      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      };

      recorder.start();

      let frame = 0;
      const totalFrames = 30 * 4; // 4 seconds sample video

      const draw = () => {
        ctx.fillStyle = '#060608';
        ctx.fillRect(0, 0, 640, 360);

        // Animated neon glow
        const glow = Math.sin(frame * 0.1) * 20 + 30;
        ctx.shadowBlur = glow;
        ctx.shadowColor = '#ff006e';

        ctx.fillStyle = '#ff006e';
        ctx.font = 'bold 36px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('FUCKUP NIGHTS SAN JOSÉ', 320, 150);

        ctx.shadowBlur = 10;
        ctx.shadowColor = '#4cc9f0';
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px Outfit, sans-serif';
        ctx.fillText('Confesión en Video #ShareTheFailure', 320, 200);

        // Progress bar in video
        ctx.fillStyle = '#222';
        ctx.fillRect(120, 240, 400, 10);
        ctx.fillStyle = '#4cc9f0';
        ctx.fillRect(120, 240, (400 * frame) / totalFrames, 10);

        frame++;
        if (frame < totalFrames) {
          requestAnimationFrame(draw);
        } else {
          recorder.stop();
        }
      };

      draw();
    });
  }
}
