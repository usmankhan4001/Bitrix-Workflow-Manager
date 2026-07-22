import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';

// Shared-secret gate for the whole API surface. Bitrix's outbound webhooks
// append the key as a query param (its "Handler URL" field is free text);
// the dashboard sends it as a header via apps/dashboard/src/lib/api.ts.
//
// Intentionally permissive when WORKFLOW_API_KEY is unset — this guard ships
// disabled-by-default so deploying it doesn't itself lock anyone out. It only
// enforces once the env var is actually configured (both here and in the
// dashboard's VITE_API_KEY, and the Bitrix webhook URLs updated to include
// it — see README).
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);
  private warnedUnset = false;

  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.WORKFLOW_API_KEY;
    if (!expected) {
      if (!this.warnedUnset) {
        this.logger.warn(
          'WORKFLOW_API_KEY is not set — the API is running WITHOUT authentication. ' +
          'Set WORKFLOW_API_KEY (and the matching dashboard VITE_API_KEY + Bitrix webhook URLs) to lock it down.',
        );
        this.warnedUnset = true;
      }
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const provided = req.headers['x-api-key'] || req.query?.api_key || req.body?.api_key;

    if (provided === expected) return true;

    this.logger.warn(`Rejected unauthenticated request: ${req.method} ${req.originalUrl || req.url}`);
    return false;
  }
}
