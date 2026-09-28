import { motion } from "framer-motion";
import { useReducedMotion } from "@/components/ReducedMotionProvider";

export interface AnimatedCheckmarkProps {
  /** Diameter in pixels. Defaults to 48. */
  size?: number;
  className?: string;
}

/**
 * A success checkmark that draws itself in and pops the surrounding
 * circle into place. Used to punctuate completed actions (unlock success,
 * purchase confirmation, form submission) with a small moment of delight.
 *
 * Respects the user's reduced-motion preference by rendering the final
 * state immediately instead of animating.
 */
export function AnimatedCheckmark({ size = 48, className = "" }: AnimatedCheckmarkProps) {
  const { prefersReducedMotion } = useReducedMotion();

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      role="img"
      aria-label="Success"
    >
      <motion.circle
        cx="24"
        cy="24"
        r="22"
        stroke="currentColor"
        strokeWidth="2.5"
        className="text-emerald-400"
        initial={prefersReducedMotion ? false : { scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.35, ease: "easeOut" }}
      />
      <motion.path
        d="M14 24.5L20.5 31L34 17"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-emerald-400"
        initial={prefersReducedMotion ? false : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{
          duration: prefersReducedMotion ? 0 : 0.4,
          delay: prefersReducedMotion ? 0 : 0.2,
          ease: "easeOut",
        }}
      />
    </motion.svg>
  );
}
