"use client";

import { useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { FormDrawer } from "@/components/common/FormDrawer";
import { PageHeaderAction } from "@/components/shell/PageHeaderAction";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InvitePanel } from "@/components/invite/InvitePanel";
import { PeopleSearchResults } from "./PeopleSearchResults";

export function AddFriendDrawer() {
  const [query, setQuery] = useState("");
  const search = useRef<HTMLInputElement>(null);
  return (
    <FormDrawer
      title="Add friend"
      description="Send a request or share a link"
      trigger={<PageHeaderAction label="Add friend" />}
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="friend-search">Search by name or full email</Label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground"
            />
            <Input
              ref={search}
              id="friend-search"
              name="friend-search"
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
              type="search"
              autoComplete="off"
              maxLength={254}
              placeholder="Aman or name@example.com"
              className="min-h-11 pl-9 pr-12 [&::-webkit-search-cancel-button]:appearance-none"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 size-11"
                aria-label="Clear friend search"
                onClick={() => {
                  setQuery("");
                  search.current?.focus();
                }}
              >
                <X aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
        <PeopleSearchResults query={query} />
        {!query.trim() && (
          <section
            aria-labelledby="connection-link-heading"
            className="space-y-3 border-t border-border pt-6"
          >
            <div className="space-y-2">
              <h2
                id="connection-link-heading"
                className="text-base font-medium"
              >
                Connect with a link
              </h2>
            </div>
            <InvitePanel
              input={{ type: "PERSONAL" }}
              createLabel="Create connection link"
            />
          </section>
        )}
      </div>
    </FormDrawer>
  );
}
