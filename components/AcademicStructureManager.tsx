"use client";

import { useState, useTransition } from "react";
import {
  GraduationCap,
  Layers,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  DoorOpen,
  Calendar,
  Building2,
  X,
  ChevronDown,
  Info,
  Check,
  Search,
} from "lucide-react";
import {
  createClassAction,
  updateClassAction,
  deleteClassAction,
  createSectionAction,
  toggleSectionSessionAction,
  updateSectionSessionAction,
  deleteSectionAction,
} from "@/lib/academic-actions";

export interface CampusItem {
  id: string;
  name: string;
  code: string;
}

export interface SessionItem {
  id: string;
  name: string;
  isCurrent: boolean;
}

export interface SectionSessionData {
  academicYearId: string;
  isActive: boolean;
  maxCapacity: number;
  roomNo: string | null;
}

export interface SectionData {
  id: string;
  classId: string;
  name: string;
  roomNo: string | null;
  maxCapacity: number;
  studentCount: number;
  totalStudents: number;
  sectionSessions: SectionSessionData[];
}

export interface ClassData {
  id: string;
  campusId: string;
  name: string;
  numericGrade: number;
  sequence: number;
  sections: SectionData[];
  studentCount: number;
}

interface AcademicStructureManagerProps {
  campuses: CampusItem[];
  currentCampusId: string;
  sessions: SessionItem[];
  currentSessionId: string;
  initialClasses: ClassData[];
}

export function AcademicStructureManager({
  campuses,
  currentCampusId,
  sessions,
  currentSessionId,
  initialClasses,
}: AcademicStructureManagerProps) {
  const [selectedCampusId, setSelectedCampusId] = useState(currentCampusId);
  const [selectedSessionId, setSelectedSessionId] = useState(currentSessionId);
  const [classes, setClasses] = useState<ClassData[]>(initialClasses);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Modals state
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newClassGrade, setNewClassGrade] = useState(0);
  const [newClassInitialSections, setNewClassInitialSections] = useState("A, B");

  // Section Add Modal
  const [activeClassForNewSection, setActiveClassForNewSection] = useState<ClassData | null>(null);
  const [newSectionLetter, setNewSectionLetter] = useState("");
  const [newSectionCapacity, setNewSectionCapacity] = useState(40);
  const [newSectionRoom, setNewSectionRoom] = useState("");

  // Edit Section Session Modal
  const [editingSection, setEditingSection] = useState<{
    section: SectionData;
    className: string;
    maxCapacity: number;
    roomNo: string;
    isActive: boolean;
  } | null>(null);

  const activeCampus = campuses.find((c) => c.id === selectedCampusId) || campuses[0];
  const activeSession = sessions.find((s) => s.id === selectedSessionId) || sessions[0];

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 4500);
  };

  // Helper: Get section status for current selected session
  const getSectionSessionInfo = (section: SectionData) => {
    const sessionMatch = section.sectionSessions.find(
      (ss) => ss.academicYearId === selectedSessionId
    );
    if (sessionMatch) {
      return {
        isActive: sessionMatch.isActive,
        maxCapacity: sessionMatch.maxCapacity,
        roomNo: sessionMatch.roomNo || section.roomNo,
      };
    }
    // Default fallback: active with section's base capacity
    return {
      isActive: true,
      maxCapacity: section.maxCapacity || 40,
      roomNo: section.roomNo,
    };
  };

  // Switch campus
  const handleCampusChange = (campusId: string) => {
    window.location.href = `/admin/rbac?tab=academics&campusId=${campusId}&sessionId=${selectedSessionId}`;
  };

  // Switch session
  const handleSessionChange = (sessionId: string) => {
    window.location.href = `/admin/rbac?tab=academics&campusId=${selectedCampusId}&sessionId=${sessionId}`;
  };

  // Toggle section active in selected session
  const handleToggleSectionSession = (section: SectionData, currentActive: boolean) => {
    const nextActive = !currentActive;

    // Optimistic update
    setClasses((prev) =>
      prev.map((c) => {
        if (c.id !== section.classId) return c;
        return {
          ...c,
          sections: c.sections.map((s) => {
            if (s.id !== section.id) return s;
            const existingSs = s.sectionSessions.find((ss) => ss.academicYearId === selectedSessionId);
            const updatedSessions = existingSs
              ? s.sectionSessions.map((ss) =>
                  ss.academicYearId === selectedSessionId ? { ...ss, isActive: nextActive } : ss
                )
              : [
                  ...s.sectionSessions,
                  {
                    academicYearId: selectedSessionId,
                    isActive: nextActive,
                    maxCapacity: s.maxCapacity || 40,
                    roomNo: s.roomNo,
                  },
                ];
            return { ...s, sectionSessions: updatedSessions };
          }),
        };
      })
    );

    startTransition(async () => {
      try {
        await toggleSectionSessionAction({
          sectionId: section.id,
          academicYearId: selectedSessionId,
          isActive: nextActive,
        });
        showToast(
          `Section ${section.name} is now ${nextActive ? "Active" : "Inactive"} for ${activeSession?.name}.`
        );
      } catch (err: any) {
        showToast(err.message || "Failed to update section session state", "error");
        // Revert
        window.location.reload();
      }
    });
  };

  // Add Section Submit
  const handleAddSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClassForNewSection || !newSectionLetter.trim()) return;

    startTransition(async () => {
      try {
        await createSectionAction({
          classId: activeClassForNewSection.id,
          name: newSectionLetter.trim().toUpperCase(),
          maxCapacity: newSectionCapacity,
          roomNo: newSectionRoom.trim() || undefined,
          academicYearId: selectedSessionId,
        });
        showToast(`Section ${newSectionLetter.toUpperCase()} added to ${activeClassForNewSection.name}!`);
        setActiveClassForNewSection(null);
        setNewSectionLetter("");
        setNewSectionRoom("");
        window.location.reload();
      } catch (err: any) {
        showToast(err.message || "Failed to add section", "error");
      }
    });
  };

  // Add Class Submit
  const handleAddClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    const initialSecs = newClassInitialSections
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    startTransition(async () => {
      try {
        await createClassAction({
          campusId: selectedCampusId,
          name: newClassName.trim(),
          numericGrade: newClassGrade,
          initialSections: initialSecs.length > 0 ? initialSecs : ["A", "B"],
          academicYearId: selectedSessionId,
        });
        showToast(`Class "${newClassName.trim()}" created successfully!`);
        setIsAddClassOpen(false);
        setNewClassName("");
        window.location.reload();
      } catch (err: any) {
        showToast(err.message || "Failed to create class", "error");
      }
    });
  };

  // Edit Section Submit
  const handleEditSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection) return;

    startTransition(async () => {
      try {
        await updateSectionSessionAction({
          sectionId: editingSection.section.id,
          academicYearId: selectedSessionId,
          maxCapacity: editingSection.maxCapacity,
          roomNo: editingSection.roomNo,
          isActive: editingSection.isActive,
        });
        showToast(`Section ${editingSection.section.name} updated for ${activeSession?.name}!`);
        setEditingSection(null);
        window.location.reload();
      } catch (err: any) {
        showToast(err.message || "Failed to update section capacity", "error");
      }
    });
  };

  // Delete Section
  const handleDeleteSection = async (section: SectionData) => {
    if (section.totalStudents > 0) {
      showToast(
        `Cannot delete Section ${section.name}: ${section.totalStudents} student(s) enrolled. Deactivate it for ${activeSession?.name} instead.`,
        "error"
      );
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete Section ${section.name}?`)) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteSectionAction(section.id);
        showToast(`Section ${section.name} deleted.`);
        window.location.reload();
      } catch (err: any) {
        showToast(err.message || "Failed to delete section", "error");
      }
    });
  };

  // Delete Class
  const handleDeleteClass = async (cls: ClassData) => {
    if (cls.studentCount > 0) {
      showToast(
        `Cannot delete ${cls.name}: ${cls.studentCount} student(s) currently enrolled in this class.`,
        "error"
      );
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete class "${cls.name}" and all its sections?`)) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteClassAction(cls.id);
        showToast(`Class "${cls.name}" deleted.`);
        window.location.reload();
      } catch (err: any) {
        showToast(err.message || "Failed to delete class", "error");
      }
    });
  };

  // Filter classes
  const filteredClasses = classes.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Overall statistics for selected campus & session
  const totalClassesCount = classes.length;
  let totalActiveSections = 0;
  let totalCapacity = 0;
  let totalEnrolled = 0;

  for (const c of classes) {
    totalEnrolled += c.studentCount;
    for (const s of c.sections) {
      const info = getSectionSessionInfo(s);
      if (info.isActive) {
        totalActiveSections++;
        totalCapacity += info.maxCapacity;
      }
    }
  }

  // Pre-calculated next section letter for active class
  const getNextSectionLetter = (cls: ClassData) => {
    const existing = cls.sections.map((s) => s.name.toUpperCase());
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    for (const char of alphabet) {
      if (!existing.includes(char)) return char;
    }
    return "A";
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold shadow-md transition-all ${
            feedback.type === "success"
              ? "bg-emerald-100 text-emerald-950 border border-emerald-300"
              : "bg-rose-100 text-rose-950 border border-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 hover:bg-black/10 rounded-full transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Control Panel: Campus Selector & Session Selector */}
      <div className="bg-white dark:bg-boxdark rounded-3xl border border-slate-200 dark:border-strokedark p-6 shadow-xs space-y-6">
        {/* Campus Tabs */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
              <Building2 className="w-4 h-4 text-emerald-700" />
              <span>1. Select Campus</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              Classes &amp; sections belong to specific campus branches
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {campuses.map((c) => {
              const isSelected = c.id === selectedCampusId;
              return (
                <button
                  key={c.id}
                  onClick={() => handleCampusChange(c.id)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2.5 border ${
                    isSelected
                      ? "bg-slate-900 text-white border-slate-900 shadow-md"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200"
                  }`}
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      isSelected ? "bg-emerald-400" : "bg-slate-300"
                    }`}
                  />
                  <span>{c.name}</span>
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                      isSelected
                        ? "bg-slate-800 text-amber-300 font-bold"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {c.code}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Academic Session Selector */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
              <Calendar className="w-4 h-4 text-emerald-700" />
              <span>2. Select Academic Session (Dynamic Allocation)</span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Sections, intake capacities, and room allocations are tailored per session
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {sessions.map((s) => {
              const isSelected = s.id === selectedSessionId;
              return (
                <button
                  key={s.id}
                  onClick={() => handleSessionChange(s.id)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 border ${
                    isSelected
                      ? "bg-emerald-900 text-white border-emerald-900 shadow-md"
                      : "bg-emerald-50/60 text-emerald-950 hover:bg-emerald-100/70 border-emerald-200"
                  }`}
                >
                  <Calendar className={`w-3.5 h-3.5 ${isSelected ? "text-amber-300" : "text-emerald-700"}`} />
                  <span>Session {s.name}</span>
                  {s.isCurrent ? (
                    <span className="bg-emerald-500 text-white text-[9px] px-1.5 py-0.5 rounded font-black">
                      CURRENT
                    </span>
                  ) : (
                    <span className="bg-amber-400 text-amber-950 text-[9px] px-1.5 py-0.5 rounded font-black">
                      UPCOMING
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Information Banner on Dynamic Allocation */}
        <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-4 text-xs text-amber-950 flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">
              Dynamic Session Capacity &amp; Section Expansion ({activeCampus?.name} • Session {activeSession?.name}):
            </p>
            <p className="text-[11px] text-amber-900 leading-relaxed">
              You can expand or contract sections independently per academic year. For instance, Nursery can operate with
              <strong> 3 sections (A, B, C)</strong> in the current session, and you can enable <strong>Section D</strong> in the upcoming session to meet higher admission demand.
              Toggling a section inactive for a session preserves historical records while hiding it from active admissions.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Overview Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-boxdark p-4 rounded-2xl border border-slate-200 dark:border-strokedark shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Total Classes</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalClassesCount}</div>
          <span className="text-[10px] text-slate-400 font-medium">Mapped to {activeCampus?.code}</span>
        </div>

        <div className="bg-white dark:bg-boxdark p-4 rounded-2xl border border-slate-200 dark:border-strokedark shadow-xs">
          <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wide">Active Sections</span>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">{totalActiveSections}</div>
          <span className="text-[10px] text-emerald-600 font-medium">In Session {activeSession?.name}</span>
        </div>

        <div className="bg-white dark:bg-boxdark p-4 rounded-2xl border border-slate-200 dark:border-strokedark shadow-xs">
          <span className="text-[11px] font-bold text-blue-800 dark:text-blue-400 uppercase tracking-wide">Total Capacity</span>
          <div className="text-2xl font-black text-blue-700 dark:text-blue-400 mt-1">{totalCapacity}</div>
          <span className="text-[10px] text-blue-600 font-medium">Max intake capacity</span>
        </div>

        <div className="bg-white dark:bg-boxdark p-4 rounded-2xl border border-slate-200 dark:border-strokedark shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Enrolled Students</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalEnrolled}</div>
          <span className="text-[10px] text-slate-400 font-medium">Current session students</span>
        </div>
      </div>

      {/* Action Bar: Search & Add Class */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search classes (e.g. Nursery, Prep, Class I)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-boxdark border border-slate-200 dark:border-strokedark pl-10 pr-4 py-2.5 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
          />
        </div>

        <button
          onClick={() => setIsAddClassOpen(true)}
          className="bg-emerald-900 hover:bg-emerald-950 text-white px-4 py-2.5 rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-sm transition"
        >
          <Plus className="w-4 h-4 text-amber-300" />
          <span>Add New Class</span>
        </button>
      </div>

      {/* Classes & Dynamic Sections List */}
      <div className="space-y-4">
        {filteredClasses.length === 0 ? (
          <div className="bg-white dark:bg-boxdark rounded-3xl border border-slate-200 dark:border-strokedark p-12 text-center space-y-3">
            <GraduationCap className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">No classes found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No classes matched your filter, or none have been created yet for {activeCampus?.name}.
            </p>
            <button
              onClick={() => setIsAddClassOpen(true)}
              className="mt-2 inline-flex items-center gap-2 bg-emerald-900 text-white text-xs font-bold px-4 py-2 rounded-xl"
            >
              <Plus className="w-3.5 h-3.5 text-amber-300" />
              <span>Create First Class</span>
            </button>
          </div>
        ) : (
          filteredClasses.map((cls) => {
            const activeSections = cls.sections.filter((s) => getSectionSessionInfo(s).isActive);
            const classCapacity = activeSections.reduce(
              (sum, s) => sum + getSectionSessionInfo(s).maxCapacity,
              0
            );

            return (
              <div
                key={cls.id}
                className="bg-white dark:bg-boxdark rounded-3xl border border-slate-200 dark:border-strokedark shadow-xs overflow-hidden transition"
              >
                {/* Class Card Header */}
                <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/20">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 font-black text-xs flex items-center justify-center border border-emerald-200 dark:border-emerald-800 shrink-0">
                      {cls.numericGrade === 0 ? "KG" : `G${cls.numericGrade}`}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white">
                          {cls.name}
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          Seq: {cls.sequence}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        <strong className="text-emerald-700 font-bold">{activeSections.length}</strong> active section{activeSections.length === 1 ? "" : "s"} in {activeSession?.name} • Intake Capacity: <strong>{classCapacity}</strong> • Enrolled: <strong>{cls.studentCount}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Actions for Class */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setActiveClassForNewSection(cls);
                        setNewSectionLetter(getNextSectionLetter(cls));
                        setNewSectionCapacity(40);
                        setNewSectionRoom("");
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 flex items-center gap-1.5 transition shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Add Section</span>
                    </button>

                    <button
                      onClick={() => handleDeleteClass(cls)}
                      disabled={cls.studentCount > 0}
                      title={cls.studentCount > 0 ? "Cannot delete class with enrolled students" : "Delete class"}
                      className={`p-2 rounded-xl transition ${
                        cls.studentCount > 0
                          ? "opacity-30 cursor-not-allowed text-slate-400"
                          : "hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Sections List for this Class */}
                <div className="p-4 sm:p-5">
                  {cls.sections.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      No sections created for {cls.name} yet. Click "Add Section" above to define Section A.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                      {cls.sections.map((section) => {
                        const sessionInfo = getSectionSessionInfo(section);
                        const isSectionActive = sessionInfo.isActive;

                        return (
                          <div
                            key={section.id}
                            className={`p-3.5 rounded-2xl border transition relative flex flex-col justify-between ${
                              isSectionActive
                                ? "bg-white dark:bg-boxdark border-emerald-200 dark:border-emerald-800/60 shadow-xs"
                                : "bg-slate-50/80 dark:bg-slate-900/40 border-dashed border-slate-300 dark:border-slate-800 opacity-75"
                            }`}
                          >
                            <div>
                              {/* Header: Section Letter & Active Toggle */}
                              <div className="flex items-center justify-between gap-2 mb-2.5">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                                      isSectionActive
                                        ? "bg-emerald-800 text-amber-300"
                                        : "bg-slate-300 text-slate-700"
                                    }`}
                                  >
                                    {section.name}
                                  </span>
                                  <div>
                                    <span className="text-xs font-black text-slate-800 dark:text-white">
                                      Section {section.name}
                                    </span>
                                  </div>
                                </div>

                                {/* Active Toggle for Current Session */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleSectionSession(section, isSectionActive)}
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition ${
                                    isSectionActive
                                      ? "bg-emerald-100 text-emerald-900 hover:bg-emerald-200 border border-emerald-300"
                                      : "bg-slate-200 text-slate-600 hover:bg-slate-300 border border-slate-300"
                                  }`}
                                  title={`Toggle active/inactive for ${activeSession?.name}`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      isSectionActive ? "bg-emerald-600" : "bg-slate-400"
                                    }`}
                                  />
                                  <span>{isSectionActive ? "Active" : "Off in " + activeSession?.name}</span>
                                </button>
                              </div>

                              {/* Details: Capacity, Room, Enrolled */}
                              <div className="space-y-1.5 text-[11px] pt-1">
                                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                                  <span className="flex items-center gap-1.5 text-slate-400">
                                    <Users className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Intake Capacity:</span>
                                  </span>
                                  <strong className="font-mono text-slate-900 dark:text-white">
                                    {sessionInfo.maxCapacity} seats
                                  </strong>
                                </div>

                                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                                  <span className="flex items-center gap-1.5 text-slate-400">
                                    <DoorOpen className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Classroom:</span>
                                  </span>
                                  <span className="text-slate-800 dark:text-slate-200 font-medium">
                                    {sessionInfo.roomNo || "Unassigned"}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-100 dark:border-slate-800">
                                  <span className="text-slate-400">Enrolled ({activeSession?.name}):</span>
                                  <span
                                    className={`font-black font-mono text-[11px] ${
                                      section.studentCount >= sessionInfo.maxCapacity
                                        ? "text-rose-600 font-bold"
                                        : "text-emerald-700"
                                    }`}
                                  >
                                    {section.studentCount} / {sessionInfo.maxCapacity}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Section Footer: Quick Edit & Delete */}
                            <div className="flex items-center justify-between gap-2 pt-2.5 mt-2.5 border-t border-slate-100 dark:border-slate-800">
                              <button
                                onClick={() =>
                                  setEditingSection({
                                    section,
                                    className: cls.name,
                                    maxCapacity: sessionInfo.maxCapacity,
                                    roomNo: sessionInfo.roomNo || "",
                                    isActive: sessionInfo.isActive,
                                  })
                                }
                                className="text-[11px] font-bold text-slate-600 hover:text-emerald-800 flex items-center gap-1 transition"
                              >
                                <Edit2 className="w-3 h-3 text-slate-400" />
                                <span>Edit Session Details</span>
                              </button>

                              <button
                                onClick={() => handleDeleteSection(section)}
                                disabled={section.totalStudents > 0}
                                title={
                                  section.totalStudents > 0
                                    ? "Cannot delete section: students are enrolled. Deactivate it instead."
                                    : "Delete section"
                                }
                                className={`p-1 rounded-md transition ${
                                  section.totalStudents > 0
                                    ? "opacity-20 cursor-not-allowed text-slate-400"
                                    : "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                }`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: ADD NEW CLASS */}
      {isAddClassOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-boxdark rounded-3xl border border-slate-200 dark:border-strokedark p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold">
                  <GraduationCap className="w-4 h-4 text-emerald-800" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Add New Class for {activeCampus?.name}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Defines a grade level and its default sections
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddClassOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddClassSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Class / Grade Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nursery, Prep, Class XI (Science)"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-strokedark rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {["Playgroup", "Pre-Nursery", "Nursery", "Prep", "Class I", "Class VI", "Class XI (Science)", "Class XI (Commerce)"].map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setNewClassName(sug)}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-medium"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Numeric Grade (0-12) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="12"
                    required
                    value={newClassGrade}
                    onChange={(e) => setNewClassGrade(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-strokedark rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Use 0 for Playgroup, Nursery, Prep</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Initial Sections
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. A, B, C"
                    value={newClassInitialSections}
                    onChange={(e) => setNewClassInitialSections(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-strokedark rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Comma separated</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddClassOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-emerald-900 hover:bg-emerald-950 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Class</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD NEW SECTION TO CLASS */}
      {activeClassForNewSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-boxdark rounded-3xl border border-slate-200 dark:border-strokedark p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold">
                  <Layers className="w-4 h-4 text-emerald-800" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Add Section to {activeClassForNewSection.name}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Allocated dynamically for Session {activeSession?.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveClassForNewSection(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSectionSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Section Letter *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    value={newSectionLetter}
                    onChange={(e) => setNewSectionLetter(e.target.value.toUpperCase())}
                    placeholder="e.g. C, D"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-strokedark rounded-xl p-2.5 text-xs font-bold uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Intake Capacity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={newSectionCapacity}
                    onChange={(e) => setNewSectionCapacity(parseInt(e.target.value, 10) || 40)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-strokedark rounded-xl p-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Classroom / Room No.
                </label>
                <input
                  type="text"
                  placeholder="e.g. Room 104, Block B"
                  value={newSectionRoom}
                  onChange={(e) => setNewSectionRoom(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-strokedark rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  This section will automatically be marked <strong>Active</strong> in Session <strong>{activeSession?.name}</strong>.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveClassForNewSection(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-emerald-900 hover:bg-emerald-950 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Section</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT SECTION SESSION CAPACITY & ROOM */}
      {editingSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-boxdark rounded-3xl border border-slate-200 dark:border-strokedark p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold">
                  <Edit2 className="w-4 h-4 text-emerald-800" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    {editingSection.className} — Section {editingSection.section.name}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Session {activeSession?.name} Configuration
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingSection(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSectionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Intake Capacity for Session {activeSession?.name} *
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  required
                  value={editingSection.maxCapacity}
                  onChange={(e) =>
                    setEditingSection({
                      ...editingSection,
                      maxCapacity: parseInt(e.target.value, 10) || 40,
                    })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-strokedark rounded-xl p-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Classroom / Room Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. Room 102"
                  value={editingSection.roomNo}
                  onChange={(e) =>
                    setEditingSection({
                      ...editingSection,
                      roomNo: e.target.value,
                    })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-strokedark rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="modalIsActive"
                  checked={editingSection.isActive}
                  onChange={(e) =>
                    setEditingSection({
                      ...editingSection,
                      isActive: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <label htmlFor="modalIsActive" className="text-xs font-bold text-slate-800 dark:text-white cursor-pointer">
                  Active in Session {activeSession?.name}
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingSection(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-emerald-900 hover:bg-emerald-950 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
