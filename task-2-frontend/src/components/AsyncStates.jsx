
export const LoadingState = ({ message = "Loading..." }) => (
  <div
    role="status"
    className="flex items-center justify-center p-10 text-sm text-blue-600"
  >
    {message}
  </div>
);

export const EmptyState = ({
  title = "No data found",
  message = "Try changing your filters.",
}) => (
  <div className="flex flex-col items-center justify-center p-12 text-center">
    <div className="mb-3 text-4xl text-slate-300">↗</div>
    <h3 className="font-semibold text-slate-700">{title}</h3>
    <p className="mt-2 text-sm text-slate-500">{message}</p>
  </div>
);

export const ErrorState = ({
  message,
  onRetry,
  retrying = false,
}) => (
  <div
    role="alert"
    className="rounded-xl border border-red-200 bg-red-50 p-5"
  >
    <h3 className="font-semibold text-red-700">
      Unable to load accounts
    </h3>

    <p className="mt-2 text-sm text-red-600">{message}</p>

    <button
      type="button"
      onClick={onRetry}
      disabled={retrying}
      className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
    >
      {retrying ? "Retrying..." : "Retry"}
    </button>
  </div>
);

export const PartialFailure = ({ message, onRetry }) => (
  <div
    role="alert"
    className="flex flex-col gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-5 sm:flex-row sm:items-center sm:justify-between"
  >
    <div>
      <h3 className="font-semibold text-yellow-800">
        Refresh unsuccessful
      </h3>
      <p className="mt-1 text-sm text-yellow-700">{message}</p>
    </div>

    <button
      type="button"
      onClick={onRetry}
      className="shrink-0 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700"
    >
      Retry
    </button>
  </div>
);
