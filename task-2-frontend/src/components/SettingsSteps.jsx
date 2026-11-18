
const steps = [
  "Basic Information",
  "Plan & Billing",
  "Usage Limits",
  "Webhook",
];

const SettingsSteps = ({
  activeStep,
  setActiveStep,
  savedSteps = [],
}) => {
  return (
    <nav
      aria-label="Account settings steps"
      className="bg-white border rounded-xl p-4 sm:p-5"
    >
      <ol className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const active = activeStep === stepNumber;
          const saved = savedSteps.includes(stepNumber);

          return (
            <li key={step}>
              <button
                type="button"
                onClick={() => setActiveStep(stepNumber)}
                aria-label={`Go to step ${stepNumber}: ${step}`}
                aria-current={active ? "step" : undefined}
                className={`w-full min-w-0 p-3 rounded-lg
                  border text-left transition-colors
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-blue-600
                  focus-visible:ring-offset-2
                  ${
                    active
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-gray-50 border-gray-200 hover:border-blue-400"
                  }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`w-8 h-8 shrink-0 rounded-full
                      flex items-center justify-center
                      text-sm font-bold ${
                        active
                          ? "bg-white text-blue-600"
                          : "bg-gray-200 text-gray-700"
                      }`}
                  >
                    {stepNumber}
                  </span>

                  {saved && (
                    <span
                      className={`text-sm ${
                        active ? "text-white" : "text-green-600"
                      }`}
                      aria-label="Previously saved"
                      title="Previously saved"
                    >
                      ✓
                    </span>
                  )}
                </div>

                <p className="text-sm font-medium mt-3 break-words">
                  {step}
                </p>

                <p
                  className={`text-xs mt-1 ${
                    active ? "text-blue-100" : "text-gray-500"
                  }`}
                >
                  {saved ? "Saved previously" : "Not saved yet"}
                </p>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default SettingsSteps;
