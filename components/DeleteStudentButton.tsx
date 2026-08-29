"use client";

import { Trash2 } from "lucide-react";

interface DeleteStudentButtonProps {
  studentId: string;
  studentName: string;
  action: (formData: FormData) => Promise<void>;
}

export function DeleteStudentButton({
  studentId,
  studentName,
  action,
}: DeleteStudentButtonProps) {
  return (
    <form action={action} className="inline">
      <input type="hidden" name="studentId" value={studentId} />
      <button
        type="submit"
        title="Delete Student Record"
        onClick={(e) => {
          if (!confirm(`Are you sure you want to delete student record for ${studentName}?`)) {
            e.preventDefault();
          }
        }}
        className="p-1.5 bg-slate-100 hover:bg-rose-100 hover:text-rose-700 rounded-lg text-slate-500 transition cursor-pointer"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </form>
  );
}
