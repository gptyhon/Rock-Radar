import type { AdminActions } from "../types";
import { AdminTabs } from "./AdminTabs";
import { BandsPanel } from "./BandsPanel";
import { RolePositionPanel } from "./RolePositionPanel";
import { RoleComparisonPanel } from "./RoleComparisonPanel";
import { ConfigPanel } from "./ConfigPanel";
import { SpecialProfilesPanel } from "./SpecialProfilesPanel";
import { ImagesPanel } from "./ImagesPanel";
export function AdminPanels({ actions }: { actions: AdminActions }) {
  return (
    <div className="container">
      {"\n        "}
      <AdminTabs actions={actions} />
      {"\n\n        "}
      {"\n        "}
      <BandsPanel actions={actions} />
      {"\n\n        "}
      {"\n        "}
      <RolePositionPanel actions={actions} />
      {"\n\n        "}
      {"\n        "}
      <RoleComparisonPanel actions={actions} />
      {"\n\n        "}
      {"\n        "}
      <ConfigPanel actions={actions} />
      {"\n\n        "}
      {"\n        "}
      <SpecialProfilesPanel actions={actions} />
      {"\n\n        "}
      {"\n        "}
      <ImagesPanel actions={actions} />
      {"\n    "}
    </div>
  );
}
