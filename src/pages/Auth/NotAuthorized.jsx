import { Box, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';

export default function NotAuthorized() {
  return (
    <Box sx={{ textAlign: 'center', mt: 10 }}>
      <Typography variant="h4" gutterBottom>
        Not authorized
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Your account doesn&apos;t have access to this page.
      </Typography>
      <Button variant="contained" component={Link} to="/">
        Back to browse
      </Button>
    </Box>
  );
}
