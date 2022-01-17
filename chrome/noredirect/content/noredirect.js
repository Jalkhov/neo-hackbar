/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is NoRedirect.
 *
 * The Initial Developer of the Original Code is Kai Liu.
 * Portions created by the Initial Developer are Copyright (C) 2009-2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Kai Liu <kliu@code.kliu.org>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */


var NoRedirect =
{
	_svc: Components.classes["@code.kliu.org/noredirect;5"].getService().wrappedJSObject,

	_nsIDocShell: Components.interfaces.nsIDocShell_MOZILLA_1_8_BRANCH ||
	              Components.interfaces.nsIDocShell,


	// Stops Refresh redirects and inserts the NoRedirect notification banner
	_handleDoc: function( evt )
	{
		var doc = null, wnav = null, chan = null;

		try {
			doc = evt.target.QueryInterface(Components.interfaces.nsIDOMHTMLDocument);

			wnav = doc.defaultView.
			       QueryInterface(Components.interfaces.nsIInterfaceRequestor).
			       getInterface(Components.interfaces.nsIWebNavigation);

			chan = wnav.QueryInterface(this._nsIDocShell).currentDocumentChannel;
		} catch (e) { }

		if (!doc) return;

		const NRS = this._svc;
		var status = NRS.readStatus(chan);

		if (!NRS.check(status.mode))
		{
			// Since this was not a HTTP redirect, check for Refresh redirects

			var docURI = NRS.makeURI(doc.URL, null);
			var destURI = NRS.getRefreshURI(doc, chan);

			var mode = (destURI) ? NRS.findRule(docURI, destURI, true) : 0;

			if (NRS.check(mode) && !(mode & 1 << 3))
			{
				NRS.stopRefresh(wnav);
				NRS.insertNotice(doc, "Refresh", destURI.spec);
			}
			else if (mode & 1 << 5)
			{
				NRS.addToSH(chan);
			}
		}
		else if (!(status.mode & 1 << 1))
		{
			NRS.stopRefresh(wnav);
			NRS.insertNotice(doc, status.code, status.dest);
		}
	},


	handleEvent: function( evt )
	{
		if (evt.type == "DOMContentLoaded")
			return(this._handleDoc(evt));

		// Load/unload the extension
		window.removeEventListener(evt.type, this, false);

		if (evt.type == "load")
		{
			window.addEventListener("DOMContentLoaded", this, true);
			this._svc.init();
			this._svc.useList = true;
		}
		else
		{
			window.removeEventListener("DOMContentLoaded", this, true);
			this._svc.uninit();
		}
	}
};


window.addEventListener("load", NoRedirect, false);
window.addEventListener("unload", NoRedirect, false);
