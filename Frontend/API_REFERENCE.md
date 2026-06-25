Invoicing Service API Documentation
Version
v1.0

Authentication
All endpoints require authentication.
Authorization: Bearer <JWT_TOKEN>

Roles



Role
Access




Admin
All invoice operations


Other Users
No access



Exception
PATCH /api/invoices/internal/:invoiceNo/payment-status

uses
x-api-key

instead of JWT.

Invoice Lifecycle
Customer

↓

Select Billing Address

↓

Select Connections

↓

Preview Invoice

↓

Create Draft

↓

Edit Draft (Optional)

↓

Finalize

↓

Payment Updated by Bahi Khata

↓

Adjustment Invoice (Optional)


Invoice Status Flow
DRAFT

↓

FINALIZED

↓

PARTIAL

↓

PAID

or
DRAFT

↓

CANCELLED


Invoice Types
BASE

ADJUSTMENT

CREDIT_NOTE

DEBIT_NOTE


Common Response Format
Success
{
    "status":"success",
    "data":{}
}

Error
{
    "status":"fail",
    "message":"Error message"
}


1 Preview Invoice
Endpoint
POST /api/invoices/preview


Purpose
Does NOT save anything.
Only calculates

Billable items
Taxes
Totals
Discount
Manual item flag


Request
{
    "connections": [],
    "billingCycleStart": "2026-06-01",
    "billingCycleEnd": "2026-06-30",
    "billingMode": "POSTPAID",
    "applyIgst": false,
    "discount": 0
}


Response
{
    "status":"success",
    "data":{
        "generatedAt":"",
        "previewVersion":1,
        "items":[],
        "financials":{},
        "hasManualItems":false
    }
}


2 Create Draft Invoice
Endpoint
POST /api/invoices/draft


Purpose
Creates immutable draft invoice.
No invoice number generated yet.

Request
{
    "customer":{},
    "selectedGstProfile":{},
    "selectedCompanyProfile":{},
    "items":[],
    "billingCycleStart":"",
    "billingCycleEnd":"",
    "invoiceDate":"",
    "dueDate":"",
    "billingMode":"POSTPAID",
    "applyIgst":false,
    "discount":0
}


Response
201 Created

{
    "status":"success",
    "data":{
        "invoice":{}
    }
}


Possible Errors
400 Missing customer

400 Missing company profile

400 Missing billing cycle

409 Draft invoice already exists


3 Update Draft
Endpoint
PUT /api/invoices/:id


Purpose
Update existing draft.
Only DRAFT invoices are editable.
Uses optimistic locking.

Request
{
    "version":1,
    "invoiceDate":"",
    "dueDate":"",
    "items":[],
    "applyIgst":false,
    "discount":0
}


Response
{
    "status":"success",
    "message":"Draft invoice updated successfully.",
    "data":{
        "invoice":{}
    }
}


Important
Frontend MUST send
__v

as

version

every update.
If another user modified the invoice
backend returns
409 Conflict

Frontend should show
This invoice has been modified.

Please refresh.


4 Finalize Invoice
Endpoint
PATCH /api/invoices/:id/finalize


Purpose
Locks invoice forever.
Assigns sequential invoice number.
Cannot be edited afterwards.

Response
{
    "status":"success",
    "message":"Invoice successfully finalized and locked",
    "data":{
        "invoice":{}
    }
}


Errors
404 Invoice not found

400 Already finalized

409 Finalized by another user


5 Cancel Draft
Endpoint
PATCH /api/invoices/:id/cancel


Purpose
Cancels DRAFT invoice.
Finalized invoices cannot be cancelled.

Response
{
    "status":"success",
    "message":"Draft Invoice has been successfully cancelled."
}


6 Invoice List
Endpoint
GET /api/invoices


Query Parameters
page

limit

status

customerId

Example
GET /api/invoices?page=1&limit=15&status=FINALIZED


Response
{
    "status":"success",
    "results":15,
    "data":{
        "invoices":[],
        "pagination":{
            "total":100,
            "page":1,
            "pages":7
        }
    }
}


7 Invoice Details
Endpoint
GET /api/invoices/:id


Response
Returns complete invoice including
companySnapshot

customerSnapshot

items

financials

audit

paymentHistory


8 Payment Sync (Internal)
Endpoint
PATCH /api/invoices/internal/:invoiceNo/payment-status


Authentication
x-api-key

Required
INTERNAL_INVOICING_SECRET


Request
{
    "paymentStatus":"Paid",
    "balanceDue":0,
    "amountPaid":11800
}


Purpose
Called ONLY by Bahi Khata.
Frontend MUST NEVER call this endpoint.

Updates
status

financials.amountPaid

financials.balanceDue


9 Record Payment
POST /api/invoices/:id/payments

Status
⚠ Deprecated
Payments are now managed by Bahi Khata.
Frontend should NOT use this endpoint.

10 Adjustment Invoice
Endpoint
POST /api/invoices/:id/adjust


Purpose
Create
Upgrade

Downgrade

Rate Revision

invoice.

Request
{
    "effectiveDate":"",
    "oldPlan":{},
    "newPlan":{},
    "applyIgst":false,
    "reason":"Upgrade"
}


Response
201 Created

{
    "status":"success",
    "message":"Adjustment invoice created successfully",
    "data":{
        "invoice":{}
    }
}


Invoice Object Structure
Invoice

├── invoiceNumber
├── invoiceType
├── status
├── billingConfiguration
├── dates
├── companySnapshot
├── customerSnapshot
├── items[]
├── financials
├── paymentHistory[]
├── paymentSyncStatus
├── audit
├── createdBy
├── createdAt
└── updatedAt


Frontend Business Rules
Create Invoice
Customer

↓

Select Billing Profile

↓

Select Company GST

↓

Select Billing Cycle

↓

Preview

↓

User edits if needed

↓

Create Draft

↓

Finalize

Billing Profile
A customer can have
1

or

many

billing profiles.
Always render them as selectable cards or radio buttons.
Never assume a single GST/address.
Connection Selection
Display
Active

Generation

Disconnect Initiated

Default selection
Active only

Generation and Disconnect Initiated should remain visible so the user can manually include them.