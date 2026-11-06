/* ==========================================================================
   TRISYS EXPRESS — ADMIN DASHBOARD ROUTER, SIDEBAR & BACKEND INTEGRATION
   Supports all 12 sidebar sections, 6 expandable submenus, direct URL access,
   browser refresh, Back/Forward history, and live backend persistence.
   ========================================================================== */

const ADMIN_API_KEY = 'TRISYS-ADMIN-2026';

// Crisp inline SVG flags
const ADM_FLAGS = {
  IN: `<svg viewBox="0 0 24 16"><rect width="24" height="5.34" fill="#FF9933"/><rect y="5.33" width="24" height="5.34" fill="#FFFFFF"/><rect y="10.66" width="24" height="5.34" fill="#138808"/><circle cx="12" cy="8" r="2" fill="none" stroke="#000080" stroke-width="0.5"/></svg>`,
  US: `<svg viewBox="0 0 24 16"><rect width="24" height="16" fill="#B22234"/><rect y="2.4" width="24" height="1.2" fill="#FFF"/><rect y="4.8" width="24" height="1.2" fill="#FFF"/><rect y="7.2" width="24" height="1.2" fill="#FFF"/><rect y="9.6" width="24" height="1.2" fill="#FFF"/><rect y="12" width="24" height="1.2" fill="#FFF"/><rect y="14.4" width="24" height="1.2" fill="#FFF"/><rect width="10" height="8.5" fill="#3C3B6E"/></svg>`,
  GB: `<svg viewBox="0 0 60 30"><rect width="60" height="30" fill="#012169"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#FFF" stroke-width="6"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" stroke-width="2.5"/><path d="M30,0 V30 M0,15 H60" stroke="#FFF" stroke-width="10"/><path d="M30,0 V30 M0,15 H60" stroke="#C8102E" stroke-width="6"/></svg>`,
  AU: `<svg viewBox="0 0 24 16"><rect width="24" height="16" fill="#012169"/><rect width="12" height="8" fill="#012169"/><path d="M0,0 L12,8 M12,0 L0,8" stroke="#FFF" stroke-width="1.6"/><path d="M6,0 V8 M0,4 H12" stroke="#FFF" stroke-width="2.4"/><path d="M6,0 V8 M0,4 H12" stroke="#C8102E" stroke-width="1.4"/><circle cx="6" cy="12" r="1.4" fill="#FFF"/><circle cx="18" cy="4" r="1" fill="#FFF"/><circle cx="16" cy="8" r="1" fill="#FFF"/><circle cx="20" cy="7" r="1" fill="#FFF"/><circle cx="18" cy="12.5" r="1.1" fill="#FFF"/></svg>`,
  CA: `<svg viewBox="0 0 24 16"><rect width="24" height="16" fill="#FFF"/><rect width="6" height="16" fill="#D80621"/><rect x="18" width="6" height="16" fill="#D80621"/><circle cx="12" cy="8" r="2.8" fill="#D80621"/></svg>`,
  AE: `<svg viewBox="0 0 24 16"><rect width="24" height="5.34" fill="#00732F"/><rect y="5.33" width="24" height="5.34" fill="#FFF"/><rect y="10.66" width="24" height="5.34" fill="#000"/><rect width="6" height="16" fill="#FF0000"/></svg>`,
  DE: `<svg viewBox="0 0 24 16"><rect width="24" height="5.34" fill="#000"/><rect y="5.33" width="24" height="5.34" fill="#DD0000"/><rect y="10.66" width="24" height="5.34" fill="#FFCE00"/></svg>`,
  SG: `<svg viewBox="0 0 24 16"><rect width="24" height="8" fill="#EF3340"/><rect y="8" width="24" height="8" fill="#FFF"/><circle cx="6" cy="4" r="2.2" fill="#FFF"/></svg>`
};

function esc(val) {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function statusPillClass(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('deliver') || s.includes('approv') || s.includes('confirm') || s.includes('publish') || s.includes('resolv') || s.includes('active') || s.includes('connect')) return 'delivered';
  if (s.includes('transit') || s.includes('pick') || s.includes('assign') || s.includes('review')) return 'transit';
  if (s.includes('book') || s.includes('schedul') || s.includes('open')) return 'booked';
  return 'pending';
}

// Route table mapping every sidebar link & submenu item
const ADMIN_ROUTES = {
  '/admin': { section: 'dashboard', parent: null, title: 'Dashboard', sub: 'Overview of your logistics operations' },
  '/admin/dashboard': { section: 'dashboard', parent: null, title: 'Dashboard', sub: 'Overview of your logistics operations' },
  '/dashboard': { section: 'dashboard', parent: null, title: 'Dashboard', sub: 'Overview of your logistics operations' },
  '/business/admin': { section: 'dashboard', parent: null, title: 'Dashboard', sub: 'Overview of your logistics operations' },

  // 2. Shipments
  '/admin/shipments': { section: 'shipments', subView: 'all', parent: 'shipments', title: 'All Shipments', sub: 'View, filter, and manage all international courier consignments' },
  '/admin/shipments/create': { section: 'shipments', subView: 'create', parent: 'shipments', title: 'Create Shipment', sub: 'Book a new international shipment and generate a tracking AWB' },
  '/admin/shipments/pending': { section: 'shipments', subView: 'pending', parent: 'shipments', title: 'Pending Shipments', sub: 'Shipments awaiting KYC verification, customs clearance, or pickup' },
  '/admin/shipments/in-transit': { section: 'shipments', subView: 'in-transit', parent: 'shipments', title: 'In Transit Shipments', sub: 'Active air consignments moving across international hubs' },
  '/admin/shipments/delivered': { section: 'shipments', subView: 'delivered', parent: 'shipments', title: 'Delivered Shipments', sub: 'Completed door-to-door deliveries with proof of delivery' },
  '/admin/shipments/cancelled': { section: 'shipments', subView: 'cancelled', parent: 'shipments', title: 'Cancelled or Returned Shipments', sub: 'Cancelled bookings and returned consignments' },

  // 3. Tracking
  '/admin/tracking': { section: 'tracking', subView: 'lookup', parent: 'tracking', title: 'Track Shipment', sub: 'Search by AWB, Pickup Ref (TRISYS-PKP-*), or Quote ID (TRISYS-QTE-*)' },
  '/admin/tracking/history': { section: 'tracking', subView: 'history', parent: 'tracking', title: 'Tracking History', sub: 'Complete audit log of tracked consignments and scan timestamps' },
  '/admin/tracking/events': { section: 'tracking', subView: 'events', parent: 'tracking', title: 'Tracking Events', sub: 'Append and manage live hub scan milestones for active shipments' },
  '/admin/tracking/delivery-status': { section: 'tracking', subView: 'delivery-status', parent: 'tracking', title: 'Delivery Status', sub: 'Monitor SLA performance and final-mile delivery status' },

  // 4. Bookings
  '/admin/bookings': { section: 'bookings', subView: 'all', parent: 'bookings', title: 'All Bookings', sub: 'Doorstep pickup bookings and commercial service enquiries' },
  '/admin/bookings/new': { section: 'bookings', subView: 'new', parent: 'bookings', title: 'New Booking', sub: 'Schedule a doorstep pickup booking directly in the backend database' },
  '/admin/bookings/pending': { section: 'bookings', subView: 'pending', parent: 'bookings', title: 'Pending Bookings', sub: 'Pickup requests awaiting courier assignment or KYC check' },
  '/admin/bookings/confirmed': { section: 'bookings', subView: 'confirmed', parent: 'bookings', title: 'Confirmed Bookings', sub: 'Assigned, picked up, and approved bookings' },
  '/admin/bookings/cancelled': { section: 'bookings', subView: 'cancelled', parent: 'bookings', title: 'Cancelled Bookings', sub: 'Cancelled or rejected pickup and service requests' },

  // 5. Customers
  '/admin/customers': { section: 'customers', parent: null, title: 'Customers', sub: 'Registered corporate accounts, individual shippers, and shipment history' },

  // 6. Rates & Pricing
  '/admin/rates/calculator': { section: 'rates', subView: 'calculator', parent: 'rates', title: 'Rate Calculator', sub: 'Verify actual vs volumetric weight and carrier service tiers via /api/rates' },
  '/admin/rates/pricing-rules': { section: 'rates', subView: 'pricing-rules', parent: 'rates', title: 'Pricing Rules', sub: 'Configure max weights and volumetric divisors for each package category' },
  '/admin/rates/shipping-rates': { section: 'rates', subView: 'shipping-rates', parent: 'rates', title: 'Shipping Rates', sub: 'International destination corridor tariff status and base rates' },
  '/admin/rates/additional-charges': { section: 'rates', subView: 'additional-charges', parent: 'rates', title: 'Additional Charges', sub: 'Fuel surcharge, prescription handling, remote area, and CSB-V export fees' },
  '/admin/rates/rate-plans': { section: 'rates', subView: 'rate-plans', parent: 'rates', title: 'Manage Rate Plans', sub: 'Next Flight Out, Express Air Saver, Economy Air, and B2B Freight plans' },
  '/admin/rates/plans': { section: 'rates', subView: 'rate-plans', parent: 'rates', title: 'Manage Rate Plans', sub: 'Next Flight Out, Express Air Saver, Economy Air, and B2B Freight plans' },

  // 7. Courier Partners
  '/admin/courier-partners': { section: 'partners', parent: null, title: 'Courier Partners', sub: 'Manage international carrier integrations, SLA metrics, and shipment assignments' },

  // 8. Countries & Cities
  '/admin/locations/countries': { section: 'locations', subView: 'countries', parent: 'countries', title: 'Countries', sub: 'Manage destination countries, transit zones, and customs clearance modes' },
  '/admin/locations/regions': { section: 'locations', subView: 'regions', parent: 'countries', title: 'States or Regions', sub: 'Indian export gateway regions, airports, and daily uplift cutoffs' },
  '/admin/locations/cities': { section: 'locations', subView: 'cities', parent: 'countries', title: 'Cities', sub: 'Origin pickup cities, PIN prefixes, and local hub codes' },
  '/admin/locations/serviceable-areas': { section: 'locations', subView: 'serviceable-areas', parent: 'countries', title: 'Serviceable Areas', sub: 'Enable or disable doorstep pickup and delivery coverage by location' },
  '/admin/locations/delivery-coverage': { section: 'locations', subView: 'delivery-coverage', parent: 'countries', title: 'Delivery Coverage', sub: 'Global zone matrix and 200+ destination coverage summary' },

  // 9. Reports
  '/admin/reports': { section: 'reports', parent: null, title: 'Reports', sub: 'Operational analytics, revenue summaries, customer activity, and CSV exports' },

  // 10. CMS / Pages
  '/admin/cms': { section: 'cms', parent: null, title: 'CMS / Pages', sub: 'Manage website pages, clean routes, SEO metadata, and publish status' },

  // 11. Blog
  '/admin/blog': { section: 'blog', parent: null, title: 'Blog', sub: 'Create, edit, and publish international shipping guides and compliance articles' },

  // 12. Settings
  '/admin/settings/general': { section: 'settings', subView: 'general', parent: 'settings', title: 'General Settings', sub: 'Portal title, timezone, currency, and operational preferences' },
  '/admin/settings/company': { section: 'settings', subView: 'company', parent: 'settings', title: 'Company Information', sub: 'Legal entity details, GSTIN, IEC code, and 24/7 support contacts' },
  '/admin/settings/branding': { section: 'settings', subView: 'branding', parent: 'settings', title: 'Branding and Logo', sub: 'Brand colors, light/dark logos, and portal identity' },
  '/admin/settings/notifications': { section: 'settings', subView: 'notifications', parent: 'settings', title: 'Email and Notifications', sub: 'Configure booking alerts, AWB dispatch emails, and WhatsApp notifications' },
  '/admin/settings/shipping': { section: 'settings', subView: 'shipping', parent: 'settings', title: 'Shipping Configuration', sub: 'Default origin, volumetric divisors, and package weight thresholds' },
  '/admin/settings/roles': { section: 'settings', subView: 'roles', parent: 'settings', title: 'User Roles and Permissions', sub: 'Role-based access matrix for Super Admin, Dispatch, Customs, and Support' },
  '/admin/settings/security': { section: 'settings', subView: 'security', parent: 'settings', title: 'Security Settings', sub: 'Admin API authentication, PBKDF2 hashing parameters, and session controls' }
};

// State
const admState = {
  currentPath: '/admin',
  filterText: '',
  reportTab: 'shipments',
  pagination: {
    'tracking-history': { page: 1, pageSize: 5 },
    'delivery-status': { page: 1, pageSize: 5 }
  },
  store: {
    shipments: [
      { trackingNo: 'TRX123456789', date: '13 Oct 2026', customer: 'Arun DM', email: 'arun.dm@example.com', phone: '+91 98201 11223', fromCode: 'IN', fromCountry: 'India', fromCity: 'Mumbai, MH', toCode: 'US', toCountry: 'USA', toCity: 'New York, NY', type: 'Document', weight: '1.0 kg', weightKg: 1.0, carrier: 'DHL', amountInr: 3450, status: 'Booked', timeAgo: '2 min ago', events: [{ timestamp: '2026-10-13 10:12', status: 'Booked', location: 'Mumbai Hub, India', description: 'Shipment booked and AWB generated.' }] },
      { trackingNo: 'TRX123456788', date: '13 Oct 2026', customer: 'John Smith', email: 'john.smith@ukmail.co.uk', phone: '+44 7700 900077', fromCode: 'IN', fromCountry: 'India', fromCity: 'Bengaluru, KA', toCode: 'GB', toCountry: 'UK', toCity: 'London', type: 'Medicine', weight: '2.5 kg', weightKg: 2.5, carrier: 'FedEx', amountInr: 6890, status: 'In Transit', timeAgo: '15 min ago', events: [{ timestamp: '2026-10-13 10:05', status: 'In Transit', location: 'Bengaluru Intl Airport', description: 'Cleared export customs; uplifted to London.' }] },
      { trackingNo: 'TRX123456787', date: '12 Oct 2026', customer: 'Sarah Wilson', email: 'sarah.wilson@auspost.au', phone: '+61 412 345 678', fromCode: 'IN', fromCountry: 'India', fromCity: 'Chennai, TN', toCode: 'AU', toCountry: 'Australia', toCity: 'Sydney, NSW', type: 'Parcel', weight: '3.0 kg', weightKg: 3.0, carrier: 'DHL', amountInr: 7920, status: 'Delivered', timeAgo: '32 min ago', events: [{ timestamp: '2026-10-12 16:40', status: 'Delivered', location: 'Sydney, Australia', description: 'Delivered to consignee — signed by S. WILSON.' }] },
      { trackingNo: 'TRX123456786', date: '12 Oct 2026', customer: 'Adil Khan', email: 'adil.khan@torontomed.ca', phone: '+1 416 555 0192', fromCode: 'IN', fromCountry: 'India', fromCity: 'Hyderabad, TS', toCode: 'CA', toCountry: 'Canada', toCity: 'Toronto, ON', type: 'Medicine', weight: '1.2 kg', weightKg: 1.2, carrier: 'UPS', amountInr: 4950, status: 'In Transit', timeAgo: '1 hour ago', events: [{ timestamp: '2026-10-12 18:30', status: 'In Transit', location: 'Hyderabad Air Cargo', description: 'Dispatched via UPS Worldwide Express to Toronto.' }] },
      { trackingNo: 'TRX123456785', date: '12 Oct 2026', customer: 'Priya Nair', email: 'priya.nair@emiratesbiz.ae', phone: '+971 50 443 9981', fromCode: 'IN', fromCountry: 'India', fromCity: 'Kochi, KL', toCode: 'AE', toCountry: 'UAE', toCity: 'Dubai', type: 'Document', weight: '0.8 kg', weightKg: 0.8, carrier: 'Aramex', amountInr: 2180, status: 'Pending', timeAgo: '2 hours ago', events: [{ timestamp: '2026-10-12 09:05', status: 'Pending', location: 'Kochi, India', description: 'Awaiting sender KYC verification prior to dispatch.' }] }
    ],
    partners: [],
    additionalCharges: [
      { id: 'CHG-FUEL', name: 'International Aviation Fuel Surcharge', type: 'Percentage', amount: '14.5%', appliesTo: 'All Air Shipments', status: 'Active' },
      { id: 'CHG-MED', name: 'Medicine Cold-Chain & Rx Verification', type: 'Flat Fee', amount: '₹ 450', appliesTo: 'Medicine Courier', status: 'Active' },
      { id: 'CHG-REMOTE', name: 'Out-of-Delivery-Area (ODA) Surcharge', type: 'Flat Fee', amount: '₹ 1,250', appliesTo: 'Remote ZIP/Postal Codes', status: 'Active' },
      { id: 'CHG-CSBV', name: 'CSB-V Export Customs Filing Fee', type: 'Flat Fee', amount: '₹ 650', appliesTo: 'E-commerce Exports', status: 'Active' },
      { id: 'CHG-SEC', name: 'Air Cargo X-Ray & Aviation Security Fee', type: 'Per Kg', amount: '₹ 45 / kg (min ₹ 250)', appliesTo: 'All International Air Cargo', status: 'Active' },
      { id: 'CHG-DDP', name: 'Delivered Duty Paid (DDP) Disbursement', type: 'Flat Fee', amount: '₹ 950', appliesTo: 'Prepaid Duty Commercial Shipments', status: 'Active' },
      { id: 'CHG-OVERSIZE', name: 'Non-Stackable / Oversize Piece Handling', type: 'Flat Fee', amount: '₹ 1,800', appliesTo: 'Single Piece > 30 kg or > 120 cm', status: 'Active' },
      { id: 'CHG-BOE', name: 'Commercial Bill of Entry / AD Code Clearance', type: 'Flat Fee', amount: '₹ 1,100', appliesTo: 'Bulk & Commercial Cargo', status: 'Active' }
    ],
    ratePlans: [
      { id: 'PLAN-NFO', name: 'Next Flight Out (Critical)', transit: '24–48 Hours', baseInrPerKg: 2150, minWeightKg: 0.5, maxWeightKg: 70, carrier: 'DHL / FedEx Priority', status: 'Active' },
      { id: 'PLAN-EXP', name: 'Express Air Saver', transit: '3–5 Business Days', baseInrPerKg: 1380, minWeightKg: 0.5, maxWeightKg: 70, carrier: 'DHL / FedEx / UPS', status: 'Active' },
      { id: 'PLAN-ECO', name: 'Deferred Economy Air', transit: '5–8 Business Days', baseInrPerKg: 980, minWeightKg: 1.0, maxWeightKg: 100, carrier: 'UPS / Aramex', status: 'Active' },
      { id: 'PLAN-BULK', name: 'Commercial B2B Freight', transit: '5–10 Business Days', baseInrPerKg: 720, minWeightKg: 25.0, maxWeightKg: 5000, carrier: 'Cathay / Lufthansa Cargo', status: 'Active' },
      { id: 'PLAN-DOC', name: 'Global University & Legal Doc Express', transit: '2–4 Business Days', baseInrPerKg: 1290, minWeightKg: 0.5, maxWeightKg: 5, carrier: 'DHL Express Envelope', status: 'Active' },
      { id: 'PLAN-MED', name: 'Life-Saving Medicine Priority Desk', transit: '3–5 Business Days', baseInrPerKg: 1520, minWeightKg: 0.5, maxWeightKg: 70, carrier: 'FedEx Priority / DHL Medical', status: 'Active' },
      { id: 'PLAN-ECOM', name: 'CSB-V Cross-Border D2C Parcel', transit: '4–7 Business Days', baseInrPerKg: 1090, minWeightKg: 0.5, maxWeightKg: 70, carrier: 'Aramex / DHL eCommerce', status: 'Active' },
      { id: 'PLAN-GCC', name: 'GCC & Middle East Direct Linehaul', transit: '2–4 Business Days', baseInrPerKg: 890, minWeightKg: 1.0, maxWeightKg: 250, carrier: 'Aramex Priority / Emirates SkyCargo', status: 'Active' }
    ],
    locations: {
      countries: [
        { code: 'US', name: 'United States', zone: 'Zone D — North America', transitDays: '3–4 Days', customsMode: 'De Minimis $800 / Formal', serviceable: true, shipmentsCount: 350 },
        { code: 'GB', name: 'United Kingdom', zone: 'Zone C — UK & Europe', transitDays: '3–4 Days', customsMode: 'UK HMRC EORI / DDU & DDP', serviceable: true, shipmentsCount: 225 },
        { code: 'AU', name: 'Australia', zone: 'Zone F — Oceania', transitDays: '4–5 Days', customsMode: 'ABF Biosecurity & GST', serviceable: true, shipmentsCount: 180 },
        { code: 'CA', name: 'Canada', zone: 'Zone D — North America', transitDays: '3–5 Days', customsMode: 'CBSA Commercial / Personal', serviceable: true, shipmentsCount: 120 },
        { code: 'AE', name: 'United Arab Emirates', zone: 'Zone A — Middle East', transitDays: '2–3 Days', customsMode: 'Dubai Customs Direct', serviceable: true, shipmentsCount: 98 },
        { code: 'DE', name: 'Germany', zone: 'Zone C — UK & Europe', transitDays: '3–5 Days', customsMode: 'EU ICS2 / ATLAS Clearance', serviceable: true, shipmentsCount: 86 },
        { code: 'SG', name: 'Singapore', zone: 'Zone B — Southeast Asia', transitDays: '2–3 Days', customsMode: 'SG TradeNet Direct', serviceable: true, shipmentsCount: 64 },
        { code: 'SA', name: 'Saudi Arabia', zone: 'Zone A — Middle East', transitDays: '3–4 Days', customsMode: 'ZATCA FASAH Clearance', serviceable: true, shipmentsCount: 58 },
        { code: 'FR', name: 'France', zone: 'Zone C — UK & Europe', transitDays: '3–5 Days', customsMode: 'EU ICS2 / Delta G', serviceable: true, shipmentsCount: 49 },
        { code: 'JP', name: 'Japan', zone: 'Zone E — East Asia', transitDays: '3–5 Days', customsMode: 'NACCS Express Clearance', serviceable: true, shipmentsCount: 42 }
      ],
      regions: [
        { code: 'IN-WEST', name: 'Western India Export Hub', state: 'Maharashtra & Goa', gatewayAirport: 'BOM (Mumbai CSIA)', dailyCutoff: '19:30 IST', active: true },
        { code: 'IN-SOUTH', name: 'Southern India Export Hub', state: 'Karnataka & Tamil Nadu', gatewayAirport: 'BLR (Kempegowda) / MAA (Chennai)', dailyCutoff: '19:00 IST', active: true },
        { code: 'IN-NORTH', name: 'Northern India Export Hub', state: 'Delhi NCR, Haryana, UP', gatewayAirport: 'DEL (IGI Cargo Terminal)', dailyCutoff: '20:00 IST', active: true },
        { code: 'IN-EAST', name: 'Eastern India Export Hub', state: 'West Bengal & Northeast', gatewayAirport: 'CCU (Kolkata NSCBI)', dailyCutoff: '18:00 IST', active: true },
        { code: 'IN-GUJ', name: 'Gujarat Pharma & Textile Corridor', state: 'Gujarat (Ahmedabad, Surat, Vadodara)', gatewayAirport: 'AMD (SVPI Air Cargo)', dailyCutoff: '18:45 IST', active: true },
        { code: 'IN-DECCAN', name: 'Deccan Bulk & Pharma Gateway', state: 'Telangana & Andhra Pradesh', gatewayAirport: 'HYD (RGIA Pharma Zone)', dailyCutoff: '19:15 IST', active: true },
        { code: 'IN-KERALA', name: 'Malabar & GCC Direct Corridor', state: 'Kerala (Kochi, Trivandrum, Calicut)', gatewayAirport: 'COK (Cochin Intl Cargo)', dailyCutoff: '18:30 IST', active: true },
        { code: 'IN-NORTHWEST', name: 'Punjab & Rajasthan Export Zone', state: 'Punjab, Chandigarh, Rajasthan', gatewayAirport: 'ATQ / JAI / DEL Feeder', dailyCutoff: '17:30 IST', active: true }
      ],
      cities: [
        { city: 'Mumbai', state: 'Maharashtra', pinPrefix: '400xxx', sameDayPickup: true, hubCode: 'BOM-HUB-01', serviceable: true },
        { city: 'Bengaluru', state: 'Karnataka', pinPrefix: '560xxx', sameDayPickup: true, hubCode: 'BLR-HUB-01', serviceable: true },
        { city: 'New Delhi / NCR', state: 'Delhi / Haryana / UP', pinPrefix: '110xxx / 122xxx', sameDayPickup: true, hubCode: 'DEL-HUB-01', serviceable: true },
        { city: 'Chennai', state: 'Tamil Nadu', pinPrefix: '600xxx', sameDayPickup: true, hubCode: 'MAA-HUB-01', serviceable: true },
        { city: 'Hyderabad', state: 'Telangana', pinPrefix: '500xxx', sameDayPickup: true, hubCode: 'HYD-HUB-01', serviceable: true },
        { city: 'Ahmedabad', state: 'Gujarat', pinPrefix: '380xxx', sameDayPickup: true, hubCode: 'AMD-HUB-01', serviceable: true },
        { city: 'Pune', state: 'Maharashtra', pinPrefix: '411xxx', sameDayPickup: true, hubCode: 'PNQ-HUB-01', serviceable: true },
        { city: 'Kochi', state: 'Kerala', pinPrefix: '682xxx', sameDayPickup: true, hubCode: 'COK-HUB-01', serviceable: true },
        { city: 'Kolkata', state: 'West Bengal', pinPrefix: '700xxx', sameDayPickup: true, hubCode: 'CCU-HUB-01', serviceable: true },
        { city: 'Jaipur', state: 'Rajasthan', pinPrefix: '302xxx', sameDayPickup: true, hubCode: 'JAI-HUB-01', serviceable: true }
      ],
      coverageZones: [
        { code: 'ZONE-A', zone: 'Zone A — Middle East & GCC', countries: 'UAE, Saudi Arabia, Qatar, Kuwait, Oman, Bahrain', transit: '2–3 Business Days', customs: 'GCC Direct / ZATCA / Dubai Customs', carriers: 'Aramex Direct / DHL Express', coverage: '99.4% Doorstep', active: true },
        { code: 'ZONE-B', zone: 'Zone B — Southeast Asia', countries: 'Singapore, Malaysia, Thailand, Vietnam, Indonesia', transit: '2–4 Business Days', customs: 'ASEAN Express TradeNet', carriers: 'DHL Express / FedEx Priority', coverage: '98.8% Doorstep', active: true },
        { code: 'ZONE-C', zone: 'Zone C — UK & European Union', countries: 'UK, Germany, France, Netherlands, Italy, Ireland, Spain', transit: '3–5 Business Days', customs: 'UK HMRC EORI / EU ICS2 ATLAS', carriers: 'DHL / FedEx / UPS', coverage: '99.2% Doorstep', active: true },
        { code: 'ZONE-D', zone: 'Zone D — North America', countries: 'United States (All 50 States), Canada (All Provinces)', transit: '3–5 Business Days', customs: 'US CBP Section 321 ($800) / CBSA', carriers: 'FedEx Priority / DHL / UPS', coverage: '99.6% Doorstep', active: true },
        { code: 'ZONE-E', zone: 'Zone E — East Asia & Pacific Rim', countries: 'Japan, South Korea, Hong Kong SAR, Taiwan', transit: '3–5 Business Days', customs: 'NACCS / UNIPASS Express', carriers: 'DHL Express / FedEx', coverage: '98.5% Doorstep', active: true },
        { code: 'ZONE-F', zone: 'Zone F — Oceania', countries: 'Australia, New Zealand, Fiji', transit: '4–6 Business Days', customs: 'ABF Biosecurity / NZCS Direct', carriers: 'DHL Express / FedEx', coverage: '98.9% Doorstep', active: true },
        { code: 'ZONE-G', zone: 'Zone G — Africa & Indian Ocean', countries: 'South Africa, Kenya, Nigeria, Mauritius, Egypt', transit: '4–7 Business Days', customs: 'Formal Commercial & DDU', carriers: 'DHL Global / Emirates SkyCargo', coverage: '94.0% Metro & Regional', active: true },
        { code: 'ZONE-H', zone: 'Zone H — Latin America', countries: 'Brazil, Mexico, Chile, Colombia, Argentina', transit: '5–8 Business Days', customs: 'Formal Courier Import Regime', carriers: 'DHL Express / UPS Worldwide', coverage: '92.5% Metro & Regional', active: true }
      ]
    },
    cmsPages: [],
    blogPosts: [],
    settings: {}
  },
  packageRules: {},
  pickups: [],
  quotes: [],
  serviceEnquiries: [],
  businessAccounts: [],
  businessRecords: [],
  supportEnquiries: [],
  customsDocuments: []
};

function showAdminToast(msg) {
  let el = document.getElementById('admToast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 3200);
}

async function fetchAdminBackendData() {
  try {
    const res = await fetch('/api/admin/overview', {
      headers: { 'X-Admin-Key': ADMIN_API_KEY }
    });
    const data = await res.json();
    if (res.ok && data && data.ok) {
      if (data.store) admState.store = data.store;
      if (data.packageRules) admState.packageRules = data.packageRules;
      admState.pickups = data.pickups || [];
      admState.quotes = data.quotes || [];
      admState.serviceEnquiries = data.serviceEnquiries || [];
      admState.businessAccounts = data.businessAccounts || [];
      admState.businessRecords = data.businessRecords || [];
      admState.supportEnquiries = data.supportEnquiries || [];
      admState.customsDocuments = data.customsDocuments || [];
      renderCurrentRouteView();
    }
  } catch (_) {
    // Fallback to initial state if offline
  }
}

async function postAdminAction(payload) {
  const res = await fetch('/api/admin/action', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': ADMIN_API_KEY
    },
    body: JSON.stringify(payload)
  });
  return res.json();
}

/* ==========================================================================
   SIDEBAR DROPDOWN & ROUTING ENGINE
   ========================================================================== */
function closeOtherSubmenus(activeGroupKey) {
  document.querySelectorAll('.adm-nav-trigger').forEach(otherBtn => {
    const g = otherBtn.getAttribute('data-group');
    if (g !== activeGroupKey) {
      otherBtn.setAttribute('aria-expanded', 'false');
      otherBtn.classList.remove('is-open');
      const otherSub = document.getElementById(`submenu-${g}`);
      if (otherSub) otherSub.hidden = true;
    }
  });
}

function toggleSubmenu(groupKey) {
  const btn = document.querySelector(`.adm-nav-trigger[data-group="${groupKey}"]`);
  const submenu = document.getElementById(`submenu-${groupKey}`);
  if (!btn || !submenu) return;

  const isExpanded = btn.getAttribute('aria-expanded') === 'true';
  if (!isExpanded) {
    closeOtherSubmenus(groupKey);
  }
  btn.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
  btn.classList.toggle('is-open', !isExpanded);
  submenu.hidden = isExpanded;
}

function expandSubmenu(groupKey) {
  closeOtherSubmenus(groupKey);
  const btn = document.querySelector(`.adm-nav-trigger[data-group="${groupKey}"]`);
  const submenu = document.getElementById(`submenu-${groupKey}`);
  if (!btn || !submenu) return;
  btn.setAttribute('aria-expanded', 'true');
  btn.classList.add('is-open');
  submenu.hidden = false;
}

function navigateAdmin(path, pushHistory = true) {
  const clean = (path || '/admin').replace(/\/+$/, '') || '/admin';
  const route = ADMIN_ROUTES[clean] || ADMIN_ROUTES['/admin'];
  admState.currentPath = ADMIN_ROUTES[clean] ? clean : '/admin';

  if (pushHistory && window.location.pathname !== admState.currentPath) {
    window.history.pushState({ path: admState.currentPath }, '', admState.currentPath);
  }

  syncSidebarActiveState(admState.currentPath, route);
  renderCurrentRouteView();

  // Close mobile drawer after selecting a destination page
  const shell = document.getElementById('admShell');
  if (shell && shell.classList.contains('sidebar-open')) {
    shell.classList.remove('sidebar-open');
  }
}

function syncSidebarActiveState(currentPath, route) {
  // 1. Clear active state on all top-level links, triggers, and submenu links
  document.querySelectorAll('.adm-nav-item, .adm-nav-trigger').forEach(el => {
    el.classList.remove('active', 'has-active-child');
  });
  document.querySelectorAll('.adm-submenu-link').forEach(el => {
    el.classList.remove('active');
    el.removeAttribute('aria-current');
  });

  // 2. Highlight Dashboard ONLY when on dashboard route
  if (route.section === 'dashboard') {
    const dashLink = document.querySelector('.adm-nav-link[data-route="/admin"]');
    if (dashLink) {
      dashLink.classList.add('active');
      dashLink.setAttribute('aria-current', 'page');
    }
    return;
  }

  // 3. Direct top-level route (Customers, Courier Partners, Reports, CMS, Blog)
  const directLink = document.querySelector(`.adm-nav-link[data-route="${currentPath}"]`);
  if (directLink) {
    directLink.classList.add('active');
    directLink.setAttribute('aria-current', 'page');
  }

  // 4. Nested submenu route: expand parent and highlight submenu item
  if (route.parent) {
    expandSubmenu(route.parent);
    const parentTrigger = document.querySelector(`.adm-nav-trigger[data-group="${route.parent}"]`);
    if (parentTrigger) {
      parentTrigger.classList.add('has-active-child');
    }
    const subLink = document.querySelector(`.adm-submenu-link[data-route="${currentPath}"]`);
    if (subLink) {
      subLink.classList.add('active');
      subLink.setAttribute('aria-current', 'page');
    }
  }
}

/* ==========================================================================
   VIEW RENDERING DISPATCHER
   ========================================================================== */
function renderCurrentRouteView() {
  const route = ADMIN_ROUTES[admState.currentPath] || ADMIN_ROUTES['/admin'];
  const dashView = document.getElementById('admDashboardOverviewView');
  const dynamicView = document.getElementById('admDynamicSectionView');
  const pageTitle = document.getElementById('admMainPageTitle');
  const pageSub = document.getElementById('admMainPageSub');

  if (pageTitle) pageTitle.textContent = route.title;
  if (pageSub) pageSub.textContent = route.sub;

  if (route.section === 'dashboard') {
    if (dashView) dashView.hidden = false;
    if (dynamicView) dynamicView.hidden = true;
    renderRecentBookings(admState.filterText);
    renderLatestShipments(admState.filterText);
    return;
  }

  if (dashView) dashView.hidden = true;
  if (!dynamicView) return;
  dynamicView.hidden = false;

  switch (route.section) {
    case 'shipments':
      renderShipmentsSection(dynamicView, route.subView);
      break;
    case 'tracking':
      renderTrackingSection(dynamicView, route.subView);
      break;
    case 'bookings':
      renderBookingsSection(dynamicView, route.subView);
      break;
    case 'customers':
      renderCustomersSection(dynamicView);
      break;
    case 'rates':
      renderRatesSection(dynamicView, route.subView);
      break;
    case 'partners':
      renderPartnersSection(dynamicView);
      break;
    case 'locations':
      renderLocationsSection(dynamicView, route.subView);
      break;
    case 'reports':
      renderReportsSection(dynamicView);
      break;
    case 'cms':
      renderCmsSection(dynamicView);
      break;
    case 'blog':
      renderBlogSection(dynamicView);
      break;
    case 'settings':
      renderSettingsSection(dynamicView, route.subView);
      break;
    default:
      dynamicView.innerHTML = '';
  }
}

/* ==========================================================================
   1. DASHBOARD WIDGET HELPERS
   ========================================================================== */
function populateStaticFlags() {
  document.querySelectorAll('[data-flag]').forEach(el => {
    const code = el.getAttribute('data-flag');
    if (ADM_FLAGS[code]) el.innerHTML = ADM_FLAGS[code];
  });
}

function renderRecentBookings(filterText = '') {
  const container = document.getElementById('admRecentBookingsList');
  if (!container) return;
  const q = filterText.trim().toLowerCase();
  const shipments = admState.store.shipments || [];
  const filtered = shipments.filter(item =>
    !q ||
    (item.trackingNo || '').toLowerCase().includes(q) ||
    (item.customer || '').toLowerCase().includes(q) ||
    (item.toCountry || '').toLowerCase().includes(q) ||
    (item.type || '').toLowerCase().includes(q) ||
    (item.status || '').toLowerCase().includes(q)
  );
  const rows = filtered.slice(0, 5);

  if (!rows.length) {
    container.innerHTML = `<div style="padding:18px 12px; text-align:center; color:#64748B; font-size:12.5px;">No matching bookings found for "${esc(filterText.trim())}".</div>`;
    return;
  }

  container.innerHTML = rows.map(item => `
    <div class="adm-booking-row">
      <span class="adm-trk-code">${esc(item.trackingNo)}</span>
      <span class="adm-country-inline">
        <span class="adm-flag-sm">${ADM_FLAGS[item.toCode] || ADM_FLAGS.US}</span>
        <span>${esc(item.toCountry)}</span>
      </span>
      <span class="adm-status-pill ${statusPillClass(item.status)}">${esc(item.status)}</span>
      <span class="adm-time-ago">${esc(item.timeAgo || 'Recently')}</span>
    </div>
  `).join('');
}

function renderLatestShipments(filterText = '') {
  const tbody = document.getElementById('admLatestShipmentsBody');
  if (!tbody) return;
  const q = filterText.trim().toLowerCase();
  const shipments = (admState.store.shipments || []).filter(s => s.status !== 'Cancelled' || q);
  const filtered = shipments.filter(item =>
    !q ||
    (item.trackingNo || '').toLowerCase().includes(q) ||
    (item.customer || '').toLowerCase().includes(q) ||
    (item.fromCountry || '').toLowerCase().includes(q) ||
    (item.toCountry || '').toLowerCase().includes(q) ||
    (item.type || '').toLowerCase().includes(q) ||
    (item.status || '').toLowerCase().includes(q)
  );
  const rows = filtered.slice(0, 5);

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:20px; color:#64748B; font-size:13px;">No shipments matching "${esc(filterText.trim())}".</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(item => `
    <tr>
      <td><strong class="adm-trk-code">${esc(item.trackingNo)}</strong></td>
      <td>${esc(item.date)}</td>
      <td>${esc(item.customer)}</td>
      <td>
        <span class="adm-country-inline">
          <span class="adm-flag-sm">${ADM_FLAGS[item.fromCode] || ADM_FLAGS.IN}</span>
          <span>${esc(item.fromCountry)}</span>
        </span>
      </td>
      <td>
        <span class="adm-country-inline">
          <span class="adm-flag-sm">${ADM_FLAGS[item.toCode] || ADM_FLAGS.US}</span>
          <span>${esc(item.toCountry)}</span>
        </span>
      </td>
      <td>${esc(item.type)}</td>
      <td>${esc(item.weight)}</td>
      <td><span class="adm-status-pill ${statusPillClass(item.status)}">${esc(item.status)}</span></td>
      <td>
        <div class="adm-action-btns">
          <button type="button" class="adm-icon-action" title="View & Track ${esc(item.trackingNo)}" onclick="inspectShipment('${esc(item.trackingNo)}')">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M1.5 10s3.2-5.5 8.5-5.5S18.5 10 18.5 10s-3.2 5.5-8.5 5.5S1.5 10 1.5 10z"/><circle cx="10" cy="10" r="2.5"/></svg>
          </button>
          <button type="button" class="adm-icon-action" title="Cycle Status" onclick="quickCycleShipmentStatus('${esc(item.trackingNo)}')">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M13.5 3.5a2 2 0 012.8 2.8L7 15.5 3.5 16.5l1-3.5 9-9.5z"/></svg>
          </button>
          <button type="button" class="adm-icon-action" title="Manage in Shipments" onclick="navigateAdmin('/admin/shipments')">
            <svg viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="4.5" r="1.4"/><circle cx="10" cy="10" r="1.4"/><circle cx="10" cy="15.5" r="1.4"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function quickCycleShipmentStatus(trk) {
  const order = ['Booked', 'In Transit', 'Delivered', 'Pending'];
  const shp = (admState.store.shipments || []).find(s => s.trackingNo === trk);
  if (!shp) return;
  const nextStatus = order[(order.indexOf(shp.status) + 1) % order.length];
  shp.status = nextStatus;
  renderRecentBookings(admState.filterText);
  renderLatestShipments(admState.filterText);
  renderCurrentRouteView();
  await postAdminAction({
    action: 'update_shipment',
    trackingNo: trk,
    status: nextStatus,
    description: `Status updated to ${nextStatus} by Admin User.`
  });
  showAdminToast(`Shipment ${trk} status updated to ${nextStatus}`);
}

function inspectShipment(trk) {
  navigateAdmin('/admin/tracking');
  setTimeout(() => {
    const inp = document.getElementById('admTrackSearchInput');
    if (inp) {
      inp.value = trk;
      runAdminTrackingLookup();
    }
  }, 50);
}

/* ==========================================================================
   2. SHIPMENTS SECTION (All, Create, Pending, In Transit, Delivered, Cancelled)
   ========================================================================== */
function renderShipmentsSection(container, subView) {
  const subTabs = [
    { key: 'all', label: 'All Shipments', path: '/admin/shipments' },
    { key: 'create', label: '+ Create Shipment', path: '/admin/shipments/create' },
    { key: 'pending', label: 'Pending', path: '/admin/shipments/pending' },
    { key: 'in-transit', label: 'In Transit', path: '/admin/shipments/in-transit' },
    { key: 'delivered', label: 'Delivered', path: '/admin/shipments/delivered' },
    { key: 'cancelled', label: 'Cancelled / Returned', path: '/admin/shipments/cancelled' }
  ];

  const tabsHtml = `
    <div class="adm-subnav-pills">
      ${subTabs.map(t => `
        <a href="${t.path}" class="adm-subpill ${subView === t.key ? 'active' : ''}" onclick="event.preventDefault(); navigateAdmin('${t.path}')">${esc(t.label)}</a>
      `).join('')}
    </div>
  `;

  if (subView === 'create') {
    container.innerHTML = `
      ${tabsHtml}
      <div class="adm-card">
        <div class="adm-card-header">
          <h2 class="adm-card-title">Create New International Shipment</h2>
        </div>
        <form onsubmit="event.preventDefault(); handleCreateShipmentPageSubmit();" class="adm-form-grid" style="max-width:860px;">
          <div class="adm-field">
            <label>Tracking / AWB Number *</label>
            <input type="text" id="csTrackingNo" value="TRX${Math.floor(100000000 + Math.random() * 900000000)}" required>
          </div>
          <div class="adm-field">
            <label>Customer / Sender Full Name *</label>
            <input type="text" id="csCustomer" placeholder="e.g. Vikram Mehta" required>
          </div>
          <div class="adm-field">
            <label>Customer Email</label>
            <input type="email" id="csEmail" placeholder="customer@company.com">
          </div>
          <div class="adm-field">
            <label>Customer Phone *</label>
            <input type="text" id="csPhone" placeholder="+91 98200 00000" required>
          </div>
          <div class="adm-field">
            <label>Origin City (India)</label>
            <input type="text" id="csFromCity" value="Mumbai, MH" required>
          </div>
          <div class="adm-field">
            <label>Destination Country *</label>
            <select id="csToCountry">
              <option value="US|USA">United States (USA)</option>
              <option value="GB|UK">United Kingdom (UK)</option>
              <option value="AU|Australia">Australia</option>
              <option value="CA|Canada">Canada</option>
              <option value="AE|UAE">United Arab Emirates (UAE)</option>
              <option value="DE|Germany">Germany</option>
              <option value="SG|Singapore">Singapore</option>
            </select>
          </div>
          <div class="adm-field">
            <label>Destination City</label>
            <input type="text" id="csToCity" placeholder="e.g. New York, NY">
          </div>
          <div class="adm-field">
            <label>Shipment Type *</label>
            <select id="csType">
              <option value="Document">Document Courier</option>
              <option value="Medicine">Medicine Courier (Rx)</option>
              <option value="Parcel">Personal / Commercial Parcel</option>
              <option value="E-commerce">E-commerce CSB-V</option>
              <option value="Bulk Cargo">Bulk &amp; Commercial</option>
            </select>
          </div>
          <div class="adm-field">
            <label>Chargeable Weight (kg) *</label>
            <input type="number" id="csWeightKg" value="1.5" step="0.1" min="0.1" required>
          </div>
          <div class="adm-field">
            <label>Assigned Courier Partner *</label>
            <select id="csCarrier">
              <option value="DHL">DHL Express</option>
              <option value="FedEx">FedEx International</option>
              <option value="Aramex">Aramex</option>
              <option value="UPS">UPS Worldwide</option>
            </select>
          </div>
          <div class="adm-field">
            <label>Initial Status</label>
            <select id="csStatus">
              <option value="Booked">Booked</option>
              <option value="Pending">Pending</option>
              <option value="In Transit">In Transit</option>
            </select>
          </div>
          <div class="adm-field">
            <label>Freight Amount (INR ₹)</label>
            <input type="number" id="csAmount" value="3850" min="100" step="50">
          </div>
          <div class="adm-field full" style="margin-top:8px;">
            <button type="submit" class="adm-btn-new" style="width:fit-content;">Create &amp; Save Shipment</button>
          </div>
        </form>
      </div>
    `;
    return;
  }

  // Combine admin shipments + live quote requests for full visibility
  let list = [...(admState.store.shipments || [])];
  if (subView === 'pending') list = list.filter(s => s.status.toLowerCase().includes('pend') || s.status.toLowerCase().includes('book'));
  if (subView === 'in-transit') list = list.filter(s => s.status.toLowerCase().includes('transit'));
  if (subView === 'delivered') list = list.filter(s => s.status.toLowerCase().includes('deliver'));
  if (subView === 'cancelled') list = list.filter(s => s.status.toLowerCase().includes('cancel') || s.status.toLowerCase().includes('return'));

  if (admState.filterText) {
    const q = admState.filterText.toLowerCase();
    list = list.filter(s =>
      (s.trackingNo || '').toLowerCase().includes(q) ||
      (s.customer || '').toLowerCase().includes(q) ||
      (s.fromCountry || '').toLowerCase().includes(q) ||
      (s.fromCity || '').toLowerCase().includes(q) ||
      (s.toCountry || '').toLowerCase().includes(q) ||
      (s.toCity || '').toLowerCase().includes(q) ||
      (s.type || '').toLowerCase().includes(q) ||
      (s.status || '').toLowerCase().includes(q) ||
      (s.carrier || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.phone || '').toLowerCase().includes(q)
    );
  }

  const pageKey = `shipments-${subView || 'all'}`;
  const { pageItems, page, pageSize, totalPages, startIdx, endIdx, totalCount } = getPaginatedSlice(pageKey, list, 5);

  const selShp = admState.selectedRecord?.type === 'shipment'
    ? (admState.store.shipments || []).find(s => s.trackingNo === admState.selectedRecord.id)
    : null;
  const detailBannerHtml = selShp ? `
    <div class="adm-detail-banner" id="admSelectedShipmentDetail">
      <div style="flex:1; min-width:0;">
        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
          <span style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--adm-red-bright);">Shipment Record Details</span>
          <span class="adm-status-pill ${statusPillClass(selShp.status)}">${esc(selShp.status)}</span>
        </div>
        <h3 style="font-size:16px; font-weight:800; color:#0F172A; margin-top:4px;">${esc(selShp.trackingNo)} — ${esc(selShp.customer)}</h3>
        <div class="adm-detail-grid">
          <div><strong>Origin</strong>${esc(selShp.fromCity ? `${selShp.fromCity}, ` : '')}${esc(selShp.fromCountry || 'India')}</div>
          <div><strong>Destination</strong>${esc(selShp.toCity ? `${selShp.toCity}, ` : '')}${esc(selShp.toCountry)}</div>
          <div><strong>Package &amp; Weight</strong>${esc(selShp.type)} • ${esc(selShp.weight)}</div>
          <div><strong>Carrier &amp; Tariff</strong>${esc(selShp.carrier || 'DHL')} • ₹ ${esc(selShp.amountInr || 3450)}</div>
          <div><strong>Contact</strong>${esc(selShp.email || selShp.phone || 'Verified Shipper')}</div>
          <div><strong>Booked Date</strong>${esc(selShp.date)}</div>
        </div>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <button type="button" class="adm-btn-secondary" style="height:30px; padding:0 12px; font-size:12px; white-space:nowrap; flex-shrink:0; width:max-content; display:inline-flex; align-items:center; justify-content:center;" onclick="inspectShipment('${esc(selShp.trackingNo)}')">Track Timeline</button>
        <button type="button" class="adm-btn-secondary" style="height:30px; padding:0 12px; font-size:12px; white-space:nowrap; flex-shrink:0; width:max-content; display:inline-flex; align-items:center; justify-content:center;" onclick="clearSelectedSearchRecord()">Show All Shipments</button>
      </div>
    </div>
  ` : '';

  container.innerHTML = `
    ${tabsHtml}
    ${detailBannerHtml}
    <div class="adm-card">
      <div class="adm-card-header">
        <h2 class="adm-card-title">${esc(ADMIN_ROUTES[admState.currentPath]?.title || 'Shipments')} (${totalCount})</h2>
        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
          <label for="pageSize-${pageKey}" style="font-size:12px; color:#64748B; font-weight:600;">Rows per page:</label>
          <select id="pageSize-${pageKey}" class="adm-page-size-select" onchange="setAdminPageSize('${pageKey}', this.value)">
            ${[5, 8, 10, 15].map(sz => `<option value="${sz}" ${pageSize === sz ? 'selected' : ''}>${sz} / page</option>`).join('')}
          </select>
          <button type="button" class="adm-btn-new" onclick="navigateAdmin('/admin/shipments/create')">+ Create Shipment</button>
        </div>
      </div>
      <div class="adm-table-wrap">
        <table class="adm-table">
          <thead>
            <tr>
              <th>Tracking No.</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Origin</th>
              <th>Destination</th>
              <th>Type</th>
              <th>Weight</th>
              <th>Carrier</th>
              <th>Status</th>
              <th>Update Status</th>
            </tr>
          </thead>
          <tbody>
            ${pageItems.length === 0 ? `<tr><td colspan="10" style="text-align:center; padding:24px; color:#64748B;">No shipments match the current filter.</td></tr>` : pageItems.map(item => `
              <tr>
                <td><strong class="adm-trk-code">${esc(item.trackingNo)}</strong></td>
                <td>${esc(item.date)}</td>
                <td>
                  <strong>${esc(item.customer)}</strong>
                  ${item.phone ? `<div style="font-size:11px; color:#64748B;">${esc(item.phone)}</div>` : ''}
                </td>
                <td><span class="adm-country-inline"><span class="adm-flag-sm">${ADM_FLAGS[item.fromCode] || ADM_FLAGS.IN}</span>${esc(item.fromCountry)}</span></td>
                <td><span class="adm-country-inline"><span class="adm-flag-sm">${ADM_FLAGS[item.toCode] || ADM_FLAGS.US}</span>${esc(item.toCountry)}</span></td>
                <td>${esc(item.type)}</td>
                <td>${esc(item.weight)}</td>
                <td><strong>${esc(item.carrier || 'DHL')}</strong></td>
                <td><span class="adm-status-pill ${statusPillClass(item.status)}">${esc(item.status)}</span></td>
                <td>
                  <select class="adm-inline-select" onchange="updateShipmentStatusInline('${esc(item.trackingNo)}', this.value)">
                    ${['Booked', 'Pending', 'In Transit', 'Delivered', 'Cancelled'].map(st => `<option value="${st}" ${item.status === st ? 'selected' : ''}>${st}</option>`).join('')}
                  </select>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ${renderPaginationBar(pageKey, totalCount, page, pageSize, totalPages, startIdx, endIdx)}
    </div>
  `;
}

async function handleCreateShipmentPageSubmit() {
  const [toCode, toCountry] = (document.getElementById('csToCountry').value || 'US|USA').split('|');
  const payload = {
    action: 'create_shipment',
    trackingNo: document.getElementById('csTrackingNo').value.trim(),
    customer: document.getElementById('csCustomer').value.trim(),
    email: document.getElementById('csEmail').value.trim(),
    phone: document.getElementById('csPhone').value.trim(),
    fromCity: document.getElementById('csFromCity').value.trim(),
    fromCountry: 'India',
    fromCode: 'IN',
    toCode,
    toCountry,
    toCity: document.getElementById('csToCity').value.trim(),
    type: document.getElementById('csType').value,
    weightKg: parseFloat(document.getElementById('csWeightKg').value) || 1.0,
    carrier: document.getElementById('csCarrier').value,
    status: document.getElementById('csStatus').value,
    amountInr: parseFloat(document.getElementById('csAmount').value) || 3500
  };
  const res = await postAdminAction(payload);
  if (res && res.ok) {
    admState.store = res.store;
    showAdminToast(`Shipment ${res.shipment.trackingNo} created and saved!`);
    navigateAdmin('/admin/shipments');
  } else {
    showAdminToast(res?.error || 'Could not create shipment');
  }
}

async function updateShipmentStatusInline(trk, newStatus) {
  const res = await postAdminAction({
    action: 'update_shipment',
    trackingNo: trk,
    status: newStatus,
    description: `Admin updated shipment status to ${newStatus}.`
  });
  if (res && res.ok) {
    admState.store = res.store;
    showAdminToast(`Shipment ${trk} updated to ${newStatus}`);
    renderCurrentRouteView();
  }
}

/* ==========================================================================
   3. TRACKING SECTION (Track Shipment, History, Events, Delivery Status)
   ========================================================================== */
function renderTrackingSection(container, subView) {
  const subTabs = [
    { key: 'lookup', label: 'Track Shipment', path: '/admin/tracking' },
    { key: 'history', label: 'Tracking History', path: '/admin/tracking/history' },
    { key: 'events', label: 'Tracking Events', path: '/admin/tracking/events' },
    { key: 'delivery-status', label: 'Delivery Status', path: '/admin/tracking/delivery-status' }
  ];

  const tabsHtml = `
    <div class="adm-subnav-pills">
      ${subTabs.map(t => `
        <a href="${t.path}" class="adm-subpill ${subView === t.key ? 'active' : ''}" onclick="event.preventDefault(); navigateAdmin('${t.path}')">${esc(t.label)}</a>
      `).join('')}
    </div>
  `;

  if (subView === 'lookup') {
    container.innerHTML = `
      ${tabsHtml}
      <div class="adm-card">
        <div class="adm-card-header">
          <h2 class="adm-card-title">Live Backend Shipment &amp; Reference Tracker</h2>
        </div>
        <form onsubmit="event.preventDefault(); runAdminTrackingLookup();" style="display:flex; gap:10px; max-width:680px; margin-bottom:18px; flex-wrap:wrap;">
          <input type="text" id="admTrackSearchInput" class="adm-text-input" style="flex:1; min-width:0; width:100%;" placeholder="Enter AWB (e.g. TRX123456789, TRISYS-PKP-..., TRISYS-QTE-...)" value="TRX123456788" required>
          <button type="submit" class="adm-btn-new">Track Consignment</button>
        </form>
        <div id="admTrackLookupResult"></div>
      </div>
    `;
    runAdminTrackingLookup();
    return;
  }

  if (subView === 'events') {
    const shipments = admState.store.shipments || [];
    container.innerHTML = `
      ${tabsHtml}
      <div class="adm-card">
        <div class="adm-card-header">
          <h2 class="adm-card-title">Append Hub Scan / Tracking Milestone Event</h2>
        </div>
        <form onsubmit="event.preventDefault(); submitNewTrackingEvent();" class="adm-form-grid" style="max-width:780px; margin-bottom:20px;">
          <div class="adm-field">
            <label>Select Shipment AWB *</label>
            <select id="teTrackingNo">
              ${shipments.map(s => `<option value="${esc(s.trackingNo)}">${esc(s.trackingNo)} — ${esc(s.customer)} (${esc(s.toCountry)})</option>`).join('')}
            </select>
          </div>
          <div class="adm-field">
            <label>Milestone Status *</label>
            <select id="teStatus">
              <option value="Booked">Booked</option>
              <option value="Picked Up">Picked Up</option>
              <option value="In Transit">In Transit</option>
              <option value="Customs Cleared">Customs Cleared</option>
              <option value="Out for Delivery">Out for Delivery</option>
              <option value="Delivered">Delivered</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
          <div class="adm-field">
            <label>Scan Location / Hub *</label>
            <input type="text" id="teLocation" placeholder="e.g. Dubai DXB Cargo Village / London LHR" required>
          </div>
          <div class="adm-field">
            <label>Scan Remarks / Description *</label>
            <input type="text" id="teDescription" placeholder="e.g. Departed sort facility on flight EK-505" required>
          </div>
          <div class="adm-field full">
            <button type="submit" class="adm-btn-new" style="width:fit-content;">Append Scan Event</button>
          </div>
        </form>
      </div>
    `;
    return;
  }

  // History or Delivery Status view (with pagination)
  const q = admState.filterText.trim().toLowerCase();
  const allEvents = [];
  (admState.store.shipments || []).forEach(shp => {
    (shp.events || []).forEach(ev => {
      allEvents.push({
        trackingNo: shp.trackingNo,
        customer: shp.customer,
        toCountry: shp.toCountry,
        carrier: shp.carrier,
        currentStatus: shp.status,
        ...ev
      });
    });
  });

  const filteredEvents = allEvents.filter(ev =>
    !q ||
    String(ev.trackingNo || '').toLowerCase().includes(q) ||
    String(ev.customer || '').toLowerCase().includes(q) ||
    String(ev.toCountry || '').toLowerCase().includes(q) ||
    String(ev.carrier || '').toLowerCase().includes(q) ||
    String(ev.location || '').toLowerCase().includes(q) ||
    String(ev.description || '').toLowerCase().includes(q) ||
    String(ev.status || '').toLowerCase().includes(q)
  );

  const pageKey = subView === 'delivery-status' ? 'delivery-status' : 'tracking-history';
  const { pageItems, page, pageSize, totalPages, startIdx, endIdx, totalCount } = getPaginatedSlice(pageKey, filteredEvents, 5);

  container.innerHTML = `
    ${tabsHtml}
    <div class="adm-card">
      <div class="adm-card-header">
        <h2 class="adm-card-title">${subView === 'delivery-status' ? 'Final-Mile Delivery & SLA Status' : 'All Shipment Scan Events & Tracking History'} (${totalCount})</h2>
        <div style="display:flex; align-items:center; gap:8px;">
          <label for="pageSize-${pageKey}" style="font-size:12px; color:#64748B; font-weight:600;">Rows per page:</label>
          <select id="pageSize-${pageKey}" class="adm-page-size-select" onchange="setAdminPageSize('${pageKey}', this.value)">
            ${[5, 8, 10, 15].map(sz => `<option value="${sz}" ${pageSize === sz ? 'selected' : ''}>${sz} / page</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="adm-table-wrap">
        <table class="adm-table">
          <thead>
            <tr>
              <th>Tracking No.</th>
              <th>Customer</th>
              <th>Destination</th>
              <th>Carrier</th>
              <th>Scan Timestamp</th>
              <th>Scan Location</th>
              <th>Milestone Description</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${pageItems.length ? pageItems.map(ev => `
              <tr>
                <td><strong class="adm-trk-code">${esc(ev.trackingNo)}</strong></td>
                <td>${esc(ev.customer)}</td>
                <td>${esc(ev.toCountry)}</td>
                <td>${esc(ev.carrier || 'DHL')}</td>
                <td>${esc(ev.timestamp)}</td>
                <td>${esc(ev.location)}</td>
                <td class="adm-desc-cell">${esc(ev.description)}</td>
                <td><span class="adm-status-pill ${statusPillClass(ev.status)}">${esc(ev.status)}</span></td>
              </tr>
            `).join('') : `<tr><td colspan="8" style="text-align:center; padding:24px; color:#64748B;">No tracking events match your search.</td></tr>`}
          </tbody>
        </table>
      </div>
      ${renderPaginationBar(pageKey, totalCount, page, pageSize, totalPages, startIdx, endIdx)}
    </div>
  `;
}

function rowMatchesAdminFilter(item, q) {
  if (!q || item == null) return true;
  if (typeof item === 'string' || typeof item === 'number') {
    return String(item).toLowerCase().includes(q);
  }
  if (Array.isArray(item)) {
    return item.some(sub => rowMatchesAdminFilter(sub, q));
  }
  if (typeof item === 'object') {
    return Object.values(item).some(val => rowMatchesAdminFilter(val, q));
  }
  return false;
}

function getPaginatedSlice(key, rows, defaultSize = 5) {
  if (!admState.pagination[key]) {
    admState.pagination[key] = { page: 1, pageSize: defaultSize };
  }
  const q = (admState.filterText || '').trim().toLowerCase();
  const filteredRows = q ? rows.filter(r => rowMatchesAdminFilter(r, q)) : rows;
  const st = admState.pagination[key];
  const pageSize = Number(st.pageSize) || defaultSize;
  const totalCount = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  let page = Number(st.page) || 1;
  if (page > totalPages) page = totalPages;
  if (page < 1) page = 1;
  st.page = page;
  st.pageSize = pageSize;

  const startIdx = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIdx = Math.min(totalCount, page * pageSize);
  const pageItems = filteredRows.slice((page - 1) * pageSize, page * pageSize);
  return { pageItems, page, pageSize, totalPages, startIdx, endIdx, totalCount };
}

function renderPaginationBar(key, totalCount, page, pageSize, totalPages, startIdx, endIdx) {
  const pageItems = [];
  if (totalPages <= 1) {
    pageItems.push(1);
  } else if (totalPages === 2) {
    pageItems.push(1, 2);
  } else if (page < totalPages) {
    pageItems.push(page, '...', totalPages);
  } else {
    pageItems.push(1, '...', totalPages);
  }

  const pageButtons = pageItems.map(item => {
    if (item === '...') {
      return `<span class="adm-page-ellipsis" aria-hidden="true">…</span>`;
    }
    const p = Number(item);
    return `<button type="button" class="adm-page-btn ${p === page ? 'active' : ''}" onclick="setAdminPage('${key}', ${p})" aria-label="Page ${p}" ${p === page ? 'aria-current="page"' : ''}>${p}</button>`;
  });

  return `
    <div class="adm-pagination-bar">
      <div class="adm-page-info">
        <span>Showing <strong>${startIdx}–${endIdx}</strong> of <strong>${totalCount}</strong> records (Page <strong>${page}</strong> of <strong>${totalPages}</strong>)</span>
      </div>
      <div class="adm-page-controls" role="navigation" aria-label="Table Pagination">
        <button type="button" class="adm-page-btn" onclick="setAdminPage('${key}', ${page - 1})" ${page <= 1 ? 'disabled' : ''}>‹ Previous</button>
        ${pageButtons.join('')}
        <button type="button" class="adm-page-btn" onclick="setAdminPage('${key}', ${page + 1})" ${page >= totalPages ? 'disabled' : ''}>Next ›</button>
      </div>
    </div>
  `;
}

function setAdminPage(key, newPage) {
  if (!admState.pagination[key]) {
    admState.pagination[key] = { page: 1, pageSize: 5 };
  }
  admState.pagination[key].page = Number(newPage) || 1;
  renderCurrentRouteView();
}

function setAdminPageSize(key, newSize) {
  if (!admState.pagination[key]) {
    admState.pagination[key] = { page: 1, pageSize: 5 };
  }
  admState.pagination[key].pageSize = Number(newSize) || 5;
  admState.pagination[key].page = 1;
  renderCurrentRouteView();
}

async function runAdminTrackingLookup() {
  const inp = document.getElementById('admTrackSearchInput');
  const box = document.getElementById('admTrackLookupResult');
  if (!inp || !box) return;
  const awb = inp.value.trim().toUpperCase();
  box.innerHTML = `<p style="color:#64748B; font-size:13px;">Querying /api/track?awb=${esc(awb)}...</p>`;
  try {
    const res = await fetch(`/api/track?awb=${encodeURIComponent(awb)}`);
    const data = await res.json();
    if (!data.found) {
      box.innerHTML = `<div style="padding:16px; border-radius:10px; background:#FEF2F2; color:#B91C1C; font-size:13px;">${esc(data.message || 'No matching shipment found.')}</div>`;
      return;
    }
    const evs = Array.isArray(data.events) ? data.events : [];
    box.innerHTML = `
      <div style="border:1px solid #E2E8F0; border-radius:12px; padding:18px; background:#F8FAFC;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px;">
          <div>
            <span style="font-size:11.5px; color:#64748B; font-weight:600;">${esc(data.recordType)}</span>
            <h3 style="font-size:18px; font-weight:800; color:#111827;">${esc(data.awb)} — ${esc(data.originCountry)} ➔ ${esc(data.destCountry)}</h3>
          </div>
          <span class="adm-status-pill ${statusPillClass(data.status)}">${esc(data.status)}</span>
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(170px, 1fr)); gap:12px; margin-bottom:14px; font-size:12.5px;">
          <div><span style="color:#64748B;">Customer:</span> <strong>${esc(data.senderName || '—')}</strong></div>
          <div><span style="color:#64748B;">Package:</span> <strong>${esc(data.packageType)} (${esc(data.weight)} ${esc(data.weightUnit || 'kg')})</strong></div>
          <div><span style="color:#64748B;">Origin Hub:</span> <strong>${esc(data.pickupAddress || data.originCountry)}</strong></div>
          <div><span style="color:#64748B;">ETA:</span> <strong>${esc(data.estimatedDelivery || '3–5 Days')}</strong></div>
        </div>
        <h4 style="font-size:13px; font-weight:700; margin-bottom:8px;">Scan History (${evs.length})</h4>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${evs.map(e => `
            <div style="padding:10px 14px; background:#FFFFFF; border:1px solid #E2E8F0; border-radius:8px; display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; font-size:12.5px;">
              <div>
                <strong style="color:#111827;">${esc(e.status)}</strong> — <span style="color:#475569;">${esc(e.location)}</span>
                <div style="color:#64748B; margin-top:2px;">${esc(e.description)}</div>
              </div>
              <span style="color:#64748B; font-weight:600;">${esc(e.timestamp)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } catch (_) {
    box.innerHTML = `<p style="color:#DC2626;">Error contacting tracking endpoint.</p>`;
  }
}

async function submitNewTrackingEvent() {
  const trk = document.getElementById('teTrackingNo').value;
  const status = document.getElementById('teStatus').value;
  const location = document.getElementById('teLocation').value.trim();
  const description = document.getElementById('teDescription').value.trim();
  const res = await postAdminAction({
    action: 'update_shipment',
    trackingNo: trk,
    status,
    location,
    description
  });
  if (res && res.ok) {
    admState.store = res.store;
    showAdminToast(`Tracking event added to ${trk}!`);
    navigateAdmin('/admin/tracking/history');
  }
}

/* ==========================================================================
   4. BOOKINGS SECTION (All, New, Pending, Confirmed, Cancelled)
   ========================================================================== */
function renderBookingsSection(container, subView) {
  const subTabs = [
    { key: 'all', label: 'All Bookings', path: '/admin/bookings' },
    { key: 'new', label: '+ New Booking', path: '/admin/bookings/new' },
    { key: 'pending', label: 'Pending Bookings', path: '/admin/bookings/pending' },
    { key: 'confirmed', label: 'Confirmed Bookings', path: '/admin/bookings/confirmed' },
    { key: 'cancelled', label: 'Cancelled Bookings', path: '/admin/bookings/cancelled' }
  ];

  const tabsHtml = `
    <div class="adm-subnav-pills">
      ${subTabs.map(t => `
        <a href="${t.path}" class="adm-subpill ${subView === t.key ? 'active' : ''}" onclick="event.preventDefault(); navigateAdmin('${t.path}')">${esc(t.label)}</a>
      `).join('')}
    </div>
  `;

  if (subView === 'new') {
    container.innerHTML = `
      ${tabsHtml}
      <div class="adm-card">
        <div class="adm-card-header">
          <h2 class="adm-card-title">Schedule New Doorstep Pickup Booking (/api/pickups)</h2>
        </div>
        <form onsubmit="event.preventDefault(); submitAdminNewPickupBooking();" class="adm-form-grid" style="max-width:820px;">
          <div class="adm-field">
            <label>Sender Full Name *</label>
            <input type="text" id="bkSenderName" placeholder="e.g. Neha Kapoor" required>
          </div>
          <div class="adm-field">
            <label>Sender Mobile / WhatsApp *</label>
            <input type="text" id="bkSenderPhone" placeholder="+91 98201 55443" required>
          </div>
          <div class="adm-field">
            <label>Sender Email</label>
            <input type="email" id="bkSenderEmail" placeholder="neha@company.com">
          </div>
          <div class="adm-field">
            <label>Destination Country *</label>
            <select id="bkDestCountry">
              <option value="United States">United States</option>
              <option value="United Kingdom">United Kingdom</option>
              <option value="Australia">Australia</option>
              <option value="Canada">Canada</option>
              <option value="United Arab Emirates">United Arab Emirates</option>
              <option value="Germany">Germany</option>
            </select>
          </div>
          <div class="adm-field full">
            <label>Complete Pickup Street Address, City &amp; PIN *</label>
            <input type="text" id="bkAddress" placeholder="Plot 42, MIDC Andheri East, Mumbai 400093" required>
          </div>
          <div class="adm-field">
            <label>Pickup Date *</label>
            <input type="date" id="bkDate" value="2026-10-28" required>
          </div>
          <div class="adm-field">
            <label>Time Slot *</label>
            <select id="bkSlot">
              <option value="10:00 AM – 01:00 PM">10:00 AM – 01:00 PM</option>
              <option value="01:00 PM – 04:00 PM">01:00 PM – 04:00 PM</option>
              <option value="04:00 PM – 07:00 PM">04:00 PM – 07:00 PM</option>
            </select>
          </div>
          <div class="adm-field">
            <label>Package Type *</label>
            <select id="bkPkgType">
              <option value="document">Document</option>
              <option value="parcel">Parcel</option>
              <option value="medicine">Medicine</option>
              <option value="ecommerce">E-commerce</option>
            </select>
          </div>
          <div class="adm-field">
            <label>Weight (kg) *</label>
            <input type="number" id="bkWeight" value="2.0" step="0.5" min="0.5" required>
          </div>
          <div class="adm-field full">
            <button type="submit" class="adm-btn-new" style="width:fit-content;">Confirm &amp; Save Pickup Booking</button>
          </div>
        </form>
      </div>
    `;
    return;
  }

  // Merge pickups, quotes, and service enquiries into unified bookings table
  const combined = [
    ...(admState.pickups || []).map(p => ({
      ref: p.pickupRef,
      type: 'Doorstep Pickup',
      customer: p.senderName,
      contact: p.senderPhone || p.senderEmail,
      route: `${p.originCountry || 'India'} ➔ ${p.destCountry}`,
      details: `${p.packageTypeLabel || p.packageType} • ${p.weight} ${p.weightUnit || 'kg'} (${p.pickupDate || ''})`,
      status: p.status || 'Pending',
      date: (p.createdAt || '').slice(0, 10)
    })),
    ...(admState.quotes || []).map(q => ({
      ref: q.quoteId,
      type: 'Quote Request',
      customer: q.senderName,
      contact: q.phone || q.email,
      route: `${q.originCountry || 'India'} ➔ ${q.destCountry}`,
      details: `${q.packageTypeLabel || q.packageType} • ${q.chargeableWeightKg || q.weight} kg`,
      status: q.status || 'Pending',
      date: (q.createdAt || '').slice(0, 10)
    })),
    ...(admState.serviceEnquiries || []).map(e => ({
      ref: e.enquiryId,
      type: e.serviceType === 'ecommerce' ? 'E-commerce Enquiry' : 'Bulk Cargo Enquiry',
      customer: e.contactName || e.contactPerson || e.storeName || e.companyName,
      contact: e.phone || e.email,
      route: `${e.originCountry || 'India'} ➔ ${e.destCountry}`,
      details: `Chargeable ${e.chargeableWeightKg || e.weight || e.totalWeight} kg`,
      status: e.status || 'Pending',
      date: (e.createdAt || '').slice(0, 10)
    })),
    ...(admState.store.shipments || []).map(s => ({
      ref: s.trackingNo,
      type: 'Direct Shipment Booking',
      customer: s.customer,
      contact: s.phone || s.email,
      route: `${s.fromCountry} ➔ ${s.toCountry}`,
      details: `${s.type} • ${s.weight} (${s.carrier || 'DHL'})`,
      status: s.status,
      date: s.date
    }))
  ];

  let filtered = combined;
  if (subView === 'pending') filtered = combined.filter(b => b.status.toLowerCase().includes('pend') || b.status.toLowerCase().includes('schedul'));
  if (subView === 'confirmed') filtered = combined.filter(b => b.status.toLowerCase().includes('book') || b.status.toLowerCase().includes('confirm') || b.status.toLowerCase().includes('approv') || b.status.toLowerCase().includes('pick') || b.status.toLowerCase().includes('transit') || b.status.toLowerCase().includes('deliver'));
  if (subView === 'cancelled') filtered = combined.filter(b => b.status.toLowerCase().includes('cancel') || b.status.toLowerCase().includes('reject'));

  if (admState.filterText) {
    const q = admState.filterText.toLowerCase();
    filtered = filtered.filter(b =>
      String(b.ref || '').toLowerCase().includes(q) ||
      String(b.customer || '').toLowerCase().includes(q) ||
      String(b.route || '').toLowerCase().includes(q) ||
      String(b.status || '').toLowerCase().includes(q)
    );
  }

  const pageKey = `bookings-${subView || 'all'}`;
  const { pageItems, page, pageSize, totalPages, startIdx, endIdx, totalCount } = getPaginatedSlice(pageKey, filtered, 5);

  const selBk = admState.selectedRecord?.type === 'booking'
    ? combined.find(b => b.ref === admState.selectedRecord.id)
    : null;
  const bkBannerHtml = selBk ? `
    <div class="adm-detail-banner" id="admSelectedBookingDetail">
      <div style="flex:1; min-width:0;">
        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
          <span style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--adm-red-bright);">Booking Record Details</span>
          <span class="adm-status-pill ${statusPillClass(selBk.status)}">${esc(selBk.status)}</span>
        </div>
        <h3 style="font-size:16px; font-weight:800; color:#0F172A; margin-top:4px;">${esc(selBk.ref)} — ${esc(selBk.customer)}</h3>
        <div class="adm-detail-grid">
          <div><strong>Booking Type</strong>${esc(selBk.type)}</div>
          <div><strong>Route Corridor</strong>${esc(selBk.route)}</div>
          <div><strong>Package Details</strong>${esc(selBk.details)}</div>
          <div><strong>Contact</strong>${esc(selBk.contact || '—')}</div>
          <div><strong>Booking Date</strong>${esc(selBk.date)}</div>
        </div>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <button type="button" class="adm-btn-secondary" style="height:30px; padding:0 12px; font-size:12px; white-space:nowrap; flex-shrink:0; width:max-content; display:inline-flex; align-items:center; justify-content:center;" onclick="inspectShipment('${esc(selBk.ref)}')">Track Reference</button>
        <button type="button" class="adm-btn-secondary" style="height:30px; padding:0 12px; font-size:12px; white-space:nowrap; flex-shrink:0; width:max-content; display:inline-flex; align-items:center; justify-content:center;" onclick="clearSelectedSearchRecord()">Show All Bookings</button>
      </div>
    </div>
  ` : '';

  container.innerHTML = `
    ${tabsHtml}
    ${bkBannerHtml}
    <div class="adm-card">
      <div class="adm-card-header">
        <h2 class="adm-card-title">${esc(ADMIN_ROUTES[admState.currentPath]?.title || 'Bookings')} (${totalCount})</h2>
        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
          <label for="pageSize-${pageKey}" style="font-size:12px; color:#64748B; font-weight:600;">Rows per page:</label>
          <select id="pageSize-${pageKey}" class="adm-page-size-select" onchange="setAdminPageSize('${pageKey}', this.value)">
            ${[5, 8, 10, 15].map(sz => `<option value="${sz}" ${pageSize === sz ? 'selected' : ''}>${sz} / page</option>`).join('')}
          </select>
          <button type="button" class="adm-btn-new" onclick="navigateAdmin('/admin/bookings/new')">+ New Booking</button>
        </div>
      </div>
      <div class="adm-table-wrap">
        <table class="adm-table">
          <thead>
            <tr>
              <th>Booking Ref</th>
              <th>Booking Type</th>
              <th>Customer</th>
              <th>Contact</th>
              <th>Route</th>
              <th>Package Details</th>
              <th>Date</th>
              <th>Status</th>
              <th>Update Status</th>
            </tr>
          </thead>
          <tbody>
            ${pageItems.length === 0 ? `<tr><td colspan="9" style="text-align:center; padding:24px; color:#64748B;">No bookings in this view.</td></tr>` : pageItems.map(b => `
              <tr>
                <td><strong class="adm-trk-code">${esc(b.ref)}</strong></td>
                <td>${esc(b.type)}</td>
                <td><strong>${esc(b.customer)}</strong></td>
                <td>${esc(b.contact || '—')}</td>
                <td>${esc(b.route)}</td>
                <td>${esc(b.details)}</td>
                <td>${esc(b.date)}</td>
                <td><span class="adm-status-pill ${statusPillClass(b.status)}">${esc(b.status)}</span></td>
                <td>
                  <select class="adm-inline-select" onchange="updateUnifiedRecordStatus('${esc(b.ref)}', this.value)">
                    ${['Pending', 'Courier Assigned', 'Picked Up', 'In Transit', 'Delivered', 'Approved', 'Cancelled'].map(st => `<option value="${st}" ${b.status === st ? 'selected' : ''}>${st}</option>`).join('')}
                  </select>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ${renderPaginationBar(pageKey, totalCount, page, pageSize, totalPages, startIdx, endIdx)}
    </div>
  `;
}

async function submitAdminNewPickupBooking() {
  const payload = {
    senderName: document.getElementById('bkSenderName').value.trim(),
    senderPhone: document.getElementById('bkSenderPhone').value.trim(),
    senderEmail: document.getElementById('bkSenderEmail').value.trim(),
    destCountry: document.getElementById('bkDestCountry').value,
    originCountry: 'India',
    pickupAddress: document.getElementById('bkAddress').value.trim(),
    pickupDate: document.getElementById('bkDate').value,
    pickupTimeSlot: document.getElementById('bkSlot').value,
    packageType: document.getElementById('bkPkgType').value,
    weight: parseFloat(document.getElementById('bkWeight').value) || 1.0,
    weightUnit: 'kg'
  };
  const res = await fetch('/api/pickups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (res.ok && data.ok) {
    showAdminToast(`Pickup Booking ${data.pickup.pickupRef} saved!`);
    await fetchAdminBackendData();
    navigateAdmin('/admin/bookings');
  } else {
    showAdminToast(data.error || 'Failed to create booking');
  }
}

async function updateUnifiedRecordStatus(refId, status) {
  const res = await fetch('/api/admin/update-status', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': ADMIN_API_KEY
    },
    body: JSON.stringify({ referenceId: refId, status })
  });
  const data = await res.json();
  if (res.ok && data.ok) {
    showAdminToast(`Record ${refId} updated to ${status}`);
    await fetchAdminBackendData();
  }
}

/* ==========================================================================
   5. CUSTOMERS SECTION
   ========================================================================== */
function renderCustomersSection(container) {
  const customerMap = new Map();

  // Aggregate from real business accounts, business enquiries, pickups, quotes, and shipments
  (admState.businessAccounts || []).forEach(acc => {
    const key = (acc.email || acc.companyName || acc.referenceId).toLowerCase();
    customerMap.set(key, {
      id: acc.referenceId,
      name: acc.contactName || acc.companyName,
      company: acc.companyName || 'Corporate Account',
      email: acc.email || '—',
      phone: acc.phone || '—',
      gstin: acc.gstin || '—',
      type: 'Business Account',
      status: acc.status || 'Approved',
      shipmentsCount: 1,
      lastRoute: acc.primaryCorridors || 'Global'
    });
  });

  (admState.businessRecords || []).forEach(rec => {
    const key = (rec.email || rec.companyName || rec.referenceId).toLowerCase();
    if (!customerMap.has(key)) {
      customerMap.set(key, {
        id: rec.referenceId,
        name: rec.contactName || rec.companyName,
        company: rec.companyName || 'Business Enquiry',
        email: rec.email || '—',
        phone: rec.phone || '—',
        gstin: rec.gstin || '—',
        type: rec.requestTypeLabel || 'Corporate Lead',
        status: rec.status || 'Pending',
        shipmentsCount: 1,
        lastRoute: rec.primaryCountries || 'Global'
      });
    }
  });

  (admState.store.shipments || []).forEach(shp => {
    const key = (shp.email || shp.customer).toLowerCase();
    const existing = customerMap.get(key);
    if (existing) {
      existing.shipmentsCount += 1;
      existing.lastRoute = `${shp.fromCountry} ➔ ${shp.toCountry}`;
    } else {
      customerMap.set(key, {
        id: `CUS-${shp.trackingNo.slice(-4)}`,
        name: shp.customer,
        company: 'Individual / Direct Shipper',
        email: shp.email || '—',
        phone: shp.phone || '—',
        gstin: 'Personal KYC Verified',
        type: `${shp.type} Shipper`,
        status: 'Active',
        shipmentsCount: 1,
        lastRoute: `${shp.fromCountry} ➔ ${shp.toCountry}`
      });
    }
  });

  (admState.pickups || []).forEach(pkp => {
    const key = (pkp.senderEmail || pkp.senderName || pkp.pickupRef).toLowerCase();
    if (!customerMap.has(key)) {
      customerMap.set(key, {
        id: pkp.pickupRef,
        name: pkp.senderName,
        company: 'Doorstep Pickup Shipper',
        email: pkp.senderEmail || '—',
        phone: pkp.senderPhone || '—',
        gstin: 'Individual KYC',
        type: 'Pickup Customer',
        status: pkp.status || 'Active',
        shipmentsCount: 1,
        lastRoute: `${pkp.originCountry} ➔ ${pkp.destCountry}`
      });
    }
  });

  let customers = Array.from(customerMap.values());
  const allCustomers = customers;
  if (admState.filterText) {
    const q = admState.filterText.toLowerCase();
    customers = customers.filter(c =>
      (c.id || '').toLowerCase().includes(q) ||
      (c.name || '').toLowerCase().includes(q) ||
      (c.company || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q) ||
      (c.lastRoute || '').toLowerCase().includes(q)
    );
  }

  const pageKey = 'customers-list';
  const { pageItems, page, pageSize, totalPages, startIdx, endIdx, totalCount } = getPaginatedSlice(pageKey, customers, 5);

  const selCust = admState.selectedRecord?.type === 'customer'
    ? allCustomers.find(c => c.id === admState.selectedRecord.id || c.name === admState.selectedRecord.id)
    : null;
  const custBannerHtml = selCust ? `
    <div class="adm-detail-banner" id="admSelectedCustomerDetail">
      <div style="flex:1; min-width:0;">
        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
          <span style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--adm-red-bright);">Customer Profile Details</span>
          <span class="adm-status-pill ${statusPillClass(selCust.status)}">${esc(selCust.status)}</span>
        </div>
        <h3 style="font-size:16px; font-weight:800; color:#0F172A; margin-top:4px;">${esc(selCust.name)} (${esc(selCust.id)})</h3>
        <div class="adm-detail-grid">
          <div><strong>Account Type</strong>${esc(selCust.company)} (${esc(selCust.type)})</div>
          <div><strong>Email Address</strong>${esc(selCust.email)}</div>
          <div><strong>Phone Number</strong>${esc(selCust.phone)}</div>
          <div><strong>KYC / GSTIN</strong>${esc(selCust.gstin)}</div>
          <div><strong>Primary Corridor</strong>${esc(selCust.lastRoute)}</div>
          <div><strong>Total Shipments</strong>${esc(selCust.shipmentsCount)}</div>
        </div>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <button type="button" class="adm-btn-secondary" style="height:30px; padding:0 12px; font-size:12px; white-space:nowrap; flex-shrink:0; width:max-content; display:inline-flex; align-items:center; justify-content:center;" onclick="clearSelectedSearchRecord()">Show All Customers</button>
      </div>
    </div>
  ` : '';

  container.innerHTML = `
    ${custBannerHtml}
    <div class="adm-card">
      <div class="adm-card-header">
        <h2 class="adm-card-title">Customer Directory &amp; Shipment History (${totalCount})</h2>
        <div style="display:flex; align-items:center; gap:8px;">
          <label for="pageSize-${pageKey}" style="font-size:12px; color:#64748B; font-weight:600;">Rows per page:</label>
          <select id="pageSize-${pageKey}" class="adm-page-size-select" onchange="setAdminPageSize('${pageKey}', this.value)">
            ${[5, 8, 10, 15].map(sz => `<option value="${sz}" ${pageSize === sz ? 'selected' : ''}>${sz} / page</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="adm-table-wrap">
        <table class="adm-table">
          <thead>
            <tr>
              <th>Customer ID</th>
              <th>Full Name</th>
              <th>Company / Account Type</th>
              <th>Email Address</th>
              <th>Phone</th>
              <th>KYC / GSTIN</th>
              <th>Corridor / Route</th>
              <th>Shipments</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${pageItems.map(c => `
              <tr>
                <td><strong class="adm-trk-code">${esc(c.id)}</strong></td>
                <td><strong>${esc(c.name)}</strong></td>
                <td>${esc(c.company)} <span style="color:#64748B; font-size:11px;">(${esc(c.type)})</span></td>
                <td>${esc(c.email)}</td>
                <td>${esc(c.phone)}</td>
                <td>${esc(c.gstin)}</td>
                <td>${esc(c.lastRoute)}</td>
                <td><strong>${c.shipmentsCount}</strong></td>
                <td><span class="adm-status-pill ${statusPillClass(c.status)}">${esc(c.status)}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ${renderPaginationBar(pageKey, totalCount, page, pageSize, totalPages, startIdx, endIdx)}
    </div>
  `;
}

/* ==========================================================================
   6. RATES & PRICING SECTION
   ========================================================================== */
function renderRatesSection(container, subView) {
  const subTabs = [
    { key: 'calculator', label: 'Rate Calculator', path: '/admin/rates/calculator' },
    { key: 'pricing-rules', label: 'Pricing Rules', path: '/admin/rates/pricing-rules' },
    { key: 'shipping-rates', label: 'Shipping Rates', path: '/admin/rates/shipping-rates' },
    { key: 'additional-charges', label: 'Additional Charges', path: '/admin/rates/additional-charges' },
    { key: 'rate-plans', label: 'Manage Rate Plans', path: '/admin/rates/rate-plans' }
  ];

  const tabsHtml = `
    <div class="adm-subnav-pills">
      ${subTabs.map(t => `
        <a href="${t.path}" class="adm-subpill ${subView === t.key ? 'active' : ''}" onclick="event.preventDefault(); navigateAdmin('${t.path}')">${esc(t.label)}</a>
      `).join('')}
    </div>
  `;

  if (subView === 'calculator') {
    container.innerHTML = `
      ${tabsHtml}
      <div class="adm-card">
        <div class="adm-card-header">
          <h2 class="adm-card-title">Admin Chargeable Weight &amp; Service Tier Calculator (/api/rates)</h2>
          <div style="display:flex; gap:8px;">
            <button type="button" class="adm-btn-secondary" style="height:30px; padding:0 12px; font-size:12px; white-space:nowrap; flex-shrink:0; width:max-content; display:inline-flex; align-items:center; justify-content:center;" onclick="setAdminCalcDimensions(35, 25, 20)">Sample Box (35×25×20 cm)</button>
            <button type="button" class="adm-btn-secondary" style="height:30px; padding:0 12px; font-size:12px; white-space:nowrap; flex-shrink:0; width:max-content; display:inline-flex; align-items:center; justify-content:center;" onclick="setAdminCalcDimensions('', '', '')">Clear Dimensions</button>
          </div>
        </div>
        <form onsubmit="event.preventDefault(); runAdminRateCalc(true);" class="adm-form-grid" style="max-width:920px; margin-bottom:18px;">
          <div class="adm-field">
            <label for="rcOrigin">Origin Country</label>
            <select id="rcOrigin" onchange="runAdminRateCalc()">
              <option value="India" selected>India</option>
              <option value="United Arab Emirates">United Arab Emirates</option>
              <option value="Singapore">Singapore</option>
              <option value="United Kingdom">United Kingdom</option>
              <option value="United States">United States</option>
            </select>
          </div>
          <div class="adm-field">
            <label for="rcDest">Destination Country</label>
            <select id="rcDest" onchange="runAdminRateCalc()">
              <option value="United States" selected>United States (Zone D — North America)</option>
              <option value="United Kingdom">United Kingdom (Zone C — UK &amp; Europe)</option>
              <option value="United Arab Emirates">United Arab Emirates (Zone A — Middle East)</option>
              <option value="Canada">Canada (Zone D — North America)</option>
              <option value="Australia">Australia (Zone F — Oceania)</option>
              <option value="Germany">Germany (Zone C — UK &amp; Europe)</option>
              <option value="Singapore">Singapore (Zone B — Southeast Asia)</option>
              <option value="Saudi Arabia">Saudi Arabia (Zone A — Middle East)</option>
              <option value="France">France (Zone C — UK &amp; Europe)</option>
              <option value="Japan">Japan (Zone E — East Asia)</option>
              <option value="New Zealand">New Zealand (Zone F — Oceania)</option>
              <option value="Netherlands">Netherlands (Zone C — UK &amp; Europe)</option>
              <option value="Malaysia">Malaysia (Zone B — Southeast Asia)</option>
              <option value="Qatar">Qatar (Zone A — Middle East)</option>
            </select>
          </div>
          <div class="adm-field">
            <label for="rcType">Package Category</label>
            <select id="rcType" onchange="onAdminCalcCategoryChange()">
              <option value="document">Document (max 5 kg)</option>
              <option value="parcel">Parcel (max 70 kg)</option>
              <option value="medicine">Medicine Courier (max 70 kg)</option>
              <option value="ecommerce">E-commerce CSB-V (max 70 kg)</option>
              <option value="bulk">Bulk &amp; Commercial (max 5000 kg)</option>
              <option value="other">Specialized Cargo (max 100 kg)</option>
            </select>
          </div>
          <div class="adm-field">
            <label for="rcWeight">Actual Weight &amp; Unit</label>
            <div style="display:flex; gap:6px;">
              <input type="number" id="rcWeight" value="2.5" step="any" min="0.1" required style="flex:1;" oninput="runAdminRateCalc()">
              <select id="rcUnit" style="width:76px;" onchange="runAdminRateCalc()">
                <option value="kg" selected>kg</option>
                <option value="lb">lb</option>
              </select>
            </div>
          </div>
          <div class="adm-field">
            <label>Dimensions L × W × H (cm, optional)</label>
            <div style="display:flex; gap:6px;">
              <input type="number" id="rcL" placeholder="L (cm)" value="" step="any" min="1" style="width:100%;" oninput="runAdminRateCalc()">
              <input type="number" id="rcW" placeholder="W (cm)" value="" step="any" min="1" style="width:100%;" oninput="runAdminRateCalc()">
              <input type="number" id="rcH" placeholder="H (cm)" value="" step="any" min="1" style="width:100%;" oninput="runAdminRateCalc()">
            </div>
          </div>
          <div class="adm-field" style="justify-content:flex-end;">
            <button type="submit" class="adm-btn-new" style="width:100%; justify-content:center;">Calculate Chargeable Weight &amp; Tiers</button>
          </div>
        </form>
        <div id="rcResultBox"></div>
      </div>
    `;
    runAdminRateCalc();
    return;
  }

  if (subView === 'pricing-rules') {
    const rules = Object.entries(admState.packageRules || {});
    const pageKey = 'rates-pricing-rules';
    const { pageItems, page, pageSize, totalPages, startIdx, endIdx, totalCount } = getPaginatedSlice(pageKey, rules, 4);
    container.innerHTML = `
      ${tabsHtml}
      <div class="adm-card" style="margin-bottom:16px;">
        <div class="adm-card-header">
          <h2 class="adm-card-title">Backend Package Pricing &amp; Volumetric Rules (${totalCount})</h2>
          <div style="display:flex; align-items:center; gap:8px;">
            <label for="pageSize-${pageKey}" style="font-size:12px; color:#64748B; font-weight:600;">Rows per page:</label>
            <select id="pageSize-${pageKey}" class="adm-page-size-select" onchange="setAdminPageSize('${pageKey}', this.value)">
              ${[3, 4, 5, 10].map(sz => `<option value="${sz}" ${pageSize === sz ? 'selected' : ''}>${sz} / page</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="adm-table-wrap">
          <table class="adm-table">
            <thead>
              <tr>
                <th>Category Key</th>
                <th>Display Label</th>
                <th>Max Weight (kg)</th>
                <th>Volumetric Divisor</th>
                <th>Compliance &amp; Packaging Rule</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${pageItems.map(([k, r]) => `
                <tr>
                  <td><strong class="adm-trk-code">${esc(k)}</strong></td>
                  <td><strong>${esc(r.label)}</strong></td>
                  <td>${esc(r.maxWeightKg)} kg</td>
                  <td>L × W × H ÷ ${esc(r.volumetricDivisor)}</td>
                  <td class="adm-desc-cell" style="max-width:440px;">${esc(r.ruleNote)}</td>
                  <td>
                    <button type="button" class="adm-btn-secondary" style="height:30px; padding:0 12px; font-size:12px; white-space:nowrap; flex-shrink:0; width:max-content; display:inline-flex; align-items:center; justify-content:center;" onclick="editPricingRule('${esc(k)}')">Edit Rule</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ${renderPaginationBar(pageKey, totalCount, page, pageSize, totalPages, startIdx, endIdx)}
      </div>

      <div class="adm-card" id="prFormCard">
        <div class="adm-card-header">
          <h2 class="adm-card-title">Update Package Pricing &amp; Volumetric Rule</h2>
        </div>
        <form onsubmit="event.preventDefault(); savePricingRuleForm();" class="adm-form-grid" style="max-width:920px;">
          <div class="adm-field">
            <label for="prKey">Package Category</label>
            <select id="prKey" onchange="editPricingRule(this.value)">
              ${rules.map(([k, r]) => `<option value="${esc(k)}">${esc(r.label)} (${esc(k)})</option>`).join('')}
            </select>
          </div>
          <div class="adm-field">
            <label for="prMaxW">Max Allowed Weight (kg)</label>
            <input type="number" id="prMaxW" step="any" min="0.5" value="${esc(rules[0]?.[1]?.maxWeightKg || 5)}" required>
          </div>
          <div class="adm-field">
            <label for="prDivisor">Volumetric Divisor (cm³/kg)</label>
            <input type="number" id="prDivisor" step="100" min="1000" value="${esc(rules[0]?.[1]?.volumetricDivisor || 5000)}" required>
          </div>
          <div class="adm-field">
            <label for="prNote">Compliance &amp; Packaging Rule Note</label>
            <input type="text" id="prNote" value="${esc(rules[0]?.[1]?.ruleNote || '')}" required>
          </div>
          <div class="adm-field full" style="flex-direction:row; justify-content:flex-end; gap:10px; margin-top:4px;">
            <button type="submit" class="adm-btn-new">Save Pricing Rule</button>
          </div>
        </form>
      </div>
    `;
    return;
  }

  if (subView === 'additional-charges') {
    const charges = admState.store.additionalCharges || [];
    const pageKey = 'rates-additional-charges';
    const { pageItems, page, pageSize, totalPages, startIdx, endIdx, totalCount } = getPaginatedSlice(pageKey, charges, 4);
    container.innerHTML = `
      ${tabsHtml}
      <div class="adm-card" style="margin-bottom:16px;">
        <div class="adm-card-header">
          <h2 class="adm-card-title">Additional Surcharges &amp; Clearance Fees (${totalCount})</h2>
          <div style="display:flex; align-items:center; gap:8px;">
            <label for="pageSize-${pageKey}" style="font-size:12px; color:#64748B; font-weight:600;">Rows per page:</label>
            <select id="pageSize-${pageKey}" class="adm-page-size-select" onchange="setAdminPageSize('${pageKey}', this.value)">
              ${[3, 4, 5, 10].map(sz => `<option value="${sz}" ${pageSize === sz ? 'selected' : ''}>${sz} / page</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="adm-table-wrap">
          <table class="adm-table">
            <thead>
              <tr>
                <th>Charge Code</th>
                <th>Surcharge Name</th>
                <th>Calculation Type</th>
                <th>Rate / Fee</th>
                <th>Applies To</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${pageItems.map(c => {
                const st = c.status || 'Active';
                return `
                <tr>
                  <td><strong class="adm-trk-code">${esc(c.id)}</strong></td>
                  <td><strong>${esc(c.name)}</strong></td>
                  <td>${esc(c.type)}</td>
                  <td><strong>${esc(c.amount)}</strong></td>
                  <td>${esc(c.appliesTo)}</td>
                  <td><span class="adm-status-pill ${statusPillClass(st)}">${esc(st)}</span></td>
                  <td>
                    <div style="display:inline-flex; gap:6px; align-items:center;">
                      <button type="button" class="adm-btn-secondary" style="height:30px; padding:0 12px; font-size:12px; white-space:nowrap; flex-shrink:0; width:max-content; display:inline-flex; align-items:center; justify-content:center;" onclick="editAdditionalCharge('${esc(c.id)}')">Edit</button>
                      <button type="button" class="adm-btn-secondary" style="height:30px; padding:0 12px; font-size:12px; white-space:nowrap; flex-shrink:0; width:max-content; display:inline-flex; align-items:center; justify-content:center;" onclick="toggleAdditionalChargeStatus('${esc(c.id)}')">${st === 'Active' ? 'Pause' : 'Activate'}</button>
                      <button type="button" class="adm-btn-secondary" style="height:30px; padding:0 12px; font-size:12px; color:#DC2626; border-color:#FECACA; white-space:nowrap; flex-shrink:0; width:max-content; display:inline-flex; align-items:center; justify-content:center;" onclick="deleteAdditionalChargeItem('${esc(c.id)}')">Delete</button>
                    </div>
                  </td>
                </tr>
              `;
              }).join('')}
            </tbody>
          </table>
        </div>
        ${renderPaginationBar(pageKey, totalCount, page, pageSize, totalPages, startIdx, endIdx)}
      </div>

      <div class="adm-card" id="chgFormCard">
        <div class="adm-card-header">
          <h2 class="adm-card-title" id="chgFormTitle">Add / Update Additional Surcharge &amp; Clearance Fee</h2>
          <button type="button" class="adm-btn-secondary" style="height:30px; padding:0 12px; font-size:12px; white-space:nowrap; flex-shrink:0; width:max-content; display:inline-flex; align-items:center; justify-content:center;" onclick="resetAdditionalChargeForm()">+ New Surcharge</button>
        </div>
        <form onsubmit="event.preventDefault(); saveAdditionalChargeForm();" class="adm-form-grid" style="max-width:920px;">
          <div class="adm-field">
            <label for="chgId">Charge Code</label>
            <input type="text" id="chgId" placeholder="e.g., CHG-HAZMAT" required>
          </div>
          <div class="adm-field">
            <label for="chgName">Surcharge Name</label>
            <input type="text" id="chgName" placeholder="e.g., Dangerous Goods / Dry Ice Handling" required>
          </div>
          <div class="adm-field">
            <label for="chgType">Calculation Type</label>
            <select id="chgType">
              <option value="Flat Fee">Flat Fee</option>
              <option value="Percentage">Percentage</option>
              <option value="Per Kg">Per Kg</option>
            </select>
          </div>
          <div class="adm-field">
            <label for="chgAmount">Rate / Fee Amount</label>
            <input type="text" id="chgAmount" placeholder="e.g., ₹ 850 or 14.5%" required>
          </div>
          <div class="adm-field">
            <label for="chgAppliesTo">Applies To Corridor / Category</label>
            <input type="text" id="chgAppliesTo" placeholder="e.g., All International Air Shipments" required>
          </div>
          <div class="adm-field">
            <label for="chgStatus">Status</label>
            <select id="chgStatus">
              <option value="Active" selected>Active</option>
              <option value="Paused">Paused</option>
            </select>
          </div>
          <div class="adm-field full" style="flex-direction:row; justify-content:flex-end; gap:10px; margin-top:4px;">
            <button type="button" class="adm-btn-secondary" onclick="resetAdditionalChargeForm()">Clear</button>
            <button type="submit" class="adm-btn-new">Save Surcharge</button>
          </div>
        </form>
      </div>
    `;
    return;
  }

  if (subView === 'shipping-rates') {
    const countries = admState.store.locations?.countries || [];
    const plans = admState.store.ratePlans || [];
    const shippingRows = [];
    countries.forEach((c, idx) => {
      plans.forEach((p, pIdx) => {
        shippingRows.push({
          code: `SR-${c.code}-${pIdx + 1}`,
          corridor: `India ➔ ${c.name}`,
          countryCode: c.code,
          zone: c.zone,
          tier: p.name,
          transit: c.transitDays || p.transit,
          rateInr: p.baseInrPerKg + (idx * 120),
          carrier: p.carrier,
          status: (c.serviceable && p.status !== 'Paused') ? 'Active' : 'Paused'
        });
      });
    });

    const pageKey = 'rates-shipping-rates';
    const { pageItems, page, pageSize, totalPages, startIdx, endIdx, totalCount } = getPaginatedSlice(pageKey, shippingRows, 5);
    container.innerHTML = `
      ${tabsHtml}
      <div class="adm-card">
        <div class="adm-card-header">
          <h2 class="adm-card-title">International Corridor Shipping Rates (${totalCount})</h2>
          <div style="display:flex; align-items:center; gap:8px;">
            <label for="pageSize-${pageKey}" style="font-size:12px; color:#64748B; font-weight:600;">Rows per page:</label>
            <select id="pageSize-${pageKey}" class="adm-page-size-select" onchange="setAdminPageSize('${pageKey}', this.value)">
              ${[5, 8, 10, 15].map(sz => `<option value="${sz}" ${pageSize === sz ? 'selected' : ''}>${sz} / page</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="adm-table-wrap">
          <table class="adm-table">
            <thead>
              <tr>
                <th>Rate Code</th>
                <th>Corridor</th>
                <th>Tariff Zone</th>
                <th>Service Tier</th>
                <th>Transit SLA</th>
                <th>Base Rate (INR / kg)</th>
                <th>Carrier</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${pageItems.map(r => `
                <tr>
                  <td><strong class="adm-trk-code">${esc(r.code)}</strong></td>
                  <td><span class="adm-country-inline"><span class="adm-flag-sm">${ADM_FLAGS[r.countryCode] || ADM_FLAGS.US}</span><strong>${esc(r.corridor)}</strong></span></td>
                  <td>${esc(r.zone)}</td>
                  <td>${esc(r.tier)}</td>
                  <td>${esc(r.transit)}</td>
                  <td><strong>₹ ${esc(r.rateInr)} / kg</strong></td>
                  <td>${esc(r.carrier)}</td>
                  <td><span class="adm-status-pill ${statusPillClass(r.status)}">${esc(r.status)}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ${renderPaginationBar(pageKey, totalCount, page, pageSize, totalPages, startIdx, endIdx)}
      </div>
    `;
    return;
  }

  // Manage Rate Plans
  const plans = admState.store.ratePlans || [];
  const planPageKey = 'rates-rate-plans';
  const { pageItems: planItems, page: pPage, pageSize: pSize, totalPages: pTotalPages, startIdx: pStart, endIdx: pEnd, totalCount: pTotal } = getPaginatedSlice(planPageKey, plans, 4);
  container.innerHTML = `
    ${tabsHtml}
    <div class="adm-card" style="margin-bottom:16px;">
      <div class="adm-card-header">
        <h2 class="adm-card-title">Manage Carrier Service Rate Plans (${pTotal})</h2>
        <div style="display:flex; align-items:center; gap:8px;">
          <label for="pageSize-${planPageKey}" style="font-size:12px; color:#64748B; font-weight:600;">Rows per page:</label>
          <select id="pageSize-${planPageKey}" class="adm-page-size-select" onchange="setAdminPageSize('${planPageKey}', this.value)">
            ${[3, 4, 5, 10].map(sz => `<option value="${sz}" ${pSize === sz ? 'selected' : ''}>${sz} / page</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="adm-table-wrap">
        <table class="adm-table">
          <thead>
            <tr>
              <th>Plan ID</th>
              <th>Service Tier Name</th>
              <th>Transit SLA</th>
              <th>Base Tariff (INR / kg)</th>
              <th>Weight Range</th>
              <th>Assigned Carriers</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${planItems.map(p => {
              const st = p.status || 'Active';
              return `
              <tr>
                <td><strong class="adm-trk-code">${esc(p.id)}</strong></td>
                <td><strong>${esc(p.name)}</strong></td>
                <td>${esc(p.transit)}</td>
                <td><strong>₹ ${esc(p.baseInrPerKg)} / kg</strong></td>
                <td>${esc(p.minWeightKg)} – ${esc(p.maxWeightKg)} kg</td>
                <td>${esc(p.carrier)}</td>
                <td><span class="adm-status-pill ${statusPillClass(st)}">${esc(st)}</span></td>
                <td>
                  <div style="display:inline-flex; gap:6px; align-items:center;">
                    <button type="button" class="adm-btn-secondary" style="height:30px; padding:0 12px; font-size:12px; white-space:nowrap; flex-shrink:0; width:max-content; display:inline-flex; align-items:center; justify-content:center;" onclick="editRatePlanItem('${esc(p.id)}')">Edit</button>
                    <button type="button" class="adm-btn-secondary" style="height:30px; padding:0 12px; font-size:12px; white-space:nowrap; flex-shrink:0; width:max-content; display:inline-flex; align-items:center; justify-content:center;" onclick="toggleRatePlanStatus('${esc(p.id)}')">${st === 'Active' ? 'Pause' : 'Activate'}</button>
                    <button type="button" class="adm-btn-secondary" style="height:30px; padding:0 12px; font-size:12px; color:#DC2626; border-color:#FECACA; white-space:nowrap; flex-shrink:0; width:max-content; display:inline-flex; align-items:center; justify-content:center;" onclick="deleteRatePlanItem('${esc(p.id)}')">Delete</button>
                  </div>
                </td>
              </tr>
            `;
            }).join('')}
          </tbody>
        </table>
      </div>
      ${renderPaginationBar(planPageKey, pTotal, pPage, pSize, pTotalPages, pStart, pEnd)}
    </div>

    <div class="adm-card" id="planFormCard">
      <div class="adm-card-header">
        <h2 class="adm-card-title" id="planFormTitle">Add / Update Carrier Service Rate Plan</h2>
        <button type="button" class="adm-btn-secondary" style="height:30px; padding:0 12px; font-size:12px; white-space:nowrap; flex-shrink:0; width:max-content; display:inline-flex; align-items:center; justify-content:center;" onclick="resetRatePlanForm()">+ New Rate Plan</button>
      </div>
      <form onsubmit="event.preventDefault(); saveRatePlanForm();" class="adm-form-grid" style="max-width:920px;">
        <div class="adm-field">
          <label for="planId">Plan ID</label>
          <input type="text" id="planId" placeholder="e.g., PLAN-CHARTER" required>
        </div>
        <div class="adm-field">
          <label for="planName">Service Tier Name</label>
          <input type="text" id="planName" placeholder="e.g., Dedicated Air Charter Desk" required>
        </div>
        <div class="adm-field">
          <label for="planTransit">Transit SLA</label>
          <input type="text" id="planTransit" placeholder="e.g., 24–48 Hours" required>
        </div>
        <div class="adm-field">
          <label for="planBaseRate">Base Tariff (INR / kg)</label>
          <input type="number" id="planBaseRate" placeholder="1450" step="10" min="100" required>
        </div>
        <div class="adm-field">
          <label for="planMinW">Min Weight (kg)</label>
          <input type="number" id="planMinW" value="0.5" step="0.5" min="0.1" required>
        </div>
        <div class="adm-field">
          <label for="planMaxW">Max Weight (kg)</label>
          <input type="number" id="planMaxW" value="70" step="1" min="0.5" required>
        </div>
        <div class="adm-field">
          <label for="planCarrier">Assigned Carriers</label>
          <input type="text" id="planCarrier" placeholder="e.g., DHL / FedEx / UPS" required>
        </div>
        <div class="adm-field">
          <label for="planStatus">Status</label>
          <select id="planStatus">
            <option value="Active" selected>Active</option>
            <option value="Paused">Paused</option>
          </select>
        </div>
        <div class="adm-field full" style="flex-direction:row; justify-content:flex-end; gap:10px; margin-top:4px;">
          <button type="button" class="adm-btn-secondary" onclick="resetRatePlanForm()">Clear</button>
          <button type="submit" class="adm-btn-new">Save Rate Plan</button>
        </div>
      </form>
    </div>
  `;
}

function editPricingRule(key) {
  const rule = (admState.packageRules || {})[key];
  if (!rule) return;
  const keyEl = document.getElementById('prKey');
  const maxEl = document.getElementById('prMaxW');
  const divEl = document.getElementById('prDivisor');
  const noteEl = document.getElementById('prNote');
  if (keyEl) keyEl.value = key;
  if (maxEl) maxEl.value = rule.maxWeightKg;
  if (divEl) divEl.value = rule.volumetricDivisor;
  if (noteEl) noteEl.value = rule.ruleNote || '';
  document.getElementById('prFormCard')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function savePricingRuleForm() {
  const key = document.getElementById('prKey')?.value;
  const maxWeightKg = parseFloat(document.getElementById('prMaxW')?.value) || 70;
  const volumetricDivisor = parseInt(document.getElementById('prDivisor')?.value, 10) || 5000;
  const ruleNote = document.getElementById('prNote')?.value.trim() || '';
  if (!key) return;
  if (admState.packageRules && admState.packageRules[key]) {
    admState.packageRules[key].maxWeightKg = maxWeightKg;
    admState.packageRules[key].volumetricDivisor = volumetricDivisor;
    admState.packageRules[key].ruleNote = ruleNote;
  }
  await postAdminAction({ action: 'update_pricing_rule', key, maxWeightKg, volumetricDivisor, ruleNote });
  showAdminToast(`Updated pricing rule for "${key}".`);
  renderCurrentRouteView();
}

function editAdditionalCharge(id) {
  const item = (admState.store.additionalCharges || []).find(c => c.id === id);
  if (!item) return;
  document.getElementById('chgId').value = item.id;
  document.getElementById('chgName').value = item.name;
  document.getElementById('chgType').value = item.type || 'Flat Fee';
  document.getElementById('chgAmount').value = item.amount;
  document.getElementById('chgAppliesTo').value = item.appliesTo;
  document.getElementById('chgStatus').value = item.status || 'Active';
  const titleEl = document.getElementById('chgFormTitle');
  if (titleEl) titleEl.textContent = `Editing Surcharge: ${item.id} — ${item.name}`;
  document.getElementById('chgFormCard')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function resetAdditionalChargeForm() {
  const idEl = document.getElementById('chgId');
  if (!idEl) return;
  idEl.value = '';
  document.getElementById('chgName').value = '';
  document.getElementById('chgType').value = 'Flat Fee';
  document.getElementById('chgAmount').value = '';
  document.getElementById('chgAppliesTo').value = '';
  document.getElementById('chgStatus').value = 'Active';
  const titleEl = document.getElementById('chgFormTitle');
  if (titleEl) titleEl.textContent = 'Add / Update Additional Surcharge & Clearance Fee';
  idEl.focus();
}

async function saveAdditionalChargeForm() {
  const charge = {
    id: (document.getElementById('chgId')?.value || '').trim().toUpperCase(),
    name: (document.getElementById('chgName')?.value || '').trim(),
    type: document.getElementById('chgType')?.value || 'Flat Fee',
    amount: (document.getElementById('chgAmount')?.value || '').trim(),
    appliesTo: (document.getElementById('chgAppliesTo')?.value || '').trim(),
    status: document.getElementById('chgStatus')?.value || 'Active'
  };
  if (!charge.id || !charge.name) return;
  const list = admState.store.additionalCharges || [];
  const idx = list.findIndex(c => c.id === charge.id);
  if (idx >= 0) list[idx] = charge;
  else list.push(charge);
  admState.store.additionalCharges = list;
  await postAdminAction({ action: 'save_additional_charge', charge });
  showAdminToast(`Saved surcharge ${charge.id} (${charge.name}).`);
  renderCurrentRouteView();
}

async function toggleAdditionalChargeStatus(id) {
  const list = admState.store.additionalCharges || [];
  const item = list.find(c => c.id === id);
  if (!item) return;
  item.status = item.status === 'Active' ? 'Paused' : 'Active';
  await postAdminAction({ action: 'toggle_additional_charge', id });
  showAdminToast(`Surcharge ${id} is now ${item.status}.`);
  renderCurrentRouteView();
}

async function deleteAdditionalChargeItem(id) {
  admState.store.additionalCharges = (admState.store.additionalCharges || []).filter(c => c.id !== id);
  await postAdminAction({ action: 'delete_additional_charge', id });
  showAdminToast(`Deleted surcharge ${id}.`);
  renderCurrentRouteView();
}

function editRatePlanItem(id) {
  const item = (admState.store.ratePlans || []).find(p => p.id === id);
  if (!item) return;
  document.getElementById('planId').value = item.id;
  document.getElementById('planName').value = item.name;
  document.getElementById('planTransit').value = item.transit;
  document.getElementById('planBaseRate').value = item.baseInrPerKg;
  document.getElementById('planMinW').value = item.minWeightKg;
  document.getElementById('planMaxW').value = item.maxWeightKg;
  document.getElementById('planCarrier').value = item.carrier;
  document.getElementById('planStatus').value = item.status || 'Active';
  const titleEl = document.getElementById('planFormTitle');
  if (titleEl) titleEl.textContent = `Editing Rate Plan: ${item.id} — ${item.name}`;
  document.getElementById('planFormCard')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function resetRatePlanForm() {
  const idEl = document.getElementById('planId');
  if (!idEl) return;
  idEl.value = '';
  document.getElementById('planName').value = '';
  document.getElementById('planTransit').value = '';
  document.getElementById('planBaseRate').value = '';
  document.getElementById('planMinW').value = '0.5';
  document.getElementById('planMaxW').value = '70';
  document.getElementById('planCarrier').value = '';
  document.getElementById('planStatus').value = 'Active';
  const titleEl = document.getElementById('planFormTitle');
  if (titleEl) titleEl.textContent = 'Add / Update Carrier Service Rate Plan';
  idEl.focus();
}

async function saveRatePlanForm() {
  const plan = {
    id: (document.getElementById('planId')?.value || '').trim().toUpperCase(),
    name: (document.getElementById('planName')?.value || '').trim(),
    transit: (document.getElementById('planTransit')?.value || '').trim(),
    baseInrPerKg: parseInt(document.getElementById('planBaseRate')?.value, 10) || 1200,
    minWeightKg: parseFloat(document.getElementById('planMinW')?.value) || 0.5,
    maxWeightKg: parseFloat(document.getElementById('planMaxW')?.value) || 70,
    carrier: (document.getElementById('planCarrier')?.value || '').trim(),
    status: document.getElementById('planStatus')?.value || 'Active'
  };
  if (!plan.id || !plan.name) return;
  const list = admState.store.ratePlans || [];
  const idx = list.findIndex(p => p.id === plan.id);
  if (idx >= 0) list[idx] = plan;
  else list.push(plan);
  admState.store.ratePlans = list;
  await postAdminAction({ action: 'save_rate_plan', plan });
  showAdminToast(`Saved rate plan ${plan.id} (${plan.name}).`);
  renderCurrentRouteView();
}

async function toggleRatePlanStatus(id) {
  const list = admState.store.ratePlans || [];
  const item = list.find(p => p.id === id);
  if (!item) return;
  item.status = item.status === 'Active' ? 'Paused' : 'Active';
  await postAdminAction({ action: 'toggle_rate_plan', id });
  showAdminToast(`Rate plan ${id} is now ${item.status}.`);
  renderCurrentRouteView();
}

async function deleteRatePlanItem(id) {
  admState.store.ratePlans = (admState.store.ratePlans || []).filter(p => p.id !== id);
  await postAdminAction({ action: 'delete_rate_plan', id });
  showAdminToast(`Deleted rate plan ${id}.`);
  renderCurrentRouteView();
}

function setAdminCalcDimensions(l, w, h) {
  const lEl = document.getElementById('rcL');
  const wEl = document.getElementById('rcW');
  const hEl = document.getElementById('rcH');
  if (lEl) lEl.value = l;
  if (wEl) wEl.value = w;
  if (hEl) hEl.value = h;
  runAdminRateCalc(true);
}

function onAdminCalcCategoryChange() {
  const typeEl = document.getElementById('rcType');
  const weightEl = document.getElementById('rcWeight');
  if (typeEl && weightEl) {
    const pkg = typeEl.value;
    const w = parseFloat(weightEl.value) || 1;
    if (pkg === 'document' && w > 5) {
      weightEl.value = '2.5';
    }
  }
  runAdminRateCalc();
}

async function runAdminRateCalc(fromSubmit = false) {
  const box = document.getElementById('rcResultBox');
  if (!box) return;

  const origin = document.getElementById('rcOrigin')?.value || 'India';
  const dest = document.getElementById('rcDest')?.value || 'United States';
  const pkgType = document.getElementById('rcType')?.value || 'document';
  const weightRaw = document.getElementById('rcWeight')?.value || '';
  const unit = document.getElementById('rcUnit')?.value || 'kg';
  const lRaw = (document.getElementById('rcL')?.value || '').trim();
  const wRaw = (document.getElementById('rcW')?.value || '').trim();
  const hRaw = (document.getElementById('rcH')?.value || '').trim();

  // Only pass dimensions if all 3 (L, W, H) are entered
  const hasAllDims = Boolean(lRaw && wRaw && hRaw);

  const qs = new URLSearchParams({
    from: origin,
    to: dest,
    type: pkgType,
    weight: weightRaw || '1',
    unit,
    length: hasAllDims ? lRaw : '',
    width: hasAllDims ? wRaw : '',
    height: hasAllDims ? hRaw : ''
  });

  try {
    const res = await fetch(`/api/rates?${qs.toString()}`);
    const data = await res.json();
    if (!res.ok || !data.ok) {
      box.innerHTML = `
        <div style="padding:14px 16px; border:1px solid #FECACA; border-radius:10px; background:#FEF2F2; color:#DC2626; font-size:13px; font-weight:600;">
          ${esc(data.error || 'Error calculating rate')}
        </div>
      `;
      return;
    }

    const q = data.query;
    const plans = admState.store.ratePlans || [];

    // Fallback client-side zone & category calculation if backend wasn't restarted
    const destLower = dest.toLowerCase();
    let zoneLabel = q.zone || 'Zone D (North America & Global)';
    let zoneMult = 1.0;
    if (/arab emirates|uae|saudi|qatar|kuwait|oman/.test(destLower)) {
      zoneLabel = 'Zone A (Middle East)';
      zoneMult = 0.72;
    } else if (/singapore|malaysia/.test(destLower)) {
      zoneLabel = 'Zone B (Southeast Asia)';
      zoneMult = 0.78;
    } else if (/united kingdom|uk|germany|france|netherlands|italy|ireland|spain/.test(destLower)) {
      zoneLabel = 'Zone C (UK & Europe)';
      zoneMult = 0.92;
    } else if (/japan/.test(destLower)) {
      zoneLabel = 'Zone E (East Asia)';
      zoneMult = 0.96;
    } else if (/australia|new zealand/.test(destLower)) {
      zoneLabel = 'Zone F (Oceania)';
      zoneMult = 1.08;
    }

    const catMap = {
      document: { mult: 0.85, fee: 250, feeLabel: 'Document Envelope Handling' },
      parcel: { mult: 1.00, fee: 350, feeLabel: 'X-Ray & Security Screening' },
      medicine: { mult: 1.12, fee: 650, feeLabel: 'Rx Compliance & Clearance' },
      ecommerce: { mult: 0.94, fee: 850, feeLabel: 'CSB-V Export Clearance' },
      bulk: { mult: 0.76, fee: 1450, feeLabel: 'Commercial BOE / LUT Brokerage' },
      other: { mult: 1.05, fee: 500, feeLabel: 'Specialized Cargo Handling' }
    };
    const catCfg = catMap[pkgType] || catMap.parcel;
    const divisor = q.volumetricDivisor || (pkgType === 'bulk' ? 6000 : 5000);
    const dimText = q.dimensionsCm
      ? `${q.dimensionsCm.length}×${q.dimensionsCm.width}×${q.dimensionsCm.height} cm ÷ ${divisor} = ${q.volumetricWeightKg} kg`
      : 'None (Actual weight applied)';

    box.innerHTML = `
      <div style="padding:16px; border:1px solid #E2E8F0; border-radius:12px; background:#F8FAFC;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px; padding-bottom:10px; border-bottom:1px solid #E2E8F0;">
          <div style="font-size:13px; color:#0F172A;">
            <strong>Route:</strong> ${esc(q.from)} ➔ ${esc(q.to)}
            <span class="adm-status-pill booked" style="margin-left:8px; min-width:auto; padding:2px 9px;">${esc(zoneLabel)}</span>
            <span class="adm-status-pill transit" style="margin-left:6px; min-width:auto; padding:2px 9px;">${esc(q.typeLabel)}</span>
          </div>
          <div style="font-size:12px; color:#64748B;">
            Max Allowed: <strong>${q.maxWeightKg} kg</strong> • Volumetric Divisor: <strong>÷ ${divisor}</strong>
          </div>
        </div>

        <div style="display:flex; gap:24px; flex-wrap:wrap; align-items:center; margin-bottom:14px; font-size:13px;">
          <div>Actual Weight: <strong>${q.actualWeightKg} kg (${q.actualWeightLb} lb)</strong></div>
          <div>Volumetric Weight: <strong>${q.volumetricWeightKg !== null ? q.volumetricWeightKg + ' kg' : 'N/A (No Box Dimensions)'}</strong> <span style="font-size:11.5px; color:#64748B;">${q.dimensionsCm ? `(${esc(dimText)})` : ''}</span></div>
          <div>Chargeable Weight: <strong style="color:#DF1B22; font-size:15px;">${q.chargeableWeightKg} kg (${q.chargeableWeightLb} lb)</strong></div>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:12px;">
          ${(data.serviceTiers || []).map((t, i) => {
            const defaultBases = [2450, 1650, 1120];
            const planBase = Number(plans[i]?.baseInrPerKg) || defaultBases[i] || 1650;
            const ratePerKg = t.ratePerKgInr || Math.round(planBase * zoneMult * catCfg.mult);
            const baseFreight = t.baseFreightInr || Math.round(q.chargeableWeightKg * ratePerKg);
            const fuelSurcharge = t.fuelSurchargeInr || Math.round(baseFreight * 0.145);
            const clearanceFee = t.clearanceFeeInr || catCfg.fee;
            const totalEst = t.estimatedInr || (baseFreight + fuelSurcharge + clearanceFee);
            const carrierName = t.carrier || plans[i]?.carrier || 'DHL Express / FedEx';

            return `
              <div style="background:#FFF; border:1px solid #E2E8F0; border-radius:10px; padding:14px; display:flex; flex-direction:column; justify-content:space-between;">
                <div>
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                    <strong style="font-size:13.5px; color:#111827;">${esc(t.name)}</strong>
                    <span style="font-size:11px; font-weight:700; color:#0F172A; background:#F1F5F9; padding:2px 7px; border-radius:6px; white-space:nowrap;">₹ ${ratePerKg.toLocaleString('en-IN')} / kg</span>
                  </div>
                  <div style="font-size:11.8px; color:#64748B; margin:4px 0 8px;">${esc(t.transitTime)} • ${esc(carrierName)}</div>
                  <div style="font-size:11.8px; color:#475569; display:flex; flex-direction:column; gap:3px; padding-top:8px; border-top:1px solid #F1F5F9;">
                    <div style="display:flex; justify-content:space-between;"><span>Base Freight (${q.chargeableWeightKg} kg × ₹${ratePerKg}):</span><strong>₹ ${baseFreight.toLocaleString('en-IN')}</strong></div>
                    <div style="display:flex; justify-content:space-between;"><span>Fuel Surcharge (14.5%):</span><strong>₹ ${fuelSurcharge.toLocaleString('en-IN')}</strong></div>
                    <div style="display:flex; justify-content:space-between;"><span>${esc(catCfg.feeLabel)}:</span><strong>₹ ${clearanceFee.toLocaleString('en-IN')}</strong></div>
                  </div>
                </div>
                <div style="margin-top:10px; padding-top:8px; border-top:1px dashed #CBD5E1; display:flex; justify-content:space-between; align-items:center; font-size:13.5px;">
                  <span style="font-weight:700; color:#0F172A;">Admin Tariff Est:</span>
                  <strong style="color:#DF1B22; font-size:16px;">₹ ${totalEst.toLocaleString('en-IN')}</strong>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
    if (fromSubmit) {
      showAdminToast(`Calculated rates for ${q.from} ➔ ${q.to} (${q.chargeableWeightKg} kg chargeable)`);
    }
  } catch (err) {
    box.innerHTML = `<p style="color:#DC2626;">Unable to calculate rate right now. Please check your inputs.</p>`;
  }
}

/* ==========================================================================
   7. COURIER PARTNERS SECTION
   ========================================================================== */
function renderPartnersSection(container) {
  const partners = admState.store.partners || [];
  const pageKey = 'partners-list';
  const { pageItems, page, pageSize, totalPages, startIdx, endIdx, totalCount } = getPaginatedSlice(pageKey, partners, 4);
  container.innerHTML = `
    <div class="adm-card" style="margin-bottom:16px;">
      <div class="adm-card-header">
        <h2 class="adm-card-title">Courier Partner Management (${totalCount})</h2>
        <div style="display:flex; align-items:center; gap:8px;">
          <label for="pageSize-${pageKey}" style="font-size:12px; color:#64748B; font-weight:600;">Rows per page:</label>
          <select id="pageSize-${pageKey}" class="adm-page-size-select" onchange="setAdminPageSize('${pageKey}', this.value)">
            ${[3, 4, 5, 10].map(sz => `<option value="${sz}" ${pageSize === sz ? 'selected' : ''}>${sz} / page</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="adm-table-wrap">
        <table class="adm-table">
          <thead>
            <tr>
              <th>Partner ID</th>
              <th>Carrier Name</th>
              <th>Assigned Shipments</th>
              <th>On-Time SLA</th>
              <th>Service Corridors</th>
              <th>API / Manifest Status</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${pageItems.map(p => `
              <tr>
                <td><strong class="adm-trk-code">${esc(p.id)}</strong></td>
                <td><strong>${esc(p.name)}</strong> <span style="color:#64748B;">(${esc(p.code)})</span></td>
                <td><strong>${p.shipments}</strong></td>
                <td><strong>${p.onTimePct}%</strong></td>
                <td>${esc(p.serviceZones)}</td>
                <td>${esc(p.apiStatus)}</td>
                <td><span class="adm-status-pill ${p.enabled ? 'delivered' : 'pending'}">${p.enabled ? 'Enabled' : 'Disabled'}</span></td>
                <td>
                  <button type="button" class="adm-btn-secondary" style="height:30px; padding:0 12px; font-size:12px; white-space:nowrap; flex-shrink:0; width:max-content; display:inline-flex; align-items:center; justify-content:center;" onclick="togglePartnerStatus('${esc(p.id)}')">
                    ${p.enabled ? 'Disable' : 'Enable'}
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ${renderPaginationBar(pageKey, totalCount, page, pageSize, totalPages, startIdx, endIdx)}
    </div>

    <div class="adm-card">
      <div class="adm-card-header">
        <h2 class="adm-card-title">Add / Update Courier Partner</h2>
      </div>
      <form onsubmit="event.preventDefault(); submitPartnerForm();" class="adm-form-grid" style="max-width:780px;">
        <div class="adm-field">
          <label>Carrier Short Code *</label>
          <input type="text" id="prtCode" placeholder="e.g. BlueDart" required>
        </div>
        <div class="adm-field">
          <label>Full Carrier Name *</label>
          <input type="text" id="prtName" placeholder="e.g. BlueDart DHL Domestic & Regional" required>
        </div>
        <div class="adm-field">
          <label>Service Zones</label>
          <input type="text" id="prtZones" placeholder="South Asia, Middle East, EU">
        </div>
        <div class="adm-field">
          <label>Operations Desk Email</label>
          <input type="email" id="prtEmail" placeholder="desk@carrier.com">
        </div>
        <div class="adm-field full">
          <button type="submit" class="adm-btn-new" style="width:fit-content;">Save Courier Partner</button>
        </div>
      </form>
    </div>
  `;
}

async function togglePartnerStatus(id) {
  const res = await postAdminAction({ action: 'toggle_partner', id });
  if (res && res.ok) {
    admState.store = res.store;
    showAdminToast('Courier partner status updated');
    renderCurrentRouteView();
  }
}

async function submitPartnerForm() {
  const res = await postAdminAction({
    action: 'save_partner',
    code: document.getElementById('prtCode').value.trim(),
    name: document.getElementById('prtName').value.trim(),
    serviceZones: document.getElementById('prtZones').value.trim(),
    contactEmail: document.getElementById('prtEmail').value.trim()
  });
  if (res && res.ok) {
    admState.store = res.store;
    showAdminToast('Courier partner saved!');
    renderCurrentRouteView();
  }
}

/* ==========================================================================
   8. COUNTRIES & CITIES SECTION
   ========================================================================== */
function renderLocationsSection(container, subView) {
  const subTabs = [
    { key: 'countries', label: 'Countries', path: '/admin/locations/countries' },
    { key: 'regions', label: 'States or Regions', path: '/admin/locations/regions' },
    { key: 'cities', label: 'Cities', path: '/admin/locations/cities' },
    { key: 'serviceable-areas', label: 'Serviceable Areas', path: '/admin/locations/serviceable-areas' },
    { key: 'delivery-coverage', label: 'Delivery Coverage', path: '/admin/locations/delivery-coverage' }
  ];

  const tabsHtml = `
    <div class="adm-subnav-pills">
      ${subTabs.map(t => `
        <a href="${t.path}" class="adm-subpill ${subView === t.key ? 'active' : ''}" onclick="event.preventDefault(); navigateAdmin('${t.path}')">${esc(t.label)}</a>
      `).join('')}
    </div>
  `;

  const locs = admState.store.locations || { countries: [], regions: [], cities: [] };

  if (subView === 'regions') {
    const pageKey = 'loc-regions';
    const { pageItems, page, pageSize, totalPages, startIdx, endIdx, totalCount } = getPaginatedSlice(pageKey, locs.regions || [], 4);
    container.innerHTML = `
      ${tabsHtml}
      <div class="adm-card" style="margin-bottom:16px;">
        <div class="adm-card-header">
          <h2 class="adm-card-title">Indian Export Gateway Regions &amp; Cutoffs (${totalCount})</h2>
          <div style="display:flex; align-items:center; gap:8px;">
            <label for="pageSize-${pageKey}" style="font-size:12px; color:#64748B; font-weight:600;">Rows per page:</label>
            <select id="pageSize-${pageKey}" class="adm-page-size-select" onchange="setAdminPageSize('${pageKey}', this.value)">
              ${[3, 4, 5, 10].map(sz => `<option value="${sz}" ${pageSize === sz ? 'selected' : ''}>${sz} / page</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="adm-table-wrap">
          <table class="adm-table">
            <thead>
              <tr>
                <th>Region Code</th>
                <th>Hub Region</th>
                <th>States Covered</th>
                <th>Gateway Airport</th>
                <th>Daily Uplift Cutoff</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${pageItems.map(r => {
                const isActive = r.active !== false;
                return `
                <tr>
                  <td><strong class="adm-trk-code">${esc(r.code)}</strong></td>
                  <td><strong>${esc(r.name)}</strong></td>
                  <td>${esc(r.state)}</td>
                  <td>${esc(r.gatewayAirport)}</td>
                  <td><strong>${esc(r.dailyCutoff)}</strong></td>
                  <td><span class="adm-status-pill ${isActive ? 'delivered' : 'pending'}">${isActive ? 'Active' : 'Paused'}</span></td>
                  <td>
                    <div style="display:inline-flex; gap:6px; align-items:center;">
                      <button type="button" class="adm-btn-secondary" style="height:30px; padding:0 12px; font-size:12px; white-space:nowrap; flex-shrink:0; width:max-content; display:inline-flex; align-items:center; justify-content:center;" onclick="editGatewayRegion('${esc(r.code)}')">Edit</button>
                      <button type="button" class="adm-btn-secondary" style="height:30px; padding:0 12px; font-size:12px; white-space:nowrap; flex-shrink:0; width:max-content; display:inline-flex; align-items:center; justify-content:center;" onclick="toggleLocationService('regions', '${esc(r.code)}')">${isActive ? 'Pause' : 'Activate'}</button>
                      <button type="button" class="adm-btn-secondary" style="height:30px; padding:0 12px; font-size:12px; color:#DC2626; border-color:#FECACA; white-space:nowrap; flex-shrink:0; width:max-content; display:inline-flex; align-items:center; justify-content:center;" onclick="deleteGatewayRegionItem('${esc(r.code)}')">Delete</button>
                    </div>
                  </td>
                </tr>
              `;
              }).join('')}
            </tbody>
          </table>
        </div>
        ${renderPaginationBar(pageKey, totalCount, page, pageSize, totalPages, startIdx, endIdx)}
      </div>

      <div class="adm-card" id="regFormCard">
        <div class="adm-card-header">
          <h2 class="adm-card-title" id="regFormTitle">Add / Update Indian Export Gateway Region</h2>
          <button type="button" class="adm-btn-secondary" style="height:30px; padding:0 12px; font-size:12px; white-space:nowrap; flex-shrink:0; width:max-content; display:inline-flex; align-items:center; justify-content:center;" onclick="resetGatewayRegionForm()">+ New Gateway Region</button>
        </div>
        <form onsubmit="event.preventDefault(); saveGatewayRegionForm();" class="adm-form-grid" style="max-width:920px;">
          <div class="adm-field">
            <label for="regCode">Region Code *</label>
            <input type="text" id="regCode" placeholder="e.g., IN-CENTRAL" required>
          </div>
          <div class="adm-field">
            <label for="regName">Hub Region Name *</label>
            <input type="text" id="regName" placeholder="e.g., Central India Air Cargo Hub" required>
          </div>
          <div class="adm-field">
            <label for="regState">States Covered *</label>
            <input type="text" id="regState" placeholder="e.g., Madhya Pradesh & Chhattisgarh" required>
          </div>
          <div class="adm-field">
            <label for="regAirport">Gateway Airport *</label>
            <input type="text" id="regAirport" placeholder="e.g., IDR (Indore) / NAG (Nagpur)" required>
          </div>
          <div class="adm-field">
            <label for="regCutoff">Daily Uplift Cutoff *</label>
            <input type="text" id="regCutoff" placeholder="e.g., 18:30 IST" value="19:00 IST" required>
          </div>
          <div class="adm-field">
            <label for="regStatus">Gateway Status</label>
            <select id="regStatus">
              <option value="true" selected>Active</option>
              <option value="false">Paused</option>
            </select>
          </div>
          <div class="adm-field full" style="flex-direction:row; justify-content:flex-end; gap:10px; margin-top:4px;">
            <button type="button" class="adm-btn-secondary" onclick="resetGatewayRegionForm()">Clear</button>
            <button type="submit" class="adm-btn-new">Save Gateway Region</button>
          </div>
        </form>
      </div>
    `;
    return;
  }

  if (subView === 'cities' || subView === 'serviceable-areas') {
    const pageKey = `loc-${subView}`;
    const { pageItems, page, pageSize, totalPages, startIdx, endIdx, totalCount } = getPaginatedSlice(pageKey, locs.cities || [], 5);
    container.innerHTML = `
      ${tabsHtml}
      <div class="adm-card" style="margin-bottom:16px;">
        <div class="adm-card-header">
          <h2 class="adm-card-title">${subView === 'serviceable-areas' ? 'Doorstep Pickup &amp; Delivery Serviceable Areas' : 'Serviceable Pickup Cities &amp; PIN Zones'} (${totalCount})</h2>
          <div style="display:flex; align-items:center; gap:8px;">
            <label for="pageSize-${pageKey}" style="font-size:12px; color:#64748B; font-weight:600;">Rows per page:</label>
            <select id="pageSize-${pageKey}" class="adm-page-size-select" onchange="setAdminPageSize('${pageKey}', this.value)">
              ${[4, 5, 8, 10].map(sz => `<option value="${sz}" ${pageSize === sz ? 'selected' : ''}>${sz} / page</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="adm-table-wrap">
          <table class="adm-table">
            <thead>
              <tr>
                <th>City</th>
                <th>State</th>
                <th>PIN Prefix</th>
                <th>Hub Code</th>
                <th>Same-Day Doorstep Pickup</th>
                <th>Serviceability</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${pageItems.map(c => `
                <tr>
                  <td><strong>${esc(c.city)}</strong></td>
                  <td>${esc(c.state)}</td>
                  <td><code>${esc(c.pinPrefix)}</code></td>
                  <td><strong class="adm-trk-code">${esc(c.hubCode)}</strong></td>
                  <td>${c.sameDayPickup ? 'Available (Same-Day)' : 'Scheduled (Next-Day)'}</td>
                  <td><span class="adm-status-pill ${c.serviceable ? 'delivered' : 'pending'}">${c.serviceable ? 'Serviceable' : 'Paused'}</span></td>
                  <td>
                    <div style="display:inline-flex; gap:6px; align-items:center;">
                      <button type="button" class="adm-btn-secondary" style="height:30px; padding:0 12px; font-size:12px; white-space:nowrap; flex-shrink:0; width:max-content; display:inline-flex; align-items:center; justify-content:center;" onclick="editPickupCity('${esc(c.city)}')">Edit</button>
                      <button type="button" class="adm-btn-secondary" style="height:30px; padding:0 12px; font-size:12px; white-space:nowrap; flex-shrink:0; width:max-content; display:inline-flex; align-items:center; justify-content:center;" onclick="toggleLocationService('cities', '${esc(c.city)}')">${c.serviceable ? 'Pause' : 'Enable'}</button>
                      <button type="button" class="adm-btn-secondary" style="height:30px; padding:0 12px; font-size:12px; color:#DC2626; border-color:#FECACA; white-space:nowrap; flex-shrink:0; width:max-content; display:inline-flex; align-items:center; justify-content:center;" onclick="deletePickupCityItem('${esc(c.city)}')">Delete</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ${renderPaginationBar(pageKey, totalCount, page, pageSize, totalPages, startIdx, endIdx)}
      </div>

      <div class="adm-card" id="ctyFormCard">
        <div class="adm-card-header">
          <h2 class="adm-card-title" id="ctyFormTitle">Add / Update Serviceable Pickup City &amp; PIN Zone</h2>
          <button type="button" class="adm-btn-secondary" style="height:30px; padding:0 12px; font-size:12px; white-space:nowrap; flex-shrink:0; width:max-content; display:inline-flex; align-items:center; justify-content:center;" onclick="resetPickupCityForm()">+ New Pickup City</button>
        </div>
        <form onsubmit="event.preventDefault(); savePickupCityForm();" class="adm-form-grid" style="max-width:920px;">
          <div class="adm-field">
            <label for="ctyName">City Name *</label>
            <input type="text" id="ctyName" placeholder="e.g., Surat" required>
          </div>
          <div class="adm-field">
            <label for="ctyState">State *</label>
            <input type="text" id="ctyState" placeholder="e.g., Gujarat" required>
          </div>
          <div class="adm-field">
            <label for="ctyPin">PIN Code Prefix *</label>
            <input type="text" id="ctyPin" placeholder="e.g., 395xxx" required>
          </div>
          <div class="adm-field">
            <label for="ctyHub">Assigned Hub Code *</label>
            <input type="text" id="ctyHub" placeholder="e.g., STV-HUB-01" required>
          </div>
          <div class="adm-field">
            <label for="ctySameDay">Doorstep Pickup SLA</label>
            <select id="ctySameDay">
              <option value="true" selected>Available (Same-Day Pickup)</option>
              <option value="false">Scheduled (Next-Day Pickup)</option>
            </select>
          </div>
          <div class="adm-field">
            <label for="ctyStatus">Serviceability Status</label>
            <select id="ctyStatus">
              <option value="true" selected>Serviceable</option>
              <option value="false">Paused</option>
            </select>
          </div>
          <div class="adm-field full" style="flex-direction:row; justify-content:flex-end; gap:10px; margin-top:4px;">
            <button type="button" class="adm-btn-secondary" onclick="resetPickupCityForm()">Clear</button>
            <button type="submit" class="adm-btn-new">Save Pickup City</button>
          </div>
        </form>
      </div>
    `;
    return;
  }

  if (subView === 'delivery-coverage') {
    const defaultZones = [
      { code: 'ZONE-A', zone: 'Zone A — Middle East & GCC', countries: 'UAE, Saudi Arabia, Qatar, Kuwait, Oman, Bahrain', transit: '2–3 Business Days', customs: 'GCC Direct / ZATCA / Dubai Customs', carriers: 'Aramex Direct / DHL Express', coverage: '99.4% Doorstep', active: true },
      { code: 'ZONE-B', zone: 'Zone B — Southeast Asia', countries: 'Singapore, Malaysia, Thailand, Vietnam, Indonesia', transit: '2–4 Business Days', customs: 'ASEAN Express TradeNet', carriers: 'DHL Express / FedEx Priority', coverage: '98.8% Doorstep', active: true },
      { code: 'ZONE-C', zone: 'Zone C — UK & European Union', countries: 'UK, Germany, France, Netherlands, Italy, Ireland, Spain', transit: '3–5 Business Days', customs: 'UK HMRC EORI / EU ICS2 ATLAS', carriers: 'DHL / FedEx / UPS', coverage: '99.2% Doorstep', active: true },
      { code: 'ZONE-D', zone: 'Zone D — North America', countries: 'United States (All 50 States), Canada (All Provinces)', transit: '3–5 Business Days', customs: 'US CBP Section 321 ($800) / CBSA', carriers: 'FedEx Priority / DHL / UPS', coverage: '99.6% Doorstep', active: true },
      { code: 'ZONE-E', zone: 'Zone E — East Asia & Pacific Rim', countries: 'Japan, South Korea, Hong Kong SAR, Taiwan', transit: '3–5 Business Days', customs: 'NACCS / UNIPASS Express', carriers: 'DHL Express / FedEx', coverage: '98.5% Doorstep', active: true },
      { code: 'ZONE-F', zone: 'Zone F — Oceania', countries: 'Australia, New Zealand, Fiji', transit: '4–6 Business Days', customs: 'ABF Biosecurity / NZCS Direct', carriers: 'DHL Express / FedEx', coverage: '98.9% Doorstep', active: true },
      { code: 'ZONE-G', zone: 'Zone G — Africa & Indian Ocean', countries: 'South Africa, Kenya, Nigeria, Mauritius, Egypt', transit: '4–7 Business Days', customs: 'Formal Commercial & DDU', carriers: 'DHL Global / Emirates SkyCargo', coverage: '94.0% Metro & Regional', active: true },
      { code: 'ZONE-H', zone: 'Zone H — Latin America', countries: 'Brazil, Mexico, Chile, Colombia, Argentina', transit: '5–8 Business Days', customs: 'Formal Courier Import Regime', carriers: 'DHL Express / UPS Worldwide', coverage: '92.5% Metro & Regional', active: true }
    ];
    if (!Array.isArray(locs.coverageZones) || locs.coverageZones.length === 0) {
      locs.coverageZones = defaultZones;
    }
    const zoneMatrix = locs.coverageZones;
    const zPageKey = 'loc-delivery-zones';
    const { pageItems: zItems, page: zPage, pageSize: zSize, totalPages: zTotalPages, startIdx: zStart, endIdx: zEnd, totalCount: zTotal } = getPaginatedSlice(zPageKey, zoneMatrix, 4);
    container.innerHTML = `
      ${tabsHtml}
      <div class="adm-card" style="margin-bottom:16px;">
        <div class="adm-card-header">
          <h2 class="adm-card-title">Global Tariff Zone &amp; 200+ Destination Delivery Coverage Matrix (${zTotal})</h2>
          <div style="display:flex; align-items:center; gap:8px;">
            <label for="pageSize-${zPageKey}" style="font-size:12px; color:#64748B; font-weight:600;">Rows per page:</label>
            <select id="pageSize-${zPageKey}" class="adm-page-size-select" onchange="setAdminPageSize('${zPageKey}', this.value)">
              ${[3, 4, 5, 8].map(sz => `<option value="${sz}" ${zSize === sz ? 'selected' : ''}>${sz} / page</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="adm-table-wrap">
          <table class="adm-table">
            <thead>
              <tr>
                <th>Zone Code</th>
                <th>Global Tariff Zone</th>
                <th>Key Destination Countries</th>
                <th>Express Transit SLA</th>
                <th>Customs Clearance Regime</th>
                <th>Primary Linehaul Carriers</th>
                <th>PIN / ZIP Coverage</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${zItems.map(z => {
                const isAct = z.active !== false;
                const zCode = z.code || 'ZONE-A';
                return `
                <tr>
                  <td><strong class="adm-trk-code">${esc(zCode)}</strong></td>
                  <td><strong>${esc(z.zone)}</strong></td>
                  <td class="adm-desc-cell" style="max-width:260px;">${esc(z.countries)}</td>
                  <td>${esc(z.transit)}</td>
                  <td>${esc(z.customs)}</td>
                  <td>${esc(z.carriers)}</td>
                  <td><strong>${esc(z.coverage)}</strong></td>
                  <td><span class="adm-status-pill ${isAct ? 'delivered' : 'pending'}">${isAct ? 'Active Zone' : 'Suspended'}</span></td>
                  <td>
                    <div style="display:inline-flex; gap:6px; align-items:center;">
                      <button type="button" class="adm-btn-secondary" style="height:30px; padding:0 12px; font-size:12px; white-space:nowrap; flex-shrink:0; width:max-content; display:inline-flex; align-items:center; justify-content:center;" onclick="editCoverageZone('${esc(zCode)}')">Edit</button>
                      <button type="button" class="adm-btn-secondary" style="height:30px; padding:0 12px; font-size:12px; white-space:nowrap; flex-shrink:0; width:max-content; display:inline-flex; align-items:center; justify-content:center;" onclick="toggleLocationService('coverageZones', '${esc(zCode)}')">${isAct ? 'Suspend' : 'Activate'}</button>
                      <button type="button" class="adm-btn-secondary" style="height:30px; padding:0 12px; font-size:12px; color:#DC2626; border-color:#FECACA; white-space:nowrap; flex-shrink:0; width:max-content; display:inline-flex; align-items:center; justify-content:center;" onclick="deleteCoverageZoneItem('${esc(zCode)}')">Delete</button>
                    </div>
                  </td>
                </tr>
              `;
              }).join('')}
            </tbody>
          </table>
        </div>
        ${renderPaginationBar(zPageKey, zTotal, zPage, zSize, zTotalPages, zStart, zEnd)}
      </div>

      <div class="adm-card" style="margin-bottom:16px;">
        <div class="adm-card-header">
          <h2 class="adm-card-title">Instant Origin PIN &amp; Destination ZIP / Country Coverage Checker</h2>
        </div>
        <form onsubmit="event.preventDefault(); verifyAdminDeliveryCoverage();" class="adm-form-grid" style="max-width:920px;">
          <div class="adm-field">
            <label for="covCheckPin">Origin Indian PIN Code or City</label>
            <input type="text" id="covCheckPin" value="400099 (Mumbai)" placeholder="e.g., 400001, 560001, Delhi" oninput="verifyAdminDeliveryCoverage()">
          </div>
          <div class="adm-field">
            <label for="covCheckDest">Destination Country / Postal Code</label>
            <select id="covCheckDest" onchange="verifyAdminDeliveryCoverage()">
              ${zoneMatrix.map(z => `<option value="${esc(z.code)}">${esc(z.zone)} — ${esc(z.countries)}</option>`).join('')}
            </select>
          </div>
          <div class="adm-field full" id="covCheckResultBox"></div>
        </form>
      </div>

      <div class="adm-card" id="covFormCard">
        <div class="adm-card-header">
          <h2 class="adm-card-title" id="covFormTitle">Add / Update Global Delivery Coverage Zone</h2>
          <button type="button" class="adm-btn-secondary" style="height:30px; padding:0 12px; font-size:12px; white-space:nowrap; flex-shrink:0; width:max-content; display:inline-flex; align-items:center; justify-content:center;" onclick="resetCoverageZoneForm()">+ New Coverage Zone</button>
        </div>
        <form onsubmit="event.preventDefault(); saveCoverageZoneForm();" class="adm-form-grid" style="max-width:920px;">
          <div class="adm-field">
            <label for="covCode">Zone Code *</label>
            <input type="text" id="covCode" placeholder="e.g., ZONE-I" required>
          </div>
          <div class="adm-field">
            <label for="covZone">Global Tariff Zone Title *</label>
            <input type="text" id="covZone" placeholder="e.g., Zone I — Nordic &amp; Baltic Corridor" required>
          </div>
          <div class="adm-field">
            <label for="covCountries">Key Destination Countries *</label>
            <input type="text" id="covCountries" placeholder="e.g., Sweden, Norway, Denmark, Finland" required>
          </div>
          <div class="adm-field">
            <label for="covTransit">Express Transit SLA *</label>
            <input type="text" id="covTransit" placeholder="e.g., 3–5 Business Days" value="3–5 Business Days" required>
          </div>
          <div class="adm-field">
            <label for="covCustoms">Customs Clearance Regime *</label>
            <input type="text" id="covCustoms" placeholder="e.g., EU ICS2 / Direct Clearance" required>
          </div>
          <div class="adm-field">
            <label for="covCarriers">Primary Linehaul Carriers *</label>
            <input type="text" id="covCarriers" placeholder="e.g., DHL Express / FedEx / UPS" required>
          </div>
          <div class="adm-field">
            <label for="covPct">PIN / ZIP Doorstep Coverage *</label>
            <input type="text" id="covPct" placeholder="e.g., 99.1% Doorstep" value="99.0% Doorstep" required>
          </div>
          <div class="adm-field">
            <label for="covStatus">Zone Coverage Status</label>
            <select id="covStatus">
              <option value="true" selected>Active Zone</option>
              <option value="false">Suspended</option>
            </select>
          </div>
          <div class="adm-field full" style="flex-direction:row; justify-content:flex-end; gap:10px; margin-top:4px;">
            <button type="button" class="adm-btn-secondary" onclick="resetCoverageZoneForm()">Clear</button>
            <button type="submit" class="adm-btn-new">Save Coverage Zone</button>
          </div>
        </form>
      </div>
    `;
    verifyAdminDeliveryCoverage();
    return;
  }

  // Countries
  const locPageKey = 'loc-countries';
  const { pageItems: countryItems, page: cPage, pageSize: cSize, totalPages: cTotalPages, startIdx: cStart, endIdx: cEnd, totalCount: cTotal } = getPaginatedSlice(locPageKey, locs.countries || [], 5);
  container.innerHTML = `
    ${tabsHtml}
    <div class="adm-card" style="margin-bottom:16px;">
      <div class="adm-card-header">
        <h2 class="adm-card-title">International Destination Countries &amp; Delivery Coverage (${cTotal})</h2>
        <div style="display:flex; align-items:center; gap:8px;">
          <label for="pageSize-${locPageKey}" style="font-size:12px; color:#64748B; font-weight:600;">Rows per page:</label>
          <select id="pageSize-${locPageKey}" class="adm-page-size-select" onchange="setAdminPageSize('${locPageKey}', this.value)">
            ${[4, 5, 8, 10].map(sz => `<option value="${sz}" ${cSize === sz ? 'selected' : ''}>${sz} / page</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="adm-table-wrap">
        <table class="adm-table">
          <thead>
            <tr>
              <th>Country</th>
              <th>ISO Code</th>
              <th>Global Tariff Zone</th>
              <th>Express Transit SLA</th>
              <th>Customs Clearance Mode</th>
              <th>Shipments</th>
              <th>Coverage Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${countryItems.map(c => `
              <tr>
                <td>
                  <span class="adm-country-inline">
                    <span class="adm-flag-sm">${ADM_FLAGS[c.code] || ADM_FLAGS.US}</span>
                    <strong>${esc(c.name)}</strong>
                  </span>
                </td>
                <td><strong class="adm-trk-code">${esc(c.code)}</strong></td>
                <td>${esc(c.zone)}</td>
                <td>${esc(c.transitDays)}</td>
                <td>${esc(c.customsMode)}</td>
                <td><strong>${c.shipmentsCount || 0}</strong></td>
                <td><span class="adm-status-pill ${c.serviceable ? 'delivered' : 'pending'}">${c.serviceable ? 'Active Coverage' : 'Suspended'}</span></td>
                <td>
                  <div style="display:inline-flex; gap:6px; align-items:center;">
                    <button type="button" class="adm-btn-secondary" style="height:30px; padding:0 12px; font-size:12px; white-space:nowrap; flex-shrink:0; width:max-content; display:inline-flex; align-items:center; justify-content:center;" onclick="editDestinationCountry('${esc(c.code)}')">Edit</button>
                    <button type="button" class="adm-btn-secondary" style="height:30px; padding:0 12px; font-size:12px; white-space:nowrap; flex-shrink:0; width:max-content; display:inline-flex; align-items:center; justify-content:center;" onclick="toggleLocationService('countries', '${esc(c.code)}')">${c.serviceable ? 'Suspend' : 'Activate'}</button>
                    <button type="button" class="adm-btn-secondary" style="height:30px; padding:0 12px; font-size:12px; color:#DC2626; border-color:#FECACA; white-space:nowrap; flex-shrink:0; width:max-content; display:inline-flex; align-items:center; justify-content:center;" onclick="deleteDestinationCountryItem('${esc(c.code)}')">Delete</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ${renderPaginationBar(locPageKey, cTotal, cPage, cSize, cTotalPages, cStart, cEnd)}
    </div>

    <div class="adm-card" id="cntFormCard">
      <div class="adm-card-header">
        <h2 class="adm-card-title" id="cntFormTitle">Add / Update International Destination Country</h2>
        <button type="button" class="adm-btn-secondary" style="height:30px; padding:0 12px; font-size:12px; white-space:nowrap; flex-shrink:0; width:max-content; display:inline-flex; align-items:center; justify-content:center;" onclick="resetDestinationCountryForm()">+ New Country</button>
      </div>
      <form onsubmit="event.preventDefault(); saveDestinationCountryForm();" class="adm-form-grid" style="max-width:920px;">
        <div class="adm-field">
          <label for="cntCode">ISO 2-Letter Code *</label>
          <input type="text" id="cntCode" placeholder="e.g., NL" maxlength="3" required>
        </div>
        <div class="adm-field">
          <label for="cntName">Country Name *</label>
          <input type="text" id="cntName" placeholder="e.g., Netherlands" required>
        </div>
        <div class="adm-field">
          <label for="cntZone">Global Tariff Zone</label>
          <select id="cntZone">
            <option value="Zone A — Middle East">Zone A — Middle East</option>
            <option value="Zone B — Southeast Asia">Zone B — Southeast Asia</option>
            <option value="Zone C — UK & Europe" selected>Zone C — UK &amp; Europe</option>
            <option value="Zone D — North America">Zone D — North America</option>
            <option value="Zone E — East Asia">Zone E — East Asia</option>
            <option value="Zone F — Oceania">Zone F — Oceania</option>
          </select>
        </div>
        <div class="adm-field">
          <label for="cntTransit">Express Transit SLA *</label>
          <input type="text" id="cntTransit" placeholder="e.g., 3–5 Days" value="3–5 Days" required>
        </div>
        <div class="adm-field">
          <label for="cntCustoms">Customs Clearance Mode *</label>
          <input type="text" id="cntCustoms" placeholder="e.g., EU ICS2 / Direct Clearance" required>
        </div>
        <div class="adm-field">
          <label for="cntStatus">Coverage Status</label>
          <select id="cntStatus">
            <option value="true" selected>Active Coverage</option>
            <option value="false">Suspended</option>
          </select>
        </div>
        <div class="adm-field full" style="flex-direction:row; justify-content:flex-end; gap:10px; margin-top:4px;">
          <button type="button" class="adm-btn-secondary" onclick="resetDestinationCountryForm()">Clear</button>
          <button type="submit" class="adm-btn-new">Save Country</button>
        </div>
      </form>
    </div>
  `;
}

async function toggleLocationService(locType, key) {
  const locs = admState.store.locations || { countries: [], regions: [], cities: [], coverageZones: [] };
  if (locType === 'regions') {
    const r = (locs.regions || []).find(item => item.code === key);
    if (r) r.active = !(r.active !== false);
  } else if (locType === 'cities') {
    const c = (locs.cities || []).find(item => item.city === key);
    if (c) c.serviceable = !c.serviceable;
  } else if (locType === 'countries') {
    const c = (locs.countries || []).find(item => item.code === key);
    if (c) c.serviceable = !c.serviceable;
  } else if (locType === 'coverageZones') {
    const z = (locs.coverageZones || []).find(item => item.code === key);
    if (z) z.active = !(z.active !== false);
  }
  const res = await postAdminAction({ action: 'toggle_location', locType, key });
  if (res && res.ok && res.store) {
    admState.store = res.store;
  }
  showAdminToast(`Updated status for ${key}`);
  renderCurrentRouteView();
}

function verifyAdminDeliveryCoverage() {
  const box = document.getElementById('covCheckResultBox');
  if (!box) return;
  const pinVal = (document.getElementById('covCheckPin')?.value || '400099').trim();
  const zoneCode = document.getElementById('covCheckDest')?.value || 'ZONE-A';
  const zones = admState.store.locations?.coverageZones || [];
  const z = zones.find(item => item.code === zoneCode) || zones[0] || {
    code: 'ZONE-A',
    zone: 'Zone A — Middle East & GCC',
    countries: 'UAE, Saudi Arabia, Qatar, Kuwait, Oman, Bahrain',
    transit: '2–3 Business Days',
    customs: 'GCC Direct / ZATCA / Dubai Customs',
    carriers: 'Aramex Direct / DHL Express',
    coverage: '99.4% Doorstep',
    active: true
  };

  let originHub = 'BOM-HUB-01 (Mumbai CSIA Gateway — 19:30 IST Cutoff)';
  const pLower = pinVal.toLowerCase();
  if (/^560|bengaluru|bangalore/.test(pLower)) originHub = 'BLR-HUB-01 (Kempegowda Intl Gateway — 19:00 IST Cutoff)';
  else if (/^110|^122|^201|delhi|ncr|noida|gurgaon/.test(pLower)) originHub = 'DEL-HUB-01 (IGI Cargo Terminal — 20:00 IST Cutoff)';
  else if (/^600|chennai/.test(pLower)) originHub = 'MAA-HUB-01 (Chennai Air Cargo — 19:00 IST Cutoff)';
  else if (/^500|hyderabad/.test(pLower)) originHub = 'HYD-HUB-01 (RGIA Pharma Zone — 19:15 IST Cutoff)';
  else if (/^380|^395|ahmedabad|surat|gujarat/.test(pLower)) originHub = 'AMD-HUB-01 (SVPI Air Cargo — 18:45 IST Cutoff)';
  else if (/^682|kochi|kerala/.test(pLower)) originHub = 'COK-HUB-01 (Cochin Intl Cargo — 18:30 IST Cutoff)';
  else if (/^700|kolkata/.test(pLower)) originHub = 'CCU-HUB-01 (Kolkata NSCBI — 18:00 IST Cutoff)';
  else if (/^411|pune/.test(pLower)) originHub = 'PNQ-HUB-01 (Pune / Mumbai Feeder — 18:30 IST Cutoff)';

  const isAct = z.active !== false;
  box.innerHTML = `
    <div style="margin-top:4px; padding:12px 14px; border:1px solid ${isAct ? '#BBF7D0' : '#FDE68A'}; background:${isAct ? '#F0FDF4' : '#FFFBEB'}; border-radius:10px; display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:10px; font-size:12.5px; max-width:100%; min-width:0; box-sizing:border-box;">
      <div style="flex:1 1 240px; min-width:0; overflow-wrap:anywhere;">
        <strong style="color:${isAct ? '#166534' : '#92400E'};">${isAct ? '✓ Doorstep Pickup & Delivery Serviceable' : '⚠ Corridor Currently Suspended'}</strong>
        <div style="color:#334155; margin-top:3px;">
          <strong>Origin Hub:</strong> ${esc(originHub)} &nbsp;➔&nbsp; <strong>Destination:</strong> ${esc(z.zone)} (${esc(z.coverage)})
        </div>
      </div>
      <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <span class="adm-status-pill booked" style="min-width:auto; padding:3px 10px;">SLA: ${esc(z.transit)}</span>
        <span class="adm-status-pill transit" style="min-width:auto; padding:3px 10px;">${esc(z.carriers)}</span>
      </div>
    </div>
  `;
}

function editCoverageZone(code) {
  const z = (admState.store.locations?.coverageZones || []).find(item => item.code === code);
  if (!z) return;
  document.getElementById('covCode').value = z.code;
  document.getElementById('covZone').value = z.zone;
  document.getElementById('covCountries').value = z.countries;
  document.getElementById('covTransit').value = z.transit;
  document.getElementById('covCustoms').value = z.customs;
  document.getElementById('covCarriers').value = z.carriers;
  document.getElementById('covPct').value = z.coverage;
  document.getElementById('covStatus').value = z.active !== false ? 'true' : 'false';
  const titleEl = document.getElementById('covFormTitle');
  if (titleEl) titleEl.textContent = `Editing Coverage Zone: ${z.code} — ${z.zone}`;
  document.getElementById('covFormCard')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function resetCoverageZoneForm() {
  const el = document.getElementById('covCode');
  if (!el) return;
  el.value = '';
  document.getElementById('covZone').value = '';
  document.getElementById('covCountries').value = '';
  document.getElementById('covTransit').value = '3–5 Business Days';
  document.getElementById('covCustoms').value = '';
  document.getElementById('covCarriers').value = '';
  document.getElementById('covPct').value = '99.0% Doorstep';
  document.getElementById('covStatus').value = 'true';
  const titleEl = document.getElementById('covFormTitle');
  if (titleEl) titleEl.textContent = 'Add / Update Global Delivery Coverage Zone';
  el.focus();
}

async function saveCoverageZoneForm() {
  const zoneItem = {
    code: (document.getElementById('covCode')?.value || '').trim().toUpperCase(),
    zone: (document.getElementById('covZone')?.value || '').trim(),
    countries: (document.getElementById('covCountries')?.value || '').trim(),
    transit: (document.getElementById('covTransit')?.value || '3–5 Business Days').trim(),
    customs: (document.getElementById('covCustoms')?.value || 'Express Courier Clearance').trim(),
    carriers: (document.getElementById('covCarriers')?.value || 'DHL / FedEx / UPS').trim(),
    coverage: (document.getElementById('covPct')?.value || '99.0% Doorstep').trim(),
    active: document.getElementById('covStatus')?.value !== 'false'
  };
  if (!zoneItem.code || !zoneItem.zone) return;
  const list = admState.store.locations?.coverageZones || [];
  const idx = list.findIndex(z => z.code === zoneItem.code);
  if (idx >= 0) list[idx] = zoneItem;
  else list.push(zoneItem);
  admState.store.locations.coverageZones = list;
  const res = await postAdminAction({ action: 'save_coverage_zone', zoneItem });
  if (res && res.ok && res.store) admState.store = res.store;
  showAdminToast(`Saved coverage zone ${zoneItem.code} (${zoneItem.zone}).`);
  renderCurrentRouteView();
}

async function deleteCoverageZoneItem(code) {
  if (admState.store.locations) {
    admState.store.locations.coverageZones = (admState.store.locations.coverageZones || []).filter(z => z.code !== code);
  }
  const res = await postAdminAction({ action: 'delete_coverage_zone', code });
  if (res && res.ok && res.store) admState.store = res.store;
  showAdminToast(`Deleted coverage zone ${code}.`);
  renderCurrentRouteView();
}

function editGatewayRegion(code) {
  const r = (admState.store.locations?.regions || []).find(item => item.code === code);
  if (!r) return;
  document.getElementById('regCode').value = r.code;
  document.getElementById('regName').value = r.name;
  document.getElementById('regState').value = r.state;
  document.getElementById('regAirport').value = r.gatewayAirport;
  document.getElementById('regCutoff').value = r.dailyCutoff;
  document.getElementById('regStatus').value = r.active !== false ? 'true' : 'false';
  const titleEl = document.getElementById('regFormTitle');
  if (titleEl) titleEl.textContent = `Editing Gateway Region: ${r.code} — ${r.name}`;
  document.getElementById('regFormCard')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function resetGatewayRegionForm() {
  const codeEl = document.getElementById('regCode');
  if (!codeEl) return;
  codeEl.value = '';
  document.getElementById('regName').value = '';
  document.getElementById('regState').value = '';
  document.getElementById('regAirport').value = '';
  document.getElementById('regCutoff').value = '19:00 IST';
  document.getElementById('regStatus').value = 'true';
  const titleEl = document.getElementById('regFormTitle');
  if (titleEl) titleEl.textContent = 'Add / Update Indian Export Gateway Region';
  codeEl.focus();
}

async function saveGatewayRegionForm() {
  const region = {
    code: (document.getElementById('regCode')?.value || '').trim().toUpperCase(),
    name: (document.getElementById('regName')?.value || '').trim(),
    state: (document.getElementById('regState')?.value || '').trim(),
    gatewayAirport: (document.getElementById('regAirport')?.value || '').trim(),
    dailyCutoff: (document.getElementById('regCutoff')?.value || '19:00 IST').trim(),
    active: document.getElementById('regStatus')?.value !== 'false'
  };
  if (!region.code || !region.name) return;
  const list = admState.store.locations?.regions || [];
  const idx = list.findIndex(r => r.code === region.code);
  if (idx >= 0) list[idx] = region;
  else list.push(region);
  admState.store.locations.regions = list;
  const res = await postAdminAction({ action: 'save_region', region });
  if (res && res.ok && res.store) admState.store = res.store;
  showAdminToast(`Saved gateway region ${region.code} (${region.name}).`);
  renderCurrentRouteView();
}

async function deleteGatewayRegionItem(code) {
  if (admState.store.locations) {
    admState.store.locations.regions = (admState.store.locations.regions || []).filter(r => r.code !== code);
  }
  const res = await postAdminAction({ action: 'delete_region', code });
  if (res && res.ok && res.store) admState.store = res.store;
  showAdminToast(`Deleted gateway region ${code}.`);
  renderCurrentRouteView();
}

function editPickupCity(cityName) {
  const c = (admState.store.locations?.cities || []).find(item => item.city === cityName);
  if (!c) return;
  document.getElementById('ctyName').value = c.city;
  document.getElementById('ctyState').value = c.state;
  document.getElementById('ctyPin').value = c.pinPrefix;
  document.getElementById('ctyHub').value = c.hubCode;
  document.getElementById('ctySameDay').value = c.sameDayPickup ? 'true' : 'false';
  document.getElementById('ctyStatus').value = c.serviceable ? 'true' : 'false';
  const titleEl = document.getElementById('ctyFormTitle');
  if (titleEl) titleEl.textContent = `Editing Pickup City: ${c.city} (${c.hubCode})`;
  document.getElementById('ctyFormCard')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function resetPickupCityForm() {
  const el = document.getElementById('ctyName');
  if (!el) return;
  el.value = '';
  document.getElementById('ctyState').value = '';
  document.getElementById('ctyPin').value = '';
  document.getElementById('ctyHub').value = '';
  document.getElementById('ctySameDay').value = 'true';
  document.getElementById('ctyStatus').value = 'true';
  const titleEl = document.getElementById('ctyFormTitle');
  if (titleEl) titleEl.textContent = 'Add / Update Serviceable Pickup City & PIN Zone';
  el.focus();
}

async function savePickupCityForm() {
  const cityItem = {
    city: (document.getElementById('ctyName')?.value || '').trim(),
    state: (document.getElementById('ctyState')?.value || '').trim(),
    pinPrefix: (document.getElementById('ctyPin')?.value || '').trim(),
    hubCode: (document.getElementById('ctyHub')?.value || '').trim().toUpperCase(),
    sameDayPickup: document.getElementById('ctySameDay')?.value !== 'false',
    serviceable: document.getElementById('ctyStatus')?.value !== 'false'
  };
  if (!cityItem.city || !cityItem.state) return;
  const list = admState.store.locations?.cities || [];
  const idx = list.findIndex(c => c.city.toLowerCase() === cityItem.city.toLowerCase());
  if (idx >= 0) list[idx] = cityItem;
  else list.push(cityItem);
  admState.store.locations.cities = list;
  const res = await postAdminAction({ action: 'save_city', cityItem });
  if (res && res.ok && res.store) admState.store = res.store;
  showAdminToast(`Saved pickup city ${cityItem.city} (${cityItem.hubCode}).`);
  renderCurrentRouteView();
}

async function deletePickupCityItem(cityName) {
  if (admState.store.locations) {
    admState.store.locations.cities = (admState.store.locations.cities || []).filter(c => c.city !== cityName);
  }
  const res = await postAdminAction({ action: 'delete_city', city: cityName });
  if (res && res.ok && res.store) admState.store = res.store;
  showAdminToast(`Deleted pickup city ${cityName}.`);
  renderCurrentRouteView();
}

function editDestinationCountry(code) {
  const c = (admState.store.locations?.countries || []).find(item => item.code === code);
  if (!c) return;
  document.getElementById('cntCode').value = c.code;
  document.getElementById('cntName').value = c.name;
  document.getElementById('cntZone').value = c.zone;
  document.getElementById('cntTransit').value = c.transitDays;
  document.getElementById('cntCustoms').value = c.customsMode;
  document.getElementById('cntStatus').value = c.serviceable ? 'true' : 'false';
  const titleEl = document.getElementById('cntFormTitle');
  if (titleEl) titleEl.textContent = `Editing Destination Country: ${c.name} (${c.code})`;
  document.getElementById('cntFormCard')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function resetDestinationCountryForm() {
  const el = document.getElementById('cntCode');
  if (!el) return;
  el.value = '';
  document.getElementById('cntName').value = '';
  document.getElementById('cntZone').value = 'Zone C — UK & Europe';
  document.getElementById('cntTransit').value = '3–5 Days';
  document.getElementById('cntCustoms').value = '';
  document.getElementById('cntStatus').value = 'true';
  const titleEl = document.getElementById('cntFormTitle');
  if (titleEl) titleEl.textContent = 'Add / Update International Destination Country';
  el.focus();
}

async function saveDestinationCountryForm() {
  const country = {
    code: (document.getElementById('cntCode')?.value || '').trim().toUpperCase(),
    name: (document.getElementById('cntName')?.value || '').trim(),
    zone: document.getElementById('cntZone')?.value || 'Zone C — UK & Europe',
    transitDays: (document.getElementById('cntTransit')?.value || '3–5 Days').trim(),
    customsMode: (document.getElementById('cntCustoms')?.value || 'Express Courier Clearance').trim(),
    serviceable: document.getElementById('cntStatus')?.value !== 'false'
  };
  if (!country.code || !country.name) return;
  const list = admState.store.locations?.countries || [];
  const idx = list.findIndex(c => c.code === country.code);
  if (idx >= 0) {
    country.shipmentsCount = list[idx].shipmentsCount || 25;
    list[idx] = country;
  } else {
    country.shipmentsCount = 25;
    list.push(country);
  }
  admState.store.locations.countries = list;
  const res = await postAdminAction({ action: 'save_country', country });
  if (res && res.ok && res.store) admState.store = res.store;
  showAdminToast(`Saved destination country ${country.name} (${country.code}).`);
  renderCurrentRouteView();
}

async function deleteDestinationCountryItem(code) {
  if (admState.store.locations) {
    admState.store.locations.countries = (admState.store.locations.countries || []).filter(c => c.code !== code);
  }
  const res = await postAdminAction({ action: 'delete_country', code });
  if (res && res.ok && res.store) admState.store = res.store;
  showAdminToast(`Deleted destination country ${code}.`);
  renderCurrentRouteView();
}

/* ==========================================================================
   9. REPORTS SECTION (Shipment, Booking, Revenue, Customer, Partner + CSV Export)
   ========================================================================== */
function renderReportsSection(container) {
  const shipments = admState.store.shipments || [];
  const partners = admState.store.partners || [];
  const totalRev = shipments.reduce((acc, s) => acc + (Number(s.amountInr) || 0), 0) + 1220210;
  const pageKey = 'reports-table';
  const { pageItems, page, pageSize, totalPages, startIdx, endIdx, totalCount } = getPaginatedSlice(pageKey, shipments, 5);

  container.innerHTML = `
    <div class="adm-kpi-grid" style="margin-bottom:16px;">
      <div class="adm-kpi-card">
        <div class="adm-kpi-body">
          <div class="adm-kpi-label">Total Shipments Logged</div>
          <div class="adm-kpi-value">${1242 + shipments.length}</div>
        </div>
      </div>
      <div class="adm-kpi-card">
        <div class="adm-kpi-body">
          <div class="adm-kpi-label">Total Bookings &amp; Quotes</div>
          <div class="adm-kpi-value">${(admState.pickups?.length || 0) + (admState.quotes?.length || 0) + shipments.length}</div>
        </div>
      </div>
      <div class="adm-kpi-card">
        <div class="adm-kpi-body">
          <div class="adm-kpi-label">Cumulative Revenue (INR)</div>
          <div class="adm-kpi-value">₹ ${totalRev.toLocaleString('en-IN')}</div>
        </div>
      </div>
      <div class="adm-kpi-card">
        <div class="adm-kpi-body">
          <div class="adm-kpi-label">Active Carrier Partners</div>
          <div class="adm-kpi-value">${partners.filter(p => p.enabled).length} / ${partners.length}</div>
        </div>
      </div>
    </div>

    <div class="adm-card">
      <div class="adm-card-header">
        <h2 class="adm-card-title">Operational &amp; Financial Reports (${totalCount})</h2>
        <button type="button" class="adm-btn-new" onclick="exportAdminReportCsv()">Export Report CSV ↓</button>
      </div>
      <div class="adm-table-wrap">
        <table class="adm-table">
          <thead>
            <tr>
              <th>Tracking No.</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Corridor</th>
              <th>Package Type</th>
              <th>Weight</th>
              <th>Carrier Partner</th>
              <th>Revenue (INR)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${pageItems.map(s => `
              <tr>
                <td><strong class="adm-trk-code">${esc(s.trackingNo)}</strong></td>
                <td>${esc(s.date)}</td>
                <td><strong>${esc(s.customer)}</strong></td>
                <td>${esc(s.fromCountry)} ➔ ${esc(s.toCountry)}</td>
                <td>${esc(s.type)}</td>
                <td>${esc(s.weight)}</td>
                <td>${esc(s.carrier || 'DHL')}</td>
                <td><strong>₹ ${(s.amountInr || 3500).toLocaleString('en-IN')}</strong></td>
                <td><span class="adm-status-pill ${statusPillClass(s.status)}">${esc(s.status)}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ${renderPaginationBar(pageKey, totalCount, page, pageSize, totalPages, startIdx, endIdx)}
    </div>
  `;
}

function exportAdminReportCsv() {
  const shipments = admState.store.shipments || [];
  const header = ['Tracking No', 'Date', 'Customer', 'Origin', 'Destination', 'Type', 'Weight', 'Carrier', 'Amount INR', 'Status'];
  const rows = shipments.map(s => [
    s.trackingNo, s.date, `"${(s.customer || '').replace(/"/g, '""')}"`, s.fromCountry, s.toCountry, s.type, s.weight, s.carrier || 'DHL', s.amountInr || 3500, s.status
  ]);
  const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Trisys_Express_Shipment_Report.csv';
  a.click();
  URL.revokeObjectURL(url);
  showAdminToast('Downloaded Trisys_Express_Shipment_Report.csv');
}

/* ==========================================================================
   10. CMS / PAGES SECTION
   ========================================================================== */
function renderCmsSection(container) {
  const pages = admState.store.cmsPages || [];
  const pageKey = 'cms-pages';
  const { pageItems, page, pageSize, totalPages, startIdx, endIdx, totalCount } = getPaginatedSlice(pageKey, pages, 5);
  container.innerHTML = `
    <div class="adm-card" style="margin-bottom:16px;">
      <div class="adm-card-header">
        <h2 class="adm-card-title">Manage Website Pages &amp; SEO Metadata (${totalCount})</h2>
      </div>
      <div class="adm-table-wrap">
        <table class="adm-table">
          <thead>
            <tr>
              <th>Page ID</th>
              <th>Page Title</th>
              <th>Route Slug</th>
              <th>SEO Meta Description</th>
              <th>Last Updated</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${pageItems.map(p => `
              <tr>
                <td><strong class="adm-trk-code">${esc(p.id)}</strong></td>
                <td><strong>${esc(p.title)}</strong></td>
                <td><code>${esc(p.slug)}</code></td>
                <td class="adm-desc-cell" style="max-width:360px;">${esc(p.metaDescription)}</td>
                <td>${esc(p.updatedAt)}</td>
                <td><span class="adm-status-pill ${statusPillClass(p.status)}">${esc(p.status)}</span></td>
                <td>
                  <div style="display:flex; gap:8px;">
                    <a href="${esc(p.slug)}" target="_blank" class="adm-btn-secondary" style="height:30px; padding:0 12px; font-size:12px; white-space:nowrap; flex-shrink:0;">View Live ↗</a>
                    <button type="button" class="adm-btn-secondary" style="height:30px; padding:0 12px; font-size:12px; white-space:nowrap; flex-shrink:0;" onclick="toggleCmsPagePublish('${esc(p.id)}')">
                      ${p.status === 'Published' ? 'Unpublish' : 'Publish'}
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ${renderPaginationBar(pageKey, totalCount, page, pageSize, totalPages, startIdx, endIdx)}
    </div>

    <div class="adm-card">
      <div class="adm-card-header"><h2 class="adm-card-title">Create / Update Website Page</h2></div>
      <form onsubmit="event.preventDefault(); submitCmsPageForm();" class="adm-form-grid" style="max-width:780px;">
        <div class="adm-field">
          <label>Page Title *</label>
          <input type="text" id="cmsTitle" placeholder="e.g. UK Student Excess Baggage Shipping" required>
        </div>
        <div class="adm-field">
          <label>URL Route Slug *</label>
          <input type="text" id="cmsSlug" placeholder="e.g. /student-shipping" required>
        </div>
        <div class="adm-field full">
          <label>SEO Meta Description *</label>
          <input type="text" id="cmsDesc" placeholder="Door-to-door university baggage shipping from India with student discount rates." required>
        </div>
        <div class="adm-field full">
          <button type="submit" class="adm-btn-new" style="width:fit-content;">Save &amp; Publish Page</button>
        </div>
      </form>
    </div>
  `;
}

async function toggleCmsPagePublish(pageId) {
  const page = (admState.store.cmsPages || []).find(p => p.id === pageId);
  if (!page) return;
  const nextStatus = page.status === 'Published' ? 'Draft' : 'Published';
  const res = await postAdminAction({
    action: 'save_cms_page',
    id: page.id,
    title: page.title,
    slug: page.slug,
    metaTitle: page.metaTitle,
    metaDescription: page.metaDescription,
    status: nextStatus
  });
  if (res && res.ok) {
    admState.store = res.store;
    showAdminToast(`Page ${page.slug} set to ${nextStatus}`);
    renderCurrentRouteView();
  }
}

async function submitCmsPageForm() {
  const res = await postAdminAction({
    action: 'save_cms_page',
    title: document.getElementById('cmsTitle').value.trim(),
    slug: document.getElementById('cmsSlug').value.trim(),
    metaDescription: document.getElementById('cmsDesc').value.trim(),
    status: 'Published'
  });
  if (res && res.ok) {
    admState.store = res.store;
    showAdminToast('CMS Page saved and published!');
    renderCurrentRouteView();
  }
}

/* ==========================================================================
   11. BLOG SECTION
   ========================================================================== */
function renderBlogSection(container) {
  const posts = admState.store.blogPosts || [];
  const pageKey = 'blog-posts';
  const { pageItems, page, pageSize, totalPages, startIdx, endIdx, totalCount } = getPaginatedSlice(pageKey, posts, 5);
  container.innerHTML = `
    <div class="adm-card" style="margin-bottom:16px;">
      <div class="adm-card-header"><h2 class="adm-card-title">Blog Posts &amp; Shipping Guides (${totalCount})</h2></div>
      <div class="adm-table-wrap">
        <table class="adm-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Post Title &amp; Excerpt</th>
              <th>Category</th>
              <th>Tags</th>
              <th>Published Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${pageItems.map(b => `
              <tr>
                <td><img src="${esc(b.featuredImage || '/assets/card2_parcel.png')}" alt="" style="width:44px; height:44px; object-fit:contain; border-radius:8px; background:#F8FAFC; padding:4px;"></td>
                <td class="adm-desc-cell" style="max-width:380px;">
                  <strong style="color:#111827; display:block;">${esc(b.title)}</strong>
                  <span style="font-size:11.5px; color:#64748B;">${esc(b.excerpt)}</span>
                </td>
                <td><strong>${esc(b.category)}</strong></td>
                <td>${esc(b.tags)}</td>
                <td>${esc(b.publishedAt)}</td>
                <td><span class="adm-status-pill ${statusPillClass(b.status)}">${esc(b.status)}</span></td>
                <td>
                  <button type="button" class="adm-btn-secondary" style="height:30px; padding:0 12px; font-size:12px; white-space:nowrap; flex-shrink:0; width:max-content; display:inline-flex; align-items:center; justify-content:center;" onclick="toggleBlogPostStatus('${esc(b.id)}')">
                    ${b.status === 'Published' ? 'Unpublish' : 'Publish'}
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ${renderPaginationBar(pageKey, totalCount, page, pageSize, totalPages, startIdx, endIdx)}
    </div>

    <div class="adm-card">
      <div class="adm-card-header"><h2 class="adm-card-title">Create New Blog Post</h2></div>
      <form onsubmit="event.preventDefault(); submitBlogPostForm();" class="adm-form-grid" style="max-width:780px;">
        <div class="adm-field">
          <label>Article Title *</label>
          <input type="text" id="blgTitle" placeholder="e.g. Customs Duty Guide for Sending Gifts to the UK" required>
        </div>
        <div class="adm-field">
          <label>Category *</label>
          <select id="blgCategory">
            <option value="Shipping Guides">Shipping Guides</option>
            <option value="Medicine Courier">Medicine Courier</option>
            <option value="E-commerce Logistics">E-commerce Logistics</option>
            <option value="Customs & Compliance">Customs &amp; Compliance</option>
          </select>
        </div>
        <div class="adm-field">
          <label>Tags (comma-separated)</label>
          <input type="text" id="blgTags" placeholder="UK, Customs, Gifts, Parcel">
        </div>
        <div class="adm-field">
          <label>Featured Image Asset</label>
          <select id="blgImage">
            <option value="/assets/card2_parcel.png">Parcel Box Icon (/assets/card2_parcel.png)</option>
            <option value="/assets/card3_medicine.png">Medicine Icon (/assets/card3_medicine.png)</option>
            <option value="/assets/card1_doc.png">Document Icon (/assets/card1_doc.png)</option>
            <option value="/assets/card4_ecommerce.png">E-commerce Icon (/assets/card4_ecommerce.png)</option>
          </select>
        </div>
        <div class="adm-field full">
          <label>Summary / Excerpt *</label>
          <input type="text" id="blgExcerpt" placeholder="Key takeaways and documentation rules for international shippers..." required>
        </div>
        <div class="adm-field full">
          <button type="submit" class="adm-btn-new" style="width:fit-content;">Publish Blog Post</button>
        </div>
      </form>
    </div>
  `;
}

async function toggleBlogPostStatus(postId) {
  const post = (admState.store.blogPosts || []).find(b => b.id === postId);
  if (!post) return;
  const nextStatus = post.status === 'Published' ? 'Draft' : 'Published';
  const res = await postAdminAction({
    action: 'save_blog_post',
    ...post,
    status: nextStatus
  });
  if (res && res.ok) {
    admState.store = res.store;
    showAdminToast(`Blog post "${post.title.slice(0, 28)}..." set to ${nextStatus}`);
    renderCurrentRouteView();
  }
}

async function submitBlogPostForm() {
  const res = await postAdminAction({
    action: 'save_blog_post',
    title: document.getElementById('blgTitle').value.trim(),
    category: document.getElementById('blgCategory').value,
    tags: document.getElementById('blgTags').value.trim(),
    featuredImage: document.getElementById('blgImage').value,
    excerpt: document.getElementById('blgExcerpt').value.trim(),
    status: 'Published'
  });
  if (res && res.ok) {
    admState.store = res.store;
    showAdminToast('New blog post published!');
    renderCurrentRouteView();
  }
}

/* ==========================================================================
   12. SETTINGS SECTION (General, Company, Branding, Notifications, Shipping, Roles, Security)
   ========================================================================== */
function renderSettingsSection(container, subView) {
  const subTabs = [
    { key: 'general', label: 'General Settings', path: '/admin/settings/general' },
    { key: 'company', label: 'Company Information', path: '/admin/settings/company' },
    { key: 'branding', label: 'Branding & Logo', path: '/admin/settings/branding' },
    { key: 'notifications', label: 'Email & Notifications', path: '/admin/settings/notifications' },
    { key: 'shipping', label: 'Shipping Configuration', path: '/admin/settings/shipping' },
    { key: 'roles', label: 'User Roles & Permissions', path: '/admin/settings/roles' },
    { key: 'security', label: 'Security Settings', path: '/admin/settings/security' }
  ];

  const tabsHtml = `
    <div class="adm-subnav-pills">
      ${subTabs.map(t => `
        <a href="${t.path}" class="adm-subpill ${subView === t.key ? 'active' : ''}" onclick="event.preventDefault(); navigateAdmin('${t.path}')">${esc(t.label)}</a>
      `).join('')}
    </div>
  `;

  const s = admState.store.settings || {};

  if (subView === 'roles') {
    const roles = s.roles || [];
    container.innerHTML = `
      ${tabsHtml}
      <div class="adm-card">
        <div class="adm-card-header"><h2 class="adm-card-title">User Roles &amp; Access Permissions</h2></div>
        <div class="adm-table-wrap">
          <table class="adm-table">
            <thead>
              <tr><th>Role Name</th><th>Assigned Users</th><th>Granted Module Permissions</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${roles.map(r => `
                <tr>
                  <td><strong>${esc(r.role)}</strong></td>
                  <td><strong>${r.usersCount} Users</strong></td>
                  <td class="adm-desc-cell">${esc(r.permissions)}</td>
                  <td><span class="adm-status-pill delivered">Active</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    return;
  }

  const sectionData = s[subView] || s.general || {};
  const entries = Object.entries(sectionData);

  container.innerHTML = `
    ${tabsHtml}
    <div class="adm-card">
      <div class="adm-card-header">
        <h2 class="adm-card-title">${esc(ADMIN_ROUTES[admState.currentPath]?.title || 'Settings')}</h2>
      </div>
      <form onsubmit="event.preventDefault(); saveCurrentSettingsSection('${esc(subView)}');" class="adm-form-grid" style="max-width:760px;">
        ${entries.map(([k, v]) => `
          <div class="adm-field">
            <label>${esc(k.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()))}</label>
            <input type="text" data-setting-key="${esc(k)}" value="${esc(String(v))}">
          </div>
        `).join('')}
        <div class="adm-field full" style="margin-top:8px;">
          <button type="submit" class="adm-btn-new" style="width:fit-content;">Save ${esc(subView)} Settings</button>
        </div>
      </form>
    </div>
  `;
}

async function saveCurrentSettingsSection(section) {
  const values = {};
  document.querySelectorAll('[data-setting-key]').forEach(inp => {
    const k = inp.getAttribute('data-setting-key');
    let v = inp.value.trim();
    if (v === 'true') v = true;
    else if (v === 'false') v = false;
    else if (!isNaN(v) && v !== '') v = Number(v);
    values[k] = v;
  });
  const res = await postAdminAction({ action: 'save_settings', section, values });
  if (res && res.ok) {
    admState.store = res.store;
    showAdminToast(`Saved ${section} settings!`);
  }
}

/* ==========================================================================
   GLOBAL SEARCH, CHART TOGGLE & MODAL HANDLERS
   ========================================================================== */
let admSearchDebounceTimer = null;
let admSearchAbortController = null;
let admSearchSeq = 0;
let admSearchActiveIndex = -1;

function highlightSearchMatch(text, rawQuery) {
  const safeText = esc(text ?? '');
  const q = (rawQuery || '').trim();
  if (!q || q.length < 2) return safeText;
  const escapedQuery = esc(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  try {
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return safeText.replace(regex, '<mark class="adm-search-highlight">$1</mark>');
  } catch (_) {
    return safeText;
  }
}

function clearSelectedSearchRecord() {
  admState.selectedRecord = null;
  resetShipmentFilter();
}

function filterDashboardShipments(val) {
  const raw = val || '';
  const trimmed = raw.trim();
  admState.filterText = raw;

  const clearBtn = document.getElementById('admSearchClearBtn');
  if (clearBtn) {
    clearBtn.hidden = !trimmed;
  }

  Object.keys(admState.pagination || {}).forEach(k => {
    admState.pagination[k].page = 1;
  });

  if (!trimmed) {
    admState.selectedRecord = null;
  }
  renderCurrentRouteView();

  const drop = document.getElementById('admGlobalSearchResults');
  if (admSearchDebounceTimer) {
    clearTimeout(admSearchDebounceTimer);
    admSearchDebounceTimer = null;
  }
  if (admSearchAbortController) {
    admSearchAbortController.abort();
    admSearchAbortController = null;
  }

  if (!trimmed) {
    admSearchActiveIndex = -1;
    if (drop) {
      drop.hidden = true;
      drop.innerHTML = '';
    }
    return;
  }

  if (trimmed.length < 2) {
    admSearchActiveIndex = -1;
    if (drop) {
      drop.innerHTML = `<div class="adm-search-empty">Enter at least 2 characters to search shipments, tracking numbers, customers, and bookings.</div>`;
      drop.hidden = false;
    }
    return;
  }

  if (drop) {
    drop.innerHTML = `<div class="adm-search-loading"><span class="adm-search-spinner"></span>Searching shipments, tracking numbers, customers &amp; bookings...</div>`;
    drop.hidden = false;
  }

  admSearchDebounceTimer = setTimeout(() => {
    executeBackendAdminSearch(trimmed);
  }, 300);
}

function handleGlobalSearchFocus(val) {
  const trimmed = (val || '').trim();
  if (!trimmed) return;
  const drop = document.getElementById('admGlobalSearchResults');
  if (drop && drop.innerHTML.trim()) {
    drop.hidden = false;
  } else {
    filterDashboardShipments(val);
  }
}

async function executeBackendAdminSearch(query) {
  const drop = document.getElementById('admGlobalSearchResults');
  if (!drop) return;

  const seq = ++admSearchSeq;
  if (admSearchAbortController) {
    admSearchAbortController.abort();
  }
  const controller = new AbortController();
  admSearchAbortController = controller;

  try {
    const res = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}&limit=5`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Admin-Key': ADMIN_API_KEY
      },
      signal: controller.signal
    });

    if (seq !== admSearchSeq) return;

    if (res.status === 401 || res.status === 403) {
      drop.innerHTML = `<div class="adm-search-error">Unauthorized session. Please verify your administrator credentials.</div>`;
      drop.hidden = false;
      return;
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    if (seq !== admSearchSeq) return;

    if (!data || !data.ok) {
      throw new Error(data?.error || 'Search query failed');
    }

    renderGlobalSearchDropdown(query, data);
  } catch (err) {
    if (err && err.name === 'AbortError') return;
    if (seq !== admSearchSeq) return;
    drop.innerHTML = `
      <div class="adm-search-error">
        <div>Unable to complete search request. Please check your connection and try again.</div>
        <button type="button" class="adm-btn-secondary" style="height:26px; padding:0 10px; font-size:11.5px; margin-top:8px;" onclick="executeBackendAdminSearch('${esc(query)}')">Retry Search</button>
      </div>
    `;
    drop.hidden = false;
  }
}

function resetShipmentFilter() {
  if (admSearchDebounceTimer) {
    clearTimeout(admSearchDebounceTimer);
    admSearchDebounceTimer = null;
  }
  if (admSearchAbortController) {
    admSearchAbortController.abort();
    admSearchAbortController = null;
  }
  admSearchSeq++;
  admSearchActiveIndex = -1;

  const inp = document.getElementById('admGlobalSearch');
  if (inp) inp.value = '';
  const clearBtn = document.getElementById('admSearchClearBtn');
  if (clearBtn) clearBtn.hidden = true;
  const drop = document.getElementById('admGlobalSearchResults');
  if (drop) {
    drop.hidden = true;
    drop.innerHTML = '';
  }
  admState.filterText = '';
  admState.selectedRecord = null;
  Object.keys(admState.pagination || {}).forEach(k => {
    admState.pagination[k].page = 1;
  });
  renderCurrentRouteView();
}

function renderGlobalSearchDropdown(rawQuery, data) {
  const drop = document.getElementById('admGlobalSearchResults');
  if (!drop) return;
  const q = (rawQuery || '').trim();
  if (!q) {
    drop.hidden = true;
    drop.innerHTML = '';
    return;
  }

  const shipments = Array.isArray(data?.shipments) ? data.shipments : [];
  const tracking = Array.isArray(data?.tracking) ? data.tracking : [];
  const customers = Array.isArray(data?.customers) ? data.customers : [];
  const bookings = Array.isArray(data?.bookings) ? data.bookings : [];
  const partners = Array.isArray(data?.partners) ? data.partners : [];

  admSearchActiveIndex = -1;
  let html = '';

  if (shipments.length) {
    html += `<div class="adm-search-group-label"><span>Shipments</span><span>${shipments.length}</span></div>`;
    shipments.forEach(s => {
      html += `
        <button type="button" class="adm-search-item" role="option" onclick="selectGlobalSearchResult('/admin/shipments', '${esc(s.trackingNo)}', '', 'shipment', '${esc(s.trackingNo)}')">
          <div class="adm-search-item-main">
            <span class="adm-search-item-title">${highlightSearchMatch(s.trackingNo, q)} — ${highlightSearchMatch(s.customer, q)}</span>
            <span class="adm-search-item-sub">${highlightSearchMatch(s.fromCountry || 'India', q)} ➔ ${highlightSearchMatch(s.toCountry, q)} • ${highlightSearchMatch(s.type, q)} (${esc(s.weight)}) • ${highlightSearchMatch(s.carrier || 'DHL', q)}</span>
          </div>
          <span class="adm-status-pill ${statusPillClass(s.status)}" style="font-size:10.5px; padding:2px 8px;">${esc(s.status)}</span>
        </button>
      `;
    });
  }

  if (tracking.length) {
    html += `<div class="adm-search-group-label"><span>Tracking Numbers</span><span>${tracking.length}</span></div>`;
    tracking.forEach(t => {
      html += `
        <button type="button" class="adm-search-item" role="option" onclick="selectGlobalSearchResult('/admin/tracking', '${esc(t.trackingNo)}', '${esc(t.trackingNo)}', 'tracking', '${esc(t.trackingNo)}')">
          <div class="adm-search-item-main">
            <span class="adm-search-item-title">${highlightSearchMatch(t.trackingNo, q)} <span style="font-weight:500; color:#64748B; font-size:11px;">(${esc(t.recordType)})</span></span>
            <span class="adm-search-item-sub">${highlightSearchMatch(t.customer, q)} • ${highlightSearchMatch(t.corridor, q)} • Hub: ${highlightSearchMatch(t.lastScan, q)}</span>
          </div>
          <span class="adm-status-pill ${statusPillClass(t.status)}" style="font-size:10.5px; padding:2px 8px;">Track Live</span>
        </button>
      `;
    });
  }

  if (customers.length) {
    html += `<div class="adm-search-group-label"><span>Customers</span><span>${customers.length}</span></div>`;
    customers.forEach(c => {
      html += `
        <button type="button" class="adm-search-item" role="option" onclick="selectGlobalSearchResult('/admin/customers', '${esc(c.id)}', '', 'customer', '${esc(c.id)}')">
          <div class="adm-search-item-main">
            <span class="adm-search-item-title">${highlightSearchMatch(c.name, q)} <span style="font-weight:600; color:#64748B; font-size:11px;">(${highlightSearchMatch(c.id, q)})</span></span>
            <span class="adm-search-item-sub">${highlightSearchMatch(c.email, q)} • ${highlightSearchMatch(c.phone, q)} • ${highlightSearchMatch(c.company, q)}</span>
          </div>
          <span class="adm-status-pill ${statusPillClass(c.status)}" style="font-size:10.5px; padding:2px 8px;">${esc(c.shipmentsCount || 1)} Shipments</span>
        </button>
      `;
    });
  }

  if (bookings.length) {
    html += `<div class="adm-search-group-label"><span>Bookings</span><span>${bookings.length}</span></div>`;
    bookings.forEach(b => {
      html += `
        <button type="button" class="adm-search-item" role="option" onclick="selectGlobalSearchResult('/admin/bookings', '${esc(b.ref)}', '', 'booking', '${esc(b.ref)}')">
          <div class="adm-search-item-main">
            <span class="adm-search-item-title">${highlightSearchMatch(b.ref, q)} — ${highlightSearchMatch(b.customer, q)}</span>
            <span class="adm-search-item-sub">${highlightSearchMatch(b.type, q)} • ${highlightSearchMatch(b.route, q)} • ${highlightSearchMatch(b.details, q)}</span>
          </div>
          <span class="adm-status-pill ${statusPillClass(b.status)}" style="font-size:10.5px; padding:2px 8px;">${esc(b.status)}</span>
        </button>
      `;
    });
  }

  if (partners.length) {
    html += `<div class="adm-search-group-label"><span>Courier Partners</span><span>${partners.length}</span></div>`;
    partners.forEach(p => {
      html += `
        <button type="button" class="adm-search-item" role="option" onclick="selectGlobalSearchResult('/admin/courier-partners', '${esc(p.code || p.name)}', '', 'partner', '${esc(p.id)}')">
          <div class="adm-search-item-main">
            <span class="adm-search-item-title">${highlightSearchMatch(p.name, q)} (${highlightSearchMatch(p.id, q)})</span>
            <span class="adm-search-item-sub">Corridors: ${highlightSearchMatch(p.serviceZones, q)} • On-Time SLA: ${esc(p.onTimePct)}%</span>
          </div>
          <span class="adm-status-pill ${statusPillClass(p.status)}" style="font-size:10.5px; padding:2px 8px;">${esc(p.status)}</span>
        </button>
      `;
    });
  }

  if (!html) {
    html = `<div class="adm-search-empty">No results found for "<strong>${esc(q)}</strong>".</div>`;
  }

  drop.innerHTML = html;
  drop.hidden = false;
}

function selectGlobalSearchResult(targetRoute, filterVal, inspectAwb, recordType, recordId) {
  const drop = document.getElementById('admGlobalSearchResults');
  if (drop) drop.hidden = true;
  admSearchActiveIndex = -1;

  const inp = document.getElementById('admGlobalSearch');
  if (inp && filterVal !== undefined) {
    inp.value = filterVal;
  }
  admState.filterText = filterVal || '';
  admState.selectedRecord = recordType && recordId ? { type: recordType, id: recordId } : null;

  const clearBtn = document.getElementById('admSearchClearBtn');
  if (clearBtn) clearBtn.hidden = !admState.filterText.trim();

  Object.keys(admState.pagination || {}).forEach(k => {
    admState.pagination[k].page = 1;
  });

  if (inspectAwb) {
    inspectShipment(inspectAwb);
    return;
  }

  if (targetRoute && admState.currentPath !== targetRoute) {
    navigateAdmin(targetRoute, true);
  } else {
    renderCurrentRouteView();
  }
}

function updateSearchActiveItemHighlight() {
  const drop = document.getElementById('admGlobalSearchResults');
  if (!drop || drop.hidden) return;
  const items = Array.from(drop.querySelectorAll('.adm-search-item'));
  items.forEach((btn, idx) => {
    const isActive = idx === admSearchActiveIndex;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    if (isActive) {
      btn.scrollIntoView({ block: 'nearest' });
    }
  });
}

function handleGlobalSearchKeydown(event) {
  const drop = document.getElementById('admGlobalSearchResults');
  if (event.key === 'Escape') {
    if (drop) drop.hidden = true;
    admSearchActiveIndex = -1;
    return;
  }

  if (!drop || drop.hidden) return;
  const items = Array.from(drop.querySelectorAll('.adm-search-item'));
  if (!items.length) return;

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    admSearchActiveIndex = (admSearchActiveIndex + 1) % items.length;
    updateSearchActiveItemHighlight();
    return;
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault();
    admSearchActiveIndex = (admSearchActiveIndex - 1 + items.length) % items.length;
    updateSearchActiveItemHighlight();
    return;
  }

  if (event.key === 'Enter') {
    event.preventDefault();
    const targetBtn = admSearchActiveIndex >= 0 && items[admSearchActiveIndex]
      ? items[admSearchActiveIndex]
      : items[0];
    if (targetBtn) {
      targetBtn.click();
    }
  }
}

function toggleAdminSidebar() {
  const shell = document.getElementById('admShell');
  if (!shell) return;
  if (window.innerWidth <= 900) {
    shell.classList.toggle('sidebar-open');
  } else {
    shell.classList.toggle('sidebar-collapsed');
  }
}

function switchChartPeriod(btn, period) {
  document.querySelectorAll('.adm-period-tab').forEach(el => el.classList.remove('active'));
  btn.classList.add('active');

  const redLine = document.getElementById('chartRedLine');
  const redArea = document.getElementById('chartRedArea');
  if (!redLine || !redArea) return;

  if (period === '30d') {
    const d = 'M36 66 C74 52, 88 58, 112 44 C148 38, 162 52, 188 49 C222 45, 236 58, 264 54 C296 50, 312 39, 340 41 C372 44, 390 36, 416 38 C446 42, 466 54, 492 50 C520 46, 544 38, 568 28';
    redLine.setAttribute('d', d);
    redArea.setAttribute('d', d + ' L568 150 L36 150 Z');
  } else if (period === '6m') {
    const d = 'M36 82 C74 72, 88 64, 112 58 C148 52, 162 48, 188 44 C222 42, 236 50, 264 46 C296 42, 312 38, 340 36 C372 34, 390 32, 416 30 C446 28, 466 36, 492 32 C520 28, 544 24, 568 20';
    redLine.setAttribute('d', d);
    redArea.setAttribute('d', d + ' L568 150 L36 150 Z');
  } else {
    const d = 'M36 74 C74 60, 88 50, 112 48 C148 45, 162 42, 188 43 C222 45, 236 68, 264 68 C296 68, 312 49, 340 47 C372 45, 390 43, 416 45 C446 48, 466 64, 492 63 C520 62, 544 45, 568 35';
    redLine.setAttribute('d', d);
    redArea.setAttribute('d', d + ' L568 150 L36 150 Z');
  }
}

function openNewShipmentModal() {
  document.getElementById('admNewShipmentModal').hidden = false;
}

function closeNewShipmentModal() {
  document.getElementById('admNewShipmentModal').hidden = true;
}

async function submitNewAdminShipment() {
  const trk = document.getElementById('nsTrackingNo').value.trim() || 'TRX123456790';
  const customer = document.getElementById('nsCustomer').value.trim() || 'Customer';
  const [toCode, toCountry] = (document.getElementById('nsToCountry').value || 'US|USA').split('|');
  const type = document.getElementById('nsType').value || 'Document';
  const weightRaw = document.getElementById('nsWeight').value.trim() || '1.5';
  const weightKg = parseFloat(weightRaw) || 1.5;
  const status = document.getElementById('nsStatus').value || 'Booked';

  const res = await postAdminAction({
    action: 'create_shipment',
    trackingNo: trk,
    customer,
    fromCode: 'IN',
    fromCountry: 'India',
    toCode,
    toCountry,
    type,
    weightKg,
    status
  });

  if (res && res.ok) {
    admState.store = res.store;
    renderCurrentRouteView();
    closeNewShipmentModal();
    showAdminToast(`Shipment ${res.shipment.trackingNo} created!`);
  }
}

/* ==========================================================================
   TOPBAR NOTIFICATIONS BELL & ADMIN USER PROFILE DROPDOWN
   ========================================================================== */
const admTopbarState = {
  profile: {
    name: 'Admin User',
    role: 'Super Admin',
    email: 'admin@trisys.in',
    phone: '+91 98200 11223'
  },
  notifications: [
    {
      id: 'ntf-1',
      title: 'New Shipment Booked — TRX123456789',
      desc: 'Arun DM booked Document courier from Mumbai to USA (1.0 kg, DHL Express).',
      time: '2 min ago',
      route: '/admin/shipments',
      unread: true
    },
    {
      id: 'ntf-2',
      title: 'Customs Uplift Confirmed — TRX123456788',
      desc: 'Medicine consignment for John Smith uplifted from Bengaluru (BLR) to UK.',
      time: '15 min ago',
      route: '/admin/shipments/in-transit',
      unread: true
    },
    {
      id: 'ntf-3',
      title: 'POD Signed & Delivered — TRX123456787',
      desc: 'Parcel delivered to Sarah Wilson in Sydney, Australia (Signed: S. WILSON).',
      time: '32 min ago',
      route: '/admin/shipments/delivered',
      unread: true
    },
    {
      id: 'ntf-4',
      title: 'Pending Sender KYC — TRX123456785',
      desc: 'Priya Nair (Kochi ➔ UAE) requires KYC verification prior to Aramex dispatch.',
      time: '2 hours ago',
      route: '/admin/shipments/pending',
      unread: true
    },
    {
      id: 'ntf-5',
      title: 'Carrier API Health Check — 98% On-Time',
      desc: 'DHL, FedEx, Aramex & UPS manifest webhooks verified and active.',
      time: '3 hours ago',
      route: '/admin/courier-partners',
      unread: true
    }
  ]
};

function renderAdminNotifications() {
  const listEl = document.getElementById('admNotifList');
  const badgeEl = document.getElementById('admNotifBadge');
  const pillEl = document.getElementById('admNotifCountPill');
  const markBtn = document.getElementById('admNotifMarkBtn');
  const unreadCount = admTopbarState.notifications.filter(n => n.unread).length;

  if (badgeEl) {
    badgeEl.textContent = String(unreadCount);
    badgeEl.hidden = Boolean(admTopbarState.bellViewed) || unreadCount === 0;
  }
  if (pillEl) {
    pillEl.textContent = unreadCount > 0 ? `${unreadCount} New` : 'All Viewed';
    pillEl.className = `adm-status-pill ${unreadCount > 0 ? 'pending' : 'delivered'}`;
  }
  if (markBtn) {
    markBtn.hidden = unreadCount === 0;
  }
  if (!listEl) return;

  listEl.innerHTML = admTopbarState.notifications.map(n => `
    <button type="button" class="adm-notif-item ${n.unread ? 'unread' : ''}" onclick="handleAdminNotificationClick('${n.id}', '${n.route}')">
      <span class="adm-notif-dot"></span>
      <div class="adm-notif-body">
        <div class="adm-notif-top">
          <span class="adm-notif-heading">${esc(n.title)}</span>
          <span class="adm-notif-time">${esc(n.time)}</span>
        </div>
        <div class="adm-notif-desc">${esc(n.desc)}</div>
      </div>
    </button>
  `).join('');
}

function toggleAdminNotifPopover() {
  const notifPop = document.getElementById('admNotifPopover');
  const notifBtn = document.getElementById('admNotifTrigger');
  const profPop = document.getElementById('admProfileDropdown');
  const profBtn = document.getElementById('admProfileTrigger');
  if (!notifPop || !notifBtn) return;

  // Close profile dropdown if open
  if (profPop) profPop.hidden = true;
  if (profBtn) {
    profBtn.classList.remove('is-open');
    profBtn.setAttribute('aria-expanded', 'false');
  }

  const willOpen = notifPop.hidden;
  notifPop.hidden = !willOpen;
  notifBtn.classList.toggle('is-open', willOpen);
  notifBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
  if (willOpen) {
    // Automatically remove the bell badge number once notifications are viewed
    admTopbarState.bellViewed = true;
    admTopbarState.notifications.forEach(n => { n.unread = false; });
    renderAdminNotifications();
  }
}

function handleAdminNotificationClick(notifId, targetRoute) {
  const item = admTopbarState.notifications.find(n => n.id === notifId);
  if (item) item.unread = false;
  admTopbarState.bellViewed = true;
  renderAdminNotifications();
  closeAdminTopbarPopovers();
  if (targetRoute) {
    navigateAdmin(targetRoute);
  }
}

function markAllAdminNotificationsRead() {
  admTopbarState.bellViewed = true;
  admTopbarState.notifications.forEach(n => { n.unread = false; });
  renderAdminNotifications();
  showAdminToast('All notifications marked as read');
}

function toggleAdminProfileDropdown() {
  const profPop = document.getElementById('admProfileDropdown');
  const profBtn = document.getElementById('admProfileTrigger');
  const notifPop = document.getElementById('admNotifPopover');
  const notifBtn = document.getElementById('admNotifTrigger');
  if (!profPop || !profBtn) return;

  // Close notifications popover if open
  if (notifPop) notifPop.hidden = true;
  if (notifBtn) {
    notifBtn.classList.remove('is-open');
    notifBtn.setAttribute('aria-expanded', 'false');
  }

  const willOpen = profPop.hidden;
  profPop.hidden = !willOpen;
  profBtn.classList.toggle('is-open', willOpen);
  profBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
}

function closeAdminTopbarPopovers() {
  const notifPop = document.getElementById('admNotifPopover');
  const notifBtn = document.getElementById('admNotifTrigger');
  const profPop = document.getElementById('admProfileDropdown');
  const profBtn = document.getElementById('admProfileTrigger');
  const searchDrop = document.getElementById('admGlobalSearchResults');

  if (searchDrop) searchDrop.hidden = true;
  if (notifPop) notifPop.hidden = true;
  if (notifBtn) {
    notifBtn.classList.remove('is-open');
    notifBtn.setAttribute('aria-expanded', 'false');
  }
  if (profPop) profPop.hidden = true;
  if (profBtn) {
    profBtn.classList.remove('is-open');
    profBtn.setAttribute('aria-expanded', 'false');
  }
}

function syncAdminProfileUI() {
  const p = admTopbarState.profile;
  const topName = document.getElementById('admTopbarProfileName');
  const topRole = document.getElementById('admTopbarProfileRole');
  const dropName = document.getElementById('admDropdownName');
  const dropEmail = document.getElementById('admDropdownEmail');
  const dropRole = document.getElementById('admDropdownRoleBadge');

  if (topName) topName.textContent = p.name;
  if (topRole) topRole.textContent = p.role;
  if (dropName) dropName.textContent = p.name;
  if (dropEmail) dropEmail.textContent = p.email;
  if (dropRole) dropRole.textContent = p.role;
}

function openEditAdminProfileModal() {
  closeAdminTopbarPopovers();
  const p = admTopbarState.profile;
  const nameInp = document.getElementById('apName');
  const roleInp = document.getElementById('apRole');
  const emailInp = document.getElementById('apEmail');
  const phoneInp = document.getElementById('apPhone');
  if (nameInp) nameInp.value = p.name;
  if (roleInp) roleInp.value = p.role;
  if (emailInp) emailInp.value = p.email;
  if (phoneInp) phoneInp.value = p.phone;

  const modal = document.getElementById('admEditProfileModal');
  if (modal) modal.hidden = false;
}

function closeEditAdminProfileModal() {
  const modal = document.getElementById('admEditProfileModal');
  if (modal) modal.hidden = true;
}

async function saveAdminProfileChanges() {
  admTopbarState.profile.name = document.getElementById('apName')?.value.trim() || 'Admin User';
  admTopbarState.profile.role = document.getElementById('apRole')?.value || 'Super Admin';
  admTopbarState.profile.email = document.getElementById('apEmail')?.value.trim() || 'admin@trisys.in';
  admTopbarState.profile.phone = document.getElementById('apPhone')?.value.trim() || '+91 98200 11223';

  syncAdminProfileUI();
  closeEditAdminProfileModal();
  showAdminToast(`Updated profile for ${admTopbarState.profile.name} (${admTopbarState.profile.role})`);
}

function openAdminLockModal() {
  closeAdminTopbarPopovers();
  const modal = document.getElementById('admLockModal');
  if (modal) modal.hidden = false;
}

function unlockAdminSession() {
  const modal = document.getElementById('admLockModal');
  if (modal) modal.hidden = true;
  showAdminToast(`Welcome back, ${admTopbarState.profile.name}! Session unlocked.`);
}

document.addEventListener('DOMContentLoaded', () => {
  populateStaticFlags();
  renderAdminNotifications();
  syncAdminProfileUI();

  // Close topbar popovers when clicking anywhere outside
  document.addEventListener('click', () => {
    closeAdminTopbarPopovers();
  });

  // Wire sidebar navigation links & expandable triggers
  document.querySelectorAll('.adm-nav-link, .adm-submenu-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const targetRoute = link.getAttribute('data-route') || link.getAttribute('href');
      navigateAdmin(targetRoute, true);
    });
  });

  document.querySelectorAll('.adm-nav-trigger').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      const group = btn.getAttribute('data-group');
      toggleSubmenu(group);
    });
  });

  window.addEventListener('popstate', () => {
    navigateAdmin(window.location.pathname, false);
  });

  // Resolve initial URL path on load / refresh
  navigateAdmin(window.location.pathname, false);
  fetchAdminBackendData();
});
