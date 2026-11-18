
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import SummaryCard from "../components/SummaryCard";
import DateRangeFilter from "../components/DateRangeFilter";
import UsageChart from "../components/UsageChart";

import Accounts from "./Account";
import AccountSettings from "./AccountSettings";

// Format dates for HTML date inputs
const formatDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

// Default date range: latest 30 days
const getLast30Days = () => {
  const today = new Date();

  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 29);

  return {
    dateFrom: formatDateInput(startDate),
    dateTo: formatDateInput(today),
  };
};

// Number formatting
const formatNumber = (value) => {
  if (value === null || value === undefined) {
    return "--";
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number.toLocaleString("en-US")
    : "--";
};

const Dashboard = () => {

  // Initialize with the latest 30 days
  const [initialRange] = useState(getLast30Days);

  const [dateFrom, setDateFrom] = useState(
    initialRange.dateFrom
  );

  const [dateTo, setDateTo] = useState(
    initialRange.dateTo
  );

  // Selected account
  const [selectedAccountId, setSelectedAccountId] =
    useState(null);

  // Real API summary data
  const [summary, setSummary] = useState(null);

  const mainRef = useRef(null);

  // Stable callback for receiving chart summary
  const handleSummaryChange = useCallback((data) => {
    setSummary(data);
  }, []);

  const openAccountSettings = (accountId) => {
    setSelectedAccountId(accountId);
  };

  const closeAccountSettings = () => {
    setSelectedAccountId(null);
  };

  // Focus management
  useEffect(() => {
    mainRef.current?.focus();
  }, [selectedAccountId]);

  // Dashboard KPI information from actual API data
  const dashboardCards = [
    {
      title: "Total Accounts",
      value: formatNumber(summary?.totalAccounts),
      description: "Accounts in selected range",
      icon: "♙",
      iconColor: "bg-blue-50 text-blue-600",
    },
    {
      title: "Signups",
      value: formatNumber(summary?.signups),
      description: "New account signups",
      icon: "↗",
      iconColor: "bg-green-50 text-green-600",
    },
    {
      title: "Call Minutes",
      value: formatNumber(summary?.minutes),
      description: "Total minutes consumed",
      icon: "◷",
      iconColor: "bg-blue-50 text-blue-600",
    },
    {
      title: "SMS Used",
      value: formatNumber(summary?.sms),
      description: "Total SMS consumption",
      icon: "✉",
      iconColor: "bg-purple-50 text-purple-600",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f7f8fa]
      flex flex-col md:flex-row">

      {/* Sidebar */}
      <Sidebar
        showNavigation={selectedAccountId === null}
      />

      {/* Main application */}
      <div className="flex-1 min-w-0">

        <Header
          title={
            selectedAccountId !== null
              ? "Account Settings"
              : "Overview"
          }
          subtitle={
            selectedAccountId !== null
              ? "Manage account configuration and usage."
              : "Monitor account usage and manage accounts."
          }
        />

        <main
          ref={mainRef}
          id="main-content"
          tabIndex={-1}
          className="min-w-0 w-full p-4 sm:p-5
            lg:p-7 focus:outline-none"
        >

          {selectedAccountId !== null ? (

            <AccountSettings
              accountId={selectedAccountId}
              onBack={closeAccountSettings}
            />

          ) : (

            <div id="dashboard" className="space-y-5">

              {/* Dashboard heading */}
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  Key Performance Overview
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Track account usage and business activity.
                </p>
              </div>

              {/* Summary cards */}
              <section
                className="grid grid-cols-1
                  sm:grid-cols-2 xl:grid-cols-4 gap-4"
                aria-label="Usage summary"
              >

                {dashboardCards.map((card) => (
                  <SummaryCard
                    key={card.title}
                    {...card}
                  />
                ))}

              </section>

              {/* Compact date range toolbar */}
              <div className="flex justify-end">
                <DateRangeFilter
                  dateFrom={dateFrom}
                  dateTo={dateTo}
                  setDateFrom={setDateFrom}
                  setDateTo={setDateTo}
                />
              </div>

              {/* Analytics charts */}
              <UsageChart
                dateFrom={dateFrom}
                dateTo={dateTo}
                onSummaryChange={handleSummaryChange}
              />

              {/* Account table */}
              <Accounts
                dateFrom={dateFrom}
                dateTo={dateTo}
                onEditAccount={openAccountSettings}
              />

            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default Dashboard;
