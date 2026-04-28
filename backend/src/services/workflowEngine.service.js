const { Prisma, Role, TaskStatus, Priority } = require("@prisma/client");
const prisma = require("../prisma/client");
const AppError = require("../utils/appError");
const { isDummyMode } = require("../utils/mode");

function ensureWorkflowEngineReady() {
  if (isDummyMode()) {
    throw new AppError("Workflow engine is not available in dummy mode.", 400);
  }
}

function parseDueDate(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError("dueDate must be a valid date.", 400);
  }
  return parsed;
}

function normalizeName(value, fieldName) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    throw new AppError(`${fieldName} is required.`, 400);
  }
  return normalized;
}

function toInteger(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new AppError(`${fieldName} must be an integer.`, 400);
  }
  return parsed;
}

function mapUniqueError(error, targetFields, message) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code !== "P2002") return false;
  const actualTargets = Array.isArray(error.meta?.target) ? error.meta.target : [];
  const requiredTargets = Array.isArray(targetFields) ? targetFields : [targetFields];
  return requiredTargets.every((field) => actualTargets.includes(field)) ? message : false;
}

async function createComplianceType(payload) {
  ensureWorkflowEngineReady();
  const name = normalizeName(payload.name, "name");
  const description = payload.description ? String(payload.description).trim() : null;

  try {
    return await prisma.complianceType.create({
      data: {
        name,
        description
      }
    });
  } catch (error) {
    const uniqueMessage = mapUniqueError(error, "name", "Compliance type already exists.");
    if (uniqueMessage) {
      throw new AppError(uniqueMessage, 409);
    }
    throw error;
  }
}

async function getComplianceTypes() {
  ensureWorkflowEngineReady();
  return prisma.complianceType.findMany({
    orderBy: { name: "asc" }
  });
}

async function createWorkflowTemplate(payload) {
  ensureWorkflowEngineReady();
  const name = normalizeName(payload.name, "name");
  const complianceTypeId = normalizeName(payload.complianceTypeId, "complianceTypeId");

  const complianceType = await prisma.complianceType.findUnique({
    where: { id: complianceTypeId }
  });
  if (!complianceType) {
    throw new AppError("Compliance type not found.", 404);
  }

  try {
    return await prisma.workflowTemplate.create({
      data: {
        name,
        complianceTypeId
      },
      include: {
        complianceType: true
      }
    });
  } catch (error) {
    const uniqueMessage = mapUniqueError(
      error,
      "complianceTypeId",
      "Workflow template already exists for this compliance type."
    );
    if (uniqueMessage) {
      throw new AppError(uniqueMessage, 409);
    }
    throw error;
  }
}

async function getWorkflowByComplianceType(complianceTypeId) {
  ensureWorkflowEngineReady();
  const normalizedComplianceTypeId = normalizeName(complianceTypeId, "complianceTypeId");

  const workflow = await prisma.workflowTemplate.findUnique({
    where: { complianceTypeId: normalizedComplianceTypeId },
    include: {
      complianceType: true,
      steps: {
        orderBy: { order: "asc" }
      }
    }
  });

  if (!workflow) {
    throw new AppError("Workflow template not found for the given compliance type.", 404);
  }

  return workflow;
}

async function createWorkflowStep(payload) {
  ensureWorkflowEngineReady();
  const workflowId = normalizeName(payload.workflowId, "workflowId");
  const name = normalizeName(payload.name, "name");
  const order = toInteger(payload.order, "order");
  const daysOffset = payload.daysOffset === undefined ? 0 : toInteger(payload.daysOffset, "daysOffset");
  const defaultRole = String(payload.defaultRole || "").trim();

  if (order < 1) {
    throw new AppError("order must be at least 1.", 400);
  }
  if (daysOffset < 0) {
    throw new AppError("daysOffset cannot be negative.", 400);
  }
  if (![Role.ADMIN, Role.STAFF].includes(defaultRole)) {
    throw new AppError("defaultRole must be ADMIN or STAFF.", 400);
  }

  const workflow = await prisma.workflowTemplate.findUnique({
    where: { id: workflowId }
  });
  if (!workflow) {
    throw new AppError("Workflow template not found.", 404);
  }

  try {
    return await prisma.workflowStep.create({
      data: {
        name,
        order,
        defaultRole,
        daysOffset,
        workflowId
      }
    });
  } catch (error) {
    const uniqueMessage = mapUniqueError(
      error,
      ["workflowId", "order"],
      "A workflow step with this order already exists in the workflow."
    );
    if (uniqueMessage) {
      throw new AppError(uniqueMessage, 409);
    }
    throw error;
  }
}

async function getWorkflowSteps(workflowId) {
  ensureWorkflowEngineReady();
  const normalizedWorkflowId = normalizeName(workflowId, "workflowId");

  const workflow = await prisma.workflowTemplate.findUnique({
    where: { id: normalizedWorkflowId }
  });
  if (!workflow) {
    throw new AppError("Workflow template not found.", 404);
  }

  return prisma.workflowStep.findMany({
    where: { workflowId: normalizedWorkflowId },
    orderBy: { order: "asc" }
  });
}

function calculateTaskDueDate(baseDueDate, daysOffset) {
  const dueDate = new Date(baseDueDate);
  dueDate.setUTCDate(dueDate.getUTCDate() - daysOffset);
  return dueDate;
}

async function resolveAssigneeMap(steps) {
  const requiredRoles = [...new Set(steps.map((step) => step.defaultRole))];
  const users = await prisma.user.findMany({
    where: {
      role: { in: requiredRoles }
    },
    orderBy: [{ createdAt: "asc" }, { name: "asc" }],
    select: {
      id: true,
      role: true,
      name: true,
      email: true
    }
  });

  const assigneeByRole = {};
  for (const role of requiredRoles) {
    const assignee = users.find((user) => user.role === role);
    if (!assignee) {
      throw new AppError(`No user available for role ${role}.`, 400);
    }
    assigneeByRole[role] = assignee;
  }

  return assigneeByRole;
}

async function createComplianceTasks({ clientId, complianceTypeId, dueDate, initiatedById }) {
  ensureWorkflowEngineReady();
  const normalizedClientId = normalizeName(clientId, "clientId");
  const normalizedComplianceTypeId = normalizeName(complianceTypeId, "complianceTypeId");
  const normalizedInitiatedById = normalizeName(initiatedById, "initiatedById");
  const parsedDueDate = parseDueDate(dueDate);

  const [client, workflow, initiatedBy] = await Promise.all([
    prisma.client.findUnique({
      where: { id: normalizedClientId },
      select: { id: true, name: true, companyName: true }
    }),
    prisma.workflowTemplate.findUnique({
      where: { complianceTypeId: normalizedComplianceTypeId },
      include: {
        complianceType: true,
        steps: {
          orderBy: { order: "asc" }
        }
      }
    }),
    prisma.user.findUnique({
      where: { id: normalizedInitiatedById },
      select: { id: true }
    })
  ]);

  if (!client) {
    throw new AppError("Client not found.", 404);
  }
  if (!workflow) {
    throw new AppError("Workflow template not found for the given compliance type.", 404);
  }
  if (workflow.steps.length === 0) {
    throw new AppError("Workflow template has no steps configured.", 400);
  }
  if (!initiatedBy) {
    throw new AppError("Initiating user not found.", 404);
  }

  const assigneeByRole = await resolveAssigneeMap(workflow.steps);

  const transactionResult = await prisma.$transaction(async (tx) => {
    const workflowInstance = await tx.workflowInstance.create({
      data: {
        clientId: normalizedClientId,
        complianceTypeId: normalizedComplianceTypeId,
        workflowTemplateId: workflow.id,
        dueDate: parsedDueDate,
        createdById: normalizedInitiatedById
      }
    });

    const generatedTasks = [];
    for (const step of workflow.steps) {
      const assignee = assigneeByRole[step.defaultRole];
      const taskDueDate = calculateTaskDueDate(parsedDueDate, step.daysOffset);

      const task = await tx.task.create({
        data: {
          title: `${workflow.complianceType.name} - ${step.name}`,
          description: `Workflow step ${step.order}: ${step.name}`,
          clientId: normalizedClientId,
          assignedToId: assignee.id,
          assignedById: normalizedInitiatedById,
          dueDate: taskDueDate,
          priority: Priority.MEDIUM,
          status: TaskStatus.PENDING,
          workflowStepId: step.id,
          complianceTypeId: normalizedComplianceTypeId,
          workflowInstanceId: workflowInstance.id
        },
        include: {
          workflowStep: {
            select: {
              id: true,
              name: true,
              order: true,
              defaultRole: true,
              daysOffset: true
            }
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          client: {
            select: {
              id: true,
              name: true,
              companyName: true
            }
          }
        }
      });

      generatedTasks.push(task);
    }

    return { workflowInstance, generatedTasks };
  });

  const groupedTasks = workflow.steps.map((step) => ({
    workflowStepId: step.id,
    stepName: step.name,
    order: step.order,
    defaultRole: step.defaultRole,
    daysOffset: step.daysOffset,
    tasks: transactionResult.generatedTasks.filter((task) => task.workflowStepId === step.id)
  }));

  return {
    workflowInstance: transactionResult.workflowInstance,
    workflowTemplate: {
      id: workflow.id,
      name: workflow.name,
      complianceType: workflow.complianceType
    },
    client,
    totalTasks: transactionResult.generatedTasks.length,
    groupedTasks,
    tasks: transactionResult.generatedTasks
  };
}

module.exports = {
  createComplianceType,
  getComplianceTypes,
  createWorkflowTemplate,
  getWorkflowByComplianceType,
  createWorkflowStep,
  getWorkflowSteps,
  createComplianceTasks
};
