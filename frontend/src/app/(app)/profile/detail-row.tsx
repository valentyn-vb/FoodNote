// One row of the Personal-details definition list (dl > div > dt + dd).
export function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-3.5 last:border-b-0">
      <dt className="font-sans text-label text-text">{label}</dt>
      <dd className="font-sans text-label text-text-muted [font-variant-numeric:tabular-nums]">
        {value}
      </dd>
    </div>
  );
}
