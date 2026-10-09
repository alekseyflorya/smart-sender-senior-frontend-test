export function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={active ? 'badge badge-active' : 'badge'}>
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}
