// Home gateway: the first thing visitors see. Two choices — order food
// (Delivery, the storefront) or NRI Services in India. Delivery opens the
// existing storefront; Services opens the NRI services page + request form.
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Card, CardActionArea, Stack } from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

const CHOICES = [
  {
    to: '/delivery',
    icon: LocalShippingIcon,
    title: 'Delivery',
    tagline: 'Homemade sweets, snacks & pickles',
    body: 'Order fresh home food and have it delivered across India and abroad.',
    gradient: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
  },
  {
    to: '/services',
    icon: SupportAgentIcon,
    title: 'Services',
    tagline: 'Your trusted hands in India',
    body: "For NRIs — we get your work done back home, reliably and at optimal cost.",
    gradient: 'linear-gradient(135deg, #F9881F 0%, #FF774C 100%)',
  },
];

export default function Gateway() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: { xs: 'auto', md: 'calc(100vh - 180px)' },
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        py: { xs: 4, md: 6 },
      }}
    >
      <Typography variant="overline" sx={{ letterSpacing: 3, color: 'primary.main', fontWeight: 700 }}>
        Anupama Home Foods
      </Typography>
      <Typography
        variant="h3"
        sx={{ fontWeight: 800, mt: 1, mb: 1.5, fontSize: { xs: '1.9rem', md: '2.6rem' } }}
      >
        How can we help you today?
      </Typography>
      <Typography color="text.secondary" sx={{ maxWidth: 560, mb: { xs: 4, md: 6 } }}>
        Choose what you need — order home food for delivery, or let us handle your work in India.
      </Typography>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 2.5, sm: 3.5 }}
        sx={{ width: '100%', maxWidth: 820, px: { xs: 1, sm: 0 } }}
      >
        {CHOICES.map((c) => (
          <Card
            key={c.to}
            elevation={0}
            sx={{
              flex: 1,
              borderRadius: 4,
              border: '1px solid',
              borderColor: 'divider',
              overflow: 'hidden',
              transition: 'transform .18s ease, box-shadow .18s ease',
              '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 18px 40px rgba(0,0,0,0.14)' },
            }}
          >
            <CardActionArea
              onClick={() => navigate(c.to)}
              sx={{ height: '100%', p: { xs: 3, sm: 4 }, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}
            >
              <Box
                sx={{
                  width: 68, height: 68, borderRadius: '20px', mb: 2.5,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: c.gradient, color: '#fff',
                  boxShadow: '0 8px 20px rgba(255,107,107,0.35)',
                }}
              >
                <c.icon sx={{ fontSize: 34 }} />
              </Box>
              <Typography variant="h5" fontWeight={800} gutterBottom>
                {c.title}
              </Typography>
              <Typography variant="subtitle2" color="primary.main" fontWeight={700} sx={{ mb: 1 }}>
                {c.tagline}
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3, flexGrow: 1 }}>
                {c.body}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: 'primary.main', fontWeight: 700 }}>
                <span>{c.title === 'Delivery' ? 'Start ordering' : 'Explore services'}</span>
                <ArrowForwardIcon fontSize="small" />
              </Box>
            </CardActionArea>
          </Card>
        ))}
      </Stack>
    </Box>
  );
}
