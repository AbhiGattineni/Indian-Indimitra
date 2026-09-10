// Address line field with Google Places autocomplete suggestions. Falls
// back to a plain text field when VITE_GOOGLE_MAPS_API_KEY isn't configured
// (see src/lib/googlePlaces.js) — manual entry keeps working either way.
//
// The caller (Checkout) wants the address line only ever set by picking a
// suggestion, not free typing — but with a fallback for a real address
// Google genuinely has no suggestions for. `onSuggestionsChange` reports how
// many suggestions came back for the current query (null while a search is
// in flight/pending, so the caller can tell "still searching" apart from
// "searched, found nothing" and only allow manual fallback for the latter).
import { useRef, useState } from 'react';
import { Autocomplete, CircularProgress, TextField } from '@mui/material';
import { autocompleteAddress, getPlaceAddress, placesEnabled } from '../lib/googlePlaces';

export default function AddressAutocomplete({
  label, value, countryCode, onChangeText, onSelectPlace, onSuggestionsChange, ...rest
}) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  if (!placesEnabled) {
    return (
      <TextField label={label} value={value} onChange={(e) => onChangeText(e.target.value)} fullWidth {...rest} />
    );
  }

  const handleInputChange = (_, newValue, reason) => {
    onChangeText(newValue);
    if (reason !== 'input') return;
    clearTimeout(debounceRef.current);
    if (!newValue.trim()) { setOptions([]); onSuggestionsChange?.(null); return; }
    onSuggestionsChange?.(null); // searching -- don't allow fallback until this resolves
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const results = await autocompleteAddress(newValue, countryCode);
      setOptions(results);
      setLoading(false);
      onSuggestionsChange?.(results.length);
    }, 300);
  };

  const handleSelect = async (_, option) => {
    if (!option || typeof option === 'string') return;
    const parsed = await getPlaceAddress(option.placeId);
    if (parsed) onSelectPlace(parsed);
  };

  return (
    <Autocomplete
      freeSolo
      filterOptions={(x) => x}
      options={options}
      getOptionLabel={(o) => (typeof o === 'string' ? o : o.text)}
      isOptionEqualToValue={(o, v) => o.placeId === v.placeId}
      inputValue={value}
      onInputChange={handleInputChange}
      onChange={handleSelect}
      loading={loading}
      renderInput={(params) => (
        <TextField
          {...params}
          {...rest}
          label={label}
          fullWidth
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading && <CircularProgress size={16} sx={{ mr: 1 }} />}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}
