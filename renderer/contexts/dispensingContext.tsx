import { createContext, useContext, useState } from "react";

type DispensingContextType = {
  passkey: string | null;
  setPasskey: (passkey: string) => void;
};

const DispensingContext = createContext<DispensingContextType>({
  passkey: null,
  setPasskey: () => {},
});

export const DispensingProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [passkey, setPasskey] = useState<string | null>(null);

  return (
    <DispensingContext.Provider value={{ passkey, setPasskey }}>
      {children}
    </DispensingContext.Provider>
  );
};

export const useDispensingContext = () => {
  return useContext(DispensingContext);
};
