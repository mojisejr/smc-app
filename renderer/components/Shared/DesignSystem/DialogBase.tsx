import React from 'react';

interface DialogBaseProps {
  children: React.ReactNode;
  maxWidth?: string;
  className?: string;
}

const DialogBase: React.FC<DialogBaseProps> = ({ 
  children, 
  maxWidth = "max-w-[350px]",
  className = ""
}) => {
  return (
    <>
      <div className="flex gap-2">
        <div className={`flex flex-col rounded-md overflow-hidden gap-2 ${maxWidth} ${className}`}>
          {children}
        </div>
      </div>
    </>
  );
};

export default DialogBase;