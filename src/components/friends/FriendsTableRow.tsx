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
import { TableRow, TableCell } from "../ui/table";

interface User {
  id: string;
  name: string;
  phone: string;
}

function FriendsTableRow({
  friend,
  amount,
  settleBalance,
}: {
  friend: User;
  amount: number;
  settleBalance: (friendId: string) => void;
}) {
  return (
    <TableRow>
      <TableCell className="font-medium">
        <p>{friend.name}</p>
        <p className="text-sm text-muted-foreground">{friend.phone}</p>
      </TableCell>
      <TableCell
        className={`text-right font-semibold ${
          amount === 0
            ? "text-foreground"
            : amount < 0
            ? "text-red-500"
            : "text-primary"
        }`}
      >
        {amount > 0 ? "+" : ""}
        {amount}
      </TableCell>
      <TableCell
        className={`text-right ${
          amount === 0
            ? "text-green-500"
            : amount < 0
            ? "text-red-500"
            : "text-primary"
        }`}
      >
        {amount > 0 ? "Owes you" : amount < 0 ? "You owe" : "Settled"}
      </TableCell>
      <TableCell className="text-right">
        {amount !== 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="text-primary">
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
        )}
      </TableCell>
    </TableRow>
  );
}

export default FriendsTableRow;
