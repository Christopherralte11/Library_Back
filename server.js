import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";

// Import routes
import { bookManagementRouter } from "./Routes/BookManagement.js";
import { issueReturnRouter } from "./Routes/IssueReturn.js";
import { adminRouter } from "./Routes/AdminRoute.js";

dotenv.config();

const app = express();
const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:3000";

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use("/api/books", bookManagementRouter);
app.use("/api/issues", issueReturnRouter);
app.use("/api/admin", adminRouter);

// Serve static files
app.use(express.static("Public"));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`API Base URL: ${apiBaseUrl}`);
});
