export type LandingVariant = "default" | "editorial";

export const LANDING_VARIANT: LandingVariant =
  process.env.NEXT_PUBLIC_LANDING_VARIANT === "editorial"
    ? "editorial"
    : "default";
