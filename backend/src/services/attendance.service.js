const prismaTypes = require("@prisma/client");
const prisma = require("../prisma/client");
const AppError = require("../utils/appError");
const { isDummyMode } = require("../utils/mode");
const { attendances, users, createId, findUserById } = require("../utils/dummyStore");

const Role = prismaTypes.Role || { ADMIN: "ADMIN", STAFF: "STAFF" };
const AttendanceStatus = prismaTypes.AttendanceStatus || {
  PRESENT: "PRESENT",
  HALF_DAY: "HALF_DAY",
  ABSENT: "ABSENT",
  LEAVE: "LEAVE"
};

const attendanceInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true
    }
  }
};

function startOfDay(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) {
    throw new AppError("Invalid date value.", 400);
  }
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value) {
  const date = startOfDay(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function calculateWorkedMinutes(checkInAt, checkOutAt) {
  if (!checkInAt || !checkOutAt) return 0;
  const diff = new Date(checkOutAt).getTime() - new Date(checkInAt).getTime();
  if (diff <= 0) return 0;
  return Math.floor(diff / (1000 * 60));
}

function validateStatus(status) {
  if (!Object.values(AttendanceStatus).includes(status)) {
    throw new AppError("Invalid attendance status.", 400);
  }
}

function hydrateDummyAttendance(item) {
  const user = findUserById(item.userId);
  return {
    ...item,
    workedMinutes: calculateWorkedMinutes(item.checkInAt, item.checkOutAt),
    user: user
      ? {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      : null
  };
}

function parseDateRange(query = {}) {
  const from = query.from ? startOfDay(query.from) : startOfDay(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const to = query.to ? endOfDay(query.to) : endOfDay(new Date());
  if (from.getTime() > to.getTime()) {
    throw new AppError("from date must be before to date.", 400);
  }
  return { from, to };
}

async function checkInAttendance(actor) {
  const date = startOfDay(new Date());
  const now = new Date();

  if (isDummyMode()) {
    let record = attendances.find(
      (item) => item.userId === actor.id && startOfDay(item.date).getTime() === date.getTime()
    );

    if (record?.checkInAt) {
      throw new AppError("Check-in already done for today.", 409);
    }

    if (record) {
      record.checkInAt = now;
      record.status = AttendanceStatus.PRESENT;
      record.updatedAt = now;
    } else {
      record = {
        id: createId(),
        userId: actor.id,
        date,
        checkInAt: now,
        checkOutAt: null,
        status: AttendanceStatus.PRESENT,
        notes: null,
        createdAt: now,
        updatedAt: now
      };
      attendances.unshift(record);
    }

    return hydrateDummyAttendance(record);
  }

  const existing = await prisma.attendance.findUnique({
    where: {
      userId_date: {
        userId: actor.id,
        date
      }
    },
    include: attendanceInclude
  });

  if (existing?.checkInAt) {
    throw new AppError("Check-in already done for today.", 409);
  }

  const record = existing
    ? await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          checkInAt: now,
          status: AttendanceStatus.PRESENT
        },
        include: attendanceInclude
      })
    : await prisma.attendance.create({
        data: {
          userId: actor.id,
          date,
          checkInAt: now,
          status: AttendanceStatus.PRESENT
        },
        include: attendanceInclude
      });

  return {
    ...record,
    workedMinutes: calculateWorkedMinutes(record.checkInAt, record.checkOutAt)
  };
}

async function checkOutAttendance(actor) {
  const date = startOfDay(new Date());
  const now = new Date();

  if (isDummyMode()) {
    const record = attendances.find(
      (item) => item.userId === actor.id && startOfDay(item.date).getTime() === date.getTime()
    );
    if (!record || !record.checkInAt) {
      throw new AppError("Check-in is required before check-out.", 400);
    }
    if (record.checkOutAt) {
      throw new AppError("Check-out already done for today.", 409);
    }

    record.checkOutAt = now;
    const workedMinutes = calculateWorkedMinutes(record.checkInAt, record.checkOutAt);
    record.status = workedMinutes >= 4 * 60 ? AttendanceStatus.PRESENT : AttendanceStatus.HALF_DAY;
    record.updatedAt = now;
    return hydrateDummyAttendance(record);
  }

  const record = await prisma.attendance.findUnique({
    where: {
      userId_date: {
        userId: actor.id,
        date
      }
    },
    include: attendanceInclude
  });

  if (!record || !record.checkInAt) {
    throw new AppError("Check-in is required before check-out.", 400);
  }
  if (record.checkOutAt) {
    throw new AppError("Check-out already done for today.", 409);
  }

  const workedMinutes = calculateWorkedMinutes(record.checkInAt, now);
  const status = workedMinutes >= 4 * 60 ? AttendanceStatus.PRESENT : AttendanceStatus.HALF_DAY;
  const updated = await prisma.attendance.update({
    where: { id: record.id },
    data: {
      checkOutAt: now,
      status
    },
    include: attendanceInclude
  });

  return {
    ...updated,
    workedMinutes: calculateWorkedMinutes(updated.checkInAt, updated.checkOutAt)
  };
}

async function markAttendance(payload) {
  const userId = String(payload.userId || "").trim();
  if (!userId) {
    throw new AppError("userId is required.", 400);
  }

  const date = startOfDay(payload.date || new Date());
  const status = payload.status || AttendanceStatus.PRESENT;
  validateStatus(status);

  const checkInAt = payload.checkInAt ? new Date(payload.checkInAt) : null;
  const checkOutAt = payload.checkOutAt ? new Date(payload.checkOutAt) : null;
  if (checkInAt && Number.isNaN(checkInAt.getTime())) {
    throw new AppError("checkInAt must be a valid date.", 400);
  }
  if (checkOutAt && Number.isNaN(checkOutAt.getTime())) {
    throw new AppError("checkOutAt must be a valid date.", 400);
  }

  if (isDummyMode()) {
    const user = users.find((item) => item.id === userId);
    if (!user) {
      throw new AppError("User not found.", 404);
    }

    const existing = attendances.find(
      (item) => item.userId === userId && startOfDay(item.date).getTime() === date.getTime()
    );

    if (existing) {
      existing.status = status;
      existing.checkInAt = checkInAt;
      existing.checkOutAt = checkOutAt;
      existing.notes = payload.notes || null;
      existing.updatedAt = new Date();
      return hydrateDummyAttendance(existing);
    }

    const record = {
      id: createId(),
      userId,
      date,
      status,
      checkInAt,
      checkOutAt,
      notes: payload.notes || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    attendances.unshift(record);
    return hydrateDummyAttendance(record);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true }
  });
  if (!user) {
    throw new AppError("User not found.", 404);
  }

  const record = await prisma.attendance.upsert({
    where: {
      userId_date: { userId, date }
    },
    update: {
      status,
      checkInAt,
      checkOutAt,
      notes: payload.notes || null
    },
    create: {
      userId,
      date,
      status,
      checkInAt,
      checkOutAt,
      notes: payload.notes || null
    },
    include: attendanceInclude
  });

  return {
    ...record,
    workedMinutes: calculateWorkedMinutes(record.checkInAt, record.checkOutAt)
  };
}

async function getAttendanceToday(actor) {
  const date = startOfDay(new Date());

  if (isDummyMode()) {
    const record = attendances.find(
      (item) => item.userId === actor.id && startOfDay(item.date).getTime() === date.getTime()
    );
    return record ? hydrateDummyAttendance(record) : null;
  }

  const record = await prisma.attendance.findUnique({
    where: {
      userId_date: {
        userId: actor.id,
        date
      }
    },
    include: attendanceInclude
  });

  if (!record) return null;
  return {
    ...record,
    workedMinutes: calculateWorkedMinutes(record.checkInAt, record.checkOutAt)
  };
}

async function getAttendanceList(actor, query) {
  const { from, to } = parseDateRange(query);

  if (isDummyMode()) {
    const filtered = attendances.filter((item) => {
      const time = new Date(item.date).getTime();
      const dateMatch = time >= from.getTime() && time <= to.getTime();
      if (!dateMatch) return false;
      return actor.role === Role.ADMIN ? true : item.userId === actor.id;
    });

    return filtered
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map((item) => hydrateDummyAttendance(item));
  }

  const where = {
    date: {
      gte: from,
      lte: to
    }
  };

  if (actor.role !== Role.ADMIN) {
    where.userId = actor.id;
  }

  const records = await prisma.attendance.findMany({
    where,
    include: attendanceInclude,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }]
  });

  return records.map((record) => ({
    ...record,
    workedMinutes: calculateWorkedMinutes(record.checkInAt, record.checkOutAt)
  }));
}

module.exports = {
  checkInAttendance,
  checkOutAttendance,
  markAttendance,
  getAttendanceToday,
  getAttendanceList
};
