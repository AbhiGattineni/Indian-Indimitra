import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Paper, Typography, TextField, Button, Divider, Alert, Stack, Tabs, Tab, Link,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { signInWithGoogle, signInWithEmail, registerWithEmail } from '../../firebase/auth';
import { useAuthStore } from '../../store/useAuthStore';
import { ROLES } from '../../lib/constants';

// Firebase (with email-enumeration protection on, the project default) folds
// "wrong password" and "no such account" into one auth/invalid-credential
// code, so we can't tell a first-time visitor "you don't have an account" —
// only offer both paths (retry, or create one) without asserting which is true.
function authErrorMessage(error, onSignIn) {
  const code = error?.code;
  if (onSignIn && (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password')) {
    return "That email/password didn't work — double-check them, or if you're new here, create an account instead.";
  }
  if (!onSignIn && code === 'auth/email-already-in-use') {
    return 'An account already exists for that email — sign in instead.';
  }
  if (code === 'auth/weak-password') {
    return 'Password should be at least 6 characters.';
  }
  if (code === 'auth/invalid-email') {
    return 'Enter a valid email address.';
  }
  return error?.message || 'Something went wrong. Please try again.';
}

export default function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const [tab, setTab] = useState(0); // 0 = sign in, 1 = sign up
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

  const switchTab = (newTab) => {
    setTab(newTab);
    setError('');
  };

  const handleEmail = async () => {
    setError('');
    setBusy(true);
    try {
      if (tab === 0) await signInWithEmail(email, password);
      else await registerWithEmail(email, password, name);
      await done();
    } catch (e) {
      setError(authErrorMessage(e, tab === 0));
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
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          New here or returning — Google sign-in works either way.
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

        <Divider sx={{ my: 2 }}>or use email</Divider>

        <Tabs value={tab} onChange={(_, v) => switchTab(v)} variant="fullWidth" sx={{ mb: 2 }}>
          <Tab label="Sign in" />
          <Tab label="Sign up" />
        </Tabs>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
          {tab === 0 ? (
            <>Don't have an account yet? <Link component="button" type="button" onClick={() => switchTab(1)}>Sign up</Link> instead.</>
          ) : (
            <>Already have an account? <Link component="button" type="button" onClick={() => switchTab(0)}>Sign in</Link> instead.</>
          )}
        </Typography>

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
          {error && (
            <Alert severity="error">
              {error}
              {tab === 0 && (
                <>
                  {' '}
                  <Link component="button" type="button" onClick={() => switchTab(1)}>Create an account</Link>
                </>
              )}
            </Alert>
          )}
          <Button variant="contained" onClick={handleEmail} disabled={busy}>
            {tab === 0 ? 'Sign in' : 'Create account'}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
