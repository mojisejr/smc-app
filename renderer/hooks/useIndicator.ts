import { useEffect, useState } from "react";
import { IndicatorParams } from "../interfaces/indicatorParams";

/**
 * Smart Medication Cart (SMC) - ESP32 Indicator Hook
 * Medical Device Compliance: Hook for ESP32 sensor data management
 * 
 * Updated to use ESP32 HTTP API instead of Serial Port communication
 * Removes Battery field and uses simplified temp/humid structure
 */
export const useIndicator = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [indicator, setIndicator] = useState<IndicatorParams>({
    temp: 0,
    humid: 0,
    error: "",
  });

  // Connection status tracking for medical device monitoring
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    lastUpdate: number;
  }>({
    connected: false,
    lastUpdate: 0,
  });

  useEffect(() => {
    /**
     * IPC listener for ESP32 sensor data
     * Handles both successful readings and error states
     */
    const handleIndicatorData = (event: any, data: any) => {
      setLoading(false);
      
      if (data.success && data.data) {
        // Update indicator data from ESP32
        setIndicator(data.data);
        
        // Update connection status
        setConnectionStatus({
          connected: true,
          lastUpdate: Date.now(),
        });
      } else {
        // Handle error state - preserve last known values but update error
        setIndicator(prev => ({
          ...prev,
          error: data.message || "ESP32 connection error",
        }));
        
        // Update connection status to disconnected
        setConnectionStatus(prev => ({
          ...prev,
          connected: false,
        }));
      }
    };

    // Register IPC listener
    ipcRenderer.on("retrive-indicator", handleIndicatorData);

    // Cleanup listener on unmount
    return () => {
      ipcRenderer.removeAllListeners("retrive-indicator");
    };
  }, []);

  /**
   * Check if sensor data is stale (for medical device monitoring)
   * Data is considered stale if no update received for more than 2 minutes
   */
  const isDataStale = (): boolean => {
    const now = Date.now();
    const timeSinceLastUpdate = now - connectionStatus.lastUpdate;
    return timeSinceLastUpdate > 120000; // 2 minutes
  };

  /**
   * Get formatted temperature with unit
   */
  const getFormattedTemperature = (): string => {
    return `${indicator.temp.toFixed(1)}°C`;
  };

  /**
   * Get formatted humidity with unit
   */
  const getFormattedHumidity = (): string => {
    return `${indicator.humid.toFixed(1)}%`;
  };

  /**
   * Check if environmental conditions are within medical device acceptable range
   * Temperature: 15-30°C, Humidity: 30-70%
   */
  const isEnvironmentAcceptable = (): boolean => {
    const tempOk = indicator.temp >= 15 && indicator.temp <= 30;
    const humidOk = indicator.humid >= 30 && indicator.humid <= 70;
    return tempOk && humidOk && !indicator.error;
  };

  return {
    loading,
    indicator,
    connectionStatus,
    isDataStale: isDataStale(),
    isEnvironmentAcceptable: isEnvironmentAcceptable(),
    getFormattedTemperature,
    getFormattedHumidity,
  };
};
