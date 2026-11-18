
const accounts = [
  {
    id: 1,
    name: "John Smith",
    company: "Tech Solutions",
    plan: "Pro",
    status: "Active",
    minutes: 412,
  },
  {
    id: 2,
    name: "Emma Wilson",
    company: "Digital World",
    plan: "Basic",
    status: "Trial",
    minutes: 230,
  },
  {
    id: 3,
    name: "Robert Brown",
    company: "Cloud Systems",
    plan: "Enterprise",
    status: "Suspended",
    minutes: 680,
  },
];

const AccountOverview = () => {
  return (
    <div className="bg-white rounded-xl shadow-sm
      border border-gray-100 p-5">

      <div className="flex flex-col sm:flex-row
        sm:justify-between sm:items-center gap-3 mb-6">

        <div>
          <h2 className="text-lg font-bold text-gray-800">
            Account Overview
          </h2>

          <p className="text-sm text-gray-500">
            Recently viewed accounts
          </p>
        </div>

        <button className="bg-blue-600 text-white
          px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
          View All Accounts
        </button>

      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[650px]">

          <thead>
            <tr className="border-b text-sm text-gray-500">
              <th className="py-3">Account</th>
              <th>Company</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Minutes Used</th>
            </tr>
          </thead>

          <tbody>
            {accounts.map((account) => (
              <tr
                key={account.id}
                className="border-b last:border-0
                  text-sm hover:bg-gray-50"
              >
                <td className="py-4 font-medium text-gray-800">
                  {account.name}
                </td>

                <td className="text-gray-600">
                  {account.company}
                </td>

                <td>{account.plan}</td>

                <td>
                  <span className={`px-3 py-1 rounded-full
                    text-xs font-medium ${
                      account.status === "Active"
                        ? "bg-green-100 text-green-700"
                        : account.status === "Trial"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                    {account.status}
                  </span>
                </td>

                <td className="font-medium">
                  {account.minutes}
                </td>
              </tr>
            ))}
          </tbody>

        </table>
      </div>
    </div>
  );
};

export default AccountOverview;
