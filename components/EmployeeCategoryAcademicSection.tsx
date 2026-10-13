"use client";

import { useState } from "react";
import { Briefcase, GraduationCap, ShieldCheck, Lock } from "lucide-react";

interface EmployeeCategoryAcademicSectionProps {
  initialValues?: {
    category?: string;
    designation?: string;
    department?: string | null;
    employmentType?: string;
    joiningDate?: string;
    status?: string;
    qualification?: string | null;
    subjectsTaught?: string | null;
    oasisId?: string | null;
    ctetQualified?: string;
    experienceYrs?: number;
    assignedClass?: string | null;
    assignedHouse?: string | null;
    notes?: string | null;
  };
  defaultToday?: string;
}

export function EmployeeCategoryAcademicSection({
  initialValues,
  defaultToday,
}: EmployeeCategoryAcademicSectionProps) {
  const [category, setCategory] = useState<string>(initialValues?.category || "TEACHING");
  const [ctetQualified, setCtetQualified] = useState<string>(
    initialValues?.category === "TEACHING" ? initialValues?.ctetQualified || "YES" : "NA"
  );

  const isTeaching = category === "TEACHING";

  function handleCategoryChange(newCat: string) {
    setCategory(newCat);
    if (newCat !== "TEACHING") {
      setCtetQualified("NA");
    } else {
      setCtetQualified((prev) => (prev === "NA" ? "YES" : prev));
    }
  }

  return (
    <div className="space-y-6">
      {/* Section 2: Role, Category & Employment Details */}
      <div className="bg-white dark:bg-boxdark p-6 rounded-2xl border border-slate-200/80 dark:border-strokedark shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Briefcase className="w-4 h-4 text-emerald-600" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            2. Designation &amp; Employment Classification
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              Staff Category <span className="text-rose-500">*</span>
            </label>
            <select
              name="category"
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="TEACHING">Teaching Faculty</option>
              <option value="NON_TEACHING">Non-Teaching (Lab / Library / Sports)</option>
              <option value="ADMIN">Administration / Office</option>
              <option value="SUPPORT">Support / Transport / Security</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              Designation <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="designation"
              required
              defaultValue={initialValues?.designation || ""}
              placeholder="e.g., PGT Physics, PRT, Coordinator, Librarian"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              Department / Wing
            </label>
            <input
              type="text"
              name="department"
              defaultValue={initialValues?.department || ""}
              placeholder="e.g., Primary Wing, Science Dept, Admin Office"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              Employment Nature
            </label>
            <select
              name="employmentType"
              defaultValue={initialValues?.employmentType || "PERMANENT"}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="PERMANENT">Permanent / Confirmed</option>
              <option value="PROBATION">Probation</option>
              <option value="CONTRACT">Contractual / Ad-hoc</option>
              <option value="VISITING">Visiting / Part-Time</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              Date of Joining <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              name="joiningDate"
              required
              defaultValue={initialValues?.joiningDate || defaultToday}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              Current Status
            </label>
            <select
              name="status"
              defaultValue={initialValues?.status || "ACTIVE"}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="ACTIVE">Active</option>
              <option value="ON_LEAVE">On Approved Leave</option>
              <option value="RESIGNED">Resigned</option>
              <option value="RETIRED">Retired</option>
              <option value="TRANSFERRED">Transferred</option>
            </select>
          </div>
        </div>
      </div>

      {/* Section 3: CBSE OASIS Compliance & Academic Assignments */}
      <div className="bg-white dark:bg-boxdark p-6 rounded-2xl border border-slate-200/80 dark:border-strokedark shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              3. CBSE OASIS Credentials &amp; School Assignments
            </h2>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            CBSE Mandatory Disclosure Ready
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              Academic &amp; Professional Qualification
            </label>
            <input
              type="text"
              name="qualification"
              defaultValue={initialValues?.qualification || ""}
              placeholder="e.g., M.Sc. (Physics), B.Ed."
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              Subjects Taught
            </label>
            <input
              type="text"
              name="subjectsTaught"
              defaultValue={initialValues?.subjectsTaught || ""}
              placeholder="e.g., Mathematics, Science"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              CBSE OASIS Teacher ID
            </label>
            <input
              type="text"
              name="oasisId"
              defaultValue={initialValues?.oasisId || ""}
              placeholder="e.g., OASIS-UP-44912"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* CTET / State TET Qualified - DYNAMICALLY GATED BY TEACHING STAFF */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                CTET / State TET Qualified
              </label>
              {!isTeaching && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                  <Lock className="w-2.5 h-2.5" />
                  Teaching Only
                </span>
              )}
            </div>

            {isTeaching ? (
              <select
                name="ctetQualified"
                value={ctetQualified}
                onChange={(e) => setCtetQualified(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="YES">Yes — Qualified</option>
                <option value="NO">No</option>
                <option value="NA">Not Applicable</option>
              </select>
            ) : (
              <>
                <select
                  disabled
                  value="NA"
                  className="w-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-400 dark:text-slate-500 cursor-not-allowed select-none"
                >
                  <option value="NA">Not Applicable (Admin / Support)</option>
                </select>
                <input type="hidden" name="ctetQualified" value="NA" />
              </>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              Prior Experience (Years)
            </label>
            <input
              type="number"
              name="priorExperienceYrs"
              min={0}
              max={50}
              defaultValue={initialValues?.experienceYrs ?? 0}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              Class Teacher Responsibility
            </label>
            <input
              type="text"
              name="assignedClass"
              defaultValue={initialValues?.assignedClass || ""}
              placeholder="e.g., Class IV - Section B"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              House Master / House Assignment
            </label>
            <input
              type="text"
              name="assignedHouse"
              defaultValue={initialValues?.assignedHouse || ""}
              placeholder="e.g., Nalanda / Takshashila"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              Additional Responsibilities / Administrative Remarks
            </label>
            <input
              type="text"
              name="notes"
              defaultValue={initialValues?.notes || ""}
              placeholder="e.g., Examination In-charge, Time-Table Committee"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
