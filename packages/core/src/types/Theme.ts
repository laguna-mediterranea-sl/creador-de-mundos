/** Paleta de colores del tema */
export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textDim: string;
  hotspotInfo: string;
  hotspotPortal: string;
  hotspotQuiz: string;
}

/** Tipografías del tema */
export interface ThemeFonts {
  display: string;
  body: string;
}

/** Posición del panel de información */
export type PanelPosition = 'right' | 'left' | 'bottom';

/** Posición de la sidebar de navegación */
export type SidebarPosition = 'left' | 'right' | 'hidden';

/** Estilo de los controles */
export type ControlsStyle = 'full' | 'minimal' | 'hidden';

/**
 * Tema visual del engine.
 * Cada producto (Tu Cuento Mágico, Aulas Mágicas) define su propio tema.
 * El SDK aplica estos estilos sin saber en qué producto está.
 */
export interface EngineTheme {
  colors: ThemeColors;
  fonts: ThemeFonts;
  borderRadius: string;
  panelPosition: PanelPosition;
  sidebarPosition: SidebarPosition;
  showProgress: boolean;
  showVRButton: boolean;
  logo?: string;
  productName: string;
  autoRotate: boolean;
  showHelpToast: boolean;
  controlsStyle: ControlsStyle;
}
