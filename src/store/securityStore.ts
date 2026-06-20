import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type Section = "sales" | "finance" | "management";

interface SecurityState {
  unlockedSections: Record<Section, { unlocked: boolean; timestamp: number }>;
  unlockSection: (section: Section, durationMinutes?: number) => void;
  lockSection: (section: Section) => void;
  isSectionUnlocked: (section: Section) => boolean;
  checkAllSections: () => void; // Checks and locks expired sections
}

const UNLOCK_DURATION_MINUTES = 5; // Default unlock duration

export const useSecurityStore = create<SecurityState>()(
  persist(
    (set, get) => ({
      unlockedSections: {
        sales: { unlocked: false, timestamp: 0 },
        finance: { unlocked: false, timestamp: 0 },
        management: { unlocked: false, timestamp: 0 },
      },

      unlockSection: (section, durationMinutes = UNLOCK_DURATION_MINUTES) => {
        set((state) => ({
          unlockedSections: {
            ...state.unlockedSections,
            [section]: { unlocked: true, timestamp: Date.now() + durationMinutes * 60 * 1000 },
          },
        }));
      },

      lockSection: (section) => {
        set((state) => ({
          unlockedSections: {
            ...state.unlockedSections,
            [section]: { unlocked: false, timestamp: 0 },
          },
        }));
      },

      isSectionUnlocked: (section) => {
        const sectionState = get().unlockedSections[section];
        if (!sectionState || !sectionState.unlocked) {
          return false;
        }
        // Check for expiry
        if (Date.now() > sectionState.timestamp) {
          get().lockSection(section); // Lock if expired
          return false;
        }
        return true;
      },

      checkAllSections: () => {
        set((state) => {
          const newUnlockedSections = { ...state.unlockedSections };
          let changed = false;
          for (const key in newUnlockedSections) {
            const section = key as Section;
            const sectionState = newUnlockedSections[section];
            if (sectionState.unlocked && Date.now() > sectionState.timestamp) {
              newUnlockedSections[section] = { unlocked: false, timestamp: 0 };
              changed = true;
            }
          }
          return changed ? { unlockedSections: newUnlockedSections } : state;
        });
      },
    }),
    {
      name: "security-storage", // name of the item in storage (e.g. localStorage)
      storage: createJSONStorage(() => sessionStorage), // use sessionStorage
    }
  )
);

// Optional: Periodically check and lock expired sections
setInterval(() => {
  useSecurityStore.getState().checkAllSections();
}, 60 * 1000); // Check every minute
