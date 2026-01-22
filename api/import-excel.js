import formidable from "formidable";
import fs from "fs";
import XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

export const config = {
  api: {
    bodyParser: false, // REQUIRED for file upload
  },
};

// Supabase admin client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // ❌ Block GET
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed. Use POST with Excel file.",
    });
  }

  try {
    const form = formidable({
      multiples: false,
      keepExtensions: true,
    });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        return res.status(400).json({
          success: false,
          error: "File upload failed",
        });
      }

      const file = files.file;
      if (!file) {
        return res.status(400).json({
          success: false,
          error: "Excel file is required (field name: file)",
        });
      }

      // Read Excel
      const workbook = XLSX.readFile(file.filepath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet);

      if (!rows.length) {
        return res.status(400).json({
          success: false,
          error: "Excel file is empty",
        });
      }

      // Insert rows into Supabase (example: leads table)
      const { error } = await supabase
        .from("leads")
        .insert(rows);

      if (error) {
        console.error(error);
        return res.status(500).json({
          success: false,
          error: "Database insert failed",
          details: error.message,
        });
      }

      return res.status(200).json({
        success: true,
        inserted: rows.length,
      });
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}
