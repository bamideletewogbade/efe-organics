/**
 * Motion tokens shared by the Framer Motion components.
 *
 * These mirror the CSS custom properties in globals.css on purpose — the site
 * runs two motion systems and they must feel identical. CSS handles everything
 * below the fold (cheap, no JS); Framer Motion handles the nav and hero, where
 * we need gesture tracking, scroll interpolation and shared layout.
 *
 * If you change a curve here, change --ease-soft there too.
 */

/** Soft expo-out. Settles rather than bounces. Matches --ease-soft. */
export const easeSoft = [0.22, 1, 0.36, 1] as const;

/** Symmetric ease for continuous, looping motion. Matches --ease-inout. */
export const easeInOut = [0.65, 0, 0.35, 1] as const;

export const duration = {
  fast: 0.18,
  base: 0.32,
  slow: 0.62,
} as const;

/** Spring for pointer-tracked motion — critically damped, no wobble. */
export const pointerSpring = {
  type: "spring",
  stiffness: 150,
  damping: 20,
  mass: 0.6,
} as const;

/** A word or line rising into place from behind a clip mask. */
export const riseVariants = {
  hidden: { y: "115%" },
  visible: { y: "0%" },
} as const;

export const fadeUpVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
} as const;
