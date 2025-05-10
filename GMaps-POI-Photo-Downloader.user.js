// ==UserScript==
// @name         GMaps POI Photo Downloader
// @namespace    http://tampermonkey.net/
// @version      0.8.9
// @description  Scans for photos and lists them in a draggable preview panel with selection and download options.
// @author       kid4rm90s
// @match        https://www.google.com/maps/*
// @match        https://google.com/maps/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=google.com
// @grant        GM_download
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @require      https://greasyfork.org/scripts/24851-wazewrap/code/WazeWrap.js
// @license      MIT
// @downloadURL  https://raw.githubusercontent.com/kid4rm90s/GMaps-POI-Photo-Downloader/main/GMaps-POI-Photo-Downloader.user.js
// @updateURL    https://raw.githubusercontent.com/kid4rm90s/GMaps-POI-Photo-Downloader/main/GMaps-POI-Photo-Downloader.user.js
// ==/UserScript==

(function() {
    'use strict';

    const SCRIPT_PREFIX = 'GM_POI_DL_';
    let poiName = 'GoogleMaps_Image';
    let previewPanelElement;
	
  const updateMessage = 'Added \'Support for WME Edit Profile Enhancement\'<br>Fixed<br>- Various other bugs.<br>';
  const scriptName = GM_info.script.name;
  const scriptVersion = GM_info.script.version;
  const downloadUrl = 'https://raw.githubusercontent.com/kid4rm90s/GMaps-POI-Photo-Downloader/main/GMaps-POI-Photo-Downloader.user.js';

    GM_addStyle(`
        #poiPhotoDownloaderPanel { /* Main control panel (top-right) */
            position: fixed; top: 70px; right: 10px; background-color: #f9f9f9;
            border: 1px solid #ccc; padding: 10px; z-index: 99999;
            border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            font-family: Arial, sans-serif; font-size: 14px;
        }
        #poiPhotoDownloaderPanel button {
            background-color: #4CAF50; color: white; border: none; padding: 8px 12px;
            text-align: center; display: inline-block; font-size: 13px;
            margin: 4px 2px; cursor: pointer; border-radius: 3px;
        }
        #poiPhotoDownloaderPanel button:hover { background-color: #45a049; }
        #poiPhotoDownloaderPanel #statusMessage { margin-top: 5px; font-size: 12px; color: #555; }

        #${SCRIPT_PREFIX}previewPanel { /* Draggable Preview Panel (bottom-left) */
            position: fixed; bottom: 20px; left: 20px; width: 380px; max-height: 500px;
            background-color: #f0f0f0; border: 1px solid #999; border-radius: 8px;
            z-index: 100000; box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            display: none; /* Initially hidden, use 'flex' to show */
            flex-direction: column; font-family: Arial, sans-serif; font-size: 13px;
        }
        #${SCRIPT_PREFIX}previewPanelHeader {
            padding: 10px; cursor: move; background-color: #555; color: white;
            border-top-left-radius: 7px; border-top-right-radius: 7px;
            font-weight: bold; text-align: center; font-size: 14px;
        }
        #${SCRIPT_PREFIX}previewPanelContent {
            padding: 10px; overflow-y: auto; flex-grow: 1;
        }
        .${SCRIPT_PREFIX}previewItem {
            display: flex; align-items: center; margin-bottom: 10px; padding: 8px;
            background-color: #fff; border-radius: 4px; border: 1px solid #ddd;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .${SCRIPT_PREFIX}previewItem input[type="checkbox"] { /* Checkbox within preview item */
            margin-right: 10px; width: 18px; height: 18px; cursor: pointer;
        }
        .${SCRIPT_PREFIX}previewItem img { /* Thumbnail in preview item */
            width: 60px; height: 60px; object-fit: cover; margin-right: 10px;
            border-radius: 3px; border: 1px solid #eee;
        }
        .${SCRIPT_PREFIX}previewItemInfo {
            flex-grow: 1; font-size: 11px; word-break: break-all;
            display: flex; flex-direction: column; justify-content: space-between;
        }
        .${SCRIPT_PREFIX}previewItemInfo span { margin-bottom: 5px; }
        .${SCRIPT_PREFIX}previewItemButtons {
            display: flex; flex-direction: column; gap: 4px; margin-top: 5px;
        }
        .${SCRIPT_PREFIX}previewItem button { /* Download This button */
            font-size: 10px; padding: 4px 6px; cursor: pointer;
            border-radius: 3px; border: 1px solid #81c784;
            background-color: #a5d6a7; color: #2e7d32; width: 100%; box-sizing: border-box;
        }
        .${SCRIPT_PREFIX}previewItem button:hover { background-color: #81c784; }

        #${SCRIPT_PREFIX}previewPanelFooter {
            padding: 10px; border-top: 1px solid #ccc; background-color: #e0e0e0;
            display: flex; gap: 10px; /* For multiple buttons in footer */
        }
        #${SCRIPT_PREFIX}downloadAllPreviewBtn, #${SCRIPT_PREFIX}clearSelectionBtn {
            flex-grow: 1; /* Allow buttons to share space */
            padding: 10px; border: none; border-radius: 4px;
            cursor: pointer; font-size: 13px; font-weight: bold;
        }
        #${SCRIPT_PREFIX}downloadAllPreviewBtn { background-color: #4CAF50; color: white; }
        #${SCRIPT_PREFIX}downloadAllPreviewBtn:hover { background-color: #45a049; }
        #${SCRIPT_PREFIX}downloadAllPreviewBtn:disabled { background-color: #9e9e9e; cursor: not-allowed; }

        #${SCRIPT_PREFIX}clearSelectionBtn { background-color: #ffab91; color: #d9534f; }
        #${SCRIPT_PREFIX}clearSelectionBtn:hover { background-color: #ff8a65; }
        #${SCRIPT_PREFIX}clearSelectionBtn:disabled { background-color: #9e9e9e; cursor: not-allowed;}
    `);

    function createMainPanel() { // Renamed for clarity
        if (document.getElementById('poiPhotoDownloaderPanel')) return;
        const panel = document.createElement('div');
        panel.id = 'poiPhotoDownloaderPanel';
        const scanButton = document.createElement('button');
        scanButton.id = 'scanPhotosBtn';
        scanButton.textContent = 'Scan & Show in Preview'; // Updated text
        scanButton.onclick = scanAndPopulatePreview;
        const downloadSelectedButton = document.createElement('button'); // Downloads from preview
        downloadSelectedButton.id = 'downloadSelectedPreviewBtn';
        downloadSelectedButton.textContent = 'Download Selected (0)';
        downloadSelectedButton.style.display = 'none'; // Shown when items are selected in preview
        downloadSelectedButton.onclick = downloadSelectedPhotosFromPreview;
        const statusMessage = document.createElement('div');
        statusMessage.id = 'statusMessage';
        statusMessage.textContent = 'Scan to populate preview panel.';
        panel.appendChild(scanButton);
        panel.appendChild(downloadSelectedButton);
        panel.appendChild(statusMessage);
        document.body.appendChild(panel);
        console.log(`${SCRIPT_PREFIX} Main control panel created.`);
        createPreviewPanel(); // Create the draggable preview panel alongside
    }

    function updateStatus(message) {
        const statusEl = document.getElementById('statusMessage');
        if (statusEl) statusEl.textContent = message;
        console.log(`${SCRIPT_PREFIX} Status: ${message}`);
    }

    function updateDownloadButtonCount() { // Counts selected items in preview panel
        const selectedCount = document.querySelectorAll(`#${SCRIPT_PREFIX}previewPanelContent input[type="checkbox"]:checked`).length;
        const downloadMainBtn = document.getElementById('downloadSelectedPreviewBtn'); // In main panel
        if (downloadMainBtn) {
            downloadMainBtn.textContent = `Download Selected (${selectedCount})`;
            downloadMainBtn.style.display = selectedCount > 0 ? 'inline-block' : 'none';
        }
        const downloadPreviewFooterBtn = document.getElementById(`${SCRIPT_PREFIX}downloadAllPreviewBtn`); // In preview footer
        if (downloadPreviewFooterBtn) {
            downloadPreviewFooterBtn.textContent = `Download All (${selectedCount})`;
            downloadPreviewFooterBtn.disabled = selectedCount === 0;
        }
        const clearSelectionBtn = document.getElementById(`${SCRIPT_PREFIX}clearSelectionBtn`);
        if(clearSelectionBtn) {
            clearSelectionBtn.disabled = selectedCount === 0;
        }
        updatePreviewPanelVisibility(); // Show/hide preview panel itself
    }

    function createPreviewPanel() {
        if (document.getElementById(`${SCRIPT_PREFIX}previewPanel`)) {
            previewPanelElement = document.getElementById(`${SCRIPT_PREFIX}previewPanel`);
            return;
        }
        previewPanelElement = document.createElement('div');
        previewPanelElement.id = `${SCRIPT_PREFIX}previewPanel`;
        const header = document.createElement('div');
        header.id = `${SCRIPT_PREFIX}previewPanelHeader`;
        header.textContent = 'Found Photos (Select to Download)';
        const content = document.createElement('div');
        content.id = `${SCRIPT_PREFIX}previewPanelContent`; // This is where items go
        const footer = document.createElement('div');
        footer.id = `${SCRIPT_PREFIX}previewPanelFooter`;
        const downloadAllButton = document.createElement('button');
        downloadAllButton.id = `${SCRIPT_PREFIX}downloadAllPreviewBtn`;
        downloadAllButton.textContent = 'Download All (0)';
        downloadAllButton.disabled = true;
        downloadAllButton.onclick = downloadSelectedPhotosFromPreview;
        const clearButton = document.createElement('button');
        clearButton.id = `${SCRIPT_PREFIX}clearSelectionBtn`;
        clearButton.textContent = 'Clear Selection';
        clearButton.disabled = true;
        clearButton.onclick = clearPreviewSelection;

        footer.appendChild(clearButton);
        footer.appendChild(downloadAllButton);
        previewPanelElement.appendChild(header);
        previewPanelElement.appendChild(content);
        previewPanelElement.appendChild(footer);
        document.body.appendChild(previewPanelElement);
        makeDraggable(previewPanelElement, header);
        console.log(`${SCRIPT_PREFIX} Draggable preview panel CREATED. Initial display: ${window.getComputedStyle(previewPanelElement).display}`);
    }

    function makeDraggable(panel, handle) { /* ... same as before ... */
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        handle.onmousedown = dragMouseDown;
        function dragMouseDown(e) { e = e || window.event; e.preventDefault(); pos3 = e.clientX; pos4 = e.clientY; document.onmouseup = closeDragElement; document.onmousemove = elementDrag; }
        function elementDrag(e) { e = e || window.event; e.preventDefault(); pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY; pos3 = e.clientX; pos4 = e.clientY; panel.style.top = (panel.offsetTop - pos2) + "px"; panel.style.left = (panel.offsetLeft - pos1) + "px"; }
        function closeDragElement() { document.onmouseup = null; document.onmousemove = null; }
    }

    function addPhotoItemToPreview(photoId, photoBase, originalUrl) {
        if (!previewPanelElement) createPreviewPanel(); // Ensure it exists
        const content = document.getElementById(`${SCRIPT_PREFIX}previewPanelContent`);
        if (!content) { console.error("Preview panel content not found!"); return; }
        if (content.querySelector(`.${SCRIPT_PREFIX}previewItem[data-photo-id="${photoId}"]`)) return; // Already added

        const itemDiv = document.createElement('div');
        itemDiv.className = `${SCRIPT_PREFIX}previewItem`;
        itemDiv.dataset.photoId = photoId; // For identifying it
        itemDiv.dataset.photoBase = photoBase;
        itemDiv.dataset.originalUrl = originalUrl;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = `${SCRIPT_PREFIX}previewItemCheckbox`;
        checkbox.onchange = updateDownloadButtonCount; // Update counts when checked/unchecked

        const img = document.createElement('img');
        img.src = originalUrl; img.alt = `Preview ${photoId.substring(0,10)}`;

        const infoDiv = document.createElement('div');
        infoDiv.className = `${SCRIPT_PREFIX}previewItemInfo`;
        const textSpan = document.createElement('span');
        textSpan.textContent = `ID: ${photoId.substring(0, 15)}...`;

        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = `${SCRIPT_PREFIX}previewItemButtons`;
        const downloadSingleButton = document.createElement('button');
        downloadSingleButton.textContent = 'Download This';
        downloadSingleButton.onclick = () => { downloadSinglePhoto(photoId, photoBase, originalUrl); };

        buttonsDiv.appendChild(downloadSingleButton);
        infoDiv.appendChild(textSpan);
        infoDiv.appendChild(buttonsDiv); // Buttons container inside infoDiv

        itemDiv.appendChild(checkbox);
        itemDiv.appendChild(img);
        itemDiv.appendChild(infoDiv);
        content.appendChild(itemDiv);
        console.log(`${SCRIPT_PREFIX} Added item ${photoId} to preview panel. Total items: ${content.children.length}`);
    }

    function updatePreviewPanelVisibility() {
        if (!previewPanelElement) return;
        const content = document.getElementById(`${SCRIPT_PREFIX}previewPanelContent`);
        const shouldBeVisible = content && content.children.length > 0;
        previewPanelElement.style.display = shouldBeVisible ? 'flex' : 'none';
    }

    function clearPreviewSelection() {
        const checkboxes = document.querySelectorAll(`#${SCRIPT_PREFIX}previewPanelContent input[type="checkbox"]:checked`);
        checkboxes.forEach(cb => cb.checked = false);
        updateDownloadButtonCount();
    }


    function getPhotoIdAndBaseFromUrl(url) { /* ... same as before ... */
        if (!url) return null;
        let match = url.match(/\/p\/([a-zA-Z0-9\-_]+)/);
        if (match && match[1]) return { id: match[1], base: `https://lh3.googleusercontent.com/p/` };
        match = url.match(/\/gps-cs-s\/([a-zA-Z0-9\-_]+)/);
        if (match && match[1]) return { id: match[1], base: `https://lh3.googleusercontent.com/gps-cs-s/` };
        return null;
    }

    function scanAndPopulatePreview() { // Renamed function
        updateStatus('Scanning for photos...');
        if (!previewPanelElement) createPreviewPanel(); // Ensure preview panel is ready
        const previewContent = document.getElementById(`${SCRIPT_PREFIX}previewPanelContent`);
        if (previewContent) previewContent.innerHTML = ''; // Clear previous scan results
        else { console.error("Cannot find preview panel content to clear/populate."); return; }

        let photosFoundOnPage = 0;
        const poiNameEl = document.querySelector('h1[jsan*="7.H1Text"], h1.DUwDvf.fontHeadlineLarge, h1.fontHeadlineLarge[aria-label]');
        poiName = (poiNameEl?.textContent?.trim().replace(/[^a-zA-Z0-9_-\s]/g, '').replace(/\s+/g, '_')) || 'GoogleMaps_Image';

        const potentialPhotoSelectors = [
            'div.m6QErb.Hk4XGb.WNBkOb.XiKgde div[role="img"][style*="background-image:url(https://lh3.googleusercontent.com/"]',
            'div.U39Pmb[role="img"][style*="background-image:url(https://lh3.googleusercontent.com/"]',
            'img[src*="lh3.googleusercontent.com/p/"]', 'img[src*="lh3.googleusercontent.com/gps-cs-s/"]',
            'div[role="img"][style*="background-image:url(https://lh3.googleusercontent.com/p/"]',
            'div[role="img"][style*="background-image:url(https://lh3.googleusercontent.com/gps-cs-s/"]',
            'div[jsaction*="pane.photoGridSection.photo"] img[src*="googleusercontent.com"]',
            'div[jsaction="pane.action.heroHeaderImage"] img[src*="googleusercontent.com"]',
            'img[jsaction="click:action.selectPhoto"][src*="googleusercontent.com"]',
        ];
        let uniquePhotoUrls = new Set(); // To avoid adding duplicates if selectors overlap

        potentialPhotoSelectors.forEach(s => {
            document.querySelectorAll(s).forEach(photoEl => {
                let photoUrl;
                if (photoEl.tagName === 'IMG') photoUrl = photoEl.src;
                else if (photoEl.style?.backgroundImage?.includes('url(')) {
                    const m = photoEl.style.backgroundImage.match(/url\((['"]?)(.*?)\1\)/);
                    if (m && m[2]) photoUrl = m[2];
                }
                if (photoUrl && !photoUrl.includes("//:0") && !photoUrl.startsWith("data:") && !uniquePhotoUrls.has(photoUrl)) {
                    const photoInfo = getPhotoIdAndBaseFromUrl(photoUrl);
                    if (photoInfo) {
                        addPhotoItemToPreview(photoInfo.id, photoInfo.base, photoUrl);
                        uniquePhotoUrls.add(photoUrl);
                        photosFoundOnPage++;
                    }
                }
            });
        });

        if (photosFoundOnPage > 0) {
            updateStatus(`Found ${photosFoundOnPage} photos. Select in preview panel.`);
            previewPanelElement.style.display = 'flex'; // Ensure panel is visible
        } else {
            updateStatus('No photos found on page.');
            previewPanelElement.style.display = 'none';
        }
        updateDownloadButtonCount(); // Reset counts
    }

    async function downloadSinglePhoto(photoId, photoBase, originalUrlForName = '') { /* ... same as before ... */
        if (!photoId || !photoBase) { alert('Cannot download: photo info missing.'); return; }
        const downloadUrl = `${photoBase}${photoId}=s0`;
        const namePartMatch = originalUrlForName.match(/([a-zA-Z0-9\-_]{20,})/);
        const namePart = namePartMatch ? namePartMatch[1].substring(0,20) : photoId.substring(0,10);
        const filename = `${poiName}_${namePart}_single.jpg`;
        updateStatus(`Downloading single: ${filename.substring(0,30)}...`);
        try {
            await new Promise((resolve, reject) => GM_download({ url: downloadUrl, name: filename, onload: resolve, onerror: reject, ontimeout: () => reject(new Error('Timeout')) }));
            updateStatus(`Downloaded ${filename.substring(0,30)}...`);
        } catch (error) {
            updateStatus(`Error downloading ${filename.substring(0,30)}...`);
            console.error(`${SCRIPT_PREFIX} Error downloading single photo ${filename}:`, error);
            alert(`Error downloading ${filename}: ${error.message || error}`);
        }
    }

    async function downloadSelectedPhotosFromPreview() { // Renamed function
        const selectedItems = document.querySelectorAll(`#${SCRIPT_PREFIX}previewPanelContent .${SCRIPT_PREFIX}previewItem input[type="checkbox"]:checked`);
        if (selectedItems.length === 0) { alert('No photos selected in the preview panel!'); return; }
        updateStatus(`Starting download of ${selectedItems.length} photos from preview...`);
        let downloadedCount = 0;
        for (let i = 0; i < selectedItems.length; i++) {
            const checkbox = selectedItems[i];
            const itemDiv = checkbox.closest(`.${SCRIPT_PREFIX}previewItem`);
            const photoId = itemDiv.dataset.photoId;
            const photoBase = itemDiv.dataset.photoBase;
            if (!photoId || !photoBase) {
                updateStatus(`Skipping photo (missing data on preview item ${i + 1}).`); continue;
            }
            const downloadUrl = `${photoBase}${photoId}=s0`;
            const filename = `${poiName}_${photoId}_${i + 1}.jpg`;
            updateStatus(`Downloading ${i + 1}/${selectedItems.length}: ${filename.substring(0,30)}...`);
            try {
                await new Promise((resolve, reject) => GM_download({ url: downloadUrl, name: filename, onload: resolve, onerror: reject, ontimeout: () => reject(new Error('Timeout')) }));
                downloadedCount++;
                await new Promise(resolve => setTimeout(resolve, 250));
            } catch (error) {
                updateStatus(`Error downloading ${filename.substring(0,30)}...`);
                console.error(`${SCRIPT_PREFIX} Error downloading batch photo ${filename}:`, error);
            }
        }
        updateStatus(`Finished. Downloaded ${downloadedCount} of ${selectedItems.length} photos.`);
        clearPreviewSelection(); // Uncheck all and update counts
    }

    function waitForKeyElements(selector, callback, waitOnce = true, interval = 300, maxIntervals = -1) { /* ... same as before ... */
        let intervals = 0;
        const obsInt = setInterval(() => {
            if (document.querySelector(selector)) { callback(); if (waitOnce) clearInterval(obsInt); }
            intervals++;
            if (maxIntervals > -1 && intervals >= maxIntervals) { clearInterval(obsInt); if (!document.getElementById('poiPhotoDownloaderPanel')) setTimeout(createMainPanel, 1500); }
        }, interval);
    }

    waitForKeyElements("body", createMainPanel, true, 500, 20);

    let lastUrl = location.href;
    new MutationObserver(() => { // URL Change handler
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            console.log(`${SCRIPT_PREFIX} URL changed. Resetting preview panel.`);
            const previewContent = document.getElementById(`${SCRIPT_PREFIX}previewPanelContent`);
            if (previewContent) previewContent.innerHTML = '';
            updatePreviewPanelVisibility(); // Hide if empty
            updateDownloadButtonCount();   // Reset counts
            updateStatus('Page changed. Re-scan to populate preview.');
        }
    }).observe(document.documentElement, {subtree: true, childList: true});

    let gmInfoVersion = 'unknown';
    try { if (typeof GM_info !== 'undefined' && GM_info.script) gmInfoVersion = GM_info.script.version; }
    catch (e) { console.warn(`${SCRIPT_PREFIX} Could not retrieve GM_info.script.version.`); }
    console.log(`Google Maps POI Photo Downloader script loaded (v${gmInfoVersion}).`);

    function sandboxBootstrap() {
        if (WazeWrap?.Ready) {
            bootstrap({
                scriptUpdateMonitor: {downloadUrl}
            });
            WazeWrap.Interface.ShowScriptUpdate(scriptName, scriptVersion, updateMessage);
        } else {
            setTimeout(sandboxBootstrap, 250);
        }
    }
	
    // Start the "sandboxed" code.
    sandboxBootstrap();
	
    console.log(`${scriptName} initialized.`); 

})();