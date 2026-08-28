"use client";

import React, { useState } from "react";

export function RegistrationFormWrapper({
  action,
  children,
}: {
  action: (formData: FormData) => Promise<void>;
  children: React.ReactNode;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const form = e.currentTarget;

    // Check validity of all form controls
    if (!form.checkValidity()) {
      e.preventDefault();
      e.stopPropagation();

      const invalidControls = Array.from(form.elements).filter(
        (el) =>
          (el instanceof HTMLInputElement ||
            el instanceof HTMLSelectElement ||
            el instanceof HTMLTextAreaElement) &&
          !el.checkValidity()
      ) as (HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)[];

      if (invalidControls.length > 0) {
        // Collect friendly names of missing required fields
        const missingNames: string[] = [];

        invalidControls.forEach((el) => {
          el.classList.add("border-rose-500", "bg-rose-50/50");
          const fieldName =
            el.getAttribute("placeholder") ||
            el.getAttribute("name") ||
            "Required Field";
          if (!missingNames.includes(fieldName)) {
            missingNames.push(fieldName.replace(/_/g, " ").toUpperCase());
          }
        });

        const firstInvalid = invalidControls[0];
        firstInvalid.focus();
        firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });

        setFormError(
          `Please fill in all mandatory fields marked in red (*): ${missingNames.slice(0, 4).join(", ")}${
            missingNames.length > 4 ? "..." : ""
          }`
        );
      }
    } else {
      setFormError(null);
      setIsSubmitting(true);
    }
  };

  return (
    <form
      action={action}
      onSubmit={handleSubmit}
      noValidate
      className="space-y-6"
    >
      {formError && (
        <div className="bg-rose-600 text-white p-4 rounded-2xl text-xs font-bold shadow-lg flex items-center justify-between gap-3 border border-rose-700 animate-pulse">
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <span>{formError}</span>
          </div>
          <button
            type="button"
            onClick={() => setFormError(null)}
            className="text-white/80 hover:text-white font-black text-sm px-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
      {children}
    </form>
  );
}
