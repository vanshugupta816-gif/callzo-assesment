
const DateRangeFilter = ({
  dateFrom,
  dateTo,
  setDateFrom,
  setDateTo,
}) => {

  const clearDates = () => {
    setDateFrom("");
    setDateTo("");
  };

  return (
    <div className="w-full sm:w-auto">

      <div className="flex flex-col sm:flex-row
        sm:items-center gap-2 sm:gap-3">

        <span className="text-xs font-medium
          text-gray-500 whitespace-nowrap">
          Date Range
        </span>

        <div className="grid grid-cols-2 sm:flex
          gap-2">

          <input
            type="date"
            aria-label="Start date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full sm:w-40
              bg-white border border-gray-200
              rounded-lg px-3 py-2 text-xs
              text-gray-700
              focus-visible:ring-2
              focus-visible:ring-blue-500"
          />

          <input
            type="date"
            aria-label="End date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full sm:w-40
              bg-white border border-gray-200
              rounded-lg px-3 py-2 text-xs
              text-gray-700
              focus-visible:ring-2
              focus-visible:ring-blue-500"
          />

        </div>

        <button
          type="button"
          onClick={clearDates}
          className="px-3 py-2 text-xs
            text-gray-600 bg-white
            border border-gray-200 rounded-lg
            hover:bg-gray-50
            focus-visible:ring-2
            focus-visible:ring-blue-500"
        >
          Clear
        </button>

      </div>
    </div>
  );
};

export default DateRangeFilter;
