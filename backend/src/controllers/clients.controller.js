const asyncHandler = require("../utils/asyncHandler");
const {
  createClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient
} = require("../services/clients.service");

const createClientController = asyncHandler(async (req, res) => {
  const data = await createClient(req.body, req.user.id);
  res.status(201).json({
    success: true,
    message: "Client created successfully.",
    data
  });
});

const getClientsController = asyncHandler(async (req, res) => {
  const data = await getClients(req.user);
  res.status(200).json({
    success: true,
    data
  });
});

const getClientByIdController = asyncHandler(async (req, res) => {
  const data = await getClientById(req.params.id, req.user);
  res.status(200).json({
    success: true,
    data
  });
});

const updateClientController = asyncHandler(async (req, res) => {
  const data = await updateClient(req.params.id, req.body, req.user.id);
  res.status(200).json({
    success: true,
    message: "Client updated successfully.",
    data
  });
});

const deleteClientController = asyncHandler(async (req, res) => {
  await deleteClient(req.params.id, req.user.id);
  res.status(200).json({
    success: true,
    message: "Client deleted successfully."
  });
});

module.exports = {
  createClientController,
  getClientsController,
  getClientByIdController,
  updateClientController,
  deleteClientController
};
