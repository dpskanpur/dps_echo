import { redirect } from "next/navigation";

/**
 * Fee Module Shell Layout - TEMPORARILY DISABLED
 *
 * All routes under /fees/* are guarded and redirected back to the
 * dashboard while the Fee module is inactive.
 */
export default function FeesLayout({ children }: { children: React.ReactNode }) {
  redirect("/?notice=fees_module_disabled");
  /* return <>{children}</>; */
}
