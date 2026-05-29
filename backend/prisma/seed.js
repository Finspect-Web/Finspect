require("dotenv").config();
const bcrypt = require("bcryptjs");
const { encryptText } = require("../src/utils/crypto");
const { PrismaClient, Role, TaskStatus, Priority, InvoiceStatus, PaymentMethod, ComplianceStatus, RecurrenceType, DocumentCategory, TicketPriority, TicketStatus } = require("@prisma/client");

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function hoursFromNow(hours) {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return d;
}

// ---------------------------------------------------------------------------
// Seed data definitions
// ---------------------------------------------------------------------------

const STAFF_SEED = {
  name: process.env.DUMMY_STAFF_NAME || "Finspect Staff",
  email: process.env.DUMMY_STAFF_EMAIL || "staff@finspect.com",
  password: process.env.DUMMY_STAFF_PASSWORD || "Staff@123"
};

const TASK_STAGES = [
  { name: "To Do", order: 1, color: "#94a3b8", isDefault: true },
  { name: "In Progress", order: 2, color: "#3b82f6", isDefault: false },
  { name: "Review", order: 3, color: "#f59e0b", isDefault: false },
  { name: "Done", order: 4, color: "#22c55e", isDefault: false }
];

const COMPLIANCE_TYPES = [
  { name: "GST Filing", description: "Monthly GST return filing" },
  { name: "Income Tax Filing", description: "Annual income tax return filing" },
  { name: "TDS Return", description: "Quarterly TDS return filing" },
  { name: "Statutory Audit", description: "Annual statutory audit" }
];

const CLIENTS_DATA = [
  {
    name: "TechNova Solutions",
    email: "accounts@technova.in",
    phone: "+91-9876543210",
    companyName: "TechNova Solutions Pvt Ltd",
    gstin: "27AABCT1234E1Z5",
    pan: "AABCT1234E",
    address: "42, Innovation Tower, BKC, Mumbai - 400051",
    notes: "Key client — prefers email communication"
  },
  {
    name: "GreenLeaf Agro",
    email: "finance@greenleafagro.com",
    phone: "+91-8765432109",
    companyName: "GreenLeaf Agro Industries",
    gstin: "29AABCG5678F1Z6",
    pan: "AABCG5678F",
    address: "78, MG Road, Pune - 411001",
    notes: "Quarterly compliance focus"
  },
  {
    name: "Apex Financial Services",
    email: "contact@apexfin.in",
    phone: "+91-7654321098",
    companyName: "Apex Financial Services Ltd",
    gstin: "33AAEFA9012K1Z3",
    pan: "AAEFA9012K",
    address: "12, Financial District, Hyderabad - 500032",
    notes: "Needs priority handling for tax filings"
  },
  {
    name: "BlueOcean Trading Co.",
    email: "info@blueoceantrading.com",
    phone: "+91-6543210987",
    companyName: "BlueOcean Trading Company",
    gstin: "36AABCB3456L1Z7",
    pan: "AABCB3456L",
    address: "55, Commerce Street, Chennai - 600001",
    notes: ""
  }
];

const TASKS_DATA = [
  { clientIdx: 0, title: "Prepare Q2 GST returns", description: "Compile purchase and sales registers for Q2 GST filing", priority: Priority.HIGH, dueDays: 7, status: TaskStatus.PENDING },
  { clientIdx: 0, title: "Reconcile bank statements", description: "Monthly bank reconciliation for March 2026", priority: Priority.MEDIUM, dueDays: 14, status: TaskStatus.PENDING },
  { clientIdx: 0, title: "Draft financial statements", description: "Prepare draft P&L and balance sheet for board review", priority: Priority.HIGH, dueDays: 21, status: TaskStatus.PENDING },
  { clientIdx: 1, title: "Quarterly TDS return", description: "File Q1 TDS return for GreenLeaf Agro", priority: Priority.HIGH, dueDays: 10, status: TaskStatus.PENDING },
  { clientIdx: 1, title: "Review GST input credit", description: "Verify input tax credit claims for the quarter", priority: Priority.MEDIUM, dueDays: 15, status: TaskStatus.PENDING },
  { clientIdx: 2, title: "Income tax return preparation", description: "Prepare ITR for FY 2025-26 with all schedules", priority: Priority.HIGH, dueDays: 45, status: TaskStatus.PENDING },
  { clientIdx: 2, title: "Update accounting software", description: "Migrate from Tally to Zoho Books", priority: Priority.LOW, dueDays: 60, status: TaskStatus.PENDING },
  { clientIdx: 2, title: "GST annual return filing", description: "File GSTR-9 for FY 2025-26", priority: Priority.HIGH, dueDays: 90, status: TaskStatus.PENDING },
  { clientIdx: 3, title: "Monthly GST payment", description: "Calculate and remit GST for March 2026", priority: Priority.MEDIUM, dueDays: 5, status: TaskStatus.PENDING },
  { clientIdx: 3, title: "Audit preparation", description: "Gather documents for statutory audit", priority: Priority.MEDIUM, dueDays: 30, status: TaskStatus.PENDING }
];

const INVOICES_DATA = [
  { clientIdx: 0, invNum: "FIN-2026-001", issueDays: -20, dueDays: 10, subtotal: 50000, taxAmount: 9000, discountAmount: 0, totalAmount: 59000, paidAmount: 59000, status: InvoiceStatus.PAID },
  { clientIdx: 0, invNum: "FIN-2026-002", issueDays: -5, dueDays: 25, subtotal: 35000, taxAmount: 6300, discountAmount: 0, totalAmount: 41300, paidAmount: 0, status: InvoiceStatus.SENT },
  { clientIdx: 1, invNum: "FIN-2026-003", issueDays: -15, dueDays: 15, subtotal: 25000, taxAmount: 4500, discountAmount: 2500, totalAmount: 27000, paidAmount: 27000, status: InvoiceStatus.PAID },
  { clientIdx: 2, invNum: "FIN-2026-004", issueDays: -30, dueDays: -5, subtotal: 75000, taxAmount: 13500, discountAmount: 0, totalAmount: 88500, paidAmount: 40000, status: InvoiceStatus.PARTIALLY_PAID },
  { clientIdx: 2, invNum: "FIN-2026-005", issueDays: -60, dueDays: -30, subtotal: 60000, taxAmount: 10800, discountAmount: 0, totalAmount: 70800, paidAmount: 0, status: InvoiceStatus.OVERDUE }
];

const PAYMENTS_DATA = [
  { invoiceIdx: 0, amount: 59000, method: PaymentMethod.BANK_TRANSFER, reference: "NEFT HDFC123456", notes: "Q1 retainer payment", payDays: -15 },
  { invoiceIdx: 2, amount: 27000, method: PaymentMethod.UPI, reference: "UPI-REF-78901", notes: "UPI payment received", payDays: -12 },
  { invoiceIdx: 3, amount: 40000, method: PaymentMethod.CHEQUE, reference: "CHQ-004562", notes: "Partial payment — cheque cleared", payDays: -20 }
];

const COMPLIANCE_ITEMS_DATA = [
  { clientIdx: 0, title: "GST Return (GSTR-3B) - April 2026", desc: "Monthly GST return", type: "GST Filing", dueDays: 12, rec: RecurrenceType.MONTHLY, status: ComplianceStatus.PENDING },
  { clientIdx: 0, title: "GST Return (GSTR-3B) - March 2026", desc: "Monthly GST return", type: "GST Filing", dueDays: -5, rec: RecurrenceType.NONE, status: ComplianceStatus.COMPLETED },
  { clientIdx: 1, title: "TDS Return (Q1 FY 2026-27)", desc: "Quarterly TDS statement", type: "TDS Return", dueDays: 20, rec: RecurrenceType.QUARTERLY, status: ComplianceStatus.PENDING },
  { clientIdx: 2, title: "Income Tax Return (FY 2025-26)", desc: "Annual ITR filing", type: "Income Tax Filing", dueDays: 60, rec: RecurrenceType.YEARLY, status: ComplianceStatus.IN_PROGRESS },
  { clientIdx: 2, title: "GST Annual Return (GSTR-9)", desc: "Annual GST reconciliation", type: "GST Filing", dueDays: 90, rec: RecurrenceType.YEARLY, status: ComplianceStatus.PENDING },
  { clientIdx: 3, title: "Statutory Audit FY 2025-26", desc: "Annual audit under Companies Act", type: "Statutory Audit", dueDays: 120, rec: RecurrenceType.YEARLY, status: ComplianceStatus.PENDING }
];

const CREDENTIALS_DATA = [
  { clientIdx: 0, service: "GST Portal", username: "technova_gst", password: "Tech@GST#2026" },
  { clientIdx: 0, service: "Income Tax Portal", username: "technova_itr", password: "Tech@ITR#2026" },
  { clientIdx: 1, service: "Tally ERP", username: "greenleaf_admin", password: "Green#Tally1" },
  { clientIdx: 2, service: "Zoho Books", username: "apex_finance", password: "Apex@Zoho99" }
];

const DOCUMENTS_DATA = [
  { clientIdx: 0, title: "Incorporation Certificate", category: DocumentCategory.KYC, fileUrl: "/documents/technova/incorporation.pdf", desc: "Certificate of incorporation" },
  { clientIdx: 0, title: "GST Registration Certificate", category: DocumentCategory.COMPLIANCE, fileUrl: "/documents/technova/gst-cert.pdf", desc: "GST registration" },
  { clientIdx: 1, title: "PAN Card", category: DocumentCategory.KYC, fileUrl: "/documents/greenleaf/pan.pdf", desc: "PAN card copy" },
  { clientIdx: 2, title: "Audit Report FY 2024-25", category: DocumentCategory.FINANCIAL, fileUrl: "/documents/apex/audit-2425.pdf", desc: "Previous year audit report" }
];

const TICKETS_DATA = [
  { clientIdx: 0, subject: "GST portal login issue", desc: "Unable to login to GST portal with existing credentials", pri: TicketPriority.HIGH, status: TicketStatus.OPEN },
  { clientIdx: 2, subject: "Request for tax planning consultation", desc: "Client wants to explore tax-saving investments before year end", pri: TicketPriority.MEDIUM, status: TicketStatus.IN_PROGRESS }
];

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

async function main() {
  // ---- Users ----
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const adminName = process.env.SEED_ADMIN_NAME || "Finspect Admin";

  if (!adminEmail || !adminPassword) {
    throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required for seeding.");
  }

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: adminName,
      email: adminEmail,
      password: await bcrypt.hash(adminPassword, 12),
      role: Role.ADMIN,
      isActive: true
    }
  });
  console.log(`✅ Admin user: ${admin.name} (${admin.email})`);

  const staff = await prisma.user.upsert({
    where: { email: STAFF_SEED.email },
    update: {},
    create: {
      name: STAFF_SEED.name,
      email: STAFF_SEED.email,
      password: await bcrypt.hash(STAFF_SEED.password, 12),
      role: Role.STAFF,
      isActive: true,
      createdById: admin.id
    }
  });
  console.log(`✅ Staff user: ${staff.name} (${staff.email})`);

  // Check if sample data already exists (idempotency guard)
  const existingClients = await prisma.client.count();
  if (existingClients > 0) {
    console.log("ℹ️  Sample data already exists, skipping.");
    return;
  }

  // ---- Task Stages ----
  for (const stage of TASK_STAGES) {
    await prisma.taskStage.upsert({
      where: { name: stage.name },
      update: {},
      create: stage
    });
  }
  console.log(`✅ ${TASK_STAGES.length} task stages created`);

  // ---- Compliance Types ----
  for (const ct of COMPLIANCE_TYPES) {
    await prisma.complianceType.upsert({
      where: { name: ct.name },
      update: {},
      create: ct
    });
  }
  console.log(`✅ ${COMPLIANCE_TYPES.length} compliance types created`);

  // ---- Clients ----
  const clients = [];
  for (const c of CLIENTS_DATA) {
    const client = await prisma.client.create({
      data: {
        ...c,
        createdById: admin.id,
        assignedToId: staff.id
      }
    });
    clients.push(client);
  }
  console.log(`✅ ${clients.length} clients created`);

  // ---- Tasks ----
  const stages = await prisma.taskStage.findMany({ orderBy: { order: "asc" } });
  const toDoStage = stages[0];
  const inProgressStage = stages[1];

  for (const t of TASKS_DATA) {
    await prisma.task.create({
      data: {
        title: t.title,
        description: t.description,
        priority: t.priority,
        status: t.status,
        dueDate: daysFromNow(t.dueDays),
        clientId: clients[t.clientIdx].id,
        assignedToId: staff.id,
        assignedById: admin.id,
        stageId: t.status === TaskStatus.COMPLETED ? stages[3].id : t.status === TaskStatus.PENDING ? toDoStage.id : inProgressStage.id
      }
    });
  }
  console.log(`✅ ${TASKS_DATA.length} tasks created`);

  // ---- Invoices ----
  const invoices = [];
  for (const inv of INVOICES_DATA) {
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: inv.invNum,
        issueDate: daysFromNow(inv.issueDays),
        dueDate: daysFromNow(inv.dueDays),
        subtotal: inv.subtotal,
        taxAmount: inv.taxAmount,
        discountAmount: inv.discountAmount,
        totalAmount: inv.totalAmount,
        paidAmount: inv.paidAmount,
        status: inv.status,
        notes: null,
        clientId: clients[inv.clientIdx].id,
        createdById: admin.id
      }
    });
    invoices.push(invoice);
  }
  console.log(`✅ ${invoices.length} invoices created`);

  // ---- Payments ----
  for (const p of PAYMENTS_DATA) {
    await prisma.payment.create({
      data: {
        amount: p.amount,
        paymentDate: daysFromNow(p.payDays),
        method: p.method,
        reference: p.reference,
        notes: p.notes,
        invoiceId: invoices[p.invoiceIdx].id,
        createdById: admin.id
      }
    });
  }
  console.log(`✅ ${PAYMENTS_DATA.length} payments created`);

  // ---- Compliance Items ----
  for (const ci of COMPLIANCE_ITEMS_DATA) {
    await prisma.complianceItem.create({
      data: {
        title: ci.title,
        description: ci.desc,
        type: ci.type,
        dueDate: daysFromNow(ci.dueDays),
        recurrence: ci.rec,
        status: ci.status,
        clientId: clients[ci.clientIdx].id,
        assignedToId: staff.id,
        createdById: admin.id
      }
    });
  }
  console.log(`✅ ${COMPLIANCE_ITEMS_DATA.length} compliance items created`);

  // ---- Credentials ----
  for (const cr of CREDENTIALS_DATA) {
    await prisma.credential.create({
      data: {
        serviceName: cr.service,
        username: cr.username,
        password: encryptText(cr.password),
        clientId: clients[cr.clientIdx].id
      }
    });
  }
  console.log(`✅ ${CREDENTIALS_DATA.length} credentials created`);

  // ---- Documents ----
  for (const d of DOCUMENTS_DATA) {
    await prisma.document.create({
      data: {
        title: d.title,
        category: d.category,
        fileUrl: d.fileUrl,
        description: d.desc,
        clientId: clients[d.clientIdx].id,
        uploadedById: admin.id
      }
    });
  }
  console.log(`✅ ${DOCUMENTS_DATA.length} documents created`);

  // ---- Tickets ----
  for (const t of TICKETS_DATA) {
    await prisma.ticket.create({
      data: {
        subject: t.subject,
        description: t.desc,
        priority: t.pri,
        status: t.status,
        clientId: clients[t.clientIdx].id,
        createdById: staff.id,
        assignedToId: admin.id
      }
    });
  }
  console.log(`✅ ${TICKETS_DATA.length} tickets created`);

  // ---- Activity Logs ----
  const activityData = [
    ...clients.map((c) => ({ action: "CLIENT_CREATED", refId: c.id })),
    ...clients.map((c) => ({ action: "CLIENT_UPDATED", refId: c.id }))
  ];

  for (const act of activityData) {
    await prisma.activityLog.create({
      data: {
        action: act.action,
        referenceId: act.refId,
        performedById: admin.id
      }
    });
  }
  console.log(`✅ ${activityData.length} activity logs created`);

  // ---- Summary ----
  const counts = {
    users: await prisma.user.count(),
    clients: await prisma.client.count(),
    tasks: await prisma.task.count(),
    invoices: await prisma.invoice.count(),
    payments: await prisma.payment.count(),
    complianceItems: await prisma.complianceItem.count(),
    complianceTypes: await prisma.complianceType.count(),
    taskStages: await prisma.taskStage.count(),
    credentials: await prisma.credential.count(),
    documents: await prisma.document.count(),
    tickets: await prisma.ticket.count(),
    activityLogs: await prisma.activityLog.count()
  };

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Seed complete — DB summary");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  for (const [key, value] of Object.entries(counts)) {
    console.log(`  ${key.padEnd(18)} ${String(value).padStart(4)}`);
  }
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
