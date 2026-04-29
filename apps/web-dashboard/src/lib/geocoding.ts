/**
 * Utility for Forward and Reverse Geocoding using OpenStreetMap (Nominatim)
 */

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

export interface GeocodeResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    suburb?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

/**
 * Get address text from coordinates [lng, lat]
 */
export async function reverseGeocode(lng: number, lat: number): Promise<string> {
  try {
    const response = await fetch(
      `${NOMINATIM_BASE_URL}/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en', // Force English
        },
      }
    );
    const data = await response.json();
    return data.display_name || 'Unknown Address';
  } catch (error) {
    console.error('Reverse Geocode Error:', error);
    return 'Addis Ababa, Ethiopia';
  }
}

/**
 * Search for address suggestions based on a query string
 */
export async function searchAddress(query: string): Promise<GeocodeResult[]> {
  if (!query || query.length < 3) return [];

  try {
    // We restrict results to Ethiopia area for better relevance
    const response = await fetch(
      `${NOMINATIM_BASE_URL}/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1&countrycodes=et`,
      {
        headers: {
          'Accept-Language': 'en',
        },
      }
    );
    return await response.json();
  } catch (error) {
    console.error('Forward Geocode Error:', error);
    return [];
  }
}
