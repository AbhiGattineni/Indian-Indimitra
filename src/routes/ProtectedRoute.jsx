// Role-gated route guard. Reads role from the loaded Firestore profile.
// NOTE: this only controls what the UI shows. Real enforcement lives in
// firestore.rules — never rely on this guard for security.
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuthStore } from '../store/useAuthStore';

export default function ProtectedRoute({ children, allow }) {
  const { user, profile, loading } = useAuthStore();
  const location = useLocation();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // allow: undefined => any signed-in user; array/string => required role(s).
  if (allow) {
    const allowed = Array.isArray(allow) ? allow : [allow];
    if (!allowed.includes(profile?.role)) {
      return <Navigate to="/not-authorized" replace />;
    }
  }

  return children;
}
