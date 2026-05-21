const express = require("express");
const {
  createClientController,
  getClientsController,
  getClientByIdController,
  updateClientController,
  deleteClientController
} = require("../controllers/clients.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { checkRole, checkClientAccess } = require("../middleware/role.middleware");

const router = express.Router();

router.use(authenticate);

router.post("/", checkRole("ADMIN"), createClientController);
router.get("/", getClientsController);
router.get("/:id", checkClientAccess, getClientByIdController);
router.put("/:id", checkRole("ADMIN"), updateClientController);
router.delete("/:id", checkRole("ADMIN"), deleteClientController);

module.exports = router;
