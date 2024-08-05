'use strict';

this.windowId = undefined;

// main
async function main() {
	await createInputs();
}

// getting current window id
async function getWindowId() {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  return tabs[0].windowId;
}

// creating inputs
async function createInputs() {
	const settings = await browser.storage.local.get();
	const storage = await browser.storage.session.get();
	const toggles = storage.perWindowToggles.get(await getWindowId());
	const container = document.getElementById(`toggles-container`);

	for (let i = 0; i < settings.toggles.length; i++) {
		if (settings.toggles[i].enabled) {
			let label = document.createElement('label');
			label.className = 'toggle-label';
			container.appendChild(label);
			
			let input = document.createElement('input');
			input.type = settings.allowMultiple ? 'checkbox' : 'radio';
			input.name = `toggle`;
			input.id = `toggle-${i + 1}`;
			input.checked = toggles[i].state;
			if (toggles[i].state) input.setAttribute('check', '');
			input.addEventListener('click', () => { onInputClicked(i); });
			label.appendChild(input);

			let name = document.createElement('span');
			name.textContent = settings.toggles[i].name;
			label.appendChild(name);
		}
	}
}

// toggle click handling
async function onInputClicked(id) {
	const settings = await browser.storage.local.get();

	if (!settings.closePopup && !settings.allowMultiple)
		handleAttributes(id);
	
	browser.runtime.sendMessage( {
		type: 'toggle',
		name: id + 1
	});

	if (settings.closePopup) window.close();
}

// attributes (if allowMultiple = false)
async function handleAttributes(id) {
	const settings = await browser.storage.local.get();
	const clickedInput = document.getElementById(`toggle-${id + 1}`);

	for (let i = 0; i < settings.toggles.length; i++)
		if (settings.toggles[i].enabled && i != id) {
			let input = document.getElementById(`toggle-${i + 1}`);
			input.removeAttribute('check');
	}

	if (clickedInput.hasAttribute('check')) {
		clickedInput.checked = false;
		clickedInput.removeAttribute('check');
	} else clickedInput.setAttribute('check', '');
}

document.addEventListener('DOMContentLoaded', main);