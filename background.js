// Background service worker - keeps uploads running even when popup closes

// Listen for upload requests from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startUpload') {
    handleUpload(request.data)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  }
});

async function handleUpload(data) {
  const { files, apiKey, baseId, tableId } = data;

  console.log('=== BACKGROUND UPLOAD STARTED ===');
  console.log('Files:', files.length);
  console.log('Base:', baseId);
  console.log('Table:', tableId);

  try {
    // Step 1: Group files by folder structure
    const filesByFolder = new Map();

    for (const fileData of files) {
      let folderPath;

      if (fileData.webkitRelativePath) {
        // Folder selection: group by subfolder
        const parts = fileData.webkitRelativePath.split('/');
        if (parts.length > 1) {
          parts.pop();
          folderPath = parts.join('/');
        } else {
          folderPath = 'root';
        }
      } else {
        // File selection: each file gets unique path
        folderPath = `file_${fileData.name}_${fileData.size}_${fileData.lastModified}`;
      }

      if (!filesByFolder.has(folderPath)) {
        filesByFolder.set(folderPath, []);
      }
      filesByFolder.get(folderPath).push(fileData);
    }

    console.log(`📁 Grouped into ${filesByFolder.size} record(s)`);

    // Step 2: Upload files and create records
    const uploadedByFolder = new Map();
    const errors = [];
    let uploadedCount = 0;

    for (const [folderPath, folderFiles] of filesByFolder) {
      uploadedByFolder.set(folderPath, []);

      for (const fileData of folderFiles) {
        uploadedCount++;
        console.log(`Uploading ${uploadedCount}/${files.length}: ${fileData.name}`);

        try {
          // Fetch the file blob from the data URL
          const response = await fetch(fileData.dataUrl);
          const blob = await response.blob();

          // Upload to temp host
          const fileUrl = await uploadToTempHost(blob, fileData.name);

          if (!fileUrl) {
            errors.push(`${fileData.name}: Failed to upload`);
            continue;
          }

          console.log('✓ Uploaded:', fileData.name);
          uploadedByFolder.get(folderPath).push({
            url: fileUrl,
            filename: fileData.name
          });

        } catch (error) {
          console.error(`Error uploading ${fileData.name}:`, error);
          errors.push(`${fileData.name}: ${error.message}`);
        }

        await sleep(300);
      }
    }

    // Step 3: Create Airtable records
    let recordsCreated = 0;

    for (const [folderPath, uploadedFiles] of uploadedByFolder) {
      if (uploadedFiles.length > 0) {
        console.log(`Creating record for: ${folderPath}`);

        try {
          await createAirtableRecord(uploadedFiles, apiKey, baseId, tableId);
          recordsCreated++;
          console.log('✓ Record created');
        } catch (error) {
          console.error('Error creating record:', error);
          errors.push(`Folder ${folderPath}: ${error.message}`);
        }

        await sleep(300);
      }
    }

    console.log('=== UPLOAD COMPLETE ===');
    console.log('Records created:', recordsCreated);
    console.log('Errors:', errors.length);

    // Show notification
    const message = errors.length > 0
      ? `⚠️ Done! ${recordsCreated} records, ${errors.length} failed`
      : `✓ Success! ${recordsCreated} records created`;

    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Airtable Upload Complete',
      message: message
    });

    return {
      recordsCreated,
      errors,
      totalFiles: files.length
    };

  } catch (error) {
    console.error('Upload failed:', error);
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Airtable Upload Failed',
      message: error.message
    });
    throw error;
  }
}

async function uploadToTempHost(blob, filename) {
  console.log('Uploading to temp host:', filename);

  // Try catbox.moe first
  try {
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('fileToUpload', blob, filename);

    const response = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      const url = await response.text();
      if (url && url.startsWith('https://')) {
        return url.trim();
      }
    }
  } catch (error) {
    console.error('catbox.moe error:', error);
  }

  // Try uguu.se
  try {
    const formData = new FormData();
    formData.append('files[]', blob, filename);

    const response = await fetch('https://uguu.se/upload', {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.files && data.files[0] && data.files[0].url) {
        return data.files[0].url;
      }
    }
  } catch (error) {
    console.error('uguu.se error:', error);
  }

  // Try 0x0.st
  try {
    const formData = new FormData();
    formData.append('file', blob, filename);

    const response = await fetch('https://0x0.st', {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      const url = await response.text();
      if (url && url.startsWith('https://')) {
        return url.trim();
      }
    }
  } catch (error) {
    console.error('0x0.st error:', error);
  }

  throw new Error('All upload services failed');
}

async function createAirtableRecord(filesArray, apiKey, baseId, tableId) {
  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}`;

  const payload = {
    fields: {
      "Money Video": filesArray,
      "Status": "Todo"
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Airtable error: ${errorData.error?.message || response.statusText}`);
  }

  return await response.json();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
