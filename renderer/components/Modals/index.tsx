import React, { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

interface ModalProps {
  isOpen: boolean;
  onClose: (value?: boolean) => void;
  overlayClosable?: boolean;
  children: ReactNode;
}

const Modal = ({ isOpen, onClose, overlayClosable=false, children }: ModalProps) => {
  const [ready, setReady] = useState<boolean>(false);
  const overlayVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  };
  const modalVariants = {
    initial: { opacity: 0, y: -50 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -50 },
  };

  useEffect(() => {
    //@dev: for UI dehydration
    setReady(true);
  }, []);

  if (!isOpen) {
    return null;
  }

  if (typeof window === "object" && ready) {
    return createPortal(
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed top-0 left-0 right-0 bottom-0 flex items-center justify-center bg-[#888] bg-opacity-50"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={overlayVariants}
            onClick={overlayClosable ? void onClose(false) : null}
          >
            <motion.div
              className="bg-white rounded-lg"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={modalVariants}
              onClick={(e) => e.stopPropagation()}
            >
              {children}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    );
  }
};

export default Modal;
