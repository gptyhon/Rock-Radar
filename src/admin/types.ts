import type { RefObject } from "react";
import type { startAdmin } from "./controller";

export type AdminActions = RefObject<ReturnType<typeof startAdmin> | null>;
