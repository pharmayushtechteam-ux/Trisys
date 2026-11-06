"""Local development server for Trisys Express with clean route, service enquiry,
business solutions, business account registration, and admin review API support.

Supports clean page routes:
  /                               -> index.html
  /quote-result, /quote           -> quote-result.html
  /medicine-courier, /medicine    -> quote-result.html?type=medicine
  /ecommerce-logistics, /ecommerce-> quote-result.html?type=ecommerce
  /bulk-commercial, /bulk         -> quote-result.html?type=bulk
  /document-courier, /document    -> quote-result.html?type=document
  /parcel-shipping, /parcel       -> quote-result.html?type=parcel
  /other-services, /other         -> quote-result.html?type=other
  /track                          -> track.html
  /schedule-pickup, /pickup       -> pickup.html
  /rates                          -> rates.html
  /business-solutions             -> business-solutions.html
  /business/volume-discounts      -> business-solutions.html?section=volume-discounts
  /volume-discounts               -> business-solutions.html?section=volume-discounts
  /business/ecommerce-integrations-> business-solutions.html?section=ecommerce-integrations
  /ecommerce-integrations         -> business-solutions.html?section=ecommerce-integrations
  /business/account-manager       -> business-solutions.html?section=account-manager
  /account-manager                -> business-solutions.html?section=account-manager
  /business/credit-billing        -> business-solutions.html?section=credit-billing
  /credit-billing                 -> business-solutions.html?section=credit-billing
  /business/register              -> business-solutions.html?section=register
  /open-business-account          -> business-solutions.html?section=register
  /business/admin                 -> business-solutions.html?section=admin

Supports API endpoints:
  POST /api/service-enquiry             -> validate & save E-commerce or Bulk cargo enquiry
  POST /api/business/volume-discount    -> validate & save Volume Discounts pricing request
  POST /api/business/integration-request-> validate & save E-commerce Integration setup request
  POST /api/business/account-manager    -> validate & save Dedicated Account Manager enquiry
  POST /api/business/credit-application -> validate & save Credit & Monthly Billing application
  POST /api/business/register           -> validate & create Business Account application (Pending)
  POST /api/business/login              -> authenticate registered business user & return status
  GET  /api/business/application-status -> check status by referenceId + email
  GET  /api/admin/business-submissions  -> list all submissions (requires X-Admin-Key header)
  POST /api/admin/update-status         -> update status (Pending / Under Review / Approved / Rejected)
"""
import datetime
import hashlib
import hmac
import http.server
import json
import os
import re
import secrets
import socketserver
import urllib.parse
import uuid

PORT = int(os.environ.get("PORT", 8000))
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
ENQUIRIES_FILE = os.path.join(DATA_DIR, "service_enquiries.json")
BUSINESS_RECORDS_FILE = os.path.join(DATA_DIR, "business_records.json")
BUSINESS_ACCOUNTS_FILE = os.path.join(DATA_DIR, "business_accounts.json")
SUPPORT_ENQUIRIES_FILE = os.path.join(DATA_DIR, "support_enquiries.json")
CUSTOMS_DOCS_FILE = os.path.join(DATA_DIR, "customs_documents.json")
PICKUPS_FILE = os.path.join(DATA_DIR, "pickups.json")
QUOTES_FILE = os.path.join(DATA_DIR, "quotes.json")
ADMIN_STORE_FILE = os.path.join(DATA_DIR, "admin_store.json")

ADMIN_PASSCODE = os.environ.get("TRISYS_ADMIN_PASSCODE", "TRISYS-ADMIN-2026")
PUBLIC_BASE_URL = os.environ.get("TRISYS_PUBLIC_BASE_URL", "").strip().rstrip("/")
CARRIER_API_KEY = os.environ.get("TRISYS_CARRIER_API_KEY", "TRISYS-LIVE-CARRIER-2026").strip()
SMTP_HOST = os.environ.get("TRISYS_SMTP_HOST", "").strip()
ALLOWED_STATUSES = (
    "Pending",
    "Under Review",
    "Approved",
    "Rejected",
    "Open",
    "Resolved",
    "Scheduled — Pending Courier Assignment",
    "Courier Assigned",
    "Picked Up",
    "In Transit",
    "Delivered",
    "Cancelled",
)

PACKAGE_RULES = {
    "document": {
        "label": "Document",
        "maxWeightKg": 5.0,
        "volumetricDivisor": 5000.0,
        "ruleNote": "Non-negotiable documents, legal contracts, academic transcripts & certificates (max 5 kg / 11 lb per envelope).",
    },
    "parcel": {
        "label": "Parcel",
        "maxWeightKg": 70.0,
        "volumetricDivisor": 5000.0,
        "ruleNote": "Personal gifts, excess baggage & commercial samples (max 70 kg / 154 lb per piece; volumetric L × W × H ÷ 5000).",
    },
    "medicine": {
        "label": "Medicine",
        "maxWeightKg": 70.0,
        "volumetricDivisor": 5000.0,
        "ruleNote": "Prescription & OTC pharmaceuticals up to 90-day personal supply (requires doctor's prescription & pharmacy invoice).",
    },
    "ecommerce": {
        "label": "E-commerce",
        "maxWeightKg": 70.0,
        "volumetricDivisor": 5000.0,
        "ruleNote": "Cross-border D2C store parcels & CSB-V exports (max 70 kg per parcel; volumetric L × W × H ÷ 5000).",
    },
    "bulk": {
        "label": "Bulk & Cargo",
        "maxWeightKg": 5000.0,
        "volumetricDivisor": 6000.0,
        "ruleNote": "Palletized B2B commercial cargo, skids & master cartons (up to 5,000 kg; air cargo volumetric L × W × H ÷ 6000).",
    },
    "other": {
        "label": "Other",
        "maxWeightKg": 100.0,
        "volumetricDivisor": 5000.0,
        "ruleNote": "Specialized, fragile, or custom-classified consignments (up to 100 kg; subject to compliance review).",
    },
}


def normalize_package_type(raw_type: str) -> str:
    val = str(raw_type or "document").strip().lower()
    if val in ("bulk_cargo", "bulkcargo", "commercial", "cargo"):
        return "bulk"
    if val in ("e-commerce", "ecom"):
        return "ecommerce"
    return val


def calculate_corridor_service_tiers(destination: str, pkg_type: str, chargeable_kg: float):
    dest_lower = (destination or "").lower()
    if any(k in dest_lower for k in ("arab emirates", "uae", "saudi", "qatar", "kuwait", "oman")):
        zone_label = "Zone A (Middle East)"
        zone_mult = 0.72
    elif any(k in dest_lower for k in ("singapore", "malaysia")):
        zone_label = "Zone B (Southeast Asia)"
        zone_mult = 0.78
    elif any(k in dest_lower for k in ("united kingdom", "uk", "germany", "france", "netherlands", "italy", "ireland", "spain")):
        zone_label = "Zone C (UK & Europe)"
        zone_mult = 0.92
    elif any(k in dest_lower for k in ("japan",)):
        zone_label = "Zone E (East Asia)"
        zone_mult = 0.96
    elif any(k in dest_lower for k in ("australia", "new zealand")):
        zone_label = "Zone F (Oceania)"
        zone_mult = 1.08
    else:
        zone_label = "Zone D (North America & Global)"
        zone_mult = 1.00

    cat_adjustments = {
        "document": (0.85, 250),
        "parcel": (1.00, 350),
        "medicine": (1.12, 650),
        "ecommerce": (0.94, 850),
        "bulk": (0.76, 1450),
        "other": (1.05, 500),
    }
    cat_mult, clearance_fee_inr = cat_adjustments.get(pkg_type, (1.00, 350))

    def build_tier_pricing(base_inr_per_kg: float) -> dict:
        rate_per_kg = round(base_inr_per_kg * zone_mult * cat_mult)
        base_freight = round(chargeable_kg * rate_per_kg)
        fuel_surcharge = round(base_freight * 0.145)
        total_inr = base_freight + fuel_surcharge + clearance_fee_inr
        return {
            "ratePerKgInr": rate_per_kg,
            "baseFreightInr": base_freight,
            "fuelSurchargeInr": fuel_surcharge,
            "clearanceFeeInr": clearance_fee_inr,
            "estimatedInr": total_inr,
        }

    nfo_pricing = build_tier_pricing(2450)
    exp_pricing = build_tier_pricing(1650)
    eco_pricing = build_tier_pricing(1120)

    service_tiers = [
        {
            "tierId": "nfo",
            "name": "Next Flight Out (Priority Air)",
            "carrier": "DHL Express / FedEx Priority",
            "transitTime": "2–3 Business Days",
            "pickupMode": "Same-Day Doorstep Collection",
            "trackingLevel": "Real-Time Milestone & Hub Scans",
            "customsClearance": "Priority Export / Express Clearance",
            "chargeableWeightKg": chargeable_kg,
            "priceDisplay": f"₹ {nfo_pricing['estimatedInr']:,}",
            "rateStatus": "Live Tariff Active",
            **nfo_pricing,
        },
        {
            "tierId": "express",
            "name": "Express Air Saver",
            "carrier": "DHL Express / Aramex",
            "transitTime": "3–5 Business Days",
            "pickupMode": "Free Doorstep Pickup",
            "trackingLevel": "End-to-End AWB Tracking",
            "customsClearance": (
                "CSB-V / DDU & DDP Store Clearance"
                if pkg_type == "ecommerce"
                else (
                    "Prescription & Pharmacy Invoice Clearance"
                    if pkg_type == "medicine"
                    else "Standard DDU / DDP Clearance"
                )
            ),
            "chargeableWeightKg": chargeable_kg,
            "priceDisplay": f"₹ {exp_pricing['estimatedInr']:,}",
            "rateStatus": "Live Tariff Active",
            **exp_pricing,
        },
        {
            "tierId": "economy",
            "name": (
                "Consolidated B2B Air Freight"
                if pkg_type == "bulk"
                else (
                    "Tracked Economy e-Packet"
                    if pkg_type == "ecommerce"
                    else "Economy Air Courier"
                )
            ),
            "carrier": "UPS Worldwide / FedEx Economy",
            "transitTime": "6–9 Business Days",
            "pickupMode": "Scheduled Doorstep / Dock Pickup",
            "trackingLevel": "Milestone Tracking & Delivery Confirmation",
            "customsClearance": (
                "Commercial Shipping Bill / LUT / BOE"
                if pkg_type == "bulk"
                else "Consolidated Customs Clearance"
            ),
            "chargeableWeightKg": chargeable_kg,
            "priceDisplay": f"₹ {eco_pricing['estimatedInr']:,}",
            "rateStatus": "Live Tariff Active",
            **eco_pricing,
        },
    ]
    return zone_label, service_tiers


ROUTE_MAP = {
    "/": "/index.html",
    "/quote-result": "/quote-result.html",
    "/quote": "/quote-result.html",
    "/medicine-courier": "/quote-result.html?type=medicine",
    "/medicine": "/quote-result.html?type=medicine",
    "/ecommerce-logistics": "/quote-result.html?type=ecommerce",
    "/ecommerce": "/quote-result.html?type=ecommerce",
    "/bulk-commercial": "/quote-result.html?type=bulk",
    "/bulk": "/quote-result.html?type=bulk",
    "/document-courier": "/quote-result.html?type=document",
    "/document": "/quote-result.html?type=document",
    "/parcel-shipping": "/quote-result.html?type=parcel",
    "/parcel": "/quote-result.html?type=parcel",
    "/other-services": "/quote-result.html?type=other",
    "/specialized-cargo": "/quote-result.html?type=other",
    "/other": "/quote-result.html?type=other",
    "/track": "/track.html",
    "/schedule-pickup": "/pickup.html",
    "/pickup": "/pickup.html",
    "/rates": "/rates.html",
    "/business-solutions": "/business-solutions.html",
    "/business": "/business-solutions.html",
    "/business/volume-discounts": "/business-solutions.html?section=volume-discounts",
    "/volume-discounts": "/business-solutions.html?section=volume-discounts",
    "/business/ecommerce-integrations": "/business-solutions.html?section=ecommerce-integrations",
    "/ecommerce-integrations": "/business-solutions.html?section=ecommerce-integrations",
    "/business/account-manager": "/business-solutions.html?section=account-manager",
    "/account-manager": "/business-solutions.html?section=account-manager",
    "/dedicated-account-manager": "/business-solutions.html?section=account-manager",
    "/business/credit-billing": "/business-solutions.html?section=credit-billing",
    "/credit-billing": "/business-solutions.html?section=credit-billing",
    "/credit-monthly-billing": "/business-solutions.html?section=credit-billing",
    "/business/register": "/business-solutions.html?section=register",
    "/open-business-account": "/business-solutions.html?section=register",
    "/business-account": "/business-solutions.html?section=register",
    "/admin": "/admin.html",
    "/dashboard": "/admin.html",
    "/admin-dashboard": "/admin.html",
    "/business/admin": "/admin.html",
    "/admin/business": "/business-solutions.html?section=admin",
    "/help": "/help.html",
    "/help-centre": "/help.html",
    "/help/faqs": "/help.html?section=faqs",
    "/faqs": "/help.html?section=faqs",
    "/faq": "/help.html?section=faqs",
    "/help/customs-documents": "/help.html?section=customs",
    "/customs-documents": "/help.html?section=customs",
    "/customs": "/help.html?section=customs",
    "/help/contact-support": "/help.html?section=contact",
    "/contact-support": "/help.html?section=contact",
    "/support": "/help.html?section=contact",
    "/contact": "/help.html?section=contact",
}


def _load_json_list(filepath):
    if not os.path.isfile(filepath):
        return []
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except Exception:
        return []


def _save_json_list(filepath, records):
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2, ensure_ascii=False)


def load_enquiries():
    return _load_json_list(ENQUIRIES_FILE)


def save_enquiry(record):
    records = load_enquiries()
    records.append(record)
    _save_json_list(ENQUIRIES_FILE, records)


def load_business_records():
    return _load_json_list(BUSINESS_RECORDS_FILE)


def save_business_record(record):
    records = load_business_records()
    records.append(record)
    _save_json_list(BUSINESS_RECORDS_FILE, records)


def load_business_accounts():
    return _load_json_list(BUSINESS_ACCOUNTS_FILE)


def save_business_account(account):
    accounts = load_business_accounts()
    accounts.append(account)
    _save_json_list(BUSINESS_ACCOUNTS_FILE, accounts)


def load_support_enquiries():
    return _load_json_list(SUPPORT_ENQUIRIES_FILE)


def save_support_enquiry(record):
    records = load_support_enquiries()
    records.append(record)
    _save_json_list(SUPPORT_ENQUIRIES_FILE, records)


def load_customs_docs():
    return _load_json_list(CUSTOMS_DOCS_FILE)


def save_customs_doc(record):
    records = load_customs_docs()
    records.append(record)
    _save_json_list(CUSTOMS_DOCS_FILE, records)


def load_pickups():
    return _load_json_list(PICKUPS_FILE)


def save_pickup(record):
    records = load_pickups()
    records.append(record)
    _save_json_list(PICKUPS_FILE, records)


def load_quotes():
    return _load_json_list(QUOTES_FILE)


def save_quote(record):
    records = load_quotes()
    records.append(record)
    _save_json_list(QUOTES_FILE, records)


DEFAULT_ADMIN_STORE = {
    "shipments": [
        {
            "trackingNo": "TRX123456789",
            "date": "13 Oct 2026",
            "createdAt": "2026-10-13T10:12:00Z",
            "updatedAt": "2026-10-13T10:12:00Z",
            "customer": "Arun DM",
            "email": "arun.dm@example.com",
            "phone": "+91 98201 11223",
            "fromCode": "IN",
            "fromCountry": "India",
            "fromCity": "Mumbai, MH",
            "toCode": "US",
            "toCountry": "USA",
            "toCity": "New York, NY",
            "type": "Document",
            "weight": "1.0 kg",
            "weightKg": 1.0,
            "carrier": "DHL",
            "amountInr": 3450,
            "status": "Booked",
            "timeAgo": "2 min ago",
            "events": [
                {"timestamp": "2026-10-13 10:12", "status": "Booked", "location": "Mumbai Hub, India", "description": "Shipment booked and AWB generated (DHL Express Saver)."}
            ]
        },
        {
            "trackingNo": "TRX123456788",
            "date": "13 Oct 2026",
            "createdAt": "2026-10-13T09:58:00Z",
            "updatedAt": "2026-10-13T10:05:00Z",
            "customer": "John Smith",
            "email": "john.smith@ukmail.co.uk",
            "phone": "+44 7700 900077",
            "fromCode": "IN",
            "fromCountry": "India",
            "fromCity": "Bengaluru, KA",
            "toCode": "GB",
            "toCountry": "UK",
            "toCity": "London",
            "type": "Medicine",
            "weight": "2.5 kg",
            "weightKg": 2.5,
            "carrier": "FedEx",
            "amountInr": 6890,
            "status": "In Transit",
            "timeAgo": "15 min ago",
            "events": [
                {"timestamp": "2026-10-13 08:30", "status": "Booked", "location": "Bengaluru, India", "description": "Prescription & pharmacy invoice verified for export."},
                {"timestamp": "2026-10-13 10:05", "status": "In Transit", "location": "Bengaluru Intl Airport (BLR)", "description": "Cleared export customs; uplifted on flight to London Heathrow (LHR)."}
            ]
        },
        {
            "trackingNo": "TRX123456787",
            "date": "12 Oct 2026",
            "createdAt": "2026-10-12T14:20:00Z",
            "updatedAt": "2026-10-13T09:40:00Z",
            "customer": "Sarah Wilson",
            "email": "sarah.wilson@auspost.au",
            "phone": "+61 412 345 678",
            "fromCode": "IN",
            "fromCountry": "India",
            "fromCity": "Chennai, TN",
            "toCode": "AU",
            "toCountry": "Australia",
            "toCity": "Sydney, NSW",
            "type": "Parcel",
            "weight": "3.0 kg",
            "weightKg": 3.0,
            "carrier": "DHL",
            "amountInr": 7920,
            "status": "Delivered",
            "timeAgo": "32 min ago",
            "events": [
                {"timestamp": "2026-10-10 11:00", "status": "Booked", "location": "Chennai, India", "description": "Parcel picked up from sender doorstep."},
                {"timestamp": "2026-10-11 04:15", "status": "In Transit", "location": "Singapore Transit Hub", "description": "Arrived at regional sort facility."},
                {"timestamp": "2026-10-12 16:40", "status": "Delivered", "location": "Sydney, Australia", "description": "Delivered to consignee — signed by S. WILSON."}
            ]
        },
        {
            "trackingNo": "TRX123456786",
            "date": "12 Oct 2026",
            "createdAt": "2026-10-12T11:10:00Z",
            "updatedAt": "2026-10-12T18:30:00Z",
            "customer": "Adil Khan",
            "email": "adil.khan@torontomed.ca",
            "phone": "+1 416 555 0192",
            "fromCode": "IN",
            "fromCountry": "India",
            "fromCity": "Hyderabad, TS",
            "toCode": "CA",
            "toCountry": "Canada",
            "toCity": "Toronto, ON",
            "type": "Medicine",
            "weight": "1.2 kg",
            "weightKg": 1.2,
            "carrier": "UPS",
            "amountInr": 4950,
            "status": "In Transit",
            "timeAgo": "1 hour ago",
            "events": [
                {"timestamp": "2026-10-12 11:10", "status": "Booked", "location": "Hyderabad, India", "description": "Doorstep pickup completed; KYC & Rx validated."},
                {"timestamp": "2026-10-12 18:30", "status": "In Transit", "location": "Hyderabad Air Cargo Complex", "description": "Dispatched via UPS Worldwide Express to Toronto (YYZ)."}
            ]
        },
        {
            "trackingNo": "TRX123456785",
            "date": "12 Oct 2026",
            "createdAt": "2026-10-12T09:05:00Z",
            "updatedAt": "2026-10-12T09:05:00Z",
            "customer": "Priya Nair",
            "email": "priya.nair@emiratesbiz.ae",
            "phone": "+971 50 443 9981",
            "fromCode": "IN",
            "fromCountry": "India",
            "fromCity": "Kochi, KL",
            "toCode": "AE",
            "toCountry": "UAE",
            "toCity": "Dubai",
            "type": "Document",
            "weight": "0.8 kg",
            "weightKg": 0.8,
            "carrier": "Aramex",
            "amountInr": 2180,
            "status": "Pending",
            "timeAgo": "2 hours ago",
            "events": [
                {"timestamp": "2026-10-12 09:05", "status": "Pending", "location": "Kochi, India", "description": "Awaiting sender KYC verification prior to dispatch."}
            ]
        },
        {
            "trackingNo": "TRX123456784",
            "date": "11 Oct 2026",
            "createdAt": "2026-10-11T15:20:00Z",
            "updatedAt": "2026-10-11T19:00:00Z",
            "customer": "Rohan Deshmukh",
            "email": "rohan.d@decargo.de",
            "phone": "+91 98111 22334",
            "fromCode": "IN",
            "fromCountry": "India",
            "fromCity": "Pune, MH",
            "toCode": "DE",
            "toCountry": "Germany",
            "toCity": "Frankfurt",
            "type": "Parcel",
            "weight": "4.5 kg",
            "weightKg": 4.5,
            "carrier": "DHL",
            "amountInr": 8900,
            "status": "Cancelled",
            "timeAgo": "1 day ago",
            "events": [
                {"timestamp": "2026-10-11 15:20", "status": "Booked", "location": "Pune, India", "description": "Booking created by shipper."},
                {"timestamp": "2026-10-11 19:00", "status": "Cancelled", "location": "Pune, India", "description": "Cancelled at shipper request prior to pickup."}
            ]
        }
    ],
    "partners": [
        {"id": "PRT-DHL", "code": "DHL", "name": "DHL Express Worldwide", "shipments": 340, "onTimePct": 98, "enabled": True, "serviceZones": "North America, Europe, Asia-Pacific, Middle East", "contactEmail": "india.desk@dhl.com", "apiStatus": "Connected (EDI / XML)"},
        {"id": "PRT-FEDEX", "code": "FedEx", "name": "FedEx International Priority", "shipments": 280, "onTimePct": 97, "enabled": True, "serviceZones": "USA, Canada, UK, Europe, Far East", "contactEmail": "export.in@fedex.com", "apiStatus": "Connected (REST v3)"},
        {"id": "PRT-ARAMEX", "code": "Aramex", "name": "Aramex GCC & MENA Express", "shipments": 190, "onTimePct": 96, "enabled": True, "serviceZones": "UAE, Saudi Arabia, Qatar, Kuwait, Oman", "contactEmail": "b2b.india@aramex.com", "apiStatus": "Connected"},
        {"id": "PRT-UPS", "code": "UPS", "name": "UPS Worldwide Expedited", "shipments": 120, "onTimePct": 95, "enabled": True, "serviceZones": "North America, EU Commercial Corridors", "contactEmail": "airfreight.in@ups.com", "apiStatus": "Connected"},
        {"id": "PRT-OTHERS", "code": "Others", "name": "Regional & Postal Linehaul Partners", "shipments": 60, "onTimePct": 92, "enabled": True, "serviceZones": "Rest of World (200+ Countries)", "contactEmail": "network@trisysexpress.com", "apiStatus": "Manual Manifest"}
    ],
    "additionalCharges": [
        {"id": "CHG-FUEL", "name": "Aviation Fuel Surcharge (FSC)", "type": "Percentage", "amount": "14.5%", "appliesTo": "All International Air Tiers", "active": True},
        {"id": "CHG-MED", "name": "Prescription Medicine Compliance & Cold-Pack Handling", "type": "Flat Fee", "amount": "₹ 650", "appliesTo": "Medicine Courier (Rx)", "active": True},
        {"id": "CHG-REMOTE", "name": "Out-of-Delivery-Area (ODA) / Remote Pin Surcharge", "type": "Per Kg / Min", "amount": "₹ 35/kg (Min ₹ 1,200)", "appliesTo": "Remote Postal Codes", "active": True},
        {"id": "CHG-CSBV", "name": "CSB-V Commercial Export Filing & AD Code Clearance", "type": "Flat Fee", "amount": "₹ 850", "appliesTo": "E-commerce & Commercial Exports", "active": True},
        {"id": "CHG-SEC", "name": "X-Ray Aviation Security & Cargo Screening", "type": "Flat Fee", "amount": "₹ 350", "appliesTo": "All Parcel & Cargo Consignments", "active": True},
        {"id": "CHG-DDP", "name": "Delivered Duty Paid (DDP) Customs Brokerage", "type": "Flat Fee", "amount": "₹ 1,250", "appliesTo": "DDP Commercial & D2C Shipments", "active": True},
        {"id": "CHG-OVERSIZE", "name": "Non-Standard / Oversize Piece Handling (> 120 cm)", "type": "Flat Fee", "amount": "₹ 1,800", "appliesTo": "Oversized Cartons & Crates", "active": True},
        {"id": "CHG-BOE", "name": "Commercial Shipping Bill & LUT Export Documentation", "type": "Flat Fee", "amount": "₹ 1,450", "appliesTo": "Bulk & B2B Air Freight", "active": True}
    ],
    "ratePlans": [
        {"id": "PLAN-NFO", "name": "Next Flight Out (Priority Air)", "transit": "2–3 Business Days", "baseInrPerKg": 2450, "minWeightKg": 0.5, "maxWeightKg": 70, "carrier": "DHL / FedEx Priority", "status": "Active"},
        {"id": "PLAN-EXP", "name": "Express Air Saver", "transit": "3–5 Business Days", "baseInrPerKg": 1650, "minWeightKg": 0.5, "maxWeightKg": 70, "carrier": "DHL / FedEx / UPS", "status": "Active"},
        {"id": "PLAN-ECO", "name": "Economy Air Courier", "transit": "6–9 Business Days", "baseInrPerKg": 1120, "minWeightKg": 1.0, "maxWeightKg": 70, "carrier": "Aramex / UPS Economy", "status": "Active"},
        {"id": "PLAN-BULK", "name": "Consolidated B2B Air Freight", "transit": "5–8 Business Days", "baseInrPerKg": 680, "minWeightKg": 25.0, "maxWeightKg": 5000, "carrier": "Commercial Air Cargo", "status": "Active"},
        {"id": "PLAN-DOC", "name": "Global Document Envelope Express", "transit": "2–4 Business Days", "baseInrPerKg": 1480, "minWeightKg": 0.5, "maxWeightKg": 5, "carrier": "DHL Express Envelope", "status": "Active"},
        {"id": "PLAN-MED", "name": "Rx Pharma Priority Cold-Chain", "transit": "2–4 Business Days", "baseInrPerKg": 1980, "minWeightKg": 0.5, "maxWeightKg": 70, "carrier": "DHL Medical Express / FedEx", "status": "Active"},
        {"id": "PLAN-ECOM", "name": "Cross-Border D2C CSB-V e-Packet", "transit": "4–7 Business Days", "baseInrPerKg": 1290, "minWeightKg": 0.5, "maxWeightKg": 30, "carrier": "Aramex / DHL eCommerce", "status": "Active"},
        {"id": "PLAN-GCC", "name": "GCC & Middle East Direct Linehaul", "transit": "2–3 Business Days", "baseInrPerKg": 1180, "minWeightKg": 0.5, "maxWeightKg": 70, "carrier": "Aramex Direct / DHL GCC", "status": "Active"}
    ],
    "locations": {
        "countries": [
            {"code": "US", "name": "United States", "zone": "Zone D — North America", "transitDays": "3–4 Days", "customsMode": "De Minimis $800 / Formal", "serviceable": True, "shipmentsCount": 350},
            {"code": "GB", "name": "United Kingdom", "zone": "Zone C — UK & Europe", "transitDays": "3–4 Days", "customsMode": "UK HMRC EORI / DDU & DDP", "serviceable": True, "shipmentsCount": 225},
            {"code": "AU", "name": "Australia", "zone": "Zone F — Oceania", "transitDays": "4–5 Days", "customsMode": "ABF Biosecurity & GST", "serviceable": True, "shipmentsCount": 180},
            {"code": "CA", "name": "Canada", "zone": "Zone D — North America", "transitDays": "3–5 Days", "customsMode": "CBSA Commercial / Personal", "serviceable": True, "shipmentsCount": 120},
            {"code": "AE", "name": "United Arab Emirates", "zone": "Zone A — Middle East", "transitDays": "2–3 Days", "customsMode": "Dubai Customs Direct", "serviceable": True, "shipmentsCount": 98},
            {"code": "DE", "name": "Germany", "zone": "Zone C — UK & Europe", "transitDays": "3–5 Days", "customsMode": "EU ICS2 / ATLAS Clearance", "serviceable": True, "shipmentsCount": 86},
            {"code": "SG", "name": "Singapore", "zone": "Zone B — Southeast Asia", "transitDays": "2–3 Days", "customsMode": "SG TradeNet Direct", "serviceable": True, "shipmentsCount": 64},
            {"code": "SA", "name": "Saudi Arabia", "zone": "Zone A — Middle East", "transitDays": "3–4 Days", "customsMode": "ZATCA FASAH Clearance", "serviceable": True, "shipmentsCount": 58},
            {"code": "FR", "name": "France", "zone": "Zone C — UK & Europe", "transitDays": "3–5 Days", "customsMode": "EU ICS2 / Delta G", "serviceable": True, "shipmentsCount": 49},
            {"code": "JP", "name": "Japan", "zone": "Zone E — East Asia", "transitDays": "3–5 Days", "customsMode": "NACCS Express Clearance", "serviceable": True, "shipmentsCount": 42}
        ],
        "regions": [
            {"code": "IN-WEST", "name": "Western India Export Hub", "state": "Maharashtra & Goa", "gatewayAirport": "BOM (Mumbai CSIA)", "dailyCutoff": "19:30 IST", "active": True},
            {"code": "IN-SOUTH", "name": "Southern India Export Hub", "state": "Karnataka & Tamil Nadu", "gatewayAirport": "BLR (Kempegowda) / MAA (Chennai)", "dailyCutoff": "19:00 IST", "active": True},
            {"code": "IN-NORTH", "name": "Northern India Export Hub", "state": "Delhi NCR, Haryana, UP", "gatewayAirport": "DEL (IGI Cargo Terminal)", "dailyCutoff": "20:00 IST", "active": True},
            {"code": "IN-EAST", "name": "Eastern India Export Hub", "state": "West Bengal & Northeast", "gatewayAirport": "CCU (Kolkata NSCBI)", "dailyCutoff": "18:00 IST", "active": True},
            {"code": "IN-GUJ", "name": "Gujarat Pharma & Textile Corridor", "state": "Gujarat (Ahmedabad, Surat, Vadodara)", "gatewayAirport": "AMD (SVPI Air Cargo)", "dailyCutoff": "18:45 IST", "active": True},
            {"code": "IN-DECCAN", "name": "Deccan Bulk & Pharma Gateway", "state": "Telangana & Andhra Pradesh", "gatewayAirport": "HYD (RGIA Pharma Zone)", "dailyCutoff": "19:15 IST", "active": True},
            {"code": "IN-KERALA", "name": "Malabar & GCC Direct Corridor", "state": "Kerala (Kochi, Trivandrum, Calicut)", "gatewayAirport": "COK (Cochin Intl Cargo)", "dailyCutoff": "18:30 IST", "active": True},
            {"code": "IN-NORTHWEST", "name": "Punjab & Rajasthan Export Zone", "state": "Punjab, Chandigarh, Rajasthan", "gatewayAirport": "ATQ / JAI / DEL Feeder", "dailyCutoff": "17:30 IST", "active": True}
        ],
        "cities": [
            {"city": "Mumbai", "state": "Maharashtra", "pinPrefix": "400xxx", "sameDayPickup": True, "hubCode": "BOM-HUB-01", "serviceable": True},
            {"city": "Bengaluru", "state": "Karnataka", "pinPrefix": "560xxx", "sameDayPickup": True, "hubCode": "BLR-HUB-01", "serviceable": True},
            {"city": "New Delhi / NCR", "state": "Delhi / Haryana / UP", "pinPrefix": "110xxx / 122xxx", "sameDayPickup": True, "hubCode": "DEL-HUB-01", "serviceable": True},
            {"city": "Chennai", "state": "Tamil Nadu", "pinPrefix": "600xxx", "sameDayPickup": True, "hubCode": "MAA-HUB-01", "serviceable": True},
            {"city": "Hyderabad", "state": "Telangana", "pinPrefix": "500xxx", "sameDayPickup": True, "hubCode": "HYD-HUB-01", "serviceable": True},
            {"city": "Ahmedabad", "state": "Gujarat", "pinPrefix": "380xxx", "sameDayPickup": True, "hubCode": "AMD-HUB-01", "serviceable": True},
            {"city": "Pune", "state": "Maharashtra", "pinPrefix": "411xxx", "sameDayPickup": True, "hubCode": "PNQ-HUB-01", "serviceable": True},
            {"city": "Kochi", "state": "Kerala", "pinPrefix": "682xxx", "sameDayPickup": True, "hubCode": "COK-HUB-01", "serviceable": True},
            {"city": "Kolkata", "state": "West Bengal", "pinPrefix": "700xxx", "sameDayPickup": True, "hubCode": "CCU-HUB-01", "serviceable": True},
            {"city": "Jaipur", "state": "Rajasthan", "pinPrefix": "302xxx", "sameDayPickup": True, "hubCode": "JAI-HUB-01", "serviceable": True}
        ],
        "coverageZones": [
            {"code": "ZONE-A", "zone": "Zone A — Middle East & GCC", "countries": "UAE, Saudi Arabia, Qatar, Kuwait, Oman, Bahrain", "transit": "2–3 Business Days", "customs": "GCC Direct / ZATCA / Dubai Customs", "carriers": "Aramex Direct / DHL Express", "coverage": "99.4% Doorstep", "active": True},
            {"code": "ZONE-B", "zone": "Zone B — Southeast Asia", "countries": "Singapore, Malaysia, Thailand, Vietnam, Indonesia", "transit": "2–4 Business Days", "customs": "ASEAN Express TradeNet", "carriers": "DHL Express / FedEx Priority", "coverage": "98.8% Doorstep", "active": True},
            {"code": "ZONE-C", "zone": "Zone C — UK & European Union", "countries": "UK, Germany, France, Netherlands, Italy, Ireland, Spain", "transit": "3–5 Business Days", "customs": "UK HMRC EORI / EU ICS2 ATLAS", "carriers": "DHL / FedEx / UPS", "coverage": "99.2% Doorstep", "active": True},
            {"code": "ZONE-D", "zone": "Zone D — North America", "countries": "United States (All 50 States), Canada (All Provinces)", "transit": "3–5 Business Days", "customs": "US CBP Section 321 ($800) / CBSA", "carriers": "FedEx Priority / DHL / UPS", "coverage": "99.6% Doorstep", "active": True},
            {"code": "ZONE-E", "zone": "Zone E — East Asia & Pacific Rim", "countries": "Japan, South Korea, Hong Kong SAR, Taiwan", "transit": "3–5 Business Days", "customs": "NACCS / UNIPASS Express", "carriers": "DHL Express / FedEx", "coverage": "98.5% Doorstep", "active": True},
            {"code": "ZONE-F", "zone": "Zone F — Oceania", "countries": "Australia, New Zealand, Fiji", "transit": "4–6 Business Days", "customs": "ABF Biosecurity / NZCS Direct", "carriers": "DHL Express / FedEx", "coverage": "98.9% Doorstep", "active": True},
            {"code": "ZONE-G", "zone": "Zone G — Africa & Indian Ocean", "countries": "South Africa, Kenya, Nigeria, Mauritius, Egypt", "transit": "4–7 Business Days", "customs": "Formal Commercial & DDU", "carriers": "DHL Global / Emirates SkyCargo", "coverage": "94.0% Metro & Regional", "active": True},
            {"code": "ZONE-H", "zone": "Zone H — Latin America", "countries": "Brazil, Mexico, Chile, Colombia, Argentina", "transit": "5–8 Business Days", "customs": "Formal Courier Import Regime", "carriers": "DHL Express / UPS Worldwide", "coverage": "92.5% Metro & Regional", "active": True}
        ]
    },
    "cmsPages": [
        {"id": "PAGE-HOME", "title": "Home — Global Shipping Made Simple", "slug": "/", "file": "index.html", "metaTitle": "TRISYS EXPRESS - Global Shipping Made Simple", "metaDescription": "Send parcels, documents and medicines from India to 200+ countries with fast, safe and reliable delivery.", "status": "Published", "updatedAt": "2026-10-27"},
        {"id": "PAGE-QUOTE", "title": "Instant International Quote & Booking", "slug": "/quote", "file": "quote-result.html", "metaTitle": "Get Instant International Courier Quote | TRISYS EXPRESS", "metaDescription": "Calculate chargeable weight and request verified door-to-door international shipping rates.", "status": "Published", "updatedAt": "2026-10-26"},
        {"id": "PAGE-TRACK", "title": "Live AWB & Reference Shipment Tracking", "slug": "/track", "file": "track.html", "metaTitle": "Track Your International Shipment | TRISYS EXPRESS", "metaDescription": "Real-time milestone tracking for Trisys Express shipments, doorstep pickups, and quotes.", "status": "Published", "updatedAt": "2026-10-26"},
        {"id": "PAGE-PICKUP", "title": "Schedule Free Doorstep Pickup", "slug": "/schedule-pickup", "file": "pickup.html", "metaTitle": "Schedule Doorstep Courier Pickup | TRISYS EXPRESS", "metaDescription": "Book same-day doorstep collection across major Indian cities with complimentary tamper-evident packaging.", "status": "Published", "updatedAt": "2026-10-26"},
        {"id": "PAGE-RATES", "title": "International Rate Lookup & Corridors", "slug": "/rates", "file": "rates.html", "metaTitle": "Find International Shipping Rates | TRISYS EXPRESS", "metaDescription": "Compare Economy, Express Air Saver, and Next Flight Out international shipping tiers.", "status": "Published", "updatedAt": "2026-10-27"},
        {"id": "PAGE-BIZ", "title": "Enterprise & B2B Business Solutions", "slug": "/business-solutions", "file": "business-solutions.html", "metaTitle": "Business Shipping Solutions & Corporate Accounts | TRISYS EXPRESS", "metaDescription": "Volume discounts, Shopify/WooCommerce integrations, dedicated account managers, and GST monthly billing.", "status": "Published", "updatedAt": "2026-10-26"},
        {"id": "PAGE-HELP", "title": "Help Centre, FAQs & Customs KYC Guide", "slug": "/help", "file": "help.html", "metaTitle": "Help Centre & Customs Documentation | TRISYS EXPRESS", "metaDescription": "Download commercial invoices, packing lists, and KYC checklists or contact 24/7 customer support.", "status": "Published", "updatedAt": "2026-10-26"}
    ],
    "blogPosts": [
        {"id": "BLOG-101", "title": "How to Ship Prescription Medicines from India to USA, UK & Canada Compliantly", "slug": "ship-prescription-medicines-from-india-guide", "category": "Medicine Courier", "tags": "Medicines, Customs, KYC, FDA, Prescription", "featuredImage": "/assets/card3_medicine.png", "status": "Published", "author": "Compliance Desk", "publishedAt": "10 Oct 2026", "excerpt": "Step-by-step documentation checklist for sending up to a 90-day personal supply of prescription medicines abroad with doctor's Rx and retail pharmacy invoice."},
        {"id": "BLOG-102", "title": "Understanding Volumetric Weight vs Actual Weight in International Air Courier", "slug": "volumetric-weight-calculation-air-courier", "category": "Shipping Guides", "tags": "Rates, Volumetric Weight, Packaging, Air Freight", "featuredImage": "/assets/card2_parcel.png", "status": "Published", "author": "Operations Team", "publishedAt": "06 Oct 2026", "excerpt": "Learn how international carriers calculate chargeable weight using L × W × H ÷ 5000 and how right-sizing cartons reduces shipping costs by up to 22%."},
        {"id": "BLOG-103", "title": "Scaling D2C Cross-Border E-Commerce Exports under India's CSB-V Simplified Regime", "slug": "scaling-d2c-ecommerce-exports-csb-v-india", "category": "E-commerce Logistics", "tags": "CSB-V, Shopify, D2C, GST LUT, Exports", "featuredImage": "/assets/card4_ecommerce.png", "status": "Published", "author": "B2B Trade Advisory", "publishedAt": "01 Oct 2026", "excerpt": "Everything Indian D2C brands need to know about IEC, AD code registration, GST zero-rated LUT exports, and automated label generation."}
    ],
    "settings": {
        "general": {
            "portalName": "TRISYS EXPRESS Admin Portal",
            "timezone": "Asia/Kolkata (IST, UTC+05:30)",
            "currency": "INR (₹)",
            "dateFormat": "DD MMM YYYY",
            "maintenanceMode": False
        },
        "company": {
            "legalName": "Trisys Express Pvt. Ltd.",
            "gstin": "27AABCT1234F1Z5",
            "iecCode": "0315098765",
            "supportPhone": "1800-000-0000",
            "supportEmail": "support@trisysexpress.com",
            "headOffice": "Andheri East, Cargo Complex Road, Mumbai — 400099, Maharashtra, India"
        },
        "branding": {
            "primaryColor": "#EA1D25",
            "sidebarBg": "#161B21",
            "lightLogoPath": "/assets/trisys_logo_transparent.png",
            "darkLogoPath": "/assets/trisys_admin_logo.png",
            "tagline": "Global Shipping Made Simple"
        },
        "notifications": {
            "emailOnNewBooking": True,
            "emailOnQuoteRequest": True,
            "smsOnOutForDelivery": True,
            "whatsappLiveUpdates": True,
            "adminAlertRecipient": "ops-alerts@trisysexpress.com"
        },
        "shipping": {
            "defaultOriginCountry": "India",
            "standardVolumetricDivisor": 5000,
            "bulkCargoVolumetricDivisor": 6000,
            "maxDocumentWeightKg": 5.0,
            "maxParcelWeightKg": 70.0,
            "maxBulkWeightKg": 5000.0,
            "freeDoorstepPickup": True
        },
        "roles": [
            {"role": "Super Admin", "usersCount": 2, "permissions": "Full Access (Dashboard, Shipments, Rates, Partners, CMS, Settings, Security)"},
            {"role": "Operations Dispatcher", "usersCount": 6, "permissions": "Shipments, Tracking, Bookings, Courier Partners, Customer Lookup"},
            {"role": "Customs & KYC Officer", "usersCount": 4, "permissions": "Customs Documents, Medicine Rx Verification, Business KYC Approval"},
            {"role": "Support Executive", "usersCount": 8, "permissions": "Support Tickets, Tracking Lookup, FAQs & Customer Communication"}
        ],
        "security": {
            "adminHeaderRequired": True,
            "sessionTimeoutMinutes": 120,
            "passwordHashIterations": 120000,
            "auditLoggingEnabled": True
        }
    }
}


def load_admin_store():
    if not os.path.isfile(ADMIN_STORE_FILE):
        os.makedirs(DATA_DIR, exist_ok=True)
        with open(ADMIN_STORE_FILE, "w", encoding="utf-8") as f:
            json.dump(DEFAULT_ADMIN_STORE, f, indent=2, ensure_ascii=False)
        return json.loads(json.dumps(DEFAULT_ADMIN_STORE))
    try:
        with open(ADMIN_STORE_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if not isinstance(data, dict):
                return json.loads(json.dumps(DEFAULT_ADMIN_STORE))
            for k, v in DEFAULT_ADMIN_STORE.items():
                if k not in data:
                    data[k] = json.loads(json.dumps(v))
            # Merge any new default additionalCharges or ratePlans by id
            for list_key in ("additionalCharges", "ratePlans"):
                existing_list = data.get(list_key)
                if isinstance(existing_list, list):
                    existing_ids = {item.get("id") for item in existing_list if isinstance(item, dict)}
                    for def_item in DEFAULT_ADMIN_STORE.get(list_key, []):
                        if def_item.get("id") not in existing_ids:
                            existing_list.append(json.loads(json.dumps(def_item)))
            # Merge any new default locations (countries by code, regions by code, cities by city, coverageZones by code)
            locs = data.setdefault("locations", {})
            def_locs = DEFAULT_ADMIN_STORE.get("locations", {})
            for loc_key, id_field in (("countries", "code"), ("regions", "code"), ("cities", "city"), ("coverageZones", "code")):
                existing_loc_list = locs.get(loc_key)
                if not isinstance(existing_loc_list, list):
                    locs[loc_key] = json.loads(json.dumps(def_locs.get(loc_key, [])))
                else:
                    existing_keys = {item.get(id_field) for item in existing_loc_list if isinstance(item, dict)}
                    for def_item in def_locs.get(loc_key, []):
                        if def_item.get(id_field) not in existing_keys:
                            existing_loc_list.append(json.loads(json.dumps(def_item)))
            return data
    except Exception:
        return json.loads(json.dumps(DEFAULT_ADMIN_STORE))


def save_admin_store(store):
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(ADMIN_STORE_FILE, "w", encoding="utf-8") as f:
        json.dump(store, f, indent=2, ensure_ascii=False)


COMMERCIAL_INVOICE_CSV = """Invoice Number,Invoice Date,Exporter / Sender Name,Exporter Address & City,Exporter GSTIN / IEC / KYC ID,Consignee / Recipient Name,Consignee Full Delivery Address,Destination Country,Consignee Phone & Email,Incoterms (DAP/DDP/FCA),Reason for Export (Personal/Sample/Commercial/Medicine),Line Item No,Detailed Goods Description,HS / HSN Code (6-8 Digit),Country of Origin,Quantity,Unit of Measure (PCS/BOX/STRIP),Unit Value (INR/USD),Total Line Value
INV-2026-001,2026-10-26,Example Exporter / Sender,Mumbai Maharashtra 400001 India,PAN/GSTIN-HERE,Example Consignee,14 High Street London SW1A 1AA,United Kingdom,+44-7000000000,DAP,Personal Gift / E-commerce Order,1,100% Cotton Woven Apparel,620520,India,2,PCS,2500.00,5000.00
"""

PACKING_LIST_CSV = """Shipment Reference / Invoice No,Exporter Name,Destination Country,Total Packages / Boxes,Box / Pallet Number,Package Type (Carton/Pallet/Pouch),Length (cm),Width (cm),Height (cm),Net Weight (kg),Gross Weight (kg),Detailed Contents of Package,Quantity Inside Package
INV-2026-001,Example Exporter / Sender,United Kingdom,1,Box 1 of 1,Corrugated Carton,30,25,20,1.80,2.10,Cotton Woven Apparel (Folded & Polybagged),2 PCS
"""

CUSTOMS_CHECKLIST_TXT = """========================================================================
TRISYS EXPRESS — INTERNATIONAL EXPORT KYC & CUSTOMS DOCUMENT CHECKLIST
========================================================================

1. MANDATORY SENDER KYC DOCUMENTS (INDIA EXPORT CLEARANCE)
   - Individual / Personal Shippers:
     * Government Photo ID: Aadhaar Card, Passport, or PAN Card
     * Signed Individual KYC Authorisation & Security Declaration
   - Business / Corporate / E-commerce Shippers:
     * Importer-Exporter Code (IEC) Certificate
     * Company GSTIN Registration Certificate & Company PAN
     * Authorised Signatory Photo ID & AD Code Registration (for commercial exports)

2. SHIPMENT-SPECIFIC CUSTOMS PAPERWORK
   - Document Courier:
     * No commercial invoice required for non-negotiable printed documents/certificates.
   - Personal Parcels & Commercial Samples:
     * 3 copies of signed Proforma / Commercial Invoice with itemised description, HS code & value.
     * Detailed Packing List (required when shipping multiple cartons).
   - Medicine Courier (Prescription Pharmaceuticals):
     * Valid Doctor's Prescription matching the patient/recipient name & dosage duration (max 90-day supply).
     * Original Retail Chemist / Pharmacy Tax Invoice showing batch number & expiry date.
     * Sender & Recipient Passport/ID copies.
   - Cross-Border E-commerce (CSB-V) & Bulk Commercial Cargo:
     * GST Tax Invoice / Commercial Invoice with 6-to-8 digit HS codes.
     * Packing List with carton/pallet dimensions (L x W x H cm) and gross/net weights.
     * LUT (Letter of Undertaking) or Bond copy where applicable.

3. PROHIBITED & RESTRICTED ITEMS SUMMARY
   - Strictly Prohibited: Narcotics, psychotropic substances, currency/bullion, explosives,
     flammable liquids/gases, counterfeit goods, loose lithium metal batteries, live animals.
   - Restricted (Subject to Prior Compliance Review): Prescription medicines, liquids/cosmetics,
     electronic devices with contained lithium-ion batteries (UN3481), fragile industrial parts.

Support Desk: 1800-000-0000 | Email: support@trisysexpress.com
========================================================================
"""


def hash_password(password, salt_hex=None):
    if not salt_hex:
        salt_hex = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        bytes.fromhex(salt_hex),
        120000,
    )
    return salt_hex, dk.hex()


def verify_password(password, salt_hex, expected_hash_hex):
    try:
        _, computed_hex = hash_password(password, salt_hex)
        return hmac.compare_digest(computed_hex, expected_hash_hex)
    except Exception:
        return False


def is_valid_email(value):
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", str(value or "").strip()))


def is_valid_phone(value):
    digits = re.sub(r"\D", "", str(value or ""))
    return 7 <= len(digits) <= 16


def is_valid_gstin(value):
    cleaned = str(value or "").strip().upper()
    if not cleaned:
        return False
    # Standard 15-char Indian GSTIN or alphanumeric tax/IEC identifier (6-20 chars)
    return bool(re.match(r"^[0-9A-Z\-]{6,20}$", cleaned))


def parse_positive_float(value):
    try:
        num = float(str(value).strip())
        return num if num > 0 else None
    except (ValueError, TypeError):
        return None


def parse_positive_int(value):
    try:
        num = int(float(str(value).strip()))
        return num if num >= 1 else None
    except (ValueError, TypeError):
        return None


def sanitize_account_for_public(acc):
    """Strip password hashes and salts before returning any account record."""
    return {
        k: v
        for k, v in acc.items()
        if k not in ("passwordHash", "passwordSalt")
    }


class CleanRouteHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def _send_json(self, status_code, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_download(self, filename, content_type, text_content):
        body = text_content.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_json_body(self):
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            content_length = 0

        if content_length <= 0 or content_length > 65536:
            self._send_json(400, {"ok": False, "error": "Invalid request payload size."})
            return None

        raw_body = self.rfile.read(content_length)
        try:
            payload = json.loads(raw_body.decode("utf-8"))
        except Exception:
            self._send_json(400, {"ok": False, "error": "Invalid JSON request body."})
            return None

        if not isinstance(payload, dict):
            self._send_json(400, {"ok": False, "error": "Request body must be a JSON object."})
            return None
        return payload

    def _is_admin_authorized(self):
        provided = (self.headers.get("X-Admin-Key") or "").strip()
        return bool(provided) and hmac.compare_digest(provided, ADMIN_PASSCODE)

    def do_GET(self):
        parsed = urllib.parse.urlsplit(self.path)
        clean_path = parsed.path.rstrip("/") or "/"
        query_params = urllib.parse.parse_qs(parsed.query, keep_blank_values=True)

        if clean_path == "/api/config":
            return self._send_json(200, {
                "ok": True,
                "publicBaseUrl": PUBLIC_BASE_URL,
                "carrierRateApiConfigured": bool(CARRIER_API_KEY),
                "carrierTrackingApiConfigured": bool(CARRIER_API_KEY),
                "smtpConfigured": bool(SMTP_HOST),
                "packageRules": PACKAGE_RULES,
            })

        if clean_path == "/api/rates":
            origin = (query_params.get("from", ["India"])[0] or "").strip()
            destination = (query_params.get("to", ["United Kingdom"])[0] or "").strip()
            pkg_type = normalize_package_type(query_params.get("type", ["document"])[0] or "document")
            weight_raw = (query_params.get("weight", ["1"])[0] or "").strip()
            unit = (query_params.get("unit", ["kg"])[0] or "kg").strip().lower()
            length_raw = (query_params.get("length", [""])[0] or "").strip()
            width_raw = (query_params.get("width", [""])[0] or "").strip()
            height_raw = (query_params.get("height", [""])[0] or "").strip()
            qty_raw = (query_params.get("qty", ["1"])[0] or "1").strip()
            qty_val = parse_positive_int(qty_raw) or 1

            if not origin or not destination:
                return self._send_json(400, {
                    "ok": False,
                    "error": "Please select both an Origin (From) country and a Destination (To) country.",
                })
            if origin.lower() == destination.lower():
                return self._send_json(400, {
                    "ok": False,
                    "error": f"Origin and destination cannot both be '{origin}'. Please select two different countries.",
                })
            if pkg_type not in PACKAGE_RULES:
                return self._send_json(400, {
                    "ok": False,
                    "error": f"Unsupported service or package type '{pkg_type}'.",
                })
            if unit not in ("kg", "lb"):
                return self._send_json(400, {
                    "ok": False,
                    "error": "Weight unit must be 'kg' or 'lb'.",
                })

            weight_val = parse_positive_float(weight_raw)
            if weight_val is None:
                return self._send_json(400, {
                    "ok": False,
                    "error": "Please enter a valid positive shipment weight greater than 0.",
                })

            rule = PACKAGE_RULES[pkg_type]
            actual_kg = round(weight_val * 0.453592, 2) if unit == "lb" else round(weight_val, 2)
            actual_lb = round(weight_val, 2) if unit == "lb" else round(weight_val * 2.20462, 2)
            max_kg = rule["maxWeightKg"]
            max_lb = round(max_kg * 2.20462, 1)

            if actual_kg > max_kg:
                return self._send_json(400, {
                    "ok": False,
                    "error": (
                        f"{rule['label']} shipments support up to {max_kg:g} kg ({max_lb:g} lb). "
                        f"Your entered weight ({weight_val:g} {unit} / {actual_kg:g} kg) exceeds this limit. "
                        f"{'Please select Parcel or Bulk & Cargo for heavier consignments.' if pkg_type == 'document' else 'Please select Bulk & Cargo for heavier freight.'}"
                    ),
                })

            volumetric_kg = None
            dimensions_cm = None
            if pkg_type != "document" and (length_raw or width_raw or height_raw):
                l_val = parse_positive_float(length_raw)
                w_val = parse_positive_float(width_raw)
                h_val = parse_positive_float(height_raw)
                if l_val is None or w_val is None or h_val is None:
                    return self._send_json(400, {
                        "ok": False,
                        "error": "When entering package dimensions, Length, Width, and Height (cm) must all be positive numbers.",
                    })
                dimensions_cm = {"length": l_val, "width": w_val, "height": h_val, "qty": qty_val}
                volumetric_kg = round((l_val * w_val * h_val * qty_val) / rule["volumetricDivisor"], 2)

            chargeable_kg = round(max(actual_kg, volumetric_kg), 2) if volumetric_kg is not None else actual_kg
            chargeable_lb = round(chargeable_kg * 2.20462, 2)

            zone_label, service_tiers = calculate_corridor_service_tiers(destination, pkg_type, chargeable_kg)
            default_tier = service_tiers[1] if len(service_tiers) > 1 else service_tiers[0]

            return self._send_json(200, {
                "ok": True,
                "livePricingConfigured": True,
                "zone": zone_label,
                "actualWeightKg": actual_kg,
                "volumetricWeightKg": volumetric_kg or 0.0,
                "chargeableWeightKg": chargeable_kg,
                "estimatedInr": default_tier["estimatedInr"],
                "priceDisplay": default_tier["priceDisplay"],
                "query": {
                    "from": origin,
                    "to": destination,
                    "zone": zone_label,
                    "type": pkg_type,
                    "typeLabel": rule["label"],
                    "weight": weight_val,
                    "unit": unit,
                    "qty": qty_val,
                    "actualWeightKg": actual_kg,
                    "actualWeightLb": actual_lb,
                    "volumetricWeightKg": volumetric_kg,
                    "volumetricDivisor": rule["volumetricDivisor"],
                    "chargeableWeightKg": chargeable_kg,
                    "chargeableWeightLb": chargeable_lb,
                    "dimensionsCm": dimensions_cm,
                    "maxWeightKg": max_kg,
                    "ruleNote": rule["ruleNote"],
                },
                "serviceTiers": service_tiers,
                "statusMessage": (
                    f"Route ({origin} → {destination}) and chargeable weight ({chargeable_kg:g} kg / {chargeable_lb:g} lb) verified for {rule['label']}. "
                    "Select a carrier tier below to request a quote or schedule doorstep pickup."
                ),
            })

        if clean_path == "/api/pickups/status":
            ref_id = (query_params.get("ref", [""])[0] or "").strip().upper()
            if not ref_id:
                return self._send_json(400, {
                    "ok": False,
                    "error": "Please enter a valid Pickup Reference ID (e.g. TRISYS-PKP-XXXXXX).",
                })
            for pkp in load_pickups():
                if pkp.get("pickupRef", "").upper() == ref_id:
                    return self._send_json(200, {"ok": True, "pickup": pkp})
            return self._send_json(404, {
                "ok": False,
                "error": f"No scheduled pickup request was found with Reference ID '{ref_id}'.",
            })

        if clean_path == "/api/track":
            awb = (query_params.get("awb", [""])[0] or query_params.get("id", [""])[0] or "").strip().upper()
            if not awb or len(awb) < 4 or not re.match(r"^[A-Z0-9\-]+$", awb):
                return self._send_json(400, {
                    "ok": False,
                    "error": "Please enter a valid Airway Bill (AWB) or Trisys Reference Number (4–30 alphanumeric characters).",
                })

            # 0. Search Admin Shipments (TRX* and custom AWBs)
            for shp in load_admin_store().get("shipments", []):
                if str(shp.get("trackingNo", "")).upper() == awb:
                    return self._send_json(200, {
                        "ok": True,
                        "found": True,
                        "awb": awb,
                        "recordType": f"International Courier Shipment ({shp.get('carrier', 'Trisys Express')})",
                        "status": shp.get("status", "Booked"),
                        "originCountry": shp.get("fromCountry", "India"),
                        "destCountry": shp.get("toCountry", ""),
                        "packageType": shp.get("type", "Parcel"),
                        "weight": shp.get("weightKg", 1.0),
                        "weightUnit": "kg",
                        "chargeableWeightKg": shp.get("weightKg", 1.0),
                        "senderName": shp.get("customer", ""),
                        "pickupAddress": shp.get("fromCity") or shp.get("fromCountry", "India"),
                        "estimatedDelivery": "3–5 Business Days",
                        "createdAt": shp.get("createdAt") or shp.get("date"),
                        "updatedAt": shp.get("updatedAt") or shp.get("date"),
                        "events": shp.get("events", []),
                    })

            # 1. Search scheduled pickups (TRISYS-PKP-*)
            for pkp in load_pickups():
                if pkp.get("pickupRef", "").upper() == awb:
                    return self._send_json(200, {
                        "ok": True,
                        "found": True,
                        "awb": awb,
                        "recordType": "Doorstep Pickup Booking",
                        "status": pkp.get("status", "Scheduled — Pending Courier Assignment"),
                        "originCountry": pkp.get("originCountry"),
                        "destCountry": pkp.get("destCountry"),
                        "packageType": pkp.get("packageTypeLabel") or pkp.get("packageType"),
                        "weight": pkp.get("weight"),
                        "weightUnit": pkp.get("weightUnit"),
                        "chargeableWeightKg": pkp.get("chargeableWeightKg"),
                        "senderName": pkp.get("senderName"),
                        "pickupAddress": pkp.get("pickupAddress"),
                        "pickupDate": pkp.get("pickupDate"),
                        "pickupTimeSlot": pkp.get("pickupTimeSlot"),
                        "estimatedDelivery": pkp.get("estimatedDelivery", "Pending AWB handover & flight uplift"),
                        "createdAt": pkp.get("createdAt"),
                        "updatedAt": pkp.get("updatedAt"),
                        "events": pkp.get("events", []),
                    })

            # 2. Search standard quotes (TRISYS-QTE-*)
            for qte in load_quotes():
                if qte.get("quoteId", "").upper() == awb:
                    return self._send_json(200, {
                        "ok": True,
                        "found": True,
                        "awb": awb,
                        "recordType": "Shipping Quote Request",
                        "status": qte.get("status", "Pending"),
                        "originCountry": qte.get("originCountry"),
                        "destCountry": qte.get("destCountry"),
                        "packageType": qte.get("packageTypeLabel") or qte.get("packageType"),
                        "weight": qte.get("weight"),
                        "weightUnit": qte.get("weightUnit"),
                        "chargeableWeightKg": qte.get("chargeableWeightKg"),
                        "senderName": qte.get("senderName"),
                        "pickupAddress": qte.get("originCountry"),
                        "estimatedDelivery": qte.get("serviceTier", "3–5 Business Days (Subject to Booking)"),
                        "createdAt": qte.get("createdAt"),
                        "updatedAt": qte.get("updatedAt"),
                        "events": [
                            {
                                "timestamp": qte.get("createdAt"),
                                "status": f"Quote Request Logged ({qte.get('status', 'Pending')})",
                                "location": f"{qte.get('originCountry')} → {qte.get('destCountry')}",
                                "description": (
                                    f"Shipping quote request for {qte.get('packageTypeLabel') or qte.get('packageType')} "
                                    f"({qte.get('weight')} {qte.get('weightUnit')}, chargeable {qte.get('chargeableWeightKg')} kg) received by Trisys Express pricing desk."
                                ),
                            }
                        ],
                    })

            # 3. Search E-commerce & Bulk service enquiries (TRISYS-ECOM-*, TRISYS-BULK-*)
            for enq in load_enquiries():
                if enq.get("enquiryId", "").upper() == awb:
                    svc_label = "E-commerce Logistics" if enq.get("serviceType") == "ecommerce" else "Bulk & Commercial Cargo"
                    w_val = enq.get("weight") or enq.get("totalWeight")
                    return self._send_json(200, {
                        "ok": True,
                        "found": True,
                        "awb": awb,
                        "recordType": f"{svc_label} Enquiry",
                        "status": enq.get("status", "Pending"),
                        "originCountry": enq.get("originCountry"),
                        "destCountry": enq.get("destCountry"),
                        "packageType": svc_label,
                        "weight": w_val,
                        "weightUnit": enq.get("weightUnit", "kg"),
                        "chargeableWeightKg": enq.get("chargeableWeightKg"),
                        "senderName": enq.get("contactName") or enq.get("contactPerson") or enq.get("storeName") or enq.get("companyName"),
                        "pickupAddress": enq.get("pickupAddress"),
                        "estimatedDelivery": enq.get("serviceOption") or enq.get("incoterms") or "Subject to Dispatch Schedule",
                        "createdAt": enq.get("createdAt"),
                        "updatedAt": enq.get("updatedAt", enq.get("createdAt")),
                        "events": [
                            {
                                "timestamp": enq.get("createdAt"),
                                "status": f"{svc_label} Enquiry Recorded ({enq.get('status', 'Pending')})",
                                "location": enq.get("pickupAddress") or enq.get("originCountry"),
                                "description": (
                                    f"Route {enq.get('originCountry')} → {enq.get('destCountry')} "
                                    f"(Chargeable weight: {enq.get('chargeableWeightKg')} kg). Queued for commercial operations review."
                                ),
                            }
                        ],
                    })

            return self._send_json(200, {
                "ok": True,
                "found": False,
                "awb": awb,
                "carrierTrackingApiConfigured": True,
                "message": (
                    f"No shipment, pickup booking (TRISYS-PKP-*), or quote record (TRISYS-QTE-*) was found in the database for '{awb}'. "
                    "Please check your AWB or try an active shipment number such as TRX123456791, TRX123456789, or TRX123456788."
                ),
            })

        if clean_path == "/api/service-enquiries":
            enquiries = load_enquiries()
            filter_type = (query_params.get("type", [""])[0] or "").strip().lower()
            if filter_type:
                enquiries = [e for e in enquiries if e.get("serviceType") == filter_type]
            return self._send_json(200, {"ok": True, "count": len(enquiries), "enquiries": enquiries})

        if clean_path == "/api/business/application-status":
            ref_id = (query_params.get("ref", [""])[0] or "").strip().upper()
            email = (query_params.get("email", [""])[0] or "").strip().lower()
            if not ref_id or not is_valid_email(email):
                return self._send_json(400, {
                    "ok": False,
                    "error": "Please provide both a valid Reference ID and the registered business email address.",
                })

            # Check business records (volume, integration, account-manager, credit)
            for rec in load_business_records():
                if rec.get("referenceId", "").upper() == ref_id and rec.get("email", "").lower() == email:
                    return self._send_json(200, {
                        "ok": True,
                        "record": {
                            "referenceId": rec.get("referenceId"),
                            "requestType": rec.get("requestType"),
                            "requestTypeLabel": rec.get("requestTypeLabel"),
                            "companyName": rec.get("companyName"),
                            "contactName": rec.get("contactName"),
                            "status": rec.get("status", "Pending"),
                            "createdAt": rec.get("createdAt"),
                            "updatedAt": rec.get("updatedAt"),
                            "adminNotes": rec.get("adminNotes", ""),
                        },
                    })

            # Check business accounts
            for acc in load_business_accounts():
                if acc.get("referenceId", "").upper() == ref_id and acc.get("email", "").lower() == email:
                    return self._send_json(200, {
                        "ok": True,
                        "record": {
                            "referenceId": acc.get("referenceId"),
                            "requestType": "business_account",
                            "requestTypeLabel": "Business Account Application",
                            "companyName": acc.get("companyName"),
                            "contactName": acc.get("contactName"),
                            "status": acc.get("status", "Pending"),
                            "createdAt": acc.get("createdAt"),
                            "updatedAt": acc.get("updatedAt"),
                            "adminNotes": acc.get("adminNotes", ""),
                        },
                    })

            return self._send_json(404, {
                "ok": False,
                "error": "No matching business application or enquiry was found for that Reference ID and Email.",
            })

        if clean_path == "/api/docs/commercial-invoice-template.csv":
            return self._send_download(
                "Trisys_Express_Commercial_Invoice_Template.csv",
                "text/csv; charset=utf-8",
                COMMERCIAL_INVOICE_CSV,
            )

        if clean_path == "/api/docs/packing-list-template.csv":
            return self._send_download(
                "Trisys_Express_Packing_List_Template.csv",
                "text/csv; charset=utf-8",
                PACKING_LIST_CSV,
            )

        if clean_path == "/api/docs/export-kyc-customs-checklist.txt":
            return self._send_download(
                "Trisys_Express_Export_KYC_and_Customs_Checklist.txt",
                "text/plain; charset=utf-8",
                CUSTOMS_CHECKLIST_TXT,
            )

        if clean_path == "/api/help/support-status":
            ticket_id = (query_params.get("ticket", [""])[0] or "").strip().upper()
            email = (query_params.get("email", [""])[0] or "").strip().lower()
            if not ticket_id or not is_valid_email(email):
                return self._send_json(400, {
                    "ok": False,
                    "error": "Please provide both a valid Support Ticket / Document Reference ID and your email address.",
                })

            for sup in load_support_enquiries():
                if sup.get("ticketId", "").upper() == ticket_id and sup.get("email", "").lower() == email:
                    return self._send_json(200, {"ok": True, "ticket": sup})

            for doc in load_customs_docs():
                if doc.get("documentRefId", "").upper() == ticket_id and doc.get("email", "").lower() == email:
                    return self._send_json(200, {
                        "ok": True,
                        "ticket": {
                            "ticketId": doc.get("documentRefId"),
                            "category": f"Customs Document Pre-Check ({doc.get('documentType')})",
                            "customerName": doc.get("senderName"),
                            "email": doc.get("email"),
                            "subject": f"{doc.get('fileName')} — {doc.get('destinationCountry')}",
                            "status": doc.get("status", "Pending"),
                            "createdAt": doc.get("createdAt"),
                        },
                    })

            return self._send_json(404, {
                "ok": False,
                "error": "No matching support ticket or customs document submission was found for that Reference ID and Email.",
            })

        if clean_path == "/api/admin/business-submissions":
            if not self._is_admin_authorized():
                return self._send_json(401, {
                    "ok": False,
                    "error": "Unauthorized. A valid administrator passcode (X-Admin-Key) is required to view business submissions.",
                })
            biz_records = load_business_records()
            biz_accounts = [sanitize_account_for_public(a) for a in load_business_accounts()]
            service_enquiries = load_enquiries()
            support_enquiries = load_support_enquiries()
            customs_docs = load_customs_docs()
            pickups = load_pickups()
            quotes = load_quotes()
            return self._send_json(200, {
                "ok": True,
                "businessRecords": biz_records,
                "businessAccounts": biz_accounts,
                "serviceEnquiries": service_enquiries,
                "supportEnquiries": support_enquiries,
                "customsDocuments": customs_docs,
                "pickups": pickups,
                "quotes": quotes,
            })

        if clean_path == "/api/admin/overview":
            if not self._is_admin_authorized():
                return self._send_json(401, {
                    "ok": False,
                    "error": "Unauthorized. Valid X-Admin-Key header required.",
                })
            store = load_admin_store()
            return self._send_json(200, {
                "ok": True,
                "store": store,
                "packageRules": PACKAGE_RULES,
                "businessRecords": load_business_records(),
                "businessAccounts": [sanitize_account_for_public(a) for a in load_business_accounts()],
                "serviceEnquiries": load_enquiries(),
                "supportEnquiries": load_support_enquiries(),
                "customsDocuments": load_customs_docs(),
                "pickups": load_pickups(),
                "quotes": load_quotes(),
            })

        if clean_path == "/api/admin/search":
            if not self._is_admin_authorized():
                return self._send_json(401, {
                    "ok": False,
                    "error": "Unauthorized. Valid X-Admin-Key header required.",
                })
            params = urllib.parse.parse_qs(parsed.query, keep_blank_values=True)
            raw_q = (params.get("q", [""])[0] or "").strip()
            if len(raw_q) > 120:
                raw_q = raw_q[:120]
            try:
                limit = max(1, min(20, int(params.get("limit", ["6"])[0])))
            except (ValueError, TypeError):
                limit = 6

            if len(raw_q) < 2:
                return self._send_json(200, {
                    "ok": True,
                    "query": raw_q,
                    "totalMatches": 0,
                    "shipments": [],
                    "tracking": [],
                    "customers": [],
                    "bookings": [],
                    "partners": [],
                })

            q_lower = raw_q.lower()
            store = load_admin_store()
            shipments_list = store.get("shipments") or []
            pickups_list = load_pickups()
            quotes_list = load_quotes()
            enquiries_list = load_enquiries()
            biz_accounts = [sanitize_account_for_public(a) for a in load_business_accounts()]
            biz_records = load_business_records()
            partners_list = store.get("partners") or []

            # 1. Shipments
            matched_shipments = []
            for s in shipments_list:
                trk = str(s.get("trackingNo") or "")
                cust = str(s.get("customer") or "")
                receiver = str(s.get("receiverName") or s.get("toCity") or "")
                from_loc = f"{s.get('fromCity') or ''} {s.get('fromCountry') or 'India'}".strip()
                to_loc = f"{s.get('toCity') or ''} {s.get('toCountry') or ''}".strip()
                status = str(s.get("status") or "")
                stype = str(s.get("type") or "")
                carrier = str(s.get("carrier") or "")
                email = str(s.get("email") or "")
                phone = str(s.get("phone") or "")
                booking_ref = str(s.get("bookingRef") or trk)
                haystack = f"{trk} {cust} {receiver} {from_loc} {to_loc} {status} {stype} {carrier} {email} {phone} {booking_ref}".lower()
                if q_lower in haystack:
                    matched_shipments.append({
                        "id": trk,
                        "trackingNo": trk,
                        "customer": cust,
                        "receiver": receiver or s.get("toCountry") or "",
                        "email": email,
                        "phone": phone,
                        "fromCountry": s.get("fromCountry") or "India",
                        "fromCity": s.get("fromCity") or "",
                        "toCountry": s.get("toCountry") or "",
                        "toCity": s.get("toCity") or "",
                        "type": stype,
                        "weight": s.get("weight") or f"{s.get('weightKg', 1)} kg",
                        "carrier": carrier or "DHL",
                        "status": status,
                        "date": s.get("date") or "",
                        "amountInr": s.get("amountInr") or 0,
                        "routePath": "/admin/shipments",
                    })

            # 2. Tracking records (Shipments + Pickups + Quotes)
            matched_tracking = []
            for s in shipments_list:
                trk = str(s.get("trackingNo") or "")
                cust = str(s.get("customer") or "")
                to_country = str(s.get("toCountry") or "")
                status = str(s.get("status") or "")
                events = s.get("events") or []
                last_ev = events[0] if events else {}
                last_desc = str(last_ev.get("description") or "")
                last_loc = str(last_ev.get("location") or "")
                if q_lower in f"{trk} {cust} {to_country} {status} {last_desc} {last_loc}".lower():
                    matched_tracking.append({
                        "trackingNo": trk,
                        "recordType": "Shipment AWB",
                        "customer": cust,
                        "corridor": f"{s.get('fromCountry') or 'India'} ➔ {to_country}",
                        "status": status,
                        "lastScan": last_loc or to_country,
                        "routePath": "/admin/tracking",
                    })
            for p in pickups_list:
                ref = str(p.get("pickupRef") or "")
                sender = str(p.get("senderName") or "")
                dest = str(p.get("destCountry") or "")
                status = str(p.get("status") or "Scheduled")
                if q_lower in f"{ref} {sender} {dest} {status}".lower():
                    matched_tracking.append({
                        "trackingNo": ref,
                        "recordType": "Pickup Reference",
                        "customer": sender,
                        "corridor": f"{p.get('originCountry') or 'India'} ➔ {dest}",
                        "status": status,
                        "lastScan": p.get("pickupAddress") or "Origin Hub",
                        "routePath": "/admin/tracking",
                    })
            for qt in quotes_list:
                ref = str(qt.get("quoteId") or "")
                sender = str(qt.get("senderName") or "")
                dest = str(qt.get("destCountry") or "")
                status = str(qt.get("status") or "Pending")
                if q_lower in f"{ref} {sender} {dest} {status}".lower():
                    matched_tracking.append({
                        "trackingNo": ref,
                        "recordType": "Quote Reference",
                        "customer": sender,
                        "corridor": f"{qt.get('originCountry') or 'India'} ➔ {dest}",
                        "status": status,
                        "lastScan": qt.get("serviceTier") or "Quote Desk",
                        "routePath": "/admin/tracking",
                    })

            # 3. Customers (aggregated across Business Accounts, Business Records, Shipments, and Pickups)
            customer_map = {}
            for acc in biz_accounts:
                cid = str(acc.get("referenceId") or "")
                cname = str(acc.get("contactName") or acc.get("companyName") or "")
                comp = str(acc.get("companyName") or "Corporate Account")
                cemail = str(acc.get("email") or "—")
                cphone = str(acc.get("phone") or "—")
                key = (cemail if cemail != "—" else (comp or cid)).lower()
                customer_map[key] = {
                    "id": cid,
                    "name": cname,
                    "company": comp,
                    "email": cemail,
                    "phone": cphone,
                    "type": "Business Account",
                    "status": acc.get("status") or "Approved",
                    "shipmentsCount": 1,
                    "lastRoute": acc.get("primaryCorridors") or "Global",
                    "routePath": "/admin/customers",
                }
            for rec in biz_records:
                cid = str(rec.get("referenceId") or "")
                cname = str(rec.get("contactName") or rec.get("companyName") or "")
                comp = str(rec.get("companyName") or "Business Enquiry")
                cemail = str(rec.get("email") or "—")
                cphone = str(rec.get("phone") or "—")
                key = (cemail if cemail != "—" else (comp or cid)).lower()
                if key not in customer_map:
                    customer_map[key] = {
                        "id": cid,
                        "name": cname,
                        "company": comp,
                        "email": cemail,
                        "phone": cphone,
                        "type": rec.get("requestTypeLabel") or "Corporate Lead",
                        "status": rec.get("status") or "Pending",
                        "shipmentsCount": 1,
                        "lastRoute": rec.get("primaryCountries") or "Global",
                        "routePath": "/admin/customers",
                    }
            for shp in shipments_list:
                trk = str(shp.get("trackingNo") or "")
                cname = str(shp.get("customer") or "")
                cemail = str(shp.get("email") or "")
                cphone = str(shp.get("phone") or "")
                key = (cemail or cname).lower()
                if not key:
                    continue
                if key in customer_map:
                    customer_map[key]["shipmentsCount"] += 1
                    customer_map[key]["lastRoute"] = f"{shp.get('fromCountry') or 'India'} ➔ {shp.get('toCountry') or ''}"
                    if customer_map[key]["email"] == "—" and cemail:
                        customer_map[key]["email"] = cemail
                    if customer_map[key]["phone"] == "—" and cphone:
                        customer_map[key]["phone"] = cphone
                else:
                    customer_map[key] = {
                        "id": f"CUS-{trk[-4:]}" if len(trk) >= 4 else f"CUS-{trk}",
                        "name": cname,
                        "company": "Individual / Direct Shipper",
                        "email": cemail or "—",
                        "phone": cphone or "—",
                        "type": f"{shp.get('type') or 'Express'} Shipper",
                        "status": "Active",
                        "shipmentsCount": 1,
                        "lastRoute": f"{shp.get('fromCountry') or 'India'} ➔ {shp.get('toCountry') or ''}",
                        "routePath": "/admin/customers",
                    }
            for pkp in pickups_list:
                pref = str(pkp.get("pickupRef") or "")
                cname = str(pkp.get("senderName") or "")
                cemail = str(pkp.get("senderEmail") or "")
                cphone = str(pkp.get("senderPhone") or "")
                key = (cemail or cname or pref).lower()
                if key and key not in customer_map:
                    customer_map[key] = {
                        "id": pref,
                        "name": cname,
                        "company": "Doorstep Pickup Shipper",
                        "email": cemail or "—",
                        "phone": cphone or "—",
                        "type": "Pickup Customer",
                        "status": pkp.get("status") or "Active",
                        "shipmentsCount": 1,
                        "lastRoute": f"{pkp.get('originCountry') or 'India'} ➔ {pkp.get('destCountry') or ''}",
                        "routePath": "/admin/customers",
                    }

            matched_customers = []
            for c in customer_map.values():
                haystack = f"{c['id']} {c['name']} {c['company']} {c['email']} {c['phone']} {c['type']} {c['lastRoute']}".lower()
                if q_lower in haystack:
                    matched_customers.append(c)

            # 4. Bookings (Pickups + Quotes + Service Enquiries + Direct Shipment Bookings)
            all_bookings = []
            for p in pickups_list:
                all_bookings.append({
                    "ref": str(p.get("pickupRef") or ""),
                    "type": "Doorstep Pickup",
                    "customer": str(p.get("senderName") or ""),
                    "contact": str(p.get("senderPhone") or p.get("senderEmail") or ""),
                    "route": f"{p.get('originCountry') or 'India'} ➔ {p.get('destCountry') or ''}",
                    "details": f"{p.get('packageTypeLabel') or p.get('packageType') or 'Parcel'} • {p.get('weight') or 1} {p.get('weightUnit') or 'kg'}",
                    "status": str(p.get("status") or "Pending"),
                    "date": str(p.get("createdAt") or "")[:10],
                    "routePath": "/admin/bookings",
                })
            for qt in quotes_list:
                all_bookings.append({
                    "ref": str(qt.get("quoteId") or ""),
                    "type": "Quote Request",
                    "customer": str(qt.get("senderName") or ""),
                    "contact": str(qt.get("phone") or qt.get("email") or ""),
                    "route": f"{qt.get('originCountry') or 'India'} ➔ {qt.get('destCountry') or ''}",
                    "details": f"{qt.get('packageTypeLabel') or qt.get('packageType') or 'Parcel'} • {qt.get('chargeableWeightKg') or qt.get('weight') or 1} kg",
                    "status": str(qt.get("status") or "Pending"),
                    "date": str(qt.get("createdAt") or "")[:10],
                    "routePath": "/admin/bookings",
                })
            for enq in enquiries_list:
                all_bookings.append({
                    "ref": str(enq.get("enquiryId") or ""),
                    "type": "E-commerce Enquiry" if enq.get("serviceType") == "ecommerce" else "Bulk Cargo Enquiry",
                    "customer": str(enq.get("contactName") or enq.get("contactPerson") or enq.get("storeName") or enq.get("companyName") or ""),
                    "contact": str(enq.get("phone") or enq.get("email") or ""),
                    "route": f"{enq.get('originCountry') or 'India'} ➔ {enq.get('destCountry') or ''}",
                    "details": f"Chargeable {enq.get('chargeableWeightKg') or enq.get('weight') or enq.get('totalWeight') or 1} kg",
                    "status": str(enq.get("status") or "Pending"),
                    "date": str(enq.get("createdAt") or "")[:10],
                    "routePath": "/admin/bookings",
                })
            for s in shipments_list:
                all_bookings.append({
                    "ref": str(s.get("trackingNo") or ""),
                    "type": "Direct Shipment Booking",
                    "customer": str(s.get("customer") or ""),
                    "contact": str(s.get("phone") or s.get("email") or ""),
                    "route": f"{s.get('fromCountry') or 'India'} ➔ {s.get('toCountry') or ''}",
                    "details": f"{s.get('type') or 'Parcel'} • {s.get('weight') or '1 kg'} ({s.get('carrier') or 'DHL'})",
                    "status": str(s.get("status") or "Booked"),
                    "date": str(s.get("date") or ""),
                    "routePath": "/admin/bookings",
                })

            matched_bookings = []
            for b in all_bookings:
                haystack = f"{b['ref']} {b['type']} {b['customer']} {b['contact']} {b['route']} {b['details']} {b['status']}".lower()
                if q_lower in haystack:
                    matched_bookings.append(b)

            # 5. Courier Partners
            matched_partners = []
            for prt in partners_list:
                pid = str(prt.get("id") or "")
                pname = str(prt.get("name") or "")
                pcode = str(prt.get("code") or "")
                pzones = str(prt.get("serviceZones") or "")
                pstatus = "Enabled" if prt.get("enabled", True) else "Disabled"
                if q_lower in f"{pid} {pname} {pcode} {pzones} {pstatus}".lower():
                    matched_partners.append({
                        "id": pid,
                        "name": pname,
                        "code": pcode,
                        "serviceZones": pzones,
                        "onTimePct": prt.get("onTimePct") or 98,
                        "shipments": prt.get("shipments") or 0,
                        "status": pstatus,
                        "routePath": "/admin/courier-partners",
                    })

            total_matches = (
                len(matched_shipments)
                + len(matched_tracking)
                + len(matched_customers)
                + len(matched_bookings)
                + len(matched_partners)
            )

            return self._send_json(200, {
                "ok": True,
                "query": raw_q,
                "totalMatches": total_matches,
                "shipments": matched_shipments[:limit],
                "tracking": matched_tracking[:limit],
                "customers": matched_customers[:limit],
                "bookings": matched_bookings[:limit],
                "partners": matched_partners[:limit],
            })

        if clean_path in ROUTE_MAP:
            target = ROUTE_MAP[clean_path]
            target_split = urllib.parse.urlsplit(target)
            target_params = urllib.parse.parse_qs(target_split.query, keep_blank_values=True)
            req_params = urllib.parse.parse_qs(parsed.query, keep_blank_values=True)
            merged_params = {**target_params, **req_params}
            merged_query = urllib.parse.urlencode(merged_params, doseq=True)
            self.path = f"{target_split.path}?{merged_query}" if merged_query else target_split.path
        elif clean_path == "/admin" or (clean_path.startswith("/admin/") and clean_path != "/admin/business"):
            self.path = "/admin.html" + (f"?{parsed.query}" if parsed.query else "")
        elif not os.path.splitext(clean_path)[1]:
            candidate = clean_path.lstrip("/") + ".html"
            if os.path.isfile(candidate):
                self.path = f"/{candidate}" + (f"?{parsed.query}" if parsed.query else "")

        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlsplit(self.path)
        clean_path = parsed.path.rstrip("/") or "/"

        payload = self._read_json_body()
        if payload is None:
            return

        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        short_id = uuid.uuid4().hex[:6].upper()

        if clean_path == "/api/service-enquiry":
            return self._handle_service_enquiry(payload, now_iso, short_id)

        if clean_path == "/api/business/volume-discount":
            return self._handle_volume_discount(payload, now_iso, short_id)

        if clean_path == "/api/business/integration-request":
            return self._handle_integration_request(payload, now_iso, short_id)

        if clean_path == "/api/business/account-manager":
            return self._handle_account_manager(payload, now_iso, short_id)

        if clean_path == "/api/business/credit-application":
            return self._handle_credit_application(payload, now_iso, short_id)

        if clean_path == "/api/business/register":
            return self._handle_business_register(payload, now_iso, short_id)

        if clean_path == "/api/business/login":
            return self._handle_business_login(payload)

        if clean_path == "/api/help/support-enquiry":
            return self._handle_support_enquiry(payload, now_iso, short_id)

        if clean_path == "/api/help/customs-document-upload":
            return self._handle_customs_document_upload(payload, now_iso, short_id)

        if clean_path == "/api/quotes":
            return self._handle_quote_request(payload, now_iso, short_id)

        if clean_path == "/api/pickups":
            return self._handle_pickup_booking(payload, now_iso, short_id)

        if clean_path == "/api/admin/update-status":
            return self._handle_admin_update_status(payload, now_iso)

        if clean_path == "/api/admin/action":
            return self._handle_admin_action(payload, now_iso, short_id)

        return self._send_json(404, {"ok": False, "error": "Endpoint not found."})

    def _handle_service_enquiry(self, payload, now_iso, short_id):
        service_type = normalize_package_type(payload.get("serviceType") or "")

        if service_type == "ecommerce":
            store_name = str(payload.get("storeName") or "").strip()
            contact_name = str(payload.get("contactName") or "").strip()
            email = str(payload.get("email") or "").strip()
            phone = str(payload.get("phone") or "").strip()
            origin_country = str(payload.get("originCountry") or "").strip()
            dest_country = str(payload.get("destCountry") or "").strip()
            pickup_address = str(payload.get("pickupAddress") or "").strip()
            delivery_address = str(payload.get("deliveryAddress") or "").strip()
            parcel_qty = parse_positive_int(payload.get("parcelQty"))
            weight = parse_positive_float(payload.get("weight"))
            weight_unit = str(payload.get("weightUnit") or "kg").strip().lower()
            length = parse_positive_float(payload.get("length"))
            width = parse_positive_float(payload.get("width"))
            height = parse_positive_float(payload.get("height"))
            service_option = str(payload.get("serviceOption") or "").strip()
            customs_mode = str(payload.get("customsMode") or "").strip()
            platform = str(payload.get("platform") or "").strip()
            notes = str(payload.get("notes") or "").strip()

            if not store_name:
                return self._send_json(400, {"ok": False, "error": "Store or brand name is required."})
            if not contact_name:
                return self._send_json(400, {"ok": False, "error": "Contact person name is required."})
            if not is_valid_email(email):
                return self._send_json(400, {"ok": False, "error": "Please enter a valid business email address."})
            if not is_valid_phone(phone):
                return self._send_json(400, {"ok": False, "error": "Please enter a valid contact phone number (at least 7 digits)."})
            if not origin_country or not dest_country:
                return self._send_json(400, {"ok": False, "error": "Shipment origin and destination countries are required."})
            if origin_country.lower() == dest_country.lower():
                return self._send_json(400, {"ok": False, "error": f"Origin and destination cannot both be '{origin_country}'."})
            if not pickup_address:
                return self._send_json(400, {"ok": False, "error": "Origin pickup warehouse or street address is required."})
            if not delivery_address:
                return self._send_json(400, {"ok": False, "error": "Destination delivery city/address is required."})
            if parcel_qty is None:
                return self._send_json(400, {"ok": False, "error": "Parcel quantity must be a whole number of at least 1."})
            if weight is None:
                return self._send_json(400, {"ok": False, "error": "Parcel weight must be a positive number greater than 0."})
            if weight_unit not in ("kg", "lb"):
                return self._send_json(400, {"ok": False, "error": "Weight unit must be kg or lb."})
            if length is None or width is None or height is None:
                return self._send_json(400, {"ok": False, "error": "Parcel dimensions (Length, Width, Height in cm) must be positive numbers."})
            if not service_option:
                return self._send_json(400, {"ok": False, "error": "Please select a shipping or fulfilment service option."})
            if not customs_mode:
                return self._send_json(400, {"ok": False, "error": "Please select a customs clearance mode."})

            actual_kg = round(weight * 0.453592, 2) if weight_unit == "lb" else round(weight, 2)
            rule = PACKAGE_RULES["ecommerce"]
            if actual_kg > rule["maxWeightKg"]:
                return self._send_json(400, {
                    "ok": False,
                    "error": f"E-commerce parcel shipments support up to {rule['maxWeightKg']:g} kg per parcel. Please select Bulk & Cargo for heavier consignments.",
                })
            volumetric_per_parcel_kg = round((length * width * height) / 5000.0, 2)
            total_volumetric_kg = round(volumetric_per_parcel_kg * parcel_qty, 2)
            chargeable_kg = round(max(actual_kg, total_volumetric_kg), 2)

            zone_label, service_tiers = calculate_corridor_service_tiers(dest_country, "ecommerce", chargeable_kg)
            matched_tier = next(
                (t for t in service_tiers if ("economy" in service_option.lower() and t["tierId"] == "economy") or ("next flight" in service_option.lower() and t["tierId"] == "nfo")),
                service_tiers[1],
            )

            enquiry_id = f"TRISYS-ECOM-{short_id}"
            record = {
                "enquiryId": enquiry_id,
                "serviceType": "ecommerce",
                "packageType": "ecommerce",
                "packageTypeLabel": rule["label"],
                "createdAt": now_iso,
                "storeName": store_name,
                "contactName": contact_name,
                "email": email,
                "phone": phone,
                "originCountry": origin_country,
                "destCountry": dest_country,
                "zone": zone_label,
                "pickupAddress": pickup_address,
                "deliveryAddress": delivery_address,
                "parcelQty": parcel_qty,
                "weight": weight,
                "weightUnit": weight_unit,
                "dimensionsCm": {"length": length, "width": width, "height": height},
                "serviceOption": service_option,
                "customsMode": customs_mode,
                "platform": platform,
                "notes": notes,
                "actualWeightKg": actual_kg,
                "volumetricWeightKg": total_volumetric_kg,
                "chargeableWeightKg": chargeable_kg,
                "estimatedInr": matched_tier["estimatedInr"],
                "priceDisplay": matched_tier["priceDisplay"],
                "serviceTiers": service_tiers,
                "status": "Pending",
                "liveRateAvailable": True,
                "liveBookingConfirmed": False,
            }
            save_enquiry(record)
            return self._send_json(200, {
                "ok": True,
                "enquiry": record,
                "message": (
                    f"E-commerce Logistics enquiry {enquiry_id} ({origin_country} → {dest_country}, chargeable {chargeable_kg:g} kg, estimated quote {matched_tier['priceDisplay']}) "
                    "has been validated and saved."
                ),
            })

        if service_type == "bulk":
            company_name = str(payload.get("companyName") or "").strip()
            contact_person = str(payload.get("contactPerson") or "").strip()
            email = str(payload.get("email") or "").strip()
            phone = str(payload.get("phone") or "").strip()
            origin_country = str(payload.get("originCountry") or "").strip()
            dest_country = str(payload.get("destCountry") or "").strip()
            pickup_address = str(payload.get("pickupAddress") or "").strip()
            delivery_address = str(payload.get("deliveryAddress") or "").strip()
            pallet_qty = parse_positive_int(payload.get("palletQty"))
            total_weight = parse_positive_float(payload.get("totalWeight"))
            weight_unit = str(payload.get("weightUnit") or "kg").strip().lower()
            length = parse_positive_float(payload.get("length"))
            width = parse_positive_float(payload.get("width"))
            height = parse_positive_float(payload.get("height"))
            cargo_type = str(payload.get("cargoType") or "").strip()
            handling_req = str(payload.get("handlingReq") or "").strip()
            incoterms = str(payload.get("incoterms") or "").strip()
            pickup_date = str(payload.get("pickupDate") or "").strip()
            special_notes = str(payload.get("specialNotes") or "").strip()

            if not company_name:
                return self._send_json(400, {"ok": False, "error": "Business or company name is required."})
            if not contact_person:
                return self._send_json(400, {"ok": False, "error": "Business contact person is required."})
            if not is_valid_email(email):
                return self._send_json(400, {"ok": False, "error": "Please enter a valid business contact email address."})
            if not is_valid_phone(phone):
                return self._send_json(400, {"ok": False, "error": "Please enter a valid business phone number (at least 7 digits)."})
            if not origin_country or not dest_country:
                return self._send_json(400, {"ok": False, "error": "Shipment origin and destination countries are required."})
            if origin_country.lower() == dest_country.lower():
                return self._send_json(400, {"ok": False, "error": f"Origin and destination cannot both be '{origin_country}'."})
            if not pickup_address:
                return self._send_json(400, {"ok": False, "error": "Origin pickup warehouse/facility address is required."})
            if not delivery_address:
                return self._send_json(400, {"ok": False, "error": "Destination delivery facility/consignee address is required."})
            if pallet_qty is None:
                return self._send_json(400, {"ok": False, "error": "Cargo or pallet quantity must be at least 1."})
            if total_weight is None:
                return self._send_json(400, {"ok": False, "error": "Total shipment weight must be a positive number greater than 0."})
            if weight_unit not in ("kg", "lb"):
                return self._send_json(400, {"ok": False, "error": "Weight unit must be kg or lb."})
            if length is None or width is None or height is None:
                return self._send_json(400, {"ok": False, "error": "Cargo dimensions (Length, Width, Height in cm) must be positive numbers."})
            if not cargo_type:
                return self._send_json(400, {"ok": False, "error": "Please select a cargo type."})
            if not handling_req:
                return self._send_json(400, {"ok": False, "error": "Please select handling requirements."})
            if not incoterms:
                return self._send_json(400, {"ok": False, "error": "Please select freight service mode / Incoterms."})

            actual_kg = round(total_weight * 0.453592, 2) if weight_unit == "lb" else round(total_weight, 2)
            rule = PACKAGE_RULES["bulk"]
            if actual_kg > rule["maxWeightKg"]:
                return self._send_json(400, {
                    "ok": False,
                    "error": f"Bulk & Cargo shipments support up to {rule['maxWeightKg']:g} kg per online quotation.",
                })
            total_volume_cbm = round((length * width * height * pallet_qty) / 1000000.0, 3)
            volumetric_kg = round((length * width * height * pallet_qty) / 6000.0, 2)
            chargeable_kg = round(max(actual_kg, volumetric_kg), 2)

            zone_label, service_tiers = calculate_corridor_service_tiers(dest_country, "bulk", chargeable_kg)
            matched_tier = next(
                (t for t in service_tiers if ("consolidated" in incoterms.lower() and t["tierId"] == "economy") or ("priority" in incoterms.lower() and t["tierId"] == "nfo")),
                service_tiers[1],
            )

            enquiry_id = f"TRISYS-BULK-{short_id}"
            record = {
                "enquiryId": enquiry_id,
                "serviceType": "bulk",
                "packageType": "bulk",
                "packageTypeLabel": rule["label"],
                "createdAt": now_iso,
                "companyName": company_name,
                "contactPerson": contact_person,
                "email": email,
                "phone": phone,
                "originCountry": origin_country,
                "destCountry": dest_country,
                "zone": zone_label,
                "pickupAddress": pickup_address,
                "deliveryAddress": delivery_address,
                "palletQty": pallet_qty,
                "totalWeight": total_weight,
                "weightUnit": weight_unit,
                "dimensionsCm": {"length": length, "width": width, "height": height},
                "cargoType": cargo_type,
                "handlingReq": handling_req,
                "incoterms": incoterms,
                "pickupDate": pickup_date,
                "specialNotes": special_notes,
                "actualWeightKg": actual_kg,
                "totalVolumeCbm": total_volume_cbm,
                "volumetricWeightKg": volumetric_kg,
                "chargeableWeightKg": chargeable_kg,
                "estimatedInr": matched_tier["estimatedInr"],
                "priceDisplay": matched_tier["priceDisplay"],
                "serviceTiers": service_tiers,
                "status": "Pending",
                "liveRateAvailable": True,
                "liveBookingConfirmed": False,
            }
            save_enquiry(record)
            return self._send_json(200, {
                "ok": True,
                "enquiry": record,
                "message": (
                    f"Bulk & Commercial freight enquiry {enquiry_id} ({origin_country} → {dest_country}, chargeable {chargeable_kg:g} kg, estimated quote {matched_tier['priceDisplay']}) "
                    "has been validated and saved."
                ),
            })

        return self._send_json(400, {"ok": False, "error": "Unsupported serviceType. Expected 'ecommerce' or 'bulk'."})

    def _handle_volume_discount(self, payload, now_iso, short_id):
        company_name = str(payload.get("companyName") or "").strip()
        contact_name = str(payload.get("contactName") or "").strip()
        email = str(payload.get("email") or "").strip()
        phone = str(payload.get("phone") or "").strip()
        monthly_shipments = parse_positive_int(payload.get("monthlyShipments"))
        avg_weight_kg = parse_positive_float(payload.get("avgWeightKg"))
        primary_category = str(payload.get("primaryCategory") or "").strip()
        destination_corridors = str(payload.get("destinationCorridors") or "").strip()
        notes = str(payload.get("notes") or "").strip()

        if not company_name:
            return self._send_json(400, {"ok": False, "error": "Business or company name is required."})
        if not contact_name:
            return self._send_json(400, {"ok": False, "error": "Contact person name is required."})
        if not is_valid_email(email):
            return self._send_json(400, {"ok": False, "error": "Please enter a valid business email address."})
        if not is_valid_phone(phone):
            return self._send_json(400, {"ok": False, "error": "Please enter a valid business phone number (at least 7 digits)."})
        if monthly_shipments is None:
            return self._send_json(400, {"ok": False, "error": "Expected monthly shipment volume must be a whole number of at least 1."})
        if avg_weight_kg is None:
            return self._send_json(400, {"ok": False, "error": "Average shipment weight (kg) must be greater than 0."})
        if not primary_category:
            return self._send_json(400, {"ok": False, "error": "Please select a primary shipment category."})
        if not destination_corridors:
            return self._send_json(400, {"ok": False, "error": "Please specify your primary destination countries or corridors."})

        if monthly_shipments >= 500:
            volume_bracket = "Tier 4: Enterprise Custom Contract (500+ shipments/month)"
        elif monthly_shipments >= 200:
            volume_bracket = "Tier 3: High-Volume Corporate (200–499 shipments/month)"
        elif monthly_shipments >= 50:
            volume_bracket = "Tier 2: Growth Commercial (50–199 shipments/month)"
        else:
            volume_bracket = "Tier 1: Starter Business (1–49 shipments/month)"

        estimated_monthly_kg = round(monthly_shipments * avg_weight_kg, 2)
        ref_id = f"TRISYS-VOL-{short_id}"
        record = {
            "referenceId": ref_id,
            "requestType": "volume_discount",
            "requestTypeLabel": "Volume Discount Quotation Request",
            "createdAt": now_iso,
            "updatedAt": now_iso,
            "status": "Pending",
            "companyName": company_name,
            "contactName": contact_name,
            "email": email,
            "phone": phone,
            "monthlyShipments": monthly_shipments,
            "avgWeightKg": avg_weight_kg,
            "estimatedMonthlyWeightKg": estimated_monthly_kg,
            "volumeBracket": volume_bracket,
            "primaryCategory": primary_category,
            "destinationCorridors": destination_corridors,
            "notes": notes,
            "configuredDiscountRate": None,
        }
        save_business_record(record)
        return self._send_json(200, {
            "ok": True,
            "record": record,
            "message": (
                f"Volume Pricing Request {ref_id} has been recorded under {volume_bracket} with status 'Pending'. "
                "Contracted carrier discount percentages require commercial rate-table configuration and underwriting review."
            ),
        })

    def _handle_integration_request(self, payload, now_iso, short_id):
        company_name = str(payload.get("companyName") or "").strip()
        contact_name = str(payload.get("contactName") or "").strip()
        email = str(payload.get("email") or "").strip()
        phone = str(payload.get("phone") or "").strip()
        platform = str(payload.get("platform") or "").strip()
        store_url = str(payload.get("storeUrl") or "").strip()
        monthly_orders = str(payload.get("monthlyOrders") or "").strip()
        features = payload.get("features") if isinstance(payload.get("features"), list) else []
        notes = str(payload.get("notes") or "").strip()

        if not company_name:
            return self._send_json(400, {"ok": False, "error": "Store or business name is required."})
        if not contact_name:
            return self._send_json(400, {"ok": False, "error": "Contact person name is required."})
        if not is_valid_email(email):
            return self._send_json(400, {"ok": False, "error": "Please enter a valid business email address."})
        if not is_valid_phone(phone):
            return self._send_json(400, {"ok": False, "error": "Please enter a valid phone number (at least 7 digits)."})
        if not platform:
            return self._send_json(400, {"ok": False, "error": "Please select your e-commerce platform (e.g. Shopify or WooCommerce)."})
        if not store_url or "." not in store_url:
            return self._send_json(400, {"ok": False, "error": "Please enter a valid store domain or URL (e.g. https://yourstore.myshopify.com)."})
        if not monthly_orders:
            return self._send_json(400, {"ok": False, "error": "Please select your estimated monthly order volume."})
        if not features:
            return self._send_json(400, {"ok": False, "error": "Please select at least one integration capability (e.g. Auto Label Generation, Order Sync)."})

        ref_id = f"TRISYS-INT-{short_id}"
        record = {
            "referenceId": ref_id,
            "requestType": "ecommerce_integration",
            "requestTypeLabel": "E-commerce Integration Setup Request",
            "createdAt": now_iso,
            "updatedAt": now_iso,
            "status": "Pending",
            "integrationConnected": False,
            "companyName": company_name,
            "contactName": contact_name,
            "email": email,
            "phone": phone,
            "platform": platform,
            "storeUrl": store_url,
            "monthlyOrders": monthly_orders,
            "features": [str(f).strip() for f in features if str(f).strip()],
            "notes": notes,
        }
        save_business_record(record)
        return self._send_json(200, {
            "ok": True,
            "record": record,
            "message": (
                f"Integration setup request {ref_id} for {platform} ({store_url}) has been saved with status 'Pending'. "
                "Live store OAuth connection and automated carrier label generation require merchant API credentials."
            ),
        })

    def _handle_account_manager(self, payload, now_iso, short_id):
        company_name = str(payload.get("companyName") or "").strip()
        contact_name = str(payload.get("contactName") or "").strip()
        email = str(payload.get("email") or "").strip()
        phone = str(payload.get("phone") or "").strip()
        monthly_shipments = str(payload.get("monthlyShipments") or "").strip()
        shipping_requirements = str(payload.get("shippingRequirements") or "").strip()
        pickup_regions = str(payload.get("pickupRegions") or "").strip()
        delivery_regions = str(payload.get("deliveryRegions") or "").strip()
        notes = str(payload.get("notes") or "").strip()

        if not company_name:
            return self._send_json(400, {"ok": False, "error": "Business name is required."})
        if not contact_name:
            return self._send_json(400, {"ok": False, "error": "Contact person's name is required."})
        if not is_valid_email(email):
            return self._send_json(400, {"ok": False, "error": "Please enter a valid business email address."})
        if not is_valid_phone(phone):
            return self._send_json(400, {"ok": False, "error": "Please enter a valid contact phone number (at least 7 digits)."})
        if not monthly_shipments:
            return self._send_json(400, {"ok": False, "error": "Please select or enter your estimated monthly shipments."})
        if not shipping_requirements:
            return self._send_json(400, {"ok": False, "error": "Please describe or select your primary shipping requirements."})
        if not pickup_regions:
            return self._send_json(400, {"ok": False, "error": "Please specify your pickup city/regions in India."})
        if not delivery_regions:
            return self._send_json(400, {"ok": False, "error": "Please specify your destination delivery regions/countries."})

        ref_id = f"TRISYS-KAM-{short_id}"
        record = {
            "referenceId": ref_id,
            "requestType": "account_manager",
            "requestTypeLabel": "Dedicated Account Manager Request",
            "createdAt": now_iso,
            "updatedAt": now_iso,
            "status": "Pending",
            "assignedAccountManager": None,
            "companyName": company_name,
            "contactName": contact_name,
            "email": email,
            "phone": phone,
            "monthlyShipments": monthly_shipments,
            "shippingRequirements": shipping_requirements,
            "pickupRegions": pickup_regions,
            "deliveryRegions": delivery_regions,
            "notes": notes,
        }
        save_business_record(record)
        return self._send_json(200, {
            "ok": True,
            "record": record,
            "message": (
                f"Dedicated Account Manager request {ref_id} has been saved as a 'Pending' enquiry. "
                "An account manager will be assigned after administrator review."
            ),
        })

    def _handle_credit_application(self, payload, now_iso, short_id):
        company_name = str(payload.get("companyName") or "").strip()
        contact_name = str(payload.get("contactName") or "").strip()
        email = str(payload.get("email") or "").strip()
        phone = str(payload.get("phone") or "").strip()
        gstin = str(payload.get("gstin") or "").strip().upper()
        billing_address = str(payload.get("billingAddress") or "").strip()
        monthly_volume = str(payload.get("monthlyVolume") or "").strip()
        billing_cycle = str(payload.get("billingCycle") or "").strip()
        notes = str(payload.get("notes") or "").strip()

        if not company_name:
            return self._send_json(400, {"ok": False, "error": "Company or business name is required."})
        if not contact_name:
            return self._send_json(400, {"ok": False, "error": "Billing contact name is required."})
        if not is_valid_email(email):
            return self._send_json(400, {"ok": False, "error": "Please enter a valid billing contact email address."})
        if not is_valid_phone(phone):
            return self._send_json(400, {"ok": False, "error": "Please enter a valid billing phone number (at least 7 digits)."})
        if not is_valid_gstin(gstin):
            return self._send_json(400, {"ok": False, "error": "Please enter a valid GSTIN or corporate tax registration number (6–20 alphanumeric characters)."})
        if not billing_address:
            return self._send_json(400, {"ok": False, "error": "Registered business billing address is required."})
        if not monthly_volume:
            return self._send_json(400, {"ok": False, "error": "Estimated monthly shipment volume is required."})
        if not billing_cycle:
            return self._send_json(400, {"ok": False, "error": "Please select a preferred consolidated billing option."})

        # Prevent duplicate active credit applications for same email + GSTIN
        existing = load_business_records()
        for rec in existing:
            if (
                rec.get("requestType") == "credit_billing"
                and rec.get("email", "").lower() == email.lower()
                and rec.get("gstin", "").upper() == gstin
                and rec.get("status") in ("Pending", "Under Review")
            ):
                return self._send_json(409, {
                    "ok": False,
                    "error": (
                        f"An active credit & monthly billing application ({rec.get('referenceId')}) "
                        f"for GSTIN {gstin} is already {rec.get('status')}."
                    ),
                })

        ref_id = f"TRISYS-CRD-{short_id}"
        record = {
            "referenceId": ref_id,
            "requestType": "credit_billing",
            "requestTypeLabel": "Credit & Monthly Billing Application",
            "createdAt": now_iso,
            "updatedAt": now_iso,
            "status": "Pending",
            "creditApproved": False,
            "approvedCreditLimit": None,
            "companyName": company_name,
            "contactName": contact_name,
            "email": email,
            "phone": phone,
            "gstin": gstin,
            "billingAddress": billing_address,
            "monthlyVolume": monthly_volume,
            "billingCycle": billing_cycle,
            "notes": notes,
        }
        save_business_record(record)
        return self._send_json(200, {
            "ok": True,
            "record": record,
            "message": (
                f"Credit & Monthly Billing application {ref_id} has been submitted with status 'Pending'. "
                "Applications require financial verification and administrator review before credit terms are activated."
            ),
        })

    def _handle_business_register(self, payload, now_iso, short_id):
        company_name = str(payload.get("companyName") or "").strip()
        business_type = str(payload.get("businessType") or "").strip()
        contact_name = str(payload.get("contactName") or "").strip()
        email = str(payload.get("email") or "").strip().lower()
        phone = str(payload.get("phone") or "").strip()
        address = str(payload.get("address") or "").strip()
        city = str(payload.get("city") or "").strip()
        state = str(payload.get("state") or "").strip()
        pin_code = str(payload.get("pinCode") or "").strip()
        gstin = str(payload.get("gstin") or "").strip().upper()
        monthly_volume = str(payload.get("monthlyVolume") or "").strip()
        preferred_services = payload.get("preferredServices") if isinstance(payload.get("preferredServices"), list) else []
        password = str(payload.get("password") or "")
        confirm_password = str(payload.get("confirmPassword") or "")
        accept_terms = bool(payload.get("acceptTerms"))

        if not company_name:
            return self._send_json(400, {"ok": False, "error": "Company or business name is required."})
        if not business_type:
            return self._send_json(400, {"ok": False, "error": "Please select your business type."})
        if not contact_name:
            return self._send_json(400, {"ok": False, "error": "Contact person's full name is required."})
        if not is_valid_email(email):
            return self._send_json(400, {"ok": False, "error": "Please enter a valid business email address."})
        if not is_valid_phone(phone):
            return self._send_json(400, {"ok": False, "error": "Please enter a valid contact phone number (at least 7 digits)."})
        if not address:
            return self._send_json(400, {"ok": False, "error": "Business street address is required."})
        if not city:
            return self._send_json(400, {"ok": False, "error": "City is required."})
        if not state:
            return self._send_json(400, {"ok": False, "error": "State / province is required."})
        if not re.match(r"^[0-9A-Za-z\-\s]{4,10}$", pin_code):
            return self._send_json(400, {"ok": False, "error": "Please enter a valid PIN / postal code (4–10 characters)."})
        if not is_valid_gstin(gstin):
            return self._send_json(400, {"ok": False, "error": "Please enter a valid GSTIN or tax registration number (6–20 alphanumeric characters)."})
        if not monthly_volume:
            return self._send_json(400, {"ok": False, "error": "Estimated monthly shipment volume is required."})
        clean_services = [str(s).strip() for s in preferred_services if str(s).strip()]
        if not clean_services:
            return self._send_json(400, {"ok": False, "error": "Please select at least one preferred shipping service."})
        if len(password) < 8:
            return self._send_json(400, {"ok": False, "error": "Password must be at least 8 characters long."})
        if password != confirm_password:
            return self._send_json(400, {"ok": False, "error": "Password and confirmation password do not match."})
        if not accept_terms:
            return self._send_json(400, {"ok": False, "error": "You must accept the Business Terms of Service and Privacy Policy to apply."})

        # Duplicate-account prevention by email or GSTIN
        accounts = load_business_accounts()
        for existing in accounts:
            if existing.get("email", "").lower() == email:
                return self._send_json(409, {
                    "ok": False,
                    "error": f"A business account application with email '{email}' already exists (Reference: {existing.get('referenceId')}).",
                })
            if gstin and existing.get("gstin", "").upper() == gstin:
                return self._send_json(409, {
                    "ok": False,
                    "error": f"A business account application with GSTIN '{gstin}' is already registered (Reference: {existing.get('referenceId')}).",
                })

        salt_hex, hash_hex = hash_password(password)
        ref_id = f"TRISYS-ACC-{short_id}"
        account_record = {
            "referenceId": ref_id,
            "requestType": "business_account",
            "requestTypeLabel": "Business Account Registration",
            "createdAt": now_iso,
            "updatedAt": now_iso,
            "status": "Pending",
            "creditGranted": False,
            "discountedRatesGranted": False,
            "companyName": company_name,
            "businessType": business_type,
            "contactName": contact_name,
            "email": email,
            "phone": phone,
            "address": address,
            "city": city,
            "state": state,
            "pinCode": pin_code,
            "gstin": gstin,
            "monthlyVolume": monthly_volume,
            "preferredServices": clean_services,
            "acceptTerms": True,
            "passwordSalt": salt_hex,
            "passwordHash": hash_hex,
        }
        save_business_account(account_record)
        return self._send_json(200, {
            "ok": True,
            "account": sanitize_account_for_public(account_record),
            "message": (
                f"Business Account Application {ref_id} has been created with status 'Pending'. "
                "Your application is queued for KYC and administrator review before corporate billing or discounted rates are enabled."
            ),
        })

    def _handle_business_login(self, payload):
        email = str(payload.get("email") or "").strip().lower()
        password = str(payload.get("password") or "")
        if not is_valid_email(email) or not password:
            return self._send_json(400, {"ok": False, "error": "Please enter both your registered email and password."})

        for acc in load_business_accounts():
            if acc.get("email", "").lower() == email:
                if verify_password(password, acc.get("passwordSalt", ""), acc.get("passwordHash", "")):
                    return self._send_json(200, {
                        "ok": True,
                        "account": sanitize_account_for_public(acc),
                        "message": f"Signed in as {acc.get('companyName')} ({acc.get('referenceId')}) — Application Status: {acc.get('status', 'Pending')}.",
                    })
                break

        return self._send_json(401, {
            "ok": False,
            "error": "Invalid business email or password. Need a business account? Apply via Open Business Account.",
        })

    def _handle_support_enquiry(self, payload, now_iso, short_id):
        customer_name = str(payload.get("customerName") or "").strip()
        company_name = str(payload.get("companyName") or "").strip()
        email = str(payload.get("email") or "").strip()
        phone = str(payload.get("phone") or "").strip()
        category = str(payload.get("category") or "").strip()
        shipment_ref = str(payload.get("shipmentRef") or "").strip()
        subject = str(payload.get("subject") or "").strip()
        message = str(payload.get("message") or "").strip()

        if not customer_name:
            return self._send_json(400, {"ok": False, "error": "Please enter your full name."})
        if not is_valid_email(email):
            return self._send_json(400, {"ok": False, "error": "Please enter a valid email address."})
        if not is_valid_phone(phone):
            return self._send_json(400, {"ok": False, "error": "Please enter a valid contact phone or WhatsApp number (at least 7 digits)."})
        if not category:
            return self._send_json(400, {"ok": False, "error": "Please select an enquiry category."})
        if not subject:
            return self._send_json(400, {"ok": False, "error": "Please enter a brief subject for your support request."})
        if len(message) < 10:
            return self._send_json(400, {"ok": False, "error": "Please provide a detailed support message (at least 10 characters)."})

        ticket_id = f"TRISYS-SUP-{short_id}"
        record = {
            "ticketId": ticket_id,
            "requestType": "support_enquiry",
            "createdAt": now_iso,
            "updatedAt": now_iso,
            "status": "Open",
            "customerName": customer_name,
            "companyName": company_name,
            "email": email,
            "phone": phone,
            "category": category,
            "shipmentRef": shipment_ref,
            "subject": subject,
            "message": message,
        }
        save_support_enquiry(record)
        return self._send_json(200, {
            "ok": True,
            "ticket": record,
            "message": (
                f"Support enquiry {ticket_id} has been recorded under '{category}' with status 'Open'. "
                "Our support team will respond via your verified email and phone number."
            ),
        })

    def _handle_customs_document_upload(self, payload, now_iso, short_id):
        sender_name = str(payload.get("senderName") or "").strip()
        email = str(payload.get("email") or "").strip()
        phone = str(payload.get("phone") or "").strip()
        destination_country = str(payload.get("destinationCountry") or "").strip()
        shipment_category = str(payload.get("shipmentCategory") or "").strip()
        document_type = str(payload.get("documentType") or "").strip()
        file_name = str(payload.get("fileName") or "").strip()
        file_size_kb = parse_positive_float(payload.get("fileSizeKb"))
        shipment_ref = str(payload.get("shipmentRef") or "").strip()
        notes = str(payload.get("notes") or "").strip()

        if not sender_name:
            return self._send_json(400, {"ok": False, "error": "Sender or exporter name is required."})
        if not is_valid_email(email):
            return self._send_json(400, {"ok": False, "error": "Please enter a valid email address."})
        if not is_valid_phone(phone):
            return self._send_json(400, {"ok": False, "error": "Please enter a valid phone number (at least 7 digits)."})
        if not destination_country:
            return self._send_json(400, {"ok": False, "error": "Please select or enter the destination country."})
        if not shipment_category:
            return self._send_json(400, {"ok": False, "error": "Please select the shipment category."})
        if not document_type:
            return self._send_json(400, {"ok": False, "error": "Please select the customs or KYC document type."})
        if not file_name:
            return self._send_json(400, {"ok": False, "error": "Please select a document file (PDF, JPG, PNG, CSV, or DOCX) to submit for pre-check."})

        doc_ref = f"TRISYS-DOC-{short_id}"
        record = {
            "documentRefId": doc_ref,
            "requestType": "customs_document",
            "createdAt": now_iso,
            "updatedAt": now_iso,
            "status": "Pending",
            "senderName": sender_name,
            "email": email,
            "phone": phone,
            "destinationCountry": destination_country,
            "shipmentCategory": shipment_category,
            "documentType": document_type,
            "fileName": file_name,
            "fileSizeKb": round(file_size_kb, 1) if file_size_kb else 0.0,
            "shipmentRef": shipment_ref,
            "notes": notes,
        }
        save_customs_doc(record)
        return self._send_json(200, {
            "ok": True,
            "documentRecord": record,
            "message": (
                f"Customs document submission {doc_ref} ({file_name}) for {destination_country} has been logged with status 'Pending' for export compliance verification."
            ),
        })

    def _handle_quote_request(self, payload, now_iso, short_id):
        sender_name = str(payload.get("senderName") or "").strip()
        email = str(payload.get("email") or "").strip()
        phone = str(payload.get("phone") or "").strip()
        origin_country = str(payload.get("originCountry") or "").strip()
        dest_country = str(payload.get("destCountry") or "").strip()
        pkg_type = normalize_package_type(payload.get("packageType") or "document")
        weight = parse_positive_float(payload.get("weight"))
        weight_unit = str(payload.get("weightUnit") or "kg").strip().lower()
        length = parse_positive_float(payload.get("length"))
        width = parse_positive_float(payload.get("width"))
        height = parse_positive_float(payload.get("height"))
        parcel_qty = parse_positive_int(payload.get("parcelQty") or payload.get("envelopeCount") or 1) or 1
        service_tier = str(payload.get("serviceTier") or "Express Air Saver (3–5 Business Days)").strip()
        prescription_confirmed = bool(payload.get("prescriptionConfirmed"))
        document_category = str(payload.get("documentCategory") or "").strip()
        parcel_category = str(payload.get("parcelCategory") or "").strip()
        medicine_type = str(payload.get("medicineType") or "").strip()
        medicine_supply_days = parse_positive_int(payload.get("medicineSupplyDays"))
        medicine_packaging = str(payload.get("medicinePackaging") or "").strip()
        other_category = str(payload.get("otherCategory") or "").strip()
        notes = str(payload.get("notes") or "").strip()

        if not sender_name:
            return self._send_json(400, {"ok": False, "error": "Please enter the sender or contact person's full name."})
        if not is_valid_email(email):
            return self._send_json(400, {"ok": False, "error": "Please enter a valid email address to receive your verified shipping quote."})
        if not is_valid_phone(phone):
            return self._send_json(400, {"ok": False, "error": "Please enter a valid phone or WhatsApp number (at least 7 digits)."})
        if not origin_country or not dest_country:
            return self._send_json(400, {"ok": False, "error": "Both origin and destination countries are required."})
        if origin_country.lower() == dest_country.lower():
            return self._send_json(400, {"ok": False, "error": f"Origin and destination cannot both be '{origin_country}'."})
        if pkg_type not in PACKAGE_RULES:
            return self._send_json(400, {"ok": False, "error": f"Unsupported package type '{pkg_type}'."})
        if weight is None:
            return self._send_json(400, {"ok": False, "error": "Shipment weight must be a positive number greater than 0."})
        if weight_unit not in ("kg", "lb"):
            return self._send_json(400, {"ok": False, "error": "Weight unit must be 'kg' or 'lb'."})

        rule = PACKAGE_RULES[pkg_type]
        actual_kg = round(weight * 0.453592, 2) if weight_unit == "lb" else round(weight, 2)
        if actual_kg > rule["maxWeightKg"]:
            return self._send_json(400, {
                "ok": False,
                "error": f"{rule['label']} shipments support up to {rule['maxWeightKg']:g} kg. Your entered weight ({actual_kg:g} kg) exceeds this limit.",
            })

        if pkg_type == "medicine":
            if any(term in medicine_type.lower() for term in ("narcotic", "psychotropic", "prohibited", "banned", "controlled")):
                return self._send_json(400, {
                    "ok": False,
                    "error": "Narcotic, psychotropic, and controlled substances are strictly prohibited for international courier transport under NDPS and IATA regulations.",
                })
            if medicine_supply_days is not None and medicine_supply_days > 90:
                return self._send_json(400, {
                    "ok": False,
                    "error": "International personal-use medicine shipments are restricted to a maximum 90-day supply under customs and drug control regulations.",
                })
            if not prescription_confirmed:
                return self._send_json(400, {
                    "ok": False,
                    "error": "For Medicine Courier shipments, please confirm that you hold a valid doctor's prescription and pharmacy purchase invoice.",
                })

        if pkg_type == "other":
            if len(notes) < 5:
                return self._send_json(400, {
                    "ok": False,
                    "error": "For 'Other' specialized shipments, please enter a detailed description of the contents (at least 5 characters).",
                })

        volumetric_kg = None
        dimensions_cm = None
        if pkg_type != "document" and length is not None and width is not None and height is not None:
            dimensions_cm = {"length": length, "width": width, "height": height, "qty": parcel_qty}
            volumetric_kg = round((length * width * height * parcel_qty) / rule["volumetricDivisor"], 2)

        chargeable_kg = round(max(actual_kg, volumetric_kg), 2) if volumetric_kg is not None else actual_kg
        zone_label, service_tiers = calculate_corridor_service_tiers(dest_country, pkg_type, chargeable_kg)
        matched_tier = next(
            (t for t in service_tiers if ("economy" in service_tier.lower() and t["tierId"] == "economy") or ("next flight" in service_tier.lower() and t["tierId"] == "nfo")),
            service_tiers[1],
        )

        quote_id = f"TRISYS-QTE-{short_id}"
        record = {
            "quoteId": quote_id,
            "requestType": "shipping_quote",
            "createdAt": now_iso,
            "updatedAt": now_iso,
            "status": "Pending",
            "senderName": sender_name,
            "email": email,
            "phone": phone,
            "originCountry": origin_country,
            "destCountry": dest_country,
            "zone": zone_label,
            "packageType": pkg_type,
            "packageTypeLabel": rule["label"],
            "parcelQty": parcel_qty,
            "weight": weight,
            "weightUnit": weight_unit,
            "actualWeightKg": actual_kg,
            "volumetricWeightKg": volumetric_kg,
            "chargeableWeightKg": chargeable_kg,
            "dimensionsCm": dimensions_cm,
            "serviceTier": service_tier,
            "estimatedInr": matched_tier["estimatedInr"],
            "priceDisplay": matched_tier["priceDisplay"],
            "serviceTiers": service_tiers,
            "documentCategory": document_category if pkg_type == "document" else None,
            "parcelCategory": parcel_category if pkg_type == "parcel" else None,
            "medicineType": medicine_type if pkg_type == "medicine" else None,
            "medicineSupplyDays": medicine_supply_days if pkg_type == "medicine" else None,
            "medicinePackaging": medicine_packaging if pkg_type == "medicine" else None,
            "prescriptionConfirmed": prescription_confirmed if pkg_type == "medicine" else None,
            "otherCategory": other_category if pkg_type == "other" else None,
            "notes": notes,
            "liveRateAvailable": True,
        }
        save_quote(record)
        return self._send_json(200, {
            "ok": True,
            "quote": record,
            "message": (
                f"Shipping Quote Request {quote_id} ({origin_country} → {dest_country}, {rule['label']}, chargeable weight {chargeable_kg:g} kg, estimated quote {matched_tier['priceDisplay']}) "
                "has been saved to the backend with status 'Pending'. You can track this quote anytime on the Track Shipment page."
            ),
        })

    def _handle_pickup_booking(self, payload, now_iso, short_id):
        sender_name = str(payload.get("senderName") or "").strip()
        sender_phone = str(payload.get("senderPhone") or "").strip()
        sender_email = str(payload.get("senderEmail") or "").strip()
        pickup_address = str(payload.get("pickupAddress") or "").strip()
        pickup_date = str(payload.get("pickupDate") or "").strip()
        pickup_time_slot = str(payload.get("pickupTimeSlot") or "").strip()
        origin_country = str(payload.get("originCountry") or "India").strip()
        dest_country = str(payload.get("destCountry") or "United Kingdom").strip()
        pkg_type = str(payload.get("packageType") or "document").strip().lower()
        weight = parse_positive_float(payload.get("weight"))
        weight_unit = str(payload.get("weightUnit") or "kg").strip().lower()
        length = parse_positive_float(payload.get("length"))
        width = parse_positive_float(payload.get("width"))
        height = parse_positive_float(payload.get("height"))
        special_instructions = str(payload.get("specialInstructions") or "").strip()

        if not sender_name:
            return self._send_json(400, {"ok": False, "error": "Sender / contact person full name is required."})
        if not is_valid_phone(sender_phone):
            return self._send_json(400, {"ok": False, "error": "Please enter a valid mobile or WhatsApp contact number (at least 7 digits)."})
        if sender_email and not is_valid_email(sender_email):
            return self._send_json(400, {"ok": False, "error": "Please enter a valid sender email address (or leave optional email blank)."})
        if not pickup_address or len(pickup_address) < 5:
            return self._send_json(400, {"ok": False, "error": "Please enter a complete pickup address including street, city, and PIN/postal code."})
        if not pickup_date:
            return self._send_json(400, {"ok": False, "error": "Please select a preferred pickup date."})
        if not pickup_time_slot:
            return self._send_json(400, {"ok": False, "error": "Please select a preferred pickup time slot."})
        if not origin_country or not dest_country:
            return self._send_json(400, {"ok": False, "error": "Origin and destination countries are required."})
        if origin_country.lower() == dest_country.lower():
            return self._send_json(400, {"ok": False, "error": f"Origin and destination cannot both be '{origin_country}'."})
        if pkg_type not in PACKAGE_RULES:
            return self._send_json(400, {"ok": False, "error": f"Unsupported package type '{pkg_type}'."})
        if weight is None:
            return self._send_json(400, {"ok": False, "error": "Package weight must be a positive number greater than 0."})
        if weight_unit not in ("kg", "lb"):
            return self._send_json(400, {"ok": False, "error": "Weight unit must be 'kg' or 'lb'."})

        rule = PACKAGE_RULES[pkg_type]
        actual_kg = round(weight * 0.453592, 2) if weight_unit == "lb" else round(weight, 2)
        if actual_kg > rule["maxWeightKg"]:
            return self._send_json(400, {
                "ok": False,
                "error": f"{rule['label']} shipments support up to {rule['maxWeightKg']:g} kg. Your entered weight ({actual_kg:g} kg) exceeds this limit.",
            })

        volumetric_kg = None
        dimensions_cm = None
        if length is not None and width is not None and height is not None:
            dimensions_cm = {"length": length, "width": width, "height": height}
            volumetric_kg = round((length * width * height) / rule["volumetricDivisor"], 2)

        chargeable_kg = round(max(actual_kg, volumetric_kg), 2) if volumetric_kg is not None else actual_kg

        pickup_ref = f"TRISYS-PKP-{short_id}"
        initial_event = {
            "timestamp": now_iso,
            "status": "Scheduled — Pending Courier Assignment",
            "location": pickup_address,
            "description": (
                f"Doorstep pickup scheduled for {pickup_date} ({pickup_time_slot}) from {origin_country} to {dest_country} "
                f"({rule['label']}, {weight:g} {weight_unit})."
            ),
        }
        record = {
            "pickupRef": pickup_ref,
            "requestType": "pickup_booking",
            "createdAt": now_iso,
            "updatedAt": now_iso,
            "status": "Scheduled — Pending Courier Assignment",
            "senderName": sender_name,
            "senderPhone": sender_phone,
            "senderEmail": sender_email,
            "pickupAddress": pickup_address,
            "pickupDate": pickup_date,
            "pickupTimeSlot": pickup_time_slot,
            "originCountry": origin_country,
            "destCountry": dest_country,
            "packageType": pkg_type,
            "packageTypeLabel": rule["label"],
            "weight": weight,
            "weightUnit": weight_unit,
            "actualWeightKg": actual_kg,
            "volumetricWeightKg": volumetric_kg,
            "chargeableWeightKg": chargeable_kg,
            "dimensionsCm": dimensions_cm,
            "specialInstructions": special_instructions,
            "estimatedDelivery": "3–5 Business Days after pickup & export customs clearance",
            "events": [initial_event],
        }
        save_pickup(record)
        return self._send_json(200, {
            "ok": True,
            "pickup": record,
            "message": (
                f"Doorstep pickup request {pickup_ref} has been scheduled for {pickup_date} ({pickup_time_slot}). "
                "You can check your pickup status or track this reference number anytime."
            ),
        })

    def _handle_admin_update_status(self, payload, now_iso):
        if not self._is_admin_authorized():
            return self._send_json(401, {
                "ok": False,
                "error": "Unauthorized. Valid administrator passcode (X-Admin-Key) is required.",
            })

        ref_id = str(payload.get("referenceId") or "").strip().upper()
        new_status = str(payload.get("status") or "").strip()
        admin_notes = str(payload.get("adminNotes") or "").strip()

        if not ref_id:
            return self._send_json(400, {"ok": False, "error": "referenceId is required."})
        if new_status not in ALLOWED_STATUSES:
            return self._send_json(400, {
                "ok": False,
                "error": f"Invalid status '{new_status}'. Allowed statuses: {', '.join(ALLOWED_STATUSES)}.",
            })

        # 1. Check business_records.json
        biz_records = load_business_records()
        for rec in biz_records:
            if rec.get("referenceId", "").upper() == ref_id:
                rec["status"] = new_status
                rec["updatedAt"] = now_iso
                if admin_notes:
                    rec["adminNotes"] = admin_notes
                _save_json_list(BUSINESS_RECORDS_FILE, biz_records)
                return self._send_json(200, {"ok": True, "updated": rec})

        # 2. Check business_accounts.json
        biz_accounts = load_business_accounts()
        for acc in biz_accounts:
            if acc.get("referenceId", "").upper() == ref_id:
                acc["status"] = new_status
                acc["updatedAt"] = now_iso
                if admin_notes:
                    acc["adminNotes"] = admin_notes
                _save_json_list(BUSINESS_ACCOUNTS_FILE, biz_accounts)
                return self._send_json(200, {"ok": True, "updated": sanitize_account_for_public(acc)})

        # 3. Check service_enquiries.json
        enquiries = load_enquiries()
        for enq in enquiries:
            if enq.get("enquiryId", "").upper() == ref_id:
                enq["status"] = new_status
                enq["updatedAt"] = now_iso
                if admin_notes:
                    enq["adminNotes"] = admin_notes
                _save_json_list(ENQUIRIES_FILE, enquiries)
                return self._send_json(200, {"ok": True, "updated": enq})

        # 4. Check support_enquiries.json
        support_list = load_support_enquiries()
        for t in support_list:
            if t.get("ticketId", "").upper() == ref_id:
                t["status"] = new_status
                t["updatedAt"] = now_iso
                if admin_notes:
                    t["adminNotes"] = admin_notes
                _save_json_list(SUPPORT_ENQUIRIES_FILE, support_list)
                return self._send_json(200, {"ok": True, "updated": t})

        # 5. Check customs_documents.json
        docs_list = load_customs_docs()
        for d in docs_list:
            if d.get("documentRefId", "").upper() == ref_id:
                d["status"] = new_status
                d["updatedAt"] = now_iso
                if admin_notes:
                    d["adminNotes"] = admin_notes
                _save_json_list(CUSTOMS_DOCS_FILE, docs_list)
                return self._send_json(200, {"ok": True, "updated": d})

        # 6. Check pickups.json
        pickups_list = load_pickups()
        for p in pickups_list:
            if p.get("pickupRef", "").upper() == ref_id:
                p["status"] = new_status
                p["updatedAt"] = now_iso
                if admin_notes:
                    p["adminNotes"] = admin_notes
                events = p.get("events") if isinstance(p.get("events"), list) else []
                events.append({
                    "timestamp": now_iso,
                    "status": new_status,
                    "location": p.get("pickupAddress") or p.get("originCountry", "India"),
                    "description": admin_notes or f"Pickup status updated to '{new_status}'.",
                })
                p["events"] = events
                _save_json_list(PICKUPS_FILE, pickups_list)
                return self._send_json(200, {"ok": True, "updated": p})

        # 7. Check quotes.json
        quotes_list = load_quotes()
        for q in quotes_list:
            if q.get("quoteId", "").upper() == ref_id:
                q["status"] = new_status
                q["updatedAt"] = now_iso
                if admin_notes:
                    q["adminNotes"] = admin_notes
                _save_json_list(QUOTES_FILE, quotes_list)
                return self._send_json(200, {"ok": True, "updated": q})

        # 8. Check admin_store.json shipments
        store = load_admin_store()
        for shp in store.get("shipments", []):
            if str(shp.get("trackingNo", "")).upper() == ref_id:
                shp["status"] = new_status
                shp["updatedAt"] = now_iso
                ev_list = shp.get("events") if isinstance(shp.get("events"), list) else []
                ev_list.append({
                    "timestamp": now_iso[:16].replace("T", " "),
                    "status": new_status,
                    "location": shp.get("toCity") or shp.get("toCountry") or "Transit Hub",
                    "description": admin_notes or f"Shipment status updated to {new_status}."
                })
                shp["events"] = ev_list
                save_admin_store(store)
                return self._send_json(200, {"ok": True, "updated": shp})

        return self._send_json(404, {"ok": False, "error": f"Submission '{ref_id}' not found."})

    def _handle_admin_action(self, payload, now_iso, short_id):
        if not self._is_admin_authorized():
            return self._send_json(401, {
                "ok": False,
                "error": "Unauthorized. Valid administrator passcode (X-Admin-Key) is required.",
            })

        action = str(payload.get("action") or "").strip()
        store = load_admin_store()

        if action == "create_shipment":
            trk = str(payload.get("trackingNo") or f"TRX{uuid.uuid4().int % 900000000 + 100000000}").strip().upper()
            customer = str(payload.get("customer") or "").strip()
            email = str(payload.get("email") or "").strip()
            phone = str(payload.get("phone") or "").strip()
            from_country = str(payload.get("fromCountry") or "India").strip()
            from_code = str(payload.get("fromCode") or "IN").strip().upper()
            from_city = str(payload.get("fromCity") or "Mumbai, MH").strip()
            to_country = str(payload.get("toCountry") or "USA").strip()
            to_code = str(payload.get("toCode") or "US").strip().upper()
            to_city = str(payload.get("toCity") or "").strip()
            shp_type = str(payload.get("type") or "Document").strip()
            weight_kg = parse_positive_float(payload.get("weightKg")) or 1.0
            carrier = str(payload.get("carrier") or "DHL").strip()
            amount_inr = parse_positive_float(payload.get("amountInr")) or round(weight_kg * 2200)
            status = str(payload.get("status") or "Booked").strip()
            if not customer:
                return self._send_json(400, {"ok": False, "error": "Customer name is required."})

            new_shp = {
                "trackingNo": trk,
                "date": datetime.datetime.now().strftime("%d %b %Y"),
                "createdAt": now_iso,
                "updatedAt": now_iso,
                "customer": customer,
                "email": email,
                "phone": phone,
                "fromCode": from_code,
                "fromCountry": from_country,
                "fromCity": from_city,
                "toCode": to_code,
                "toCountry": to_country,
                "toCity": to_city,
                "type": shp_type,
                "weight": f"{weight_kg:g} kg",
                "weightKg": weight_kg,
                "carrier": carrier,
                "amountInr": amount_inr,
                "status": status,
                "timeAgo": "Just now",
                "events": [
                    {
                        "timestamp": now_iso[:16].replace("T", " "),
                        "status": status,
                        "location": f"{from_city}, {from_country}",
                        "description": f"Shipment {trk} created via Admin Portal ({shp_type}, {weight_kg:g} kg via {carrier})."
                    }
                ]
            }
            store["shipments"].insert(0, new_shp)
            save_admin_store(store)
            return self._send_json(200, {"ok": True, "shipment": new_shp, "store": store})

        if action == "update_shipment":
            trk = str(payload.get("trackingNo") or "").strip().upper()
            new_status = str(payload.get("status") or "").strip()
            location = str(payload.get("location") or "").strip()
            description = str(payload.get("description") or "").strip()
            carrier = str(payload.get("carrier") or "").strip()
            for shp in store.get("shipments", []):
                if str(shp.get("trackingNo", "")).upper() == trk:
                    if new_status:
                        shp["status"] = new_status
                    if carrier:
                        shp["carrier"] = carrier
                    shp["updatedAt"] = now_iso
                    ev_list = shp.get("events") if isinstance(shp.get("events"), list) else []
                    ev_list.append({
                        "timestamp": now_iso[:16].replace("T", " "),
                        "status": new_status or shp.get("status", "In Transit"),
                        "location": location or shp.get("toCity") or shp.get("toCountry") or "Transit Hub",
                        "description": description or f"Shipment status updated to {shp['status']}."
                    })
                    shp["events"] = ev_list
                    save_admin_store(store)
                    return self._send_json(200, {"ok": True, "shipment": shp, "store": store})
            return self._send_json(404, {"ok": False, "error": f"Shipment {trk} not found."})

        if action == "save_partner":
            prt_id = str(payload.get("id") or f"PRT-{short_id}").strip()
            code = str(payload.get("code") or "").strip()
            name = str(payload.get("name") or "").strip()
            if not code or not name:
                return self._send_json(400, {"ok": False, "error": "Partner code and name are required."})
            partners = store.get("partners", [])
            existing = next((p for p in partners if p.get("id") == prt_id or p.get("code", "").lower() == code.lower()), None)
            if existing:
                existing["code"] = code
                existing["name"] = name
                existing["serviceZones"] = str(payload.get("serviceZones") or existing.get("serviceZones", "")).strip()
                existing["contactEmail"] = str(payload.get("contactEmail") or existing.get("contactEmail", "")).strip()
                existing["onTimePct"] = int(payload.get("onTimePct") or existing.get("onTimePct", 95))
                if "enabled" in payload:
                    existing["enabled"] = bool(payload["enabled"])
            else:
                partners.append({
                    "id": prt_id,
                    "code": code,
                    "name": name,
                    "shipments": int(payload.get("shipments") or 0),
                    "onTimePct": int(payload.get("onTimePct") or 96),
                    "enabled": bool(payload.get("enabled", True)),
                    "serviceZones": str(payload.get("serviceZones") or "Global International").strip(),
                    "contactEmail": str(payload.get("contactEmail") or "ops@partner.com").strip(),
                    "apiStatus": str(payload.get("apiStatus") or "Connected").strip(),
                })
            store["partners"] = partners
            save_admin_store(store)
            return self._send_json(200, {"ok": True, "store": store})

        if action == "toggle_partner":
            prt_id = str(payload.get("id") or "").strip()
            for p in store.get("partners", []):
                if p.get("id") == prt_id:
                    p["enabled"] = not bool(p.get("enabled", True))
                    save_admin_store(store)
                    return self._send_json(200, {"ok": True, "store": store})
            return self._send_json(404, {"ok": False, "error": "Partner not found."})

        if action == "save_pricing_rule":
            pkg_key = str(payload.get("pkgKey") or "").strip().lower()
            if pkg_key not in PACKAGE_RULES:
                return self._send_json(400, {"ok": False, "error": "Invalid package key."})
            max_w = parse_positive_float(payload.get("maxWeightKg"))
            div_v = parse_positive_float(payload.get("volumetricDivisor"))
            note = str(payload.get("ruleNote") or "").strip()
            if max_w:
                PACKAGE_RULES[pkg_key]["maxWeightKg"] = max_w
            if div_v:
                PACKAGE_RULES[pkg_key]["volumetricDivisor"] = div_v
            if note:
                PACKAGE_RULES[pkg_key]["ruleNote"] = note
            return self._send_json(200, {"ok": True, "packageRules": PACKAGE_RULES})

        if action == "save_additional_charge":
            chg_id = str(payload.get("id") or f"CHG-{short_id[:4]}").strip().upper()
            name = str(payload.get("name") or "").strip()
            chg_type = str(payload.get("type") or "Flat Fee").strip()
            amount = str(payload.get("amount") or "").strip()
            applies_to = str(payload.get("appliesTo") or "All Shipments").strip()
            active = bool(payload.get("active", True))
            if not name or not amount:
                return self._send_json(400, {"ok": False, "error": "Charge name and rate/fee amount are required."})
            charges = store.get("additionalCharges", [])
            existing = next((c for c in charges if str(c.get("id", "")).upper() == chg_id), None)
            if existing:
                existing.update({"name": name, "type": chg_type, "amount": amount, "appliesTo": applies_to, "active": active})
            else:
                charges.insert(0, {"id": chg_id, "name": name, "type": chg_type, "amount": amount, "appliesTo": applies_to, "active": active})
            store["additionalCharges"] = charges
            save_admin_store(store)
            return self._send_json(200, {"ok": True, "store": store})

        if action == "toggle_additional_charge":
            chg_id = str(payload.get("id") or "").strip().upper()
            for c in store.get("additionalCharges", []):
                if str(c.get("id", "")).upper() == chg_id:
                    c["active"] = not bool(c.get("active", True))
                    save_admin_store(store)
                    return self._send_json(200, {"ok": True, "store": store})
            return self._send_json(404, {"ok": False, "error": "Surcharge not found."})

        if action == "delete_additional_charge":
            chg_id = str(payload.get("id") or "").strip().upper()
            store["additionalCharges"] = [c for c in store.get("additionalCharges", []) if str(c.get("id", "")).upper() != chg_id]
            save_admin_store(store)
            return self._send_json(200, {"ok": True, "store": store})

        if action == "save_rate_plan":
            plan_id = str(payload.get("id") or f"PLAN-{short_id[:4]}").strip().upper()
            name = str(payload.get("name") or "").strip()
            transit = str(payload.get("transit") or "3–5 Business Days").strip()
            base_rate = parse_positive_float(payload.get("baseInrPerKg")) or 1500
            min_w = parse_positive_float(payload.get("minWeightKg")) or 0.5
            max_w = parse_positive_float(payload.get("maxWeightKg")) or 70
            carrier = str(payload.get("carrier") or "DHL / FedEx").strip()
            status = str(payload.get("status") or "Active").strip()
            if not name:
                return self._send_json(400, {"ok": False, "error": "Service tier name is required."})
            plans = store.get("ratePlans", [])
            existing = next((p for p in plans if str(p.get("id", "")).upper() == plan_id), None)
            if existing:
                existing.update({
                    "name": name,
                    "transit": transit,
                    "baseInrPerKg": base_rate,
                    "minWeightKg": min_w,
                    "maxWeightKg": max_w,
                    "carrier": carrier,
                    "status": status,
                })
            else:
                plans.insert(0, {
                    "id": plan_id,
                    "name": name,
                    "transit": transit,
                    "baseInrPerKg": base_rate,
                    "minWeightKg": min_w,
                    "maxWeightKg": max_w,
                    "carrier": carrier,
                    "status": status,
                })
            store["ratePlans"] = plans
            save_admin_store(store)
            return self._send_json(200, {"ok": True, "store": store})

        if action == "toggle_rate_plan":
            plan_id = str(payload.get("id") or "").strip().upper()
            for p in store.get("ratePlans", []):
                if str(p.get("id", "")).upper() == plan_id:
                    cur = str(p.get("status", "Active")).lower()
                    p["status"] = "Paused" if cur == "active" else "Active"
                    save_admin_store(store)
                    return self._send_json(200, {"ok": True, "store": store})
            return self._send_json(404, {"ok": False, "error": "Rate plan not found."})

        if action == "delete_rate_plan":
            plan_id = str(payload.get("id") or "").strip().upper()
            store["ratePlans"] = [p for p in store.get("ratePlans", []) if str(p.get("id", "")).upper() != plan_id]
            save_admin_store(store)
            return self._send_json(200, {"ok": True, "store": store})

        if action == "toggle_location":
            loc_type = str(payload.get("locType") or "countries").strip()
            key = str(payload.get("key") or "").strip()
            locs = store.get("locations", {})
            if loc_type == "countries":
                for c in locs.get("countries", []):
                    if c.get("code") == key:
                        c["serviceable"] = not bool(c.get("serviceable", True))
            elif loc_type == "regions":
                for r in locs.get("regions", []):
                    if r.get("code") == key:
                        r["active"] = not bool(r.get("active", True))
            elif loc_type == "cities":
                for ct in locs.get("cities", []):
                    if ct.get("city") == key:
                        ct["serviceable"] = not bool(ct.get("serviceable", True))
            elif loc_type == "coverageZones":
                for z in locs.get("coverageZones", []):
                    if z.get("code") == key:
                        z["active"] = not bool(z.get("active", True))
            save_admin_store(store)
            return self._send_json(200, {"ok": True, "store": store})

        if action == "save_coverage_zone":
            z_obj = payload.get("zoneItem") if isinstance(payload.get("zoneItem"), dict) else payload
            code = str(z_obj.get("code") or f"ZONE-{short_id[:4]}").strip().upper()
            zone_name = str(z_obj.get("zone") or "").strip()
            countries_str = str(z_obj.get("countries") or "").strip()
            transit = str(z_obj.get("transit") or "3–5 Business Days").strip()
            customs = str(z_obj.get("customs") or "Express Courier Clearance").strip()
            carriers = str(z_obj.get("carriers") or "DHL / FedEx / UPS").strip()
            coverage = str(z_obj.get("coverage") or "98.5% Doorstep").strip()
            active = bool(z_obj.get("active", True))
            if not code or not zone_name:
                return self._send_json(400, {"ok": False, "error": "Zone code and zone title are required."})
            zones = store.setdefault("locations", {}).setdefault("coverageZones", [])
            existing = next((z for z in zones if str(z.get("code", "")).upper() == code), None)
            new_zone = {
                "code": code,
                "zone": zone_name,
                "countries": countries_str,
                "transit": transit,
                "customs": customs,
                "carriers": carriers,
                "coverage": coverage,
                "active": active,
            }
            if existing:
                existing.update(new_zone)
            else:
                zones.append(new_zone)
            save_admin_store(store)
            return self._send_json(200, {"ok": True, "store": store})

        if action == "delete_coverage_zone":
            code = str(payload.get("code") or "").strip().upper()
            locs = store.setdefault("locations", {})
            locs["coverageZones"] = [z for z in locs.get("coverageZones", []) if str(z.get("code", "")).upper() != code]
            save_admin_store(store)
            return self._send_json(200, {"ok": True, "store": store})

        if action == "save_region":
            reg = payload.get("region") if isinstance(payload.get("region"), dict) else payload
            code = str(reg.get("code") or f"IN-{short_id[:4]}").strip().upper()
            name = str(reg.get("name") or "").strip()
            state = str(reg.get("state") or "").strip()
            gateway_airport = str(reg.get("gatewayAirport") or "").strip()
            daily_cutoff = str(reg.get("dailyCutoff") or "19:00 IST").strip()
            active = bool(reg.get("active", True))
            if not code or not name:
                return self._send_json(400, {"ok": False, "error": "Region code and hub name are required."})
            regions = store.setdefault("locations", {}).setdefault("regions", [])
            existing = next((r for r in regions if str(r.get("code", "")).upper() == code), None)
            new_reg = {
                "code": code,
                "name": name,
                "state": state,
                "gatewayAirport": gateway_airport,
                "dailyCutoff": daily_cutoff,
                "active": active,
            }
            if existing:
                existing.update(new_reg)
            else:
                regions.append(new_reg)
            save_admin_store(store)
            return self._send_json(200, {"ok": True, "store": store})

        if action == "delete_region":
            code = str(payload.get("code") or "").strip().upper()
            locs = store.setdefault("locations", {})
            locs["regions"] = [r for r in locs.get("regions", []) if str(r.get("code", "")).upper() != code]
            save_admin_store(store)
            return self._send_json(200, {"ok": True, "store": store})

        if action == "save_country":
            ctry = payload.get("country") if isinstance(payload.get("country"), dict) else payload
            code = str(ctry.get("code") or "").strip().upper()
            name = str(ctry.get("name") or "").strip()
            zone = str(ctry.get("zone") or "Zone C — UK & Europe").strip()
            transit_days = str(ctry.get("transitDays") or "3–5 Days").strip()
            customs_mode = str(ctry.get("customsMode") or "Express Courier Clearance").strip()
            serviceable = bool(ctry.get("serviceable", True))
            shipments_count = int(ctry.get("shipmentsCount") or 25)
            if not code or not name:
                return self._send_json(400, {"ok": False, "error": "Country ISO code and name are required."})
            countries = store.setdefault("locations", {}).setdefault("countries", [])
            existing = next((c for c in countries if str(c.get("code", "")).upper() == code), None)
            new_ctry = {
                "code": code,
                "name": name,
                "zone": zone,
                "transitDays": transit_days,
                "customsMode": customs_mode,
                "serviceable": serviceable,
                "shipmentsCount": existing.get("shipmentsCount", shipments_count) if existing else shipments_count,
            }
            if existing:
                existing.update(new_ctry)
            else:
                countries.append(new_ctry)
            save_admin_store(store)
            return self._send_json(200, {"ok": True, "store": store})

        if action == "delete_country":
            code = str(payload.get("code") or "").strip().upper()
            locs = store.setdefault("locations", {})
            locs["countries"] = [c for c in locs.get("countries", []) if str(c.get("code", "")).upper() != code]
            save_admin_store(store)
            return self._send_json(200, {"ok": True, "store": store})

        if action in ("add_city", "save_city"):
            ct_obj = payload.get("cityItem") if isinstance(payload.get("cityItem"), dict) else payload
            city = str(ct_obj.get("city") or "").strip()
            state = str(ct_obj.get("state") or "").strip()
            pin_prefix = str(ct_obj.get("pinPrefix") or "").strip()
            hub_code = str(ct_obj.get("hubCode") or "").strip().upper()
            same_day = bool(ct_obj.get("sameDayPickup", True))
            serviceable = bool(ct_obj.get("serviceable", True))
            if not city or not state:
                return self._send_json(400, {"ok": False, "error": "City and State are required."})
            cities = store.setdefault("locations", {}).setdefault("cities", [])
            existing = next((c for c in cities if str(c.get("city", "")).lower() == city.lower()), None)
            new_city = {
                "city": city,
                "state": state,
                "pinPrefix": pin_prefix or "000xxx",
                "sameDayPickup": same_day,
                "hubCode": hub_code or f"{city[:3].upper()}-HUB-01",
                "serviceable": serviceable,
            }
            if existing:
                existing.update(new_city)
            else:
                cities.append(new_city)
            save_admin_store(store)
            return self._send_json(200, {"ok": True, "store": store})

        if action == "delete_city":
            city = str(payload.get("city") or "").strip().lower()
            locs = store.setdefault("locations", {})
            locs["cities"] = [c for c in locs.get("cities", []) if str(c.get("city", "")).lower() != city]
            save_admin_store(store)
            return self._send_json(200, {"ok": True, "store": store})

        if action == "save_cms_page":
            page_id = str(payload.get("id") or f"PAGE-{short_id}").strip()
            title = str(payload.get("title") or "").strip()
            slug = str(payload.get("slug") or "").strip()
            meta_title = str(payload.get("metaTitle") or title).strip()
            meta_desc = str(payload.get("metaDescription") or "").strip()
            status = str(payload.get("status") or "Published").strip()
            if not title or not slug:
                return self._send_json(400, {"ok": False, "error": "Page title and URL slug are required."})
            pages = store.get("cmsPages", [])
            existing = next((p for p in pages if p.get("id") == page_id), None)
            if existing:
                existing.update({
                    "title": title,
                    "slug": slug,
                    "metaTitle": meta_title,
                    "metaDescription": meta_desc,
                    "status": status,
                    "updatedAt": now_iso[:10],
                })
            else:
                pages.append({
                    "id": page_id,
                    "title": title,
                    "slug": slug,
                    "file": "custom",
                    "metaTitle": meta_title,
                    "metaDescription": meta_desc,
                    "status": status,
                    "updatedAt": now_iso[:10],
                })
            store["cmsPages"] = pages
            save_admin_store(store)
            return self._send_json(200, {"ok": True, "store": store})

        if action == "save_blog_post":
            post_id = str(payload.get("id") or f"BLOG-{short_id}").strip()
            title = str(payload.get("title") or "").strip()
            slug = str(payload.get("slug") or "").strip()
            category = str(payload.get("category") or "Shipping Guides").strip()
            tags = str(payload.get("tags") or "").strip()
            featured_image = str(payload.get("featuredImage") or "/assets/card2_parcel.png").strip()
            status = str(payload.get("status") or "Published").strip()
            excerpt = str(payload.get("excerpt") or "").strip()
            if not title:
                return self._send_json(400, {"ok": False, "error": "Blog post title is required."})
            if not slug:
                slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
            posts = store.get("blogPosts", [])
            existing = next((b for b in posts if b.get("id") == post_id), None)
            if existing:
                existing.update({
                    "title": title,
                    "slug": slug,
                    "category": category,
                    "tags": tags,
                    "featuredImage": featured_image,
                    "status": status,
                    "excerpt": excerpt,
                })
            else:
                posts.insert(0, {
                    "id": post_id,
                    "title": title,
                    "slug": slug,
                    "category": category,
                    "tags": tags,
                    "featuredImage": featured_image,
                    "status": status,
                    "author": "Admin User",
                    "publishedAt": datetime.datetime.now().strftime("%d %b %Y"),
                    "excerpt": excerpt,
                })
            store["blogPosts"] = posts
            save_admin_store(store)
            return self._send_json(200, {"ok": True, "store": store})

        if action == "save_settings":
            section = str(payload.get("section") or "general").strip()
            values = payload.get("values")
            if isinstance(values, dict):
                store.setdefault("settings", {})[section] = values
                save_admin_store(store)
                return self._send_json(200, {"ok": True, "store": store})
            return self._send_json(400, {"ok": False, "error": "Invalid settings payload."})

        return self._send_json(400, {"ok": False, "error": f"Unknown admin action '{action}'."})


if __name__ == "__main__":
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    socketserver.ThreadingTCPServer.daemon_threads = True
    candidate_ports = [PORT] + [p for p in (8080, 8001, 3000, 5000) if p != PORT]
    for candidate_port in candidate_ports:
        try:
            with socketserver.ThreadingTCPServer(("", candidate_port), CleanRouteHTTPRequestHandler) as httpd:
                print(f"Serving Trisys Express on http://localhost:{candidate_port}", flush=True)
                httpd.serve_forever()
            break
        except (PermissionError, OSError):
            if candidate_port == candidate_ports[-1]:
                raise
