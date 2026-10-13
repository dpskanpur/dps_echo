"use client";

import { Trash2 } from "lucide-react";

interface DeleteEmployeeButtonProps {
  employeeId: string;
  employeeName: string;
  action: (formData: FormData) => Promise<void>;
}

export function DeleteEmployeeButton({
  employeeId,
  employeeName,
  action,
}: DeleteEmployeeButtonProps) {
  return (
    <form action={action} className="inline">
      <input type="hidden" name="employeeId" value={employeeId} />
      <button
        type="submit"
        title="Delete Employee Record"
        onClick={(e) => {
          if (!confirm(`Are you sure you want to permanently delete the staff record for ${employeeName}?`)) {
            e.preventDefault();
          }
        }}
        className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/60 hover:text-rose-700 dark:hover:text-rose-400 rounded-lg text-slate-500 dark:text-slate-400 transition cursor-pointer"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </form>
  );
}
