# Project Context

You are working ONLY on the frontend.

Do NOT modify backend APIs.
Do NOT invent new endpoints.
Do NOT assume request or response structures.

If any required data is unavailable, explicitly ask for it instead of making assumptions.

==================================================
PROJECT
==================================================

Enterprise ISP Billing & CRM

Stack

React
Vite
React Query
React Hook Form
TailwindCSS
Shadcn UI

Backend

Node.js
Express
MongoDB

==================================================
API RESPONSE FORMAT
==================================================

Every API returns

{
    status,
    source,
    data
}

==================================================
INVOICE FLOW
==================================================

Customer List

↓

Customer Details

↓

Create Invoice

↓

Preview

↓

Save Draft

↓

Finalize

↓

Paid (Webhook from Bahi Khata)

==================================================
CUSTOMER
==================================================

A customer can have MULTIPLE billing profiles.

billingProfile is ALWAYS an array.

Example

billingProfile[]

{
    _id,
    label,
    gstNumber,
    address
}

Never assume a customer has a single address.

Always render billingProfile as selectable cards/radio buttons.

==================================================
CONNECTIONS
==================================================

Display

Active

Generation

Disconnect Initiated

Default selection

Active

Generation and Disconnect Initiated are visible but unselected.

==================================================
INVOICE CREATION
==================================================

POST /api/invoices/draft

Expected payload

{
    customer,

    selectedGstProfile,

    selectedCompanyProfile,

    invoiceDate,

    dueDate,

    billingMode,

    billingCycleStart,

    billingCycleEnd,

    items
}

==================================================
PAYMENTS
==================================================

Payments are NOT created from frontend.

Bahi Khata is the source of truth.

Frontend only displays

status

amountPaid

balanceDue

==================================================
RULES

Never create new backend routes.

Never rename API fields.

Never change payload structure.

Never create fake data structures.

If something is missing,

STOP

and ask for the backend response.

Never hallucinate.