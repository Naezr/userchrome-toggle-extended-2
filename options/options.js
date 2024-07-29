'use strict';

// main
async function main() {
	// get default settings from background script
	const sending = browser.runtime.sendMessage( {
		type: 'getDefaultSettings'
	});

	sending.then( response => {
		globalThis.defaultSettings = response.content;
	});

	// init settings
	await initSettings();
}

// settings initialization
async function initSettings() {
	await fillFields();
	await fillCheckboxes();
	await fillHotkeys();
	await initButtons();
}

// filling input fields
async function fillFields() {
	const settings = await browser.storage.local.get();

	for (let i = 0; i < settings.toggles.length; i++) {
		
		// fill toggle name
		document.getElementById(`toggle-name-${i + 1}`).value = settings.toggles[i].name;

		// fill and sync `prefix` and `selector` fields
		const prefix = document.getElementById(`toggle-prefix-${i + 1}`);
		const selector = document.getElementById(`toggle-titlepreface-${i + 1}`);

		let value = settings.toggles[i].prefix;
		prefix.value = value;
		selector.value = `:root[titlepreface*="${value}"]`;

		prefix.addEventListener('input', () => {
			const userInput = prefix.value;	
			selector.value = `:root[titlepreface*="${userInput}"]`;
		});
	}
}

// filling checkboxes values
async function fillCheckboxes() {
	const settings = await browser.storage.local.get();

	// general settings
	document.getElementById(`allow-multiple`).checked = settings.allowMultiple;
	
	// toggles
	for (let i = 0; i < settings.toggles.length; i++) {
		document.getElementById(`toggle-enable-${i + 1}`).checked = settings.toggles[i].enabled;
		document.getElementById(`toggle-default-state-${i + 1}`).checked = settings.toggles[i].default_state;
	}
}

// filling hotkeys values
async function fillHotkeys() {
	await browser.commands.getAll().then(result => {
		for (let i = 0; i < result.length; i++) {
			document.getElementById(`toggle-hotkey-${i + 1}`).textContent = result[i].shortcut;
		}
	});
}

// buttons initialization
async function initButtons() {
	// add listeners to buttons
	document.getElementById(`apply-button`).addEventListener('click', saveSettings);
	document.getElementById(`reset-button`).addEventListener('click', resetSettings);

	// add `clicked` attribute to button after click
	const buttons = document.querySelectorAll('.button');
	buttons.forEach((button) => {
		button.addEventListener('click', () => {
			button.setAttribute('clicked', '');
			setTimeout( () => {
				button.removeAttribute('clicked');
			}, 2000); // 2 seconds
		});
	});
}

// saving settings
async function saveSettings() {
	let settings = await browser.storage.local.get();

	// save general settings
	settings.allowMultiple = document.getElementById(`allow-multiple`).checked;

	// save toggles settings
	for (let i = 0; i < settings.toggles.length; i++) {
		let id = i + 1;

		settings.toggles[i].name = document.getElementById(`toggle-name-${id}`).value;
		settings.toggles[i].enabled = document.getElementById(`toggle-enable-${id}`).checked;
		settings.toggles[i].prefix = document.getElementById(`toggle-prefix-${id}`).value;
		settings.toggles[i].default_state = document.getElementById(`toggle-default-state-${id}`).checked;
	}

	// push settings to local storage
	await browser.storage.local.set(settings);
	console.log('Settings saved!');
}

// resetting settings
async function resetSettings() {
	await browser.storage.local.set(defaultSettings);
	await initSettings();
	console.log('Settings was reset by user!');
}

document.addEventListener('DOMContentLoaded', main);