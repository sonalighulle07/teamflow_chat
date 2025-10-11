// routes/activityRoutes.js
import express from "express";
import { fetchUserActivities, addActivity, readActivity } from "../controllers/activityController.js";

const router = express.Router();

router.get("/:userId", fetchUserActivities); // get all activities for a user
router.post("/", addActivity);                // create new activity
router.put("/read/:id", readActivity);       // mark as read

export default router;
