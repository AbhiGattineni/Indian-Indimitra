import { useEffect, useState } from 'react';
import {
  Box, Typography, TextField, Button, List, ListItem, ListItemText, IconButton, Paper,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { listCategories, createCategory, deleteCategory } from '../../firebase/db';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');

  const load = async () => setCategories(await listCategories());
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!name.trim()) return;
    await createCategory(name.trim());
    setName('');
    load();
  };
  const remove = async (id) => { await deleteCategory(id); load(); };

  return (
    <Box sx={{ maxWidth: 480 }}>
      <Typography variant="h5" gutterBottom>Categories</Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField size="small" label="New category" value={name}
          onChange={(e) => setName(e.target.value)} fullWidth />
        <Button variant="contained" onClick={add}>Add</Button>
      </Box>
      <Paper variant="outlined">
        <List>
          {categories.map((c) => (
            <ListItem key={c.id}
              secondaryAction={<IconButton onClick={() => remove(c.id)}><DeleteIcon /></IconButton>}>
              <ListItemText primary={c.name} />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Box>
  );
}
