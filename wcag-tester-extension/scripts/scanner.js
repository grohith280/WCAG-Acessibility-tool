console.log('scanner.js service worker loaded');


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "runAccessibilityScan") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0) {
                console.error("No active tab found. Make sure you have a webpage open.");
                chrome.runtime.sendMessage({
                    action: "scanResults",
                    results: [{
                        type: "Error",
                        tag: "N/A",
                        status: "fail",
                        reason: "No active tab found. Please open a webpage and try again."
                    }]
                });
            return;
            }

            const tabId = tabs[0].id;

            chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ["scripts/contrastChecker.js"]
            }, () => {
                if (chrome.runtime.lastError) {
                    console.error('Script injection failed:', chrome.runtime.lastError.message);
                } else {
                    console.log('contrastChecker.js injected successfully');
                }
            });
        });
    } else if (request.action === "sendResultsToExtension") {
        chrome.runtime.sendMessage({
            action: "scanResults",
            results: request.results
        });
    }
});











