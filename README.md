# TRISYS EXPRESS — International Courier & Logistics Platform

A full-stack international courier, shipping quote, doorstep pickup, live rate comparison, B2B logistics, and Admin Dashboard web application for **Trisys Express** (shipping from India to 200+ countries worldwide via DHL, FedEx, UPS, Aramex, and commercial air cargo).

---

## Key Features

### 1. Customer Website
- **Home & Instant Quote Widget (`/` / `index.html`)**:
  - Multi-tab shipping widget (**Get a Quote**, **Track a Shipment**, **Schedule Pickup**, **Find Rates**).
  - Searchable country selector for 200+ destinations with SVG flags, pricing zones, and transit SLAs.
  - Package categories: **Document**, **Parcel**, **Medicine**, **E-commerce**, **Bulk & Cargo**, and **Other**.
  - Live chargeable & volumetric weight calculation (`L × W × H ÷ 5000` for courier, `÷ 6000` for air freight).
- **Dedicated Service & Quote Pages (`/quote`, `/document-courier`, `/parcel-shipping`, `/medicine-courier`, `/ecommerce-logistics`, `/bulk-commercial`, `/other-services`)**:
  - Live multi-tier rate calculation (**Next Flight Out**, **Express Air Saver**, **Economy Air Courier**) with click-to-select tier cards.
  - Compliance & packaging checklists tailored to each shipment type (e.g., 90-day personal supply Rx validation for Medicine Courier, CSB-V / D2C options for E-commerce, pallet/CBM calculator for Bulk Cargo).
- **Find Rates & Corridor Comparison (`/rates` / `rates.html`)**:
  - Interactive rate calculator with optional package dimensions (`L × W × H cm`).
  - Paginated international corridor comparison table with one-click route quotes.
- **Schedule Doorstep Pickup (`/schedule-pickup` / `pickup.html`)**:
  - Doorstep pickup booking across Indian metro and tier-2 PIN codes with instant `TRISYS-PKP-*` reference generation and live pickup status lookup.
- **Real-Time Shipment Tracking (`/track` / `track.html`)**:
  - Unified tracking lookup supporting Airway Bills (`TRX*`), Pickup References (`TRISYS-PKP-*`), and Quote References (`TRISYS-QTE-*`) with full scan activity timelines.
- **Business Solutions (`/business-solutions` / `business-solutions.html`)**:
  - **Volume Discounts** (Tier 1–4 live volume bracket preview & `TRISYS-VOL-*` registration).
  - **E-commerce Integrations** (Shopify, WooCommerce, Amazon Global, custom REST API/webhook setup).
  - **Dedicated Account Manager** & **Credit / Consolidated GST Billing** applications.
  - **Business Account Portal** (Registration, Login, and Application Status checker).
- **24/7 Help & Compliance Centre (`/help` / `help.html`)**:
  - Searchable FAQs, downloadable customs & KYC templates (Commercial Invoice, Proforma, Packing List, Medicine Rx Declaration, Shipper's Letter of Instruction), and live support ticket submission (`TRISYS-SUP-*`).

### 2. Admin Dashboard (`/admin` / `admin.html`)
- **Executive Overview (`/admin`)**:
  - Live KPI cards (**Total Shipments**, **In Transit**, **Delivered**, **Pending Pickup**).
  - **Shipment Status Overview** interactive multi-period SVG line chart (**Last 7 Days**, **Last 30 Days**, **Last 6 Months**).
  - **Shipments by Country** donut chart with corridor breakdown.
  - **Recent Bookings**, **Latest Shipments** management table, **Top Destination Countries**, **Shipment Types**, **Revenue Overview**, and **Courier Partner Performance**.
- **Operations & Management Modules**:
  - **Shipments (`/admin/shipments`)**: All shipments, create new shipment, pending/in-transit/delivered/cancelled filters, and CSV export.
  - **Tracking (`/admin/tracking`)**: Live consignment lookup, scan event logger, and delivery status log.
  - **Bookings (`/admin/bookings`)**: Unified pickup bookings, quote requests, and B2B enquiries with courier assignment workflow.
  - **Customers (`/admin/customers`)**: Shipper directory, shipment history, and B2B account approval workflow.
  - **Rates & Pricing (`/admin/rates`, `/admin/pricing/*`)**: Country rate matrix, weight/volumetric rules, additional surcharges, and rate plans.
  - **Courier Partners (`/admin/partners`)**: Carrier performance, SLA tracking, and partner configuration.
  - **Countries & Cities (`/admin/locations/*`)**: Serviceable destination countries, Indian pickup cities, gateway hubs, and **Instant Origin PIN & Destination ZIP / Country Coverage Checker**.
  - **Reports (`/admin/reports`)**: Operational & financial analytics with CSV export.
  - **CMS / Pages (`/admin/cms`) & Blog (`/admin/blog`)**: Manage website routes, SEO metadata, publish/unpublish states, and logistics articles.
  - **Settings (`/admin/settings/*`)**: General, Notifications, Payment/Tax, Carrier APIs, and Role Permissions.

### 3. Responsive Design Across All Devices
- Optimized for **Mobile** (`320px`, `375px`, `393px`, `430px`), **Tablet / iPad** (`768px`, `820px`, `1024px`), **Laptop** (`1150px`), and **Desktop** (`1440px+`).
- Side-by-side hero layout and 2-column card grids preserved on mobile viewports.
- Full-height collapsible sidebar drawer, horizontally scrollable data tables, and overflow-safe form grids on the Admin Dashboard.

---

## Project Structure

```text
Trisys/
├── index.html                # Main landing page & multi-tab shipping widget
├── quote.html                # Dedicated quote & service-specific calculator page
├── quote-result.html         # Dynamic quote result & service route view
├── rates.html                # International shipping rates & corridor comparison
├── pickup.html               # Doorstep pickup scheduling & status lookup
├── track.html                # Real-time AWB, pickup, and quote tracking page
├── business-solutions.html   # B2B logistics, volume discounts, integrations & account portal
├── help.html                 # FAQs, customs/KYC document centre & support desk
├── admin.html                # Admin Dashboard UI shell & responsive styles
├── admin.js                  # Admin Dashboard SPA router, charts, CRUD & state logic
├── styles.css                # Shared customer site design system & responsive CSS
├── script.js                 # Shared customer site interactivity, calculators & API client
├── server.py                 # Python HTTP & REST API server with clean URL routing
├── assets/                   # Brand logos, hero illustrations & service icons
└── data/                     # Persistent JSON data store (shipments, quotes, pickups, admin store)
```

---

## Getting Started (Local Deployment)

### Prerequisites
- **Python 3.8+** (uses standard library modules only — no external `pip` packages required).

### Run the Server
```bash
# Default port (8000) or specify PORT=8080
PORT=8080 python server.py
```

On Windows PowerShell:
```powershell
$env:PORT=8080; python server.py
```

### Local URLs
- **Customer Website**: `http://localhost:8080/`
- **Get a Quote**: `http://localhost:8080/quote`
- **Find Rates**: `http://localhost:8080/rates`
- **Schedule Pickup**: `http://localhost:8080/schedule-pickup`
- **Track Shipment**: `http://localhost:8080/track`
- **Business Solutions**: `http://localhost:8080/business-solutions`
- **Help & Customs Centre**: `http://localhost:8080/help`
- **Admin Dashboard**: `http://localhost:8080/admin`

---

## Key REST API Endpoints (`server.py`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/config` | Runtime configuration & live rate engine status |
| `GET` | `/api/rates` | Calculate live zone tariffs, fuel surcharge, clearance fees & volumetric weight |
| `GET` | `/api/track?awb=...` | Look up shipment, pickup (`TRISYS-PKP-*`), or quote (`TRISYS-QTE-*`) status & events |
| `POST` | `/api/quotes` | Save a customer shipping quote request (`TRISYS-QTE-*`) |
| `POST` | `/api/pickups` | Schedule a doorstep pickup request (`TRISYS-PKP-*`) |
| `GET` | `/api/pickups/status?ref=...` | Retrieve real-time pickup booking status |
| `POST` | `/api/service-enquiry` | Submit E-commerce Fulfilment or Bulk Cargo quotation request |
| `POST` | `/api/business/*` | Submit Volume Discount, Integration, Account Manager, Credit, or Registration forms |
| `POST` | `/api/support-enquiry` | Log a 24/7 customer support ticket (`TRISYS-SUP-*`) |
| `GET` | `/api/admin/state` | Fetch complete Admin Dashboard operational store, KPIs, and customer submissions |
| `GET` | `/api/admin/search?q=...` | Unified backend search across shipments, bookings, customers, rates, partners, and locations |
| `POST` | `/api/admin/action` | Persist Admin Dashboard mutations (create/update shipments, rules, surcharges, CMS, settings) |
