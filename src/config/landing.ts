export type LandingVariant = "default" | "editorial";

/** Editorial landing is on by default. Set NEXT_PUBLIC_LANDING_VARIANT=default to use the card login. */
export const LANDING_VARIANT: LandingVariant =
  process.env.NEXT_PUBLIC_LANDING_VARIANT === "default"
    ? "default"
    : "editorial";
