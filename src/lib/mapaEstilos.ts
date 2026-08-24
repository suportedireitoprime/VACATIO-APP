// Estilos do mapa alinhados à identidade do app (antracite + dourado / marfim).
// Usados no google.maps.Map via `styles` (não requer mapId).

type Style = Record<string, any>;

export const MAPA_ESTILO_ESCURO: Style[] = [
  { elementType: 'geometry', stylers: [{ color: '#0d0d0c' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a8779' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d0d0c' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#2a2823' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6f6c60' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#14170f' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e1d19' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#100f0d' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3a3527' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#5a4f2c' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1a1917' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#07080a' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#45505c' }] },
];

export const MAPA_ESTILO_CLARO: Style[] = [
  { elementType: 'geometry', stylers: [{ color: '#f5f1e8' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5a5648' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f7f4ec' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#ddd6c4' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e2e9d5' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e6dfcd' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#f6e2a8' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#e0c574' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#cfdce6' }] },
];