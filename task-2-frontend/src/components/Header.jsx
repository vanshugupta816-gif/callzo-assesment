
const Header = ({
  title = "Overview",
  subtitle = "Monitor account usage and manage accounts.",
}) => {
  return (
    <header className="bg-white border-b border-gray-200
      px-5 sm:px-7 py-5">

      <div className="flex items-center justify-between gap-4">

        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl
            font-semibold text-gray-900">
            {title}
          </h1>

          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {subtitle}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">

          <div className="hidden sm:block text-right">
            <p className="text-sm font-semibold text-gray-800">
              Administrator
            </p>

            <p className="text-xs text-gray-500">
              Admin Account
            </p>
          </div>

          <div
            className="w-10 h-10 rounded-full
              bg-blue-600 text-white
              flex items-center justify-center
              font-semibold"
            aria-label="Administrator profile"
          >
            A
          </div>

        </div>
      </div>
    </header>
  );
};

export default Header;
