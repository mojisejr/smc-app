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

// Remove direct import of BuildConstants to avoid main process dependency
// Use IPC to get device configuration from main process

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
export function getDisplaySlotConfig(): SlotDisplayConfig {
  try {
    // Get device type from environment variable (same as main process)
    const deviceType = process.env.DEVICE_TYPE || 'DS12';
    
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
    
    return {
      slotCount,
      columns,
      gridClass,
      maxDisplaySlots,
      deviceType
    };
    
  } catch (error) {
    // FALLBACK: Default to DS12 configuration if error occurs
    console.error('getDisplaySlotConfig: Error loading configuration, using DS12 fallback:', error);
    
    return {
      slotCount: 12,
      columns: 4,
      gridClass: 'grid-cols-4',
      maxDisplaySlots: 15,
      deviceType: 'DS12'
    };
  }
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
  
  // Device-specific spacing configuration
  let gapClass: string;
  let containerClass: string;
  
  if (slotCount <= 12) {
    // DS12 Configuration: More generous spacing
    gapClass = 'gap-6';
    containerClass = 'h-full place-content-center place-items-center px-8 py-8';
  } else {
    // DS16 Configuration: Efficient spacing
    gapClass = 'gap-4';
    containerClass = 'h-full place-content-center place-items-center px-6 py-6';
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
    // DS12 Configuration: Larger, more spacious
    return {
      slotSizeClass: 'w-full max-w-[200px] min-h-[200px]',
      slotNumberClass: 'text-5xl', // 48px
      paddingClass: 'p-4',
      indicatorSpacing: 'px-3'
    };
  } else {
    // DS16 Configuration: Compact but readable
    return {
      slotSizeClass: 'w-full max-w-[160px] min-h-[170px]',
      slotNumberClass: 'text-3xl', // 30px
      paddingClass: 'p-3',
      indicatorSpacing: 'px-2'
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