
import { useCallback, useEffect, useRef, useState } from "react";
import API_BASE_URL from "../api/api";

const STEPS = [
  "Personal Information",
  "Plan & Billing",
  "Usage Caps",
  "Webhook Configuration",
];

const INITIAL_FORM_DATA = {
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

// Prepare data before sending it to the API
const prepareStepData = (step, data) => {
  if (step === 1) {
    return {
      name: data.name.trim(),
      email: data.email.trim(),
    };
  }

  if (step === 2) {
    return {
      plan: data.plan,
      billing_country: data.billing_country,
    };
  }

  if (step === 3) {
    return {
      ...(data.minutes_cap !== "" && {
        minutes_cap: Number(data.minutes_cap),
      }),
      ...(data.sms_cap !== "" && {
        sms_cap: Number(data.sms_cap),
      }),
    };
  }

  if (step === 4) {
    return {
      webhook_url: data.webhook_url.trim(),
    };
  }

  return {};
};

// Validate each form step
const validateStep = (step, data) => {
  const errors = {};

  if (step === 1) {
    if (!data.name?.trim()) {
      errors.name = "Name is required";
    }

    if (!data.email?.trim()) {
      errors.email = "Email is required";
    } else if (!data.email.includes("@")) {
      errors.email = "Enter a valid email address";
    }
  }

  if (step === 2) {
    if (!["basic", "pro", "enterprise"].includes(data.plan)) {
      errors.plan = "Please select a valid plan";
    }

    if (!["US", "IN", "GB", "CA", "AU"].includes(data.billing_country)) {
      errors.billing_country = "Please select a billing country";
    }
  }

  if (step === 3) {
    ["minutes_cap", "sms_cap"].forEach((field) => {
      const value = data[field];

      if (
        value !== "" &&
        (!Number.isFinite(Number(value)) || Number(value) < 0)
      ) {
        errors[field] = "Enter a valid non-negative number";
      }
    });
  }

  if (step === 4) {
    const url = data.webhook_url?.trim();

    if (
      url &&
      !/^https?:\/\/.+/i.test(url)
    ) {
      errors.webhook_url =
        "Webhook URL must start with http:// or https://";
    }
  }

  return errors;
};

// Read API responses safely
const requestJson = async (url, options = {}) => {
  const baseUrl = String(API_BASE_URL).replace(/\/$/, "");

  const response = await fetch(`${baseUrl}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const text = await response.text();

  let payload = {};

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { detail: text };
    }
  }

  if (!response.ok) {
    const message =
      typeof payload.detail === "string"
        ? payload.detail
        : `Request failed with status ${response.status}`;

    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;

    throw error;
  }

  return payload;
};

// GET saved settings
const getAccountSettings = (accountId, signal) => {
  return requestJson(
    `/accounts/${encodeURIComponent(accountId)}/settings`,
    { signal }
  );
};

// PUT one settings step
const saveAccountSettingsStep = (accountId, step, data) => {
  return requestJson(
    `/accounts/${encodeURIComponent(accountId)}/settings/step/${step}`,
    {
      method: "PUT",
      body: JSON.stringify({ data }),
    }
  );
};

// POST final settings submission
const submitAccountSettings = (accountId) => {
  return requestJson(
    `/accounts/${encodeURIComponent(accountId)}/settings/submit`,
    {
      method: "POST",
    }
  );
};

const AccountSettings = ({ accountId, onBack }) => {
  const [activeStep, setActiveStep] = useState(1);

  const [formData, setFormData] = useState(INITIAL_FORM_DATA);

  const [savedSteps, setSavedSteps] = useState([]);

  const [fieldErrors, setFieldErrors] = useState({});

  const [stepSaveState, setStepSaveState] = useState({});

  const [loading, setLoading] = useState(true);

  const [loadError, setLoadError] = useState("");

  const [submitMessage, setSubmitMessage] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const [loadRetry, setLoadRetry] = useState(0);

  // Tracks whether initial settings have loaded
  const hydrated = useRef(false);

  // Tracks latest edit/save for each step
  const saveVersions = useRef({});

  // Keeps requests for the same step in order
  const saveQueues = useRef({});

  // Autosave timers
  const saveTimers = useRef({});

  // Restore saved drafts when account changes
  useEffect(() => {
    const controller = new AbortController();

    hydrated.current = false;

    Object.values(saveTimers.current).forEach(clearTimeout);
    saveTimers.current = {};

    saveVersions.current = {};
    saveQueues.current = {};

    setActiveStep(1);
    setFormData(INITIAL_FORM_DATA);
    setSavedSteps([]);
    setFieldErrors({});
    setStepSaveState({});
    setSubmitMessage("");
    setLoadError("");
    setLoading(true);

    const loadSettings = async () => {
      try {
        const response = await getAccountSettings(
          accountId,
          controller.signal
        );

        if (controller.signal.aborted) return;

        const savedData =
          response.data || response.settings || response;

        const restored = {
          1: {
            ...INITIAL_FORM_DATA[1],
            ...(savedData["1"] || {}),
          },
          2: {
            ...INITIAL_FORM_DATA[2],
            ...(savedData["2"] || {}),
          },
          3: {
            ...INITIAL_FORM_DATA[3],
            ...(savedData["3"] || {}),
          },
          4: {
            ...INITIAL_FORM_DATA[4],
            ...(savedData["4"] || {}),
          },
        };

        setFormData(restored);

        const completedSteps = [1, 2, 3, 4].filter(
          (step) => savedData[String(step)]
        );

        setSavedSteps(completedSteps);

        setStepSaveState(
          Object.fromEntries(
            completedSteps.map((step) => [step, "saved"])
          )
        );

        hydrated.current = true;
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoadError(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      controller.abort();
      Object.values(saveTimers.current).forEach(clearTimeout);
    };
  }, [accountId, loadRetry]);

  // Save one step with local and server validation
  const saveStep = useCallback(
    async (step, data, { showErrors = true } = {}) => {
      const errors = validateStep(step, data);

      if (Object.keys(errors).length > 0) {
        if (showErrors) {
          setFieldErrors((previous) => ({
            ...previous,
            [step]: errors,
          }));

          setStepSaveState((previous) => ({
            ...previous,
            [step]: "invalid",
          }));
        }

        return {
          ok: false,
          localInvalid: true,
          serverValidation: false,
        };
      }

      const version = (saveVersions.current[step] || 0) + 1;

      saveVersions.current[step] = version;

      setStepSaveState((previous) => ({
        ...previous,
        [step]: "saving",
      }));

      const payload = prepareStepData(step, data);

      const previousRequest =
        saveQueues.current[step] || Promise.resolve();

      const currentRequest = previousRequest
        .catch(() => {})
        .then(() =>
          saveAccountSettingsStep(accountId, step, payload)
        );

      saveQueues.current[step] = currentRequest;

      try {
        await currentRequest;

        if (saveVersions.current[step] !== version) {
          return {
            ok: true,
            stale: true,
          };
        }

        setSavedSteps((previous) =>
          [...new Set([...previous, step])].sort()
        );

        setFieldErrors((previous) => {
          const updated = { ...previous };
          delete updated[step];
          return updated;
        });

        setStepSaveState((previous) => ({
          ...previous,
          [step]: "saved",
        }));

        return {
          ok: true,
          serverValidation: false,
        };

      } catch (error) {
        if (saveVersions.current[step] !== version) {
          return {
            ok: false,
            stale: true,
          };
        }

        const detail = error.payload?.detail;

        const errorStep = Number(detail?.step) || step;

        const serverErrors =
          detail?.errors || {
            _form: error.message,
          };

        setFieldErrors((previous) => ({
          ...previous,
          [errorStep]: serverErrors,
        }));

        setStepSaveState((previous) => ({
          ...previous,
          [step]: "error",
        }));

        if (error.status === 422 && errorStep >= 1 && errorStep <= 4) {
          setActiveStep(errorStep);
        }

        return {
          ok: false,
          localInvalid: false,
          serverValidation: error.status === 422,
        };

      } finally {
        if (saveQueues.current[step] === currentRequest) {
          delete saveQueues.current[step];
        }
      }
    },
    [accountId]
  );

  // Autosave after the user stops typing
  const scheduleAutosave = (step, nextData) => {
    if (!hydrated.current) return;

    clearTimeout(saveTimers.current[step]);

    setStepSaveState((previous) => ({
      ...previous,
      [step]: "dirty",
    }));

    saveTimers.current[step] = setTimeout(() => {
      saveStep(step, nextData, {
        showErrors: false,
      });
    }, 800);
  };

  // Update form fields
  const handleChange = (step, field, value) => {
    const nextData = {
      ...formData[step],
      [field]: value,
    };

    setFormData((previous) => ({
      ...previous,
      [step]: nextData,
    }));

    setFieldErrors((previous) => {
      const updated = { ...previous };

      if (updated[step]) {
        updated[step] = { ...updated[step] };
        delete updated[step][field];
      }

      return updated;
    });

    setSubmitMessage("");

    scheduleAutosave(step, nextData);
  };

  // Save current step before moving forward
  const handleNext = async () => {
    clearTimeout(saveTimers.current[activeStep]);

    const result = await saveStep(
      activeStep,
      formData[activeStep]
    );

    if (result.ok && activeStep < 4) {
      setActiveStep((previous) => previous + 1);
    }
  };

  // Move to previous step
  const handlePrevious = () => {
    if (activeStep > 1) {
      setActiveStep((previous) => previous - 1);
    }
  };

  // Submit all saved settings
  const handleSubmit = async () => {
    clearTimeout(saveTimers.current[4]);

    const result = await saveStep(4, formData[4]);

    if (!result.ok) return;

    const completedSteps = new Set([...savedSteps, 4]);

    const missingSteps = [1, 2, 3, 4].filter(
      (step) => !completedSteps.has(step)
    );

    if (missingSteps.length > 0) {
      setSubmitMessage(
        `Please save steps ${missingSteps.join(", ")} before submitting.`
      );
      return;
    }

    try {
      setSubmitting(true);
      setSubmitMessage("");

      await submitAccountSettings(accountId);

      setSubmitMessage("Account settings submitted successfully!");
    } catch (error) {
      setSubmitMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Render field error
  const renderError = (step, field) => {
    const message = fieldErrors[step]?.[field];

    if (!message) return null;

    return (
      <p className="mt-1 text-sm text-red-600" role="alert">
        {message}
      </p>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="rounded-xl bg-white p-8 text-center shadow-sm">
        Loading account settings...
      </div>
    );
  }

  // Initial load error
  if (loadError) {
    return (
      <div className="rounded-xl bg-white p-8 shadow-sm">
        <p className="mb-4 text-red-600" role="alert">
          Failed to load account settings: {loadError}
        </p>

        <button
          type="button"
          onClick={() => setLoadRetry((previous) => previous + 1)}
          className="mr-4 rounded-lg bg-blue-600 px-4 py-2 text-white"
        >
          Retry
        </button>

        <button
          type="button"
          onClick={onBack}
          className="text-gray-600 hover:underline"
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">

        <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-3 text-sm font-medium text-blue-600 hover:underline"
          >
            ← Back to Dashboard
          </button>

          <h1 className="text-2xl font-bold text-slate-800">
            Account Settings
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Editing account ID: {accountId}
          </p>
        </div>

        <span className="rounded-lg bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
          Step {activeStep} of 4
        </span>

      </div>

      {/* Step navigation */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

        {STEPS.map((label, index) => {
          const step = index + 1;

          return (
            <button
              key={step}
              type="button"
              disabled={step > activeStep}
              onClick={() => setActiveStep(step)}
              className={`rounded-lg border p-3 text-left text-sm transition ${
                activeStep === step
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : savedSteps.includes(step)
                  ? "border-green-300 bg-green-50 text-green-700"
                  : "border-slate-200 bg-white text-slate-600"
              } disabled:cursor-not-allowed disabled:opacity-70`}
            >
              <span className="block text-xs">
                STEP {step}
              </span>

              <span className="mt-1 block font-semibold">
                {label}
              </span>
            </button>
          );
        })}

      </div>

      {/* Form */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">

        <div className="mb-6 flex items-center justify-between gap-3">

          <h2 className="text-lg font-bold text-slate-800">
            {STEPS[activeStep - 1]}
          </h2>

          <span className="text-xs text-slate-500" aria-live="polite">
            {stepSaveState[activeStep] === "saving"
              ? "Saving..."
              : stepSaveState[activeStep] === "saved"
              ? "Saved"
              : stepSaveState[activeStep] === "dirty"
              ? "Unsaved changes"
              : stepSaveState[activeStep] === "error"
              ? "Save failed"
              : ""}
          </span>

        </div>

        {/* Step 1 */}
        {activeStep === 1 && (
          <div className="space-y-5">

            <div>
              <label
                htmlFor="account-name"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Account Name
              </label>

              <input
                id="account-name"
                type="text"
                value={formData[1].name}
                onChange={(e) =>
                  handleChange(1, "name", e.target.value)
                }
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />

              {renderError(1, "name")}
            </div>

            <div>
              <label
                htmlFor="account-email"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Email Address
              </label>

              <input
                id="account-email"
                type="email"
                value={formData[1].email}
                onChange={(e) =>
                  handleChange(1, "email", e.target.value)
                }
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />

              {renderError(1, "email")}
            </div>

          </div>
        )}

        {/* Step 2 */}
        {activeStep === 2 && (
          <div className="space-y-5">

            <div>
              <label
                htmlFor="account-plan"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Subscription Plan
              </label>

              <select
                id="account-plan"
                value={formData[2].plan}
                onChange={(e) =>
                  handleChange(2, "plan", e.target.value)
                }
                className="w-full rounded-lg border border-slate-300 px-4 py-3"
              >
                <option value="">Select Plan</option>
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>

              {renderError(2, "plan")}
            </div>

            <div>
              <label
                htmlFor="billing-country"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Billing Country
              </label>

              <select
                id="billing-country"
                value={formData[2].billing_country}
                onChange={(e) =>
                  handleChange(2, "billing_country", e.target.value)
                }
                className="w-full rounded-lg border border-slate-300 px-4 py-3"
              >
                <option value="">Select Country</option>
                <option value="US">United States</option>
                <option value="IN">India</option>
                <option value="GB">United Kingdom</option>
                <option value="CA">Canada</option>
                <option value="AU">Australia</option>
              </select>

              {renderError(2, "billing_country")}
            </div>

          </div>
        )}

        {/* Step 3 */}
        {activeStep === 3 && (
          <div className="space-y-5">

            <div>
              <label
                htmlFor="minutes-cap"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Monthly Minutes Cap
              </label>

              <input
                id="minutes-cap"
                type="number"
                min="0"
                value={formData[3].minutes_cap}
                onChange={(e) =>
                  handleChange(3, "minutes_cap", e.target.value)
                }
                placeholder="Enter minutes cap (optional)"
                className="w-full rounded-lg border border-slate-300 px-4 py-3"
              />

              {renderError(3, "minutes_cap")}
            </div>

            <div>
              <label
                htmlFor="sms-cap"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Monthly SMS Cap
              </label>

              <input
                id="sms-cap"
                type="number"
                min="0"
                value={formData[3].sms_cap}
                onChange={(e) =>
                  handleChange(3, "sms_cap", e.target.value)
                }
                placeholder="Enter SMS cap (optional)"
                className="w-full rounded-lg border border-slate-300 px-4 py-3"
              />

              {renderError(3, "sms_cap")}
            </div>

          </div>
        )}

        {/* Step 4 */}
        {activeStep === 4 && (
          <div className="space-y-5">

            <div>
              <label
                htmlFor="webhook-url"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Webhook URL
              </label>

              <input
                id="webhook-url"
                type="url"
                value={formData[4].webhook_url}
                onChange={(e) =>
                  handleChange(4, "webhook_url", e.target.value)
                }
                placeholder="https://example.com/webhook"
                className="w-full rounded-lg border border-slate-300 px-4 py-3"
              />

              {renderError(4, "webhook_url")}

              <p className="mt-2 text-xs text-slate-500">
                Optional. URL must start with http:// or https://.
              </p>
            </div>

          </div>
        )}

        {/* Form message */}
        {fieldErrors[activeStep]?._form && (
          <div
            role="alert"
            className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            {fieldErrors[activeStep]._form}
          </div>
        )}

        {submitMessage && (
          <div
            role="status"
            className="mt-5 rounded-lg bg-blue-50 p-3 text-sm text-blue-700"
          >
            {submitMessage}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">

          <button
            type="button"
            onClick={handlePrevious}
            disabled={activeStep === 1}
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>

          {activeStep < 4 ? (

            <button
              type="button"
              onClick={handleNext}
              disabled={stepSaveState[activeStep] === "saving"}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Save & Continue
            </button>

          ) : (

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || stepSaveState[4] === "saving"}
              className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Settings"}
            </button>

          )}

        </div>

      </div>
    </div>
  );
};

export default AccountSettings;
