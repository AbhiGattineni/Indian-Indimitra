// Diffs an order's original (as-placed) items against its current items so
// anyone viewing the order (customer, seller, FDM, admin) can see exactly
// what a pre-acceptance edit changed — old values struck through, next to
// the new ones.
export function diffOrderItems(originalItems = [], currentItems = []) {
  const byLineId = (list) => new Map(list.map((it) => [it.lineId, it]));
  const before = byLineId(originalItems);
  const after = byLineId(currentItems);
  const lineIds = [...new Set([...before.keys(), ...after.keys()])];

  return lineIds.map((lineId) => {
    const b = before.get(lineId);
    const a = after.get(lineId);
    if (b && !a) return { lineId, kind: 'removed', before: b, after: null };
    if (!b && a) return { lineId, kind: 'added', before: null, after: a };
    const changed = b.qty !== a.qty
      || b.grams !== a.grams
      || (b.instructions || '') !== (a.instructions || '');
    return { lineId, kind: changed ? 'changed' : 'unchanged', before: b, after: a };
  });
}

export function orderWasEdited(originalItems, currentItems) {
  if (!originalItems) return false;
  return diffOrderItems(originalItems, currentItems).some((d) => d.kind !== 'unchanged');
}
