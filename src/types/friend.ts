export interface Friend {
  userId: {
    id: string;
    name: string;
    phone: string;
  };
  friendId: string;
  amount: number;
}