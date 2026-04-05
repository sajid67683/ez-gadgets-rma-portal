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
        <thead><tr><th>RMA</th><th>Device</th><th>Issue</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>`;
  records.forEach((r) => {
    let statusClass = "badge-received";
    if (r.status === "Fixed") statusClass = "badge-fixed";
    else if (r.status === "Replaced") statusClass = "badge-replaced";
    else if (r.status === "Cannot Fix") statusClass = "badge-sent";
    else if (r.status.includes("Repair")) statusClass = "badge-inhouse";

    html += `
            <tr>
                <td style="font-family: monospace; font-weight: 600;">${r.rma_code}</td>
                <td><strong>${r.product_name}</strong></td>
                <td><div style="max-width: 250px;">${r.issue}</div></td>
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
