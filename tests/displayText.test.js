import test from "node:test";
import assert from "node:assert/strict";
import { formatTimestamp, notificationLabel } from "../src/utils/displayText.js";

test("known notification types have readable labels and unknown types stay generic",()=>{
  assert.equal(notificationLabel("NEW_MESSAGE"),"New message");
  assert.equal(notificationLabel("FRIEND_REQUEST_ACCEPTED"),"Friend request accepted");
  assert.equal(notificationLabel("PRIVATE_INTERNAL_NAME"),"Activity");
});
test("invalid or missing timestamps never render Invalid Date",()=>{
  for(const value of [undefined,null,"","nonsense","2026-02-31T10:00:00"]) assert.equal(formatTimestamp(value),"—");
});
test("offset-free clock fields are preserved across viewer timezones",()=>{
  const previous=process.env.TZ;
  try {
    process.env.TZ="America/New_York";
    const us=formatTimestamp("2026-09-19T10:15:00",true,"en-GB");
    process.env.TZ="Asia/Kolkata";
    assert.equal(formatTimestamp("2026-09-19T10:15:00",true,"en-GB"),us);
    assert.equal(us,"10:15");
    assert.equal(formatTimestamp("2026-09-19T10:15:00Z",true,"en-GB"),"15:45");
  } finally { if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous; }
});
