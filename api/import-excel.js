import { createClient } from "@supabase/supabase-js";
import formidable from "formidable";
import fs from "fs";
import xlsx from "xlsx";

/**
 * IMPORTANT:
 * Vercel Serverless does NOT support body parsing for file uploads.
 * We must disable it explicitly.
 */
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Supabase Admin Client (Service Role)
 * NEVER expose this key on frontend
 */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Allow only POST
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Only POST requests are allowed",
    });
  }

  try {
    // Parse multipart/form-data
    const form = formidable({
      multiples: false,
      keepExtensions: true,
    });

    const { files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const excelFile = files.file;

    if (!excelFile) {
      return res.status(400).json({
        success: false,
        message: "Excel file is required (field name: file)",
      });
    }

    // Read Excel file
    const workbook = xlsx.readFile(excelFile.filepath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rows = xlsx.utils.sheet_to_json(sheet);

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: "Excel file is empty",
      });
    }

    /**
     * EXPECTED EXCEL COLUMNS (example)
     * name | phone | email | gender | dob
     * Adjust mapping as needed
     */
    const leads = rows.map((row) => ({
      name: row.name || null,
      phone: row.phone || null,
      email: row.email || null,
      gender: row.gender || null,
      dob: row.dob || null,
      source: "excel_import",
      created_at: new Date().toISOString(),
    }));

    // Insert into Supabase
    const { error } = await supabase
      .from("leads")
      .insert(leads);

    if (error) {
      console.error("Supabase Insert Error:", error);
      return res.status(500).json({
        success: false,
        message: "Database insert failed",
        error: error.message,
      });
    }

    // Cleanup temp file
    fs.unlinkSync(excelFile.filepath);

    return res.status(200).json({
      success: true,
      message: "Excel imported successfully",
      inserted: leads.length,
    });

  } catch (err) {
    console.error("Import Error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
}
