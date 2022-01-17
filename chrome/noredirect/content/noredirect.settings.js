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

var NoRedirectSettings = {
    _init: false,
    _list: null,
    _listbox: null,

    // Adds an item to the list
    _add: function (pattern, mode) {
        var item = document.createElement("listitem");
        var col1 = document.createElement("listcell");
        var col2 = document.createElement("listcell");
        var col3 = document.createElement("listcell");
        var col4 = document.createElement("listcell");
        var text = document.createElement("textbox");
        var chk1 = document.createElement("checkbox");
        var chk2 = document.createElement("checkbox");
        var chk3 = document.createElement("checkbox");

        item.appendChild(col1);
        item.appendChild(col2);
        item.appendChild(col3);
        item.appendChild(col4);
        col1.appendChild(text);
        col2.appendChild(chk1);
        col3.appendChild(chk2);
        col4.appendChild(chk3);
        this._listbox.appendChild(item);
        this._listbox.ensureElementIsVisible(item);

        item.allowEvents = true;
        col1.pack = col2.pack = col3.pack = col4.pack = "center";

        text.setAttribute("value", pattern);
        text.onchange = this.onupdate;
        text.onfocus = this.onfocus;
        text.onblur = this.onblur;
        text.flex = 1;

        chk1.checked = mode & (1 << 2);
        chk1.onclick = this.onupdate;
        chk1.onfocus = this.onfocus;

        chk2.checked = mode & (1 << 3);
        chk2.onclick = this.onupdate;
        chk2.onfocus = this.onfocus;

        chk3.checked = mode & (1 << 1);
        chk3.onclick = this.onupdate;
        chk3.onfocus = this.onfocus;
        chk3.disabled = chk2.checked;
    },

    // Initialization
    load: function () {
        this._list = document.getElementById("list");
        this._listbox = document.getElementById("listbox");

        var list = this._list.value.split(":::").map(function (str) {
            return str.split("::");
        });

        for (var i = 0; i < list.length; ++i)
            this._add(list[i][0], parseInt(list[i][1]));

        this._listbox.ensureIndexIsVisible(0);
        this.onselect();
        this._init = true;
    },

    // Syncs the raw pref text with the UI state
    update: function () {
        if (!this._init) return;

        var list = [];

        for (i = 0; i < this._listbox.getRowCount(); ++i) {
            var item = this._listbox.getItemAtIndex(i);
            var text = item
                .getElementsByTagName("textbox")[0]
                .value.replace(/^[\s:]+|::+|[\s:]+$/g, "");

            var cboxes = item.getElementsByTagName("checkbox");
            var mode = 1;
            mode |= (cboxes[0].checked ? 1 : 0) << 2;
            mode |= (cboxes[1].checked ? 1 : 0) << 3;
            mode |= (cboxes[2].checked ? 1 : 0) << 1;

            cboxes[2].disabled = cboxes[1].checked;

            if (text.length) list.push(text + "::" + mode);
        }

        this._list.value = list.join(":::");
        this._list.doCommand();
    },

    // Disable/enable buttons
    _toggle: function (id, state) {
        var button = document.getElementById(id);

        if (state) button.removeAttribute("disabled");
        else button.setAttribute("disabled", "true");
    },

    // Work around some bugs in the listbox
    _scroll: function () {
        var idx = this._listbox.selectedIndex;
        this._listbox.ensureIndexIsVisible(idx ? idx - 1 : idx);
        this._listbox.ensureIndexIsVisible(
            idx + 1 < this._listbox.getRowCount() ? idx + 1 : idx
        );
    },

    /**
     * Event handlers
     * Note that the |this| in these functions is NoRedirectSettings
     **/

    onselect: function () {
        var sel = this._listbox.selectedItem;
        var up = false,
            down = false,
            remove = false;

        if (sel) {
            if (this._listbox.getIndexOfItem(sel) > 0) up = true;

            if (sel.nextSibling) down = true;

            remove = true;
        }

        this._toggle("up", up);
        this._toggle("down", down);
        this._toggle("remove", remove);

        // Make sure that the textbox focus travels
        var foc = document.commandDispatcher.focusedElement;

        if (foc && foc.tagName == "html:input" && foc.type == "text" && sel)
            sel.getElementsByTagName("textbox")[0].focus();
    },

    move: function (dir) {
        var sel = this._listbox.selectedItem;
        this._scroll();

        if (dir == -1) {
            sel.parentNode.insertBefore(
                sel.parentNode.removeChild(sel.previousSibling),
                sel.nextSibling
            );
        } else {
            sel.parentNode.insertBefore(
                sel.parentNode.removeChild(sel.nextSibling),
                sel
            );
        }

        this._scroll();
        this.onselect();
        this.update();
    },

    add: function () {
        this._add("", 0);
        this._listbox.lastChild.getElementsByTagName("textbox")[0].focus();
    },

    remove: function () {
        this._listbox.removeChild(this._listbox.selectedItem);
        this.onselect();
        this.update();
    },

    /**
     * OnEvent handlers
     * Note that the |this| in these functions is the event source
     **/

    onupdate: function () {
        // The value attribute persists, but not the value property
        if (this.value) this.setAttribute("value", this.value);

        NoRedirectSettings.update();
    },

    onfocus: function () {
        var parentItem = this.parentNode.parentNode;

        if (parentItem.parentNode.selectedItem != parentItem)
            parentItem.parentNode.selectedItem = parentItem;

        if (this.nodeNode == "textbox") this.setAttribute("focused", "true");
    },

    onblur: function () {
        this.removeAttribute("focused");
    },
};
