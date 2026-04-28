const express = require("express");
const {
  createClientController,
  getClientsController,
  getClientByIdController,
  updateClientController,
  deleteClientController
} = require("../controllers/clients.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");

const router = express.Router();

router.use(authenticate);

router.post("/", authorize("ADMIN"), createClientController);
router.get("/", getClientsController);
router.get("/:id", getClientByIdController);
router.put("/:id", authorize("ADMIN"), updateClientController);
router.delete("/:id", authorize("ADMIN"), deleteClientController);

module.exports = router;
