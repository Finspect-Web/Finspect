import { motion } from "framer-motion";

const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export default function PageTransition({ children, className = "" }) {
  return (
    <motion.div
      className={className}
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.div>
  );
}

export { fadeUp };
