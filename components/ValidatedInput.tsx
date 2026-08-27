"use client";

import React, { useState } from "react";

interface ValidatedInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  label: string;
  name: string;
  fieldType?:
    | "text-only"
    | "number-only"
    | "email"
    | "phone"
    | "aadhaar"
    | "pincode"
    | "alphanumeric";
  isRequired?: boolean;
  hint?: string;
  uppercase?: boolean;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
}

export function ValidatedInput({
  label,
  name,
  fieldType = "alphanumeric",
  isRequired = false,
  hint,
  uppercase = false,
  defaultValue = "",
  placeholder = "",
  className = "",
  ...props
}: ValidatedInputProps) {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState("");

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let rawVal = e.target.value;

    if (fieldType === "text-only") {
      // Allow letters, spaces, dots, and hyphens ONLY. Block numbers strictly.
      rawVal = rawVal.replace(/[^A-Za-z\s.-]/g, "");
    } else if (
      fieldType === "number-only" ||
      fieldType === "phone" ||
      fieldType === "aadhaar" ||
      fieldType === "pincode"
    ) {
      // Allow digits ONLY. Block letters strictly.
      rawVal = rawVal.replace(/\D/g, "");

      if (fieldType === "phone" && rawVal.length > 10) {
        rawVal = rawVal.slice(0, 10);
      } else if (fieldType === "aadhaar" && rawVal.length > 12) {
        rawVal = rawVal.slice(0, 12);
      } else if (fieldType === "pincode" && rawVal.length > 6) {
        rawVal = rawVal.slice(0, 6);
      }
    } else if (fieldType === "email") {
      // Lowercase email and trim spaces
      rawVal = rawVal.toLowerCase().replace(/\s/g, "");
    }

    if (uppercase && fieldType !== "email") {
      rawVal = rawVal.toUpperCase();
    }

    setValue(rawVal);

    // Real-time error validation message
    if (isRequired && !rawVal.trim()) {
      setError(`${label.replace(/\*/g, "").trim()} is required`);
    } else if (fieldType === "phone" && rawVal.length > 0) {
      if (rawVal.length !== 10) {
        setError("Mobile number must be exactly 10 digits");
      } else if (!/^[6-9]/.test(rawVal)) {
        setError("Mobile number must start with 6, 7, 8, or 9");
      } else {
        setError("");
      }
    } else if (fieldType === "aadhaar" && rawVal.length > 0 && rawVal.length !== 12) {
      setError("Aadhaar number must be exactly 12 digits");
    } else if (fieldType === "pincode" && rawVal.length > 0 && rawVal.length !== 6) {
      setError("PIN code must be exactly 6 digits");
    } else if (fieldType === "email" && rawVal.length > 0) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(rawVal)) {
        setError("Enter a valid email (e.g. name@domain.com)");
      } else {
        setError("");
      }
    } else if (fieldType === "text-only" && isRequired && rawVal.trim().length < 1) {
      setError("This field is required");
    } else {
      setError("");
    }
  };

  // Determine HTML5 attributes
  let pattern: string | undefined = props.pattern;
  let maxLength: number | undefined = props.maxLength;
  let type = props.type || "text";

  if (fieldType === "phone") {
    type = "tel";
    pattern = "[6-9]\\d{9}";
    maxLength = 10;
  } else if (fieldType === "aadhaar") {
    pattern = "\\d{12}";
    maxLength = 12;
  } else if (fieldType === "pincode") {
    pattern = "\\d{6}";
    maxLength = 6;
  } else if (fieldType === "email") {
    type = "email";
    pattern = "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}";
  } else if (fieldType === "text-only") {
    pattern = "[A-Za-z\\s.-]{1,100}";
  }

  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
        <span>
          {label} {isRequired && <span className="text-rose-500 font-bold">*</span>}
        </span>
        {hint && <span className="text-[10px] text-slate-400 font-normal">{hint}</span>}
      </label>

      <input
        {...props}
        type={type}
        name={name}
        value={value}
        onChange={handleInput}
        required={isRequired}
        pattern={pattern}
        maxLength={maxLength}
        placeholder={placeholder}
        className={`w-full bg-slate-50 border rounded-xl p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 transition-all ${
          error
            ? "border-rose-400 bg-rose-50/40 text-rose-900 focus:ring-rose-500/20 focus:border-rose-500"
            : "border-slate-200 focus:ring-emerald-500/20 focus:border-emerald-600"
        } ${uppercase ? "uppercase" : ""} ${className}`}
      />

      {error ? (
        <p className="text-[10px] font-bold text-rose-600 mt-1 flex items-center gap-1">
          <span>⚠️</span> {error}
        </p>
      ) : null}
    </div>
  );
}
