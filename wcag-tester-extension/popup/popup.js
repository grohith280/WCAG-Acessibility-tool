document.getElementById('scanButton').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: "runAccessibilityScan" });
    document.getElementById('status').innerText = 'Scanning...';
});

// Listen for results from the background service worker (scanner.js)
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'scanResults') {
        document.getElementById('status').innerText = 'Scan Complete';
        window.scanResults = message.results;
        document.getElementById('downloadPdfButton').style.display = 'inline-block';
    }
});


chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'scanResults') {
        document.getElementById('status').innerText = 'Scan Complete';
        window.scanResults = message.results;

        document.getElementById('downloadPdfButton').style.display = 'inline-block'; // show download button
        window.scanResults = message.results; // store for PDF
    }
});
document.getElementById('downloadPdfButton').addEventListener('click', () => {
    const jsPDF = window.jspdf.jsPDF;
    const doc = new jsPDF();

    const now = new Date();
    const timestamp = now.toLocaleString();

    const grouped = {
        Perceivable: [],
        Operable: [],
        Understandable: [],
        Robust: []
    };

    // Categorize results
    (window.scanResults || []).forEach(r => {
        const type = r.type.toLowerCase();
        if (type.includes("contrast") || type.includes("alt text") || type.includes("caption") || type.includes("non-text") || type.includes("text inside") || type.includes("color-only") || type.includes("reading order")) {
            grouped.Perceivable.push(r);
        } else if (type.includes("keyboard") || type.includes("skip") || type.includes("focus")) {
            grouped.Operable.push(r);
        } else if (type.includes("language") || type.includes("form label") || type.includes("input") || type.includes("error")) {
            grouped.Understandable.push(r);
        } else {
            grouped.Robust.push(r);
        }
    });

    let y = 10;
    doc.setFontSize(18);
    doc.text("WCAG 2.2 Accessibility Report", 10, y);
    y += 8;

    doc.setFontSize(10);
    doc.text(`Generated on: ${timestamp}`, 10, y);
    y += 8;

    // Summary counts
    const total = window.scanResults.length;
    const passed = window.scanResults.filter(r => r.status.toLowerCase() === "pass").length;
    const failed = window.scanResults.filter(r => r.status.toLowerCase() === "fail").length;
    const manual = window.scanResults.filter(r => r.status.toLowerCase() === "manual").length;

    doc.text(`Total Checks: ${total}`, 10, y);
    y += 5;
    doc.text(`✔ Passed: ${passed}`, 10, y);
    y += 5;
    doc.text(`✖ Failed: ${failed}`, 10, y);
    y += 5;
    doc.text(`Manual Review Needed: ${manual}`, 10, y);
    y += 10;

    const sectionHeader = (title, color) => {
        doc.setTextColor(...color);
        doc.setFontSize(14);
        doc.text(title, 10, y);
        y += 8;
        doc.setTextColor(0);
    };

    const renderTable = (data, statusType) => {
        if (!data || data.length === 0) return;

        const filtered = data.filter(r => r.status.toLowerCase() === statusType);
        if (filtered.length === 0) return;

        const rows = filtered.map(r => [
            r.tag,
            (r.text || "").slice(0, 40),
            (r.reason || "").slice(0, 60),
            r.ratio ? `Ratio: ${r.ratio}` : ""
        ]);

        doc.autoTable({
            head: [["Tag", "Text", "Reason", "Details"]],
            body: rows,
            startY: y,
            theme: "striped",
            headStyles: {
                fillColor: statusType === "pass" ? [0, 150, 0] : [220, 20, 60],
                textColor: 255
            },
            styles: { fontSize: 9 },
            margin: { left: 10, right: 10 },
            didDrawPage: function (data) {
                y = data.cursor.y + 10;
            }
        });
    };

    const categories = ["Perceivable", "Operable", "Understandable", "Robust"];
    categories.forEach(cat => {
        const data = grouped[cat];
        if (!data || data.length === 0) return;

        sectionHeader(`Passed Checks: ${cat}`, [0, 150, 0]);
        renderTable(data, "pass");

        sectionHeader(`Failed Checks: ${cat}`, [220, 20, 60]);
        renderTable(data, "fail");

        sectionHeader(`Manual Review: ${cat}`, [255, 140, 0]);
        renderTable(data, "manual");
    });

    doc.save("WCAG_Accessibility_Report.pdf");
});