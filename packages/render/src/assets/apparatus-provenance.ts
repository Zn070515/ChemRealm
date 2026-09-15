export type ApparatusSourceClass =
  | "standard-family"
  | "manufacturer-anchor"
  | "approximate-visual";

export interface ApparatusProvenance {
  readonly sourceId: string;
  /** Canonical URL or repository-relative source record. */
  readonly sourceRef: string;
  readonly sourceClass: ApparatusSourceClass;
  readonly claim: string;
  readonly reportedPrecision: "reported" | "not-stated" | "approximate";
}
