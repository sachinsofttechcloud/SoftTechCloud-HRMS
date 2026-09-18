import express from "express";
import { authenticateToken } from "../middlewares/authMiddleware.js";
import {
  convertLead,
  createLead,
  findLeadDuplicates,
  getLeadSummary,
  listCandidates,
  listLeads,
  updateLead,
} from "../controllers/leadControllers.js";

const router = express.Router();

router.use(authenticateToken);
router.get("/", listLeads);
router.get("/summary", getLeadSummary);
router.get("/duplicates", findLeadDuplicates);
router.get("/candidates", listCandidates);
router.post("/", createLead);
router.put("/:id", updateLead);
router.post("/:id/convert", convertLead);

export default router;
