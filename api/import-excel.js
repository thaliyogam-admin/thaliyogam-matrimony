import formidable from "formidable";
import fs from "fs";
import xlsx from "xlsx";
import { createClient } from "@supabase/supabase-js";

export const config = {
  api: {
    bodyParser: false,
  },
};

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // 🚫 Reject non-POST requests
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Use POST method",
    });
  }

  try {
    const form = new formidable.IncomingForm();

    form.parse(req, async (err, fields, files) => {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }

      const file = files.file;
      if (!file) {
        return res.status(400).json({
          success: false,
          message: "Excel file is required",
        });
      }

      const workbook = xlsx.readFile(file.filepath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      const rows = xlsx.utils.sheet_to_json(sheet);

      if (rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Excel file is empty",
        });
      }

      // Insert into leads table
      const { error } = await supabase.from("leads").insert(
        rows.map((row) => ({
          name: row.Name || null,
          gender: row.Gender || null,
          education: row.Education || null,
          occupation: row.Occupation || null,
          religion: row.Religion || null,
          caste: row.Caste || null,
          mobile_no: row.MobileNo || null,
          star: row.Star || null,
          jathakam_type: row["Type Of Jathakam"] || null,
          source: "EXCEL_UPLOAD",
          approved: false,
        }))
      );

      if (error) {
        return res.status(500).json({
          success: false,
          error: error.message,
        });
      }

      return res.status(200).json({
        success: true,
        inserted: rows.length,
      });
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: e.message,
    });
  }
}
