import { create } from "zustand"
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

interface IAuthStore {
    userId: string | null;
    hydrated: boolean;

    setHydrated(): void;
    login(userId: string): void;
    logout(): void;
}

export const useAuthStore = create<IAuthStore>()(
    persist(
        immer((set) => ({
            userId: null,
            hydrated: false,

            setHydrated() {
                set({ hydrated: true })
            },

            login(userId: string) {
                set({ userId })
            },

            logout() {
                set({ userId: null })
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