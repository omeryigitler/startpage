import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function TaurusAgentRedirectPage() {
  redirect("https://omeryigitler.com/agent.html");
}
