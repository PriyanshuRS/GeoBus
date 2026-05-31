export function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function calculateDistanceOnPath(
  busCoords: { lat: number; lng: number },
  targetCoords: { lat: number; lng: number } | null,
  routeData: any
): number {
  if (!routeData) return 0;
  let routeCoords: {lat: number, lng: number}[] = [];
  try {
    routeCoords = typeof routeData === 'string' ? JSON.parse(routeData) : routeData;
  } catch(e) {
    return 0;
  }
  if (!routeCoords || routeCoords.length < 2) return 0;

  let minBusDist = Infinity;
  let busIndex = 0;
  for (let i = 0; i < routeCoords.length; i++) {
    const dist = getDistanceInMeters(busCoords.lat, busCoords.lng, routeCoords[i].lat, routeCoords[i].lng);
    if (dist < minBusDist) {
      minBusDist = dist;
      busIndex = i;
    }
  }

  let minTargetDist = Infinity;
  let targetIndex = routeCoords.length - 1;
  if (targetCoords) {
    for (let i = 0; i < routeCoords.length; i++) {
      const dist = getDistanceInMeters(targetCoords.lat, targetCoords.lng, routeCoords[i].lat, routeCoords[i].lng);
      if (dist < minTargetDist) {
        minTargetDist = dist;
        targetIndex = i;
      }
    }
  }

  let startIndex = Math.min(busIndex, targetIndex);
  let endIndex = Math.max(busIndex, targetIndex);

  let pathDistance = 0;
  for (let i = startIndex; i < endIndex; i++) {
    pathDistance += getDistanceInMeters(routeCoords[i].lat, routeCoords[i].lng, routeCoords[i+1].lat, routeCoords[i+1].lng);
  }
  
  return pathDistance;
}

export function getETAString(distanceMeters: number, speedMps: number) {
  if (distanceMeters === 0) return "Arrived";
  const speed = speedMps > 0.5 ? speedMps : 5; 
  const timeInSecs = distanceMeters / speed;
  if (timeInSecs < 60) return "< 1 min";
  return Math.round(timeInSecs / 60) + " mins";
}
