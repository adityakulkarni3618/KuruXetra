export function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) return;

  // Gather all headers recursively (flattens 1-level of nested objects like user.fullName)
  const headers = new Set<string>();
  const rows = data.map((item) => {
    const flatItem: Record<string, string> = {};
    Object.keys(item).forEach((key) => {
      const val = item[key];
      if (val && typeof val === "object" && !Array.isArray(val)) {
        // e.g. user: { fullName: "..." } => user_fullName
        Object.keys(val).forEach((subKey) => {
          const flatKey = `${key}_${subKey}`;
          headers.add(flatKey);
          flatItem[flatKey] = String(val[subKey] ?? "");
        });
      } else {
        headers.add(key);
        flatItem[key] = String(val ?? "");
      }
    });
    return flatItem;
  });

  const headerArray = Array.from(headers);
  const csvContent = [
    headerArray.join(","),
    ...rows.map((row) =>
      headerArray
        .map((h) => {
          const val = row[h] || "";
          // Escape quotes and commas
          return `"${val.replace(/"/g, '""')}"`;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function printReport(title: string, headers: string[], rows: any[][]) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const html = `
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
          h1 { font-size: 24px; font-weight: bold; margin-bottom: 20px; border-bottom: 2px solid #ccc; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px 12px; text-align: left; font-size: 14px; }
          th { background-color: #f5f5f5; font-weight: bold; }
          tr:nth-child(even) { background-color: #fafafa; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>Report Generated: ${new Date().toLocaleString()}</p>
        <table>
          <thead>
            <tr>
              ${headers.map((h) => `<th>${h}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) =>
                  `<tr>${row.map((cell) => `<td>${cell ?? "—"}</td>`).join("")}</tr>`
              )
              .join("")}
          </tbody>
        </table>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
