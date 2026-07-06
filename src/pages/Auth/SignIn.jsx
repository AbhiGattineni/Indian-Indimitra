import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Paper, Typography, TextField, Button, Divider, Alert, Stack, Tabs, Tab,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { signInWithGoogle, signInWithEmail, registerWithEmail } from '../../firebase/auth';
import { useAuthStore } from '../../store/useAuthStore';
import { ROLES } from '../../lib/constants';

export default function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const [tab, setTab] = useState(0); // 0 = sign in, 1 = register
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const dest = location.state?.from?.pathname || '/';

  const done = async () => {
    const profile = await refreshProfile();
    // Admins land on their dashboard by default; respect an explicit deep
    // link (e.g. they were bounced here from a specific /admin/* page).
    const finalDest = dest === '/' && profile?.role === ROLES.ADMIN ? '/admin' : dest;
    navigate(finalDest, { replace: true });
  };

  const handleGoogle = async () => {
    setError('');
    setBusy(true);
    try {
      await signInWithGoogle();
      await done();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleEmail = async () => {
    setError('');
    setBusy(true);
    try {
      if (tab === 0) await signInWithEmail(email, password);
      else await registerWithEmail(email, password, name);
      await done();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
      <Paper sx={{ p: 4, width: 400, maxWidth: '100%' }}>
        <Typography variant="h5" gutterBottom>
          Welcome
        </Typography>

        <Button
          fullWidth
          variant="outlined"
          startIcon={<GoogleIcon />}
          onClick={handleGoogle}
          disabled={busy}
          sx={{ mb: 2 }}
        >
          Continue with Google
        </Button>

        <Divider sx={{ my: 2 }}>or</Divider>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" sx={{ mb: 2 }}>
          <Tab label="Sign in" />
          <Tab label="Register" />
        </Tabs>

        <Stack spacing={2}>
          {tab === 1 && (
            <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
          )}
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
          />
          {error && <Alert severity="error">{error}</Alert>}
          <Button variant="contained" onClick={handleEmail} disabled={busy}>
            {tab === 0 ? 'Sign in' : 'Create account'}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
