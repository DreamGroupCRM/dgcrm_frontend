// src/utils/geolocation.ts
// Wraps navigator.geolocation.getCurrentPosition in a promise with
// user-friendly error messages covering every failure mode the browser
// Geolocation API can report: permission denied, position unavailable,
// timeout, the API not existing at all, and invalid/non-numeric
// coordinates coming back from the device.
export interface GeoResult {
  latitude: number;
  longitude: number;
}

export function getCurrentLocation(timeoutMs = 10000): Promise<GeoResult> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Location is not supported on this device/browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (typeof latitude !== 'number' || typeof longitude !== 'number' || Number.isNaN(latitude) || Number.isNaN(longitude)) {
          reject(new Error('Received invalid location data. Please try again.'));
          return;
        }
        resolve({ latitude, longitude });
      },
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            reject(new Error('Location permission was denied. Please enable location access for this site and try again.'));
            break;
          case err.POSITION_UNAVAILABLE:
            reject(new Error('Your location is currently unavailable. Please try again.'));
            break;
          case err.TIMEOUT:
            reject(new Error('Getting your location took too long. Please try again.'));
            break;
          default:
            reject(new Error('Could not get your location. Please try again.'));
        }
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 }
    );
  });
}
