import pino from "pino";
import { Params } from "nestjs-pino";

const DEFAULT_SERVICE_NAME = "mini-dify-backend";

function isPrettyLoggingEnabled(): boolean {
  if (process.env.LOG_PRETTY) {
    return process.env.LOG_PRETTY === "true";
  }

  return process.env.NODE_ENV !== "production";
}

export function createLoggerOptions(): Params {
  const pretty = isPrettyLoggingEnabled();

  return {
    pinoHttp: {
      level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
      autoLogging: false,
      timestamp: pino.stdTimeFunctions.isoTime,
      base: {
        service: process.env.LOG_SERVICE_NAME ?? DEFAULT_SERVICE_NAME,
        env: process.env.NODE_ENV ?? "development",
      },
      redact: {
        paths: [
          "req.headers.authorization",
          "req.headers.cookie",
          "req.body.apiKey",
          "req.body.graph.nodes[*].data.apiKey",
          "req.body.password",
          "res.headers['set-cookie']",
        ],
        censor: "[Redacted]",
      },
      formatters: {
        level: (label) => ({ level: label }),
      },
      // Request auto logging stays off for PR 1 so the foundation lands before the
      // request/response policy and correlation fields from PR 2.
      transport: pretty
        ? {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "SYS:standard",
              singleLine: true,
              ignore: "pid,hostname",
            },
          }
        : undefined,
    },
  };
}
