import XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const workbook = XLSX.read(req.body, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

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

    res.json({ success: true, inserted: leads.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
