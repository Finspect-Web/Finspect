const { Role, TaskStatus, Priority } = require("@prisma/client");
const prisma = require("../prisma/client");
const AppError = require("../utils/appError");
const { isDummyMode } = require("../utils/mode");
const { tasks, users, clients, taskStages, createId, findUserById } = require("../utils/dummyStore");
const ActivityAction = require("../constants/activityActions");
const { logActivity } = require("./activity.service");
const { sendTaskAssignmentNotifications } = require("../utils/notification");
const googleCalendar = require("./googleCalendar.service");

const taskInclude = {
  assignedTo: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true
    }
  },
  assignedBy: {
    select: {
      id: true,
      name: true,
      email: true
    }
  },
  client: {
    select: {
      id: true,
      name: true,
      companyName: true
    }
  },
  stage: {
    select: {
      id: true,
      name: true,
      order: true,
      color: true,
      isDefault: true
    }
  }
};

function parseDate(value, fieldName) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(`${fieldName} must be a valid date.`, 400);
  }
  return date;
}

async function createTask(payload, actorId) {
  const { title, description, assignedToId, clientId, dueDate, priority = Priority.MEDIUM, stageId } = payload;

  if (!title || !assignedToId || !clientId || !dueDate) {
    throw new AppError("title, assignedToId, clientId and dueDate are required.", 400);
  }

  if (![Priority.LOW, Priority.MEDIUM, Priority.HIGH].includes(priority)) {
    throw new AppError("priority must be LOW, MEDIUM or HIGH.", 400);
  }

  if (isDummyMode()) {
    const assignedUser = users.find((item) => item.id === assignedToId);
    const client = clients.find((item) => item.id === clientId);
    const assignedBy = findUserById(actorId);
    const defaultStage = taskStages.find((item) => item.isDefault) || taskStages.slice().sort((a, b) => a.order - b.order)[0];
    const selectedStage = stageId ? taskStages.find((item) => item.id === stageId) : defaultStage;

    if (!assignedUser) throw new AppError("Assigned user not found.", 404);
    if (!client) throw new AppError("Client not found.", 404);
    if (!assignedBy) throw new AppError("Assigned-by user not found.", 404);
    if (!selectedStage) throw new AppError("Task stage not found.", 404);

    const task = {
      id: createId(),
      title,
      description: description || null,
      assignedToId,
      assignedById: actorId,
      clientId,
      dueDate: parseDate(dueDate, "dueDate"),
      priority,
      status: TaskStatus.PENDING,
      stageId: selectedStage.id,
      reminderSentAt: null,
      createdAt: new Date()
    };
    tasks.unshift(task);

    const hydratedTask = {
      ...task,
      assignedTo: {
        id: assignedUser.id,
        name: assignedUser.name,
        email: assignedUser.email,
        role: assignedUser.role
      },
      assignedBy: {
        id: assignedBy.id,
        name: assignedBy.name,
        email: assignedBy.email
      },
      client: {
        id: client.id,
        name: client.name,
        companyName: client.companyName
      },
      stage: {
        id: selectedStage.id,
        name: selectedStage.name,
        order: selectedStage.order,
        color: selectedStage.color,
        isDefault: selectedStage.isDefault
      }
    };

    await Promise.all([
      logActivity(ActivityAction.TASK_CREATED, actorId, task.id),
      logActivity(ActivityAction.TASK_ASSIGNED, actorId, task.id)
    ]);
    return hydratedTask;
  }

  const [assignedUser, client] = await Promise.all([
    prisma.user.findUnique({ where: { id: assignedToId } }),
    prisma.client.findUnique({ where: { id: clientId } })
  ]);

  if (!assignedUser) {
    throw new AppError("Assigned user not found.", 404);
  }

  if (!client) {
    throw new AppError("Client not found.", 404);
  }

  let resolvedStageId = stageId;
  if (stageId) {
    const stage = await prisma.taskStage.findUnique({ where: { id: stageId } });
    if (!stage) {
      throw new AppError("Task stage not found.", 404);
    }
  } else {
    const defaultStage =
      (await prisma.taskStage.findFirst({
        where: { isDefault: true },
        orderBy: { order: "asc" }
      })) ||
      (await prisma.taskStage.findFirst({
        orderBy: { order: "asc" }
      }));
    resolvedStageId = defaultStage?.id || null;
  }

  const task = await prisma.task.create({
    data: {
      title,
      description: description || null,
      assignedToId,
      assignedById: actorId,
      clientId,
      dueDate: parseDate(dueDate, "dueDate"),
      priority,
      stageId: resolvedStageId
    },
    include: taskInclude
  });

  await Promise.all([
    logActivity(ActivityAction.TASK_CREATED, actorId, task.id),
    logActivity(ActivityAction.TASK_ASSIGNED, actorId, task.id)
  ]);
  await sendTaskAssignmentNotifications(task);

  // Sync to Google Calendar — create event on the assigned user's calendar
  try {
    const [assignedUserRecord, adminRecord] = await Promise.all([
      prisma.user.findUnique({ where: { id: assignedToId }, select: { googleCalendarConnected: true, email: true, name: true } }),
      prisma.user.findUnique({ where: { id: actorId }, select: { email: true, name: true } }),
    ]);
    if (assignedUserRecord?.googleCalendarConnected) {
      const attendees = [
        { email: assignedUserRecord.email, name: assignedUserRecord.name },
        ...(adminRecord?.email ? [{ email: adminRecord.email, name: adminRecord.name }] : []),
      ];
      const googleEventId = await googleCalendar.syncEventToGoogle(
        assignedToId,
        "TASK",
        task.id,
        {
          title: `[Task] ${task.title}`,
          description: `Client: ${task.client.companyName}\nAssigned to: ${assignedUserRecord.name}\nPriority: ${task.priority}\n\n${task.description || ""}`,
          startAt: task.dueDate,
          endAt: task.dueDate,
          attendees,
          addMeetLink: false,
        }
      );
      await prisma.task.update({
        where: { id: task.id },
        data: { googleEventId },
      });
    }
  } catch (gcError) {
    console.error("Failed to sync task to Google Calendar:", gcError.message);
  }

  return task;
}

async function getTasks(actor) {
  if (isDummyMode()) {
    const filtered = actor.role === Role.ADMIN ? tasks : tasks.filter((item) => item.assignedToId === actor.id);
    return filtered
      .map((task) => {
        const assignedTo = findUserById(task.assignedToId);
        const assignedBy = findUserById(task.assignedById);
        const client = clients.find((item) => item.id === task.clientId);
        return {
          ...task,
          assignedTo: assignedTo
            ? {
                id: assignedTo.id,
                name: assignedTo.name,
                email: assignedTo.email,
                role: assignedTo.role
              }
            : null,
          assignedBy: assignedBy
            ? {
                id: assignedBy.id,
                name: assignedBy.name,
                email: assignedBy.email
              }
            : null,
          client: client
            ? {
                id: client.id,
                name: client.name,
                companyName: client.companyName
              }
            : null,
          stage: taskStages.find((item) => item.id === task.stageId)
            ? {
                id: taskStages.find((item) => item.id === task.stageId).id,
                name: taskStages.find((item) => item.id === task.stageId).name,
                order: taskStages.find((item) => item.id === task.stageId).order,
                color: taskStages.find((item) => item.id === task.stageId).color,
                isDefault: taskStages.find((item) => item.id === task.stageId).isDefault
              }
            : null
        };
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }

  const where = actor.role === Role.ADMIN ? {} : { assignedToId: actor.id };
  return prisma.task.findMany({
    where,
    include: taskInclude,
    orderBy: {
      dueDate: "asc"
    }
  });
}

async function updateTask(id, payload, actor) {
  if (isDummyMode()) {
    const taskIndex = tasks.findIndex((item) => item.id === id);
    if (taskIndex === -1) throw new AppError("Task not found.", 404);

    const existing = tasks[taskIndex];
    const data = {};

    if (actor.role === Role.STAFF) {
      if (existing.assignedToId !== actor.id) {
        throw new AppError("Staff can update only their assigned tasks.", 403);
      }

      const allowedKeys = ["status"];
      const incomingKeys = Object.keys(payload);
      if (incomingKeys.some((key) => !allowedKeys.includes(key))) {
        throw new AppError("Staff can only update task status.", 403);
      }

      if (!payload.status || ![TaskStatus.PENDING, TaskStatus.COMPLETED].includes(payload.status)) {
        throw new AppError("status must be PENDING or COMPLETED.", 400);
      }
      data.status = payload.status;
    } else {
      if (payload.title !== undefined) data.title = payload.title;
      if (payload.description !== undefined) data.description = payload.description || null;

      if (payload.assignedToId !== undefined) {
        const assignedUser = findUserById(payload.assignedToId);
        if (!assignedUser) throw new AppError("Assigned user not found.", 404);
        data.assignedToId = payload.assignedToId;
      }

      if (payload.clientId !== undefined) {
        const client = clients.find((item) => item.id === payload.clientId);
        if (!client) throw new AppError("Client not found.", 404);
        data.clientId = payload.clientId;
      }

      if (payload.dueDate !== undefined) {
        data.dueDate = parseDate(payload.dueDate, "dueDate");
        data.reminderSentAt = null;
      }

      if (payload.priority !== undefined) {
        if (![Priority.LOW, Priority.MEDIUM, Priority.HIGH].includes(payload.priority)) {
          throw new AppError("priority must be LOW, MEDIUM or HIGH.", 400);
        }
        data.priority = payload.priority;
      }

      if (payload.status !== undefined) {
        if (![TaskStatus.PENDING, TaskStatus.COMPLETED].includes(payload.status)) {
          throw new AppError("status must be PENDING or COMPLETED.", 400);
        }
        data.status = payload.status;
      }

      if (payload.stageId !== undefined) {
        if (payload.stageId === null) {
          data.stageId = null;
        } else {
          const stage = taskStages.find((item) => item.id === payload.stageId);
          if (!stage) throw new AppError("Task stage not found.", 404);
          data.stageId = payload.stageId;
        }
      }
    }

    if (Object.keys(data).length === 0) {
      throw new AppError("No valid fields were provided for update.", 400);
    }

    const updatedTask = { ...existing, ...data };
    tasks[taskIndex] = updatedTask;

    const activityAction =
      updatedTask.status === TaskStatus.COMPLETED && existing.status !== TaskStatus.COMPLETED
        ? ActivityAction.TASK_COMPLETED
        : ActivityAction.TASK_UPDATED;

    await logActivity(activityAction, actor.id, updatedTask.id);

    const assignedTo = findUserById(updatedTask.assignedToId);
    const assignedBy = findUserById(updatedTask.assignedById);
    const client = clients.find((item) => item.id === updatedTask.clientId);
    const stage = taskStages.find((item) => item.id === updatedTask.stageId);

    return {
      ...updatedTask,
      assignedTo: assignedTo
        ? {
            id: assignedTo.id,
            name: assignedTo.name,
            email: assignedTo.email,
            role: assignedTo.role
          }
        : null,
      assignedBy: assignedBy
        ? {
            id: assignedBy.id,
            name: assignedBy.name,
            email: assignedBy.email
          }
        : null,
      client: client
        ? {
            id: client.id,
            name: client.name,
            companyName: client.companyName
          }
        : null,
      stage: stage
        ? {
            id: stage.id,
            name: stage.name,
            order: stage.order,
            color: stage.color,
            isDefault: stage.isDefault
          }
        : null
    };
  }

  const existing = await prisma.task.findUnique({
    where: { id },
    include: taskInclude
  });

  if (!existing) {
    throw new AppError("Task not found.", 404);
  }

  const data = {};

  if (actor.role === Role.STAFF) {
    if (existing.assignedToId !== actor.id) {
      throw new AppError("Staff can update only their assigned tasks.", 403);
    }

    const allowedKeys = ["status"];
    const incomingKeys = Object.keys(payload);
    if (incomingKeys.some((key) => !allowedKeys.includes(key))) {
      throw new AppError("Staff can only update task status.", 403);
    }

    if (!payload.status || ![TaskStatus.PENDING, TaskStatus.COMPLETED].includes(payload.status)) {
      throw new AppError("status must be PENDING or COMPLETED.", 400);
    }

    data.status = payload.status;
  } else {
    if (payload.title !== undefined) data.title = payload.title;
    if (payload.description !== undefined) data.description = payload.description || null;

    if (payload.assignedToId !== undefined) {
      const assignedUser = await prisma.user.findUnique({ where: { id: payload.assignedToId } });
      if (!assignedUser) {
        throw new AppError("Assigned user not found.", 404);
      }
      data.assignedToId = payload.assignedToId;
    }

    if (payload.clientId !== undefined) {
      const client = await prisma.client.findUnique({ where: { id: payload.clientId } });
      if (!client) {
        throw new AppError("Client not found.", 404);
      }
      data.clientId = payload.clientId;
    }

    if (payload.dueDate !== undefined) {
      data.dueDate = parseDate(payload.dueDate, "dueDate");
      data.reminderSentAt = null;
    }

    if (payload.priority !== undefined) {
      if (![Priority.LOW, Priority.MEDIUM, Priority.HIGH].includes(payload.priority)) {
        throw new AppError("priority must be LOW, MEDIUM or HIGH.", 400);
      }
      data.priority = payload.priority;
    }

    if (payload.status !== undefined) {
      if (![TaskStatus.PENDING, TaskStatus.COMPLETED].includes(payload.status)) {
        throw new AppError("status must be PENDING or COMPLETED.", 400);
      }
      data.status = payload.status;
    }

    if (payload.stageId !== undefined) {
      if (payload.stageId === null) {
        data.stageId = null;
      } else {
        const stage = await prisma.taskStage.findUnique({ where: { id: payload.stageId } });
        if (!stage) {
          throw new AppError("Task stage not found.", 404);
        }
        data.stageId = payload.stageId;
      }
    }
  }

  if (Object.keys(data).length === 0) {
    throw new AppError("No valid fields were provided for update.", 400);
  }

  const updatedTask = await prisma.task.update({
    where: { id },
    data,
    include: taskInclude
  });

  const activityAction =
    updatedTask.status === TaskStatus.COMPLETED && existing.status !== TaskStatus.COMPLETED
      ? ActivityAction.TASK_COMPLETED
      : ActivityAction.TASK_UPDATED;

  await logActivity(activityAction, actor.id, updatedTask.id);

  if (actor.role === Role.ADMIN && data.assignedToId && data.assignedToId !== existing.assignedToId) {
    await sendTaskAssignmentNotifications(updatedTask);
  }

  // Sync changes to Google Calendar — update on the assigned user's calendar
  const calendarEvent = await prisma.calendarEvent.findFirst({
    where: { sourceType: "TASK", sourceId: id },
    select: { id: true, userId: true, googleEventId: true },
  });

  const shouldSyncEvent = data.dueDate || data.title || data.description || data.priority || data.assignedToId;
  const assignedToChanged = data.assignedToId && data.assignedToId !== existing.assignedToId;

  if (calendarEvent && shouldSyncEvent) {
    if (assignedToChanged) {
      // Re-assigned — delete event from old assignee's calendar
      try {
        await googleCalendar.syncEventDelete(calendarEvent.userId, "TASK", id);
      } catch (gcError) {
        console.error("Failed to delete old task event from Google Calendar:", gcError.message);
      }

      // Create event in new assignee's calendar if they have Google connected
      try {
        const newAssignee = await prisma.user.findUnique({
          where: { id: data.assignedToId },
          select: { googleCalendarConnected: true, email: true, name: true },
        });
        if (newAssignee?.googleCalendarConnected) {
          const newGoogleEventId = await googleCalendar.syncEventToGoogle(
            data.assignedToId,
            "TASK",
            id,
            {
              title: `[Task] ${updatedTask.title}`,
              description: `Client: ${updatedTask.client.companyName}\nAssigned to: ${newAssignee.name}\nPriority: ${updatedTask.priority}\n\n${updatedTask.description || ""}`,
              startAt: updatedTask.dueDate,
              endAt: updatedTask.dueDate,
              attendees: [
                { email: newAssignee.email, name: newAssignee.name },
              ],
              addMeetLink: false,
            }
          );
          await prisma.task.update({
            where: { id },
            data: { googleEventId: newGoogleEventId },
          });
        } else {
          // New assignee doesn't have Google Calendar — clear the event reference
          await prisma.task.update({
            where: { id },
            data: { googleEventId: null },
          });
        }
      } catch (gcError) {
        console.error("Failed to create task event in new assignee's Google Calendar:", gcError.message);
      }
    } else if (data.dueDate || data.title || data.description || data.priority) {
      // Same assignee — update existing event on their calendar
      try {
        await googleCalendar.syncEventUpdate(
          calendarEvent.userId,
          "TASK",
          id,
          {
            title: `[Task] ${updatedTask.title}`,
            description: `Client: ${updatedTask.client.companyName}\nAssigned to: ${updatedTask.assignedTo.name}\nPriority: ${updatedTask.priority}\n\n${updatedTask.description || ""}`,
            startAt: updatedTask.dueDate,
            endAt: updatedTask.dueDate,
            attendees: [
              { email: updatedTask.assignedTo.email, name: updatedTask.assignedTo.name },
            ],
            addMeetLink: false,
          }
        );
      } catch (gcError) {
        console.error("Failed to sync task update to Google Calendar:", gcError.message);
      }
    }
  } else if (!calendarEvent && assignedToChanged && data.assignedToId) {
    // No existing CalendarEvent but re-assigned — try creating one for the new assignee
    try {
      const newAssignee = await prisma.user.findUnique({
        where: { id: data.assignedToId },
        select: { googleCalendarConnected: true, email: true, name: true },
      });
      if (newAssignee?.googleCalendarConnected) {
        const newGoogleEventId = await googleCalendar.syncEventToGoogle(
          data.assignedToId,
          "TASK",
          id,
          {
            title: `[Task] ${updatedTask.title}`,
            description: `Client: ${updatedTask.client.companyName}\nAssigned to: ${newAssignee.name}\nPriority: ${updatedTask.priority}\n\n${updatedTask.description || ""}`,
            startAt: updatedTask.dueDate,
            endAt: updatedTask.dueDate,
            attendees: [
              { email: newAssignee.email, name: newAssignee.name },
            ],
            addMeetLink: false,
          }
        );
        await prisma.task.update({
          where: { id },
          data: { googleEventId: newGoogleEventId },
        });
      }
    } catch (gcError) {
      console.error("Failed to create task event in new assignee's Google Calendar:", gcError.message);
    }
  }

  return updatedTask;
}

async function deleteTask(id, actorId) {
  if (isDummyMode()) {
    const taskIndex = tasks.findIndex((item) => item.id === id);
    if (taskIndex === -1) throw new AppError("Task not found.", 404);
    tasks.splice(taskIndex, 1);
    await logActivity(ActivityAction.TASK_DELETED, actorId, id);
    return;
  }

  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError("Task not found.", 404);
  }

  // Delete from Google Calendar — find the event owner from CalendarEvent table
  const calendarEvent = await prisma.calendarEvent.findFirst({
    where: { sourceType: "TASK", sourceId: id },
    select: { userId: true },
  });
  if (calendarEvent) {
    try {
      await googleCalendar.syncEventDelete(calendarEvent.userId, "TASK", id);
    } catch (gcError) {
      console.error("Failed to delete task from Google Calendar:", gcError.message);
    }
  }

  await prisma.task.delete({ where: { id } });
  await logActivity(ActivityAction.TASK_DELETED, actorId, id);
}

module.exports = {
  createTask,
  getTasks,
  updateTask,
  deleteTask
};
