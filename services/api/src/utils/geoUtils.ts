/**
 * Haversine Formula to calculate distance between coordinates in km
 */
export const calculateDistance = (coords1: [number, number], coords2: [number, number]): number => {
  if (
    !coords1 || !Array.isArray(coords1) || coords1.length !== 2 ||
    !coords2 || !Array.isArray(coords2) || coords2.length !== 2 ||
    typeof coords1[0] !== 'number' || Number.isNaN(coords1[0]) ||
    typeof coords1[1] !== 'number' || Number.isNaN(coords1[1]) ||
    typeof coords2[0] !== 'number' || Number.isNaN(coords2[0]) ||
    typeof coords2[1] !== 'number' || Number.isNaN(coords2[1])
  ) {
    throw new Error('Invalid coordinate inputs to calculateDistance. Coordinates must be arrays of two numbers.');
  }

  const R = 6371; // Earth's radius in km
  const dLat = (coords2[1] - coords1[1]) * (Math.PI / 180);
  const dLon = (coords2[0] - coords1[0]) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coords1[1] * (Math.PI / 180)) *
      Math.cos(coords2[1] * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
