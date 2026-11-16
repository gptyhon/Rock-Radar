import { useLayoutEffect, useRef } from "react";
import { startAdmin } from "./controller";

import type { AdminActions } from "./types";
import { AdminHeader } from "./components/AdminHeader";
import { AdminPanels } from "./components/AdminPanels";
import { Toast } from "./components/Toast";
import { ImageEditor } from "./components/ImageEditor";
import { BandSortModal } from "./components/BandSortModal";
export default function AdminPage() {
  const actions: AdminActions = useRef(null);
  useLayoutEffect(() => {
    document.title = "Rock Radar 管理面板";
    actions.current = startAdmin();
    return () => {
      actions.current?.dispose();
      actions.current = null;
    };
  }, []);
  return (
    <>
      <AdminHeader actions={actions} />
      <AdminPanels actions={actions} />
      <Toast actions={actions} />
      <ImageEditor actions={actions} />
      <BandSortModal actions={actions} />
    </>
  );
}
