import { LimsChatWidget } from "../components/lims-chat-widget";

// Shared by /, /about, /contact only.
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <LimsChatWidget />
    </>
  );
}
