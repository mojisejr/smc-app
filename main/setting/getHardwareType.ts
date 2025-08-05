import { getSetting } from "./getSetting";

export type HardwareType = 'KU16' | 'CU12' | 'UNKNOWN';

export interface HardwareInfo {
  type: HardwareType;
  port: string | null;
  baudrate: number | null;
  maxSlots: number;
  isConfigured: boolean;
  cached?: boolean;
  cacheTimestamp?: number;
  detectionTime?: number;
}

// Enhanced caching system for hardware detection optimization
interface HardwareCache {
  info: HardwareInfo;
  timestamp: number;
  hits: number;
}

let hardwareCache: HardwareCache | null = null;
const CACHE_TTL = 30000; // 30 seconds cache TTL
const CACHE_STATS = {
  hits: 0,
  misses: 0,
  detections: 0
};

/**
 * Clear hardware detection cache (for testing or manual refresh)
 */
export function clearHardwareCache(): void {
  hardwareCache = null;
  console.log('[getHardwareType] Hardware cache cleared');
}

/**
 * Get hardware detection cache statistics
 */
export function getHardwareCacheStats() {
  return {
    ...CACHE_STATS,
    cacheActive: !!hardwareCache,
    cacheAge: hardwareCache ? Date.now() - hardwareCache.timestamp : 0,
    cacheHits: hardwareCache?.hits || 0
  };
}

/**
 * Enhanced hardware detection with performance caching and resource optimization
 */
export async function getHardwareType(): Promise<HardwareInfo> {
  const startTime = Date.now();
  
  // Check cache first for performance optimization
  if (hardwareCache && (Date.now() - hardwareCache.timestamp) < CACHE_TTL) {
    hardwareCache.hits++;
    CACHE_STATS.hits++;
    
    const cachedInfo = {
      ...hardwareCache.info,
      cached: true,
      cacheTimestamp: hardwareCache.timestamp,
      detectionTime: Date.now() - startTime
    };
    
    console.log(`[getHardwareType] Cache hit (${hardwareCache.hits} hits) - ${cachedInfo.type}`, {
      detectionTime: cachedInfo.detectionTime,
      cacheAge: Date.now() - hardwareCache.timestamp
    });
    
    return cachedInfo;
  }
  
  CACHE_STATS.misses++;
  CACHE_STATS.detections++;
  
  try {
    const settings = await getSetting();
    
    console.log('[getHardwareType] Cache miss - detecting hardware...', {
      exists: !!settings,
      hardware_type: settings?.hardware_type,
      cu_port: settings?.cu_port,
      cu_baudrate: settings?.cu_baudrate,
      ku_port: settings?.ku_port,
      ku_baudrate: settings?.ku_baudrate
    });
    
    let hardwareInfo: HardwareInfo;
    
    if (!settings) {
      console.warn('[getHardwareType] No settings found, returning UNKNOWN');
      hardwareInfo = {
        type: 'UNKNOWN',
        port: null,
        baudrate: null,
        maxSlots: 0,
        isConfigured: false,
        cached: false,
        detectionTime: Date.now() - startTime
      };
    } else {
      hardwareInfo = await detectHardwareFromSettings(settings);
      hardwareInfo.cached = false;
      hardwareInfo.detectionTime = Date.now() - startTime;
    }
    
    // Cache the result for performance optimization
    hardwareCache = {
      info: hardwareInfo,
      timestamp: Date.now(),
      hits: 0
    };
    
    console.log(`[getHardwareType] Hardware detected: ${hardwareInfo.type}`, {
      detectionTime: hardwareInfo.detectionTime,
      maxSlots: hardwareInfo.maxSlots,
      isConfigured: hardwareInfo.isConfigured
    });
    
    return hardwareInfo;
    
  } catch (error) {
    console.error('Error detecting hardware type:', error.message);
    const errorInfo: HardwareInfo = {
      type: 'UNKNOWN',
      port: null,
      baudrate: null,
      maxSlots: 0,
      isConfigured: false,
      cached: false,
      detectionTime: Date.now() - startTime
    };
    
    // Cache error result to prevent repeated failures
    hardwareCache = {
      info: errorInfo,
      timestamp: Date.now(),
      hits: 0
    };
    
    return errorInfo;
  }
}

/**
 * Internal hardware detection logic extracted for better caching
 */
async function detectHardwareFromSettings(settings: any): Promise<HardwareInfo> {
  // Check for explicit hardware type setting first
  if (settings.hardware_type && settings.hardware_type !== 'AUTO') {
    if (settings.hardware_type === 'CU12' && settings.cu_port && settings.cu_baudrate) {
      return {
        type: 'CU12',
        port: settings.cu_port,
        baudrate: settings.cu_baudrate,
        maxSlots: 12,
        isConfigured: true
      };
    }
    
    if (settings.hardware_type === 'KU16' && settings.ku_port && settings.ku_baudrate) {
      return {
        type: 'KU16',
        port: settings.ku_port,
        baudrate: settings.ku_baudrate,
        maxSlots: settings.available_slots || 15,
        isConfigured: true
      };
    }
  }

  // AUTO mode: Check for CU12 configuration first (preferred)
  if (settings.cu_port && settings.cu_baudrate) {
    return {
      type: 'CU12',
      port: settings.cu_port,
      baudrate: settings.cu_baudrate,
      maxSlots: 12,
      isConfigured: true
    };
  }

  // Check for KU16 configuration (legacy)
  if (settings.ku_port && settings.ku_baudrate) {
    return {
      type: 'KU16',
      port: settings.ku_port,
      baudrate: settings.ku_baudrate,
      maxSlots: settings.available_slots || 15,
      isConfigured: true
    };
  }

  // No hardware configured
  return {
    type: 'UNKNOWN',
    port: null,
    baudrate: null,
    maxSlots: 0,
    isConfigured: false
  };
}

/**
 * Check if system is configured for CU12
 */
export async function isCU12System(): Promise<boolean> {
  const hardware = await getHardwareType();
  return hardware.type === 'CU12' && hardware.isConfigured;
}

/**
 * Check if system is configured for KU16
 */
export async function isKU16System(): Promise<boolean> {
  const hardware = await getHardwareType();
  return hardware.type === 'KU16' && hardware.isConfigured;
}

/**
 * Get current system's maximum slot count
 */
export async function getMaxSlots(): Promise<number> {
  const hardware = await getHardwareType();
  return hardware.maxSlots || 12; // Default to CU12 (12 slots)
}

// ============================================================================
// HARDWARE-SPECIFIC CONTENT FILTERING SYSTEM
// For User Guide Documentation System
// ============================================================================

export interface HardwareContentFilter {
  showCU12Content: boolean;
  showKU16Content: boolean;
  showUniversalContent: boolean;
  currentHardware: HardwareType;
  slotCount: number;
  features: string[];
}

/**
 * Get hardware-specific content filter for documentation system
 * Optimized with caching for performance
 */
export async function getHardwareContentFilter(): Promise<HardwareContentFilter> {
  const hardware = await getHardwareType();
  
  const filter: HardwareContentFilter = {
    showCU12Content: false,
    showKU16Content: false,
    showUniversalContent: true, // Always show universal content
    currentHardware: hardware.type,
    slotCount: hardware.maxSlots,
    features: []
  };
  
  switch (hardware.type) {
    case 'CU12':
      filter.showCU12Content = true;
      filter.showUniversalContent = true;
      filter.features = [
        'circuit-breaker',
        'adaptive-monitoring', 
        'resource-optimization',
        'advanced-error-recovery',
        'rs485-protocol'
      ];
      break;
      
    case 'KU16':
      filter.showKU16Content = true;
      filter.showUniversalContent = true;
      filter.features = [
        'legacy-compatibility',
        'binary-protocol',
        '15-slot-capacity',
        'standard-operations'
      ];
      break;
      
    case 'UNKNOWN':
    default:
      // Show all content when hardware unknown
      filter.showCU12Content = true;
      filter.showKU16Content = true;
      filter.showUniversalContent = true;
      filter.features = ['all-features'];
      break;
  }
  
  console.log(`[getHardwareContentFilter] Content filter for ${hardware.type}:`, {
    showCU12: filter.showCU12Content,
    showKU16: filter.showKU16Content,
    features: filter.features,
    cached: hardware.cached
  });
  
  return filter;
}

/**
 * Check if specific hardware feature is supported
 */
export async function isHardwareFeatureSupported(feature: string): Promise<boolean> {
  const filter = await getHardwareContentFilter();
  return filter.features.includes(feature) || filter.features.includes('all-features');
}

/**
 * Get hardware-specific documentation sections to display
 */
export async function getRelevantDocumentationSections(): Promise<string[]> {
  const filter = await getHardwareContentFilter();
  const sections: string[] = [
    'safety-overview',      // Always show safety
    'normal-operations',    // Universal operations
    'emergency-procedures', // Universal emergency procedures
    'troubleshooting',      // Universal troubleshooting
    'glossary'             // Universal glossary
  ];
  
  // Add hardware-specific sections
  if (filter.showCU12Content) {
    sections.push('cu12-features', 'cu12-advanced-operations');
  }
  
  if (filter.showKU16Content) {
    sections.push('ku16-legacy-operations', 'ku16-compatibility');
  }
  
  // Always include general hardware info
  sections.push('hardware-info');
  
  return sections;
}

/**
 * Format hardware information for UI display
 */
export async function getHardwareDisplayInfo(): Promise<{
  displayName: string;
  statusColor: string;
  description: string;
  slotInfo: string;
  protocolInfo: string;
}> {
  const hardware = await getHardwareType();
  
  switch (hardware.type) {
    case 'CU12':
      return {
        displayName: 'CU12 (Advanced)',
        statusColor: 'green',
        description: 'ระบบขั้นสูงพร้อม Circuit Breaker และ Adaptive Monitoring',
        slotInfo: `12 ช่อง (Slots 1-12)`,
        protocolInfo: `RS-485 Protocol | ${hardware.port} | ${hardware.baudrate} baud`
      };
      
    case 'KU16':
      return {
        displayName: 'KU16 (Legacy)',
        statusColor: 'blue',
        description: 'ระบบมาตรฐานเพื่อความเข้ากันได้ (Legacy Compatibility)',
        slotInfo: `15 ช่อง (Slots 1-15)`,
        protocolInfo: `Binary Protocol | ${hardware.port} | ${hardware.baudrate} baud`
      };
      
    case 'UNKNOWN':
    default:
      return {
        displayName: 'ไม่ทราบประเภท Hardware',
        statusColor: 'red',
        description: 'ไม่สามารถตรวจสอบประเภท Hardware ได้ กรุณาตรวจสอบการตั้งค่า',
        slotInfo: 'ไม่ทราบจำนวนช่อง',
        protocolInfo: 'ไม่ได้เชื่อมต่อ'
      };
  }
}