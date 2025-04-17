import { ipcRenderer } from "electron";
import { useEffect, useState } from "react";

export const useIndicator = () => {
  const [loading, setloading] = useState<boolean>(false);
  const [indicator, setIndicator] = useState<{
    message: string;
    success: boolean;
    data: {
      Temp1: number;
      Temp2: number;
      Huminity1: number;
      Huminity2: number;
      Battery: number;
    } | null;
  }>();

  useEffect(() => {
    ipcRenderer.on("retrive-indicator", async (event, payload) => {
      if (!payload) {
        setloading(true);
      }
      setIndicator(payload);
      setloading(false);
    });
  }, []);

  return {
    loading,
    indicator,
  };
};
