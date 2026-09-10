import { Router } from "express";
import {
  getCompensation,
  getCompensationByUser,
  previewCompensation,
  upsertCompensation,
} from "../controllers/compensationController.js";
import { authenticateToken } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(authenticateToken);

router.get("/", getCompensation);
router.get("/:userId", getCompensationByUser);
router.post("/preview", previewCompensation);
router.post("/", upsertCompensation);
router.put("/", upsertCompensation);

export default router;
