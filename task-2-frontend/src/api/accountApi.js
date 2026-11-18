
import API_BASE_URL from "./api";

// ==================================================
// BUILD QUERY PARAMETERS
// ==================================================

const buildQueryParams = (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== "" &&
      value !== null &&
      value !== undefined
    ) {
      query.append(key, value);
    }
  });

  return query.toString();
};

// ==================================================
// COMMON JSON REQUEST HELPER
// ==================================================

export const requestJSON = async (url, options = {}) => {
  let response;

  try {
    response = await fetch(url, {
      ...options,

      headers: {
        ...(options.body
          ? { "Content-Type": "application/json" }
          : {}),

        ...options.headers,
      },
    });
  } catch (error) {
    // Preserve cancellation errors
    if (error.name === "AbortError") {
      throw error;
    }

    throw new Error(
      "Network error. Please check your connection and retry."
    );
  }

  // Safely read the response body
  let result = {};

  try {
    result = (await response.json()) || {};
  } catch {
    // The response may be empty or contain invalid JSON.
    result = {};
  }

  // Handle unsuccessful HTTP responses
  if (!response.ok) {
    const detail = result.detail;

    const message =
      typeof detail === "string"
        ? detail
        : `Request failed with HTTP ${response.status}`;

    const error = new Error(message);

    error.status = response.status;
    error.payload = result;

    // Preserve field validation errors for the form
    error.fieldErrors =
      detail?.errors || result.errors || {};

    throw error;
  }

  return result;
};

// ==================================================
// GET ALL ACCOUNTS
// ==================================================

export const getAccounts = async (params = {}, signal) => {
  const query = buildQueryParams(params);

  const url = query
    ? `${API_BASE_URL}/accounts?${query}`
    : `${API_BASE_URL}/accounts`;

  const result = await requestJSON(url, {
    signal,
  });

  return result;
};

// ==================================================
// GET ACCOUNT SUMMARY
// ==================================================

export const getAccountSummary = async (
  params = {},
  signal
) => {
  const query = buildQueryParams(params);

  const url = query
    ? `${API_BASE_URL}/accounts/summary?${query}`
    : `${API_BASE_URL}/accounts/summary`;

  const result = await requestJSON(url, {
    signal,
  });

  return result;
};

// ==================================================
// GET SINGLE ACCOUNT
// ==================================================

export const getAccount = async (accountId, signal) => {
  return requestJSON(
    `${API_BASE_URL}/accounts/${accountId}`,
    {
      signal,
    }
  );
};

// ==================================================
// GET ACCOUNT SETTINGS / SAVED DRAFTS
// ==================================================

export const getAccountSettings = async (
  accountId,
  signal
) => {
  return requestJSON(
    `${API_BASE_URL}/accounts/${accountId}/settings`,
    {
      signal,
    }
  );
};

// ==================================================
// SAVE INDIVIDUAL SETTINGS STEP
// ==================================================

export const saveAccountSettingsStep = async (
  accountId,
  step,
  data
) => {
  return requestJSON(
    `${API_BASE_URL}/accounts/${accountId}/settings/step/${step}`,
    {
      method: "PUT",

      body: JSON.stringify({
        data,
      }),
    }
  );
};

// ==================================================
// SUBMIT FINAL ACCOUNT SETTINGS
// ==================================================

export const submitAccountSettings = async (accountId) => {
  return requestJSON(
    `${API_BASE_URL}/accounts/${accountId}/settings/submit`,
    {
      method: "POST",
    }
  );
};
