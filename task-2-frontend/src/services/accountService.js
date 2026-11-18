
import API_BASE_URL from "./api";

// Reusable query parameter builder
const buildQueryParams = (params = {}) => {
  const queryParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== "" &&
      value !== null &&
      value !== undefined
    ) {
      queryParams.append(key, value);
    }
  });

  return queryParams.toString();
};

// Fetch account records
export const getAccounts = async (params = {}, signal) => {
  const queryString = buildQueryParams(params);

  const response = await fetch(
    `${API_BASE_URL}/accounts?${queryString}`,
    { signal }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch accounts: ${response.status}`
    );
  }

  return response.json();
};

// Fetch account usage summary
export const getAccountSummary = async (
  params = {},
  signal
) => {
  const queryString = buildQueryParams(params);

  const response = await fetch(
    `${API_BASE_URL}/accounts/summary?${queryString}`,
    { signal }
  );

  if (!response.ok) {
    throw new Error(
      `Summary API failed with status ${response.status}`
    );
  }

  return response.json();
};
