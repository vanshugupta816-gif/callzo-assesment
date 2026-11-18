
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { getAccounts } from "../api/accountApi";

const PAGE_SIZE = 10;
const REFRESH_INTERVAL = 30000;

const SORTABLE_COLUMNS = [
  { key: "name", label: "Account Name" },
  { key: "company", label: "Company" },
  { key: "country", label: "Country" },
  { key: "plan", label: "Plan" },
  { key: "status", label: "Status" },
  {
    key: "current_month_minutes",
    label: "Minutes",
  },
  {
    key: "current_month_sms",
    label: "SMS",
  },
  { key: "cost_cents", label: "Cost" },
];

const Accounts = ({
  dateFrom = "",
  dateTo = "",
  onEditAccount,
}) => {
  // Search
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Filters
  const [status, setStatus] = useState("");
  const [country, setCountry] = useState("");
  const [plan, setPlan] = useState("");

  // Sorting
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  // Pagination
  const [page, setPage] = useState(1);

  // API data
  const [accounts, setAccounts] = useState([]);
  const [total, setTotal] = useState(0);

  // Request states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  // Selection persists across pages and refreshes
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  // Request and selection references
  const hasLoadedRef = useRef(false);
  const lastSuccessfulQueryRef = useRef(null);
  const selectAllRef = useRef(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [status, country, plan, dateFrom, dateTo]);

  // Prepare the API query
  const queryParams = useMemo(
    () => ({
      page,
      page_size: PAGE_SIZE,
      search: debouncedSearch,
      status,
      country,
      plan,
      date_from: dateFrom,
      date_to: dateTo,
      sort_by: sortBy,
      sort_dir: sortDir,
    }),
    [
      page,
      debouncedSearch,
      status,
      country,
      plan,
      dateFrom,
      dateTo,
      sortBy,
      sortDir,
    ]
  );

  const queryKey = JSON.stringify(queryParams);

  // Fetch and periodically refresh accounts
  useEffect(() => {
    let disposed = false;
    let timer = null;
    let activeController = null;

    const loadAccounts = async () => {
      const controller = new AbortController();
      activeController = controller;

      if (hasLoadedRef.current) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const result = await getAccounts(
          queryParams,
          controller.signal
        );

        if (disposed || controller.signal.aborted) {
          return;
        }

        if (
          !Array.isArray(result.data) ||
          !Number.isFinite(Number(result.total))
        ) {
          throw new Error("Invalid account API response");
        }

        const preserveOrder =
          lastSuccessfulQueryRef.current === queryKey;

        if (preserveOrder) {
          // Update existing rows using their IDs.
          // Keep their previous order during background refresh.
          setAccounts((previous) => {
            const refreshedMap = new Map(
              result.data.map((item) => [
                String(item.id),
                item,
              ])
            );

            const existingIds = new Set(
              previous.map((item) => String(item.id))
            );

            const updatedRows = previous.map(
              (oldAccount) =>
                refreshedMap.get(String(oldAccount.id)) ??
                oldAccount
            );

            // Include newly returned records without
            // changing the order of existing records.
            const newRows = result.data.filter(
              (item) =>
                !existingIds.has(String(item.id))
            );

            return [...updatedRows, ...newRows].slice(
              0,
              PAGE_SIZE
            );
          });
        } else {
          // Search, filtering, sorting or page changed.
          // Use the new server ordering.
          setAccounts(result.data);
        }

        setTotal(Number(result.total));

        lastSuccessfulQueryRef.current = queryKey;
        hasLoadedRef.current = true;
        setHasLoaded(true);

      } catch (err) {
        if (
          disposed ||
          err.name === "AbortError" ||
          controller.signal.aborted
        ) {
          return;
        }

        setError(
          err.message || "Unable to load account information."
        );

        // Keep the previous account records.
        // Do not clear the table after a failed refresh.

      } finally {
        if (!disposed && !controller.signal.aborted) {
          setLoading(false);
          setRefreshing(false);

          // Schedule only after the previous request finishes.
          timer = setTimeout(
            loadAccounts,
            REFRESH_INTERVAL
          );
        }
      }
    };

    loadAccounts();

    return () => {
      disposed = true;

      if (timer) {
        clearTimeout(timer);
      }

      activeController?.abort();
    };

  }, [queryParams, queryKey, retryCount]);

  // Sorting handler
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir((previous) =>
        previous === "asc" ? "desc" : "asc"
      );
    } else {
      setSortBy(field);
      setSortDir("asc");
    }

    setPage(1);
  };

  // Current page account IDs
  const currentPageIds = useMemo(
    () => accounts.map((account) => account.id),
    [accounts]
  );

  const allSelected =
    currentPageIds.length > 0 &&
    currentPageIds.every((id) => selectedIds.has(id));

  const someSelected = currentPageIds.some(
    (id) => selectedIds.has(id)
  );

  // Native indeterminate checkbox state
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        someSelected && !allSelected;
    }
  }, [someSelected, allSelected]);

  // Toggle one account
  const toggleSelection = (id) => {
    setSelectedIds((previous) => {
      const updated = new Set(previous);

      if (updated.has(id)) {
        updated.delete(id);
      } else {
        updated.add(id);
      }

      return updated;
    });
  };

  // Select or deselect only the current page
  const toggleCurrentPage = () => {
    setSelectedIds((previous) => {
      const updated = new Set(previous);

      if (allSelected) {
        currentPageIds.forEach((id) => updated.delete(id));
      } else {
        currentPageIds.forEach((id) => updated.add(id));
      }

      return updated;
    });
  };

  // Clear all selections
  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Clear filters
  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatus("");
    setCountry("");
    setPlan("");
    setPage(1);
  };

  const handleRetry = () => {
    setRetryCount((previous) => previous + 1);
  };

  const totalPages = Math.max(
    1,
    Math.ceil(total / PAGE_SIZE)
  );

  const showingPreviousQuery =
    hasLoaded &&
    lastSuccessfulQueryRef.current !== queryKey;

  const formatCost = (value) => {
    const cents = Number(value) || 0;
    return (cents / 100).toFixed(2);
  };

  return (
    <section
      id="accounts"
      className="min-w-0 space-y-5 scroll-mt-4"
      aria-labelledby="accounts-heading"
      aria-busy={loading || refreshing}
    >
      {/* Page heading */}
      <div>
        <h2
          id="accounts-heading"
          className="text-xl sm:text-2xl font-bold text-gray-800"
        >
          Account Management
        </h2>

        <p className="text-sm text-gray-500 mt-1">
          Search, filter and manage account usage.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 sm:p-5 rounded-xl
        border border-gray-200">

        <div className="grid grid-cols-1 sm:grid-cols-2
          xl:grid-cols-4 gap-4">

          <div className="min-w-0">
            <label
              htmlFor="account-search"
              className="block text-xs font-medium
                text-gray-600 mb-1"
            >
              Search accounts
            </label>

            <input
              id="account-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, email or company..."
              className="w-full min-w-0 border rounded-lg
                px-3 py-2.5 text-sm
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-blue-600"
            />
          </div>

          <div>
            <label
              htmlFor="account-status"
              className="block text-xs font-medium
                text-gray-600 mb-1"
            >
              Status
            </label>

            <select
              id="account-status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="w-full border rounded-lg
                px-3 py-2.5 text-sm bg-white
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-blue-600"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="account-country"
              className="block text-xs font-medium
                text-gray-600 mb-1"
            >
              Country
            </label>

            <select
              id="account-country"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              className="w-full border rounded-lg
                px-3 py-2.5 text-sm bg-white
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-blue-600"
            >
              <option value="">All Countries</option>
              <option value="IN">India</option>
              <option value="US">United States</option>
              <option value="GB">United Kingdom</option>
              <option value="CA">Canada</option>
              <option value="AU">Australia</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="account-plan"
              className="block text-xs font-medium
                text-gray-600 mb-1"
            >
              Plan
            </label>

            <select
              id="account-plan"
              value={plan}
              onChange={(event) => setPlan(event.target.value)}
              className="w-full border rounded-lg
                px-3 py-2.5 text-sm bg-white
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-blue-600"
            >
              <option value="">All Plans</option>
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

        </div>

        <button
          type="button"
          onClick={clearFilters}
          className="mt-4 text-sm text-blue-600
            hover:underline rounded
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-blue-600"
        >
          Clear table filters
        </button>
      </div>

      {/* Account table container */}
      <div className="bg-white rounded-xl border
        border-gray-200 shadow-sm min-w-0">

        <div className="p-4 sm:p-5 flex flex-col
          sm:flex-row sm:justify-between
          sm:items-center gap-3">

          <div>
            <h3 className="font-bold text-lg">
              All Accounts
            </h3>

            <p className="text-sm text-gray-500 mt-1">
              {total.toLocaleString()} total accounts
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-blue-600">
              {selectedIds.size} selected across pages
            </span>

            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={clearSelection}
                className="text-sm text-gray-600 underline
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-blue-600"
              >
                Clear selection
              </button>
            )}
          </div>
        </div>

        {/* Initial loading */}
        {loading && !hasLoaded && (
          <div
            className="min-h-[360px] flex items-center
              justify-center"
            role="status"
            aria-live="polite"
          >
            <p className="text-blue-600">
              Loading accounts...
            </p>
          </div>
        )}

        {/* Background refresh */}
        {refreshing && (
          <div
            className="px-5 py-3 text-sm text-blue-600
              bg-blue-50"
            role="status"
            aria-live="polite"
          >
            Updating account information. Your selection
            and current page are being preserved.
          </div>
        )}

        {/* Error with existing records */}
        {error && accounts.length > 0 && (
          <div
            className="mx-4 sm:mx-5 my-4 p-4
              bg-yellow-50 border border-yellow-200
              rounded-lg"
            role="alert"
          >
            <p className="font-medium text-yellow-800">
              Account refresh failed.
            </p>

            <p className="text-sm text-yellow-700 mt-1">
              {showingPreviousQuery
                ? "The displayed records belong to the last successful query. The new results could not be loaded."
                : "Previously loaded records are still displayed."}
              {" "}
              {error}
            </p>

            <button
              type="button"
              onClick={handleRetry}
              className="mt-3 text-sm font-semibold
                text-yellow-800 underline
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-yellow-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Initial API error */}
        {error && accounts.length === 0 && !loading && (
          <div
            className="min-h-[280px] flex flex-col
              items-center justify-center p-5"
            role="alert"
          >
            <h3 className="font-semibold text-red-700">
              Unable to load accounts
            </h3>

            <p className="text-sm text-gray-600 mt-2 text-center">
              {error}
            </p>

            <button
              type="button"
              onClick={handleRetry}
              className="mt-4 px-4 py-2 bg-blue-600
                text-white rounded-lg
                hover:bg-blue-700
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-blue-600
                focus-visible:ring-offset-2"
            >
              Retry Request
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && hasLoaded && accounts.length === 0 && (
          <div className="min-h-[280px] flex items-center
            justify-center p-6 text-center">
            <div>
              <p className="text-lg font-semibold text-gray-700">
                No accounts found
              </p>

              <p className="text-sm text-gray-500 mt-2">
                Try changing your search or removing some filters.
              </p>

              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 text-blue-600 text-sm underline
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-blue-600"
              >
                Clear filters
              </button>
            </div>
          </div>
        )}

        {/* Account table */}
        {accounts.length > 0 && (
          <>
            <div
              className="overflow-x-auto min-h-[360px]"
              role="region"
              aria-label="Account records table. Scroll horizontally to see all columns."
              tabIndex={0}
            >
              <table className="w-full min-w-[1130px]
                table-fixed text-sm text-left">

                <colgroup>
                  <col style={{ width: "48px" }} />
                  <col style={{ width: "190px" }} />
                  <col style={{ width: "150px" }} />
                  <col style={{ width: "90px" }} />
                  <col style={{ width: "110px" }} />
                  <col style={{ width: "105px" }} />
                  <col style={{ width: "110px" }} />
                  <col style={{ width: "90px" }} />
                  <col style={{ width: "100px" }} />
                  <col style={{ width: "135px" }} />
                </colgroup>

                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th scope="col" className="p-4">
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleCurrentPage}
                        aria-label="Select all accounts on this page"
                        className="w-4 h-4 accent-blue-600
                          focus-visible:outline-none
                          focus-visible:ring-2
                          focus-visible:ring-blue-600"
                      />
                    </th>

                    {SORTABLE_COLUMNS.map((column) => {
                      const active = sortBy === column.key;

                      const ariaSort = !active
                        ? "none"
                        : sortDir === "asc"
                          ? "ascending"
                          : "descending";

                      return (
                        <th
                          key={column.key}
                          scope="col"
                          aria-sort={ariaSort}
                          className="p-4 font-semibold"
                        >
                          <button
                            type="button"
                            onClick={() => handleSort(column.key)}
                            aria-label={`Sort by ${column.label}${
                              active
                                ? `, currently ${sortDir}ending`
                                : ""
                            }`}
                            className="text-left whitespace-nowrap
                              hover:text-blue-600
                              focus-visible:outline-none
                              focus-visible:ring-2
                              focus-visible:ring-blue-600
                              focus-visible:rounded"
                          >
                            {column.label}
                            {active && (
                              <span aria-hidden="true">
                                {sortDir === "asc" ? " ↑" : " ↓"}
                              </span>
                            )}
                          </button>
                        </th>
                      );
                    })}

                    <th scope="col" className="p-4">
                      Settings
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {accounts.map((account) => {
                    const selected = selectedIds.has(account.id);

                    return (
                      <tr
                        key={account.id}
                        className={`border-t transition-colors
                          ${
                            selected
                              ? "bg-blue-50"
                              : "hover:bg-gray-50"
                          }`}
                      >
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() =>
                              toggleSelection(account.id)
                            }
                            aria-label={`Select ${account.name}`}
                            className="w-4 h-4 accent-blue-600
                              focus-visible:outline-none
                              focus-visible:ring-2
                              focus-visible:ring-blue-600"
                          />
                        </td>

                        <td className="p-4">
                          <div className="font-medium text-gray-800
                            truncate">
                            {account.name}
                          </div>

                          <div className="text-xs text-gray-500
                            truncate mt-1">
                            {account.email}
                          </div>
                        </td>

                        <td className="p-4 truncate">
                          {account.company}
                        </td>

                        <td className="p-4">
                          {account.country}
                        </td>

                        <td className="p-4 capitalize">
                          {account.plan}
                        </td>

                        <td className="p-4">
                          <span
                            className={`inline-block px-2.5 py-1
                              rounded-full text-xs font-medium ${
                                account.status === "active"
                                  ? "bg-green-100 text-green-700"
                                  : account.status === "trial"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-red-100 text-red-700"
                              }`}
                          >
                            {account.status}
                          </span>
                        </td>

                        <td className="p-4 tabular-nums">
                          {Number(
                            account.current_month_minutes || 0
                          ).toLocaleString()}
                        </td>

                        <td className="p-4 tabular-nums">
                          {Number(
                            account.current_month_sms || 0
                          ).toLocaleString()}
                        </td>

                        <td className="p-4 tabular-nums">
                          {formatCost(account.cost_cents)}
                        </td>

                        <td className="p-4">
                          <button
                            type="button"
                            onClick={() =>
                              onEditAccount?.(account.id)
                            }
                            className="text-blue-600 font-medium
                              hover:underline
                              focus-visible:outline-none
                              focus-visible:ring-2
                              focus-visible:ring-blue-600
                              focus-visible:rounded"
                          >
                            Edit Settings
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-4 sm:p-5 border-t
              flex flex-col sm:flex-row
              items-center justify-between gap-4">

              <p
                className="text-sm text-gray-500 text-center sm:text-left"
                aria-live="polite"
              >
                Showing {(page - 1) * PAGE_SIZE + 1}
                {" "}to{" "}
                {Math.min(page * PAGE_SIZE, total)}
                {" "}of {total.toLocaleString()} accounts
              </p>

              <div className="flex items-center gap-2">

                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() =>
                    setPage((previous) => Math.max(1, previous - 1))
                  }
                  aria-label="Go to previous page"
                  className="px-3 sm:px-4 py-2 border rounded-lg
                    text-sm disabled:opacity-40
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-blue-600"
                >
                  Previous
                </button>

                <span
                  className="text-sm text-gray-600
                    whitespace-nowrap"
                  aria-label={`Page ${page} of ${totalPages}`}
                >
                  {page} / {totalPages}
                </span>

                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() =>
                    setPage((previous) =>
                      Math.min(totalPages, previous + 1)
                    )
                  }
                  aria-label="Go to next page"
                  className="px-3 sm:px-4 py-2 border rounded-lg
                    text-sm disabled:opacity-40
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-blue-600"
                >
                  Next
                </button>

              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default Accounts;
