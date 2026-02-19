/**
 * Genera un panorama equirectangular procedural como blob URL.
 * Útil para pruebas sin necesidad de assets reales.
 *
 * Genera un cielo con gradiente + suelo + líneas de referencia
 * para verificar la proyección 360° y los controles de órbita.
 */
export function generateTestPanorama(
  width = 2048,
  height = 1024,
  skyColor = '#1a1a3e',
  horizonColor = '#4a3080',
  groundColor = '#1a2a1a'
): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Sky gradient (top → horizon)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height / 2);
    skyGrad.addColorStop(0, skyColor);
    skyGrad.addColorStop(1, horizonColor);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height / 2);

    // Ground gradient (horizon → bottom)
    const groundGrad = ctx.createLinearGradient(0, height / 2, 0, height);
    groundGrad.addColorStop(0, horizonColor);
    groundGrad.addColorStop(1, groundColor);
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, height / 2, width, height / 2);

    // Grid lines for spatial reference
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;

    // Vertical lines (longitude markers every 30°)
    for (let i = 0; i < 12; i++) {
      const x = (i / 12) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Horizontal lines (latitude markers)
    for (let i = 0; i < 6; i++) {
      const y = (i / 6) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Cardinal direction labels
    ctx.font = 'bold 48px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';

    const labels = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    labels.forEach((label, i) => {
      const x = (i / 8) * width + width / 16;
      ctx.fillText(label, x, height / 2);
    });

    // Stars in the sky
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * width;
      const y = Math.random() * (height * 0.4);
      const size = Math.random() * 2 + 0.5;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Colored markers at specific positions (for hotspot reference)
    const markers = [
      { x: width * 0.125, color: '#38bdf8', label: 'Info' },
      { x: width * 0.375, color: '#f59e0b', label: 'Portal' },
      { x: width * 0.625, color: '#34d399', label: 'Quiz' },
      { x: width * 0.875, color: '#f472b6', label: 'Media' },
    ];

    markers.forEach(({ x, color, label }) => {
      // Glow
      const glow = ctx.createRadialGradient(x, height * 0.45, 5, x, height * 0.45, 40);
      glow.addColorStop(0, color);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(x - 40, height * 0.45 - 40, 80, 80);

      // Label
      ctx.font = 'bold 20px system-ui';
      ctx.fillStyle = color;
      ctx.fillText(label, x, height * 0.38);
    });

    canvas.toBlob((blob) => {
      resolve(URL.createObjectURL(blob!));
    }, 'image/jpeg', 0.9);
  });
}
