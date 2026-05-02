import { Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FABProps {
  onClick: () => void;
  show: boolean;
}

export function FAB({ onClick, show }: FABProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClick}
          className="fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-full shadow-lg shadow-primary/30 flex items-center justify-center z-40"
          data-testid="fab-log-today"
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
