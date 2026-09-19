import test from "node:test";
import assert from "node:assert/strict";
import { apiError, apiErrorMessage } from "../src/utils/apiError.js";

test("backend fields remain available and summary includes unmapped fields", () => {
  const error={response:{data:{message:"Validation failed",fieldErrors:{name:"Name required",other:"Invalid selection"}}}};
  assert.equal(apiError(error).fieldErrors.name,"Name required");
  assert.equal(apiErrorMessage(error),"Validation failed Name required Invalid selection");
});
test("malformed responses use fallback and never stringify objects or expose internal errors", () => {
  const error={message:"SQL secret",response:{data:{message:{secret:1},fieldErrors:{a:{secret:1},b:null,c:""}}}};
  assert.deepEqual(apiError(error,"Try again"),{message:"Try again",fieldErrors:{}});
  assert.equal(apiErrorMessage({response:{data:"<html>proxy</html>"}},"Try again"),"Try again");
});
test("network and rate-limit feedback is actionable", () => {
  assert.match(apiErrorMessage({code:"ERR_NETWORK"}),/connection/);
  assert.match(apiErrorMessage({response:{status:429}}),/wait/);
});
