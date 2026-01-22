import formidable from "formidable";
import fs from "fs";
import xlsx from "xlsx";
import { createClient } from "@supabase/supabase-js";

/**
 * IMPORTANT:
 * Disable bodyParser so formidable can handle file upload
 */
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Supabase Admin Client
 * (Uses Service Role Key – NEVER expose this in frontend)
 */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed. Use POST.",
    });
  }

  try {
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

    const file = files.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "Excel file is required (field name: file)",
      });
    }

    // Read Excel file
    const workbook = xlsx.readFile(file.filepath);
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
     * Example expected Excel columns:
     * name | phone | email | gender | dob
     * Adjust mapping as needed
     */
    const leads = rows.map((row) => ({
      name: row.name || null,
      phone: row.phone || null,
      email: row.email || null,
      gender: row.gender || null,
      dob: row.dob || null,
      source: "excel",
    }));

    const { error } = await supabase.from("leads").insert(leads);

    if (error) {
      console.error("Supabase insert error:", error);
      return res.status(500).json({
        success: false,
        message: "Database insert failed",
        error: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Excel imported successfully",
      count: leads.length,
    });
  } catch (err) {
    console.error("Import error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
}
