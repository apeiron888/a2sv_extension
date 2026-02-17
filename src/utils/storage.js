export async function getFromStorage(keys) {
  return new Promise((resolve) => {
    try {
      if (!chrome?.runtime?.id) {
        return resolve({});
      }
      chrome.storage.local.get(keys, resolve);
    } catch (err) {
      resolve({});
    }
  });
}

export async function setToStorage(items) {
  return new Promise((resolve) => {
    try {
      if (!chrome?.runtime?.id) {
        return resolve();
      }
      chrome.storage.local.set(items, resolve);
    } catch (err) {
      resolve();
    }
  });
}

export async function incrementAttempt(platform, problemSlug) {
  const key = `attempt_${platform}_${problemSlug}`;
  const { [key]: current } = await getFromStorage([key]);
  const newValue = (current || 0) + 1;
  await setToStorage({ [key]: newValue });
  return newValue;
}

export async function getAttempt(platform, problemSlug) {
  const key = `attempt_${platform}_${problemSlug}`;
  const { [key]: value } = await getFromStorage([key]);
  return value || 1;
}