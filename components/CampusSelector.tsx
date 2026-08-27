"use client";

import { useRouter } from "next/navigation";

export function CampusSelector({
  campuses,
  selectedCampusId,
  mode,
}: {
  campuses: { id: string; name: string; code: string }[];
  selectedCampusId: string;
  mode: string;
}) {
  const router = useRouter();

  return (
    <div className="relative">
      <select
        value={selectedCampusId}
        onChange={(e) => {
          const campusId = e.target.value;
          router.push(`/students/new?campus=${campusId}&mode=${mode}`);
        }}
        className="w-full bg-emerald-50 border border-emerald-300 rounded-xl p-2.5 text-xs font-bold text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 cursor-pointer"
      >
        {campuses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({c.code})
          </option>
        ))}
      </select>
    </div>
  );
}
