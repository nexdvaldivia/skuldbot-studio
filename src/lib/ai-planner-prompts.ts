/**
 * AI Planner example prompts shown to the user in the Planner panel.
 *
 * Contract: an array of short natural-language descriptions the user can
 * click to pre-fill the Planner input. Shown in the UI (PlannerInput.tsx).
 *
 * NOTE: this was a missing module re-introduced in the TS tech debt fix
 * (see docs/STUDIO_TECH_DEBT.md). If a canonical source of example prompts
 * is re-introduced elsewhere, re-point imports and delete this file.
 */

export const EXAMPLE_PROMPTS: string[] = [
  "Read invoices from an email folder, extract totals with AI, and append them to a Google Sheet.",
  "Every Monday at 9am, fetch last week's sales from the API and email a summary report.",
  "Watch a shared folder for new PDFs, OCR them, and index the content in the vector database.",
  "When a form is submitted, validate the data, create a record in the database, and notify Slack.",
  "Every hour, poll the CRM for new leads, score them with an AI model, and route high-value ones to the sales team.",
  "Extract transactions from bank statement PDFs and push them to QuickBooks Online.",
];
