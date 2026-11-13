# State machine assessment

Reviewed on 2026-11-13. A lifecycle is not itself a defect. The initial inventory
identified twelve workflows; the follow-up review distinguishes useful UI
refactors from domain behavior that already has explicit states and guards.

| Workflow                   | Assessment                                                                                                        | Implementation decision                       |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Account eligibility        | Better Auth hooks and `guards.ts` enforce verification, active status and deletion checks.                        | Keep existing checks; no defect established.  |
| Onboarding                 | A one-way completion timestamp with an explicit UI gate.                                                          | Keep existing implementation.                 |
| Placeholder claim          | An explicit transactional `mergePlaceholder` service, with identity checks and integration coverage.              | Keep existing implementation.                 |
| Invite availability        | `valid()` derives availability from revocation, expiry and use limits; direct claims are locked and replay-aware. | Keep existing implementation.                 |
| Friend requests            | Explicit pending/accepted/declined statuses, guarded responses, replay handling and cooldown checks.              | Keep existing implementation.                 |
| Friendship blocking        | Explicit accepted/blocked status and blocker ownership check.                                                     | Keep existing implementation.                 |
| Group lifecycle            | Archive timestamp and explicit admin/write guards; unarchive is handled separately.                               | Keep existing implementation.                 |
| Membership                 | Explicit active/left/removed states and roles; guards preserve debt and the last admin.                           | Keep existing implementation.                 |
| Expense lifecycle          | Named create/edit/delete/restore services, version checks and atomic ledger changes.                              | Keep existing implementation.                 |
| Recorded payment lifecycle | Named create/delete/restore services; restore deliberately rechecks current repayment restrictions.               | Keep existing implementation.                 |
| Payment entry and UPI      | Confirmation, handoff, return and recording were coordinated with independent flags.                              | Replace with the typed `paymentFlow` reducer. |
| Drawer dismissal           | Open/dirty/busy flags and a deferred discard callback jointly controlled navigation.                              | Replace with the typed `drawerFlow` reducer.  |

The ten retained domain implementations are false positives **as defect or
mandatory-refactor claims**. They remain legitimate lifecycle observations.
Neither UI refactor implies that an incorrect financial write was demonstrated.

## Payment entry

`src/lib/state/payment-flow.ts` defines editing, confirming, awaiting UPI,
recording and complete states. Confirming carries the intended action;
awaiting UPI carries whether the page has returned; recording carries its retry
destination. Unrelated events leave the current state intact.

Opening UPI or returning to the page never records a payment. The user must
confirm it. Closing the balance confirmation dialog after launching UPI must not
cancel the handoff. A failed UPI recording restores its confirmation state; a
failed ordinary recording restores editing. Cancellation cannot interrupt a
pending write. Successful inline forms can reset for another payment.

`PaymentForm` performs the existing side effects and retains the same draft and
idempotency key on failure. A ref prevents duplicate submissions within one
render before mutation status updates.

## Drawer dismissal

`src/lib/state/drawer-flow.ts` defines closed, open and confirming-discard states.
Dirty and busy are independent properties of an open draft. Only discard
confirmation carries a deferred callback. The reducer never executes callbacks.

Busy forms reject discard requests. Cancelling discard preserves the draft.
Completion clears the draft flags and pending callback. Late child cleanup and
dialog-close events cannot reopen a closed drawer. Existing browser Back, Escape,
outside-click and focus behavior stays in `FormDrawer`.

## Other observations

No additional changes are warranted for composer views/conflicts, idempotency
replays, notification permissions/subscriptions or activity read state: they
already have explicit view/status values or straightforward guarded operations.

`pushSentAt` acts as a processing checkpoint: disabled notification types, no
subscriptions and permanently gone endpoints are terminal outcomes; transient
delivery failures remain pending. Marking skipped events complete prevents queue
starvation and notifications being sent later after preferences change. The name
is imprecise, but no delivery defect follows from that alone, so the field and
database column are unchanged. Recipient-level retries may resend to an endpoint
that already succeeded when another endpoint failed; this assessment does not
claim exactly-once delivery or redesign the outbox.
