import {
  parseOpticalProfileSnapshot,
  type OpticalProfileSnapshot,
} from "@chemrealm/schema";
import profilePayload from "./phenolphthalein-ordinary-aqueous.profile.json" with { type: "json" };

/** The only quantitative indicator profile admitted to the v0 production path. */
export const ORDINARY_PHENOLPHTHALEIN_OPTICAL_PROFILE: OpticalProfileSnapshot =
  parseOpticalProfileSnapshot(profilePayload);
