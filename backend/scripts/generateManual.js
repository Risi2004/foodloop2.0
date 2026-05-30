const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.join(__dirname, '..', '..', 'FoodLoop_2.0_User_Manual.pdf');

console.log('[generateManual] Initializing PDF generation...');

const doc = new PDFDocument({
  margin: 50,
  bufferPages: true,
});

const stream = fs.createWriteStream(OUTPUT_PATH);
doc.pipe(stream);

// Define Styling Palette (HSL Tailored forest green & earthy colors matching FoodLoop)
const colors = {
  primaryDark: '#1F4E36',   // Forest Green
  primaryLight: '#73A13F',  // Fresh Green
  neutralBg: '#F6F8F7',     // Light Cream
  textDark: '#2E4E3F',      // Deep charcoal/moss
  textMuted: '#5C6F64',     // Muted green-gray
  highlight: '#D35400',     // Earthy Orange
  white: '#FFFFFF',
  lineColor: '#E2EBE6',
};

// ==========================================
// 1. COVER PAGE
// ==========================================
console.log('[generateManual] Adding Cover Page...');

// Vertical colored bar on the left margin
doc.rect(0, 0, 30, doc.page.height)
   .fill(colors.primaryDark);

// Top accent line
doc.rect(30, 0, doc.page.width - 30, 15)
   .fill(colors.primaryLight);

// Header / Logo area
doc.fillColor(colors.primaryDark)
   .fontSize(16)
   .font('Helvetica-Bold')
   .text('FOODLOOP 2.0', 70, 120);

doc.fillColor(colors.textMuted)
   .fontSize(10)
   .font('Helvetica')
   .text('ZERO WASTE. INFINITE IMPACT.', 70, 142);

// Title
doc.fillColor(colors.primaryDark)
   .fontSize(38)
   .font('Helvetica-Bold')
   .text('Complete Application', 70, 220)
   .text('User Manual', 70, 265);

// Underline
doc.rect(70, 325, 220, 6)
   .fill(colors.primaryLight);

// Subtitle
doc.fillColor(colors.textDark)
   .fontSize(13)
   .font('Helvetica-Bold')
   .text('A Comprehensive Operations, Logistics, & Audit Guide', 70, 350);

doc.fillColor(colors.textMuted)
   .fontSize(11)
   .font('Helvetica-Oblique')
   .text('Instructions for Suppliers, Receivers, Customers, Drivers, & Administrators', 70, 370);

// Metadata Block at the bottom
const metadataY = 550;
doc.rect(70, metadataY, doc.page.width - 140, 100)
   .fill(colors.neutralBg);

doc.fillColor(colors.primaryDark)
   .fontSize(11)
   .font('Helvetica-Bold')
   .text('Document Metadata', 90, metadataY + 15);

doc.fillColor(colors.textDark)
   .fontSize(9)
   .font('Helvetica')
   .text('Author: FoodLoop Development Team', 90, metadataY + 38)
   .text('Version: v2.0.1 (Stable Release)', 90, metadataY + 53)
   .text('Date: May 30, 2026', 90, metadataY + 68)
   .text('System Compatibility: Web, Mobile, Desktop WebSockets', 300, metadataY + 38)
   .text('Target Environment: Local Node.js / MongoDB', 300, metadataY + 53)
   .text('Document Class: Restricted / Public Operations Manual', 300, metadataY + 68);

doc.addPage();

// ==========================================
// 2. HELPERS FOR INTERIOR PAGES
// ==========================================
function writeHeader(title) {
  doc.fillColor(colors.primaryDark)
     .fontSize(20)
     .font('Helvetica-Bold')
     .text(title);
  
  // Underline bar
  doc.rect(doc.x, doc.y + 4, 80, 3)
     .fill(colors.primaryLight);
  
  doc.moveDown(2);
}

function writeSubHeader(title) {
  doc.fillColor(colors.primaryDark)
     .fontSize(14)
     .font('Helvetica-Bold')
     .text(title);
  doc.moveDown(0.8);
}

function writeParagraph(text) {
  doc.fillColor(colors.textDark)
     .fontSize(10)
     .font('Helvetica')
     .text(text, { align: 'justify', lineGap: 3 });
  doc.moveDown(1.2);
}

function writeBullet(boldText, description) {
  doc.fillColor(colors.primaryDark)
     .font('Helvetica-Bold')
     .text('  • ' + boldText + ': ', { font: 'Helvetica-Bold', continued: true })
     .fillColor(colors.textDark)
     .font('Helvetica')
     .text(description, { lineGap: 2 });
  doc.moveDown(0.6);
}

function writeNoteBox(title, body) {
  const currentY = doc.y;
  doc.rect(doc.x, currentY, doc.page.width - 100, 65)
     .fill(colors.neutralBg);
  
  // Accent vertical line on the left side of the box
  doc.rect(doc.x, currentY, 4, 65)
     .fill(colors.primaryLight);

  doc.fillColor(colors.primaryDark)
     .fontSize(9.5)
     .font('Helvetica-Bold')
     .text('★ ' + title.toUpperCase(), doc.x + 15, currentY + 12);

  doc.fillColor(colors.textDark)
     .fontSize(8.5)
     .font('Helvetica')
     .text(body, doc.x + 15, currentY + 28, { width: doc.page.width - 130, lineGap: 1.5 });

  doc.y = currentY + 75; // reset cursor below the box
}

// ==========================================
// 3. INTERIOR CONTENT
// ==========================================

// --- PAGE 2: INTRODUCTION & KEY ARCHITECTURE ---
console.log('[generateManual] Adding Page 2...');
writeHeader('1. Executive Introduction & Concepts');
writeParagraph('FoodLoop 2.0 is an advanced, next-generation surplus food marketplace and donation management platform. By connecting commercial suppliers, courier logistics drivers, non-profit receivers, and marketplace customers in a real-time, event-driven ecosystem, FoodLoop is pioneering technology-driven circular food economies. The software provides specialized role workflows, fully integrated mapping logistics, smart AI pricing suggestions, and low-income monthly food security discounts.');

writeSubHeader('Core Value Propositions & Real-Time Sync');
writeParagraph('At the core of the FoodLoop framework is its high-performance, real-time WebSocket architecture. When commercial listings are claimed or purchased, immediate socket merges propagate changes in state through backend layers to driver routing and supplier dispatch panels. This guarantees zero latency and resolves standard logistics coordination problems.');

writeNoteBox('Architectural Principle', 'All actions taken by receiving roles (NGO claim / Customer checkouts) automatically instantiate transactional claim documents. These claimed records emit instant updates so that couriers are notified and dispatch flows transition seamlessly without manual dashboard refreshes.');

// --- PAGE 3: USER ROLES & SIGNUP ---
doc.addPage();
console.log('[generateManual] Adding Page 3...');
writeHeader('2. Authentication, Roles, & Dashboard Access');
writeParagraph('Every user profile on FoodLoop 2.0 operates within a secure, custom-tailored environment enforced by JSON Web Token (JWT) verification. Upon registering, users are placed into one of five specialized categories. Access and route protection layers filter dashboard actions according to these definitions.');

writeSubHeader('Ecosystem Roles & Capabilities');
writeBullet('Commercial Supplier', 'Restaurants, wedding halls, individual startups, and supermarkets who list surplus food for donation or marketplace selling.');
writeBullet('NGO Receiver', 'Food banks, charities, and community centers who claim free donation listings to distribute to food-insecure families.');
writeBullet('Low-Income Customer', 'Classified individuals eligible for monthly food security discounts (20% off fresh products) in the marketplace.');
writeBullet('Logistics Courier (Driver)', 'Contracted transport drivers who select nearby pickups, calculate optimal routing waypoints, and execute handovers.');
writeBullet('System Administrator', 'Platform controllers who monitor financial payout flows, verify database activities, toggle maintenance overrides, and audit logs.');

writeParagraph('Users can register through the Unified Signup Portal, choosing their role type and providing verified coordinates via the interactive map interface to ensure accurate delivery and pickup distance calculations.');

// --- PAGE 4: SUPPLIER GUIDE ---
doc.addPage();
console.log('[generateManual] Adding Page 4...');
writeHeader('3. Commercial Supplier Guide');
writeParagraph('Suppliers can publish surplus food using two transactional paths: free listing (Donation) and paid listing (Sell) on the marketplace. By utilizing AI-assisted analysis, the platform recommends optimal pricing and categories based on product descriptions.');

writeSubHeader('The Four-Tier Operational Pipeline');
writeParagraph('Once a listing is created, its lifecycle is managed in real-time on the Supplier Dashboard, split into four visual streams:');
writeBullet('Active Listings', 'Current listings available for claims by receivers or cart checkouts by customers.');
writeBullet('Looking for Driver', 'Listings that have been claimed or purchased. They are waiting for a logistics driver to accept the pickup request.');
writeBullet('In Transit', 'Couriers have accepted the delivery. The dashboard displays the assigned driver details, current status, and live routing.');
writeBullet('Completed History', 'A complete log of previous successful pickups and handovers for auditing.');

writeSubHeader('ESG Insights & Carbon Metrics');
writeParagraph('FoodLoop automatically evaluates environmental impact for each listing completed. The dashboard features dedicated ESG/CSR panels tracking cumulative carbon emissions saved, total meals distributed, and landfill diversion scores.');

// --- PAGE 5: NGO / RECEIVER GUIDE ---
doc.addPage();
console.log('[generateManual] Adding Page 5...');
writeHeader('4. NGO & Receiver Operations');
writeParagraph('Verified charity and NGO receivers have exclusive access to free surplus donation listings. The Receiver Dashboard is designed to streamline pickup logistics and maximize distributing efficiency.');

writeSubHeader('Active Claim Workflows');
writeBullet('Find Food Map', 'An interactive geographical search map showing available donations nearby, complete with radius filters, categories, and expiry indicators.');
writeBullet('Looking for Driver', 'Once an NGO claims a donation, it appears in this section while the platform dispatches nearby courier alerts.');
writeBullet('In Transit (Live Map)', 'When a driver claims the delivery, the receiver card shifts immediately to In Transit. It shows the courier name, contact info, and a "View Map" button that loads real-time GPS locations and waypoints.');
writeBullet('Completed History', 'Completed handovers allow receivers to submit feedback and generate a custom digital receipt form for compliance.');

writeNoteBox('Receiver Delivery Subsidies', 'To support NGO operations, the platform automatically evaluates and applies delivery fee discounts and monthly subsidies, funding critical logistics transport costs for verified charity distributors.');

// --- PAGE 6: CUSTOMER & FRESH MARKETPLACE GUIDE ---
doc.addPage();
console.log('[generateManual] Adding Page 6...');
writeHeader('5. Customer & Fresh Marketplace Guide');
writeParagraph('Customers can purchase fresh produce and meal items directly from suppliers via the Fresh Marketplace. The marketplace is equipped with categories, instant search bars, and an interactive shopping cart.');

writeSubHeader('Low-Income Monthly Food Security Discount');
writeParagraph('To support low-income families, the platform features a Monthly Discount system. Registered and classified low-income individuals receive a 20% discount on up to 20 products every calendar month:');
writeBullet('Eligibility Verification', 'Automatic validation checks are run against the user income level upon logging in.');
writeBullet('Applying the Discount', 'Inside the Customer Cart, users can selectively check individual items to apply the 20% monthly food security discount.');
writeBullet('Real-Time Limits', 'The system tracks the remaining units dynamically and disables the discount checkbox if the monthly allocation of 20 items is exceeded.');

writeSubHeader('Order Placement & Live Tracking');
writeParagraph('Customers can select between mock Card verification and Cash on Delivery (COD). Upon completing checkout, the Order Tracking page displays active order progress. Once a driver accepts the pickup, a "View Map / Track Order" button appears on the customer card, loading the driver\'s live GPS coordinates, vehicle details, and active navigation routes.');

// --- PAGE 7: DRIVER & COURIER LOGISTICS GUIDE ---
doc.addPage();
console.log('[generateManual] Adding Page 7...');
writeHeader('6. Logistics Courier (Driver) Guide');
writeParagraph('Logistics couriers are critical to the FoodLoop loop, driving deliveries between donors and receivers. Drivers are equipped with robust navigation, vehicle capacity rules, and earning summaries.');

writeSubHeader('Pickup Availability & Vehicle Tier Restrictions');
writeParagraph('To prevent delivery failures, order capacity is calculated based on vehicle tier compatibility:');
writeBullet('Vehicle Tiers', 'Bicycle, Scooter, Car, and Van categories are mapped to dynamic weight capacity guidelines.');
writeBullet('Load Compatibility', 'Large orders are filtered out if they exceed the capacity thresholds of the courier\'s vehicle.');
writeBullet('Radius Matching', 'Couriers are shown active pickup requests within their max geographical radius.');

writeSubHeader('Active Deliveries, Map Waypoints, & Demo Mode');
writeParagraph('When a courier accepts an order, they enter the Active Delivery screen. This features live waypoint navigation to the pickup and drop-off addresses. Drivers can launch "Demo Mode" to simulate real-time transit updates. A one-tap "Confirm Pickup" and "Confirm Delivery" system sends instant socket updates, transitioning statuses on receiver and supplier dashboards.');

// --- PAGE 8: SYSTEM ADMINISTRATOR GUIDE ---
doc.addPage();
console.log('[generateManual] Adding Page 8...');
writeHeader('7. System Administrator Guide');
writeParagraph('System administrators are responsible for supervising the platform, auditing database changes, managing configurations, and reviewing financial payout requests.');

writeSubHeader('Payout Approvals & Audit Reviews');
writeParagraph('When suppliers or drivers request balance withdrawals, they submit a payout request. Administrators review these requests inside the Payout Requests panel:');
writeBullet('Verification Drawer', 'Clicking "Review" opens a detailed payout review drawer listing linked transactions.');
writeBullet('Transaction Auditing', 'Administrators audit the gross earnings, transaction fees, and net payouts for each transaction.');
writeBullet('Approve/Reject actions', 'Admins can verify and approve the withdrawal (notifying the user) or reject it with internal notes.');
writeBullet('Mark Paid', 'Approved transactions can be marked as fully completed once bank transfers are finalized.');

writeSubHeader('Platform Maintenance & Overrides');
writeParagraph('Administrators can toggle system-wide maintenance mode to restrict new checkout orders during server updates. They can also browse user monitoring boards to manage system privileges.');

// ==========================================
// 4. DYNAMIC PAGE NUMBERS, HEADERS, & FOOTERS
// ==========================================
console.log('[generateManual] Finalizing headers, footers, and page numbers...');

const range = doc.bufferedPageRange();
for (let i = range.start; i < range.start + range.count; i++) {
  doc.switchToPage(i);
  
  if (i === 0) {
    // Skip cover page header/footer
    continue;
  }
  
  // Header
  doc.fillColor(colors.primaryDark)
     .fontSize(8)
     .font('Helvetica-Bold')
     .text('FOODLOOP 2.0 — COMPLETE USER MANUAL', 50, 25);
  
  doc.moveTo(50, 36)
     .lineTo(doc.page.width - 50, 36)
     .strokeColor(colors.lineColor)
     .lineWidth(1)
     .stroke();
  
  // Footer
  doc.moveTo(50, doc.page.height - 40)
     .lineTo(doc.page.width - 50, doc.page.height - 40)
     .strokeColor(colors.lineColor)
     .lineWidth(1)
     .stroke();

  doc.fillColor(colors.textMuted)
     .fontSize(8)
     .font('Helvetica')
     .text('FoodLoop © 2026. Zero Waste, Infinite Impact.', 50, doc.page.height - 30);
  
  const pageStr = `Page ${i + 1} of ${range.count}`;
  doc.text(pageStr, doc.page.width - 120, doc.page.height - 30, { align: 'right' });
}

doc.end();

console.log(`[generateManual] Complete! PDF successfully generated at: ${OUTPUT_PATH}`);
