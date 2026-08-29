import { redirect } from "next/navigation";

export default function CampusesRedirectPage() {
  redirect("/admin/rbac?tab=system");
}
