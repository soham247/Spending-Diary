"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { useGroup } from "@/hooks/use-groups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingState } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";
import { useFormDrawer } from "@/components/common/FormDrawer";

type Person = { id: string; name: string };
export type ExpenseComposer = {
  viewer: Person;
  friends: Person[];
  groups: Person[];
  groupName?: string;
};
export type ExpensePeopleSelection = {
  groupId: string | null;
  groupName?: string;
  people: Person[];
  selectedIds: string[];
};

export function ExpensePeoplePicker({
  composer,
  selection,
  resetWarning,
  onApply,
  onCancel,
}: {
  composer: ExpenseComposer;
  selection: ExpensePeopleSelection;
  resetWarning: boolean;
  onApply: (selection: ExpensePeopleSelection) => void;
  onCancel: () => void;
}) {
  const [scope, setScope] = useState(selection.groupId);
  const drawer = useFormDrawer();
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState(
    selection.groupId ? [composer.viewer.id] : selection.selectedIds,
  );
  const [search, setSearch] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  const group = useGroup(scope ?? "");
  const matches = (person: Person) =>
    person.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
  const changed =
    scope !== selection.groupId ||
    (!scope &&
      (selectedIds.length !== selection.selectedIds.length ||
        selectedIds.some((id) => !selection.selectedIds.includes(id))));
  const unavailable =
    !!scope && (group.isPending || group.isError || !group.data?.canWrite);
  return (
    <div className="space-y-4">
      <Button type="button" variant="ghost" onClick={onCancel}>
        Back to expense
      </Button>
      <h2 ref={heading} tabIndex={-1} className="text-lg font-semibold">
        Who is this expense with?
      </h2>
      <Label htmlFor="expense-people-search">Find people or groups</Label>
      <Input
        id="expense-people-search"
        name="people-search"
        autoComplete="off"
        type="search"
        placeholder="Search by name…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.preventDefault();
        }}
      />
      <Button
        type="button"
        variant="outline"
        className="w-full justify-between"
        aria-pressed={
          !scope &&
          selectedIds.length === 1 &&
          selectedIds[0] === composer.viewer.id
        }
        onClick={() => {
          setScope(null);
          setSelectedIds([composer.viewer.id]);
        }}
      >
        Just for you
        {!scope &&
          selectedIds.length === 1 &&
          selectedIds[0] === composer.viewer.id && <Check aria-hidden="true" />}
      </Button>
      <section aria-label="Groups" className="space-y-2">
        <h3 className="font-medium">Groups</h3>
        <Card className="gap-0 divide-y divide-border py-0">
          {composer.groups.filter(matches).map((item) => (
            <Button
              key={item.id}
              type="button"
              variant="ghost"
              className="h-auto min-h-11 w-full justify-between whitespace-normal px-4 py-3 text-left"
              aria-pressed={scope === item.id}
              onClick={() => setScope(item.id)}
            >
              <span className="min-w-0 break-words">{item.name}</span>
              {scope === item.id && <Check aria-hidden="true" />}
            </Button>
          ))}
        </Card>
        {!composer.groups.filter(matches).length && (
          <p className="text-sm text-muted-foreground">No matching groups.</p>
        )}
      </section>
      {scope && (
        <div aria-live="polite">
          {group.isPending ? (
            <LoadingState />
          ) : group.isError ? (
            <ErrorState retry={() => void group.refetch()} />
          ) : !group.data.canWrite ? (
            <ErrorState message="This group is read-only. Choose another group or friends." />
          ) : (
            <p className="text-sm text-muted-foreground">
              All active members of {group.data.name} will share this expense.
              You can adjust the split afterward.
            </p>
          )}
        </div>
      )}
      <section aria-label="Friends" className="space-y-2">
        <h3 className="font-medium">Friends</h3>
        <Card className="gap-0 divide-y divide-border py-0">
          {[composer.viewer, ...composer.friends]
            .filter(
              (person) => person.id === composer.viewer.id || matches(person),
            )
            .map((person) => (
              <div key={person.id} className="flex items-center gap-3 px-4">
                <Checkbox
                  id={"with-" + person.id}
                  checked={!scope && selectedIds.includes(person.id)}
                  onCheckedChange={(checked) => {
                    const ids = scope ? [composer.viewer.id] : selectedIds;
                    setScope(null);
                    setSelectedIds(
                      checked === true
                        ? [...new Set([...ids, person.id])]
                        : ids.filter((id) => id !== person.id),
                    );
                  }}
                />
                <Label
                  htmlFor={"with-" + person.id}
                  className="min-h-11 min-w-0 flex-1 break-words py-3"
                >
                  {person.id === composer.viewer.id ? "You" : person.name}
                </Label>
              </div>
            ))}
        </Card>
        {!composer.friends.filter(matches).length && (
          <p className="text-sm text-muted-foreground">
            No matching friends.{" "}
            <Link
              className="underline"
              href="/friends"
              onClick={(event) => {
                if (!drawer) return;
                event.preventDefault();
                drawer.confirmDiscard(() =>
                  drawer.complete(() => router.push("/friends")),
                );
              }}
            >
              Add a friend
            </Link>{" "}
            to split with someone new.
          </p>
        )}
      </section>
      {changed && resetWarning && (
        <Alert>
          <AlertDescription>
            Changing people resets the split to equal and the payer to you. Your
            amount, description, date, category and notes stay.
          </AlertDescription>
        </Alert>
      )}
      <div className="form-drawer-actions border-t border-border">
        <Button
          className="w-full"
          type="button"
          disabled={unavailable}
          onClick={() => {
            if (!changed) {
              onCancel();
              return;
            }
            if (scope && group.data?.canWrite)
              onApply({
                groupId: scope,
                groupName: group.data.name,
                people: group.data.members.filter(
                  (person) => person.status === "ACTIVE",
                ),
                selectedIds: group.data.members
                  .filter((person) => person.status === "ACTIVE")
                  .map((person) => person.id),
              });
            else if (!scope)
              onApply({
                groupId: null,
                people: [composer.viewer, ...composer.friends],
                selectedIds,
              });
          }}
        >
          {changed && resetWarning
            ? "Reset split and use selection"
            : "Use selection"}
        </Button>
      </div>
    </div>
  );
}
