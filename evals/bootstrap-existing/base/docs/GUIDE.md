# shop-api guide

## Rate limiting

Every API key gets 100 requests per minute. Requests without a key are rejected with 401.
When a key goes over the limit the server answers 429 and sets `retry-after`.

## Invoice export

The Export CSV button downloads the invoices matching the current filters.
Exports over 10,000 rows are refused with a 413. Dates are in UTC.
