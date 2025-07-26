# UI/UX Adaptation for 12-Slot Layout

## 🎨 Layout Design Strategy

### Current UI Analysis (15-Slot System)
```typescript
// Current home.tsx slot grid configuration
const currentLayout = {
  totalSlots: 15,
  gridLayout: "grid-cols-5",    // 5 columns
  gridRows: 3,                  // 3 rows (5x3 = 15 slots)
  slotSize: "uniform",          // Equal sized slots
  responsiveBreakpoints: {
    mobile: "adaptive-grid",
    tablet: "grid-cols-3",
    desktop: "grid-cols-5"
  }
};

// Current mockSlots in home.tsx (lines 21-142)
const mockSlots = [
  { slotId: 1, hn: "", occupied: false, ... },
  { slotId: 2, hn: "", occupied: false, ... },
  // ... continues to slotId: 15
];
```

### Target UI Design (12-Slot System)
```typescript
// New layout options for 12 slots
const layoutOptions = {
  option1: {
    layout: "4x3",              // 4 columns, 3 rows
    gridClass: "grid-cols-4",
    advantages: ["Balanced proportions", "Easy visual scanning"],
    responsive: "mobile-friendly"
  },
  
  option2: {
    layout: "3x4",              // 3 columns, 4 rows
    gridClass: "grid-cols-3", 
    advantages: ["Compact width", "Good for mobile"],
    responsive: "very-mobile-friendly"
  },
  
  option3: {
    layout: "6x2",              // 6 columns, 2 rows
    gridClass: "grid-cols-6",
    advantages: ["Compact height", "Wide displays"],
    responsive: "desktop-optimized"
  }
};

// Recommended: 4x3 layout for optimal balance
const recommendedLayout = {
  gridClass: "grid-cols-4",
  totalSlots: 12,
  spacing: "gap-6",
  responsive: {
    mobile: "grid-cols-2",      // 2x6 on mobile
    tablet: "grid-cols-3",      // 3x4 on tablet  
    desktop: "grid-cols-4"      // 4x3 on desktop
  }
};
```

## 🏠 Home Page Component Updates

### Updated Slot Grid Implementation
```typescript
// Updated home.tsx mockSlots array
const cu12MockSlots = [
  {
    slotId: 1,
    hn: "",
    occupied: false,
    timestamp: new Date().getTime(),
    opening: false,
    isActive: true,
  },
  {
    slotId: 2,
    hn: "",
    occupied: false,
    timestamp: new Date().getTime(),
    opening: false,
    isActive: true,
  },
  // Continue for slots 3-12
  ...Array.from({ length: 10 }, (_, i) => ({
    slotId: i + 3,
    hn: "",
    occupied: false,
    timestamp: new Date().getTime(),
    opening: false,
    isActive: true,
  }))
];

// Updated grid container with responsive 4x3 layout
const SlotGridContainer = () => {
  return (
    <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 min-h-[70vh] place-content-start px-20 py-6">
      {cu12MockSlots
        .map((s, index) => {
          return {
            ...s,
            ...slots[index], // Merge with real-time data
          };
        })
        .sort((a, b) => a.slotId - b.slotId)
        .map((s, index) => (
          <Slot
            key={index}
            slotData={s}
            indicator={indicator}
          />
        ))}
    </ul>
  );
};
```

### Slot Component Optimization
```typescript
// Enhanced Slot component for better 12-slot visibility
interface SlotProps {
  slotData: SlotData;
  indicator: IndicatorState;
  gridLayout?: '4x3' | '3x4' | '6x2';
}

const Slot: React.FC<SlotProps> = ({ slotData, indicator, gridLayout = '4x3' }) => {
  const slotSizeClass = useMemo(() => {
    switch (gridLayout) {
      case '4x3':
        return 'h-32 w-full';      // Balanced proportions
      case '3x4':
        return 'h-28 w-full';      // Slightly shorter for 4 rows
      case '6x2':
        return 'h-36 w-full';      // Taller for 2 rows
      default:
        return 'h-32 w-full';
    }
  }, [gridLayout]);

  return (
    <li className={`${slotSizeClass} relative`}>
      <div className={`
        w-full h-full rounded-xl border-2 transition-all duration-300
        ${getSlotStateClass(slotData)}
        ${slotData.isActive ? 'cursor-pointer hover:shadow-lg' : 'opacity-50'}
      `}>
        {/* Slot number - larger for better visibility */}
        <div className="absolute top-2 left-2 text-lg font-bold text-gray-700">
          {String(slotData.slotId).padStart(2, '0')}
        </div>
        
        {/* Status indicator */}
        <div className="absolute top-2 right-2">
          <SlotStatusIndicator status={slotData} />
        </div>
        
        {/* HN display - centered */}
        {slotData.hn && (
          <div className="absolute bottom-2 left-2 right-2 text-center text-sm font-medium text-gray-600 truncate">
            HN: {slotData.hn}
          </div>
        )}
        
        {/* Opening animation overlay */}
        {slotData.opening && (
          <div className="absolute inset-0 bg-blue-500 bg-opacity-20 rounded-xl animate-pulse">
            <div className="flex items-center justify-center h-full">
              <div className="text-blue-700 font-semibold">Opening...</div>
            </div>
          </div>
        )}
      </div>
    </li>
  );
};
```

## 📱 Responsive Design Updates

### Mobile-First Approach for 12 Slots
```css
/* Updated responsive grid classes */
.slot-grid-responsive {
  /* Mobile: 2x6 layout */
  @apply grid-cols-2 gap-4;
  
  /* Tablet: 3x4 layout */
  @screen md {
    @apply grid-cols-3 gap-5;
  }
  
  /* Desktop: 4x3 layout */
  @screen lg {
    @apply grid-cols-4 gap-6;
  }
  
  /* Large desktop: maintain 4x3 but larger gaps */
  @screen xl {
    @apply gap-8;
  }
}

/* Optimized slot sizing for different layouts */
.slot-item-12 {
  /* Base size for mobile 2-column */
  @apply h-28 w-full;
  
  /* Larger on tablet 3-column */
  @screen md {
    @apply h-30;
  }
  
  /* Optimal size for desktop 4-column */
  @screen lg {
    @apply h-32;
  }
}
```

### Viewport Optimization
```typescript
// Responsive slot grid hook
const useSlotGridLayout = () => {
  const [layout, setLayout] = useState<'2x6' | '3x4' | '4x3' | '6x2'>('4x3');
  
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      
      if (width < 640) {
        setLayout('2x6');         // Mobile
      } else if (width < 768) {
        setLayout('3x4');         // Small tablet
      } else if (width < 1024) {
        setLayout('3x4');         // Tablet
      } else if (width >= 1400) {
        setLayout('6x2');         // Large desktop (optional)
      } else {
        setLayout('4x3');         // Standard desktop
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return {
    layout,
    gridClass: getGridClass(layout),
    slotClass: getSlotClass(layout)
  };
};

const getGridClass = (layout: string): string => {
  switch (layout) {
    case '2x6': return 'grid-cols-2';
    case '3x4': return 'grid-cols-3'; 
    case '4x3': return 'grid-cols-4';
    case '6x2': return 'grid-cols-6';
    default: return 'grid-cols-4';
  }
};
```

## 🎯 Navigation and Layout Updates

### Sidebar Navigation Adjustments
```typescript
// Updated Navbar component for 12-slot system
const Navbar = ({ active }: NavbarProps) => {
  const { slots, canDispense } = useKuStates(); // Will be updated to useCu12States
  
  // Filter to only show 12 active slots for dispensing button state
  const activeSlots = useMemo(() => 
    slots.filter(slot => slot.slotId <= 12 && slot.isActive), 
    [slots]
  );
  
  const canDispenseAny = useMemo(() => 
    activeSlots.some(slot => !slot.occupied && slot.isActive),
    [activeSlots]
  );
  
  return (
    <div className="grid grid-cols-1 gap-2">
      <button
        disabled={!canDispenseAny || active !== 1}
        onClick={() => handleDispenseButton()}
        className="btn flex justify-start items-center gap-2 font-bold bg-[#eee] rounded-xl shadow-xl hover:bg-[#5495F6] hover:text-[#fff] disabled:text-[#ddd] disabled:bg-[#eee]"
      >
        <BsUnlockFill />
        จ่ายยา
      </button>
      
      {/* Rest of navigation remains the same */}
      <Link href="/home">
        <button className={`btn btn-ghost flex justify-start items-center gap-2 ${active == 1 ? "btn-active text-white" : null}`}>
          <BsHouseDoor size={16} />
          <span>หน้าหลัก</span>
        </button>
      </Link>
      
      {/* Navigation items unchanged */}
    </div>
  );
};
```

### Management Page Slot Display
```typescript
// Updated SlotSetting component for 12-slot management
const SlotSetting = ({ 
  slotList, 
  handleDeactivateAll, 
  handleReactivateAll,
  handleDeactivateAdmin,
  handleReactivateAdmin 
}) => {
  // Filter to show only relevant slots (1-12 for CU12)
  const cu12Slots = useMemo(() => 
    slotList.filter(slot => slot.slotId <= 12),
    [slotList]
  );
  
  return (
    <div className="space-y-6">
      {/* Bulk operations */}
      <div className="flex gap-4 justify-center">
        <button 
          onClick={handleReactivateAll}
          className="btn btn-success"
        >
          เปิดใช้งานทั้งหมด (12 ช่อง)
        </button>
        <button 
          onClick={handleDeactivateAll}
          className="btn btn-error"
        >
          ปิดใช้งานทั้งหมด (12 ช่อง)
        </button>
      </div>
      
      {/* Individual slot controls in 4x3 grid */}
      <div className="grid grid-cols-4 gap-4">
        {cu12Slots.map(slot => (
          <div key={slot.slotId} className="card bg-base-200 shadow-sm">
            <div className="card-body p-4">
              <h3 className="card-title text-lg">Slot {slot.slotId}</h3>
              <div className="space-y-2">
                <div className={`badge ${slot.isActive ? 'badge-success' : 'badge-error'}`}>
                  {slot.isActive ? 'Active' : 'Inactive'}
                </div>
                <div className="flex gap-2">
                  {slot.isActive ? (
                    <button 
                      onClick={() => handleDeactivateAdmin(slot.slotId)}
                      className="btn btn-sm btn-error"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleReactivateAdmin(slot.slotId)}
                      className="btn btn-sm btn-success"
                    >
                      Activate
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

## 🔧 State Management Updates

### Hook Updates for 12-Slot System
```typescript
// Updated useKuStates hook (will become useCu12States)
const useCu12States = () => {
  const [slots, setSlots] = useState<SlotState[]>([]);
  const [canDispense, setCanDispense] = useState<boolean>(false);
  
  useEffect(() => {
    // Initialize 12 slots instead of 15
    const initializeCu12Slots = () => {
      const cu12Slots = Array.from({ length: 12 }, (_, i) => ({
        slotId: i + 1,
        hn: "",
        occupied: false,
        timestamp: new Date().getTime(),
        opening: false,
        isActive: true,
      }));
      setSlots(cu12Slots);
    };
    
    initializeCu12Slots();
    
    // Listen for CU12 slot updates
    ipcRenderer.on('cu12-slot-update', (event, slotData) => {
      setSlots(prevSlots => {
        const updatedSlots = [...prevSlots];
        slotData.forEach((newSlot: SlotState) => {
          const index = updatedSlots.findIndex(s => s.slotId === newSlot.slotId);
          if (index !== -1 && newSlot.slotId <= 12) {
            updatedSlots[index] = { ...updatedSlots[index], ...newSlot };
          }
        });
        return updatedSlots;
      });
    });
    
    return () => {
      ipcRenderer.removeAllListeners('cu12-slot-update');
    };
  }, []);
  
  useEffect(() => {
    // Update dispense capability based on 12 active slots
    const hasAvailableSlot = slots.some(slot => 
      slot.isActive && !slot.occupied && slot.slotId <= 12
    );
    setCanDispense(hasAvailableSlot);
  }, [slots]);
  
  return {
    slots: slots.filter(s => s.slotId <= 12), // Ensure only 12 slots
    canDispense
  };
};
```

## 📋 Round 4 Implementation Priorities

### Task A: Home Page Layout Update
1. **Grid Layout**: Update from 5x3 to 4x3 responsive grid
2. **Slot Components**: Optimize slot size and visibility
3. **Mock Data**: Update mockSlots array to 12 slots
4. **Responsive Design**: Ensure mobile/tablet/desktop compatibility

### Task B: State Management & Navigation
1. **Hook Updates**: Migrate useKuStates to useCu12States
2. **Navigation Logic**: Update dispensing button logic for 12 slots
3. **Management Interface**: Update admin slot management for 12-slot grid
4. **Real-time Updates**: Ensure IPC handlers work with 12-slot system

### Success Criteria for Round 4
- [ ] Home page displays 12-slot grid in 4x3 layout
- [ ] Responsive design works on all device sizes
- [ ] All slot interactions functional with 12-slot system
- [ ] Management page shows correct 12-slot configuration
- [ ] Navigation and state management updated for CU12
- [ ] Visual design maintains consistency with existing UI