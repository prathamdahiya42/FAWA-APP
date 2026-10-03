import * as Location from 'expo-location';

export interface AirQualityResult {
  aqi: number;
  pm25: number;
  status: 'good' | 'moderate' | 'unhealthy' | 'hazardous';
  recommendIndoor: boolean;
}

/**
 * Fetch local air quality using Open-Meteo Air Quality API (free, open, no key).
 * Falls back safely if location permission is denied.
 */
export async function fetchLocalAirQuality(): Promise<AirQualityResult | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
    const { latitude, longitude } = loc.coords;

    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=european_aqi,pm2_5`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    const aqi = data?.current?.european_aqi ?? 50;
    const pm25 = data?.current?.pm2_5 ?? 15;

    let airStatus: AirQualityResult['status'] = 'good';
    if (aqi > 150) airStatus = 'hazardous';
    else if (aqi > 100) airStatus = 'unhealthy';
    else if (aqi > 50) airStatus = 'moderate';

    return {
      aqi,
      pm25,
      status: airStatus,
      recommendIndoor: aqi > 150,
    };
  } catch (e) {
    console.warn('AQI fetch failed gracefully', e);
    return null;
  }
}
