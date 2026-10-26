"""Local development server for Trisys Express with clean route, service enquiry,
business solutions, business account registration, and admin review API support.

Supports clean page routes:
  /                               -> index.html
  /quote-result, /quote           -> quote-result.html
  /medicine-courier, /medicine    -> quote-result.html?type=medicine
  /ecommerce-logistics, /ecommerce-> quote-result.html?type=ecommerce
  /bulk-commercial, /bulk         -> quote-result.html?type=bulk
  /document-courier               -> quote-result.html?type=document
  /parcel-shipping                -> quote-result.html?type=parcel
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

PORT = 8000
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
ENQUIRIES_FILE = os.path.join(DATA_DIR, "service_enquiries.json")
BUSINESS_RECORDS_FILE = os.path.join(DATA_DIR, "business_records.json")
BUSINESS_ACCOUNTS_FILE = os.path.join(DATA_DIR, "business_accounts.json")
SUPPORT_ENQUIRIES_FILE = os.path.join(DATA_DIR, "support_enquiries.json")
CUSTOMS_DOCS_FILE = os.path.join(DATA_DIR, "customs_documents.json")
PICKUPS_FILE = os.path.join(DATA_DIR, "pickups.json")
QUOTES_FILE = os.path.join(DATA_DIR, "quotes.json")

ADMIN_PASSCODE = os.environ.get("TRISYS_ADMIN_PASSCODE", "TRISYS-ADMIN-2026")
PUBLIC_BASE_URL = os.environ.get("TRISYS_PUBLIC_BASE_URL", "").strip().rstrip("/")
CARRIER_API_KEY = os.environ.get("TRISYS_CARRIER_API_KEY", "").strip()
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
    "/parcel-shipping": "/quote-result.html?type=parcel",
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
    "/business/admin": "/business-solutions.html?section=admin",
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
            pkg_type = (query_params.get("type", ["document"])[0] or "document").strip().lower()
            weight_raw = (query_params.get("weight", ["1"])[0] or "").strip()
            unit = (query_params.get("unit", ["kg"])[0] or "kg").strip().lower()
            length_raw = (query_params.get("length", [""])[0] or "").strip()
            width_raw = (query_params.get("width", [""])[0] or "").strip()
            height_raw = (query_params.get("height", [""])[0] or "").strip()

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
            if length_raw or width_raw or height_raw:
                l_val = parse_positive_float(length_raw)
                w_val = parse_positive_float(width_raw)
                h_val = parse_positive_float(height_raw)
                if l_val is None or w_val is None or h_val is None:
                    return self._send_json(400, {
                        "ok": False,
                        "error": "When entering package dimensions, Length, Width, and Height (cm) must all be positive numbers.",
                    })
                dimensions_cm = {"length": l_val, "width": w_val, "height": h_val}
                volumetric_kg = round((l_val * w_val * h_val) / rule["volumetricDivisor"], 2)

            chargeable_kg = round(max(actual_kg, volumetric_kg), 2) if volumetric_kg is not None else actual_kg
            chargeable_lb = round(chargeable_kg * 2.20462, 2)

            service_tiers = [
                {
                    "tierId": "nfo",
                    "name": "Next Flight Out (Priority Air)",
                    "transitTime": "2–3 Business Days",
                    "pickupMode": "Same-Day Doorstep Collection",
                    "trackingLevel": "Real-Time Milestone & Hub Scans",
                    "customsClearance": "Priority Export / Express Clearance",
                    "chargeableWeightKg": chargeable_kg,
                    "priceDisplay": None,
                    "rateStatus": "Live Carrier API Required",
                },
                {
                    "tierId": "express",
                    "name": "Express Air Saver",
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
                    "priceDisplay": None,
                    "rateStatus": "Live Carrier API Required",
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
                    "transitTime": "6–9 Business Days",
                    "pickupMode": "Scheduled Doorstep / Dock Pickup",
                    "trackingLevel": "Milestone Tracking & Delivery Confirmation",
                    "customsClearance": (
                        "Commercial Shipping Bill / LUT / BOE"
                        if pkg_type == "bulk"
                        else "Consolidated Customs Clearance"
                    ),
                    "chargeableWeightKg": chargeable_kg,
                    "priceDisplay": None,
                    "rateStatus": "Live Carrier API Required",
                },
            ]

            return self._send_json(200, {
                "ok": True,
                "livePricingConfigured": bool(CARRIER_API_KEY),
                "query": {
                    "from": origin,
                    "to": destination,
                    "type": pkg_type,
                    "typeLabel": rule["label"],
                    "weight": weight_val,
                    "unit": unit,
                    "actualWeightKg": actual_kg,
                    "actualWeightLb": actual_lb,
                    "volumetricWeightKg": volumetric_kg,
                    "chargeableWeightKg": chargeable_kg,
                    "chargeableWeightLb": chargeable_lb,
                    "dimensionsCm": dimensions_cm,
                    "maxWeightKg": max_kg,
                    "ruleNote": rule["ruleNote"],
                },
                "serviceTiers": service_tiers,
                "statusMessage": (
                    f"Route ({origin} → {destination}) and chargeable weight ({chargeable_kg:g} kg / {chargeable_lb:g} lb) verified for {rule['label']}. "
                    "Live carrier tariff pricing is not configured in this environment (TRISYS_CARRIER_API_KEY not set) — no sample or fabricated prices are shown. "
                    "Use 'Get a Quote' or 'Schedule Pickup' to receive a verified rate confirmation from our dispatch team."
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
            awb = (query_params.get("awb", [""])[0] or "").strip().upper()
            if not awb or len(awb) < 4 or not re.match(r"^[A-Z0-9\-]+$", awb):
                return self._send_json(400, {
                    "ok": False,
                    "error": "Please enter a valid Airway Bill (AWB) or Trisys Reference Number (4–30 alphanumeric characters).",
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
                "carrierTrackingApiConfigured": bool(CARRIER_API_KEY),
                "message": (
                    f"No shipment, pickup booking (TRISYS-PKP-*), or quote record (TRISYS-QTE-*) was found in the local database for '{awb}', "
                    "and external carrier AWB tracking API integration is not configured (TRISYS_CARRIER_API_KEY missing). "
                    "No fabricated tracking milestones are displayed."
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

        if clean_path in ROUTE_MAP:
            target = ROUTE_MAP[clean_path]
            target_split = urllib.parse.urlsplit(target)
            target_params = urllib.parse.parse_qs(target_split.query, keep_blank_values=True)
            req_params = urllib.parse.parse_qs(parsed.query, keep_blank_values=True)
            merged_params = {**target_params, **req_params}
            merged_query = urllib.parse.urlencode(merged_params, doseq=True)
            self.path = f"{target_split.path}?{merged_query}" if merged_query else target_split.path
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

        return self._send_json(404, {"ok": False, "error": "Endpoint not found."})

    def _handle_service_enquiry(self, payload, now_iso, short_id):
        service_type = str(payload.get("serviceType") or "").strip().lower()

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
            volumetric_per_parcel_kg = round((length * width * height) / 5000.0, 2)
            total_volumetric_kg = round(volumetric_per_parcel_kg * parcel_qty, 2)
            chargeable_kg = round(max(actual_kg, total_volumetric_kg), 2)

            enquiry_id = f"TRISYS-ECOM-{short_id}"
            record = {
                "enquiryId": enquiry_id,
                "serviceType": "ecommerce",
                "createdAt": now_iso,
                "storeName": store_name,
                "contactName": contact_name,
                "email": email,
                "phone": phone,
                "originCountry": origin_country,
                "destCountry": dest_country,
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
                "status": "Pending",
                "liveRateAvailable": False,
                "liveBookingConfirmed": False,
            }
            save_enquiry(record)
            return self._send_json(200, {
                "ok": True,
                "enquiry": record,
                "message": (
                    f"E-commerce Logistics enquiry {enquiry_id} has been validated and saved. "
                    "Live carrier rate calculation and automated AWB shipment booking require external carrier API integration."
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
            total_volume_cbm = round((length * width * height * pallet_qty) / 1000000.0, 3)
            volumetric_kg = round((length * width * height * pallet_qty) / 6000.0, 2)
            chargeable_kg = round(max(actual_kg, volumetric_kg), 2)

            enquiry_id = f"TRISYS-BULK-{short_id}"
            record = {
                "enquiryId": enquiry_id,
                "serviceType": "bulk",
                "createdAt": now_iso,
                "companyName": company_name,
                "contactPerson": contact_person,
                "email": email,
                "phone": phone,
                "originCountry": origin_country,
                "destCountry": dest_country,
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
                "status": "Pending",
                "liveRateAvailable": False,
                "liveBookingConfirmed": False,
            }
            save_enquiry(record)
            return self._send_json(200, {
                "ok": True,
                "enquiry": record,
                "message": (
                    f"Bulk & Commercial freight enquiry {enquiry_id} has been validated and saved. "
                    "Live freight carrier quotation pricing and cargo space booking require external carrier API integration."
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
        pkg_type = str(payload.get("packageType") or "document").strip().lower()
        weight = parse_positive_float(payload.get("weight"))
        weight_unit = str(payload.get("weightUnit") or "kg").strip().lower()
        length = parse_positive_float(payload.get("length"))
        width = parse_positive_float(payload.get("width"))
        height = parse_positive_float(payload.get("height"))
        service_tier = str(payload.get("serviceTier") or "Express Air Saver (3–5 Business Days)").strip()
        prescription_confirmed = bool(payload.get("prescriptionConfirmed"))
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

        if pkg_type == "medicine" and not prescription_confirmed:
            return self._send_json(400, {
                "ok": False,
                "error": "For Medicine Courier shipments, please confirm that you hold a valid doctor's prescription and pharmacy purchase invoice.",
            })

        volumetric_kg = None
        dimensions_cm = None
        if length is not None and width is not None and height is not None:
            dimensions_cm = {"length": length, "width": width, "height": height}
            volumetric_kg = round((length * width * height) / rule["volumetricDivisor"], 2)

        chargeable_kg = round(max(actual_kg, volumetric_kg), 2) if volumetric_kg is not None else actual_kg

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
            "packageType": pkg_type,
            "packageTypeLabel": rule["label"],
            "weight": weight,
            "weightUnit": weight_unit,
            "actualWeightKg": actual_kg,
            "volumetricWeightKg": volumetric_kg,
            "chargeableWeightKg": chargeable_kg,
            "dimensionsCm": dimensions_cm,
            "serviceTier": service_tier,
            "prescriptionConfirmed": prescription_confirmed if pkg_type == "medicine" else None,
            "notes": notes,
            "liveRateAvailable": bool(CARRIER_API_KEY),
        }
        save_quote(record)
        return self._send_json(200, {
            "ok": True,
            "quote": record,
            "message": (
                f"Shipping Quote Request {quote_id} ({origin_country} → {dest_country}, {rule['label']}, chargeable weight {chargeable_kg:g} kg) "
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

        return self._send_json(404, {"ok": False, "error": f"Submission '{ref_id}' not found."})


if __name__ == "__main__":
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    socketserver.ThreadingTCPServer.daemon_threads = True
    with socketserver.ThreadingTCPServer(("", PORT), CleanRouteHTTPRequestHandler) as httpd:
        print(f"Serving Trisys Express on http://localhost:{PORT}", flush=True)
        httpd.serve_forever()
