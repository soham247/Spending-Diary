"use client";

import { useState } from "react";
import { FormDrawer } from "@/components/common/FormDrawer";
import { PageHeaderAction } from "@/components/shell/PageHeaderAction";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InvitePanel } from "@/components/invite/InvitePanel";
import { PeopleSearchResults } from "./PeopleSearchResults";

export function AddFriendDrawer() {
  const [query, setQuery] = useState("");
  return (
    <FormDrawer
      title="Add friend"
      description="Find someone you know or share your connection link. Requests need to be accepted before you can share direct expenses."
      trigger={<PageHeaderAction label="Add friend" />}
    >
      <div className="space-y-4">
        <Label htmlFor="friend-search">Search by name or full email</Label>
        <Input
          id="friend-search"
          name="friend-search"
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          type="search"
          autoComplete="off"
          maxLength={254}
          placeholder="Search by name or full email"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <p className="text-sm text-muted-foreground">
          Names search your friends and people in your active groups. Email
          finds people who allow it. Emails stay private.
        </p>
        <PeopleSearchResults query={query} />
        {!query.trim() && (
          <InvitePanel
            input={{ type: "PERSONAL" }}
            createLabel="Share my connection link"
          />
        )}
      </div>
    </FormDrawer>
  );
}
