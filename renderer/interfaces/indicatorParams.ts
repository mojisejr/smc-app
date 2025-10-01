// Get Temperature and humidity data from backend process (GET) : FROM ESP32 API Server
export interface IndicatorParams {
  temp: number;
  humid: number;
  error: string;
}
