import formidable from "formidable";
import fs from "fs";
import xlsx from "xlsx";
import { createClient } from "@supabase/supabase-js";

export const config = {
  api: {
    bodyParser: false
  }
};

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const form = formidable({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: "Form parse error" });
    }

    const file = files.file;

    if (!file) {
      return res.status(400).json({ error: "Excel file missing (key must be 'file')" });
    }

    try {
      const workbook = xlsx.readFile(file.filepath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = xlsx.utils.sheet_to_json(sheet);

      if (!rows.length) {
        return res.status(400).json({ error: "Excel empty" });
      }

      const { error } = await supabase
        .from("leads")
        .insert(rows);

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({
        success: true,
        inserted: rows.length
      });

    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });
}
