import type { PropsWithChildren, ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

type RevealProps = PropsWithChildren<{
  className?: string;
  delay?: number;
  y?: number;
  scale?: number;
}>;

export function Reveal({
  children,
  className,
  delay = 0,
  y = 28,
  scale = 0.975,
}: RevealProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y, scale }}
      whileInView={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: reduceMotion ? 0 : 0.78,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

type FloatProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

export function FloatCard({ children, className, delay = 0 }: FloatProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { y: 14, rotate: -1.2, opacity: 0 }}
      whileInView={reduceMotion ? { opacity: 1 } : { y: 0, rotate: 0, opacity: 1 }}
      viewport={{ once: true, amount: 0.25 }}
      animate={
        reduceMotion
          ? undefined
          : {
              y: [0, -14, 0],
              rotate: [0, 0.8, 0],
            }
      }
      transition={
        reduceMotion
          ? undefined
          : {
              duration: 6.4,
              delay,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }
      }
    >
      {children}
    </motion.div>
  );
}

type EntranceProps = PropsWithChildren<{
  className?: string;
  delay?: number;
  x?: number;
  y?: number;
}>;

export function Entrance({
  children,
  className,
  delay = 0,
  x = 0,
  y = 18,
}: EntranceProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, x, y, scale: 0.985 }}
      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, x: 0, y: 0, scale: 1 }}
      transition={{
        duration: reduceMotion ? 0 : 0.62,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
