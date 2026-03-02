import { sendMessage, storageGet } from './browser.js';

export async function submitSolution(data) {
  const api = typeof browser !== 'undefined' ? browser : chrome;
  if (!api?.runtime?.id) {
    throw new Error('Extension was reloaded. Please refresh the page and try again.');
  }
  const { email, groupName, groupSheetId } = await storageGet(['email', 'groupName', 'groupSheetId']);
  const group = groupName || groupSheetId;
  if (!email) {
    throw new Error('Your email is not set. Please open the extension options and fill in your email.');
  }
  if (!group) {
    throw new Error('Your group is not set. Please open the extension options and fill in your group name or sheet ID.');
  }
  const fullData = { ...data, email, groupSheetId: groupSheetId || groupName };
  return sendMessage({ type: 'SUBMIT', data: fullData });
}