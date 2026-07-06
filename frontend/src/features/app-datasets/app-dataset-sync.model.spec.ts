import assert from "node:assert";
import { test } from "node:test";
import {
  nextAppDatasetRequestVersion,
  shouldApplyAppDatasetResponse,
} from "./app-dataset-sync.model";

test("app dataset sync ignores stale responses after switching apps", () => {
  const app1Request = nextAppDatasetRequestVersion(0);
  const app2Request = nextAppDatasetRequestVersion(app1Request);

  assert.strictEqual(
    shouldApplyAppDatasetResponse(app2Request, app1Request),
    false
  );
  assert.strictEqual(
    shouldApplyAppDatasetResponse(app2Request, app2Request),
    true
  );
});
