// Bot sign-up filter. Gmail ignores dots in the address, so spammers create
// endless "different" accounts like x.at.ici.y.aso.1.74@gmail.com that all
// land in one inbox. A Gmail address with 4+ dots is treated as fake.
// Keep in sync with isSuspiciousEmail() in firestore.rules (which is what
// actually enforces it, since bots can call Firebase directly).
const SUSPICIOUS = /^([^@.]+\.){4,}[^@.]*@(gmail|googlemail)\.com$/;

export const isSuspiciousEmail = (email) => SUSPICIOUS.test((email || '').trim().toLowerCase());
