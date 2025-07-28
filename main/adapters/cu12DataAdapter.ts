import { SlotStatus } from '../hardware/cu12/types';
import { Slot } from '../../db/model/slot.model';

/**
 * CU12-to-KU16 Data Adapter
 * 
 * Transforms CU12 SlotStatus data to KU16-compatible format that Frontend expects.
 * 
 * IMPORTANT: This adapter separates Hardware Status from Admin Settings:
 * - Hardware Status (CU12): Used for connection and physical lock detection only
 * - Admin Settings (Database): Used for isActive, occupied, hn fields
 * 
 * The isActive field ALWAYS comes from Database Admin Settings, not Hardware Status.
 */

export interface KU16SlotData {
  slotId: number;
  hn: string | null;
  occupied: boolean;
  timestamp: number | null;
  opening: boolean;
  isActive: boolean;
}

/**
 * Transform CU12 SlotStatus array to KU16-compatible slot data
 * 
 * @param cu12SlotStatus - Array of CU12 slot statuses from hardware (used for connection only)
 * @returns Array of KU16-compatible slot data for frontend
 * 
 * Note: isActive field comes from Database Admin Settings, not Hardware Status.
 * This ensures consistency between Admin Dashboard and Home Page.
 */
export async function transformCU12ToKU16Format(cu12SlotStatus: SlotStatus[]): Promise<KU16SlotData[]> {
  try {
    console.log('[CU12-DATA-ADAPTER] Transforming CU12 data to KU16 format');
    console.log('[CU12-DATA-ADAPTER] Input CU12 slots:', cu12SlotStatus.length);

    // Get database slot data
    const dbSlots = await Slot.findAll({ 
      where: { slotId: { [require('sequelize').Op.lte]: 12 } },
      order: [['slotId', 'ASC']]
    });

    console.log('[CU12-DATA-ADAPTER] Database slots found:', dbSlots.length);

    const transformedSlots: KU16SlotData[] = [];

    // Transform each CU12 slot to KU16 format
    for (let i = 0; i < 12; i++) {
      const slotId = i + 1;
      const cu12Slot = cu12SlotStatus.find(slot => slot.slotId === slotId);
      const dbSlot = dbSlots.find(slot => slot.dataValues.slotId === slotId);

      // Create KU16-compatible slot data
      const transformedSlot: KU16SlotData = {
        slotId: slotId,
        hn: dbSlot?.dataValues.hn || null,
        occupied: dbSlot?.dataValues.occupied || false,
        timestamp: dbSlot?.dataValues.timestamp || null,
        opening: dbSlot?.dataValues.opening || false,
        // ✅ FIXED: Always use Database Admin Settings for isActive (not Hardware Status)
        isActive: dbSlot?.dataValues.isActive || false
      };

      transformedSlots.push(transformedSlot);

      console.log(`[CU12-DATA-ADAPTER] Slot ${slotId}:`, {
        hwIsLocked: cu12Slot?.isLocked,
        dbIsActive: dbSlot?.dataValues.isActive,
        finalIsActive: transformedSlot.isActive,
        occupied: transformedSlot.occupied,
        source: 'database-admin-settings'
      });
    }

    console.log('[CU12-DATA-ADAPTER] Transformation completed:', transformedSlots.length, 'slots');
    return transformedSlots;

  } catch (error) {
    console.error('[CU12-DATA-ADAPTER] Transformation error:', error.message);
    
    // Fallback: return mock data to prevent empty array
    const fallbackSlots: KU16SlotData[] = [];
    for (let i = 1; i <= 12; i++) {
      fallbackSlots.push({
        slotId: i,
        hn: null,
        occupied: false,
        timestamp: null,
        opening: false,
        isActive: true // Default to active for CU12
      });
    }
    
    console.log('[CU12-DATA-ADAPTER] Using fallback data:', fallbackSlots.length, 'slots');
    return fallbackSlots;
  }
}

/**
 * Create a single transformed slot for real-time updates
 * @param slotId - Slot ID to transform
 * @param cu12Status - Optional CU12 status, will fetch from hardware if not provided
 * @returns Single KU16-compatible slot data
 */
export async function transformSingleSlot(slotId: number, cu12Status?: SlotStatus): Promise<KU16SlotData | null> {
  try {
    const dbSlot = await Slot.findOne({ where: { slotId } });
    
    if (!dbSlot) {
      console.warn(`[CU12-DATA-ADAPTER] Slot ${slotId} not found in database`);
      return null;
    }

    return {
      slotId: slotId,
      hn: dbSlot.dataValues.hn || null,
      occupied: dbSlot.dataValues.occupied || false,
      timestamp: dbSlot.dataValues.timestamp || null,
      opening: dbSlot.dataValues.opening || false,
      // ✅ FIXED: Always use Database Admin Settings for isActive (consistent with main transform)
      isActive: dbSlot.dataValues.isActive || false
    };

  } catch (error) {
    console.error(`[CU12-DATA-ADAPTER] Error transforming slot ${slotId}:`, error.message);
    return null;
  }
}