// NRI Services page: pitch + the services we handle in India, followed by a
// detailed request form. Submissions land in Firestore (serviceRequests) and
// a Cloud Function emails the admin team.
import { useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Paper, TextField, MenuItem, Button,
  Stack, Chip, Alert, Divider, InputAdornment,
} from '@mui/material';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import GavelIcon from '@mui/icons-material/Gavel';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ElderlyIcon from '@mui/icons-material/Elderly';
import HandymanIcon from '@mui/icons-material/Handyman';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import CelebrationIcon from '@mui/icons-material/Celebration';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import AgricultureIcon from '@mui/icons-material/Agriculture';
import VerifiedIcon from '@mui/icons-material/Verified';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { createServiceRequest } from '../../firebase/db';

const SERVICES = [
  { icon: HomeWorkIcon, title: 'Property Management', desc: 'Rent collection, tenant coordination, and upkeep of your home, flat, or land.' },
  { icon: GavelIcon, title: 'Legal & Documentation', desc: 'Power of Attorney, affidavits, notary, registrations, and certificate procurement.' },
  { icon: AccountBalanceIcon, title: 'Banking & Taxation', desc: 'NRI/NRO accounts, PAN/Aadhaar, income-tax filing, and TDS on property sales.' },
  { icon: ElderlyIcon, title: 'Parent & Elder Care', desc: 'Regular visits, doctor appointments, groceries, and wellness check-ins for family.' },
  { icon: HandymanIcon, title: 'Home Repairs & Renovation', desc: 'Repairs, interiors, and construction — supervised on-site with photo/video updates.' },
  { icon: ReceiptLongIcon, title: 'Bills & Utilities', desc: 'Electricity, water, property tax, insurance, and society dues paid on time.' },
  { icon: CelebrationIcon, title: 'Events & Rituals', desc: 'Poojas, functions, and gifting arranged and attended on your behalf.' },
  { icon: DirectionsCarIcon, title: 'Vehicle Management', desc: 'RC transfer, insurance renewal, servicing, and PUC for your vehicles.' },
  { icon: AgricultureIcon, title: 'Land & Agriculture', desc: 'Farm oversight, lease management, and crop/harvest coordination.' },
];

const SERVICE_TITLES = SERVICES.map((s) => s.title);
const TIMELINES = ['As soon as possible', 'Within 2 weeks', 'Within a month', 'Just exploring / flexible'];

const EMPTY = {
  name: '', email: '', phone: '', country: '', city: '',
  services: [], timeline: '', budget: '', details: '',
};

export default function Services() {
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const toggleService = (title) =>
    setForm((f) => ({
      ...f,
      services: f.services.includes(title)
        ? f.services.filter((s) => s !== title)
        : [...f.services, title],
    }));

  const submit = async () => {
    setError('');
    if (!form.name.trim() || !form.email.trim() || !form.details.trim()) {
      setError('Please fill in your name, email, and a short description of what you need.');
      return;
    }
    if (form.services.length === 0) {
      setError('Please pick at least one service you need help with.');
      return;
    }
    setSubmitting(true);
    try {
      await createServiceRequest({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        country: form.country.trim(),
        city: form.city.trim(),
        services: form.services,
        timeline: form.timeline,
        budget: form.budget.trim(),
        details: form.details.trim(),
      });
      setDone(true);
      setForm(EMPTY);
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      {/* Hero */}
      <Box
        sx={{
          borderRadius: 4, p: { xs: 3, md: 5 }, mb: 4, color: '#fff',
          background: 'linear-gradient(135deg, #F9881F 0%, #FF774C 60%, #FF6B6B 100%)',
        }}
      >
        <Typography variant="overline" sx={{ letterSpacing: 3, fontWeight: 700, opacity: 0.9 }}>
          For NRIs
        </Typography>
        <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '1.8rem', md: '2.5rem' }, mb: 1.5 }}>
          We handle your work in India, so you don’t have to fly back.
        </Typography>
        <Typography sx={{ maxWidth: 680, fontSize: '1.05rem', opacity: 0.95 }}>
          From property and paperwork to caring for your parents — our people on the ground get it
          done reliably, transparently, and at an optimal cost. You stay updated every step of the way.
        </Typography>
        <Stack direction="row" spacing={1.5} sx={{ mt: 3, flexWrap: 'wrap', gap: 1 }}>
          {['Trusted local team', 'Transparent pricing', 'Photo & video updates'].map((t) => (
            <Chip key={t} icon={<VerifiedIcon sx={{ color: '#fff !important' }} />} label={t}
              sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: '#fff', fontWeight: 600 }} />
          ))}
        </Stack>
      </Box>

      {/* Services grid */}
      <Typography variant="h5" fontWeight={800} sx={{ mb: 0.5 }}>What we can do for you</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Pick anything from the list below in the form — or describe something custom.
      </Typography>
      <Grid container spacing={2} sx={{ mb: 5 }}>
        {SERVICES.map((s) => (
          <Grid item xs={12} sm={6} md={4} key={s.title}>
            <Card variant="outlined" sx={{ height: '100%', borderRadius: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1 }}>
                  <Box sx={{
                    width: 42, height: 42, borderRadius: 2, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    bgcolor: (t) => `${t.palette.primary.main}14`, color: 'primary.main',
                  }}>
                    <s.icon />
                  </Box>
                  <Typography fontWeight={700}>{s.title}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">{s.desc}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Request form */}
      <Paper elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', p: { xs: 2.5, md: 4 } }} id="request">
        {done ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 56, mb: 1 }} />
            <Typography variant="h5" fontWeight={800} gutterBottom>Request received!</Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 480, mx: 'auto', mb: 3 }}>
              Thank you — our team will review your requirement and get back to you by email within
              1–2 business days with the next steps and an estimate.
            </Typography>
            <Button variant="outlined" onClick={() => setDone(false)}>Submit another request</Button>
          </Box>
        ) : (
          <>
            <Typography variant="h5" fontWeight={800} sx={{ mb: 0.5 }}>Tell us what you need</Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Share the details and we’ll come back with a plan and an optimal-cost estimate.
            </Typography>

            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              Which services do you need? *
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
              {SERVICE_TITLES.map((t) => {
                const on = form.services.includes(t);
                return (
                  <Chip
                    key={t}
                    label={t}
                    onClick={() => toggleService(t)}
                    color={on ? 'primary' : 'default'}
                    variant={on ? 'filled' : 'outlined'}
                    sx={{ fontWeight: 600 }}
                  />
                );
              })}
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField label="Full name" required fullWidth value={form.name} onChange={set('name')} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Email" required type="email" fullWidth value={form.email} onChange={set('email')} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Phone / WhatsApp" fullWidth value={form.phone} onChange={set('phone')}
                  placeholder="+1 555 000 0000" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Country you live in" fullWidth value={form.country} onChange={set('country')}
                  placeholder="e.g. USA" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="City / area in India" fullWidth value={form.city} onChange={set('city')}
                  placeholder="Where is the work? e.g. Hyderabad" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField select label="Preferred timeline" fullWidth value={form.timeline} onChange={set('timeline')}>
                  {TIMELINES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Approximate budget (optional)" fullWidth value={form.budget} onChange={set('budget')}
                  InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }} />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Describe what you need *"
                  required multiline minRows={4} fullWidth
                  value={form.details} onChange={set('details')}
                  placeholder="Tell us the full picture — property address, what needs doing, any deadlines, who to coordinate with locally, etc."
                />
              </Grid>
            </Grid>

            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

            <Divider sx={{ my: 3 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 360 }}>
                By submitting, you agree to be contacted about your request. We never share your details.
              </Typography>
              <Button variant="contained" size="large" onClick={submit} disabled={submitting} sx={{ px: 4, fontWeight: 700 }}>
                {submitting ? 'Sending…' : 'Submit request'}
              </Button>
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
}
