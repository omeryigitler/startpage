import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AgentRedirectPage() {
  redirect("https://vercel.com/omeryigitlers-projects/startpage/agent");
}
