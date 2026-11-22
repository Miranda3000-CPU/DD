import { createRoot } from "react-dom/client";
import App from "./App";
import { migrateNativeDataAtStartup } from "./native/nativeMigration";
import "./index.css";

async function bootstrap() {
  // Import legacy Room records before React reads localStorage or IndexedDB.
  // In a browser/PWA this is a no-op; in the APK it is a one-time safe merge.
  await migrateNativeDataAtStartup();
  createRoot(document.getElementById("root")!).render(<App />);
}

void bootstrap();
