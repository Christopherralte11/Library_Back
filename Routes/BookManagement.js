import express from "express";
import pool from "../utils/db.js";
import generateUniqueId from "generate-unique-id";
import dotenv from "dotenv";
import multer from "multer";
import XLSX from "xlsx";
import authenticateToken from "../middleware/auth.js"; // <-- your auth middleware

dotenv.config();

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Add Book Record
router.post("/add_book", authenticateToken, async (req, res) => {
  const {
    accession_no,
    class_no,
    title_of_the_book,
    name_of_the_author,
    volume_no,
    publisher,
    year,
    place,
    price,
    isbn_issn_no,
    language,
    subject_heading,
    no_of_pages_contain,
    source,
  } = req.body;

  const id = generateUniqueId();

  const sql =
    "INSERT INTO book_management (id, accession_no, class_no, title_of_the_book, name_of_the_author, volume_no, publisher, year, place, price, isbn_issn_no, language, subject_heading, no_of_pages_contain, source) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)";

  try {
    await pool.query(sql, [
      id,
      accession_no,
      class_no,
      title_of_the_book,
      name_of_the_author,
      volume_no,
      publisher,
      year,
      place,
      price,
      isbn_issn_no,
      language,
      subject_heading,
      no_of_pages_contain,
      source,
    ]);
    return res.json({ Status: true, Message: "Book added successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ Status: false, Error: "Query Error" });
  }
});

// Get all Books
router.get("/all_books", authenticateToken, async (req, res) => {
  const sql = "SELECT * FROM book_management";
  try {
    const result = await pool.query(sql);
    return res.json({ Status: true, Books: result.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ Status: false, Error: "Query Error" });
  }
});

// Get Book by ID
router.get("/book/:id", authenticateToken, async (req, res) => {
  const id = req.params.id;
  const sql = "SELECT * FROM book_management WHERE id = $1";

  try {
    const result = await pool.query(sql, [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ Status: false, Error: "Book not found" });
    }
    return res.json({ Status: true, Book: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ Status: false, Error: "Query Error" });
  }
});

// Update Book Record
router.put("/edit_book/:id", authenticateToken, async (req, res) => {
  const id = req.params.id;
  const {
    accession_no,
    class_no,
    title_of_the_book,
    name_of_the_author,
    volume_no,
    publisher,
    year,
    place,
    price,
    isbn_issn_no,
    language,
    subject_heading,
    no_of_pages_contain,
    source,
  } = req.body;

  const updateQuery =
    "UPDATE book_management SET accession_no = $1, class_no = $2, title_of_the_book = $3, name_of_the_author = $4, volume_no = $5, publisher = $6, year = $7, place = $8, price = $9, isbn_issn_no = $10, language = $11, subject_heading = $12, no_of_pages_contain = $13, source = $14 WHERE id = $15";
  try {
    await pool.query(updateQuery, [
      accession_no || null,
      class_no || null,
      title_of_the_book || null,
      name_of_the_author || null,
      volume_no || null,
      publisher || null,
      year || null,
      place || null,
      price || null,
      isbn_issn_no || null,
      language || null,
      subject_heading || null,
      no_of_pages_contain || null,
      source || null,
      id,
    ]);

    return res.json({ Status: true, Message: "Book updated successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ Status: false, Error: "Update failed" });
  }
});

// Delete Book Record
router.delete("/delete_book/:id", authenticateToken, async (req, res) => {
  const id = req.params.id;
  const deleteQuery = "DELETE FROM book_management WHERE id = $1";

  try {
    await pool.query(deleteQuery, [id]);
    return res.json({ Status: true, Message: "Book deleted successfully" });
  } catch (err) {
    console.error("Query Error:", err);
    return res.status(500).json({ Status: false, Error: "Query Error" });
  }
});

// Count number of Books
router.get("/book_count", authenticateToken, async (req, res) => {
  const sql = "SELECT COUNT(*) AS book_count FROM book_management";
  try {
    const result = await pool.query(sql);
    return res.json({ Status: true, BookCount: result.rows[0].book_count });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ Status: false, Error: "Query Error" });
  }
});

// Export Books to Excel
router.get("/export_books", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM book_management");

    if (!result.rows.length) {
      return res.status(404).json({ message: "No books found" });
    }

    const books = result.rows;

    const formattedBooks = books.map((book) => ({
      accession_no: book.accession_no || "",
      class_no: book.class_no || "",
      title_of_the_book: book.title_of_the_book || "",
      name_of_the_author: book.name_of_the_author || "",
      volume_no: book.volume_no || "",
      publisher: book.publisher || "",
      year: book.year || "",
      place: book.place || "",
      price: book.price || "",
      isbn_issn_no: book.isbn_issn_no || "",
      language: book.language || "",
      subject_heading: book.subject_heading || "",
      no_of_pages_contain: book.no_of_pages_contain || "",
      source: book.source || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedBooks);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Books");

    res.setHeader("Content-Disposition", "attachment; filename=books.xlsx");
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
    res.send(buffer);
  } catch (error) {
    console.error("Error in exporting books:", error);
    res
      .status(500)
      .json({ message: "Error generating Excel file", error: error });
  }
});

// Import Books from Excel
router.post(
  "/import_books",
  authenticateToken,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ Status: false, Error: "No file uploaded" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rawBooks = XLSX.utils.sheet_to_json(sheet);

      if (!rawBooks.length) {
        return res
          .status(400)
          .json({ Status: false, Error: "Empty file or incorrect format" });
      }

      const books = rawBooks.map((book) => ({
        id: generateUniqueId(),
        accession_no:
          book["accession_no"] || book["Accession No"] || "".toString().trim(),
        class_no: book["class_no"] || book["Class No"] || "".toString().trim(),
        title_of_the_book:
          book["title_of_the_book"] || book["Title"] || "".trim(),
        name_of_the_author:
          book["name_of_the_author"] || book["Author"] || "".trim(),
        volume_no:
          book["volume_no"] || book["Volume No"] || "".toString().trim(),
        publisher: book["publisher"] || book["Publisher"] || "".trim(),
        year: book["year"] || book["Year"] || "".toString().trim(),
        place: book["place"] || book["Place"] || "".trim(),
        price: book["price"] || book["Price"] || "".toString().trim(),
        isbn_issn_no: book["isbn_issn_no"] || book["ISBN/ISSN No"] || "".trim(),
        language: book["language"] || book["Language"] || "".trim(),
        subject_heading:
          book["subject_heading"] || book["Subject Heading"] || "".trim(),
        no_of_pages_contain:
          book["no_of_pages_contain"] ||
          book["No of Pages"] ||
          "".toString().trim(),
        source: book["source"] || book["Source"] || "".trim(),
      }));

      const insertPromises = books.map((book) => {
        const sql =
          "INSERT INTO book_management (id, accession_no, class_no, title_of_the_book, name_of_the_author, volume_no, publisher, year, place, price, isbn_issn_no, language, subject_heading, no_of_pages_contain, source) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)";
        return pool.query(sql, [
          book.id,
          book.accession_no,
          book.class_no,
          book.title_of_the_book,
          book.name_of_the_author,
          book.volume_no,
          book.publisher,
          book.year,
          book.place,
          book.price,
          book.isbn_issn_no,
          book.language,
          book.subject_heading,
          book.no_of_pages_contain,
          book.source,
        ]);
      });

      await Promise.all(insertPromises);

      return res.json({ Status: true, Message: "Books imported successfully" });
    } catch (err) {
      console.error("Import error:", err);
      return res.status(500).json({ Status: false, Error: "Import failed" });
    }
  }
);

export { router as bookManagementRouter };
