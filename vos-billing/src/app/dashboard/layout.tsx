import { verifySession } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardClientLayout from "./client-layout";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await verifySession();

  if (!user) {
    redirect("/login");
  }

  return (
    <DashboardClientLayout
      user={{ id: user.id, username: user.username, userType: user.userType }}
    >
      {children}
    </DashboardClientLayout>
  );
}
