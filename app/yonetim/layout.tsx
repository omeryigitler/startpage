import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions, isAdminEmail } from "../../lib/auth";

export const dynamic = "force-dynamic";

export default async function ManagementLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!email || !isAdminEmail(email)) {
    redirect("/giris");
  }

  return children;
}
