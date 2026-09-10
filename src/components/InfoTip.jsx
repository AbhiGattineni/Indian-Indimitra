// Small "i" icon that reveals extra detail on hover OR click/tap (persists
// open until dismissed, so it works on touch devices where there's no real
// hover) -- used to keep summary rows (checkout, order edit) to one line
// each, with the full explanation available on demand instead of always
// printed on screen.
import { useState } from 'react';
import { IconButton, Tooltip, ClickAwayListener, Box } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

export default function InfoTip({ title }) {
  const [open, setOpen] = useState(false);

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box component="span" sx={{ display: 'inline-flex', verticalAlign: 'middle' }}>
        <Tooltip
          title={title}
          arrow
          open={open}
          onOpen={() => setOpen(true)}
          onClose={() => setOpen(false)}
          componentsProps={{ tooltip: { sx: { maxWidth: 300, p: 1.25 } } }}
        >
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
            sx={{ p: 0.25, ml: 0.25 }}
            aria-label="More detail"
          >
            <InfoOutlinedIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </ClickAwayListener>
  );
}
