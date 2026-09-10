import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, TextField, Button, Divider, Stack, Alert, Chip, MenuItem, Link,
  Checkbox, FormControlLabel, RadioGroup, Radio, FormLabel,
} from '@mui/material';
import { useCartStore } from '../../store/useCartStore';
import { useAuthStore } from '../../store/useAuthStore';
import ShippingRateDialog from '../../components/ShippingRateDialog';
import AddressAutocomplete from '../../components/AddressAutocomplete';
import { DEFAULT_USD_INR_RATE } from '../../lib/garudavegaRates';
import { placesEnabled } from '../../lib/googlePlaces';
import {
  getStore, getPlatformConfig, getShippingRates, createOrder, clearCart as clearCartDoc,
} from '../../firebase/db';
import {
  cartSubtotal, cartWeightKg, lineTotal, sellerSubtotal, shippingFee, taxAmount, commissionAmount, formatINR,
} from '../../lib/calculations';
import { PAYMENT_METHOD } from '../../lib/constants';
import {
  SHIPPING_COUNTRIES, isDomestic, internationalShipping, countryName, billableWeight, packedWeightKg,
  SERVICE_TIERS,
} from '../../lib/shipping';

// Dial-code options for the Phone/WhatsApp fields specifically -- separate
// from SHIPPING_COUNTRIES (the delivery destination), and deliberately
// limited to USA and India for now.
const PHONE_COUNTRIES = [
  { code: 'US', dial: '+1', label: 'USA (+1)' },
  { code: 'IN', dial: '+91', label: 'India (+91)' },
];

export default function Checkout() {
  const navigate = useNavigate();
  const { items, storeId, storeName, clear } = useCartStore();
  const { user } = useAuthStore();
  const [store, setStore] = useState(null);
  const [config, setConfig] = useState(null);
  const [shippingRates, setShippingRates] = useState(null);
  const [addr, setAddr] = useState({
    line: '', apartmentName: '', apartmentNumber: '', notApartment: false, city: '', pincode: '', phone: '',
  });
  const [country, setCountry] = useState('US');
  const [placing, setPlacing] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState('');
  const [rateChartOpen, setRateChartOpen] = useState(false);
  const [phoneCountry, setPhoneCountry] = useState('US');

  // WhatsApp: no default -- the customer must explicitly pick one of
  // 'same' as phone (no extra input needed), 'different' (a distinct
  // WhatsApp number, required once chosen), or 'none' (no WhatsApp at all,
  // also no extra input needed).
  const [whatsappOption, setWhatsappOption] = useState('');
  const [whatsappCountry, setWhatsappCountry] = useState('US');
  const [whatsappNumber, setWhatsappNumber] = useState('');

  // The address line may only be set by picking a Google Places suggestion --
  // except when Places isn't configured, or a real search genuinely returns
  // no suggestions, in which case manual entry is the fallback.
  const [addressConfirmed, setAddressConfirmed] = useState(false);
  const [suggestionCount, setSuggestionCount] = useState(null);
  const addressNeedsSelection = placesEnabled && !addressConfirmed;

  const phoneDigits = addr.phone.replace(/\D/g, '');
  const phoneValid = phoneDigits.length >= 10;
  const whatsappDigits = whatsappNumber.replace(/\D/g, '');
  const whatsappChosen = !!whatsappOption;
  const whatsappValid = whatsappOption !== 'different' || whatsappDigits.length >= 10;

  useEffect(() => {
    if (suggestionCount === 0 && addr.line.trim()) setAddressConfirmed(true);
  }, [suggestionCount]);

  useEffect(() => {
    (async () => {
      if (storeId) setStore(await getStore(storeId));
      setConfig(await getPlatformConfig());
      setShippingRates(await getShippingRates());
    })();
  }, [storeId]);

  if (items.length === 0) {
    return <Typography>Your cart is empty.</Typography>;
  }

  // Shipping is country-aware: India keeps the store's domestic flat/free rule;
  // any other country pays a weight-based estimate so we never absorb shipping.
  // The box + packing material travels (and is billed) with the product, so
  // the packaging weight is folded into the total weight before looking up
  // the cost on the rate chart. `packagingFee` is a display-only breakdown
  // of how much of that one shipping number is attributable to packaging
  // (shipping computed on packed weight minus shipping computed on product
  // weight alone) -- the actual charge is still one combined `shipping`
  // figure, not an added-on-top cost.
  const totalKg = cartWeightKg(items);
  const packedKg = packedWeightKg(totalKg, store?.packagingChart);
  const subtotal = +cartSubtotal(items).toFixed(2); // customer-facing (includes platform margin)
  const sellerSub = +sellerSubtotal(items).toFixed(2); // seller's own prices — commission basis
  const margin = +(subtotal - sellerSub).toFixed(2);
  const intl = !isDomestic(country);
  const shipping = intl
    ? internationalShipping(country, packedKg, shippingRates)
    : +shippingFee(subtotal, store).toFixed(2);
  const baseShipping = intl ? internationalShipping(country, totalKg, shippingRates) : shipping;
  const packagingFee = intl ? Math.max(0, +(shipping - baseShipping).toFixed(2)) : 0;
  const tax = taxAmount(subtotal, config);
  const commission = commissionAmount(sellerSub, config);
  const total = +(subtotal + shipping + tax).toFixed(2);
  const sellerNet = +(sellerSub - commission).toFixed(2);
  const totals = {
    subtotal, sellerSub, margin, shipping, packagingFee, tax, commission, total, sellerNet,
  };
  const tierLabel = SERVICE_TIERS.find((t) => t.key === shippingRates?.chargedTier)?.label || 'Saver';

  const placeOrder = async () => {
    setAttempted(true);
    if (!addr.line || !addr.city || !addr.pincode) {
      setError('Please fill in the full delivery address.');
      return;
    }
    if (addressNeedsSelection) {
      setError('Please select your address from the suggestions dropdown.');
      return;
    }
    if (!addr.notApartment && !addr.apartmentName.trim()) {
      setError('Enter the apartment name, or check "Not an apartment".');
      return;
    }
    if (!phoneValid) {
      setError('A valid phone number is required to place the order.');
      return;
    }
    if (!whatsappChosen) {
      setError('Please select a WhatsApp option.');
      return;
    }
    if (!whatsappValid) {
      setError('Enter a valid WhatsApp number, or choose "Same as phone number" / "I don\'t have WhatsApp".');
      return;
    }
    setError('');
    setPlacing(true);
    try {
      const phoneCountryDial = PHONE_COUNTRIES.find((c) => c.code === phoneCountry)?.dial || '';
      const orderData = {
        customerUid: user.uid,
        customerEmail: user.email || '', // used by the server-side order-email function
        storeId,
        storeName,
        items: items.map((i) => ({ ...i, lineTotal: lineTotal(i) })),
        subtotal: totals.subtotal,
        sellerSubtotal: totals.sellerSub,
        marginAmount: totals.margin,
        shippingFee: totals.shipping,
        packagingFee: totals.packagingFee,
        productWeightKg: totalKg,
        packedWeightKg: packedKg,
        taxAmount: totals.tax,
        commissionAmount: totals.commission,
        sellerNetAmount: totals.sellerNet,
        total: totals.total,
        paymentMethod: PAYMENT_METHOD.COD,
        shippingAddress: {
          ...addr,
          country,
          countryName: countryName(country),
          phoneCountryCode: phoneCountryDial,
          whatsappOption,
          whatsappNumber: whatsappOption === 'different' ? whatsappDigits : '',
          whatsappCountryCode: whatsappOption === 'different'
            ? (PHONE_COUNTRIES.find((c) => c.code === whatsappCountry)?.dial || '') : '',
        },
        shipment: { courierName: '', trackingNumber: '', trackingUrl: '' },
      };
      // A Cloud Function (onNewOrderEmail) sends the operator notification
      // server-side when this doc is created — no email logic/secrets in the client.
      const ref = await createOrder(orderData);
      // Best-effort clear of the persisted cart doc.
      try { await clearCartDoc(user.uid); } catch { /* ignore */ }
      clear();
      navigate('/orders', { state: { justPlaced: ref.id } });
    } catch (e) {
      setError(e.message);
    } finally {
      setPlacing(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Checkout
      </Typography>
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        <Paper sx={{ p: 3, flex: 1, minWidth: 300 }}>
          <Typography variant="h6" gutterBottom>
            Delivery address
          </Typography>
          <Stack spacing={2}>
            <TextField
              select
              label="Country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              helperText={
                intl
                  ? 'International orders include shipping, charged at cost.'
                  : 'Free shipping within India (over the store threshold).'
              }
              fullWidth
            >
              {SHIPPING_COUNTRIES.map((c) => (
                <MenuItem key={c.code} value={c.code}>{c.name}</MenuItem>
              ))}
            </TextField>
            <AddressAutocomplete
              label="Address line"
              value={addr.line}
              countryCode={country}
              onChangeText={(line) => { setAddr((a) => ({ ...a, line })); setAddressConfirmed(false); }}
              onSelectPlace={(parsed) => {
                setAddr((a) => ({
                  ...a,
                  line: parsed.line || a.line,
                  city: parsed.city || a.city,
                  pincode: parsed.pincode || a.pincode,
                }));
                setAddressConfirmed(true);
              }}
              onSuggestionsChange={setSuggestionCount}
              error={attempted && addressNeedsSelection}
              helperText={
                attempted && addressNeedsSelection
                  ? 'Please select your address from the suggestions dropdown.'
                  : placesEnabled
                    ? 'Start typing and pick your address from the suggestions.'
                    : undefined
              }
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={addr.notApartment}
                  onChange={(e) => {
                    const notApartment = e.target.checked;
                    setAddr((a) => ({
                      ...a,
                      notApartment,
                      apartmentName: notApartment ? '' : a.apartmentName,
                      apartmentNumber: notApartment ? '' : a.apartmentNumber,
                    }));
                  }}
                />
              }
              label="Not an apartment"
            />
            <TextField
              label="Apartment / building name"
              placeholder="e.g. Green Meadows Apartments"
              value={addr.apartmentName}
              onChange={(e) => setAddr({ ...addr, apartmentName: e.target.value })}
              disabled={addr.notApartment}
              error={attempted && !addr.notApartment && !addr.apartmentName.trim()}
              helperText={
                addr.notApartment
                  ? undefined
                  : "Google's address search doesn't reliably capture this — add it here."
              }
              fullWidth
            />
            <TextField
              label="Apartment / unit number"
              placeholder="e.g. Flat 4B"
              value={addr.apartmentNumber}
              onChange={(e) => setAddr({ ...addr, apartmentNumber: e.target.value })}
              disabled={addr.notApartment}
              fullWidth
            />
            <TextField label="City" value={addr.city}
              onChange={(e) => setAddr({ ...addr, city: e.target.value })} fullWidth />
            <TextField label={intl ? 'ZIP / Postal code' : 'Pincode'} value={addr.pincode}
              onChange={(e) => setAddr({ ...addr, pincode: e.target.value })} fullWidth />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                select
                label="Code"
                value={phoneCountry}
                onChange={(e) => setPhoneCountry(e.target.value)}
                sx={{ width: 130, flexShrink: 0 }}
              >
                {PHONE_COUNTRIES.map((c) => (
                  <MenuItem key={c.code} value={c.code}>{c.label}</MenuItem>
                ))}
              </TextField>
              <TextField
                label="Phone number"
                required
                type="tel"
                value={addr.phone}
                onChange={(e) => setAddr({ ...addr, phone: e.target.value })}
                error={attempted && !phoneValid}
                helperText={
                  attempted && !phoneValid
                    ? 'A valid phone number (at least 10 digits) is required.'
                    : "We'll use this to coordinate your delivery."
                }
                fullWidth
              />
            </Box>

            <Box>
              <FormLabel
                required
                error={attempted && !whatsappChosen}
                sx={{ fontSize: 14, display: 'block', mb: 0.5 }}
              >
                WhatsApp
              </FormLabel>
              <RadioGroup
                row
                value={whatsappOption}
                onChange={(e) => setWhatsappOption(e.target.value)}
              >
                <FormControlLabel value="same" control={<Radio size="small" />} label="Same as phone number" />
                <FormControlLabel value="different" control={<Radio size="small" />} label="Different number" />
                <FormControlLabel value="none" control={<Radio size="small" />} label="I don't have WhatsApp" />
              </RadioGroup>
              {attempted && !whatsappChosen && (
                <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
                  Please select a WhatsApp option.
                </Typography>
              )}
              {whatsappOption === 'different' && (
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <TextField
                    select
                    label="Code"
                    value={whatsappCountry}
                    onChange={(e) => setWhatsappCountry(e.target.value)}
                    sx={{ width: 130, flexShrink: 0 }}
                  >
                    {PHONE_COUNTRIES.map((c) => (
                      <MenuItem key={c.code} value={c.code}>{c.label}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="WhatsApp number"
                    required
                    type="tel"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    error={attempted && !whatsappValid}
                    helperText={attempted && !whatsappValid ? 'A valid WhatsApp number (at least 10 digits) is required.' : undefined}
                    fullWidth
                  />
                </Box>
              )}
            </Box>
          </Stack>
        </Paper>

        <Paper sx={{ p: 3, width: 320, maxWidth: '100%' }}>
          <Typography variant="h6" gutterBottom>
            Order summary
          </Typography>
          <Row label="Subtotal" value={formatINR(totals.subtotal)} />
          <Row
            label={intl ? `Shipping to ${countryName(country)} (${tierLabel})` : 'Shipping'}
            value={intl ? formatINR(baseShipping) : (totals.shipping ? formatINR(totals.shipping) : 'Free')}
          />
          {intl && totals.packagingFee > 0 && (
            <Row label="Packaging cost" value={formatINR(totals.packagingFee)} />
          )}
          {intl && (
            <>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Total weight {packedKg.toFixed(2)} kg ({totalKg.toFixed(2)} kg product + packaging) —
                billed at {billableWeight(packedKg)} kg, shipping charged at cost.
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontStyle: 'italic' }}>
                {shippingRates?.disclaimer}
                {shippingRates?.ratesAsOf ? ` (Rates as of ${shippingRates.ratesAsOf}.)` : ''}
              </Typography>
              <Link component="button" type="button" onClick={() => setRateChartOpen(true)}
                variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                View full rate chart by weight (₹ / $) →
              </Link>
            </>
          )}
          <Row label="Tax" value={formatINR(totals.tax)} />
          <Divider sx={{ my: 1 }} />
          <Row label="Total" value={formatINR(totals.total)} bold />
          <Box sx={{ mt: 2 }}>
            <Chip color="secondary" label="Payment: Cash payment" />
          </Box>
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          <Button
            fullWidth variant="contained" size="large" sx={{ mt: 2 }}
            onClick={placeOrder} disabled={placing}
          >
            Place order
          </Button>
        </Paper>
      </Box>
      <ShippingRateDialog
        open={rateChartOpen}
        onClose={() => setRateChartOpen(false)}
        country={country}
        rows={shippingRates?.countries?.[country]?.rows || []}
        chargedTier={shippingRates?.chargedTier}
        usdInrRate={shippingRates?.usdInrRate || DEFAULT_USD_INR_RATE}
        disclaimer={shippingRates?.disclaimer}
        ratesAsOf={shippingRates?.ratesAsOf}
      />
    </Box>
  );
}

function Row({ label, value, bold }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
      <Typography fontWeight={bold ? 700 : 400}>{label}</Typography>
      <Typography fontWeight={bold ? 700 : 400}>{value}</Typography>
    </Box>
  );
}
