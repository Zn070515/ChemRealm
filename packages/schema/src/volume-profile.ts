/**
 * Serializable apparatus volume geometry.
 *
 * Persisted worlds carry this data contract instead of function-valued
 * geometry, so replay never resolves a mutable asset reference.
 */

import { z } from "zod";

import { hashCanonical } from "./canonical-hash.js";
import { DataProvenanceSchema } from "./scientific.js";
import { canonicalQuantityOfDimension, quantityOfDimension } from "./quantity.js";

const VolumeProfilePointDefinitionSchema = z.strictObject({
  volume: quantityOfDimension("volume"),
  height: quantityOfDimension("length"),
});

const VolumeProfilePointSnapshotSchema = z.strictObject({
  volume: canonicalQuantityOfDimension("volume"),
  height: canonicalQuantityOfDimension("length"),
});

export const VolumeProfileDefinitionSchema = z.strictObject({
  profileId: z.string().min(1),
  profileVersion: z.string().min(1),
  representation: z.literal("piecewise-linear"),
  maxVolume: quantityOfDimension("volume"),
  maxHeight: quantityOfDimension("length"),
  roundTripTolerance: quantityOfDimension("volume"),
  knots: z.array(VolumeProfilePointDefinitionSchema).min(2),
  provenance: DataProvenanceSchema,
});
export type VolumeProfileDefinition = z.infer<typeof VolumeProfileDefinitionSchema>;

export const VolumeProfileSnapshotSchema = z
  .strictObject({
    profileId: z.string().min(1),
    profileVersion: z.string().min(1),
    profileHash: z.string().min(1),
    representation: z.literal("piecewise-linear"),
    maxVolume: canonicalQuantityOfDimension("volume"),
    maxHeight: canonicalQuantityOfDimension("length"),
    roundTripTolerance: canonicalQuantityOfDimension("volume"),
    knots: z.array(VolumeProfilePointSnapshotSchema).min(2),
    provenance: DataProvenanceSchema,
  })
  .superRefine((profile, context) => {
    const first = profile.knots[0];
    const last = profile.knots[profile.knots.length - 1];
    if (first === undefined || last === undefined) return;

    if (first.volume.value !== 0 || first.height.value !== 0) {
      context.addIssue({
        code: "custom",
        path: ["knots", 0],
        message: "profile must start at zero volume and zero height",
      });
    }
    if (
      last.volume.value !== profile.maxVolume.value ||
      last.height.value !== profile.maxHeight.value
    ) {
      context.addIssue({
        code: "custom",
        path: ["knots", profile.knots.length - 1],
        message: "profile must end at its declared maximum volume and height",
      });
    }
    for (let index = 1; index < profile.knots.length; index += 1) {
      const previous = profile.knots[index - 1]!;
      const current = profile.knots[index]!;
      if (current.volume.value <= previous.volume.value) {
        context.addIssue({
          code: "custom",
          path: ["knots", index, "volume"],
          message: "profile volumes must be strictly increasing",
        });
      }
      if (current.height.value <= previous.height.value) {
        context.addIssue({
          code: "custom",
          path: ["knots", index, "height"],
          message: "profile heights must be strictly increasing",
        });
      }
    }
    if (profile.roundTripTolerance.value < 0) {
      context.addIssue({
        code: "custom",
        path: ["roundTripTolerance"],
        message: "profile round-trip tolerance cannot be negative",
      });
    }
  });
export type VolumeProfileSnapshot = z.infer<typeof VolumeProfileSnapshotSchema>;

/** Content-address the profile payload without allowing self-reference. */
export function volumeProfileHash(profile: VolumeProfileSnapshot): string {
  const { profileHash: _profileHash, ...payload } = profile;
  return `sha256:${hashCanonical(payload)}`;
}

/**
 * Validate both the serialized profile shape and its content address before a
 * caller can derive executable V(h)/h(V) functions from it.
 */
export function parseVolumeProfileSnapshot(
  input: unknown,
): VolumeProfileSnapshot {
  const profile = VolumeProfileSnapshotSchema.parse(input);
  const expectedHash = volumeProfileHash(profile);
  if (profile.profileHash !== expectedHash) {
    throw new Error(
      `volume profile hash mismatch: expected ${expectedHash}, received ${profile.profileHash}`,
    );
  }
  return profile;
}
