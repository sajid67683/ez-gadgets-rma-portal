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
  // 1. Total Tickets (counts everything)
  document.getElementById("stat-total").innerText = records.length;
  
  // 2. Active Repairs (counts ONLY tickets with "Repair" in the status)
  document.getElementById("stat-pending").innerText = records.filter(
    (r) => r.status && r.status.includes("Repair")
  ).length;
}

function renderTable(records, containerId) {
  const container = document.getElementById(containerId);
  if (records.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>No records found.</p></div>`;
    return;
  }

  // ADDED: The "Details" header column to keep alignment perfect
  let html = `<div style="overflow-x: auto;"><table class="records-table">
        <thead>
            <tr>
                <th>Code & Branch</th>
                <th style="white-space: nowrap; min-width: 100px;">Customer</th>
                <th style="white-space: nowrap; min-width: 100px;">Product</th>
                <th>Details</th>
                <th>Status</th>
                <th>Action</th>
            </tr>
        </thead>
        <tbody>`;

  records.forEach((r) => {
    // ADDED: The Eye Icon column with exact matching variables: r.customer_name and r.contact
    html += `
            <tr>
                <td>
                    <div style="font-family: monospace; color: var(--accent); font-weight: 700;">${r.rma_code}</div>
                    <div style="font-size: 11px; color: var(--text3);">${r.date}</div>
                </td>
                <td>
                    <div style="font-weight:600">${r.customer_name}</div>
                </td>
                <td>${r.product_name}</td>
                
                <td class="details-col" style="text-align: center;">
                    <button class="eye-btn" onclick="viewCustomer('${r.customer_name || ""}', '${r.contact || ""}', '${r.address || ""}')" title="View Customer Details">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                    </button>
                </td>

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
    if (!window.jspdf) {
      alert("Error: jsPDF library not loaded.");
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("p", "mm", "a4");

    // --- NEW: Draw the Background First ---
    // A4 paper size is 210mm x 297mm
    const bgImg = document.getElementById("pdf-bg");
    if (bgImg) {
      // Stretches the image over the entire page
      doc.addImage(bgImg, "PNG", 0, 0, 210, 297);
    }

    const drawSection = (yOffset, label) => {
      const leftCol = 20;
      const rightCol = 110;
      const rightMargin = 190;

      // 1. Header (Logo Image + Text + Subtitle)
      const logoImg = document.querySelector(".logo-area img");
      if (logoImg) {
        // Draw just the lightning bolt icon (Width: 20, Height: 14)
        doc.addImage(logoImg, "PNG", leftCol, yOffset + 12, 20, 18);
      }

      // Draw the bold "EzGadgets" text right next to the icon
      doc.setFont("helvetica", "bold");
      doc.setFontSize(26);
      doc.setTextColor(0, 0, 0); // Solid black
      doc.text("EzGadgets", leftCol + 22, yOffset + 24);

      // Draw the gray "WARRANTY RECEIPT" text below it
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(130, 130, 130);
      doc.text("WARRANTY RECEIPT", leftCol, yOffset + 32);

      // Office/Customer Copy Label
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(label.toUpperCase(), rightMargin, yOffset + 24, {
        align: "right",
      });

      // Horizontal Divider
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(leftCol, yOffset + 36, rightMargin, yOffset + 36);

      // 2. Two-Column Layout (Customer Details vs RMA Details)
      const columnY = yOffset + 48;

      // --- Left Column: Customer ---
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("CUSTOMER DETAILS", leftCol + 10, columnY);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text(
        `Name :      ${r.customer_name || "N/A"}`,
        leftCol,
        columnY + 10,
      );
      doc.text(`Contact :   ${r.contact || ""}`, leftCol, columnY + 16);

      const addressLines = doc.splitTextToSize(
        `Address :   ${r.address || "N/A"}`,
        80,
      );
      doc.text(addressLines, leftCol, columnY + 22);

      // --- Vertical Divider ---
      doc.setDrawColor(180, 180, 180);
      doc.line(100, columnY - 2, 100, columnY + 35);

      // --- Right Column: RMA ---
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("RMA DETAILS", rightCol + 10, columnY);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      // Use bold for the labels, normal for the values to match the SVG exactly
      doc.setFont("helvetica", "bold");
      doc.text("RMA Code:", rightCol, columnY + 10);
      doc.setFont("helvetica", "normal");
      doc.text(`${r.rma_code || "N/A"}`, rightCol + 18, columnY + 10);

      doc.setFont("helvetica", "bold");
      doc.text("Date:", rightCol, columnY + 16);
      doc.setFont("helvetica", "normal");
      doc.text(`${r.date || ""}`, rightCol + 9, columnY + 16);

      doc.setFont("helvetica", "bold");
      doc.text("Branch:", rightCol, columnY + 22);
      doc.setFont("helvetica", "normal");
      doc.text(`${r.location || ""}`, rightCol + 13, columnY + 22);

      doc.setFont("helvetica", "bold");
      doc.text("PRODUCT:", rightCol, columnY + 28);
      doc.setFont("helvetica", "normal");
      doc.text(`${r.product_name || "N/A"}`, rightCol + 19, columnY + 28);

      doc.setFont("helvetica", "bold");
      doc.text("S/N:", rightCol, columnY + 34);
      doc.setFont("helvetica", "normal");
      doc.text(`${r.serial_number || "N/A"}`, rightCol + 8, columnY + 34);

      // 3. Issue Description Box
      const boxY = columnY + 45;

      doc.setFillColor(235, 235, 235); // Slightly darker gray to show over background
      doc.roundedRect(leftCol, boxY, 170, 25, 3, 3, "F");

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      const cleanIssue = (r.issue || "No description provided").replace(
        /[^\x00-\x7F]/g,
        "",
      );
      const splitIssue = doc.splitTextToSize(cleanIssue, 145);

      doc.text("ISSUE :  ", leftCol + 5, boxY + 8);
      doc.text(splitIssue, leftCol + 18, boxY + 8);

      // 4. Signatures
      const sigY = boxY + 45;
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.3);

      doc.line(leftCol, sigY, 70, sigY);
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text("Customer Signature", leftCol, sigY + 5);

      doc.line(140, sigY, rightMargin, sigY);
      doc.text("Authorized Signatory", 140, sigY + 5);
    };

    // Draw Office Copy
    drawSection(0, "OFFICE COPY");

    // Draw Scissor / Cut Line
    doc.setDrawColor(180, 180, 180);
    doc.setLineDashPattern([2, 2], 0);
    doc.setLineWidth(0.5);
    doc.line(10, 148, 200, 148);
    doc.setLineDashPattern([], 0);

    // Draw Customer Copy
    drawSection(148, "CUSTOMER COPY");

    doc.save(`EZ-RMA-${r.rma_code}.pdf`);
  } catch (err) {
    console.error(err);
    alert("Critical Print Error: " + err.message);
  }
}

// Opens the modal and injects the customer data
function viewCustomer(name, phone, address) {
  // We replace single quotes just in case a name has an apostrophe (like O'Connor)
  const safeName = name ? name.replace(/'/g, "\\'") : "N/A";
  const safePhone = phone ? phone.replace(/'/g, "\\'") : "N/A";
  const safeAddress = address ? address.replace(/'/g, "\\'") : "N/A";

  const content = `
        <div class="copy-block" onclick="copyText('${safeName}')" title="Copy Name">
            <div>
                <span class="copy-label">Name</span>
                <span class="copy-value">${name || "N/A"}</span>
            </div>
            <span style="font-size: 16px;">📋</span>
        </div>
        <div class="copy-block" onclick="copyText('${safePhone}')" title="Copy Phone">
            <div>
                <span class="copy-label">Phone</span>
                <span class="copy-value">${phone || "N/A"}</span>
            </div>
            <span style="font-size: 16px;">📋</span>
        </div>
        <div class="copy-block" onclick="copyText('${safeAddress}')" title="Copy Address">
            <div>
                <span class="copy-label">Address</span>
                <span class="copy-value">${address || "N/A"}</span>
            </div>
            <span style="font-size: 16px;">📋</span>
        </div>
    `;

  document.getElementById("customerModalContent").innerHTML = content;
  document.getElementById("customerModal").style.display = "flex";
}

// Handles the actual clipboard copying
function copyText(text) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      // If you have a toast notification system, it will use it. Otherwise, normal alert.
      if (typeof showToast === "function") {
        showToast("Copied: " + text, "success");
      } else {
        alert("Copied to clipboard!\n" + text);
      }
    })
    .catch((err) => {
      console.error("Failed to copy: ", err);
    });
}
