import { describe,it,expect } from "vitest";
import fc from "fast-check";
import { expenseDraftSchema, buildExpenseDraft, previewDraft } from "@/lib/validation/expense-draft";
import { amountInputValue } from "@/lib/validation/personal-expense";
describe("expense form financial payloads",()=>{
  it("preserves integer totals across every split mode",()=>{
    fc.assert(fc.property(fc.integer({ min: 1,max: 1000000 }),total=>{
      for(const splitType of ["EQUAL","EXACT","PERCENTAGE","SHARES"] as const){
        const input=expenseDraftSchema.parse({ amount: amountInputValue(total),description: "Draft",category: "Food",date: "2026-10-29",notes: "",splitType,payerId: "a",multiplePayers: false,people: [
          { userId: "a",selected: true,paid: "0",value: splitType === "EXACT" ? amountInputValue(total) : splitType === "PERCENTAGE" ? "60" : "2" },
          { userId: "b",selected: true,paid: "0",value: splitType === "EXACT" ? "0" : splitType === "PERCENTAGE" ? "40" : "1" },
        ] });
        const result=buildExpenseDraft("a",null,input);
        expect(result.shares.reduce((sum,p)=>sum+p.owed,0)).toBe(total);
        expect(result.input.participants.reduce((sum,p)=>sum+p.paid,0)).toBe(total);
      }
    }));
  });
  it("shows payer and owed remainders before saving an incomplete draft",()=>{
    const preview=previewDraft("a",null,{ amount: "10",description: "",category: "Food",date: "2026-10-29",notes: "",splitType: "EXACT",payerId: "a",multiplePayers: true,people: [{ userId: "a",selected: true,paid: "8",value: "7" }] });
    expect(preview.remainders).toEqual({ paid: 200,owed: 300 });
    expect(preview.input).toBeNull();
  });
});
