import { Card } from "../ui/card";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";

interface User {
  id: string;
  name: string;
  phone: string;
}

function FriendsCard({
  friend,
  amount,
  settleBalance,
}: {
  friend: User;
  amount: number;
  settleBalance: (friendId: string) => void;
}) {
  return (
    <Card className="p-4">
      <div className="flex flex-col space-y-3">
        <div>
          <h3 className="font-medium">{friend.name}</h3>
          <p className="text-sm text-muted-foreground">{friend.phone}</p>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Balance:</span>
          <span
            className={`font-semibold ${
              amount === 0
                ? "text-foreground"
                : amount < 0
                ? "text-red-500"
                : "text-primary"
            }`}
          >
            {amount > 0 ? "+" : ""}
            {amount}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Status:</span>
          <span
            className={`${
              amount === 0
                ? "text-green-500"
                : amount < 0
                ? "text-red-500"
                : "text-primary"
            }`}
          >
            {amount > 0 ? "Owes you" : amount < 0 ? "You owe" : "Settled"}
          </span>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="text-primary w-full mt-2">
              Settle Balance
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will settle the balance between you and{" "}
                {friend.name} and cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => settleBalance(friend.id)}>
                Settle Balance
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Card>
  );
}

export default FriendsCard;
