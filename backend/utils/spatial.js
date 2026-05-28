import {fileURLToPath} from 'url';
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
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

function isLocationValid(reportedLocation, routeCoordinates, maxDistanceMeters = 150) {
    for (const point of routeCoordinates) {
        const distance = getDistanceFromLatLonInMeters(
            reportedLocation.lat, reportedLocation.lng,
            point.lat, point.lng
        );

        if (distance <= maxDistanceMeters) {
            return true; 
        }
    }
    return false;
}

export { isLocationValid };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const mockRoute = [
        { lat: 40.7128, lng: -74.0060 },
        { lat: 40.7200, lng: -74.0060 }
    ];

    const validPassenger = { lat: 40.7129, lng: -74.0061 }; 

    const invalidPassenger = { lat: 40.7900, lng: -74.0000 }; 

    console.log("🔍 Running Spatial Validation Algorithm...");
    
    const test1 = isLocationValid(validPassenger, mockRoute, 150);
    console.log(`Passenger A (Valid): ${test1 ? "✅ ACCEPTED" : "❌ REJECTED"}`);

    const test2 = isLocationValid(invalidPassenger, mockRoute, 150);
    console.log(`Passenger B (Invalid): ${!test2 ? "✅ REJECTED AS EXPECTED" : "❌ FALSELY ACCEPTED"}`);
}