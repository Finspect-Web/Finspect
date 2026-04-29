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

router.use(authenticate);

router.post("/", authorize("ADMIN"), createCredentialController);
router.get("/:clientId", authorize("ADMIN", "STAFF"), getCredentialsByClientController);
router.put("/:id", authorize("ADMIN"), updateCredentialController);
router.delete("/:id", authorize("ADMIN"), deleteCredentialController);

module.exports = router;
