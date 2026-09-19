/**
 * Payslip PDF Generator for browser download
 */
export function downloadPayslipPdf(slip, user) {
  const empName = user?.name || slip?.user?.name || "Employee";
  const empId = user?.employeeId || slip?.user?.employeeId || "EMP-001";
  const dept = user?.department || slip?.user?.department || "Operations";
  const designation = user?.designation || slip?.user?.designation || "Software Engineer";
  const monthLabel = slip?.monthLabel || slip?.month || "Salary Slip";
  
  const gross = Number(slip?.grossPay || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
  const pf = Number(slip?.pfDeduction || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
  const tax = Number(slip?.governmentTax || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
  const net = Number(slip?.netPay || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
  const status = slip?.status || "DISBURSED";

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payslip - ${monthLabel} - ${empName}</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      color: #1e293b;
      margin: 0;
      padding: 30px;
      background: #ffffff;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 15px;
      margin-bottom: 25px;
    }
    .company-title {
      font-size: 22px;
      font-weight: bold;
      color: #1e3a8a;
    }
    .company-sub {
      font-size: 11px;
      color: #64748b;
    }
    .slip-title {
      font-size: 18px;
      font-weight: bold;
      color: #0f172a;
      text-align: right;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 25px;
      font-size: 13px;
    }
    .info-item span {
      font-weight: bold;
      color: #475569;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
      font-size: 13px;
    }
    .table th {
      background: #2563eb;
      color: #ffffff;
      text-align: left;
      padding: 10px 12px;
      font-size: 12px;
    }
    .table td {
      padding: 10px 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    .net-box {
      background: #eff6ff;
      border: 2px solid #3b82f6;
      border-radius: 8px;
      padding: 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 16px;
      font-weight: bold;
      color: #1e40af;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 15px;
    }
    .stamp {
      display: inline-block;
      padding: 4px 12px;
      background: #dcfce7;
      color: #166534;
      border: 1px solid #86efac;
      border-radius: 20px;
      font-size: 11px;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company-title">SoftTechCloud Enterprise HRMS</div>
      <div class="company-sub">Official Salary Disbursal Slip</div>
    </div>
    <div>
      <div class="slip-title">Salary Slip</div>
      <div style="text-align: right; margin-top: 4px;"><span class="stamp">${status}</span></div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-item"><span>Employee Name:</span> ${empName}</div>
    <div class="info-item"><span>Pay Period:</span> ${monthLabel}</div>
    <div class="info-item"><span>Employee ID:</span> ${empId}</div>
    <div class="info-item"><span>Department:</span> ${dept}</div>
    <div class="info-item"><span>Designation:</span> ${designation}</div>
    <div class="info-item"><span>Status:</span> ${status}</div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th>Earnings & Allowances</th>
        <th style="text-align: right;">Amount (INR)</th>
        <th>Deductions</th>
        <th style="text-align: right;">Amount (INR)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Gross Salary</td>
        <td style="text-align: right; font-weight: bold;">₹ ${gross}</td>
        <td>Provident Fund (PF)</td>
        <td style="text-align: right;">₹ ${pf}</td>
      </tr>
      <tr>
        <td>Basic & Allowances</td>
        <td style="text-align: right;">Included</td>
        <td>Government Income Tax</td>
        <td style="text-align: right;">₹ ${tax}</td>
      </tr>
    </tbody>
  </table>

  <div class="net-box">
    <span>Net Salary Disbursed (In Hand):</span>
    <span>₹ ${net}</span>
  </div>

  <div class="footer">
    This is a computer-generated salary slip and requires no signature. SoftTechCloud Enterprise Portal.
  </div>

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>
  `;

  const blob = new Blob([htmlContent], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (!win) {
    // Fallback: direct download link if popup blocked
    const a = document.createElement("a");
    a.href = url;
    a.download = `Salary_Slip_${empName.replace(/\s+/g, "_")}_${slip?.month || "Period"}.html`;
    a.click();
  }
}
