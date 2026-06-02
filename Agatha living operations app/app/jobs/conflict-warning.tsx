"use client";

import { useEffect, useState } from "react";

type CleanerConflict = {
  cleaner_id: string;
  job_date: string;
  job_id: string;
  property_name: string;
};

type CleanerConflictWarningProps = {
  conflicts: CleanerConflict[];
  fixedDate?: string;
};

export function CleanerConflictWarning({ conflicts, fixedDate }: CleanerConflictWarningProps) {
  const [message, setMessage] = useState("");

  useEffect(() => {
    const updateWarning = () => {
      const cleanerId = (document.querySelector("[name='cleaner_id']") as HTMLSelectElement | null)?.value ?? "";
      const jobDate = fixedDate || (document.querySelector("[name='job_date']") as HTMLInputElement | null)?.value || "";
      const conflict = conflicts.find((item) => item.cleaner_id === cleanerId && item.job_date === jobDate);

      setMessage(conflict ? `This cleaner already has a job at ${conflict.property_name} on this date.` : "");
    };

    updateWarning();
    document.addEventListener("change", updateWarning);
    document.addEventListener("input", updateWarning);

    return () => {
      document.removeEventListener("change", updateWarning);
      document.removeEventListener("input", updateWarning);
    };
  }, [conflicts, fixedDate]);

  return message ? <p className="sync-message sync-missing">{message}</p> : null;
}
