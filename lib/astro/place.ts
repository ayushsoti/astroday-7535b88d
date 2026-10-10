/**
 * Offline place resolution. A curated city index (India-heavy + world majors).
 * Ambiguous names return candidates and are never auto-picked.
 */

export interface PlaceCandidate {
  name: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export class AmbiguousPlaceError extends Error {
  readonly code = "AMBIGUOUS_BIRTH_PLACE";
  readonly candidates: PlaceCandidate[];
  constructor(query: string, candidates: PlaceCandidate[]) {
    super(`Multiple places match "${query}"`);
    this.name = "AmbiguousPlaceError";
    this.candidates = candidates;
  }
}

export class UnknownPlaceError extends Error {
  readonly code = "UNKNOWN_BIRTH_PLACE";
  constructor(query: string) {
    super(`No known place matches "${query}"`);
    this.name = "UnknownPlaceError";
  }
}

const INDEX: PlaceCandidate[] = [
  { name: "Haridwar", region: "Uttarakhand", country: "India", latitude: 29.9457, longitude: 78.1642, timezone: "Asia/Kolkata" },
  { name: "New Delhi", region: "Delhi", country: "India", latitude: 28.6139, longitude: 77.209, timezone: "Asia/Kolkata" },
  { name: "Delhi", region: "Delhi", country: "India", latitude: 28.7041, longitude: 77.1025, timezone: "Asia/Kolkata" },
  { name: "Delhi", region: "Iowa", country: "United States", latitude: 42.4283, longitude: -91.3349, timezone: "America/Chicago" },
  { name: "Mumbai", region: "Maharashtra", country: "India", latitude: 19.076, longitude: 72.8777, timezone: "Asia/Kolkata" },
  { name: "Pune", region: "Maharashtra", country: "India", latitude: 18.5204, longitude: 73.8567, timezone: "Asia/Kolkata" },
  { name: "Bengaluru", region: "Karnataka", country: "India", latitude: 12.9716, longitude: 77.5946, timezone: "Asia/Kolkata" },
  { name: "Chennai", region: "Tamil Nadu", country: "India", latitude: 13.0827, longitude: 80.2707, timezone: "Asia/Kolkata" },
  { name: "Kolkata", region: "West Bengal", country: "India", latitude: 22.5726, longitude: 88.3639, timezone: "Asia/Kolkata" },
  { name: "Hyderabad", region: "Telangana", country: "India", latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata" },
  { name: "Ahmedabad", region: "Gujarat", country: "India", latitude: 23.0225, longitude: 72.5714, timezone: "Asia/Kolkata" },
  { name: "Jaipur", region: "Rajasthan", country: "India", latitude: 26.9124, longitude: 75.7873, timezone: "Asia/Kolkata" },
  { name: "Lucknow", region: "Uttar Pradesh", country: "India", latitude: 26.8467, longitude: 80.9462, timezone: "Asia/Kolkata" },
  { name: "Varanasi", region: "Uttar Pradesh", country: "India", latitude: 25.3176, longitude: 82.9739, timezone: "Asia/Kolkata" },
  { name: "Kanpur", region: "Uttar Pradesh", country: "India", latitude: 26.4499, longitude: 80.3319, timezone: "Asia/Kolkata" },
  { name: "Agra", region: "Uttar Pradesh", country: "India", latitude: 27.1767, longitude: 78.0081, timezone: "Asia/Kolkata" },
  { name: "Dehradun", region: "Uttarakhand", country: "India", latitude: 30.3165, longitude: 78.0322, timezone: "Asia/Kolkata" },
  { name: "Chandigarh", region: "Chandigarh", country: "India", latitude: 30.7333, longitude: 76.7794, timezone: "Asia/Kolkata" },
  { name: "Amritsar", region: "Punjab", country: "India", latitude: 31.634, longitude: 74.8723, timezone: "Asia/Kolkata" },
  { name: "Surat", region: "Gujarat", country: "India", latitude: 21.1702, longitude: 72.8311, timezone: "Asia/Kolkata" },
  { name: "Indore", region: "Madhya Pradesh", country: "India", latitude: 22.7196, longitude: 75.8577, timezone: "Asia/Kolkata" },
  { name: "Bhopal", region: "Madhya Pradesh", country: "India", latitude: 23.2599, longitude: 77.4126, timezone: "Asia/Kolkata" },
  { name: "Patna", region: "Bihar", country: "India", latitude: 25.5941, longitude: 85.1376, timezone: "Asia/Kolkata" },
  { name: "Guwahati", region: "Assam", country: "India", latitude: 26.1445, longitude: 91.7362, timezone: "Asia/Kolkata" },
  { name: "Kochi", region: "Kerala", country: "India", latitude: 9.9312, longitude: 76.2673, timezone: "Asia/Kolkata" },
  { name: "Goa", region: "Goa", country: "India", latitude: 15.2993, longitude: 74.124, timezone: "Asia/Kolkata" },
  { name: "Nagpur", region: "Maharashtra", country: "India", latitude: 21.1458, longitude: 79.0882, timezone: "Asia/Kolkata" },
  { name: "Noida", region: "Uttar Pradesh", country: "India", latitude: 28.5355, longitude: 77.391, timezone: "Asia/Kolkata" },
  { name: "Gurugram", region: "Haryana", country: "India", latitude: 28.4595, longitude: 77.0266, timezone: "Asia/Kolkata" },
  { name: "Karachi", region: "Sindh", country: "Pakistan", latitude: 24.8607, longitude: 67.0011, timezone: "Asia/Karachi" },
  { name: "Lahore", region: "Punjab", country: "Pakistan", latitude: 31.5204, longitude: 74.3587, timezone: "Asia/Karachi" },
  { name: "Dhaka", region: "Dhaka", country: "Bangladesh", latitude: 23.8103, longitude: 90.4125, timezone: "Asia/Dhaka" },
  { name: "Kathmandu", region: "Bagmati", country: "Nepal", latitude: 27.7172, longitude: 85.324, timezone: "Asia/Kathmandu" },
  { name: "Colombo", region: "Western", country: "Sri Lanka", latitude: 6.9271, longitude: 79.8612, timezone: "Asia/Colombo" },
  { name: "Dubai", region: "Dubai", country: "United Arab Emirates", latitude: 25.2048, longitude: 55.2708, timezone: "Asia/Dubai" },
  { name: "London", region: "England", country: "United Kingdom", latitude: 51.5074, longitude: -0.1278, timezone: "Europe/London" },
  { name: "Manchester", region: "England", country: "United Kingdom", latitude: 53.4808, longitude: -2.2426, timezone: "Europe/London" },
  { name: "Birmingham", region: "England", country: "United Kingdom", latitude: 52.4862, longitude: -1.8904, timezone: "Europe/London" },
  { name: "New York", region: "New York", country: "United States", latitude: 40.7128, longitude: -74.006, timezone: "America/New_York" },
  { name: "Los Angeles", region: "California", country: "United States", latitude: 34.0522, longitude: -118.2437, timezone: "America/Los_Angeles" },
  { name: "Chicago", region: "Illinois", country: "United States", latitude: 41.8781, longitude: -87.6298, timezone: "America/Chicago" },
  { name: "San Francisco", region: "California", country: "United States", latitude: 37.7749, longitude: -122.4194, timezone: "America/Los_Angeles" },
  { name: "Toronto", region: "Ontario", country: "Canada", latitude: 43.6532, longitude: -79.3832, timezone: "America/Toronto" },
  { name: "Sydney", region: "New South Wales", country: "Australia", latitude: -33.8688, longitude: 151.2093, timezone: "Australia/Sydney" },
  { name: "Singapore", region: "Singapore", country: "Singapore", latitude: 1.3521, longitude: 103.8198, timezone: "Asia/Singapore" },
  { name: "Tokyo", region: "Tokyo", country: "Japan", latitude: 35.6762, longitude: 139.6503, timezone: "Asia/Tokyo" },
  { name: "Berlin", region: "Berlin", country: "Germany", latitude: 52.52, longitude: 13.405, timezone: "Europe/Berlin" },
  { name: "Paris", region: "Ile-de-France", country: "France", latitude: 48.8566, longitude: 2.3522, timezone: "Europe/Paris" },
  { name: "Amsterdam", region: "North Holland", country: "Netherlands", latitude: 52.3676, longitude: 4.9041, timezone: "Europe/Amsterdam" },
  { name: "Frankfurt", region: "Hesse", country: "Germany", latitude: 50.1109, longitude: 8.6821, timezone: "Europe/Berlin" },
  { name: "Zurich", region: "Zurich", country: "Switzerland", latitude: 47.3769, longitude: 8.5417, timezone: "Europe/Zurich" },
  { name: "Doha", region: "Doha", country: "Qatar", latitude: 25.2854, longitude: 51.531, timezone: "Asia/Qatar" },
  { name: "Riyadh", region: "Riyadh", country: "Saudi Arabia", latitude: 24.7136, longitude: 46.6753, timezone: "Asia/Riyadh" },
  { name: "Muscat", region: "Muscat", country: "Oman", latitude: 23.588, longitude: 58.3829, timezone: "Asia/Muscat" },
  { name: "Nairobi", region: "Nairobi", country: "Kenya", latitude: -1.2921, longitude: 36.8219, timezone: "Africa/Nairobi" },
  { name: "Johannesburg", region: "Gauteng", country: "South Africa", latitude: -26.2041, longitude: 28.0473, timezone: "Africa/Johannesburg" },
];

const normalize = (s: string): string => s.trim().toLowerCase();

/** Resolve a place text to exactly one candidate, or throw a typed error. */
export function resolvePlace(query: string): PlaceCandidate {
  const q = normalize(query);
  if (!q) throw new UnknownPlaceError(query);
  const exact = INDEX.filter((c) => normalize(c.name) === q);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) throw new AmbiguousPlaceError(query, exact);

  const partial = INDEX.filter((c) => normalize(c.name).includes(q) || q.includes(normalize(c.name)));
  if (partial.length === 1) return partial[0];
  if (partial.length > 1) throw new AmbiguousPlaceError(query, partial);
  throw new UnknownPlaceError(query);
}

/** Resolve "Name, Country" or "Name|Country" deterministically. */
export function resolvePlaceWithCountry(name: string, country: string): PlaceCandidate | null {
  const n = normalize(name);
  const c = normalize(country);
  return (
    INDEX.find((p) => normalize(p.name) === n && normalize(p.country) === c) ??
    INDEX.find((p) => normalize(p.name).includes(n) && normalize(p.country) === c) ??
    null
  );
}

export function searchPlaces(query: string, limit = 8): PlaceCandidate[] {
  const q = normalize(query);
  if (!q) return INDEX.slice(0, limit);
  return INDEX.filter((c) => normalize(c.name).includes(q) || normalize(c.country).includes(q)).slice(0, limit);
}
