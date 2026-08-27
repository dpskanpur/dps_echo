"use client";

import { useState } from "react";

const ORDINAL_DAYS = [
  "",
  "FIRST",
  "SECOND",
  "THIRD",
  "FOURTH",
  "FIFTH",
  "SIXTH",
  "SEVENTH",
  "EIGHTH",
  "NINTH",
  "TENTH",
  "ELEVENTH",
  "TWELFTH",
  "THIRTEENTH",
  "FOURTEENTH",
  "FIFTEENTH",
  "SIXTEENTH",
  "SEVENTEENTH",
  "EIGHTEENTH",
  "NINETEENTH",
  "TWENTIETH",
  "TWENTY FIRST",
  "TWENTY SECOND",
  "TWENTY THIRD",
  "TWENTY FOURTH",
  "TWENTY FIFTH",
  "TWENTY SIXTH",
  "TWENTY SEVENTH",
  "TWENTY EIGHTH",
  "TWENTY NINTH",
  "THIRTIETH",
  "THIRTY FIRST",
];

const MONTHS = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
];

function yearToWords(year: number): string {
  const ones = [
    "",
    "ONE",
    "TWO",
    "THREE",
    "FOUR",
    "FIVE",
    "SIX",
    "SEVEN",
    "EIGHT",
    "NINE",
    "TEN",
    "ELEVEN",
    "TWELVE",
    "THIRTEEN",
    "FOURTEEN",
    "FIFTEEN",
    "SIXTEEN",
    "SEVENTEEN",
    "EIGHTEEN",
    "NINETEEN",
  ];
  const tens = [
    "",
    "",
    "TWENTY",
    "THIRTY",
    "FORTY",
    "FIFTY",
    "SIXTY",
    "SEVENTY",
    "EIGHTY",
    "NINETY",
  ];

  if (year >= 2000 && year < 2100) {
    const rest = year - 2000;
    if (rest === 0) return "TWO THOUSAND";
    if (rest < 20) return `TWO THOUSAND ${ones[rest]}`;
    const t = Math.floor(rest / 10);
    const o = rest % 10;
    return `TWO THOUSAND ${tens[t]}${o ? " " + ones[o] : ""}`;
  }
  return String(year);
}

export function formatDateInWords(dateString: string): string {
  if (!dateString) return "";
  const parts = dateString.split("-");
  if (parts.length !== 3) return "";
  const year = parseInt(parts[0], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(monthIdx) || isNaN(day)) return "";

  const dayWord = ORDINAL_DAYS[day] || String(day);
  const monthWord = MONTHS[monthIdx] || "";
  const yearWord = yearToWords(year);

  return `${dayWord} ${monthWord} ${yearWord}`.trim();
}

export function DobInputWithWords({
  initialDob = "",
  initialDobInWords = "",
}: {
  initialDob?: string;
  initialDobInWords?: string;
}) {
  const [dob, setDob] = useState(initialDob);
  const [words, setWords] = useState(initialDobInWords);

  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDob(val);
    if (val) {
      const generatedWords = formatDateInWords(val);
      setWords(generatedWords);
    } else {
      setWords("");
    }
  };

  return (
    <>
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">
          Date of Birth (DD/MM/YYYY) *
        </label>
        <input
          type="date"
          name="dob"
          value={dob}
          onChange={handleDobChange}
          required
          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 cursor-pointer"
        />
      </div>

      <div className="sm:col-span-2">
        <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
          <span>Date of Birth (in Words)</span>
          <span className="text-[10px] text-emerald-700 font-semibold">✨ Auto-converted</span>
        </label>
        <input
          type="text"
          name="dobInWords"
          value={words}
          onChange={(e) => setWords(e.target.value)}
          placeholder="Select DOB above to auto-convert to words..."
          className="w-full bg-emerald-50/50 border border-emerald-200 rounded-xl p-2.5 text-xs font-bold text-emerald-950 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
        />
      </div>
    </>
  );
}
