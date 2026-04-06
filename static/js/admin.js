let allData = [];

document.addEventListener("DOMContentLoaded", () => {
  loadAllData();
});

function switchTab(tabId, clickedButton) {
  // 1. Move the blue highlight
  const allTabs = document.querySelectorAll(".tab-btn");
  allTabs.forEach((btn) => btn.classList.remove("active"));
  if (clickedButton) clickedButton.classList.add("active");

  // 2. Hide all panels
  const panels = document.querySelectorAll(".panel");
  panels.forEach((p) => p.classList.remove("active"));

  // 3. Show the target panel
  const target = document.getElementById("panel-" + tabId);
  if (target) target.classList.add("active");

  // 4. Maintenance: On mobile, we forced #panel-search to display:block.
  // This ensures if you are on desktop, the tab system still works normally.
}

async function loadAllData() {
  const container = document.getElementById("allRecordsList");
  container.innerHTML =
    '<div class="empty-state"><span class="spinner"></span><p>Fetching database...</p></div>';

  try {
    const response = await fetch("/api/admin/rma/all");
    const result = await response.json();

    if (result.success) {
      allData = result.records;
      renderStats(allData);
      renderTable(allData, "allRecordsList");
    } else {
      showToast("Failed to fetch records.", "error");
    }
  } catch (e) {
    container.innerHTML = `<div class="empty-state"><p>Unable to connect to the database.</p></div>`;
  }
}

function renderStats(records) {
  document.getElementById("stat-total").innerText = records.length;
  // Updated to exclude 'Replaced' from pending count
  document.getElementById("stat-pending").innerText = records.filter(
    (r) => r.status !== "Replaced",
  ).length;
}

function renderTable(records, containerId) {
  const container = document.getElementById(containerId);
  if (records.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>No records found.</p></div>`;
    return;
  }

  let html = `<div style="overflow-x: auto;"><table class="records-table">
        <thead>
            <tr>
                <th>Code & Branch</th>
                <th>Customer</th>
                <th>Product</th>
                <th>Status</th>
                <th>Action</th>
            </tr>
        </thead>
        <tbody>`;

  records.forEach((r) => {
    html += `
            <tr>
                <td>
                    <div style="font-family: monospace; color: var(--accent); font-weight: 700;">${r.rma_code}</div>
                    <div style="font-size: 11px; color: var(--text3);">${r.date}</div>
                </td>
                <td>
                    <div style="font-weight:600">${r.customer_name}</div>
                    <div style="font-size: 12px; color: var(--text2);">${r.contact}</div>
                </td>
                <td>${r.product_name}</td>
                <td><span class="badge ${getStatusBadgeClass(r.status)}">${r.status}</span></td>
                <td>
                    <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px;" onclick='openAdminDetail(${JSON.stringify(r).replace(/'/g, "&#39;")})'>Manage</button>
                </td>
            </tr>
        `;
  });

  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

function getStatusBadgeClass(status) {
  if (status === "Received") return "badge-received";
  if (status === "Fixed") return "badge-fixed";
  if (status === "Replaced") return "badge-replaced";
  if (status === "Cannot Fix") return "badge-sent";
  if (status.includes("Repair")) return "badge-sent";
  return "badge-inhouse";
}

function filterRecords() {
  const q = document
    .getElementById("adminSearchQuery")
    .value.toLowerCase()
    .trim();
  if (!q) {
    document.getElementById("searchResults").innerHTML = "";
    return;
  }

  const filtered = allData.filter(
    (r) =>
      (r.customer_name && r.customer_name.toLowerCase().includes(q)) ||
      (r.rma_code && r.rma_code.toLowerCase().includes(q)) ||
      (r.contact && r.contact.includes(q)),
  );
  renderTable(filtered, "searchResults");
}

function openAdminDetail(r) {
  const modal = document.getElementById("adminModal");
  const content = document.getElementById("modalContent");
  modal.classList.add("show");

  content.innerHTML = `
        <div class="detail-grid">
            <div class="detail-item">
                <div class="dl">Customer</div>
                <div class="dv"><strong>${r.customer_name}</strong><br><span style="font-size:13px;color:var(--text2)">${r.contact}</span></div>
            </div>
            <div class="detail-item">
                <div class="dl">RMA Code</div>
                <div class="dv"><span style="color: var(--accent); font-family: monospace; font-weight:700; font-size: 16px;">${r.rma_code}</span><br><span style="font-size:13px;color:var(--text2)">${r.location}</span></div>
            </div>
            <div class="detail-item full">
                <div class="dl">Device & Issue</div>
                <div class="dv"><strong>${r.product_name}</strong> (S/N: ${r.serial_number || "N/A"})<br>${r.issue}</div>
            </div>
        </div>

        <div class="divider"></div>

        <div class="form-grid">
            <div class="form-group">
                <label>Repair Status</label>
                <select id="upStatus" style="font-weight: 600; color: var(--accent);">
                    <option value="Pending Drop-off" ${r.status === "Pending Drop-off" ? "selected" : ""}>Pending Drop-off</option>
                    <option value="Received" ${r.status === "Received" ? "selected" : ""}>Received</option>
                    <option value="In Repair" ${r.status === "In Repair" ? "selected" : ""}>In Repair</option>
                    <option value="Fixed" ${r.status === "Fixed" ? "selected" : ""}>Fixed</option>
                    <option value="Cannot Fix" ${r.status === "Cannot Fix" ? "selected" : ""}>Cannot Fix</option>
                    <option value="Replaced" ${r.status === "Replaced" ? "selected" : ""}>Replaced</option>
                </select>
            </div>
            <div class="form-group">
                <label>Repair Location</label>
                <select id="upRepairLoc">
                    <option value="In-House" ${r.repair_location === "In-House" ? "selected" : ""}>In-House</option>
                    <option value="We Repair BD" ${r.repair_location === "We Repair BD" ? "selected" : ""}>We Repair BD</option>
                </select>
            </div>
            <div class="form-group full">
                <label>Admin Notes (Internal Use Only)</label>
                <textarea id="upNotes" placeholder="Parts needed, cost estimates...">${r.admin_notes || ""}</textarea>
            </div>
        </div>

        <div class="btn-group">
            <button class="btn btn-primary" onclick="updateStatus('${r.rma_code}')">Save Updates</button>
            <button class="btn btn-secondary" onclick='printFromAdmin(${JSON.stringify(r).replace(/'/g, "&#39;")})'>Print Receipt</button>
        </div>
    `;
}

async function updateStatus(code) {
  const status = document.getElementById("upStatus").value;
  const repair_location = document.getElementById("upRepairLoc").value;
  const admin_notes = document.getElementById("upNotes").value;

  const btn = document.querySelector(".btn-primary");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Saving...';

  try {
    const response = await fetch("/api/admin/rma/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rma_code: code,
        status,
        repair_location,
        admin_notes,
      }),
    });
    const result = await response.json();
    if (result.success) {
      showToast("Ticket Updated", "success");
      closeModal();
      loadAllData();
    }
  } catch (e) {
    showToast("Network error.", "error");
  }
  btn.disabled = false;
}

function closeModal() {
  document.getElementById("adminModal").classList.remove("show");
}
function showToast(msg, type = "info") {
  const t = document.getElementById("toast");
  t.className = `toast ${type} show`;
  t.innerHTML = msg;
  setTimeout(() => t.classList.remove("show"), 3200);
}
// PDF function remains same as previous minimalist version
// --- PDF Generation (Ultra-Minimal / High-End Layout) ---
function printFromAdmin(r) {
  try {
    // 1. Check if the library is actually loaded
    if (!window.jspdf) {
      alert(
        "Error: jsPDF library not loaded. Please add the script tag to your HTML.",
      );
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("p", "mm", "a4");

    const drawSection = (yOffset, label) => {
      const leftMargin = 20;
      const rightMargin = 190;
      const midPoint = 105;

      // Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text("EZ GADGETS.", leftMargin, yOffset + 20);

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120, 120, 120);
      doc.text(label.toUpperCase(), rightMargin, yOffset + 20, {
        align: "right",
      });

      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.2);
      doc.line(leftMargin, yOffset + 26, rightMargin, yOffset + 26);

      // Info Grid
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(150, 150, 150);
      doc.text("RMA NUMBER", leftMargin, yOffset + 36);
      doc.text("DATE", midPoint, yOffset + 36);
      doc.text("BRANCH", 155, yOffset + 36);

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(String(r.rma_code || "N/A"), leftMargin, yOffset + 42);
      doc.setFont("helvetica", "normal");
      doc.text(String(r.date || ""), midPoint, yOffset + 42);
      doc.text(String(r.location || ""), 155, yOffset + 42);

      doc.line(leftMargin, yOffset + 50, rightMargin, yOffset + 50);

      // Customer & Device
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(150, 150, 150);
      doc.text("CLIENT DETAILS", leftMargin, yOffset + 60);
      doc.text("DEVICE INFO", midPoint, yOffset + 60);

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(String(r.customer_name || "N/A"), leftMargin, yOffset + 66);
      doc.text(String(r.product_name || "N/A"), midPoint, yOffset + 66);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.text(String(r.contact || ""), leftMargin, yOffset + 71);
      doc.text(`S/N: ${r.serial_number || "N/A"}`, midPoint, yOffset + 71);

      // Issue
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(150, 150, 150);
      doc.text("REPORTED ISSUE", leftMargin, yOffset + 95);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      const cleanIssue = (r.issue || "No description provided").replace(
        /[^\x00-\x7F]/g,
        "",
      );
      doc.text(doc.splitTextToSize(cleanIssue, 170), leftMargin, yOffset + 101);

      // Signatures
      doc.setDrawColor(0, 0, 0);
      doc.line(leftMargin, yOffset + 135, 70, yOffset + 135);
      doc.line(140, yOffset + 135, rightMargin, yOffset + 135);

      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text("CUSTOMER SIGNATURE", leftMargin, yOffset + 140);
      doc.text("AUTHORIZED SIGNATURE", 140, yOffset + 140);
    };

    // Draw Office & Customer Copies
    drawSection(0, "Office Copy");

    doc.setDrawColor(200, 200, 200);
    doc.setLineDashPattern([1, 2], 0);
    doc.line(10, 148, 200, 148);
    doc.setLineDashPattern([], 0);

    drawSection(148, "Customer Copy");

    // Save
    doc.save(`EZ-RMA-${r.rma_code}.pdf`);
  } catch (err) {
    console.error(err);
    alert("Critical Print Error: " + err.message);
  }
}
