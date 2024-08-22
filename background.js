'use strict';

// default settings
this.defaultSettings = {

	// metadata
	initialized: true,
	settingsVer: "2",

	// general
	allowMultiple: false,
	closePopup: false,
	useLastWindowToggles: false,
	keepToggles: false,

	// toggles
	toggles: [
		{
			name: "Style 1",
			enabled: true,
			prefix: '\u180E',
			default_state: true
		},
		{
			name: "Style 2",
			enabled: false,
			prefix: '\u200b',
			default_state: false
		},
		{
			name: "Style 3",
			enabled: false,
			prefix: '\u200c',
			default_state: false
		},
		{
			name: "Style 4",
			enabled: false,
			prefix: '\u200d',
			default_state: false
		},
		{
			name: "Style 5",
			enabled: false,
			prefix: '\u200e',
			default_state: false
		},
		{
			name: "Style 6",
			enabled: false,
			prefix: '\u200f',
			default_state: false
		}
	]
}

// settings initialization
async function initSettings() {
	let settings = await browser.storage.local.get();
  
	// reset settings if needed
	if (settings.initialized != true || settings.settingsVer != "2") {
		await browser.storage.local.clear();
		await browser.storage.local.set(defaultSettings);
		console.log('Settings was reset!');
		browser.runtime.openOptionsPage();
	}

	// remove preToggles if not needed
	if (!settings.keepToggles && settings.preToggles != undefined) {
		settings.preToggles = undefined;
		await browser.storage.local.set(settings);
		console.log('Removed session toggles!')
	}

	console.log('Settings initialized!');
}

// toolbar button initialization
async function initButton() {
	const settings = await browser.storage.local.get();
	const togglesEnabled = settings.toggles.filter(toggle => toggle.enabled).length;

	if (togglesEnabled == 1) {
		let toggle = settings.toggles.find(toggle => toggle.enabled);
		browser.action.setTitle({ title: `Toggle "${toggle.name}"` });
		browser.action.setPopup({ popup: null });
		console.log("Toolbar button mode is set to single toggle!")

	} else if (togglesEnabled > 1) {
		browser.action.setTitle({ title: `Show toggles` });
		browser.action.setPopup({ popup: "popup/popup.html" });
		console.log("Toolbar button node is set to popup!");

	} else {
		console.log("Toolbar button mode is not set!");
	}
}

// windows handling
async function windowCreated(window) {
	await windowFocusChanged(window.id);
}

async function windowFocusChanged(windowId) { // event
	if (windowId === browser.windows.WINDOW_ID_NONE) return;
	const settings = await browser.storage.local.get();
	await getSessionStorage();
	await updateIds(windowId);

	let toggles = perWindowToggles.get(windowId);

	// init toggles for window if not
	if (toggles === undefined) 
		globalThis.perWindowToggles.set(windowId, await getToggles());

	// save current window toggles for next session
	if (settings.keepToggles)
		keepToggles();

	await updateTitlePrefixes();
	console.log(`Window ${globalThis.lastWindowId} is focused now. Window ${globalThis.secondToLastWindowId} was focused before it.`);
	await saveSessionStorage();
}

// getting data from session storage
async function getSessionStorage() {
	let storage = await browser.storage.session.get();

	if (storage.initialized == true) {
		globalThis.perWindowToggles = storage.perWindowToggles;
		globalThis.lastWindowId = storage.lastWindowId;
		globalThis.secondToLastWindowId = storage.secondToLastWindowId;
	} else {
		globalThis.perWindowToggles = new Map();
		globalThis.lastWindowId = undefined;
		globalThis.secondToLastWindowId = undefined;

		console.log('Data initialized!');
	}
}

// saving data to session storage
async function saveSessionStorage() {
	let data = {};

	data.initialized = true;
	data.perWindowToggles = globalThis.perWindowToggles;
	data.lastWindowId = globalThis.lastWindowId;
	data.secondToLastWindowId = globalThis.secondToLastWindowId;

	await browser.storage.session.set(data);
}

// getting proper toggles for new window
async function getToggles() {
	const settings = await browser.storage.local.get();
	let storage = await browser.storage.session.get();

	let preTogglesUsed = false;
	let winTogglesUsed = false;

	let toggles = [];
  for (let i = 0; i < settings.toggles.length; i++) {

		// return toggles from previous window
		if (settings.useLastWindowToggles && secondToLastWindowId != undefined) {
    	toggles.push({ state: globalThis.perWindowToggles.get(secondToLastWindowId)[i].state });
			winTogglesUsed = true;
		}

		// return toggles from previous session
		else if (settings.preToggles != undefined && settings.keepToggles == true && storage.preTogglesUsed != true) {
			toggles.push({ state: settings.preToggles[i].state });
			preTogglesUsed = true;
		}

		// return defaults
		else {
			toggles.push({ state: settings.toggles[i].default_state });
		}
	}

	if (winTogglesUsed)
		console.log(`Used toggles from window ${secondToLastWindowId}!`);

	if (preTogglesUsed) {
		storage.preTogglesUsed = preTogglesUsed;
		await browser.storage.session.set(storage);
		console.log(`Used toggles from previous session!`);
	}

	return toggles;
}

// updating Ids
async function updateIds(windowId) {
	globalThis.secondToLastWindowId = lastWindowId;
	globalThis.lastWindowId = windowId;
}

// saving last window toggles to local storage
async function keepToggles() {
	let settings = await browser.storage.local.get();
	settings.preToggles = globalThis.perWindowToggles.get(lastWindowId);
	await browser.storage.local.set(settings);
}

// toggling toggles
async function userToggle(name) { // event
	await getSessionStorage();

	let toggleId = name - 1;
	let toggles = globalThis.perWindowToggles.get(lastWindowId);
	const settings = await browser.storage.local.get();

	if (settings.toggles[toggleId].enabled) {
		toggles[toggleId].state = !toggles[toggleId].state;

		if (!settings.allowMultiple)
			for (let i = 0; i < toggles.length; i++) {
				if (i != toggleId)
					toggles[i].state = false;
		}

		globalThis.perWindowToggles.set(lastWindowId, toggles);
		console.log(`Toggled style ${name} for window ${lastWindowId}!`);
	}

	// save current window toggles for next session
	if (settings.keepToggles)
		keepToggles();

	await updateTitlePrefixes();
	await saveSessionStorage();
}

// updating prefixes for all windows
async function updateTitlePrefixes() {
	const settings = await browser.storage.local.get();

	globalThis.perWindowToggles.forEach((toggles, windowId) => {
		let titlePrefix = '';

		// Loop through all toggles
		for (let i = 0; i < toggles.length; i++) {
			if (settings.toggles[i].enabled && toggles[i].state) {
				titlePrefix += String(settings.toggles[i].prefix);

				if (!settings.allowMultiple) break;
			}
		}
		
		// apply toggles / delete non-existent window id
		browser.windows.update(windowId, {
			titlePreface: titlePrefix
		}).catch((error) => {
			globalThis.perWindowToggles.delete(windowId);
			saveSessionStorage();
			console.log('Deleted non-existent id!');
		});
	});
}

// toolbar button click handling (fired if popup disabled) 
async function onButtonClicked(tab) { // event
	const settings = await browser.storage.local.get();
	await windowFocusChanged(tab.windowId);
	userToggle(settings.toggles.findIndex(toggle => toggle.enabled) + 1);
}

// message handling
function handleMessage(message, sender, sendResponse) { // event

	// handle request to get default settings
	if (message.type == 'getDefaultSettings')
		sendResponse( {
				content: defaultSettings
		});
	
	// handle request to update button
	else if (message.type == 'updButton') initButton();

	// handle toggle request
	else if (message.type == 'toggle') userToggle(message.name);
}

// init
initSettings();
initButton();

// add listeners
browser.commands.onCommand.addListener(userToggle);    // listen hotkeys
browser.runtime.onMessage.addListener(handleMessage);  // listen messages
browser.action.onClicked.addListener(onButtonClicked); // toolbar button click
browser.windows.onCreated.addListener(windowCreated);  // window creating
browser.windows.onFocusChanged.addListener(windowFocusChanged); // window focus
