
import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { getAccountSummary } from "../api/accountApi";

const REFRESH_INTERVAL = 30000;

const UsageChart = ({
  dateFrom = "",
  dateTo = "",
  onSummaryChange,
}) => {
  const [chartData, setChartData] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  const lastSuccessfulQueryRef = useRef(null);

  const queryKey = JSON.stringify({
    dateFrom,
    dateTo,
  });

  useEffect(() => {
    let disposed = false;
    let timer = null;
    let activeController = null;

    const loadChartData = async () => {
      const controller = new AbortController();

      activeController = controller;

      const sameQuery =
        lastSuccessfulQueryRef.current === queryKey;

      if (!sameQuery) {
        setChartData([]);
        setLoading(true);
        onSummaryChange?.(null);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const result = await getAccountSummary(
          {
            date_from: dateFrom,
            date_to: dateTo,
          },
          controller.signal
        );

        if (disposed || controller.signal.aborted) {
          return;
        }

        if (!Array.isArray(result.series)) {
          throw new Error("Invalid summary API response");
        }

        const series = result.series;

        // Calculate summary values using real API data
        const totals = series.reduce(
          (acc, item) => ({
            minutes:
              acc.minutes + (Number(item.minutes) || 0),

            sms:
              acc.sms + (Number(item.sms) || 0),

            signups:
              acc.signups + (Number(item.signups) || 0),
          }),
          {
            minutes: 0,
            sms: 0,
            signups: 0,
          }
        );

        setChartData(series);

        onSummaryChange?.({
          totalAccounts: Number(result.total_accounts) || 0,
          ...totals,
        });

        lastSuccessfulQueryRef.current = queryKey;

      } catch (err) {
        if (
          disposed ||
          err.name === "AbortError" ||
          controller.signal.aborted
        ) {
          return;
        }

        setError(
          err.message || "Unable to load usage analytics."
        );

      } finally {
        if (!disposed && !controller.signal.aborted) {
          setLoading(false);

          // Schedule next refresh only after request completes
          timer = setTimeout(
            loadChartData,
            REFRESH_INTERVAL
          );
        }
      }
    };

    loadChartData();

    return () => {
      disposed = true;

      if (timer) {
        clearTimeout(timer);
      }

      activeController?.abort();
    };

  }, [
    dateFrom,
    dateTo,
    queryKey,
    retryCount,
    onSummaryChange,
  ]);

  const formatDate = (value) => {
    if (!value) return "";

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
  };

  const formatValue = (value) =>
    Number(value).toLocaleString("en-IN");

  const retryRequest = () => {
    setRetryCount((previous) => previous + 1);
  };

  const ChartLoading = () => (
    <div className="h-[250px] flex items-center justify-center">
      <p className="text-sm text-blue-600" role="status">
        Loading chart...
      </p>
    </div>
  );

  const ChartError = () => (
    <div
      className="h-[250px] flex flex-col
        items-center justify-center text-center p-4"
      role="alert"
    >
      <p className="text-red-600 font-medium">
        Unable to load chart data.
      </p>

      <p className="text-xs text-gray-500 mt-2">
        {error}
      </p>

      <button
        type="button"
        onClick={retryRequest}
        className="text-sm text-blue-600
          underline mt-3"
      >
        Retry
      </button>
    </div>
  );

  const ChartEmpty = () => (
    <div className="h-[250px] flex items-center
      justify-center text-center p-4">
      <p className="text-sm text-gray-500">
        No usage data available for this date range.
      </p>
    </div>
  );

  return (
    <div className="space-y-4">

      {/* Section heading */}
      <div className="flex justify-between items-center gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-800">
            Usage Analytics
          </h2>

          <p className="text-xs text-gray-500 mt-1">
            Monitor daily call and SMS consumption.
          </p>
        </div>

        {loading && chartData.length > 0 && (
          <span
            className="text-xs text-blue-600"
            role="status"
          >
            Refreshing...
          </span>
        )}
      </div>

      {/* Independent chart panels */}
      <div className="grid grid-cols-1
        xl:grid-cols-[1.35fr_1fr] gap-4">

        {/* Call minutes chart */}
        <section className="bg-white border
          border-gray-200 rounded-xl shadow-sm
          p-4 sm:p-5 min-w-0">

          <div className="flex items-center gap-2 mb-4">
            <span
              className="text-blue-600 text-lg"
              aria-hidden="true"
            >
              ◷
            </span>

            <h3 className="text-sm font-semibold text-gray-800">
              Daily Call Minutes
            </h3>
          </div>

          {loading && chartData.length === 0 ? (
            <ChartLoading />
          ) : error && chartData.length === 0 ? (
            <ChartError />
          ) : chartData.length === 0 ? (
            <ChartEmpty />
          ) : (
            <div
              className="w-full h-[250px] min-w-0"
              role="img"
              aria-label="Daily call minutes line chart"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{
                    top: 10,
                    right: 10,
                    left: -15,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid
                    stroke="#e5e7eb"
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    minTickGap={25}
                  />

                  <YAxis
                    tickFormatter={(value) =>
                      Number(value).toLocaleString("en-IN")
                    }
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    width={48}
                  />

                  <Tooltip
                    labelFormatter={formatDate}
                    formatter={(value) => [
                      formatValue(value),
                      "Minutes",
                    ]}
                  />

                  <Line
                    type="monotone"
                    dataKey="minutes"
                    name="Call Minutes"
                    stroke="#0f766e"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{
                      r: 5,
                      fill: "#0f766e",
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {error && chartData.length > 0 && (
            <div className="mt-3 bg-yellow-50
              rounded-lg p-3 text-xs text-yellow-800"
              role="alert"
            >
              Previous chart data is displayed.
              <button
                type="button"
                onClick={retryRequest}
                className="ml-2 underline font-semibold"
              >
                Retry
              </button>
            </div>
          )}

        </section>

        {/* SMS usage chart */}
        <section className="bg-white border
          border-gray-200 rounded-xl shadow-sm
          p-4 sm:p-5 min-w-0">

          <div className="flex items-center gap-2 mb-4">
            <span
              className="text-purple-600 text-lg"
              aria-hidden="true"
            >
              ✉
            </span>

            <h3 className="text-sm font-semibold text-gray-800">
              Daily SMS Usage
            </h3>
          </div>

          {loading && chartData.length === 0 ? (
            <ChartLoading />
          ) : error && chartData.length === 0 ? (
            <ChartError />
          ) : chartData.length === 0 ? (
            <ChartEmpty />
          ) : (
            <div
              className="w-full h-[250px] min-w-0"
              role="img"
              aria-label="Daily SMS usage bar chart"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{
                    top: 10,
                    right: 10,
                    left: -15,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid
                    stroke="#e5e7eb"
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    minTickGap={25}
                  />

                  <YAxis
                    tickFormatter={(value) =>
                      Number(value).toLocaleString("en-IN")
                    }
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    width={48}
                  />

                  <Tooltip
                    labelFormatter={formatDate}
                    formatter={(value) => [
                      formatValue(value),
                      "SMS",
                    ]}
                  />

                  <Bar
                    dataKey="sms"
                    name="SMS Usage"
                    fill="#0f766e"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={26}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {error && chartData.length > 0 && (
            <div className="mt-3 bg-yellow-50
              rounded-lg p-3 text-xs text-yellow-800"
              role="alert"
            >
              Previous chart data is displayed.
              <button
                type="button"
                onClick={retryRequest}
                className="ml-2 underline font-semibold"
              >
                Retry
              </button>
            </div>
          )}

        </section>

      </div>
    </div>
  );
};

export default UsageChart;
