import express from "express";
import pool from "../utils/db.js";
import dotenv from "dotenv";
import generateUniqueId from "generate-unique-id";
import authenticateToken from "../middleware/auth.js"; // adjust path if needed

dotenv.config();

const router = express.Router();

// Issue Book Record (without due_date in DB)
router.post("/issue_book", authenticateToken, async (req, res) => {
  const {
    student_name,
    phone_no,
    parental,
    remark,
    accession_no,
    title_of_the_book,
    issued_on,
    volume_no,
    year,
    place,
    price,
    isbn_issn_no,
    language,
    subject_heading,
    no_of_pages_contain,
    source,
    status,
  } = req.body; // Removed `due_date`

  const authorQuery =
    "SELECT name_of_the_author FROM book_management WHERE accession_no = $1";

  try {
    const authorResult = await pool.query(authorQuery, [accession_no]);

    if (authorResult.rowCount === 0) {
      return res.status(404).json({ Status: false, Error: "Book not found" });
    }

    const name_of_the_author = authorResult.rows[0].name_of_the_author;

    // Generate unique issue_id
    const issue_id = generateUniqueId({
      length: 8,
      useLetters: true,
      useNumbers: true,
      separator: "-",
    });

    // Insert without `due_date`
    const sql = `
    INSERT INTO issue_return_book (
      issue_id, student_name, phone_no, parental, remark, accession_no, title_of_the_book, issued_on,
      status, name_of_the_author, volume_no, year, place, price, isbn_issn_no,
      language, subject_heading, no_of_pages_contain, source
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
    )`;

    await pool.query(sql, [
      issue_id,
      student_name,
      phone_no,
      parental,
      remark,
      accession_no,
      title_of_the_book,
      issued_on,
      "Pending",
      name_of_the_author,
      volume_no,
      year,
      place,
      price,
      isbn_issn_no,
      language,
      subject_heading,
      no_of_pages_contain,
      source,
    ]);

    return res.json({
      Status: true,
      Result: "Book issued successfully",
      IssueId: issue_id,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ Status: false, Error: "Issue failed" });
  }
});

// Get Pending Book Issues by Accession Number
router.get(
  "/pending_book/:accession_no",
  authenticateToken,
  async (req, res) => {
    const accession_no = req.params.accession_no;
    console.log("Received accession_no:", accession_no);

    const sql = `SELECT * FROM book_management WHERE accession_no = $1`;

    try {
      const result = await pool.query(sql, [accession_no]);
      console.log("Query result:", result.rows);

      if (result.rowCount === 0) {
        return res
          .status(404)
          .json({ Status: false, Error: "Book not found in the library" });
      }

      return res.json({ Status: true, BookDetails: result.rows[0] });
    } catch (err) {
      console.error("Error in query:", err);
      return res.status(500).json({ Status: false, Error: "Query Error" });
    }
  }
);

// Mark Book as Returned
router.put("/return_book/:issue_id", authenticateToken, async (req, res) => {
  const { issue_id } = req.params;

  const sql = `
    UPDATE issue_return_book
    SET status = 'Returned'
    WHERE issue_id = $1 AND status = 'Pending'`;

  try {
    const result = await pool.query(sql, [issue_id]);
    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ Status: false, Error: "Issue not found or already returned" });
    }
    return res.json({ Status: true, Result: "Book returned successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ Status: false, Error: "Return failed" });
  }
});

// Get All Issue Records (for reporting or admin purposes)
router.get("/all_issues", authenticateToken, async (req, res) => {
  const sql = "SELECT * FROM issue_return_book";
  try {
    const result = await pool.query(sql);
    return res.json({ Status: true, Issues: result.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ Status: false, Error: "Query Error" });
  }
});

// Delete an Issued Book Record
router.delete(
  "/delete_issue/:issue_id",
  authenticateToken,
  async (req, res) => {
    const { issue_id } = req.params;

    const sql = `DELETE FROM issue_return_book WHERE issue_id = $1`;

    try {
      const result = await pool.query(sql, [issue_id]);

      if (result.rowCount === 0) {
        return res
          .status(404)
          .json({ Status: false, Error: "Issue record not found" });
      }

      return res.json({
        Status: true,
        Result: "Issue record deleted successfully",
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ Status: false, Error: "Delete failed" });
    }
  }
);

// Get all issued books (Pending + Returned)
router.get("/all_issued_books", authenticateToken, async (req, res) => {
  const sql =
    "SELECT * FROM issue_return_book WHERE status IN ('Pending', 'Returned')";

  try {
    const result = await pool.query(sql);
    return res.json({ Status: true, Issues: result.rows });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ Status: false, Error: "Error fetching all issued books" });
  }
});

// Count how many books are still pending
router.get("/count_pending_books", authenticateToken, async (req, res) => {
  const sql =
    "SELECT COUNT(*) FROM issue_return_book WHERE status IN ('Pending')";

  try {
    const result = await pool.query(sql);
    const pendingCount = result.rows[0].count;

    return res.json({ Status: true, PendingBooksCount: pendingCount });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ Status: false, Error: "Error fetching pending count" });
  }
});

// Get Total Issued Count for Each Book by Accession Number (Including Returned)
router.get("/issued_books_count", authenticateToken, async (req, res) => {
  const sql = `
    SELECT accession_no, COUNT(*) AS issued_count 
    FROM issue_return_book 
    WHERE status IN ('Pending', 'Returned') 
    GROUP BY accession_no
  `;

  try {
    const result = await pool.query(sql);
    return res.json({ Status: true, IssuedBooks: result.rows });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ Status: false, Error: "Error fetching issued book count" });
  }
});

// Get returned issues by accession number
router.get(
  "/returned_issues/:accession_no",
  authenticateToken,
  async (req, res) => {
    const accession_no = req.params.accession_no;

    const sql = `
    SELECT * FROM issue_return_book
    WHERE accession_no = $1 AND status = 'Returned'
  `;

    try {
      const result = await pool.query(sql, [accession_no]);

      if (result.rowCount === 0) {
        return res.status(404).json({
          Status: false,
          Error: "No returned issues found for this book",
        });
      }

      return res.json({ Status: true, ReturnedIssues: result.rows });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ Status: false, Error: "Query Error" });
    }
  }
);

export { router as issueReturnRouter };
