import { AshnaAIWidget } from "../components/ashna-ai-widget";

// Shared by /, /about, /contact only. The widget script loads once here and
// persists across client-side navigation between these pages; unmounting
// this layout (navigating to /login or internal pages) destroys the widget.
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AshnaAIWidget />
    </>
  );
}
