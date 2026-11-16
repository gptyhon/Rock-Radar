import type * as React from "react";
import type { AdminActions } from "../types";
export function Toast({ actions }: { actions: AdminActions }) {
  return <div className={"toast"} id={"toast"}></div>;
}
