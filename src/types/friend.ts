export interface Friend {
  id: string;
  userId: string;
  friendId: string;
  amount: number;
  createdAt: Date;
  updatedAt: Date;
  user: {
    name: string;
    phone: string;
  };
  friend: {
    name: string;
    phone: string;
  };
}