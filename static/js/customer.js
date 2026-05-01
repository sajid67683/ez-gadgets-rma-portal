// Updated for customer.js[cite: 7, 9]
function switchTab(tabId, clickedButton) {
  // 1. Move highlight
  const allTabs = document.querySelectorAll(".tab-btn");
  allTabs.forEach((btn) => btn.classList.remove("active"));
  if (clickedButton) clickedButton.classList.add("active");

  // 2. Toggle Panels (Using 'active' class for CSS animations)
  const panels = document.querySelectorAll(".panel");
  panels.forEach((p) => p.classList.remove("active"));

  const target = document.getElementById("panel-" + tabId);
  if (target) target.classList.add("active");
}

function showToast(msg, type = "info") {
  const t = document.getElementById("toast");
  t.className = `toast ${type} show`;
  t.innerHTML = msg;
  setTimeout(() => t.classList.remove("show"), 3200);
}

async function submitRMA() {
  const name = document.getElementById("customerName").value.trim();
  const contact = document.getElementById("contact").value.trim();
  const address = document.getElementById("address").value.trim();
  const product = document.getElementById("productName").value.trim();
  const serial = document.getElementById("serialNumber").value.trim();
  const issue = document.getElementById("issue").value.trim();
  const location = document.getElementById("rmaLocation").value;

  if (!name || !contact || !product || !issue) {
    showToast("Please fill all required fields.", "error");
    return;
  }

  const btn = document.getElementById("submitBtn");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Submitting…';

  try {
    const response = await fetch("/api/rma/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: name,
        contact: contact,
        address: address,
        productName: product,
        serialNumber: serial,
        issue: issue,
        location: location,
      }),
    });
    const result = await response.json();
    if (result.success) {
      document.getElementById("generatedCode").textContent = result.rma_code;
      document.getElementById("codeDisplay").classList.add("show");
      showToast("Claim submitted!", "success");
      btn.style.display = "none";
    }
  } catch (e) {
    showToast("Submission failed.", "error");
    btn.disabled = false;
    btn.innerHTML = "Submit Claim";
  }
}

async function trackRMA() {
  const code = document.getElementById("trackQuery").value.trim();
  if (!code) {
    showToast("Enter your code.", "error");
    return;
  }

  const resultsDiv = document.getElementById("trackResults");
  const btn = document.getElementById("trackBtn");
  btn.disabled = true;
  resultsDiv.innerHTML =
    '<div class="empty-state"><span class="spinner"></span></div>';

  try {
    const response = await fetch("/api/rma/status/" + encodeURIComponent(code));
    const result = await response.json();

    if (result.success) {
      let badgeClass = "badge-received";
      if (result.status === "Fixed") badgeClass = "badge-fixed";
      else if (result.status === "Replaced") badgeClass = "badge-replaced";
      else if (result.status === "Cannot Fix") badgeClass = "badge-sent";
      else if (result.status.includes("Repair")) badgeClass = "badge-inhouse";

      resultsDiv.innerHTML = `
                <div style="text-align: center; animation: slideUp 0.3s ease;">
                    <div style="font-family: monospace; font-size: 20px; font-weight: 700; color: var(--text); margin-bottom: 24px;">${result.rma_code}</div>
                    <div style="background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px;">
                        <div style="margin-bottom: 16px;">
                            <div style="font-size: 12px; color: var(--text3); font-weight: 600;">Product</div>
                            <div style="font-size: 16px; color: var(--text); font-weight: 500;">${result.product_name}</div>
                        </div>
                        <div class="divider" style="margin: 16px 0;"></div>
                        <div>
                            <div style="font-size: 12px; color: var(--text3); font-weight: 600; margin-bottom: 8px;">Current Status</div>
                            <span class="badge ${badgeClass}" style="font-size: 14px; padding: 8px 16px;">${result.status}</span>
                        </div>
                    </div>
                </div>
            `;
    } else {
      resultsDiv.innerHTML = `<div class="empty-state"><p>RMA not found.</p></div>`;
    }
  } catch (e) {
    resultsDiv.innerHTML = `<div class="empty-state"><p>Error connecting.</p></div>`;
  }
  btn.disabled = false;
}
