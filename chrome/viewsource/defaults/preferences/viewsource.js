// JavaScript 2011, KasH.

// Need this for ancient versions of firefox..;
pref('extensions.viewsource@kash.description', 'chrome://viewsource/locale/viewsource.properties');

// Provide default values for the preferences we use, with the exception of the 'firstRun' pref..;
pref('extensions.viewsource.requestMethod', 'HEAD');
pref('extensions.viewsource.defaultAction', 0);
pref('extensions.viewsource.firstRun', false);
