import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Paper, Typography, TextField, Button, Divider, Alert, Stack, Tabs, Tab, Link,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { signInWithGoogle, signInWithEmail, registerWithEmail, resetPassword } from '../../firebase/auth';
import { useAuthStore } from '../../store/useAuthStore';
import { ROLES } from '../../lib/constants';

// Firebase (with email-enumeration protection on, the project default) folds
// "wrong password" and "no such account" into one auth/invalid-credential
// code, so we can't tell a first-time visitor "you don't have an account" —
// only offer both paths (retry, or create one) without asserting which is true.
function authErrorMessage(error, onSignIn) {
  const code = error?.code;
  if (onSignIn && (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password')) {
    return "That email/password didn't work. Double-check them. If you usually sign in with Google, use Continue with Google, or tap Forgot password to set a password. New here? Create an account.";
  }
  if (!onSignIn && code === 'auth/email-already-in-use') {
    return 'An account already exists for that email — sign in instead.';
  }
  if (code === 'auth/weak-password') {
    return 'Password should be at least 6 characters.';
  }
  if (code === 'auth/invalid-email' || code === 'auth/missing-email') {
    return 'Enter a valid email address.';
  }
  if (code === 'auth/missing-password') {
    return 'Enter your password.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many attempts. Wait a few minutes, or tap Forgot password.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Network problem. Check your connection and try again.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Email sign-in is turned off for this site right now. Please use Continue with Google. (auth/operation-not-allowed)';
  }
  // Keep the code visible so a screenshot tells us what went wrong.
  return `Something went wrong. Please try again.${code ? ` (${code})` : ''}`;
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
  const [info, setInfo] = useState('');

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
    setInfo('');
  };

  const handleForgot = async () => {
    setError('');
    setInfo('');
    if (!email.trim()) { setError('Enter your email above first, then tap Forgot password.'); return; }
    setBusy(true);
    try {
      await resetPassword(email);
      setInfo(`If an account exists for ${email.trim()}, a password reset link is on its way. Check your inbox and spam folder.`);
    } catch (e) {
      setError(authErrorMessage(e, false));
    } finally {
      setBusy(false);
    }
  };

  const handleEmail = async (e) => {
    e?.preventDefault();
    setError('');
    setInfo('');
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

        <Stack spacing={2} component="form" onSubmit={handleEmail} noValidate>
          {tab === 1 && (
            <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
          )}
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            autoComplete="email"
            inputProps={{ autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false }}
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            autoComplete={tab === 0 ? 'current-password' : 'new-password'}
          />
          {tab === 0 && (
            <Box sx={{ textAlign: 'right', mt: '-8px !important' }}>
              <Link component="button" type="button" variant="body2" onClick={handleForgot} disabled={busy}>
                Forgot password?
              </Link>
            </Box>
          )}
          {info && <Alert severity="success">{info}</Alert>}
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
          <Button variant="contained" type="submit" disabled={busy}>
            {tab === 0 ? 'Sign in' : 'Create account'}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
