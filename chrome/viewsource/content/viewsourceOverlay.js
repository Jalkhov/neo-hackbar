// JavaScript 2014, KasH.

var gViewSourceExtensionObject = (function() {
	'use strict';

	// Components constant. I only use Components.interfaces..;
	const Ci = Components.interfaces;

	// getItem() constants..;
	const FIND_TYPE_HTML		= 0;
	const FIND_TYPE_CSS		= 1;
	const FIND_TYPE_SCRIPT	= 2;
	const FIND_TYPE_IMAGES	= 3;
	const FIND_TYPE_LINKS	= 4;

	// Properties to scan for when looking for color values. Make sure this array doesnt get too large or it will become slow!
	const colorCSSprops = [
		// 'column-rule-color', // Hardly used. Ignore for now.
		'color',
		'background-color',
		'outline-color',
		'border-color',
		'border-top-color',
		'border-right-color',
		'border-bottom-color',
		'border-left-color',
		'box-shadow',
		'text-shadow',
		'text-decoration-color'
	];


	// A cache object for get_bundle_string() method. It holds previously fetched strings by key for speed..;
	const string_cache = {},

	// Preferences manager..;
	prefs = {
		prefService: null,

		get_service: function() {
			if (!this.prefService) {
				this.prefService = get_xp_com('@mozilla.org/preferences-service;1', 'nsIPrefService').getBranch('extensions.viewsource.');
			}

			return this.prefService;
		},

		read: function(name, def_val) {
			var rv = def_val, prefService = this.get_service();

			switch (prefService.getPrefType(name)) {
				case Ci.nsIPrefBranch.PREF_BOOL: {
					rv = prefService.getBoolPref(name);
					break;
				} case Ci.nsIPrefBranch.PREF_STRING: {
					rv = prefService.getCharPref(name);
					break;
				} case Ci.nsIPrefBranch.PREF_INT: {
					rv = prefService.getIntPref('defaultAction');
					break;
				}
			}

			return rv;
		},

		write: function(name, val) {
			var prefService = this.get_service();

			switch (typeof val) {
				case 'boolean': {
					prefService.setBoolPref(name, !!val);
					break;
				} case 'string': {
					prefService.setCharPref(name, val);
					break;
				} case 'number': {
					prefService.setIntPref(name, val);
					break;
				}
			}
		}
	},

	// Sidebar state manager..;
	sidebar = {
		is_open: function() {
			return !$('vs-sidebar-box').collapsed;
		},

		toggle: function() {
			var sidebox = $('vs-sidebar-box');
			sidebox.collapsed = !sidebox.collapsed;
			return sidebar.refresh();
		},

		refresh: function() {
			var val = sidebar.is_open();

			set_attr($('vs-sidebar-resizer'), 'state', (val ? 'open' : 'collapsed'));
			set_attr($('vs-app-sidebarmenu'), 'checked', val);
			set_attr($('vs-sidebarmenu'), 'checked', val);

			return val;
		}
	},

	// Headers manager..;
	responseHeaders = (function() {
		var xhr = null;

		return {
			queryHeaders: function(url) {
				// Request method should default to HEAD; less bandwidth usage, and therefore quicker (if the server recognizes it)..;
				var type = prefs.read('requestMethod', 'HEAD').toUpperCase(), list = $('vs-headers-url-list');

				// Check if we're not dealing with a view-source protocol..;
				if ('view-source:' == url.substr(0, 12)) {
					url = url.substr(12);
				}

				// Check if we're already running, and if so, cancel it..;
				if (xhr) {
					xhr.removeEventListener('readystatechange', this.stateChange, false);
					xhr.abort();
					xhr = null;
				}

				// Because this method can be called from outside the sidebar, we need to make sure the sidebar is uncollapsed,
				// the correct deck selectedItem is set, and the correct dropdown label is set..;
				if (!sidebar.is_open()) {
					sidebar.toggle();
				}

				$('vs-sidebar-button').firstChild.value = $('vs-sidebar-button').lastChild.firstChild.label;
				$('vs-sidebar-deck').selectedIndex = 0;

				// Clear it, and fill with a loading image..;
				$('vs-headers-content', 1).appendChild($$('treeitem', 0, [
					$$('treerow', 0, [$$('treecell', { src: 'chrome://global/skin/icons/loading_16.png', label: '  ' + get_bundle_string('loading') })])
				]));

				// Disable to stop a click happy user..;
				set_attr($('vs-cmd-refresh'), 'disabled', set_attr($('vs-cmd-copy'), 'disabled', set_attr(list, 'disabled', true)));

				// See if the url is in the list. If it isn't; add it..;
				if (1 == list.firstChild.childNodes.length) {
					list.firstChild.appendChild($$('menuseparator'));
					list.selectedItem = list.insertItemAt(2, url, url);
					list.tooltipText = url;

				} else if (Array.prototype.every.call(list.getElementsByTagName('menuitem'), function(item) { return url != item.value || (!(list.selectedItem = item) && false); })) {
					list.selectedItem = list.insertItemAt(2, url, url);
					list.tooltipText = url;
				}

				xhr = new XMLHttpRequest(); // There seems to be a Component.classes id for this. Why not just use this common constructor?
				xhr.open(type, url, true);

				xhr.addEventListener('readystatechange', this.stateChange, false);
				xhr.overrideMimeType('text/plain'); // The response body is parsed as XML. Setting this prevents any XML errors for non XML pages.

				list = void xhr.send(null);

			},

			stateChange: function() {
				if (xhr && 4 == xhr.readyState) {
					var headers = xhr.getAllResponseHeaders(), tree = $('vs-headers-content', 1), last_header = '';

					if (!headers) {
						headers = '';
					}

					xhr.removeEventListener('readystatechange', this.stateChange, false);
					((trim(headers) + '\nStatus: ' + String(xhr.status) + ' ' + xhr.statusText.replace(/^\s*\d+\s*/, '')).split(/\r?\n/)).forEach(function(header) {
						if (header.length) {
							var head = '', match = /^([^\:\=]+)\:\s*(.*)$/.exec(header);

							if (!match && /Set\-Cookie\d?/i.test(last_header) && /^[^;\:\=]+\=.+$/.test(header)) {
								head = header;
							} else if (match && match[1].length * match[2].length * (last_header = match[1]).length) {
								head = match[2];
							}

							if (head.length) {
								tree.appendChild($$('treeitem', 0, [
									$$('treerow', 0, [
										$$('treecell', { label: last_header, value: last_header + ': ' + head }),
										$$('treecell', { label: head, tooltipText: head })
									])
								]));
							}
						}
					});

					try {
						set_attr($('vs-cmd-refresh'), 'disabled', set_attr($('vs-headers-url-list'), 'disabled', false));
						set_attr(tree.parentNode, 'disabled', 0 == tree.parentNode.view.rowCount);
						xhr = tree = void update_tree_commands(tree.parentNode);
					} catch (e) {
						// We fail. Perhaps we're in a popup window; somehow the tree's view property is null in a popup. Don't ask me why..;
						xhr = tree = null;
						log_message(e);
					}
				}
			}
		};
	})();


	// Cache v2 service. Does not work in older versions..;
	var loadContextInfo = null,

	// Clipboard API..;
	clipboardService = null,

	// Cache v1 service. Does not work in Firefox >= 32..;
	cacheService = null,

	// IO Service. Used to create an nsIURI..;
	ioService = null;


	// Defer loading these XP COM Components..;
	setTimeout(function() {
		cacheService = get_xp_com('@mozilla.org/netwerk/cache-storage-service;1', 'nsICacheStorageService');

		// IO Service. Used to create an nsIURI..;
		ioService = get_xp_com('@mozilla.org/network/io-service;1', 'nsIIOService');

		// Import ContextInfo..;
		try {
			loadContextInfo = Components.utils.import('resource://gre/modules/LoadContextInfo.jsm', {}).LoadContextInfo;
		} catch (e) {
			log_message(e);
		}
	}, 250);


	/******					*******
		*******			*******
			*******	*******
				*******
			*******	*******
		*******			*******
	*******					******/


	// Gets a XP COM component by contractID. It returns a Singleton service of interfaceName..;
	function get_xp_com(contractId, interfaceName) {
		if (contractId in Components.classes) {
			if (interfaceName in Ci) {
				return Components.classes[contractId].getService(Ci[interfaceName]);
			} else {
				log_message('Components.interfaces.' + interfaceName +' not found!')
			}
		} else {
			log_message('Components.classes["' + contractId + '"] not found!');
		}

		return null;
	}


	// Chromebrowser onload handler. Fires when a new browsing context is openend..;
	function viewsource_chrome_load() {
		// 1. Remove this listener..;
		window.removeEventListener('load', viewsource_chrome_load, false);


		// 2. A. Hide the sidebar if we're in a popup window..;
		if (window.toolbar && !window.toolbar.visible) {
			$('vs-sidebar-box').hidden = $('vs-sidebar-resizer').hidden = true;
		}


		// 3. Detect first run..;
		if (!prefs.read('firstRun', false)) {
			prefs.write('firstRun', true);

			var addonbar = $('addon-bar');

			// Add our button and show the addon-bar.
			if (addonbar) {
				set_attr(addonbar, 'currentset', (addonbar.currentSet = (addonbar.currentSet + ',vs-toolbarpalette-icon').replace(/^\s*,+/, '')));
				set_attr(addonbar, 'collapsed', String(addonbar.collapsed = false));

				addonbar = void (document.persist('addon-bar', 'currentset') || document.persist('addon-bar', 'collapsed'));
			}
		}


		// 4. Provide accesskeys for menuitems..;
		[$('vs-sidebar-button').lastChild, 'popupMenuContext', 'popupTreeContext'].forEach(set_access_keys);
	}


	// Returns a DOM element..;
	function $(el, clear) {
		if ((el = 'string' == typeof el ? document.getElementById(el) : el) && clear) {
			for (var c = el.firstChild; c; el.removeChild(c), c = el.firstChild) {}
		}

		return el;
	}


	// Creates a new DOM element..;
	function $$(tag, attrs, children) {
		var rv = document.createElement(tag);

		if (attrs) {
			for (var prop in attrs) {
				if ($$.hasOwnProperty.call(attrs, prop)) {
					set_attr(rv, prop, attrs[prop]);
				}
			}
		}

		if (children) {
			children.forEach(function(c) {
				rv.appendChild(c);
			});
		}

		return rv;
	}


	// Sets an attribute on an element..;
	function set_attr(el, prop, val) {
		if (el) {
			var type = typeof val;

			if ('function' == type) {
				el.addEventListener(prop, val, false);
			} else if (typeof el[prop] == type) {
				// Test if the attribute has a javascript property. If it does, use that. Try to
				// avoid setting properties using setAttribute, because it's more expensive..;
				el[prop] = val;

				// However, sometimes we have no choice..;
			} else if ('boolean' == type && !val) {
				el.removeAttribute(prop.toLowerCase());
			} else {
				el.setAttribute(prop.toLowerCase(), String(val));
			}
		}

		return val;
	}


	// A native method of String in JavaScript 1.8.1, shipped with Firefox 3.5.
	// But we support much older versions then that, so we cant use it.
	// And we're in chrome, im not going to monkey-patch!
	function trim(s) {
		return s.replace(/^\s+|\s+$/g, '');
	}


	// Helper function to make sure it is no source page already..;
	function fix_url_vs(url) {
		return 'view-source:' == url.substr(0, 12) ? url.substr(12) : url;
	}


	// Helper function to remove the hash part in an URL..;
	function fix_url_hash(url) {
		var pos = url.indexOf('#');
		return pos > -1 ? url.substr(0, pos) : url;
	}


	// Returns a remote function callback with supplied arg..;
	function get_special_handler(method, arg) {
		return function() {
			method(arg);
		};
	}


	// Logs a message to the browser-console..;
	function log_message() {
		try {
			if (arguments.length > 1) {
				console.group();
			}

			Array.forEach(arguments, function(msg) {
				if (msg instanceof Error) {
					console.exception(msg);
				} else {
					console.log(String(msg));
				}
			});

			if (arguments.length > 1) {
				console.groupEnd();
			}
		} catch (e) {
			// Ignore.
		}
	}


	// Copies a string to the user's system clipboard..;
	function copy_to_clipboard(s) {
		try {
			if (!clipboardService) {
				clipboardService = get_xp_com('@mozilla.org/widget/clipboardhelper;1', 'nsIClipboardHelper');
			}

			clipboardService.copyString(s);
		} catch (e) {
			log_message('Cannot copy to clipboard', e);
			alert(String(e));
		}
	}


	// Checks if the URL protocol is supported..;
	function is_proto_supported(url) {
		var pos = url.indexOf(':');

		if (pos > -1) {
			switch (url.substr(0, pos)) {
				case 'shttp': case 'http': case 'https': case 'file': {
					return true;
				}
			}
		}

		return false;
	}


	// Gets an array of all Window objects on a webpage. There can be more, because of frames..;
	function get_windows() {
		var cache = {}, rv = [], i = -1, href = '';

		(function win_diver(win) {
			if (win && win.document && win.location && win.document.contentType && win.location.href.length) {
				var ct = win.document.contentType.toLowerCase();

				if ((ct.indexOf('/html') > -1 || ct.indexOf('/xml') > -1 || ct.indexOf('+xml') > -1) && (href = fix_url_hash(win.location.href)).length && !cache[href]) {
					if (is_proto_supported(href) && (cache[href] = (rv[++i] = win)).frames) {
						Array.forEach(win.frames, win_diver);
					}
				}
			}
		})(content);

		return rv;
	}


	// Faster alternative to document.body.getElementsByTagName('*')..;
	function get_elements(doc) {
		var rv = [doc.documentElement], i = 0;

		(function element_diver(el) {
			do {
				if (1 == el.nodeType) {
					rv[++i] = el;
				}

				if (el.hasChildNodes()) {
					element_diver(el.firstChild);
				}
			} while (el = el.nextSibling);
		})(doc.body);

		return rv;
	}


	// Views all items of a specified type in a dedicated browser window..;
	function view_all(type) {
		var win = null;

		get_items(type, get_windows()).forEach(function(url) {
			if (win) {
				win.addTab(url);
			} else {
				var new_win = window.open(url, 'vs-viewall-window');

				try {
					var x = new_win.QueryInterface(Ci.nsIInterfaceRequestor)
						.getInterface(Ci.nsIWebNavigation).QueryInterface(Ci.nsIDocShellTreeItem).
						rootTreeItem.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindow);

					if (x.gBrowser) {
						win = x.gBrowser;
					} else if (x.BrowserApp) {
						win = x.BrowserApp;
					}
				} catch (e) {
					// Oh oh!
				}
			}
		});
	}


	// Views the source of the specified url..;
	function view_source(url, type, e) {
		if (!url) {
			return;
		}

		if (e) {
			if (e.shiftKey) {
				type = e.ctrlKey ? 0 : 2;
			} else if (e.ctrlKey) {
				type = 1;
			} else if (e.altKey) {
				type = 3;
			}
		}

		var action = -1 == type ? prefs.read('defaultAction', 0) : type;
		switch (action) {
			case 2: {
				window.open(url);
				break;
			} case 3: {
				copy_to_clipboard(fix_url_vs(url));
				break;
			} default: {
				var tab = null;

				if (gBrowser) {
					for (var i = gBrowser.tabContainer.childNodes.length - 1; i > -1; --i) {
						if (url == gBrowser.getBrowserAtIndex(i).contentDocument.location.href) {
							tab = gBrowser.tabContainer.childNodes[i];
							break;
						}
					}

					if (!tab) {
						tab = gBrowser.addTab(url);
					}
				} else if (BrowserApp) {
					for (var i = BrowserApp.tabs.length - 1; i > -1; --i) {
						if (url == BrowserApp.tabs[i].window.location.href) {
							tab = BrowserApp.tabs[i];
							break;
						}
					}

					if (!tab) {
						tab = BrowserApp.addTab(url);
					}
				}

				if (0 == action && tab) {
					if (gBrowser) {
						gBrowser.selectedTab = tab;
					} else if (BrowserApp) {
						BrowserApp.selectTab(tab);
					}
				}
			}
		}
	}


	/**
	 * Sidebar refresh methods. Handles dropdown and frfresh buttons on sidebar.
	 */


	// Fills the sidebar listbox with all meta data from webpage..;
	function refresh_meta_data() {
		var tree = $('vs-meta-content', 1), newEntry = false;

		set_attr($('vs-cmd-refresh'), 'disabled', set_attr($('vs-cmd-copy'), 'disabled', true));
		get_windows().forEach(function(win) {
			var cache = {};

			Array.forEach(win.document.getElementsByTagName('meta'), function(meta) {
				if (!meta.content || (!meta.httpEquiv && !meta.name)) {
					return;
				}

				var name = trim(meta.httpEquiv ? meta.httpEquiv : meta.name),
					value = trim(meta.content).replace(/\s+/g, ' ');

				if (name && (!typeof cache[name] || cache[name] != value)) {
					cache[name] = value;

					if (newEntry) {
						tree.appendChild($$('treeseparator'));
						newEntry = false;
					}

					tree.appendChild($$('treeitem', 0, [
						$$('treerow', 0, [
							$$('treecell', { label: name, value: name + ': ' + value }),
							$$('treecell', { label: value, tooltipText: value })
						])
					]));
				}
			});

			newEntry = true;
		});

		if (set_attr(tree.parentNode, 'disabled', 0 == tree.parentNode.view.rowCount)) {
			tree.appendChild($$('treeitem', 0, [
				$$('treerow', 0, [
					$$('treecell', { label: get_bundle_string('noentriesfound', $('vs-sidebar-button').firstChild.value.toLowerCase()), className: 'vs-special' })
				])
			]));
		}

		set_attr($('vs-cmd-refresh'), 'disabled', false);
		tree = void update_tree_commands(tree.parentNode);
	}


	// Fills the sidebar listbox with all links on the webpage..;
	function refresh_links() {
		var tree = $('vs-links-content', 1);

		set_attr($('vs-cmd-refresh'), 'disabled', set_attr($('vs-cmd-copy'), 'disabled', true));
		get_items(FIND_TYPE_LINKS, get_windows()).forEach(function(url) {
			tree.appendChild($$('treeitem', 0, [
				$$('treerow', 0, [$$('treecell', { label: url, value: url })])
			]));
		});

		if (set_attr(tree.parentNode, 'disabled', 0 == tree.parentNode.view.rowCount)) {
			tree.appendChild($$('treeitem', 0, [
				$$('treerow', 0, [
					$$('treecell', { label: get_bundle_string('noentriesfound', $('vs-sidebar-button').firstChild.value.toLowerCase()), className: 'vs-special' })
				])
			]));
		}

		set_attr($('vs-cmd-refresh'), 'disabled', false);
		tree = void update_tree_commands(tree.parentNode);
	}


	// Fills the sidebar listbox with all used images on the webpage..;
	function refresh_images() {
		var tree = $('vs-images-content', 1);

		set_attr($('vs-cmd-refresh'), 'disabled', set_attr($('vs-cmd-copy'), 'disabled', true));
		get_items(FIND_TYPE_IMAGES, get_windows()).forEach(function(url) {
			tree.appendChild($$('treeitem', 0, [
				$$('treerow', 0, [$$('treecell', { label: url, src: url, value: url })])
			]));
		});

		if (set_attr(tree.parentNode, 'disabled', 0 == tree.parentNode.view.rowCount)) {
			tree.appendChild($$('treeitem', 0, [
				$$('treerow', 0, [
					$$('treecell', { label: get_bundle_string('noentriesfound', $('vs-sidebar-button').firstChild.value.toLowerCase()), className: 'vs-special' })
				])
			]));
		}

		set_attr($('vs-cmd-refresh'), 'disabled', false);
		tree = void update_tree_commands(tree.parentNode);
	}


	// Performs a XMLHttpRequest, and fills the sidebar listbox with all response headers..;
	function refresh_headers(url) {
		if (url) {
			responseHeaders.queryHeaders(url);
		}
	}


	// Fills the sidebar listbox with all colors used on the webpage..;
	function refresh_colors() {
		var rv = [], cache = {}, list = $('vs-list-colors'), i = list.getRowCount();

		set_attr($('vs-cmd-refresh'), 'disabled', set_attr($('vs-cmd-copy'), 'disabled', true));
		while (--i > -1) {
			list.removeItemAt(i);
		}

		get_windows().forEach(function(win) {
			get_elements(win.document).forEach(function(el) {
				var style = win.document.defaultView.getComputedStyle(el, null);

				if (!style) {
					return;
				}

				colorCSSprops.forEach(function(prop) {
					var start, color = style.getPropertyValue(prop), end, col = '#';

					if (!color) {
						return;
					}

					color = color.toUpperCase();
					start = color.indexOf('RGB(');

					if (start > -1) {
						if ((end = color.indexOf(')')) > -1) {
							color.substring(4 + start, end).split(',').forEach(function(num) {
								var n = (trim(num) >> 0).toString(16).toUpperCase();
								col += 1 == n.length ? '0' + n : n;
							});
						} else {
							return;
						}
					} else if ((start = color.indexOf('RGBA(')) > -1) {
						if ((end = color.indexOf(')')) > -1) {
							col = color.substring(start, 1 + end);
						} else {
							return;
						}
					} else if ('#' == color.charAt(0)) {
						switch (color.length) {
							case 4: {
								col = '#' + color.charAt(1) + color.charAt(1) +
									color.charAt(2) + color.charAt(2) +
									color.charAt(3) + color.charAt(3);

								break;
							} case 7: {
								col = color;
								break;
							}

						}
					} else {
						return;
					}

					switch (col) {
						case 'INHERIT': case 'TRANSPARENT': case 'AUTO': case 'NONE': case 'NORMAL': case 'CURRENTCOLOR': {
							// Ignore.
							break;
						} default: {
							if ('undefined' == typeof cache[col]) {
								cache[(rv[++i] = col)] = 1;

								list.appendChild($$('listitem', { tooltipText: prop + ': ' + col }, [
									$$('listcell', { style: 'background-color:' + col, value: col }),
									$$('listcell', { label: col }),
									$$('listcell', { label: prop })
								]));
							}

							break;
						}
					}
				});
			});
		});

		if (set_attr(list, 'disabled', 0 == list.getRowCount())) {
			list.appendChild($$('listitem', 0, [
				$$('listcell', { label: get_bundle_string('noentriesfound', $('vs-sidebar-button').firstChild.value.toLowerCase()), className: 'vs-special' })
			]));
		}

		set_attr($('vs-cmd-refresh'), 'disabled', false);
		update_tree_commands(list);
	}


	// Finds and assigns a suitable accesskey char for each menuitem in menu..;
	function set_access_keys(popup) {
		var list = '';

		Array.forEach($(popup).childNodes, function(node) {
			var lbl = node.label, fn = function(s) {
				var c = s.charAt(0);

				if (-1 == list.indexOf(c.toUpperCase())) {
					list += c.toUpperCase();
					node.accessKey = c;
					return false;
				} else {
					return true;
				}
			};

			if (lbl && !node.disabled && (lbl = trim(lbl)).length) {
				if (lbl.split(' ').every(fn) && Array.every(lbl, fn)) {
					node.accessKey = lbl.charAt(0); // A little crude, but we need to do something here...
				}
			}
		});
	}


	// Updates all buttons in the sidebar, making sure their disabled state is correct..;
	function update_tree_commands(tree) {
		set_attr($('vs-cmd-copy'), 'disabled', (tree.disabled || 0 == ('function' == typeof tree.getRowCount ? tree.getRowCount() : tree.view.rowCount) || 'single' == tree.selType && -1 == tree.currentIndex));
	}


	// Adds a link to the menu, which will open the sidebar to view the headers of the specified url..;
	function add_response_headers_item(menu, url, name) {
		if (url) {
			menu.appendChild($$('menuitem', { label: get_bundle_string(name), command: get_special_handler(refresh_headers, url) }));
		}
	}


	// Returns the size with the proper unit...;
	function get_size(size) {
		if (size > 999999) {
			return ' (~' + (size / 1000000).toFixed(2).toLocaleString() + ' MB)';
		} else if (size > 999) {
			return ' (~' + (size / 1000).toFixed(2).toLocaleString() + ' kB)';
		} else if (size > 0) {
			return ' (' + size.toLocaleString() + ' Bytes)';
		} else {
			return '';
		}
	}


	// Adds the size (Content-Length) of specified url to menuitem..;
	function update_cache_entry_size_label_for_menu_item(url, menuitem) {
		// Cleanup the url..;
		url = fix_url_hash(fix_url_vs(url));

		try {
			var sessions = (function(cache) {
				return [cache.createSession('HTTP', 0, true), cache.createSession('HTTPS', 0, true), cache.createSession('FTP', 0, true)];
			})(get_xp_com('@mozilla.org/network/cache-service;1', 'nsICacheService'));

			sessions.every(function(session) {
				try {
					if ('function' == typeof session.asyncOpenCacheEntry) {
						session.asyncOpenCacheEntry(url, Ci.nsICache.ACCESS_READ, {
							onCacheEntryAvailable: function(descriptor, granted, status) {
								if (descriptor) {
									set_attr(menuitem, 'label', menuitem.getAttribute('label') + get_size(descriptor.dataSize));
								}
							},

							onCacheEntryDoomed: function(status) {
								// dummy.
							}
						}, false);
					} else {
						var entry = session.openCacheEntry(url, Ci.nsICache.ACCESS_READ, false);

						set_attr(menuitem, 'label', menuitem.getAttribute('label') + get_size(entry.dataSize));
						entry = void entry.close();
						return false;
					}
				} catch (e) {
					log_message(e);
				}

				return true;
			});
		} catch (e) {
			try {
				var x = content.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebNavigation).QueryInterface(Ci.nsILoadContext),
					uri = ioService.newURI(url, null, null), callbackHandler = {
					onCacheEntryCheck: function() {
						return Ci.nsICacheEntryOpenCallback.ENTRY_WANTED;
					},

					onCacheEntryAvailable: function(entry) {
						if (entry && menuitem) {
							try {
								set_attr(menuitem, 'label', menuitem.getAttribute('label') + get_size(entry.dataSize));
								menuitem = null;
							} catch (ex) {
								// On diskCacheStorage, this operation might fail when the resource is currently written to disk.
								// Silenty exit out.
							}
						}
					}
				};

				// diskCacheStorage needs false as 2d parameter..!
				cacheService.memoryCacheStorage(loadContextInfo.fromLoadContext(x, false)).asyncOpenURI(
					uri, '', Ci.nsICacheStorage.OPEN_NORMALLY, callbackHandler);

				cacheService.diskCacheStorage(loadContextInfo.fromLoadContext(x, false), false).asyncOpenURI(
					uri, '', Ci.nsICacheStorage.OPEN_NORMALLY, callbackHandler);
			} catch (ex) {
				// Just fail here.
				log_message(ex);
			}
		}
	}


	// Loads a string from the stringbundle..;
	function get_bundle_string(name) {
		try {
			var args = arguments;

			if ('vs.' != name.substr(0, 3)) {
				name = 'vs.' + name;
			}

			if (!string_cache[name]) {
				string_cache[name] = $('vs-strings').getString(name);
			}

			// We use "getString" instead of "getFormattedString" to be able to cache the results for
			// faster lookup. This will break for strings with replacers, if the replace arguments
			// differ. Instead cache the unreplaced string, and replace *after* the cache lookup.
			return string_cache[name].replace(/\$(\d+)/g, function($0, $1) {
				var i = $1 >> 0;
				return args[i] ? args[i] : $0;
			});
		} catch (e) {
			log_message('Key not found in stringbundle: "' + name + '"', e);
			return name.toUpperCase();
		}
	}


	// Gets all items (CSS, Images, Script etc..) in all the windows..;
	function get_items(type, wins) {
		function to_result(url) {
			if (!url) {
				return false;
			} else if ('string' == typeof url) {
				return (url = fix_url_hash(url)).length && !!doc_url && !hash[url] && is_proto_supported(url) && (hash[(rv[++i] = url)] = 1);
			} else if ('string' == typeof url.href) {
				return to_result(url.href);
			} else if ('string' == typeof url.src) {
				return to_result(url.src);
			} else {
				return false;
			}
		}

		function get_inline_text(el, inline) {
			function string_builder(c) {
				if (c.nodeValue) {
					build[++b] = trim(c.nodeValue);
				}
			}

			function filter_empty(s) {
				return s.length;
			}

			var build = [], b =-1;

			Array.forEach(el.childNodes, string_builder);
			if (b > -1) {
				var str = build.join(''), arr = str.split(/\r?\n/).filter(filter_empty), min = -1;

				if (arr.every(function(s) {
					var ws = 0;

					for (var x = 0, n = s.length; x < n; ++x) {
						if (-1 == STR_WHITE_SPACE.indexOf(s.charAt(x))) {
							break;
						} else {
							++ws;
						}
					}

					if (0 == ws) {
						return false;
					} else if (ws < min || -1 == min) {
						min = ws;
					}

					return true;
				}) && min > 0) {
					str = trim(arr.map(function(s) {
						return s.substr(min);
					}).join('\n'));
				}

				if (str.length) {
					inline[++j] = str;
				}
			}

			return inline;
		}

		function image_finder(win) {
			var link = win.document.createElement('link');

			doc_url = fix_url_hash(win.location.href);
			get_elements(win.document).forEach(function(el) {
				var start, end, style = win.getComputedStyle(el, null);

				if (el.tagName && 'img' == el.tagName.toLowerCase()) {
					to_result(el.src);
				}

				if (style) {
					var uri = style.getPropertyValue('background-image');

					if (uri) {
						start = uri.indexOf('url');

						if (start > -1) {
							start = uri.indexOf('"', 1 + start);
							end = uri.indexOf('"', 1 + start);

							if (start > 0 && end > -1) {
								link.href = uri.substring(1 + start, end);
								to_result(link.href);
							}
						}
					}
				}
			});

			link = void win.document.images && Array.forEach(win.document.images, to_result);
		}

		function style_finder(win) {
			function sheet_diver(sheet) {
				function rule_diver(rule) {
					if (CSSRule.IMPORT_RULE == rule.type && rule.styleSheet) {
						if (!rule.styleSheet.disabled) {
							link.href = rule.href;

							if (to_result(link)) {
								sheet_diver(rule.styleSheet);
							}
						}

						return true;
					}

					return false;
				}

				if (sheet && !sheet.disabled) {
					if (sheet.href && sheet.href.length) {
						to_result(sheet.href);
					} else if (sheet.ownerNode.firstChild) {
						inline = get_inline_text(sheet.ownerNode, inline);
					}

					if (sheet.cssRules) {
						// Because @import statements must come before any STYLE_RULEs,
						// we may exit the loop if we encounter an STYLE_RULE type.
						Array.every(sheet.cssRules, rule_diver);
					}
				}
			}

			var link = win.document.createElement('link');

			doc_url = fix_url_hash(win.location.href);
			if (win.document.styleSheets) {
				Array.forEach(win.document.styleSheets, sheet_diver);
			}

			link = null;
		}

		function script_finder(win) {
			doc_url = fix_url_hash(win.location.href);

			Array.forEach(win.document.getElementsByTagName('script'), function(s) {
				if (s.src) {
					to_result(s.src);
				} else if (s.firstChild) {
					inline = get_inline_text(s, inline);
				}
			});
		}

		function html_finder(win) {
			return 'view-source:' + win.location.href;
		}

		function link_finder(win) {
			doc_url = fix_url_hash(win.location.href);

			Array.forEach(win.document.getElementsByTagName('a'), to_result);
			if (win.document.links) {
				Array.forEach(win.document.links, to_result);
			}
		}

		// Whitespace chars..;
		const STR_WHITE_SPACE = ' \t';

		var inline = [], j = -1, rv = [], i = -1, doc_url = '', hash = {};

		switch (type) {
			case FIND_TYPE_HTML: { // Content pages
				rv = wins.map(html_finder);
				break;
			} case FIND_TYPE_CSS: { // Stylesheets
				wins.forEach(style_finder);
				break;
			} case FIND_TYPE_SCRIPT: { // Scripts
				wins.forEach(script_finder);
				break;
			} case FIND_TYPE_IMAGES: { // Images...
				wins.forEach(image_finder);
				break;
			} case FIND_TYPE_LINKS: { // Hyperlinks
				wins.forEach(link_finder);
				break;
			}
		}

		if (j > -1) {
			// Possible encoding problems, if embedded iframes use different charactersets then the owner document.
			try {
				rv = ['data:text/plain;charset=' + encodeURIComponent(content.document.characterSet) + ';base64,' + encodeURIComponent(btoa(inline.map(trim).join('\n\n//...\n\n')))].concat(rv);
			} catch (e) {
				// Encoding problem. Try plain..;

				try {
					rv = ['data:text/plain;charset=' + encodeURIComponent(content.document.characterSet) + ',' + encodeURIComponent(inline.map(trim).join('\n\n//...\n\n'))].concat(rv);
				} catch (ex) {
					// We can only try... :(
				}
			}
		}

		return rv;
	}


	/******					*******
		*******			*******
			*******	*******
				*******
			*******	*******
		*******			*******
	*******					******/


	// Add the onload handler..;
	window.addEventListener('load', viewsource_chrome_load, false);


	// Return the object to chrome..;
	return {
		onMainPopupShowing: function(e) {
			if (e.currentTarget == e.target && content && content.document) {
				var menu = $(e.currentTarget, 1), wins = get_windows();

				if (content.document.readyState && 'complete' != content.document.readyState) {
					menu.appendChild($$('menuitem', { className: 'vs-special', disabled: true, label: get_bundle_string('loading') }));
				} else if (0 == wins.length) {
					menu.appendChild($$('menuitem', { label: get_bundle_string('noentriesfound', 'document'), className: 'vs-special', disabled: true }));
				} else {
					if (gContextMenu) {
						if (gContextMenu.onLink && !gContextMenu.onMailtoLink) {
							add_response_headers_item(menu, ('function' == typeof gContextMenu.getLinkURL ? gContextMenu.getLinkURL() : ('function' == typeof gContextMenu.linkURL ? gContextMenu.linkURL() : gContextMenu.linkURL)), 'linkresponseheaders');
						}

						if (gContextMenu.onImage) {
							add_response_headers_item(menu, ('function' == typeof gContextMenu.getImageURL ? gContextMenu.getImageURL() : ('function' == typeof gContextMenu.imageURL ? gContextMenu.imageURL() : (gContextMenu.imageURL || gContextMenu.mediaURL))), 'imageresponseheaders');
						} else if (gContextMenu.hasBGImage) {
							add_response_headers_item(menu, gContextMenu.bgImageURL, 'imageresponseheaders');
						}
					}

					if (content.location) {
						add_response_headers_item(menu, content.location.href, 'responseheaders');
					}

					[content.document.contentType.replace(/^[^\/]+\/|\s|[\+;].*$/g, '').toUpperCase(), 'CSS', 'JavaScript'].forEach(function(sType, iType) {
						if (((menu.firstChild && menu.appendChild($$('menuseparator'))) || 1) && 0 == get_items(iType, wins).map(function(sUrl, iUrl, aUrls) {
							if (0 == iUrl) {
								menu.appendChild($$('menuitem', {
									label: get_bundle_string('openall', sType) + ' (' + (aUrls.length - (0 == sUrl.length ? 1 : 0)).toLocaleString() + ')',
									accessKey: sType.charAt(0), 'className': 'vs-view-all',
									tooltipText: get_bundle_string('openall', sType),
									command: get_special_handler(view_all, iType)
								}));
							}

							var item = $$('menuitem', {
								className: 'menuitem-iconic vs-class' + String(iType) + (0 == iType + iUrl || iType > 0 && 0 == iUrl && 'data:' == sUrl.substr(0, 5) ? ' vs-special' : ''),
								label: iType > 0 && 0 == iUrl && 'data:' == sUrl.substr(0, 5) ? 'Inline ' + sType : fix_url_vs((sUrl.replace(/^([^\/]*\/)+|[\?#;](.*)$/g, '') || sUrl)),
								tooltipText: iType > 0 && 0 == iUrl ? '' : fix_url_vs(sUrl),
								command: function(ev) { view_source(sUrl, -1, ev); },
								context: 'popupMenuContext', 'value': sUrl
							});

							update_cache_entry_size_label_for_menu_item(sUrl, item);
							return !!menu.appendChild(item);
						}).length) {
							menu.appendChild($$('menuitem', { label: get_bundle_string('noentriesfound', sType), className: 'vs-special', disabled: true }));
						}
					});
				}

				menu = wins = void set_access_keys(menu);
			}
		},

		onOptionsPopupShowing: function(e) {
			var def_action = prefs.read('defaultAction', 0);

			Array.forEach(e.currentTarget.getElementsByTagName('menuitem'), function(menu) {
				if (menu.value) {
					set_attr(menu, 'checked', parseInt(menu.value, 10) == def_action);
				}
			});
		},

		onDragDrop: function(e) {
			e.target.removeAttribute('drop' == e.type ? 'ondragdrop' : 'ondrop');

			(gViewSourceExtensionObject.onDragDrop = function(e) {
				if (e.dataTransfer.types.contains('text/uri-list')) {
					refresh_headers(e.dataTransfer.getData('text/uri-list').split('\n')[0]);
				}
			})(e);
		},

		onDragEnter: function(e) {
			if (e.dataTransfer.types.contains('text/uri-list')) {
				e.preventDefault();
			}
		},

		onSideBarButton: function(e) {
			if (e.target.value && !e.target.command) {
				var val = parseInt(e.target.value, 10);

				if ('number' == typeof val && !isNaN(val)) {
					if (e.currentTarget == e.target.parentNode) {
						$('vs-sidebar-deck').selectedIndex = val;
						gViewSourceExtensionObject.onRefreshCmd();
					} else if (val > -1 && val < 4) {
						prefs.write('defaultAction', val);
					}
				}
			}
		},

		onTreeContextOpening: function(e) {
			var tree = $('vs-sidebar-deck').selectedPanel.lastChild;

			if (tree.disabled) {
				e.preventDefault();
			} else {
				var disabledState = String(!(tree.currentIndex > -1 && tree.hasAttribute('onkeypress')));
				var i = 0, mnuSelAll = $('vs-select-all')	;

				set_attr(mnuSelAll.nextSibling, 'hidden', 'multiple' != tree.selType);
				set_attr(mnuSelAll, 'hidden', 'multiple' != tree.selType);

				for (; i < 5; ++i) {
					set_attr(e.target.childNodes[i], 'disabled', disabledState);
				}
			}
		},

		onTreeSelectAll: function(e) {
			var tree = $('vs-sidebar-deck').selectedPanel.lastChild;

			if (tree.disabled) {
				e.preventDefault();
			} else if (tree.view && tree.view.selection) {
				tree.view.selection.selectAll();
			} else if (tree.selectAll) {
				tree.selectAll();
			}
		},

		onTreeContextOpen: function(e) {
			if (document.popupNode) {
				var i = document.popupNode.parentNode.currentIndex >> 0;

				if (-1 != i) {
					view_source(document.popupNode.parentNode.view.getCellText(i, document.popupNode.parentNode.columns.getColumnAt(0)), -1, e);
				}
			}
		},

		onTreeContextViewSource: function(e) {
			if (document.popupNode) {
				var i = document.popupNode.parentNode.currentIndex >> 0;

				if (-1 != i) {
					view_source('view-source:' + document.popupNode.parentNode.view.getCellText(i, document.popupNode.parentNode.columns.getColumnAt(0)), -1, e);
				}
			}
		},

		onTreeContextHeaders: function() {
			if (document.popupNode) {
				var i = document.popupNode.parentNode.currentIndex >> 0;

				if (-1 != i) {
					refresh_headers(document.popupNode.parentNode.view.getCellText(i, document.popupNode.parentNode.columns.getColumnAt(0)));
				}
			}
		},

		onRefreshCmd: function() {
			switch (+$('vs-sidebar-deck').selectedIndex) {
				case 1: {
					refresh_links();
					break;
				} case 2: {
					refresh_images();
					break;
				} case 3: {
					refresh_meta_data();
					break;
				} case 4: {
					refresh_colors();
					break;
				} default: { // case 0 is default!
					var list = $('vs-headers-url-list');

					// What exactly should be the default behaviour here? Currently,
					// clicking on an item in the toolbarbutton refreshes data from the
					// current page. So this should do the same! When the user wants to
					// check out the headers of a different page/url, he or she must
					// select it from the list, even if it's already selected!

					if (content && content.location) {
						refresh_headers(content.location.href);
					} else if (list.selectedItem && !list.selectedItem.disabled) {
						refresh_headers(list.value);
					}

					break;
				}
			}
		},

		onCopyCmd: function() {
			var tree = $('vs-sidebar-deck').selectedPanel.lastChild, data = [], j = -1;

			if (tree.selectedItems) {
				Array.forEach(tree.selectedItems, function(item) {
					// The value javascript property returns undefined here, so use getAttribute instead to get the correct value..!
					var val = 'undefined' == typeof item.firstChild.value ? item.firstChild.getAttribute('value') : item.firstChild.value;

					if (val) {
						data[++j] = val;
					}
				});
			} else {
				for (var i = 0, val = '', n = tree.view.rowCount, all = 'multiple' == tree.selType && 0 == tree.view.selection.count; i < n; ++i) {
					if (all || tree.view.selection.isSelected(i)) {
						if ((val = tree.view.getCellValue(i, tree.columns.getColumnAt(0))) && val) {
							data[++j] = val;
						}
					}
				}
			}

			if (j > -1) {
				copy_to_clipboard(data.join((navigator.platform.toLowerCase().indexOf('win') > -1 ? '\r\n' : '\n')));
			}
		},

		doContextOpen: function(e) {
			if (document.popupNode && e.target.value) {
				view_source(document.popupNode.value, e.target.value >> 0, null);
			}
		},

		onURLList: function(e) {
			if (e.currentTarget.selectedItem && !e.currentTarget.selectedItem.disabled && e.currentTarget.selectedIndex > 1) {
				refresh_headers((e.currentTarget.tooltipText = e.currentTarget.value));
			} else if (0 == (e.currentTarget.tooltipText = '').length && content && content.location) {
				refresh_headers(content.location.href);
			}
		},

		onSelect: function(e) {
			if (e.currentTarget == e.target) {
				var button = $('vs-sidebar-button'), i = e.currentTarget.selectedIndex;
				button.firstChild.value = button.lastChild.childNodes[i].label;
				button = void Array.every(button.lastChild.childNodes, function(node) {
					return node.hasAttribute('value') && (set_attr(node, 'checked', +node.value == i) || 1);
				});
			} else {
				update_tree_commands($('vs-sidebar-deck').selectedPanel.lastChild);
			}
		},

		onTreeDefault: function(tree, e) {
			if ('keypress' != e.type || KeyEvent.DOM_VK_RETURN == e.keyCode) {
				var i = tree.currentIndex >> 0;

				if (-1 != i) {
					view_source(tree.view.getCellText(i, tree.columns.getColumnAt(0)), -1, e);

					// An action already occurred, so prevent any further actions..!
					e.stopPropagation();
					e.preventDefault();
				}
			}
		},

		onSidebarCmd: function() {
			sidebar.toggle();
		},

		updateSideBar: function() {
			if (sidebar.refresh()) {
				var deck = $('vs-sidebar-deck');

				if (0 == deck.selectedIndex && deck.selectedPanel.lastChild.view && 0 == deck.selectedPanel.lastChild.view.rowCount) {
					gViewSourceExtensionObject.onRefreshCmd();
				}

				deck = null;
			}
		},

		showAbout: function() {
			window.openDialog('chrome://viewsource/content/viewsourceAbout.xul', 'vs-about-dialog', 'chrome=yes,modal=yes,centerscreen=yes');
		}
	};
})();
