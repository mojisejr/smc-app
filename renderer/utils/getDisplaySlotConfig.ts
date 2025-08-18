/**
 * getDisplaySlotConfig.ts - Dynamic Slot Display Configuration
 * 
 * MEDICAL DEVICE COMPLIANCE:
 * - Build-time hardware configuration integration
 * - Maximum 15 slots displayed regardless of hardware capability
 * - Consistent UI behavior across device types
 * - Thai language support maintained
 * 
 * HARDWARE COMPATIBILITY:
 * - DS12: 12 slots, 4 columns (3x4 grid)
 * - DS16: 15 slots, 5 columns (3x5 grid) 
 * - Future device types supported through BuildConstants
 * 
 * USAGE:
 * ```typescript
 * import { getDisplaySlotConfig } from '../utils/getDisplaySlotConfig';
 * 
 * const { slotCount, columns, gridClass } = getDisplaySlotConfig();
 * // Use slotCount for array generation
 * // Use gridClass for CSS styling
 * ```
 */

// Use database setting to get device configuration
import { ipcRenderer } from 'electron';

/**
 * Slot Display Configuration Interface
 */
export interface SlotDisplayConfig {
  slotCount: number;        // Number of slots to display
  columns: number;          // Grid columns for layout
  gridClass: string;        // Tailwind CSS grid class
  maxDisplaySlots: number;  // Maximum slots shown in UI (always 15)
  deviceType: string;       // Current device type
}

/**
 * Generate dynamic slot configuration based on hardware config
 * 
 * BUSINESS RULES:
 * - Maximum 15 slots displayed (business requirement)
 * - DS12 devices: Show all 12 slots in 4-column grid
 * - DS16 devices: Show 15 out of 16 slots in 5-column grid
 * - Grid layout optimized for medical workflow efficiency
 * 
 * LAYOUT STRATEGY:
 * - DS12: 3 rows × 4 columns = 12 slots
 * - DS16: 3 rows × 5 columns = 15 slots
 * - Consistent 3-row layout for operator familiarity
 * 
 * @returns SlotDisplayConfig - Configuration for slot display
 */
// Cache for device configuration to avoid repeated IPC calls
let cachedDeviceConfig: SlotDisplayConfig | null = null;

/**
 * Get Display Slot Configuration (Synchronous)
 * Uses cached configuration or defaults to DS12
 * Call loadDisplaySlotConfigAsync() first to populate cache
 */
export function getDisplaySlotConfig(): SlotDisplayConfig {
  // Return cached configuration if available
  if (cachedDeviceConfig) {
    return cachedDeviceConfig;
  }
  
  // FALLBACK: Default to DS12 configuration if no cache
  console.log('getDisplaySlotConfig: Using DS12 fallback, call loadDisplaySlotConfigAsync() to load from database');
  
  return {
    slotCount: 12,
    columns: 4,
    gridClass: 'grid-cols-4',
    maxDisplaySlots: 15,
    deviceType: 'DS12'
  };
}

/**
 * Load Display Slot Configuration from Database (Async)
 * Fetches setting from database and caches the result
 * 
 * @returns Promise<SlotDisplayConfig> - Configuration loaded from database
 */
export async function loadDisplaySlotConfigAsync(): Promise<SlotDisplayConfig> {
  try {
    // Get setting from database via IPC
    const setting = await ipcRenderer.invoke('get-setting');
    
    if (!setting || !setting.device_type) {
      throw new Error('No device type found in settings');
    }
    
    const deviceType = setting.device_type || 'DS12';
    
    // Device configuration mapping
    const deviceConfigs = {
      DS12: { slotCount: 12 },
      DS16: { slotCount: 16 }
    };
    
    const config = deviceConfigs[deviceType as keyof typeof deviceConfigs] || deviceConfigs.DS12;
    
    // Apply business rule: Maximum 15 slots displayed
    const maxDisplaySlots = 15;
    const slotCount = Math.min(config.slotCount, maxDisplaySlots);
    
    // Determine grid layout based on slot count
    let columns: number;
    let gridClass: string;
    
    if (slotCount <= 12) {
      // DS12 configuration: 4 columns for 12 slots
      columns = 4;
      gridClass = 'grid-cols-4';
    } else {
      // DS16 configuration: 5 columns for 13-15 slots  
      columns = 5;
      gridClass = 'grid-cols-5';
    }
    
    const resultConfig = {
      slotCount,
      columns,
      gridClass,
      maxDisplaySlots,
      deviceType
    };
    
    // Cache the result for synchronous access
    cachedDeviceConfig = resultConfig;
    
    console.log('loadDisplaySlotConfigAsync: Configuration loaded from database:', deviceType);
    
    return resultConfig;
    
  } catch (error) {
    // FALLBACK: Default to DS12 configuration if database fails
    console.error('loadDisplaySlotConfigAsync: Error loading from database, using DS12 fallback:', error);
    
    const fallbackConfig = {
      slotCount: 12,
      columns: 4,
      gridClass: 'grid-cols-4',
      maxDisplaySlots: 15,
      deviceType: 'DS12'
    };
    
    // Cache the fallback
    cachedDeviceConfig = fallbackConfig;
    
    return fallbackConfig;
  }
}

/**
 * Clear cached configuration
 * Use when settings are updated
 */
export function clearDisplaySlotConfigCache(): void {
  cachedDeviceConfig = null;
  console.log('Display slot configuration cache cleared');
}

/**
 * Generate array of slot data based on hardware configuration
 * 
 * SLOT INITIALIZATION PATTERN:
 * - Each slot starts in empty state (occupied: false)
 * - Active status defaults to false (admin must activate)
 * - Timestamp set to current time for audit trail
 * - Hospital Number (hn) empty until medication assigned
 * 
 * @returns Array of initialized slot data objects
 */
export function generateSlotArray(): Array<{
  slotId: number;
  hn: string;
  occupied: boolean;
  timestamp: number;
  opening: boolean;
  isActive: boolean;
}> {
  const { slotCount } = getDisplaySlotConfig();
  
  const slots = [];
  for (let i = 1; i <= slotCount; i++) {
    slots.push({
      slotId: i,
      hn: '',
      occupied: false,
      timestamp: new Date().getTime(),
      opening: false,
      isActive: false
    });
  }
  
  return slots;
}

/**
 * Get responsive grid configuration for different screen sizes
 * 
 * RESPONSIVE DESIGN:
 * - DS12: Larger gaps and padding (fewer slots, more space)
 * - DS16: Tighter gaps and padding (more slots, space efficient)
 * - Full height container with no scrolling
 * - Optimized for medical workflow efficiency
 * 
 * @returns object - Responsive CSS classes
 */
export function getResponsiveGridConfig(): {
  containerClass: string;
  gridClass: string;
  gapClass: string;
} {
  const { gridClass, slotCount } = getDisplaySlotConfig();
  
  // Base grid configuration
  const baseGridClass = `grid ${gridClass}`;
  
  // Viewport-based responsive spacing configuration
  let gapClass: string;
  let containerClass: string;
  
  if (slotCount <= 12) {
    // DS12 Configuration: Responsive spacing for larger screens
    gapClass = 'gap-4 lg:gap-6 xl:gap-8';
    containerClass = 'h-full place-content-center place-items-center px-[2vw] py-[2vh] lg:px-[3vw] lg:py-[3vh] xl:px-[4vw] xl:py-[2vh]';
  } else {
    // DS16 Configuration: Compact responsive spacing
    gapClass = 'gap-3 lg:gap-4 xl:gap-6';
    containerClass = 'h-full place-content-center place-items-center px-[1.5vw] py-[1.5vh] lg:px-[2vw] lg:py-[2vh] xl:px-[3vw] xl:py-[1.5vh]';
  }
  
  return {
    containerClass,
    gridClass: baseGridClass,
    gapClass
  };
}

/**
 * Get device-specific slot styling configuration
 * 
 * SLOT RESPONSIVE DESIGN:
 * - DS12: Larger slots with bigger typography (200×200px)
 * - DS16: Compact slots with smaller typography (160×170px)
 * - Maintains visual hierarchy and readability
 * - Adaptive internal spacing
 * 
 * @returns object - Device-specific slot styling
 */
export function getSlotStylingConfig(): {
  slotSizeClass: string;
  slotNumberClass: string;
  paddingClass: string;
  indicatorSpacing: string;
} {
  const { slotCount } = getDisplaySlotConfig();
  
  if (slotCount <= 12) {
    // DS12 Configuration: Responsive larger sizing
    return {
      slotSizeClass: 'w-full aspect-square min-w-[180px] max-w-[320px] min-h-[180px]',
      slotNumberClass: 'text-4xl lg:text-5xl xl:text-6xl', // Responsive font size
      paddingClass: 'p-3 lg:p-4 xl:p-5',
      indicatorSpacing: 'px-2 lg:px-3 xl:px-4'
    };
  } else {
    // DS16 Configuration: Responsive compact sizing
    return {
      slotSizeClass: 'w-full aspect-square min-w-[140px] max-w-[240px] min-h-[140px]',
      slotNumberClass: 'text-2xl lg:text-3xl xl:text-4xl', // Responsive font size
      paddingClass: 'p-2 lg:p-3 xl:p-4',
      indicatorSpacing: 'px-1 lg:px-2 xl:px-3'
    };
  }
}

/**
 * Validate slot configuration for medical compliance
 * 
 * MEDICAL DEVICE VALIDATION:
 * - Ensure slot count is within safe limits
 * - Verify grid layout is operationally efficient
 * - Check configuration matches hardware capabilities
 * 
 * @returns boolean - True if configuration is valid
 */
export function validateSlotConfiguration(): boolean {
  try {
    const config = getDisplaySlotConfig();
    
    // Validate slot count bounds
    if (config.slotCount < 1 || config.slotCount > 15) {
      console.error(`Invalid slot count: ${config.slotCount}`);
      return false;
    }
    
    // Validate grid layout efficiency
    if (config.columns < 3 || config.columns > 5) {
      console.error(`Invalid grid columns: ${config.columns}`);
      return false;
    }
    
    // Validate device type consistency
    if (!['DS12', 'DS16'].includes(config.deviceType)) {
      console.error(`Unknown device type: ${config.deviceType}`);
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('Slot configuration validation error:', error);
    return false;
  }
}

/**
 * Debug function to log current configuration
 * Useful for troubleshooting layout issues
 */
export function debugSlotConfiguration(): void {
  try {
    const displayConfig = getDisplaySlotConfig();
    const gridConfig = getResponsiveGridConfig();
    const styleConfig = getSlotStylingConfig();
    
    console.group('🔍 Slot Configuration Debug');
    console.log('📱 Display Config:', displayConfig);
    console.log('🎯 Grid Config:', gridConfig);
    console.log('🎨 Style Config:', styleConfig);
    console.log('✅ Validation:', validateSlotConfiguration());
    console.groupEnd();
  } catch (error) {
    console.error('❌ Debug configuration error:', error);
  }
}