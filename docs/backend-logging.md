# Backend Logging

PR 1 establishes a single backend logger based on `nestjs-pino`.

## Defaults

- Development uses pretty, single-line logs.
- Production uses structured JSON logs.
- `LOG_LEVEL` controls verbosity. Default: `debug` in development, `info` in production.
- `LOG_PRETTY=true|false` forces pretty logging on or off.
- `LOG_SERVICE_NAME` overrides the default `mini-dify-backend` service name.

## Required Fields

Every backend log line should include these base fields:

- `timestamp`
- `level`
- `service`
- `env`
- `msg`

PR 2 and later will add request-scoped fields such as `requestId`, `runId`, `workflowId`, and `nodeId`.

## Redaction Rules

These fields are redacted by default:

- `req.headers.authorization`
- `req.headers.cookie`
- `req.body.apiKey`
- `req.body.password`
- `res.headers['set-cookie']`

Do not log raw API keys, cookies, or full secrets. When a future change needs more request or workflow detail, prefer summaries and identifiers over full payloads.
