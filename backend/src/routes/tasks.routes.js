const express = require("express");
const {
  createTaskController,
  getTasksController,
  updateTaskController,
  deleteTaskController
} = require("../controllers/tasks.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");

const router = express.Router();

router.use(authenticate);

router.post("/", authorize("ADMIN"), createTaskController);
router.get("/", getTasksController);
router.put("/:id", updateTaskController);
router.delete("/:id", authorize("ADMIN"), deleteTaskController);

module.exports = router;
