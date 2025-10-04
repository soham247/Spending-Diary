import "next-auth";

declare module "next-auth" {
    interface User {
        id: string;
        isPremium: boolean;
        name: string;
        phone: string;
    }

    interface Session {
        user: User & {
            id: string;
            isPremium: boolean;
        }
        token: {
            id: string;
            isPremium: boolean;
        }
    }
}