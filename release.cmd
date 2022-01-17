@echo off
set VER=1.0.0

sed -i -E "s/version>.+?</version>%VER%</" install.rdf
sed -i -E "s/version>.+?</version>%VER%</; s/download\/.+?\/neo-hackbar-.+?\.xpi/download\/%VER%\/neo-hackbar-%VER%\.xpi/" update.xml

set XPI=neo-hackbar-%VER%.xpi
if exist %XPI% del %XPI%
zip -r9q %XPI% * -x .git/* .gitignore update.xml LICENSE README.md *.cmd *.xpi *.exe
