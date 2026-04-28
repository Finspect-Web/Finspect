const prisma = require("../prisma/client");
const AppError = require("../utils/appError");
const { isDummyMode } = require("../utils/mode");
const { taskStages, tasks, createId } = require("../utils/dummyStore");

function normalizeName(value) {
  const name = String(value || "").trim();
  if (!name) {
    throw new AppError("name is required.", 400);
  }
  return name;
}

function normalizeOrder(value, defaultValue) {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new AppError("order must be a positive integer.", 400);
  }
  return parsed;
}

function normalizeColor(value) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return "#4c2ca7";
  }
  return String(value).trim();
}

function sortByOrder(items) {
  return items.slice().sort((a, b) => a.order - b.order);
}

async function getTaskStages() {
  if (isDummyMode()) {
    return sortByOrder(taskStages);
  }

  return prisma.taskStage.findMany({
    orderBy: { order: "asc" }
  });
}

async function createTaskStage(payload) {
  const name = normalizeName(payload.name);
  const color = normalizeColor(payload.color);

  if (isDummyMode()) {
    const orderedStages = sortByOrder(taskStages);
    const defaultOrder = (orderedStages[orderedStages.length - 1]?.order || 0) + 1;
    const order = normalizeOrder(payload.order, defaultOrder);
    const isDefault = Boolean(payload.isDefault);

    if (taskStages.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
      throw new AppError("Task stage name already exists.", 409);
    }
    if (taskStages.some((item) => item.order === order)) {
      throw new AppError("Task stage order already exists.", 409);
    }

    const stage = {
      id: createId(),
      name,
      order,
      color,
      isDefault,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (isDefault) {
      taskStages.forEach((item) => {
        item.isDefault = false;
        item.updatedAt = new Date();
      });
    }

    taskStages.push(stage);
    return sortByOrder(taskStages).find((item) => item.id === stage.id);
  }

  const existingList = await prisma.taskStage.findMany({
    select: { id: true, order: true }
  });
  const defaultOrder = (existingList.sort((a, b) => a.order - b.order).slice(-1)[0]?.order || 0) + 1;
  const order = normalizeOrder(payload.order, defaultOrder);
  const isDefault = Boolean(payload.isDefault);

  const duplicateByName = await prisma.taskStage.findFirst({
    where: { name: { equals: name, mode: "insensitive" } }
  });
  if (duplicateByName) {
    throw new AppError("Task stage name already exists.", 409);
  }

  const duplicateByOrder = await prisma.taskStage.findFirst({
    where: { order }
  });
  if (duplicateByOrder) {
    throw new AppError("Task stage order already exists.", 409);
  }

  return prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.taskStage.updateMany({
        data: { isDefault: false }
      });
    }

    return tx.taskStage.create({
      data: {
        name,
        order,
        color,
        isDefault
      }
    });
  });
}

async function updateTaskStage(id, payload) {
  if (isDummyMode()) {
    const index = taskStages.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new AppError("Task stage not found.", 404);
    }

    const existing = taskStages[index];
    const nextName = payload.name !== undefined ? normalizeName(payload.name) : existing.name;
    const nextOrder = payload.order !== undefined ? normalizeOrder(payload.order, existing.order) : existing.order;
    const nextColor = payload.color !== undefined ? normalizeColor(payload.color) : existing.color;
    const hasDefaultUpdate = payload.isDefault !== undefined;
    const nextIsDefault = hasDefaultUpdate ? Boolean(payload.isDefault) : existing.isDefault;

    if (
      taskStages.some((item) => item.id !== id && item.name.toLowerCase() === nextName.toLowerCase())
    ) {
      throw new AppError("Task stage name already exists.", 409);
    }
    if (taskStages.some((item) => item.id !== id && item.order === nextOrder)) {
      throw new AppError("Task stage order already exists.", 409);
    }
    if (existing.isDefault && hasDefaultUpdate && !nextIsDefault) {
      const hasAnotherDefault = taskStages.some((item) => item.id !== id && item.isDefault);
      if (!hasAnotherDefault) {
        throw new AppError("At least one default stage is required.", 400);
      }
    }

    if (nextIsDefault) {
      taskStages.forEach((item) => {
        if (item.id !== id && item.isDefault) {
          item.isDefault = false;
          item.updatedAt = new Date();
        }
      });
    }

    const updated = {
      ...existing,
      name: nextName,
      order: nextOrder,
      color: nextColor,
      isDefault: nextIsDefault,
      updatedAt: new Date()
    };
    taskStages[index] = updated;
    return updated;
  }

  const existing = await prisma.taskStage.findUnique({
    where: { id }
  });
  if (!existing) {
    throw new AppError("Task stage not found.", 404);
  }

  const nextName = payload.name !== undefined ? normalizeName(payload.name) : existing.name;
  const nextOrder = payload.order !== undefined ? normalizeOrder(payload.order, existing.order) : existing.order;
  const nextColor = payload.color !== undefined ? normalizeColor(payload.color) : existing.color;
  const hasDefaultUpdate = payload.isDefault !== undefined;
  const nextIsDefault = hasDefaultUpdate ? Boolean(payload.isDefault) : existing.isDefault;

  const duplicateByName = await prisma.taskStage.findFirst({
    where: {
      id: { not: id },
      name: { equals: nextName, mode: "insensitive" }
    }
  });
  if (duplicateByName) {
    throw new AppError("Task stage name already exists.", 409);
  }

  const duplicateByOrder = await prisma.taskStage.findFirst({
    where: {
      id: { not: id },
      order: nextOrder
    }
  });
  if (duplicateByOrder) {
    throw new AppError("Task stage order already exists.", 409);
  }

  if (existing.isDefault && hasDefaultUpdate && !nextIsDefault) {
    const anotherDefault = await prisma.taskStage.findFirst({
      where: {
        id: { not: id },
        isDefault: true
      }
    });
    if (!anotherDefault) {
      throw new AppError("At least one default stage is required.", 400);
    }
  }

  return prisma.$transaction(async (tx) => {
    if (nextIsDefault) {
      await tx.taskStage.updateMany({
        where: { id: { not: id } },
        data: { isDefault: false }
      });
    }

    return tx.taskStage.update({
      where: { id },
      data: {
        name: nextName,
        order: nextOrder,
        color: nextColor,
        isDefault: nextIsDefault
      }
    });
  });
}

async function deleteTaskStage(id) {
  if (isDummyMode()) {
    const index = taskStages.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new AppError("Task stage not found.", 404);
    }

    const fallback = sortByOrder(taskStages).find((item) => item.id !== id) || null;
    tasks.forEach((task) => {
      if (task.stageId === id) {
        task.stageId = fallback ? fallback.id : null;
      }
    });
    taskStages.splice(index, 1);

    if (fallback && !taskStages.some((item) => item.isDefault)) {
      fallback.isDefault = true;
      fallback.updatedAt = new Date();
    }
    return;
  }

  const existing = await prisma.taskStage.findUnique({
    where: { id }
  });
  if (!existing) {
    throw new AppError("Task stage not found.", 404);
  }

  const fallback = await prisma.taskStage.findFirst({
    where: { id: { not: id } },
    orderBy: { order: "asc" }
  });

  await prisma.$transaction(async (tx) => {
    await tx.task.updateMany({
      where: { stageId: id },
      data: { stageId: fallback?.id || null }
    });

    await tx.taskStage.delete({
      where: { id }
    });

    if (fallback) {
      const hasDefault = await tx.taskStage.findFirst({
        where: { isDefault: true }
      });
      if (!hasDefault) {
        await tx.taskStage.update({
          where: { id: fallback.id },
          data: { isDefault: true }
        });
      }
    }
  });
}

module.exports = {
  getTaskStages,
  createTaskStage,
  updateTaskStage,
  deleteTaskStage
};
