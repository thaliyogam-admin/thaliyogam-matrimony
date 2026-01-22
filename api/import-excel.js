import { createClient } from "@supabase/supabase-js";
import XLSX from "xlsx";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({
        error: "Missing Supabase environment variables"
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Read raw binary body
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    if (!buffer.length) {
      return res.status(400).json({ error: "Empty file" });
    }

    // Parse Excel
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(
      workbook.Sheets[sheetName]
    );

    if (!rows.length) {
      return res.status(400).json({ error: "Excel has no rows" });
    }

    // Insert into leads table
    const { error } = await supabase
      .from("leads")
      .insert(rows);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({
      success: true,
      inserted: rows.length
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Import failed",
      details: err.message
    });
  }
}
