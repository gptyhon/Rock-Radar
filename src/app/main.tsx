import { createRoot } from "react-dom/client";

// Separate page entries prevent the two original global stylesheets from mixing.
const { default: Page } = ["/radar", "/radar.html"].includes(location.pathname)
  ? await import("../radar/RadarPage")
  : await import("../admin/AdminPage");

// Keep the original body children: a wrapper would alter layout and selectors.
const root = createRoot(document.body);
root.render(<Page />);
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount());
