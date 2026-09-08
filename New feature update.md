# 🚀 Sameer Library Web & Mobile App - New Feature Update Plan
> **Document Version:** 1.1.0 (Updated with 0-Cost WhatsApp Due Integration)  
> **Date:** September 2026  
> **Target Systems:** Backend (Next.js 16 + Prisma + PostgreSQL) & Mobile App (React Native Expo)

---

## 📑 Index / Table of Contents
1. [Overview & Scope (Ye Update Kya-Kya Karega)](#1-overview--scope)
2. [Aapko Bahar Se Kya-Kya Karna Padega (External Credentials & Setup)](#2-aapko-bahar-se-kya-kya-karna-padega-external-setup)
3. [Database Schema Updates (Prisma Models)](#3-database-schema-updates-prisma)
4. [Feature 1: Due & Pending Payment Tracking + Approve Without Payment](#4-feature-1-due--pending-payment-tracking)
5. [Feature 2: Monthly Recurring Seat Renewal (No Re-admission Jhanjhat)](#5-feature-2-monthly-recurring-seat-renewal)
6. [Feature 3: Admin Partial/Cash Payment Entry (Student Ledger)](#6-feature-3-admin-partialcash-payment-entry)
7. [Feature 4: Student UPI / Online Payment Integration](#7-feature-4-student-upi--online-payment-integration)
8. [Feature 5: Library Pass & Barcode / QR Code Generator](#8-feature-5-library-pass--barcode--qr-generator)
9. [Feature 6: Geofenced QR Attendance Security (Live Location Radius)](#9-feature-6-geofenced-qr-attendance-security)
10. [Feature 7: 0-Cost WhatsApp Due Payment & Receipt Sending (High-Level Plan)](#10-feature-7-0-cost-whatsapp-due-payment--receipt-sending)
11. [Step-Wise Implementation Roadmap (Phases 1 to 7)](#11-step-wise-implementation-roadmap)
12. [Testing & Verification Checklist](#12-testing--verification-checklist)

---

## 1. Overview & Scope

Aapki requirement ke mutabik Sameer Library system me **7 critical modern features** add kiye ja rahe hain:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SAMEER LIBRARY CORE SYSTEM                      │
├──────────────────────────────────┬─────────────────────────────────────┤
│      BILLING & ACCOUNTS          │         SECURITY & ATTENDANCE       │
│                                  │                                     │
│  1. Approve Without Payment      │  5. Digital Library Pass (ID Card)  │
│     (Pay Later / Due System)     │     with Unique QR & Barcode        │
│                                  │                                     │
│  2. Monthly Auto-Renewal Engine  │  6. Geofenced Smart Attendance      │
│     (Seat booked remains booked, │     (Admin sets Branch GPS;         │
│     next month due auto-created) │     Attendance marks ONLY inside    │
│                                  │     library 50-100m radius)         │
│  3. Admin Partial Payment Entry  │                                     │
│     (Cash / Offline installments)│  7. 0-Cost WhatsApp Integration     │
│                                  │     (One-Click Due Bill & Receipt   │
│  4. Student Online UPI Payment   │     send directly to Student Phone  │
│     (Direct GPay / PhonePe/UPI)  │     without any monthly API fees)   │
└──────────────────────────────────┴─────────────────────────────────────┘
```

---

## 2. Aapko Bahar Se Kya-Kya Karna Padega (External Setup)

Ye wo cheezein hain jo code ke alawa aapko bahar third-party portals se create ya collect karni hongi:

### 🔑 1. Razorpay Payment Gateway Credentials (Online UPI ke liye)
* **Kyu chahiye:** Student mobile app ya web se GPay, PhonePe, Paytm, ya Card se payment karega to direct aapke bank account me paisa aayega.
* **Aapko kya karna hai:**
  1. [Razorpay.com](https://razorpay.com) par jao aur apna account banao (Individual ya Business).
  2. Apna Bank Account details verify karwao (KYC complete karo).
  3. Dashboard me ja kar **Settings -> API Keys** me jao:
     - `RAZORPAY_KEY_ID` generate karo.
     - `RAZORPAY_KEY_SECRET` generate karo.
  4. Webhook setup karo:
     - Webhook URL: `https://your-domain.com/api/payments/webhook`
     - Events: `payment.captured`, `payment.failed`, `order.paid`
     - Webhook Secret note karo: `RAZORPAY_WEBHOOK_SECRET`

---

### 📍 2. Library Branch Ki Live GPS Location (Geofencing ke liye)
* **Kyu chahiye:** Taki student ghar baithe ya raste se QR code scan karke fake attendance na laga sake.
* **Aapko kya karna hai:**
  1. Library ki actual building me khade hokar Google Maps kholein.
  2. Apni current location par blue dot par tap karein ya pin drop karein.
  3. Waha se **Latitude** aur **Longitude** copy karein:
     - Example: `Latitude: 25.5941`, `Longitude: 85.1375`
  4. Ek Radius decide karein (e.g. `50 meters` ya `100 meters`).
  5. Hum Admin Dashboard me **"Branch Settings"** ka button bana denge jisme aap button click karke ek click me *"Set Current GPS as Library Location"* kar sakenge.

---

### ⏰ 3. Cron Job / Scheduled Task (Monthly Auto-Due Generation ke liye)
* **Kyu chahiye:** Roz raat ko 12:00 baje ek background script chalegi jo check karegi ki kis student ka 1 mahina pura ho gaya hai, aur bina seat hataye uska status *"Due Payment"* me daal degi.
* **Aapko kya karna hai:**
  - **Option A (Agar aap Oracle Cloud / VPS / Server use kar rahe hain):**
    - Linux `crontab -e` me ek line add karni hogi:
      ```bash
      0 0 * * * curl -X POST https://your-domain.com/api/cron/billing-cycle -H "Authorization: Bearer YOUR_CRON_SECRET"
      ```
  - **Option B (Free Cloud Scheduler - cron-job.org / EasyCron):**
    - [cron-job.org](https://cron-job.org) par free account bana kar ek job set karni hogi jo roz raat 12 baje aapke backend API endpoint ko hit kare.

---

### 📱 4. WhatsApp Setup: ZERO COST (₹0 Kharcha!)
* **Aapko bahar se kya lena hai?** **KUCH BHI NAHI! (Zero 3rd party subscription).**
* Twilio ya Meta Cloud API har message ka 50 paise se 1 rupya charge karte hain aur monthly billing mangte hain.
* Hum **Direct Deep-Link & WhatsApp Intent Protocol (`wa.me`)** use karenge.
* Admin ke phone ya laptop me jo WhatsApp ya WhatsApp Web chalta hai, ye system uske zariye seedha student ke number par professionally formatted Due Invoice + UPI link bhej dega **100% Free Forever**!

---

## 3. Database Schema Updates (Prisma)

Aapke `backend/prisma/schema.prisma` me ye new fields aur models add honge:

```prisma
// 1. Branch me Geofencing Data
model Branch {
  id                    String   @id @default(cuid())
  name                  String
  code                  String   @unique
  address               String
  city                  String
  photo                 String?  @db.Text
  isActive              Boolean  @default(true)
  
  // NAYE FIELDS FOR GEOFENCING:
  latitude              Float?   // e.g. 25.594095
  longitude             Float?   // e.g. 85.137566
  geofenceRadiusMeters  Int      @default(75) // 75 meters radius allowed
  
  // Relations
  ownerId               String
  owner                 User     @relation("BranchOwner", fields: [ownerId], references: [id])
  rooms                 Room[]
  bookings              Booking[]
  attendances           Attendance[]
  devices               Device[]
  libraryPasses         LibraryPass[]
}

// 2. Booking Model me Subscription & Due Tracking
model Booking {
  id                    String   @id @default(cuid())
  startDate             DateTime
  endDate               DateTime
  planType              String   // HOURLY, DAILY, WEEKLY, MONTHLY
  status                String   @default("PENDING") // PENDING, APPROVED, REJECTED, CANCELLED, COMPLETED
  
  // NAYE FIELDS FOR RECURRING BILLING & DUES:
  totalFee              Float    @default(0) // Total fee for cycle (e.g. 1000)
  paidAmount            Float    @default(0) // Kitna payment aa chuka hai
  dueAmount             Float    @default(0) // Kitna baki hai (totalFee - paidAmount)
  paymentStatus         String   @default("PENDING") // PAID, DUE, PARTIAL, OVERDUE
  autoRenew             Boolean  @default(true) // Har mahine seat continue rahegi
  billingCycleMonth     Int      @default(1) // Cycle count (1st month, 2nd month, etc.)
  lastBilledAt          DateTime @default(now())
  nextDueDate           DateTime?
  gracePeriodEndsAt     DateTime?
  
  // WhatsApp reminder tracking
  lastReminderSentAt    DateTime?
  reminderCount         Int      @default(0)
  
  notes                 String?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  studentId             String
  student               User     @relation(fields: [studentId], references: [id])
  branchId              String
  branch                Branch   @relation(fields: [branchId], references: [id])
  roomId                String
  room                  Room     @relation(fields: [roomId], references: [id])
  seatId                String
  seat                  Seat     @relation(fields: [seatId], references: [id])
  approvedById          String?
  approvedBy            User?    @relation("ApprovedBy", fields: [approvedById], references: [id])
  
  // Relations
  payments              Payment[]
  libraryPass           LibraryPass?
}

// 3. Payment Model Update (Installments & Partial Support)
model Payment {
  id                    String   @id @default(cuid())
  amount                Float
  currency              String   @default("INR")
  status                String   @default("SUCCESS") // PENDING, SUCCESS, FAILED
  paymentMode           String   // ONLINE_UPI, OFFLINE_CASH, ADMIN_ADJUSTMENT
  provider              String   @default("cash") // razorpay, cash, counter_upi
  providerPaymentId     String?  // UPI Ref No / Razorpay payment ID
  providerOrderId       String?
  remarks               String?  // e.g. "Monthly fee installment paid ₹500 in cash"
  collectedById         String?  // Admin jisne cash receive kiya
  receiptNumber         String   @unique // SL-REC-2026-0001
  createdAt             DateTime @default(now())

  bookingId             String
  booking               Booking  @relation(fields: [bookingId], references: [id])
  studentId             String
  student               User     @relation(fields: [studentId], references: [id])
}

// 4. Library Pass (Digital ID Card + QR/Barcode)
model LibraryPass {
  id                    String   @id @default(cuid())
  passNumber            String   @unique // e.g. "SL-PASS-8842"
  qrToken               String   @unique // Encrypted JWT or Secure Hash
  barcodeData           String   @unique // Barcode number (e.g. "890123456789")
  status                String   @default("ACTIVE") // ACTIVE, SUSPENDED, EXPIRED
  issuedAt              DateTime @default(now())
  validUntil            DateTime
  
  studentId             String   @unique
  student               User     @relation(fields: [studentId], references: [id])
  bookingId             String   @unique
  booking               Booking  @relation(fields: [bookingId], references: [id])
  branchId              String
  branch                Branch   @relation(fields: [branchId], references: [id])
}

// 5. Attendance Model Update (Location Verification)
model Attendance {
  id                    String    @id @default(cuid())
  checkInAt             DateTime
  checkOutAt            DateTime?
  source                String    // QR_CODE_MOBILE, BARCODE_SCANNER, MANUAL_ADMIN
  
  // GEOFENCING LOGS:
  latitude              Float?    // Student ki scan karte waqt latitude
  longitude             Float?    // Student ki scan karte waqt longitude
  distanceMeters        Float?    // Library center se kitni door tha (e.g. 18.5 meters)
  isVerifiedLocation    Boolean   @default(true)
  
  createdAt             DateTime  @default(now())

  studentId             String
  student               User      @relation(fields: [studentId], references: [id])
  branchId              String
  branch                Branch    @relation(fields: [branchId], references: [id])
  roomId                String?
  room                  Room?     @relation(fields: [roomId], references: [id])
}
```

---

## 4. Feature 1: Due & Pending Payment Tracking

### 🎯 Objective:
Admin dashboard par clear transparency honi chahiye:
1. **Total Fees Due:** Kitne bachho ka paisa baki hai.
2. **Total Overdue:** Kitne bachho ki last date nikal chuki hai aur abhi tak paisa nahi aaya.
3. **Approve Without Payment Option:** Student ki seat book confirm ho jaye, par payment `DUE` dikhe.

### 🖥️ Admin UI Changes:
1. **Pending Approvals Popup / Modal:**
   - Jab admin "Approve" button par click karega, to 2 choices aayengi:
     - 🟢 **Option A: Approve & Mark as Paid**
       - Input field: Amount (Default = Monthly Fee, e.g. ₹1000)
       - Payment Mode: `Cash / Counter` ya `Online UPI`
       - Status: `PAID` (Due = 0)
     - 🟡 **Option B: Approve Without Payment (Pay Later / Due)**
       - Student admission turant confirm ho jayega, seat lock ho jayegi.
       - Booking Status: `APPROVED`
       - Payment Status: `DUE` (Due Amount = ₹1000, Paid = ₹0)
       - Note: "Student promises to pay in 3 days / by month-end".

2. **Admin Dashboard Stats Cards:**
   ```
   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
   │ Total Collected  │  │  Active Dues     │  │ Overdue Defaulter│  │ Fully Paid Ratio │
   │   ₹ 1,45,000     │  │   ₹ 28,500       │  │   12 Students    │  │     84% Paid     │
   │  (Current Month) │  │  (22 Students)   │  │  (Critical Alert)│  │ (Healthy Status) │
   └──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────┘
   ```

3. **Dedicated "Fees & Dues Management" Table:**
   - Tabs: `All (150)` | `Paid (116)` | `Pending/Due (22)` | `Overdue (12)`
   - Columns:
     - Student Name & Photo
     - Seat Number (e.g., A-14)
     - Plan / Shift (Full Day / 8 AM - 2 PM)
     - Total Fee
     - Amount Paid
     - **Balance Due** (Highlighted in Orange/Red badge)
     - Due Date
     - Quick Actions: **"Collect Cash"** | **"📲 Send WhatsApp Bill"**

---

## 5. Feature 2: Monthly Recurring Seat Renewal

### 🎯 Problem Solved:
Student ek baar admission le liya to har mahine use naye sire se seat book ya form nahi bharna padega. Uski seat uske pass reserved rahegi.

### 🔄 Auto-Cycle Workflow (Visual Lifecycle):

```
       Month 1 Start
      [Seat Booked]
            │
            ▼
    [Days 1 to 28] ──── Status: ACTIVE / PAID
            │
            ▼
        [Day 29-30]
 (1 Month Completed)
            │
            ▼
   ┌────────────────────────────────────────────────────────┐
   │                 NIGHTLY AUTO-BILLING CRON              │
   │ 1. Seat remains reserved (occupied by same student).   │
   │ 2. Next Month Cycle starts (e.g. Month 2).            │
   │ 3. New Invoice generated (₹1000).                      │
   │ 4. Status updates to: "RENEWAL_DUE" (Grace: 3 days).  │
   └────────────────────────┬───────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
    [Student / Admin Pays]        [Payment Not Received]
    Status: ACTIVE / PAID         After 3 Days: OVERDUE
    Receipt generated             Admin Alert: "Vacate Seat or Follow-up"
```

### ⚙️ Backend Logic:
1. **Daily Cron API (`/api/cron/billing-cycle`):**
   - Database me wo saari bookings check karega jinki `endDate <= Today` aur `autoRenew == true`.
   - Inke liye:
     - `startDate` = Current `endDate`
     - `endDate` = Current `endDate` + 30 Days
     - `billingCycleMonth` = `billingCycleMonth + 1`
     - `totalFee` = Plan Base Price (e.g. 1000)
     - `dueAmount` = Previous Unpaid Due + New Month Fee
     - `paymentStatus` = `"DUE"`
     - `gracePeriodEndsAt` = Today + 3 Days
2. **Vacate / Drop Seat Feature (Agar student chhod raha ho):**
   - Admin student row me ja kar **"Vacate Seat / End Membership"** click karega.
   - Seat instant `AVAILABLE` ho jayegi, aur booking history me archive ho jayegi.

---

## 6. Feature 3: Admin Partial/Cash Payment Entry

### 🎯 Objective:
Admin mahine ke beech me ya jab bhi student offline cash de, to manual payment entry kar sake. Partial installment (e.g. ₹500 abhi diya, ₹500 baki) ka pura record rahe.

### 🛠️ Functionality:
1. **Admin "Collect Payment" Modal:**
   - Admin kisi bhi student ke samne **"Collect Payment"** par click karega:
     - **Total Due Dikhega:** e.g. ₹1,000
     - **Amount Received Input:** e.g. Admin ne type kiya ₹400
     - **Payment Mode:** Cash / Counter Scanner / Bank Transfer
     - **Remarks / Notes:** "Student paid half amount, remaining by 15th"
     - **"Save & Generate Receipt"** button
2. **Instant Calculation:**
   - Database me new `Payment` record create hoga: `amount = 400`
   - Booking table me update hoga:
     - `paidAmount = paidAmount + 400`
     - `dueAmount = totalFee - paidAmount` (e.g. ₹600 baki)
     - If `dueAmount == 0` -> `paymentStatus = "PAID"`
     - If `dueAmount > 0` -> `paymentStatus = "PARTIAL"`
3. **Student Account Ledger & Printable Receipt:**
   - Har transaction ka timestamp, receipt number (`SL-REC-XXXX`), aur receiver admin ka naam save hoga.
   - Student app me bhi instantly dikhega: *"Received ₹400 in Cash on 12 Sep. Remaining Balance: ₹600"*.

---

## 7. Feature 4: Student UPI / Online Payment Integration

### 🎯 Objective:
Student apne mobile app se direct single click me apna pending due payment GPay, PhonePe, Paytm, ya kisi bhi UPI app se bhar sake.

### 📱 Student App Flow:
```
  [Student Dashboard]
          │
          ▼
   Banner Alert:
 "Due Payment: ₹600 (Due Date: 15 Sep)"
   [PAY NOW WITH UPI] ── (Button Click)
          │
          ▼
 [Payment Option Sheet]
 ├─ Pay Full Due (₹600)
 └─ Pay Custom Amount (e.g. ₹300)
          │
          ▼
 [Razorpay UPI Gateway Opens]
 (GPay / PhonePe / Paytm / UPI ID / QR)
          │
          ▼
 [Student Confirms UPI PIN]
          │
          ▼
 [Webhook Verifies Success]
 ├─ Database updates: dueAmount reduced
 ├─ Payment Status: SUCCESS
 └─ Instant Digital Invoice Generated in App
```

---

## 8. Feature 5: Library Pass & Barcode / QR Generator

### 🎯 Objective:
Admin har student ke liye ek professional **Digital Library Pass (ID Card)** generate kar sake jisme Unique Barcode aur QR Code ho.

### 🪪 Library Pass Layout & Elements:

```
┌────────────────────────────────────────────────────────┐
│               🏛️ SAMEER DIGITAL LIBRARY                │
│             Smart Student Identity Pass                │
├────────────────────────────────────────────────────────┤
│  ┌──────────┐  Student Name : Sameer Kumar             │
│  │          │  Student ID   : SL-2026-0842             │
│  │  PHOTO   │  Branch       : Main Branch (SL01)       │
│  │          │  Seat No      : Seat A-12 (Reserved)     │
│  └──────────┘  Shift/Plan   : Full Day (8 AM - 8 PM)   │
│                Valid Upto   : 31-Oct-2026              │
├────────────────────────────────────────────────────────┤
│                       [ QR CODE ]                      │
│             Scan for Geofenced Attendance              │
│                                                        │
│                    ||||| |||| ||||||||                 │
│                      SL01-0842-A12                     │
│                    (Physical Barcode)                  │
└────────────────────────────────────────────────────────┘
```

---

## 9. Feature 6: Geofenced QR Attendance Security

### 🎯 Objective:
Student ghar baithe fake attendance na laga sake. Sirf library ke 50-75 meters radius ke andar hi attendance mark ho sake.

### 📐 How It Works (Haversine Formula):
1. **Admin Setup:** Admin branch page par jakar *"📍 Save Current Location as Library Center"* dabata hai.
2. **Student Scan:** Student app me camera se QR scan karta hai. App phone ka GPS coordinate leta hai.
3. **Backend Validation:**
   - If Distance $\le$ Branch Radius (e.g. 75m): **Check-in Success**!
   - If Distance $>$ Branch Radius: **Attendance Rejected** ("You are outside library").

---

## 10. Feature 7: 0-Cost WhatsApp Due Payment & Receipt Sending

### 🎯 The Challenge & Why Paid APIs are Waste of Money:
- **WhatsApp Cloud API / Twilio / Interakt:** Monthly ₹1500 to ₹3000 platform fee lete hain + 50p se 80p per message charge karte hain.
- **Hamara Solution:** **100% Free WhatsApp Direct URI Protocol (`wa.me`)**!
  - Isme koi third-party gateway nahi lagti.
  - Koi monthly charge nahi lagta.
  - Koi account block ka khatra nahi hota.
  - Admin ke device se 1 tap me student ke personal WhatsApp par auto-filled official invoice aur UPI link chala jata hai!

---

### 📲 Step-Wise Workflow (Kaise Kaam Karega):

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           ADMIN DASHBOARD                               │
│                                                                         │
│  Student: Rahul Sharma | Seat: A-14 | Due: ₹600 | Status: DUE           │
│                                                                         │
│  [💵 Collect Cash]       [📲 Send WhatsApp Due Bill]  ◄── (CLICK HERE)  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
        ┌─────────────────────────────────────────────────────────┐
        │        Auto-generates Pre-Formatted Message             │
        │        & Encodes into WhatsApp Direct Link:             │
        │        https://wa.me/919876543210?text=ENCODED_BILL     │
        └────────────────────────────┬────────────────────────────┘
                                     │
                                     ▼
        ┌─────────────────────────────────────────────────────────┐
        │       WhatsApp Opens Instantly (App / Web)              │
        │       Student chat opens with ready-made bill!          │
        │       Admin presses "Send" (1 Tap)                      │
        └────────────────────────────┬────────────────────────────┘
                                     │
                                     ▼
        ┌─────────────────────────────────────────────────────────┐
        │              STUDENT RECEIVES ON WHATSAPP:              │
        │                                                         │
        │  🏛️ *SAMEER DIGITAL LIBRARY - FEE DUE REMINDER*         │
        │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━                           │
        │  Dear *Rahul Sharma*,                                   │
        │  Aapki library seat ki monthly fee due hai:             │
        │                                                         │
        │  🆔 *Student ID:* SL-2026-0842                          │
        │  🪑 *Seat No:* A-14 (Shift: 8 AM - 2 PM)                │
        │  📅 *Billing Month:* September 2026                     │
        │                                                         │
        │  💵 *Fee Summary:*                                      │
        │  • Total Fee: ₹1,000                                    │
        │  • Paid Amount: ₹400                                    │
        │  • *Remaining Due: ₹600*                                │
        │  • Due Date: 15-Sep-2026                                │
        │                                                         │
        │  📲 *Direct UPI Payment Link (GPay / PhonePe / Paytm):* │
        │  https://sameerlibrary.com/pay/due?id=bk_9821           │
        │                                                         │
        │  _Note: Aap library reception par cash bhi de sakte hai_│
        │  📞 Contact Library Admin: +91 9876543210               │
        └─────────────────────────────────────────────────────────┘
```

---

### ⚡ 3 Super-Powers of This 0-Cost WhatsApp Feature:

#### 1. Instant Click-to-Pay UPI Deep Link Inside WhatsApp:
Message ke andar ek direct UPI link ja sakti hai:
`upi://pay?pa=sameerlibrary@upi&pn=Sameer%20Library&am=600&cu=INR&tn=Fee_Due_Rahul_A14`
Jab student apne phone me WhatsApp par is link ko tap karega, to uska Google Pay / PhonePe direct khul jayega jisme ₹600 amount aur Sameer Library ka naam pehle se bhara hoga! Student ko sirf apna UPI PIN daalna hoga!

#### 2. Digital Printable Invoice Link:
Message me receipt link bhi hogi:
`https://your-domain.com/receipt/inv_8842`
Student link par click karega to browser me Sameer Library ka official colored digital invoice khulega jise wo PDF me save kar sakta hai.

#### 3. Automatic Tracking:
Jaise hi Admin "Send WhatsApp" par click karega:
- System note kar lega: `lastReminderSentAt = Today`.
- Next time dashboard par dikhega: *"Last reminder sent: 2 hours ago"*.
- Isse bar-bar ek hi student ko bhool se dobara message bhejne ka confusion khatam ho jayega.

---

## 11. Step-Wise Implementation Roadmap

```
Phase 1: Database & Backend Architecture
  ├── 1.1 Prisma Schema update (Branch geofence, Booking dues, Payment installments, LibraryPass)
  ├── 1.2 Prisma migration & DB sync (npx prisma db push)
  └── 1.3 Seed data update

Phase 2: Due & Pending Payment Backend APIs
  ├── 2.1 Update Admin Booking Approval API (Support "Approve Without Payment")
  ├── 2.2 Create Admin Ledger API (/api/admin/payments/collect) for partial payments
  ├── 2.3 Create Dues Summary API (/api/admin/payments/dues) (Total Paid, Due, Overdue list)
  └── 2.4 Create Student Dues API (/api/student/dues)

Phase 3: Monthly Auto-Renewal Cron Engine
  ├── 3.1 Create /api/cron/billing-cycle endpoint
  ├── 3.2 Add automatic next month invoice creation & status transition
  └── 3.3 Set up scheduler (Oracle Cloud crontab or external cron-job.org)

Phase 4: 0-Cost WhatsApp Due Invoice & Receipt Generator
  ├── 4.1 WhatsApp Message Formatter helper (Generates clean Hindi/English text with emojis & UPI links)
  ├── 4.2 "📲 Send WhatsApp Bill" button on Admin Dues & Bookings Table
  └── 4.3 Digital Web Receipt page (/receipt/[id]) for students to view anytime

Phase 5: Student Online UPI Payment Flow
  ├── 5.1 Create Razorpay order creation endpoint (/api/payments/create-order)
  ├── 5.2 Create Razorpay verification & Webhook endpoint (/api/payments/webhook)
  └── 5.3 Integrate Razorpay SDK in Student Mobile App / Web App

Phase 6: Digital Library Pass & Barcode Generator
  ├── 6.1 Create Library Pass generator service (HMAC Token + Barcode)
  ├── 6.2 Build Admin "Print Pass / ID Card" view (CSS Print friendly)
  └── 6.3 Build Student Mobile App "My Digital Pass" screen

Phase 7: Geofenced QR Scanner in Mobile App
  ├── 7.1 Install & configure expo-camera, expo-location
  ├── 7.2 Admin Branch Location Picker / GPS Save endpoint
  ├── 7.3 Student Camera QR Scanner Screen with GPS validation
  └── 7.4 Haversine distance verification in Attendance check-in API
```

---

## 12. Testing & Verification Checklist

| Test Case | Expected Result | Cost | Status |
|---|---|---|---|
| **Approve Without Payment** | Booking active ho jaye, but student due ₹1000 dikhe. | ₹0 | ⏳ Planned |
| **Partial Cash Entry** | Admin ₹400 cash add kare -> Due ₹600 bache, receipt bane. | ₹0 | ⏳ Planned |
| **Recurring Month Due** | 30 days baad booking auto-renew ho aur new due add ho. | ₹0 | ⏳ Planned |
| **WhatsApp Due Bill Send** | Click karte hi WhatsApp me student ka pre-filled bill khul jaye. | **₹0.00** | ⏳ Planned |
| **WhatsApp UPI Tap** | Student link tap kare -> PhonePe/GPay open with exact due amount. | **₹0.00** | ⏳ Planned |
| **Online UPI Payment** | Student app se UPI pay kare -> Instant due 0 ho jaye. | Gateway std fee | ⏳ Planned |
| **Library Pass QR** | Pass me photo, seat no, valid QR & barcode render ho. | ₹0 | ⏳ Planned |
| **Inside Geofence Scan** | Library ke 50m ke andar scan kare -> Attendance marked. | ₹0 | ⏳ Planned |
| **Outside Geofence Scan** | Ghar se scan kare -> "Outside Library" error aaye. | ₹0 | ⏳ Planned |

---

## 💡 Quick Summary For You (Aapke Liye Seedha Saral Jawaab)
1. **WhatsApp ka pura record ₹0 cost me banega:**
   - Kisi Meta API ya Twilio ko 1 rupya bhi dene ki zaroorat nahi hai.
   - Admin dashboard me student ke naam ke aage green **"📲 Send WhatsApp Bill"** button hoga.
   - Click karte hi student ka phone number aur pura bill (Name, Seat, Due amount, Direct UPI pay link) WhatsApp me khul jayega aur aap 1 second me send kar sakenge.
2. **Both Files Updated:**
   - [New feature update.md](file:///c:/sameer%20libabary%20web%20app/New%20feature%20update.md)
   - [New feature update/README.md](file:///c:/sameer%20libabary%20web%20app/New%20feature%20update/README.md)
