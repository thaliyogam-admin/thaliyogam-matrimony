import XLSX from "xlsx";
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
  // ✅ Handle browser GET safely
  if (req.method === "GET") {
    return res.status(200).json({
      message: "Excel import API is live. Use POST to upload Excel file."
    });
  }

  // ❌ Block all non-POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const buffers = [];
    for await (const chunk of req) {
      buffers.push(chunk);
    }
    const buffer = Buffer.concat(buffers);

    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    if (!rows.length) {
      return res.status(400).json({ error: "Excel file is empty" });
    }

    const leads = rows.map((row) => ({
      name: row.Name || null,
      gender: row.Gender || null,
      education: row.Education || null,
      occupation: row.Occupation || null,
      religion: row.Religion || null,
      caste: row.Caste || null,
      mobile: String(row.MobileNo || "").trim(),
      star: row.Star || null,
      jathakam_type: row["Type Of Jathakam"] || null,
      source: "EXCEL",
      status: "NEW"
    }));

    const { error } = await supabase
      .from("leads")
      .insert(leads, { ignoreDuplicates: true });

    if (error) throw error;

    return res.json({
      success: true,
      inserted: leads.length
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
