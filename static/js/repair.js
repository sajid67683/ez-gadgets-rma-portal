document.addEventListener("DOMContentLoaded", () => {
  // Initialize Theme
  const savedTheme = localStorage.getItem("ez_theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
  const themeIcon = document.getElementById("themeIcon");
  if (themeIcon) themeIcon.innerText = savedTheme === "dark" ? "☀️" : "🌙";

  loadRepairData();
});

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("ez_theme", next);
  document.getElementById("themeIcon").innerText =
    next === "dark" ? "☀️" : "🌙";
}

async function loadRepairData() {
  const container = document.getElementById("repairRecordsList");
  try {
    const response = await fetch("/api/repair/all");
    const result = await response.json();
    if (result.success) renderTable(result.records, container);
  } catch (e) {
    container.innerHTML = `<div class="empty-state"><p>Connection error.</p></div>`;
  }
}

function renderTable(records, container) {
  if (records.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>No assigned devices.</p></div>`;
    return;
  }

  let html = `<div style="overflow-x: auto;"><table class="records-table">
        <thead>
            <tr>
                <th>RMA</th>
                <th style="white-space: nowrap; min-width: 80px;">Device</th>
                <th>Issue</th>
                <th>Details</th>
                <th>Status</th>
                <th>Action</th>
            </tr>
        </thead>
        <tbody>`;

  records.forEach((r) => {
    let statusClass = "badge-received";
    if (r.status === "Fixed") statusClass = "badge-fixed";
    else if (r.status === "Replaced") statusClass = "badge-replaced";
    else if (r.status === "Cannot Fix") statusClass = "badge-sent";
    else if (r.status.includes("Repair")) statusClass = "badge-inhouse";

    // BULLETPROOFING: Clean the data of any quotes that might break HTML
    const safeName = (r.customer || r.customer_name || "")
      .replace(/'/g, "\\'")
      .replace(/"/g, "&quot;");
    const safePhone = (r.phone || r.contact || "")
      .replace(/'/g, "\\'")
      .replace(/"/g, "&quot;");
    const safeAddress = (r.address || "")
      .replace(/'/g, "\\'")
      .replace(/"/g, "&quot;");

    html += `
            <tr>
                <td style="font-family: monospace; font-weight: 600;">${r.rma_code}</td>
                <td><strong>${r.product_name}</strong></td>
                <td><div style="max-width: 250px;">${r.issue}</div></td>
                
                <td class="details-col" style="text-align: center;">
                    <button class="eye-btn" onclick="viewCustomer('${safeName}', '${safePhone}', '${safeAddress}')" title="View Customer Details">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                    </button>
                </td>
                
                <td><span class="badge ${statusClass}">${r.status}</span></td>
                <td><button class="btn btn-secondary" onclick='openTechDetail(${JSON.stringify(r).replace(/'/g, "&#39;")})'>Update</button></td>
            </tr>`;
  });

  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

function openTechDetail(r) {
  const modal = document.getElementById("techModal");
  const content = document.getElementById("modalContent");
  modal.classList.add("show");

  content.innerHTML = `
        <div class="detail-grid">
            <div class="detail-item"><div class="dl">RMA Code</div><div class="dv"><strong>${r.rma_code}</strong></div></div>
            <div class="detail-item"><div class="dl">Device</div><div class="dv"><strong>${r.product_name}</strong></div></div>
        </div>
        <div class="detail-item full" style="margin-top: 20px;" >
            <div style="font-size: 11px; color: var(--text3); text-transform: uppercase;">Reported Issue</div>
            <div class="dv">(S/N: ${r.serial_number || "N/A"})<br>${r.issue}</div>
        </div>
        <div class="divider" style="margin:20px 0;"></div>
        <div class="form-group">
            <label>Update Status</label>
            <select id="techStatus" style="font-weight: 600;">
                <option value="In Repair" ${r.status.includes("Repair") ? "selected" : ""}>In Repair</option>
                <option value="Fixed" ${r.status === "Fixed" ? "selected" : ""}>Fixed</option>
                <option value="Cannot Fix" ${r.status === "Cannot Fix" ? "selected" : ""}>Cannot Fix</option>
            </select>
        </div>
        <div class="form-group" style="margin-top:16px;"><label>Technician Notes</label><textarea id="techNotes"></textarea></div>
        <div class="btn-group"><button class="btn btn-primary" onclick="updateTechStatus('${r.rma_code}')">Submit Update</button></div>
    `;
}

async function updateTechStatus(code) {
  const status = document.getElementById("techStatus").value;
  const tech_notes = document.getElementById("techNotes").value;
  try {
    await fetch("/api/repair/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rma_code: code, status, tech_notes }),
    });
    closeModal();
    loadRepairData();
  } catch (e) {
    alert("Error saving.");
  }
}
function closeModal() {
  document.getElementById("techModal").classList.remove("show");
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
