import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { clearAllData } from "./lib/store";

// Expose clear function globally for development
if (import.meta.env.DEV) {
  (window as any).clearWorkTrackData = clearAllData;
}

createRoot(document.getElementById("root")!).render(<App />);
