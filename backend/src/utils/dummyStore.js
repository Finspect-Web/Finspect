const { randomUUID } = require("crypto");

const adminId = "dummy-admin-1";
const staffId = "dummy-staff-1";

const users = [
  {
    id: adminId,
    name: process.env.DUMMY_ADMIN_NAME || "Finspect Admin",
    email: process.env.DUMMY_ADMIN_EMAIL || "admin@finspect.com",
    password: process.env.DUMMY_ADMIN_PASSWORD || "Admin@123",
    role: "ADMIN",
    createdAt: new Date()
  },
  {
    id: staffId,
    name: process.env.DUMMY_STAFF_NAME || "Finspect Staff",
    email: process.env.DUMMY_STAFF_EMAIL || "staff@finspect.com",
    password: process.env.DUMMY_STAFF_PASSWORD || "Staff@123",
    role: "STAFF",
    createdAt: new Date()
  }
];

const clients = [
  {
    id: randomUUID(),
    name: "Rahul Sharma",
    email: "rahul@acme.in",
    phone: "9876543210",
    companyName: "Acme Corp",
    gstin: "29ABCDE1234F1Z5",
    pan: "ABCDE1234F",
    address: "Bengaluru, Karnataka",
    notes: "Quarterly GST filing",
    createdById: adminId,
    assignedToId: staffId,
    createdAt: new Date()
  },
  {
    id: randomUUID(),
    name: "Priya Nair",
    email: "priya@nova.in",
    phone: "9123456780",
    companyName: "Nova Pvt Ltd",
    gstin: null,
    pan: "PQRSN4567T",
    address: "Kochi, Kerala",
    notes: "Monthly bookkeeping",
    createdById: adminId,
    assignedToId: staffId,
    createdAt: new Date()
  }
];

const taskStages = [
  {
    id: randomUUID(),
    name: "To Do",
    order: 1,
    color: "#4c2ca7",
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: randomUUID(),
    name: "In Progress",
    order: 2,
    color: "#0f766e",
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: randomUUID(),
    name: "Review",
    order: 3,
    color: "#b45309",
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: randomUUID(),
    name: "Done",
    order: 4,
    color: "#15803d",
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const tasks = [
  {
    id: randomUUID(),
    title: "GST return preparation",
    description: "Prepare GSTR-3B documents",
    assignedToId: staffId,
    assignedById: adminId,
    clientId: clients[0].id,
    dueDate: new Date(Date.now() + 12 * 60 * 60 * 1000),
    priority: "HIGH",
    status: "PENDING",
    stageId: taskStages[0].id,
    reminderSentAt: null,
    createdAt: new Date()
  },
  {
    id: randomUUID(),
    title: "Income tax document review",
    description: "Review pending ITR docs",
    assignedToId: staffId,
    assignedById: adminId,
    clientId: clients[1].id,
    dueDate: new Date(Date.now() + 36 * 60 * 60 * 1000),
    priority: "MEDIUM",
    status: "COMPLETED",
    stageId: taskStages[3].id,
    reminderSentAt: null,
    createdAt: new Date()
  }
];

const credentials = [
  {
    id: randomUUID(),
    clientId: clients[0].id,
    serviceName: "GST Portal",
    username: "acme.gst",
    password: "Acme@123",
    notes: "Updated recently",
    createdAt: new Date()
  }
];

const invoices = [
  {
    id: randomUUID(),
    clientId: clients[0].id,
    invoiceNumber: "FS-2026-001",
    issueDate: new Date(),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    subtotal: 18000,
    taxAmount: 3240,
    discountAmount: 0,
    totalAmount: 21240,
    paidAmount: 5000,
    status: "PARTIALLY_PAID",
    notes: "Quarterly compliance package",
    createdById: adminId,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const payments = [
  {
    id: randomUUID(),
    invoiceId: invoices[0].id,
    amount: 5000,
    paymentDate: new Date(),
    method: "BANK_TRANSFER",
    reference: "UTR123456",
    notes: "Advance payment",
    createdById: adminId,
    createdAt: new Date()
  }
];

const compliances = [
  {
    id: randomUUID(),
    clientId: clients[0].id,
    title: "GSTR-3B Filing",
    description: "Monthly GST filing for April",
    type: "GST",
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    recurrence: "MONTHLY",
    status: "PENDING",
    assignedToId: staffId,
    createdById: adminId,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: randomUUID(),
    clientId: clients[1].id,
    title: "TDS Return (24Q)",
    description: "Quarterly TDS return filing",
    type: "TDS",
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    recurrence: "QUARTERLY",
    status: "IN_PROGRESS",
    assignedToId: staffId,
    createdById: adminId,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const attendances = [
  {
    id: randomUUID(),
    userId: staffId,
    date: new Date(new Date().setHours(0, 0, 0, 0)),
    checkInAt: new Date(new Date().setHours(9, 45, 0, 0)),
    checkOutAt: null,
    status: "PRESENT",
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const timesheetEntries = [
  {
    id: randomUUID(),
    userId: staffId,
    clientId: clients[0].id,
    taskId: tasks[0].id,
    workDate: new Date(new Date().setHours(0, 0, 0, 0)),
    durationMinutes: 90,
    description: "Prepared GST return draft and reviewed purchase register.",
    billable: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const activityLogs = [];

function createId() {
  return randomUUID();
}

function getPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt
  };
}

function findUserById(userId) {
  return users.find((item) => item.id === userId) || null;
}

module.exports = {
  adminId,
  staffId,
  users,
  clients,
  taskStages,
  tasks,
  credentials,
  invoices,
  payments,
  compliances,
  attendances,
  timesheetEntries,
  activityLogs,
  createId,
  getPublicUser,
  findUserById
};
