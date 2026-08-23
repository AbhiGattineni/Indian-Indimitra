// Thin wrapper over Places API (New) — called directly from the browser via
// fetch (it supports CORS for client-side use, unlike the legacy Places API,
// so no Cloud Function proxy or extra ~200KB Maps JS SDK bundle is needed).
// Needs VITE_GOOGLE_MAPS_API_KEY (a Maps key restricted to this site's
// domain) — until that's configured, `placesEnabled` is false and every
// caller should fall back to a plain text field.
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export const placesEnabled = !!API_KEY;

if (!placesEnabled && typeof window !== 'undefined') {
  // eslint-disable-next-line no-console
  console.warn('Address autocomplete disabled: VITE_GOOGLE_MAPS_API_KEY was not baked into this build.');
}

export async function autocompleteAddress(input, countryCode) {
  if (!placesEnabled || !input?.trim()) return [];
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': API_KEY },
      body: JSON.stringify({
        input,
        ...(countryCode ? { includedRegionCodes: [countryCode] } : {}),
      }),
    });
    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.warn('Places autocomplete failed:', res.status, await res.text().catch(() => ''));
      return [];
    }
    const data = await res.json();
    return (data.suggestions || [])
      .map((s) => s.placePrediction)
      .filter(Boolean)
      .map((p) => ({ placeId: p.placeId, text: p.text?.text || '' }));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Places autocomplete request errored:', e);
    return [];
  }
}

function componentByType(components, type) {
  return components.find((c) => c.types?.includes(type));
}

// Maps Google's address components onto this app's address shape
// ({ line, city, pincode, countryCode }) — the caller still owns
// apartment/unit, which Google rarely captures reliably.
function parseAddressComponents(components) {
  const streetNumber = componentByType(components, 'street_number')?.longText || '';
  const route = componentByType(components, 'route')?.longText || '';
  const locality = componentByType(components, 'locality')?.longText
    || componentByType(components, 'postal_town')?.longText
    || componentByType(components, 'administrative_area_level_2')?.longText || '';
  const pincode = componentByType(components, 'postal_code')?.longText || '';
  return {
    line: [streetNumber, route].filter(Boolean).join(' '),
    city: locality,
    pincode,
    countryCode: componentByType(components, 'country')?.shortText || '',
  };
}

export async function getPlaceAddress(placeId) {
  if (!placesEnabled || !placeId) return null;
  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: { 'X-Goog-Api-Key': API_KEY, 'X-Goog-FieldMask': 'addressComponents,formattedAddress' },
    });
    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.warn('Place details lookup failed:', res.status, await res.text().catch(() => ''));
      return null;
    }
    const place = await res.json();
    return parseAddressComponents(place.addressComponents || []);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Place details lookup errored:', e);
    return null;
  }
}
