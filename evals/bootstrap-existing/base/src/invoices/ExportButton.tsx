export function ExportButton({ filters }: { filters: Record<string, string> }) {
  async function onClick() {
    const res = await fetch('/api/invoices/export?' + new URLSearchParams(filters));
    if (res.status === 413) return alert('Too many invoices, narrow your filters');
    const url = URL.createObjectURL(await res.blob());
    Object.assign(document.createElement('a'), { href: url, download: 'invoices.csv' }).click();
  }
  return <button onClick={onClick}>Export CSV</button>;
}
