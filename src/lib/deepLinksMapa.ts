// Deep links para apps de navegação/mobilidade. Zero custo — o app do usuário faz o roteamento.
type Coords = { lat: number; lng: number; nome?: string };

function isIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function googleMapsUrl({ lat, lng, nome }: Coords) {
  const label = nome ? `(${encodeURIComponent(nome)})` : '';
  if (isIOS()) return `comgooglemaps://?daddr=${lat},${lng}${label}&directionsmode=driving`;
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function wazeUrl({ lat, lng }: Coords) {
  return `https://waze.com/ul?ll=${lat}%2C${lng}&navigate=yes`;
}

export function uberUrl({ lat, lng, nome }: Coords) {
  const nick = nome ? `&dropoff[nickname]=${encodeURIComponent(nome)}` : '';
  return `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${lat}&dropoff[longitude]=${lng}${nick}`;
}

export function noveNoveUrl({ lat, lng }: Coords) {
  return `https://99app.com/?dropoff_latitude=${lat}&dropoff_longitude=${lng}`;
}

export function appleMapsUrl({ lat, lng, nome }: Coords) {
  const q = nome ? `&q=${encodeURIComponent(nome)}` : '';
  return `https://maps.apple.com/?daddr=${lat},${lng}${q}&dirflg=d`;
}

export function streetViewEmbedUrl(lat: number, lng: number) {
  // Google Maps Embed API — grátis e ilimitado, não requer chave para o Maps Embed simples via `google.com/maps?layer=c`.
  return `https://www.google.com/maps?q=&layer=c&cbll=${lat},${lng}&cbp=11,0,0,0,0&output=embed`;
}

export function openInNewTab(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}
