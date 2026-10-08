import { db } from '../../db';
import type { Invoice, InvoiceFilters } from '../../types';

const MAX_ROWS = Number(process.env.EXPORT_MAX_ROWS ?? 10000);

export async function exportInvoices(filters: InvoiceFilters) {
  const count = await db.invoices.count(filters);
  if (count > MAX_ROWS) return new Response('too_many_rows', { status: 413 });
  const rows = (await db.invoices.findMany(filters)).map(toCsvRow);
  const header = 'id,customer,amount,currency,status,issuedAt';
  return new Response([header, ...rows].join('\n'), { headers: { 'content-type': 'text/csv' } });
}

// Dates are written as ISO strings in UTC.
export function toCsvRow(i: Invoice) {
  const cells = [i.id, i.customer, i.amount, i.currency, i.status, i.issuedAt.toISOString()];
  return cells.map((c) => (/[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : String(c))).join(',');
}
