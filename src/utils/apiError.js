/** Accept the backend's public error contract, never raw Axios/internal errors. */
export function apiError(error, fallback = "Unable to complete this request.") {
  const data = error?.response?.data;
  const fieldErrors = Object.fromEntries(Object.entries(
    data?.fieldErrors && typeof data.fieldErrors === "object" && !Array.isArray(data.fieldErrors)
      ? data.fieldErrors : {},
  ).filter(([, value]) => typeof value === "string" && value.trim()));
  const status = error?.response?.status;
  const message = typeof data?.message === "string" && data.message.trim()
    ? data.message : error?.code === "ERR_NETWORK"
      ? "Unable to reach the server. Check your connection and try again."
      : status === 429 ? "Too many requests. Please wait before trying again." : fallback;
  return { message, fieldErrors };
}

export function apiErrorMessage(error, fallback) {
  const { message, fieldErrors } = apiError(error, fallback);
  const details = [...new Set(Object.values(fieldErrors))];
  return [message, ...details.filter(detail => detail !== message)].join(" ");
}
