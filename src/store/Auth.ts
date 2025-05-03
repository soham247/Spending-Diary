import { create } from "zustand"
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

interface IAuthStore {
    userId: string | null;
    isPremium: boolean;
    hydrated: boolean;

    setHydrated(): void;
    login(userId: string, isPremium: boolean): void;
    logout(): void;
}

export const useAuthStore = create<IAuthStore>()(
    persist(
        immer((set) => ({
            userId: null,
            isPremium: false,
            hydrated: false,

            setHydrated() {
                set({ hydrated: true })
            },

            login(userId: string, isPremium: boolean) {
                set({ userId, isPremium })
            },

            logout() {
                set({ userId: null, isPremium: false })
            },
            
        })),
        {
            name: "auth",
            onRehydrateStorage() {
                return (state, error) => {
                    if(!error) state?.setHydrated()
                }
            }
        }
    )
)