async function checkAccessibilityIssues() {
    const results = [];
    const allowedTags = ['P', 'SPAN', 'DIV', 'A', 'BUTTON', 'LABEL', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'TD', 'TH', 'LI'];

    // 1. Color Contrast Check
    for (const element of document.querySelectorAll('*')) {
        if (!allowedTags.includes(element.tagName) || !isVisible(element)) continue;

        const style = window.getComputedStyle(element);
        const fgColor = rgbToHex(style.color);
        const bgColor = rgbToHex(style.backgroundColor);
        const apiUrl = `https://webaim.org/resources/contrastchecker/?fcolor=${fgColor}&bcolor=${bgColor}&api`;

        try {
            const response = await fetch(apiUrl);
            const result = await response.json();

            results.push({
                type: "Color Contrast",
                tag: element.tagName,
                text: element.textContent.trim().slice(0, 50),
                fgColor,
                bgColor,
                ratio: result.ratio,
                AA: result.AA,
                AAA: result.AAA,
                status: result.AA === "pass" ? "pass" : "fail",
                reason: result.AA === "pass" ? "Contrast ratio meets WCAG standards." : `Contrast ratio is too low (Ratio: ${result.ratio}).`
            });

            if (result.AA !== "pass") {
                element.style.outline = '2px solid red';
            }
        } catch (error) {
            console.error('Error checking contrast:', error);
        }

    }

    // 2. Missing Alt Text Check (Pass & Fail)
    document.querySelectorAll('img').forEach(img => {
        const hasAlt = img.hasAttribute('alt') && img.getAttribute('alt').trim() !== '';
        results.push({
            type: "Alt Text",
            tag: "IMG",
            text: img.src.slice(0, 50),
            status: hasAlt ? "pass" : "fail",
            reason: hasAlt ? "Alt text is present, making the image accessible." : "Image is missing an alt attribute, which is required for screen readers."
        });

        if (!hasAlt) img.style.outline = '2px solid red';
    });

    // 3. Non-Text Content Description Check (Pass & Fail)
    document.querySelectorAll('svg, button').forEach(el => {
        const hasLabel = el.hasAttribute('aria-label') || el.hasAttribute('title');
        results.push({
            type: "Non-Text Content",
            tag: el.tagName,
            status: hasLabel ? "pass" : "fail",
            reason: hasLabel ? "Element has an accessible label (aria-label or title)." : "Element lacks an accessible label, making it difficult for screen readers."
        });

        if (!hasLabel) el.style.outline = '2px solid red';
    });

    // 4. Video Without Captions Check (Pass & Fail)
    document.querySelectorAll('video').forEach(video => {
        const hasCaptions = video.querySelector('track[kind="captions"]');
        results.push({
            type: "Video Captions",
            tag: "VIDEO",
            status: hasCaptions ? "pass" : "fail",
            reason: hasCaptions ? "Video has captions, making it accessible to deaf or hard-of-hearing users." : "No captions found, making this video inaccessible to deaf users."
        });

        if (!hasCaptions) video.style.outline = '2px solid red';
    });

    // 5. Text Hidden Inside Images Check (Pass & Fail)
    document.querySelectorAll('img').forEach(img => {
        const textInsideImage = img.getAttribute('alt') === '' && img.getAttribute('src').match(/\.(png|jpg|jpeg|gif|svg)$/);
        results.push({
            type: "Text Inside Image",
            tag: "IMG",
            text: img.src.slice(0, 50),
            status: textInsideImage ? "fail" : "pass",
            reason: textInsideImage ? "This image might contain text but lacks alternative text." : "This image does not contain critical text."
        });

        if (textInsideImage) img.style.outline = '2px solid red';
    });

    // 6. Meaning Not Conveyed by Color Alone Check (Pass & Fail)
    document.querySelectorAll('*').forEach(el => {
        const reliesOnColor = el.hasAttribute('data-color-only');
        results.push({
            type: "Color-Only Meaning",
            tag: el.tagName,
            status: reliesOnColor ? "fail" : "pass",
            reason: reliesOnColor ? "This element relies only on color to convey meaning." : "Meaning is conveyed through both color and text."
        });

        if (reliesOnColor) el.style.outline = '2px solid red';
    });

    // 7. Meaningful Sequences & Reading Order Check (Pass & Fail)
    document.querySelectorAll('*[tabindex="-1"]').forEach(el => {
        results.push({
            type: "Reading Order",
            tag: el.tagName,
            status: "fail",
            reason: "This content is hidden from keyboard users (tabindex=-1)."
        });

        el.style.outline = '2px solid red';
    });

    // 8. Keyboard Accessibility Check (Pass/Fail)
    document.querySelectorAll('a, button, input, textarea, select, [tabindex]').forEach(el => {
        const tabindex = el.getAttribute('tabindex');
        const isKeyboardFocusable = tabindex !== "-1" || el.tabIndex >= 0;
        results.push({
            type: "Keyboard Accessibility",
            tag: el.tagName,
            status: isKeyboardFocusable ? "pass" : "fail",
            reason: isKeyboardFocusable ? "Element is focusable via keyboard." : "Element is not focusable via keyboard."
        });

        if (!isKeyboardFocusable) el.style.outline = '2px solid red';
    });

    // 9. Skip Link Check
    const hasSkipLink = !!document.querySelector('a[href^="#main"], a.skip-link');
    results.push({
        type: "Skip Link",
        tag: "A",
        status: hasSkipLink ? "pass" : "fail",
        reason: hasSkipLink ? "Skip link is present to bypass repeated blocks." : "Missing skip link to jump to main content."
    });

    // 10. Language Attribute Check
    const htmlLang = document.documentElement.lang;
    results.push({
        type: "Language Declaration",
        tag: "HTML",
        status: htmlLang ? "pass" : "fail",
        reason: htmlLang ? `Language set as '${htmlLang}'.` : "Missing 'lang' attribute on <html>."
    });

    // 11. Form Input Label Check
    document.querySelectorAll('input, select, textarea').forEach(input => {
        const id = input.id;
        const label = id ? document.querySelector(`label[for="${id}"]`) : null;
        const hasLabel = label || input.getAttribute('aria-label') || input.getAttribute('title');

        results.push({
            type: "Form Label",
            tag: input.tagName,
            status: hasLabel ? "pass" : "fail",
            reason: hasLabel ? "Input has an associated label or title." : "Missing label or aria-label for this input."
        });

        if (!hasLabel) input.style.outline = '2px solid red';
    });

    // 12. ARIA Roles Usage Check
    document.querySelectorAll('[role]').forEach(el => {
        results.push({
            type: "ARIA Role",
            tag: el.tagName,
            status: "pass",
            reason: `Element uses ARIA role: '${el.getAttribute('role')}'.`
        });
    });

    // 13. Status Message Support (aria-live)
    const hasAriaLive = document.querySelector('[aria-live]');
    results.push({
        type: "Status Message Support",
        tag: hasAriaLive?.tagName || "N/A",
        status: hasAriaLive ? "pass" : "manual",
        reason: hasAriaLive ? "Page includes ARIA live region." : "No ARIA live region found. Ensure status updates are announced to screen readers."
    });


    // Send results back to scanner.js
    chrome.runtime.sendMessage({
        action: "sendResultsToExtension",
        results
    });
}

// Utility to check if an element is visible
function isVisible(el) {
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetWidth > 0 && el.offsetHeight > 0;
}

// Utility to convert RGB to HEX
function rgbToHex(rgbString) {
    return rgbString.match(/\d+/g).map(n => Number(n).toString(16).padStart(2, '0')).join('').toUpperCase();
}

// Run all tests
checkAccessibilityIssues();
