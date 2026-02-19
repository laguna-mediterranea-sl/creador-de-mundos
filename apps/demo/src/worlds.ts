import type { World, EngineTheme } from '@world-engine/core';

/**
 * Crea mundos de prueba usando URLs de panoramas procedurales.
 */
export function createTestWorlds(panoramaUrl1: string, panoramaUrl2: string): World[] {
  return [
    {
      id: 'mundo-bosque',
      title: 'El Bosque Encantado',
      asset: {
        type: 'panorama',
        url: panoramaUrl1,
        format: 'jpg',
      },
      metadata: {
        tema: 'Bosques y ecosistemas',
        tags: ['naturaleza', 'bosque'],
      },
      camera: {
        initialLon: 0,
        initialLat: 0,
        fov: 75,
        autoRotate: true,
        autoRotateSpeed: 0.3,
      },
      hotspots: [
        {
          id: 'info-arboles',
          type: 'info',
          position: { theta: Math.PI * 0.25, phi: 0 },
          content: {
            title: 'Los Árboles Centenarios',
            text: 'Estos árboles tienen más de 500 años. Sus raíces se entrelazan bajo tierra formando una red de comunicación natural llamada "Wood Wide Web".',
            audioAutoGenerate: true,
          },
          appearance: {
            size: 'lg',
            pulseAnimation: true,
          },
        },
        {
          id: 'quiz-animales',
          type: 'quiz',
          position: { theta: Math.PI * 1.25, phi: 0.1 },
          content: {
            title: 'Quiz: Fauna del Bosque',
            text: '¿Cuál de estos animales es nocturno?',
          },
          quiz: {
            question: '¿Cuál de estos animales es nocturno?',
            options: ['Ardilla', 'Búho', 'Ciervo', 'Conejo'],
            correctIndex: 1,
            explanation: 'El búho es un ave rapaz nocturna. Tiene una visión excepcional adaptada a la oscuridad.',
          },
          appearance: {
            size: 'md',
            color: '#34d399',
          },
        },
        {
          id: 'portal-cueva',
          type: 'portal',
          position: { theta: Math.PI * 0.75, phi: -0.2 },
          content: {
            title: 'Entrada a la Cueva',
            text: 'Haz clic para explorar la cueva misteriosa...',
          },
          portal: {
            targetWorldId: 'mundo-cueva',
            transitionEffect: 'fade',
          },
          appearance: {
            size: 'lg',
            color: '#f59e0b',
          },
        },
      ],
    },
    {
      id: 'mundo-cueva',
      title: 'La Cueva Cristalina',
      asset: {
        type: 'panorama',
        url: panoramaUrl2,
        format: 'jpg',
      },
      metadata: {
        tema: 'Geología y minerales',
        tags: ['cueva', 'cristales'],
      },
      camera: {
        initialLon: 180,
        initialLat: -10,
        fov: 70,
      },
      hotspots: [
        {
          id: 'info-cristales',
          type: 'info',
          position: { theta: Math.PI * 0.5, phi: 0.3 },
          content: {
            title: 'Cristales de Cuarzo',
            text: 'Estos cristales se formaron hace millones de años por la presión y temperatura del subsuelo. El cuarzo es el segundo mineral más abundante de la corteza terrestre.',
            audioAutoGenerate: true,
          },
        },
        {
          id: 'portal-bosque',
          type: 'portal',
          position: { theta: Math.PI * 1.5, phi: -0.1 },
          content: {
            title: 'Salida al Bosque',
            text: 'Volver al bosque encantado',
          },
          portal: {
            targetWorldId: 'mundo-bosque',
            transitionEffect: 'fade',
          },
          appearance: {
            color: '#f59e0b',
          },
        },
      ],
    },
  ];
}

/**
 * Tema de prueba: Aulas Mágicas (B2B educativo)
 */
export const aulasMagicasTheme: EngineTheme = {
  colors: {
    primary: '#38bdf8',
    secondary: '#818cf8',
    accent: '#f59e0b',
    background: '#0a0e17',
    surface: 'rgba(12, 18, 32, 0.92)',
    text: '#e2e8f0',
    textDim: '#94a3b8',
    hotspotInfo: '#38bdf8',
    hotspotPortal: '#f59e0b',
    hotspotQuiz: '#34d399',
  },
  fonts: {
    display: 'Georgia, serif',
    body: 'system-ui, sans-serif',
  },
  borderRadius: '14px',
  panelPosition: 'right',
  sidebarPosition: 'left',
  showProgress: true,
  showVRButton: false,
  productName: 'Aulas Mágicas',
  autoRotate: true,
  showHelpToast: true,
  controlsStyle: 'full',
  labels: {
    loading: 'Cargando',
    loadingWorld: 'Cargando mundo',
    playAudio: 'Escuchar',
    stopAudio: 'Detener',
    worldsHeader: 'Mundos',
    previousWorld: 'Mundo anterior',
    nextWorld: 'Siguiente mundo',
    muteAudio: 'Silenciar',
    unmuteAudio: 'Activar audio',
    enterVR: 'Modo VR',
    closePanel: 'Cerrar',
  },
};
