import { Router } from "express";
import { authenticateToken, authorizeRoles } from "../middlewares/authMiddleware.js";
import {
  addAccessRole,
  createManagedUser,
  getMyModules,
  getUserModuleAccess,
  listAccessUsers,
  listModules,
  listRolePermissionOverview,
  updateUserModuleAccess,
} from "../controllers/accessController.js";

const router = Router();

router.use(authenticateToken);

router.get("/modules", listModules);
router.get("/my-modules", getMyModules);

router.get("/roles", authorizeRoles("ADMIN", "SUPER_ADMIN"), listRolePermissionOverview);
router.post("/roles", authorizeRoles("ADMIN", "SUPER_ADMIN"), addAccessRole);
router.get("/users", authorizeRoles("ADMIN", "SUPER_ADMIN"), listAccessUsers);
router.post("/users", authorizeRoles("ADMIN", "SUPER_ADMIN"), createManagedUser);
router.get("/users/:userId", authorizeRoles("ADMIN", "SUPER_ADMIN"), getUserModuleAccess);
router.put("/users/:userId", authorizeRoles("ADMIN", "SUPER_ADMIN"), updateUserModuleAccess);

export default router;
