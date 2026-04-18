import { Router } from "express";
import { getData } from "../controllers/data.controller";

const router = Router();

// GET /api/getdata
router.get("/getdata", getData);

export default router;
