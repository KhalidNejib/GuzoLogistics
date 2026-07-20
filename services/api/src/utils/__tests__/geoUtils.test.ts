import { describe, it, expect } from 'vitest';
import { calculateDistance } from '../geoUtils.js';

describe('geoUtils — calculateDistance validation', () => {
  it('calculates distance correctly for valid inputs', () => {
    // Distance from Addis Ababa (8.9806, 38.7578) to Bishoftu (8.7522, 38.9785) is roughly 35-37 km
    // coords are [lon, lat] format
    const addis: [number, number] = [38.7578, 8.9806];
    const bishoftu: [number, number] = [38.9785, 8.7522];
    const dist = calculateDistance(addis, bishoftu);
    expect(dist).toBeGreaterThan(30);
    expect(dist).toBeLessThan(45);
  });

  it('throws an error if inputs are not arrays of two numbers', () => {
    expect(() => calculateDistance(null as any, [38.9785, 8.7522])).toThrow(
      'Invalid coordinate inputs to calculateDistance'
    );
    expect(() => calculateDistance([38.7578] as any, [38.9785, 8.7522])).toThrow(
      'Invalid coordinate inputs to calculateDistance'
    );
    expect(() => calculateDistance([38.7578, NaN], [38.9785, 8.7522])).toThrow(
      'Invalid coordinate inputs to calculateDistance'
    );
    expect(() => calculateDistance([38.7578, '8.9806' as any], [38.9785, 8.7522])).toThrow(
      'Invalid coordinate inputs to calculateDistance'
    );
  });
});
