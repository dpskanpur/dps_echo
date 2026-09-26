"use client";

import { useState, useTransition } from "react";
import { Users, Link2, Unlink, Plus, Search, Building2, GraduationCap, CheckCircle2, AlertCircle, X, Shield } from "lucide-react";
import { linkSiblings, unlinkSibling, searchSiblingsToLink } from "@/lib/promotion-actions";
import Link from "next/link";

interface Sibling {
  id: string;
  firstName: string;
  lastName: string;
  scholarNo: string;
  photoUrl?: string | null;
  status: string;
  campus: { id: string; name: string; code: string };
  class: { id: string; name: string };
  section?: { id: string; name: string } | null;
  guardians: { name: string; phone: string }[];
}

export function SiblingLinkCard({
  currentStudentId,
  familyId,
  initialSiblings,
}: {
  currentStudentId: string;
  familyId?: string | null;
  initialSiblings: Sibling[];
}) {
  const [siblings, setSiblings] = useState<Sibling[]>(initialSiblings);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const results = await searchSiblingsToLink(query, currentStudentId);
      setSearchResults(results);
    } catch {
      showToast("Search failed", "error");
    } finally {
      setIsSearching(false);
    }
  };

  const handleLink = (targetId: string) => {
    startTransition(async () => {
      try {
        await linkSiblings(currentStudentId, targetId);
        showToast("Sibling linked successfully under shared Family Group!");
        setIsModalOpen(false);
        setSearchQuery("");
        setSearchResults([]);
        window.location.reload();
      } catch (err: any) {
        showToast(err.message || "Failed to link sibling", "error");
      }
    });
  };

  const handleUnlink = (siblingId: string, name: string) => {
    if (!confirm(`Are you sure you want to unlink ${name} from this family group?`)) return;
    startTransition(async () => {
      try {
        await unlinkSibling(siblingId);
        showToast(`Unlinked ${name}`);
        setSiblings((prev) => prev.filter((s) => s.id !== siblingId));
      } catch (err: any) {
        showToast(err.message || "Failed to unlink sibling", "error");
      }
    });
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-5">
      {/* Toast */}
      {feedback && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-semibold animate-in fade-in slide-in-from-bottom-3 ${
            feedback.type === "success" ? "bg-[#0F9D58] text-white" : "bg-rose-600 text-white"
          }`}
        >
          {feedback.type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center font-bold shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-slate-900 text-base">Linked Siblings & Family Group</h3>
              {familyId && (
                <span className="text-[10px] font-mono font-bold bg-purple-100 text-purple-900 px-2 py-0.5 rounded-full border border-purple-200">
                  {familyId}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Connect brothers & sisters studying across any of the 4 DPS Kanpur campuses.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer w-fit"
        >
          <Plus className="w-4 h-4" /> Link Sibling
        </button>
      </div>

      {/* List of Siblings */}
      {siblings.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl space-y-1">
          <p className="font-bold text-slate-600">No linked siblings recorded yet.</p>
          <p className="text-[11px]">Click "Link Sibling" above to connect a brother or sister studying in any campus.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {siblings.map((sib) => (
            <div
              key={sib.id}
              className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 hover:bg-slate-50 transition flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-200 border border-slate-300 flex items-center justify-center font-black text-slate-700 text-xs shrink-0">
                  {sib.photoUrl ? (
                    <img src={sib.photoUrl} alt="" className="w-10 h-10 rounded-xl object-cover" />
                  ) : (
                    `${sib.firstName.slice(0, 1)}${sib.lastName.slice(0, 1)}`
                  )}
                </div>
                <div className="min-w-0 space-y-0.5">
                  <Link
                    href={`/students/${sib.id}`}
                    className="font-bold text-slate-900 text-xs sm:text-sm hover:text-purple-700 truncate block"
                  >
                    {sib.firstName} {sib.lastName}
                  </Link>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] text-slate-500 font-semibold">{sib.scholarNo}</span>
                    <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-900 border border-emerald-200 px-1.5 py-0.2 rounded-full">
                      {sib.campus.code}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-700">
                      {sib.class.name} {sib.section?.name ? `(${sib.section.name})` : ""}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleUnlink(sib.id, `${sib.firstName} ${sib.lastName}`)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition shrink-0"
                title="Unlink Sibling"
              >
                <Unlink className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Link Sibling Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-purple-700" />
                <h3 className="font-black text-slate-900 text-base">Link Sibling Across Campuses</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Search by Scholar ID, Registration No, or Name across all 4 DPS Kanpur campuses to link as a sibling under this family group.
            </p>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by Scholar ID (e.g. DPS-AZD-2026-0001) or Name..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition"
              />
            </div>

            {/* Results */}
            <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-100 rounded-2xl p-2 bg-slate-50/50">
              {isSearching ? (
                <p className="p-4 text-center text-xs text-slate-400">Searching across campuses...</p>
              ) : searchResults.length === 0 ? (
                <p className="p-4 text-center text-xs text-slate-400">
                  {searchQuery.length >= 2 ? "No student found matching query." : "Type at least 2 characters to search."}
                </p>
              ) : (
                searchResults.map((res) => (
                  <div
                    key={res.id}
                    className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3 hover:bg-purple-50/30 transition"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                        <span>{res.name}</span>
                        <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200">
                          {res.scholarNo}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="font-bold text-emerald-800">{res.campusCode}</span>
                        <span>• {res.className}</span>
                        <span>• Parent: {res.parentName}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleLink(res.id)}
                      disabled={isPending}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-xl transition shadow-2xs shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      {isPending ? "Linking..." : "Link Sibling"}
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
