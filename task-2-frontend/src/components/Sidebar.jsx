
const menuItems = [
  {
    name: "Overview",
    icon: "⌂",
    href: "#dashboard",
  },
  {
    name: "Accounts",
    icon: "♙",
    href: "#accounts",
  },
  {
    name: "Usage Analytics",
    icon: "▥",
    href: "#usage-analytics",
  },
];

const Sidebar = ({
  showNavigation = true,
}) => {
  return (
    <aside
      className="w-full md:w-60 md:min-h-screen
        md:sticky md:top-0 md:h-screen
        bg-[#111827] text-white p-4
        flex flex-col shrink-0"
      aria-label="Application sidebar"
    >

      {/* Brand */}
      <div className="flex items-center gap-3 px-2 py-3 mb-5">
        <div className="w-9 h-9 rounded-lg
          bg-blue-600 flex items-center
          justify-center font-bold text-lg">
          C
        </div>

        <div>
          <h1 className="text-lg font-bold tracking-wide">
            Callzo
          </h1>

          <p className="text-xs text-gray-400">
            Admin Console
          </p>
        </div>
      </div>

      {/* Navigation */}
      {showNavigation ? (
        <nav aria-label="Main navigation">
          <p className="text-[11px] uppercase
            tracking-widest text-gray-500
            px-3 mb-3">
            Main Menu
          </p>

          <ul className="grid grid-cols-2
            md:grid-cols-1 gap-2">

            {menuItems.map((item, index) => (
              <li key={item.name}>
                <a
                  href={item.href}
                  className={`flex items-center gap-3
                    px-3 py-3 rounded-lg text-sm
                    transition-colors
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-white
                    ${
                      index === 0
                        ? "bg-gray-700 text-white"
                        : "text-gray-300 hover:bg-gray-800 hover:text-white"
                    }`}
                >
                  <span
                    className="text-lg w-6 text-center"
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>

                  <span>{item.name}</span>
                </a>
              </li>
            ))}

          </ul>
        </nav>
      ) : (
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-sm font-medium">
            Account Settings
          </p>

          <p className="text-xs text-gray-400 mt-2">
            Manage account information and configuration.
          </p>
        </div>
      )}

      {/* Bottom profile */}
      <div className="hidden md:block mt-auto
        border-t border-gray-700 pt-5">

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gray-700
            rounded-full flex items-center
            justify-center text-sm font-semibold">
            A
          </div>

          <div>
            <p className="text-sm font-medium">
              Administrator
            </p>

            <p className="text-xs text-gray-400">
              Admin Account
            </p>
          </div>
        </div>

      </div>
    </aside>
  );
};

export default Sidebar;
