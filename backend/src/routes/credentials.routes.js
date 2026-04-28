const express = require("express");
const {
  createCredentialController,
  getCredentialsByClientController,
  updateCredentialController,
  deleteCredentialController
} = require("../controllers/credentials.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");

const router = express.Router();

router.use(authenticate, authorize("ADMIN"));

router.post("/", createCredentialController);
router.get("/:clientId", getCredentialsByClientController);
router.put("/:id", updateCredentialController);
router.delete("/:id", deleteCredentialController);

module.exports = router;
