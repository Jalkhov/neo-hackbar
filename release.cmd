@echo off
set VER=1.1.2

:: PACK .jar files
cd chrome

cd livehttpheaders
zip -r9q ../livehttpheaders.jar *
cd ..

cd noredirect
zip -r9q ../noredirect.jar *
cd ..

cd tamperdata
zip -r9q ../tamperdata.jar *
cd ..

cd viewsource
zip -r9q ../viewsource.jar *

cd ../..

sed -i -E "s/version>.+?</version>%VER%</" install.rdf
sed -i -E "s/latest-v[0-9].[0-9].[0-9]/latest-v%VER%/" README.md
sed -i -E "s/releases\/v[0-9].[0-9].[0-9]/releases\/v%VER%/" README.md

set XPI=neo-hackbar-%VER%.xpi
if exist %XPI% del %XPI%
zip -r9q %XPI% * -x .git/* .gitignore .gitattributes .editorconfig download.png addon-screenshot.png update.xml LICENSE README.md *.cmd *.xpi chrome/livehttpheaders/\* chrome/noredirect/\* chrome/tamperdata/\* chrome/viewsource/\*
