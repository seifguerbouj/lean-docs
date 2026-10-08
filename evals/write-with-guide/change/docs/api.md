# Orders API

Send requests to `/orders` with your key in the `x-api-key` header.

## List orders

`GET /orders` returns every order as JSON.

## Rate limits

Each API key gets 60 requests per minute, set by `RATE_LIMIT_PER_MIN`. Requests without a key are limited by IP address instead. Over the limit, the API answers `429` with a `retry-after` header in milliseconds.
