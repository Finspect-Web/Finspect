const express = require("express");
const {
  createCredentialController,
  getCredentialsByClientController,
  getCredentialPasswordController,
  updateCredentialController,
  deleteCredentialController
} = require("../controllers/credentials.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { checkRole, checkClientAccess } = require("../middleware/role.middleware");

const router = express.Router();

router.use(authenticate);

router.post("/", checkRole("ADMIN"), createCredentialController);
router.get("/:id/password", getCredentialPasswordController);
router.get("/:clientId", checkClientAccess, getCredentialsByClientController);
router.put("/:id", checkRole("ADMIN"), updateCredentialController);
router.delete("/:id", checkRole("ADMIN"), deleteCredentialController);

module.exports = router;
