
import { useEffect, useRef, useState } from "react";

import {
  getAccount,
  getAccountSettings,
  saveAccountSettingsStep,
  submitAccountSettings,
} from "../api/accountApi";

import {
  LoadingState,
  ErrorState,
  PartialFailure,
} from "../components/AsyncStates";

// ==================================================
// CONSTANTS
// ==================================================

const ALLOWED_COUNTRIES = ["US", "IN", "GB", "CA", "AU"];

const STEPS = [
  {
    number: 1,
    title: "Account Details",
    description: "Basic information",
  },
  {
    number: 2,
    title: "Plan & Billing",
    description: "Subscription details",
  },
  {
    number: 3,
    title: "Usage Limits",
    description: "Set usage caps",
  },
  {
    number: 4,
    title: "Webhook",
    description: "Integration settings",
  },
];

const EMPTY_FORM = {
  1: {
    name: "",
    email: "",
  },
  2: {
    plan: "",
    billing_country: "",
  },
  3: {
    minutes_cap: "",
    sms_cap: "",
  },
  4: {
    webhook_url: "",
  },
};

const STEP_FIELDS = {
  1: ["name", "email"],
  2: ["plan", "billing_country"],
  3: ["minutes_cap", "sms_cap"],
  4: ["webhook_url"],
};

// Copy form data without sharing object references
const copyFormData = (data) => ({
  1: { ...data[1] },
  2: { ...data[2] },
  3: { ...data[3] },
  4: { ...data[4] },
});

// Compare current values with the saved baseline
const areStepValuesEqual = (current, baseline) => {
  return Object.keys(current).every(
    (field) =>
      String(current[field] ?? "") ===
      String(baseline[field] ?? "")
  );
};

// ==================================================
// ACCOUNT SETTINGS COMPONENT
// ==================================================

const AccountSettings = ({ accountId, onBack }) => {
  // --------------------------------------------------
  // ACCOUNT INFORMATION
  // --------------------------------------------------

  const [account, setAccount] = useState(null);

  // --------------------------------------------------
  // FORM DATA
  // --------------------------------------------------

  // Latest values entered by the administrator
  const [stepData, setStepData] = useState(
    () => copyFormData(EMPTY_FORM)
  );

  // Last successfully loaded or saved values
  const [baselineStepData, setBaselineStepData] =
    useState(() => copyFormData(EMPTY_FORM));

  // --------------------------------------------------
  // SAVE QUEUES AND TIMERS
  // --------------------------------------------------

  const saveTimers = useRef({});

  // Stores the active save promise for each step
  const saveQueues = useRef({});

  // Tracks request versions to identify outdated responses
  const saveVersions = useRef({});

  // Tracks which steps currently have pending saves
  const [pendingSaveSteps, setPendingSaveSteps] =
    useState([]);

  // --------------------------------------------------
  // ACTIVE STEP
  // --------------------------------------------------

  const [activeStep, setActiveStep] = useState(1);

  // --------------------------------------------------
  // LOADING STATES
  // --------------------------------------------------

  const [loading, setLoading] = useState(true);

  const [accountLoadError, setAccountLoadError] =
    useState("");

  const [settingsLoadError, setSettingsLoadError] =
    useState("");

  const [retryLoadCount, setRetryLoadCount] = useState(0);

  // --------------------------------------------------
  // SAVING STATES
  // --------------------------------------------------

  const [saving, setSaving] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [savedSteps, setSavedSteps] = useState([]);

  const [stepSaveState, setStepSaveState] = useState({});

  // --------------------------------------------------
  // VALIDATION AND MESSAGES
  // --------------------------------------------------

  const [fieldErrors, setFieldErrors] = useState({});

  const [submitError, setSubmitError] = useState("");

  const [successMessage, setSuccessMessage] = useState("");

  const [submitted, setSubmitted] = useState(false);

  // ==================================================
  // LOAD ACCOUNT AND SAVED SETTINGS
  // ==================================================

  useEffect(() => {
    const controller = new AbortController();

    const loadForm = async () => {
      setLoading(true);

      setAccount(null);
      setAccountLoadError("");
      setSettingsLoadError("");

      setSubmitError("");
      setSuccessMessage("");

      const results = await Promise.allSettled([
        getAccount(accountId, controller.signal),
        getAccountSettings(accountId, controller.signal),
      ]);

      if (controller.signal.aborted) return;

      const [accountResult, settingsResult] = results;

      // Account details are required
      if (accountResult.status === "rejected") {
        setAccountLoadError(
          accountResult.reason?.message ||
            "Unable to load account details."
        );

        setLoading(false);
        return;
      }

      const accountData = accountResult.value;

      setAccount(accountData);

      // Restore saved settings independently
      let saved = {};

      if (settingsResult.status === "fulfilled") {
        saved = settingsResult.value || {};
      } else {
        setSettingsLoadError(
          settingsResult.reason?.message ||
            "Unable to restore saved drafts."
        );
      }

      // Prepare restored form values
      const restoredData = {
        1: {
          name: saved["1"]?.name ?? accountData.name ?? "",
          email: saved["1"]?.email ?? accountData.email ?? "",
        },

        2: {
          plan: saved["2"]?.plan ?? accountData.plan ?? "",

          billing_country:
            saved["2"]?.billing_country ??
            (ALLOWED_COUNTRIES.includes(accountData.country)
              ? accountData.country
              : ""),
        },

        3: {
          minutes_cap: saved["3"]?.minutes_cap ?? "",
          sms_cap: saved["3"]?.sms_cap ?? "",
        },

        4: {
          webhook_url: saved["4"]?.webhook_url ?? "",
        },
      };

      // Restore form data
      setStepData(restoredData);

      // Set last known saved-data baseline
      setBaselineStepData(copyFormData(restoredData));

      // Restore saved steps only when settings API succeeds
      if (settingsResult.status === "fulfilled") {
        const existingSteps = Object.keys(saved)
          .map(Number)
          .filter((step) => step >= 1 && step <= 4);

        setSavedSteps(existingSteps);

        const statuses = {};

        existingSteps.forEach((step) => {
          statuses[step] = "saved";
        });

        setStepSaveState(statuses);
      } else {
        // Do not claim unknown server drafts were restored
        setSavedSteps([]);
        setStepSaveState({});
      }

      setPendingSaveSteps([]);
      setActiveStep(1);
      setFieldErrors({});
      setSubmitted(false);

      setLoading(false);
    };

    loadForm();

    return () => {
      controller.abort();

      Object.values(saveTimers.current).forEach((timer) => {
        clearTimeout(timer);
      });
    };
  }, [accountId, retryLoadCount]);

  // ==================================================
  // HANDLE FORM INPUTS
  // ==================================================

  const handleChange = (step, field, value) => {
    const updatedStepData = {
      ...stepData[step],
      [field]: value,
    };

    setStepData((previous) => ({
      ...previous,
      [step]: updatedStepData,
    }));

    // Clear the edited field's validation error
    setFieldErrors((previous) => {
      const updated = { ...previous };
      delete updated[field];
      return updated;
    });

    // Mark changed values as unsaved
    const matchesBaseline = areStepValuesEqual(
      updatedStepData,
      baselineStepData[step]
    );

    setStepSaveState((previous) => ({
      ...previous,
      [step]: matchesBaseline
        ? savedSteps.includes(step)
          ? "saved"
          : "unsaved"
        : "unsaved",
    }));

    setSubmitError("");
    setSuccessMessage("");
  };

  // ==================================================
  // VALIDATE CURRENT STEP
  // ==================================================

  const validateStep = (step, data = stepData[step]) => {
    const errors = {};

    if (step === 1) {
      if (!data.name.trim()) {
        errors.name = "Name is required.";
      }

      if (!data.email.trim()) {
        errors.email = "Email is required.";
      } else if (!data.email.includes("@")) {
        errors.email = "Enter a valid email address.";
      }
    }

    if (step === 2) {
      if (!data.plan) {
        errors.plan = "Please select a plan.";
      }

      if (!data.billing_country) {
        errors.billing_country =
          "Please select a billing country.";
      }
    }

    if (step === 3) {
      ["minutes_cap", "sms_cap"].forEach((field) => {
        const value = data[field];

        if (
          value !== "" &&
          (!Number.isFinite(Number(value)) ||
            Number(value) < 0)
        ) {
          errors[field] =
            "Enter a valid non-negative number.";
        }
      });
    }

    if (step === 4) {
      const url = data.webhook_url.trim();

      if (
        url &&
        !url.startsWith("http://") &&
        !url.startsWith("https://")
      ) {
        errors.webhook_url =
          "Webhook URL must start with http:// or https://.";
      }
    }

    setFieldErrors((previous) => {
      const updated = { ...previous };

      STEP_FIELDS[step].forEach((field) => {
        delete updated[field];
      });

      return {
        ...updated,
        ...errors,
      };
    });

    return Object.keys(errors).length === 0;
  };

  // ==================================================
  // PREPARE STEP DATA FOR API
  // ==================================================

  const getStepPayload = (step, data = stepData[step]) => {
    if (step === 3) {
      return {
        minutes_cap:
          data.minutes_cap === ""
            ? null
            : Number(data.minutes_cap),

        sms_cap:
          data.sms_cap === ""
            ? null
            : Number(data.sms_cap),
      };
    }

    return { ...data };
  };

  // ==================================================
  // SAVE CURRENT STEP
  // ==================================================

  const saveStep = async (
    step = activeStep,
    draftData = stepData[step]
  ) => {
    // Do not start another request for a step
    // that already has an active request.
    if (saving || saveQueues.current[step]) {
      return false;
    }

    // Validate the exact draft being saved
    if (!validateStep(step, draftData)) {
      setStepSaveState((previous) => ({
        ...previous,
        [step]: "error",
      }));

      return false;
    }

    // Snapshot the values being submitted
    const data = { ...draftData };

    // Clear pending save timer
    clearTimeout(saveTimers.current[step]);

    // Create a new request version
    const version = (saveVersions.current[step] || 0) + 1;

    saveVersions.current[step] = version;

    setSaving(true);
    setSubmitError("");
    setSuccessMessage("");

    setStepSaveState((previous) => ({
      ...previous,
      [step]: "saving",
    }));

    let currentRequest;

    try {
      const payload = getStepPayload(step, data);

      // Mark this step as having a pending save
      setPendingSaveSteps((previous) =>
        previous.includes(step)
          ? previous
          : [...previous, step]
      );

      // Create and register the current request
      currentRequest = saveAccountSettingsStep(
        accountId,
        step,
        payload
      );

      saveQueues.current[step] = currentRequest;

      // Wait for the server response
      await currentRequest;

      // Ignore outdated responses
      if (saveVersions.current[step] !== version) {
        return false;
      }

      // Record successfully saved step
      setSavedSteps((previous) => [
        ...new Set([...previous, step]),
      ]);

      // Update baseline ONLY after successful save
      setBaselineStepData((previous) => ({
        ...previous,
        [step]: { ...data },
      }));

      setStepSaveState((previous) => ({
        ...previous,
        [step]: "saved",
      }));

      // Clear validation errors for this step
      setFieldErrors((previous) => {
        const updated = { ...previous };

        STEP_FIELDS[step].forEach((field) => {
          delete updated[field];
        });

        return updated;
      });

      setSuccessMessage(
        `Step ${step} saved successfully.`
      );

      return true;

    } catch (error) {
      // Ignore outdated responses
      if (saveVersions.current[step] !== version) {
        return false;
      }

      // Preserve the latest local draft
      // Do not update baselineStepData here
      setStepSaveState((previous) => ({
        ...previous,
        [step]: "error",
      }));

      if (
        error.fieldErrors &&
        Object.keys(error.fieldErrors).length > 0
      ) {
        setFieldErrors((previous) => ({
          ...previous,
          ...error.fieldErrors,
        }));
      } else {
        setSubmitError(
          error.message ||
            "Unable to save this step. Please try again."
        );
      }

      return false;

    } finally {
      // Clean up only if this is still the current request
      if (saveQueues.current[step] === currentRequest) {
        delete saveQueues.current[step];

        setPendingSaveSteps((previous) =>
          previous.filter((item) => item !== step)
        );
      }

      // Clear the global saving state when no requests remain
      if (Object.keys(saveQueues.current).length === 0) {
        setSaving(false);
      }
    }
  };

  // ==================================================
  // DISCARD CURRENT STEP CHANGES
  // ==================================================

  const discardStepChanges = () => {
    const step = activeStep;

    // Do not discard if a save is still pending
    if (pendingSaveSteps.includes(step)) {
      return;
    }

    // Also check the request reference directly
    if (saveQueues.current[step]) {
      return;
    }

    if (stepSaveState[step] === "saving") {
      return;
    }

    // Clear pending save timer
    clearTimeout(saveTimers.current[step]);

    // Invalidate outdated responses
    saveVersions.current[step] =
      (saveVersions.current[step] || 0) + 1;

    // Restore last successfully saved values
    setStepData((previous) => ({
      ...previous,
      [step]: {
        ...baselineStepData[step],
      },
    }));

    // Clear validation errors for this step
    setFieldErrors((previous) => {
      const updated = { ...previous };

      STEP_FIELDS[step].forEach((field) => {
        delete updated[field];
      });

      return updated;
    });

    setSubmitError("");
    setSuccessMessage("");

    // Restore correct save status
    setStepSaveState((previous) => ({
      ...previous,
      [step]: savedSteps.includes(step)
        ? "saved"
        : "unsaved",
    }));
  };

  // ==================================================
  // SAVE AND CONTINUE
  // ==================================================

  const handleNext = async () => {
    const success = await saveStep(activeStep);

    if (success && activeStep < 4) {
      setActiveStep((previous) => previous + 1);

      setFieldErrors({});
      setSuccessMessage("");
      setSubmitError("");
    }
  };

  // ==================================================
  // GO TO PREVIOUS STEP
  // ==================================================

  const handlePrevious = () => {
    if (activeStep > 1 && !saving) {
      setActiveStep((previous) => previous - 1);

      setFieldErrors({});
      setSuccessMessage("");
      setSubmitError("");
    }
  };

  // ==================================================
  // NAVIGATE BETWEEN STEPS
  // ==================================================

  const handleStepNavigation = (step) => {
    if (saving) return;

    setActiveStep(step);

    setFieldErrors({});
    setSubmitError("");
    setSuccessMessage("");
  };

  // ==================================================
  // FINAL SUBMISSION
  // ==================================================

  const handleSubmit = async () => {
    setSubmitError("");
    setSuccessMessage("");

    // Do not submit while any save request is pending
    if (pendingSaveSteps.length > 0 || saving) {
      setSubmitError(
        "Please wait for the current save operation to finish."
      );

      return;
    }

    // Check that all current values have been saved
    const incompleteSteps = [1, 2, 3, 4].filter((step) => {
      const hasBeenSaved = savedSteps.includes(step);

      const matchesBaseline = areStepValuesEqual(
        stepData[step],
        baselineStepData[step]
      );

      return !hasBeenSaved || !matchesBaseline;
    });

    if (incompleteSteps.length > 0) {
      setSubmitted(false);

      setSubmitError(
        `Please save all current changes before submitting. Steps requiring attention: ${incompleteSteps.join(
          ", "
        )}.`
      );

      setActiveStep(incompleteSteps[0]);

      return;
    }

    setSubmitting(true);

    try {
      // Final POST request
      await submitAccountSettings(accountId);

      // Success only after the POST succeeds
      setSubmitted(true);
      setSubmitError("");

      setSuccessMessage(
        "Account settings submitted successfully."
      );

    } catch (error) {
      setSubmitted(false);

      // Read missing steps from server response
      const detail = error.payload?.detail;

      const missingSteps = Array.isArray(detail)
        ? detail
        : detail?.missing_steps || [];

      const firstMissingStep = Number(missingSteps[0]);

      // Navigate to the first missing step
      if (
        firstMissingStep >= 1 &&
        firstMissingStep <= 4
      ) {
        setActiveStep(firstMissingStep);
      }

      setSubmitError(
        error.message ||
          "Unable to submit account settings."
      );

      // Do not reset stepData or baselineStepData.
      // Preserve all entered information.
    } finally {
      setSubmitting(false);
    }
  };

  // ==================================================
  // FIELD STYLES
  // ==================================================

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  const renderFieldError = (field) => {
    if (!fieldErrors[field]) {
      return null;
    }

    return (
      <p
        className="mt-1 text-sm text-red-600"
        role="alert"
      >
        {fieldErrors[field]}
      </p>
    );
  };

  // ==================================================
  // INITIAL LOADING STATE
  // ==================================================

  if (loading) {
    return (
      <LoadingState message="Loading account settings..." />
    );
  }

  // ==================================================
  // ACCOUNT LOADING ERROR
  // ==================================================

  if (accountLoadError) {
    return (
      <div className="p-6">
        <ErrorState
          message={accountLoadError}
          onRetry={() =>
            setRetryLoadCount((count) => count + 1)
          }
        />

        <button
          type="button"
          onClick={onBack}
          className="mt-4 text-blue-600 underline"
        >
          Back to Accounts
        </button>
      </div>
    );
  }

  // ==================================================
  // SETTINGS RESTORATION ERROR
  // BLOCK EDITING UNTIL DRAFTS ARE RESTORED
  // ==================================================

  if (settingsLoadError) {
    return (
      <div className="space-y-5 p-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Account Settings
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            {account?.name} · Account ID: {accountId}
          </p>
        </div>

        <PartialFailure
          message="Account details loaded, but saved drafts could not be restored. Please retry before editing to avoid overwriting existing work."
          onRetry={() =>
            setRetryLoadCount((count) => count + 1)
          }
        />

        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
        >
          Back to Accounts
        </button>
      </div>
    );
  }

  // ==================================================
  // MAIN FORM
  // ==================================================

  return (
    <div className="space-y-6">

      {/* PAGE HEADING */}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-3 text-sm font-medium text-blue-600 hover:underline"
          >
            ← Back to Accounts
          </button>

          <h1 className="text-2xl font-bold text-gray-800">
            Account Settings
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Manage account information, billing, usage limits
            and webhook settings.
          </p>
        </div>

        {account && (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
            <p className="text-xs text-gray-500">
              Account ID
            </p>

            <p className="font-semibold text-gray-800">
              {account.id}
            </p>
          </div>
        )}
      </div>

      {/* ACCOUNT INFORMATION */}

      {account && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-gray-800">
            Account Information
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-gray-500">
                Name
              </p>

              <p className="mt-1 font-medium text-gray-800">
                {account.name || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">
                Email
              </p>

              <p className="mt-1 break-all font-medium text-gray-800">
                {account.email || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">
                Current Plan
              </p>

              <p className="mt-1 font-medium capitalize text-gray-800">
                {account.plan || "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* STEP NAVIGATION */}

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {STEPS.map((step) => (
            <button
              key={step.number}
              type="button"
              onClick={() =>
                handleStepNavigation(step.number)
              }
              disabled={saving}
              aria-current={
                activeStep === step.number
                  ? "step"
                  : undefined
              }
              className={`rounded-lg border p-3 text-left transition ${
                activeStep === step.number
                  ? "border-blue-600 bg-blue-50"
                  : "border-gray-200 hover:bg-gray-50"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                    activeStep === step.number
                      ? "bg-blue-600 text-white"
                      : savedSteps.includes(step.number)
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {savedSteps.includes(step.number)
                    ? "✓"
                    : step.number}
                </span>

                {stepSaveState[step.number] === "saving" && (
                  <span className="text-xs text-blue-600">
                    Saving...
                  </span>
                )}

                {stepSaveState[step.number] === "saved" && (
                  <span className="text-xs text-green-600">
                    Saved
                  </span>
                )}

                {stepSaveState[step.number] === "error" && (
                  <span className="text-xs text-red-600">
                    Failed
                  </span>
                )}
              </div>

              <p className="mt-3 text-sm font-semibold text-gray-800">
                {step.title}
              </p>

              <p className="mt-1 text-xs text-gray-500">
                {step.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* FORM CARD */}

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">

        {/* FORM HEADING */}

        <div className="mb-6 border-b border-gray-100 pb-5">
          <p className="text-sm font-medium text-blue-600">
            Step {activeStep} of 4
          </p>

          <h2 className="mt-1 text-xl font-bold text-gray-800">
            {STEPS[activeStep - 1].title}
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            {STEPS[activeStep - 1].description}
          </p>
        </div>

        {/* GENERAL ERROR */}

        {submitError && (
          <div
            className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            role="alert"
          >
            {submitError}
          </div>
        )}

        {/* SUCCESS MESSAGE */}

        {successMessage && (
          <div
            className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700"
            role="status"
          >
            {successMessage}
          </div>
        )}

        {/* ============================================
            STEP 1: ACCOUNT DETAILS
        ============================================ */}

        {activeStep === 1 && (
          <div className="max-w-2xl space-y-5">
            <div>
              <label
                htmlFor="account-name"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Account Name
              </label>

              <input
                id="account-name"
                type="text"
                value={stepData[1].name}
                onChange={(e) =>
                  handleChange(1, "name", e.target.value)
                }
                placeholder="Enter account name"
                className={inputClass}
                aria-invalid={Boolean(fieldErrors.name)}
              />

              {renderFieldError("name")}
            </div>

            <div>
              <label
                htmlFor="account-email"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Email Address
              </label>

              <input
                id="account-email"
                type="email"
                value={stepData[1].email}
                onChange={(e) =>
                  handleChange(1, "email", e.target.value)
                }
                placeholder="Enter email address"
                className={inputClass}
                aria-invalid={Boolean(fieldErrors.email)}
              />

              {renderFieldError("email")}
            </div>
          </div>
        )}

        {/* ============================================
            STEP 2: PLAN AND BILLING
        ============================================ */}

        {activeStep === 2 && (
          <div className="max-w-2xl space-y-5">
            <div>
              <label
                htmlFor="account-plan"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Subscription Plan
              </label>

              <select
                id="account-plan"
                value={stepData[2].plan}
                onChange={(e) =>
                  handleChange(2, "plan", e.target.value)
                }
                className={inputClass}
                aria-invalid={Boolean(fieldErrors.plan)}
              >
                <option value="">Select a plan</option>
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>

              {renderFieldError("plan")}
            </div>

            <div>
              <label
                htmlFor="billing-country"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Billing Country
              </label>

              <select
                id="billing-country"
                value={stepData[2].billing_country}
                onChange={(e) =>
                  handleChange(
                    2,
                    "billing_country",
                    e.target.value
                  )
                }
                className={inputClass}
                aria-invalid={Boolean(
                  fieldErrors.billing_country
                )}
              >
                <option value="">Select billing country</option>
                <option value="US">United States</option>
                <option value="IN">India</option>
                <option value="GB">United Kingdom</option>
                <option value="CA">Canada</option>
                <option value="AU">Australia</option>
              </select>

              {renderFieldError("billing_country")}
            </div>
          </div>
        )}

        {/* ============================================
            STEP 3: USAGE LIMITS
        ============================================ */}

        {activeStep === 3 && (
          <div className="max-w-2xl space-y-5">
            <p className="text-sm text-gray-500">
              Set optional usage limits for this account.
              Leave a field empty if you do not want to set a limit.
            </p>

            <div>
              <label
                htmlFor="minutes-cap"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Monthly Minutes Cap
              </label>

              <input
                id="minutes-cap"
                type="number"
                min="0"
                value={stepData[3].minutes_cap}
                onChange={(e) =>
                  handleChange(
                    3,
                    "minutes_cap",
                    e.target.value
                  )
                }
                placeholder="Enter monthly minutes limit"
                className={inputClass}
                aria-invalid={Boolean(
                  fieldErrors.minutes_cap
                )}
              />

              {renderFieldError("minutes_cap")}
            </div>

            <div>
              <label
                htmlFor="sms-cap"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Monthly SMS Cap
              </label>

              <input
                id="sms-cap"
                type="number"
                min="0"
                value={stepData[3].sms_cap}
                onChange={(e) =>
                  handleChange(
                    3,
                    "sms_cap",
                    e.target.value
                  )
                }
                placeholder="Enter monthly SMS limit"
                className={inputClass}
                aria-invalid={Boolean(fieldErrors.sms_cap)}
              />

              {renderFieldError("sms_cap")}
            </div>
          </div>
        )}

        {/* ============================================
            STEP 4: WEBHOOK
        ============================================ */}

        {activeStep === 4 && (
          <div className="max-w-2xl space-y-5">
            <div>
              <label
                htmlFor="webhook-url"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Webhook URL
              </label>

              <input
                id="webhook-url"
                type="url"
                value={stepData[4].webhook_url}
                onChange={(e) =>
                  handleChange(
                    4,
                    "webhook_url",
                    e.target.value
                  )
                }
                placeholder="https://example.com/webhook"
                className={inputClass}
                aria-invalid={Boolean(
                  fieldErrors.webhook_url
                )}
              />

              {renderFieldError("webhook_url")}

              <p className="mt-2 text-xs text-gray-500">
                Optional. The URL must start with http:// or https://.
              </p>
            </div>
          </div>
        )}

        {/* ============================================
            FAILED SAVE: RETRY AND DISCARD
        ============================================ */}

        {stepSaveState[activeStep] === "error" && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-700">
              This step could not be saved.
            </p>

            <p className="mt-1 text-sm text-red-600">
              Your latest changes are still available in this form.
              You can retry saving or discard them to restore the
              last successfully saved values.
            </p>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() =>
                  saveStep(activeStep, stepData[activeStep])
                }
                disabled={
                  pendingSaveSteps.includes(activeStep)
                }
                className="rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pendingSaveSteps.includes(activeStep)
                  ? "Saving..."
                  : "Retry Save"}
              </button>

              <button
                type="button"
                onClick={discardStepChanges}
                disabled={pendingSaveSteps.includes(activeStep)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Discard Changes
              </button>
            </div>
          </div>
        )}

        {/* ============================================
            NAVIGATION BUTTONS
        ============================================ */}

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={
              activeStep === 1 ||
              saving ||
              submitting
            }
            className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>

          <div className="flex flex-col gap-3 sm:flex-row">
            {activeStep < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={saving || submitting}
                className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save & Continue"}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => saveStep(4)}
                  disabled={saving || submitting}
                  className="rounded-lg border border-blue-600 px-5 py-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Draft"}
                </button>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={
                    saving ||
                    submitting ||
                    pendingSaveSteps.length > 0 ||
                    submitted
                  }
                  className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting
                    ? "Submitting..."
                    : submitted
                    ? "Submitted"
                    : "Submit Settings"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* ============================================
            DRAFT PROGRESS
        ============================================ */}

        <div className="mt-5 rounded-lg bg-gray-50 p-4">
          <p className="text-sm font-semibold text-gray-700">
            Draft progress
          </p>

          <p className="mt-1 text-sm text-gray-500">
            {savedSteps.length} of 4 steps saved.
          </p>

          {pendingSaveSteps.length > 0 && (
            <p className="mt-1 text-sm text-blue-600" role="status">
              Saving step{pendingSaveSteps.length > 1 ? "s" : ""}:{" "}
              {pendingSaveSteps.join(", ")}
            </p>
          )}

          <div className="mt-3 flex gap-2">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                title={`Step ${step}: ${
                  savedSteps.includes(step)
                    ? "Saved"
                    : "Not saved"
                }`}
                className={`h-2 flex-1 rounded-full ${
                  savedSteps.includes(step)
                    ? "bg-green-500"
                    : "bg-gray-200"
                }`}
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AccountSettings;
