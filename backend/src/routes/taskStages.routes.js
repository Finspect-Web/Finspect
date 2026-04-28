const express = require("express");
const {
  getTaskStagesController,
  createTaskStageController,
  updateTaskStageController,
  deleteTaskStageController
} = require("../controllers/taskStages.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");

const router = express.Router();

router.use(authenticate);

router.get("/", getTaskStagesController);
router.post("/", authorize("ADMIN"), createTaskStageController);
router.put("/:id", authorize("ADMIN"), updateTaskStageController);
router.delete("/:id", authorize("ADMIN"), deleteTaskStageController);

module.exports = router;
