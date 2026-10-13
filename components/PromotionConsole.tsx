"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  Users,
  GraduationCap,
  RefreshCw,
  Search,
  Filter,
} from "lucide-react";
import { executeBatchPromotion, PromotionItemInput } from "@/lib/promotion-actions";
import Link from "next/link";

interface PromotionConsoleProps {
  students: any[];
  campuses: any[];
  classes: any[];
  academicSessions: any[];
  sourceCampusId: string;
  sourceClassId: string;
  sourceSession: string;
  targetSession: string;
}

export function PromotionConsole({
  students,
  campuses,
  classes,
  academicSessions,
  sourceCampusId,
  sourceClassId,
  sourceSession,
  targetSession,
}: PromotionConsoleProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Selected student IDs for promotion
  const [selectedStudentIds, setSelectedStudentIds] = useState<Record<string, boolean>>({});

  // Individual promotion overrides per student
  const [rowOverrides, setRowOverrides] = useState<
    Record<
      string,
      {
        action: "PROMOTE" | "BRANCH_TRANSFER" | "RETAIN" | "GRADUATED";
        targetCampusId: string;
        targetClassId: string;
        targetSectionId: string;
      }
    >
  >({});

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setFeedbackMessage({ text, type });
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  // Helper to find the next class in sequence
  const getNextClass = (currentClass: any, targetCampusId: string) => {
    const campusClasses = classes.filter((c) => c.campusId === targetCampusId);
    if (!currentClass || campusClasses.length === 0) return campusClasses[0];

    const currentGrade = currentClass.numericGrade ?? 0;
    const nextClass = campusClasses.find((c) => (c.numericGrade ?? 0) === currentGrade + 1);
    return nextClass || campusClasses[campusClasses.length - 1];
  };

  const getRowState = (student: any) => {
    if (rowOverrides[student.id]) return rowOverrides[student.id];

    // Defaults
    const defaultCampusId = student.campusId;
    const nextClass = getNextClass(student.class, defaultCampusId);

    return {
      action: "PROMOTE" as const,
      targetCampusId: defaultCampusId,
      targetClassId: nextClass?.id || student.classId,
      targetSectionId: student.sectionId || "",
    };
  };

  const updateRowState = (studentId: string, updates: Partial<{ action: any; targetCampusId: any; targetClassId: any; targetSectionId: any }>) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return;

    const current = getRowState(student);
    const newCampusId = updates.targetCampusId || current.targetCampusId;

    // Recalculate default next class if campus changed
    let newClassId = updates.targetClassId || current.targetClassId;
    if (updates.targetCampusId && updates.targetCampusId !== current.targetCampusId) {
      const nextClass = getNextClass(student.class, newCampusId);
      newClassId = nextClass?.id || student.classId;
    }

    setRowOverrides((prev) => ({
      ...prev,
      [studentId]: {
        action: updates.action || current.action,
        targetCampusId: newCampusId,
        targetClassId: newClassId,
        targetSectionId: updates.targetSectionId !== undefined ? updates.targetSectionId : current.targetSectionId,
      },
    }));
  };

  const toggleSelectAll = () => {
    if (Object.keys(selectedStudentIds).length === students.length && students.length > 0) {
      setSelectedStudentIds({});
    } else {
      const newSel: Record<string, boolean> = {};
      students.forEach((s) => (newSel[s.id] = true));
      setSelectedStudentIds(newSel);
    }
  };

  const toggleSelectStudent = (id: string) => {
    setSelectedStudentIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleExecutePromotions = () => {
    const selectedList = students.filter((s) => selectedStudentIds[s.id]);
    if (selectedList.length === 0) {
      showToast("Please select at least one student to promote or transfer.", "error");
      return;
    }

    const items: PromotionItemInput[] = selectedList.map((s) => {
      const row = getRowState(s);
      return {
        studentId: s.id,
        action: row.action,
        targetCampusId: row.targetCampusId,
        targetClassId: row.targetClassId,
        targetSectionId: row.targetSectionId || null,
        targetSession,
      };
    });

    startTransition(async () => {
      try {
        const res = await executeBatchPromotion(items);
        showToast(res.message, "success");
        setSelectedStudentIds({});
        setRowOverrides({});
        router.refresh();
      } catch (err: any) {
        showToast(err.message || "Failed to execute batch promotion", "error");
      }
    });
  };

  const selectedCount = Object.values(selectedStudentIds).filter(Boolean).length;

  return (
    <div className="space-y-6 w-full">
      {/* Toast */}
      {feedbackMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-semibold animate-in fade-in slide-in-from-bottom-3 ${
            feedbackMessage.type === "success" ? "bg-[#0F9D58] text-white" : "bg-rose-600 text-white"
          }`}
        >
          {feedbackMessage.type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
          <Filter className="w-4 h-4 text-emerald-800" />
          <span>Session Transition Filters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Source Campus */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Source Campus *</label>
            <select
              value={sourceCampusId}
              onChange={(e) =>
                router.push(
                  `/students/promotion?sourceCampusId=${e.target.value}&sourceClassId=${sourceClassId}&sourceSession=${sourceSession}&targetSession=${targetSession}`
                )
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F9D58] cursor-pointer"
            >
              <option value="ALL">🌐 All Campuses (Combined)</option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  🏫 {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          {/* Source Class */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Source Class *</label>
            <select
              value={sourceClassId}
              onChange={(e) =>
                router.push(
                  `/students/promotion?sourceCampusId=${sourceCampusId}&sourceClassId=${e.target.value}&sourceSession=${sourceSession}&targetSession=${targetSession}`
                )
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F9D58] cursor-pointer"
            >
              <option value="">All Classes</option>
              {classes
                .filter((c) => sourceCampusId === "ALL" || c.campusId === sourceCampusId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.campus.code})
                  </option>
                ))}
            </select>
          </div>

          {/* Source Session */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Current Session *</label>
            <select
              value={sourceSession}
              onChange={(e) =>
                router.push(
                  `/students/promotion?sourceCampusId=${sourceCampusId}&sourceClassId=${sourceClassId}&sourceSession=${e.target.value}&targetSession=${targetSession}`
                )
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F9D58] cursor-pointer"
            >
              <option value="2025-2026">2025-2026</option>
              <option value="2026-2027">2026-2027</option>
            </select>
          </div>

          {/* Target Session */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Target Session (Promoting To) *</label>
            <select
              value={targetSession}
              onChange={(e) =>
                router.push(
                  `/students/promotion?sourceCampusId=${sourceCampusId}&sourceClassId=${sourceClassId}&sourceSession=${sourceSession}&targetSession=${e.target.value}`
                )
              }
              className="w-full bg-emerald-50 border border-emerald-300 rounded-xl p-2.5 text-xs font-bold text-emerald-950 focus:outline-none focus:ring-2 focus:ring-[#0F9D58] cursor-pointer"
            >
              <option value="2026-2027">2026-2027 (Active)</option>
              <option value="2027-2028">2027-2028</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Promotion Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden space-y-0">
        <div className="p-5 sm:p-6 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSelectAll}
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer transition shadow-2xs"
            >
              {Object.keys(selectedStudentIds).length === students.length && students.length > 0
                ? "Deselect All"
                : "Select All"}
            </button>
            <span className="text-xs font-bold text-slate-700">
              Students Found: <strong>{students.length}</strong> | Selected:{" "}
              <strong className="text-emerald-800 font-black">{selectedCount}</strong>
            </span>
          </div>

          <button
            onClick={handleExecutePromotions}
            disabled={isPending || selectedCount === 0}
            className="inline-flex items-center gap-2 bg-[#0F9D58] hover:bg-[#0d8a4d] active:scale-95 text-white font-bold text-xs sm:text-sm px-6 py-2.5 rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {isPending
                ? "Processing Batch Promotions..."
                : `Execute Promotion & Transfers (${selectedCount})`}
            </span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider border-b border-slate-800">
                <th className="p-4 w-[50px] text-center">Select</th>
                <th className="p-4 min-w-[200px]">Student & Current Class</th>
                <th className="p-4 min-w-[160px]">Promotion Action</th>
                <th className="p-4 min-w-[180px]">Target Campus (School)</th>
                <th className="p-4 min-w-[150px]">Target Class</th>
                <th className="p-4 min-w-[100px]">Section</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    No active students found matching the selected filters.
                  </td>
                </tr>
              ) : (
                students.map((student) => {
                  const isSelected = !!selectedStudentIds[student.id];
                  const row = getRowState(student);
                  const isBranchTransfer = student.campusId !== row.targetCampusId;

                  // Target classes for selected target campus
                  const campusClasses = classes.filter((c) => c.campusId === row.targetCampusId);

                  return (
                    <tr
                      key={student.id}
                      className={`hover:bg-slate-50/80 transition ${
                        isSelected ? "bg-emerald-50/30" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectStudent(student.id)}
                          className="w-4 h-4 rounded text-[#0F9D58] focus:ring-[#0F9D58] accent-[#0F9D58] cursor-pointer"
                        />
                      </td>

                      {/* Student Info */}
                      <td className="p-4">
                        <div className="space-y-1">
                          <Link
                            href={`/students/${student.id}`}
                            className="font-bold text-slate-900 hover:text-emerald-800 text-xs sm:text-sm block"
                          >
                            {student.firstName} {student.lastName}
                          </Link>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[10px] text-slate-500 font-semibold">
                              {student.scholarNo}
                            </span>
                            <span className="text-[10px] font-black uppercase text-emerald-950 bg-emerald-100 border border-emerald-200 px-2 py-0.2 rounded-full">
                              {student.campus.code}
                            </span>
                            <span className="text-xs font-semibold text-slate-700">
                              {student.class.name} {student.section?.name ? `(${student.section.name})` : ""}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Action Dropdown */}
                      <td className="p-4">
                        <select
                          value={row.action}
                          onChange={(e) => updateRowState(student.id, { action: e.target.value as any })}
                          className={`w-full text-xs font-bold rounded-xl px-3 py-2 border cursor-pointer ${
                            isBranchTransfer
                              ? "bg-purple-50 border-purple-300 text-purple-950"
                              : row.action === "RETAIN"
                              ? "bg-amber-50 border-amber-300 text-amber-950"
                              : row.action === "GRADUATED"
                              ? "bg-rose-50 border-rose-300 text-rose-950"
                              : "bg-emerald-50 border-emerald-300 text-emerald-950"
                          }`}
                        >
                          <option value="PROMOTE">🎓 Promote Next Class</option>
                          <option value="BRANCH_TRANSFER">🔄 Promote & Branch Transfer</option>
                          <option value="RETAIN">🔁 Retain in Same Class</option>
                          <option value="GRADUATED">🎓 Graduated / TC Issued</option>
                        </select>
                      </td>

                      {/* Target Campus */}
                      <td className="p-4">
                        <select
                          value={row.targetCampusId}
                          onChange={(e) =>
                            updateRowState(student.id, {
                              targetCampusId: e.target.value,
                              action: e.target.value !== student.campusId ? "BRANCH_TRANSFER" : "PROMOTE",
                            })
                          }
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none cursor-pointer"
                        >
                          {campuses.map((c) => (
                            <option key={c.id} value={c.id}>
                              🏫 {c.name} ({c.code})
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Target Class */}
                      <td className="p-4">
                        <select
                          value={row.targetClassId}
                          onChange={(e) => updateRowState(student.id, { targetClassId: e.target.value })}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none cursor-pointer"
                        >
                          {campusClasses.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Target Section */}
                      <td className="p-4">
                        <select
                          value={row.targetSectionId}
                          onChange={(e) => updateRowState(student.id, { targetSectionId: e.target.value })}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 font-bold text-slate-900 focus:outline-none cursor-pointer"
                        >
                          <option value="">Unassigned</option>
                          <option value="sec-a">Section A</option>
                          <option value="sec-b">Section B</option>
                          <option value="sec-c">Section C</option>
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
